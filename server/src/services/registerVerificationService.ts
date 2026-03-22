import crypto from 'crypto';
import nodemailer from 'nodemailer';
import config from '../config/env';
import { AppError, logger } from '../utils';

const OTP_EXPIRES_MS = 5 * 60 * 1000;
const VERIFICATION_TOKEN_EXPIRES_MS = 15 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 45 * 1000;
const OTP_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const OTP_MAX_REQUESTS_PER_EMAIL = 5;
const OTP_MAX_REQUESTS_PER_IP = 20;
const MAX_VERIFY_ATTEMPTS = 5;

interface RegisterOtpRecord {
    email: string;
    otpCode: string;
    expiresAt: number;
    attemptCount: number;
    verifiedAt?: number;
    verificationToken?: string;
    verificationTokenExpiresAt?: number;
}

const registerOtpStore = new Map<string, RegisterOtpRecord>();
const otpRequestLogByEmail = new Map<string, number[]>();
const otpRequestLogByIp = new Map<string, number[]>();
const lastOtpSentAtByEmail = new Map<string, number>();

const normalizeEmail = (email: string): string => email.trim().toLowerCase();
const normalizeIp = (ip?: string): string => (ip || 'unknown').trim().toLowerCase();

const generateOtpCode = (): string => String(crypto.randomInt(0, 1000000)).padStart(6, '0');

const generateVerificationToken = (): string => crypto.randomBytes(24).toString('hex');

const mailTransport =
    config.EMAIL.host && config.EMAIL.user && config.EMAIL.pass
        ? nodemailer.createTransport({
            host: config.EMAIL.host,
            port: config.EMAIL.port,
            secure: config.EMAIL.secure,
            auth: {
                user: config.EMAIL.user,
                pass: config.EMAIL.pass,
            },
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 15000,
        })
        : null;

const sendOtpEmail = async (email: string, otpCode: string): Promise<void> => {
    const subject = 'Borrowing Books - Mã xác thực đăng ký';
    const text = [
        'Bạn vừa yêu cầu tạo tài khoản Borrowing Books.',
        `Mã OTP của bạn là: ${otpCode}`,
        'Mã có hiệu lực trong 5 phút.',
        'Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.',
    ].join('\n');
    const html = `
        <meta charset="UTF-8" />
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background: #f8fafc;">
            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px;">
                <h2 style="margin: 0 0 12px; color: #1e293b;">Xác thực đăng ký Borrowing Books</h2>
                <p style="margin: 0 0 16px; color: #334155; line-height: 1.5;">
                    Bạn vừa yêu cầu tạo tài khoản. Vui lòng nhập mã OTP bên dưới để hoàn tất đăng ký.
                </p>
                <div style="margin: 18px 0; padding: 16px; text-align: center; border-radius: 10px; background: #eff6ff; border: 1px dashed #93c5fd;">
                    <div style="font-size: 28px; letter-spacing: 8px; font-weight: 700; color: #1d4ed8;">${otpCode}</div>
                    <div style="margin-top: 8px; font-size: 13px; color: #475569;">Mã OTP có hiệu lực trong 5 phút</div>
                </div>
                <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.5;">
                    Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.
                </p>
            </div>
        </div>
    `;

    if (!mailTransport) {
        logger.warn('[REGISTER_OTP] SMTP is not configured. Unable to send OTP email.');
        throw new AppError('Email service is not configured. Please contact administrator.', 500, 'EMAIL_SERVICE_NOT_CONFIGURED');
    }

    await mailTransport.sendMail({
        from: config.EMAIL.from,
        to: email,
        subject,
        text,
        html,
    });
};

const trackOtpRate = (
    store: Map<string, number[]>,
    key: string,
    now: number,
    maxRequests: number,
    errorCode: string,
    errorMessage: string
): void => {
    const windowStart = now - OTP_RATE_LIMIT_WINDOW_MS;
    const existing = store.get(key) || [];
    const recent = existing.filter((timestamp) => timestamp >= windowStart);

    if (recent.length >= maxRequests) {
        const oldestTimestamp = recent[0] ?? now;
        const retryAfterSeconds = Math.max(1, Math.ceil((oldestTimestamp + OTP_RATE_LIMIT_WINDOW_MS - now) / 1000));
        throw new AppError(errorMessage, 429, errorCode, { retryAfterSeconds });
    }

    recent.push(now);
    store.set(key, recent);
};

export const requestRegisterOtp = async (rawEmail: string, rawIp?: string): Promise<{ expiresInSeconds: number }> => {
    const email = normalizeEmail(rawEmail);
    const requestIp = normalizeIp(rawIp);
    const now = Date.now();

    const lastSentAt = lastOtpSentAtByEmail.get(email) || 0;
    const remainingCooldownMs = OTP_RESEND_COOLDOWN_MS - (now - lastSentAt);
    if (remainingCooldownMs > 0) {
        throw new AppError('Please wait before requesting another OTP code.', 429, 'OTP_RESEND_COOLDOWN', {
            retryAfterSeconds: Math.ceil(remainingCooldownMs / 1000),
        });
    }

    trackOtpRate(
        otpRequestLogByEmail,
        email,
        now,
        OTP_MAX_REQUESTS_PER_EMAIL,
        'OTP_EMAIL_RATE_LIMIT',
        'Too many OTP requests for this email. Please try again later.'
    );

    trackOtpRate(
        otpRequestLogByIp,
        requestIp,
        now,
        OTP_MAX_REQUESTS_PER_IP,
        'OTP_IP_RATE_LIMIT',
        'Too many OTP requests from your IP. Please try again later.'
    );

    const otpCode = generateOtpCode();
    const expiresAt = now + OTP_EXPIRES_MS;

    registerOtpStore.set(email, {
        email,
        otpCode,
        expiresAt,
        attemptCount: 0,
    });
    lastOtpSentAtByEmail.set(email, now);

    try {
        await sendOtpEmail(email, otpCode);
    } catch (error) {
        if (config.NODE_ENV === 'development') {
            logger.warn(`[REGISTER_OTP_FALLBACK_DEV] SMTP send failed: ${(error as Error).message}`);
            logger.warn(`[REGISTER_OTP_FALLBACK_DEV] Use this OTP for ${email}: ${otpCode}`);
        } else {
            throw new AppError('Unable to send OTP email at the moment. Please try again later.', 500, 'EMAIL_SEND_FAILED');
        }
    }

    return { expiresInSeconds: Math.floor(OTP_EXPIRES_MS / 1000) };
};

export const verifyRegisterOtp = (rawEmail: string, otpCode: string): { verificationToken: string; expiresInSeconds: number } => {
    const email = normalizeEmail(rawEmail);
    const record = registerOtpStore.get(email);

    if (!record) {
        throw new AppError('OTP not found. Please request a new code.', 400, 'OTP_NOT_FOUND');
    }

    if (Date.now() > record.expiresAt) {
        registerOtpStore.delete(email);
        throw new AppError('OTP has expired. Please request a new code.', 400, 'OTP_EXPIRED');
    }

    if (record.attemptCount >= MAX_VERIFY_ATTEMPTS) {
        registerOtpStore.delete(email);
        throw new AppError('Too many invalid attempts. Please request a new code.', 429, 'OTP_TOO_MANY_ATTEMPTS');
    }

    if (record.otpCode !== otpCode) {
        record.attemptCount += 1;
        registerOtpStore.set(email, record);
        throw new AppError('Invalid OTP code.', 400, 'OTP_INVALID');
    }

    const verificationToken = generateVerificationToken();
    const verificationTokenExpiresAt = Date.now() + VERIFICATION_TOKEN_EXPIRES_MS;

    registerOtpStore.set(email, {
        ...record,
        verifiedAt: Date.now(),
        verificationToken,
        verificationTokenExpiresAt,
    });

    return {
        verificationToken,
        expiresInSeconds: Math.floor(VERIFICATION_TOKEN_EXPIRES_MS / 1000),
    };
};

export const consumeEmailVerification = (rawEmail: string, verificationToken: string): void => {
    const email = normalizeEmail(rawEmail);
    const record = registerOtpStore.get(email);

    if (!record || !record.verificationToken || !record.verificationTokenExpiresAt) {
        throw new AppError('Email is not verified. Please verify OTP before registering.', 400, 'EMAIL_NOT_VERIFIED');
    }

    if (Date.now() > record.verificationTokenExpiresAt) {
        registerOtpStore.delete(email);
        throw new AppError('Email verification has expired. Please verify again.', 400, 'EMAIL_VERIFICATION_EXPIRED');
    }

    if (record.verificationToken !== verificationToken) {
        throw new AppError('Invalid email verification token.', 400, 'EMAIL_VERIFICATION_INVALID');
    }

    registerOtpStore.delete(email);
};
