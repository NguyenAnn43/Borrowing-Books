import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User } from '../models';
import { AppError, logger } from '../utils';
import config from '../config/env';
import { IUser } from '../types';
import { ChangePasswordInput, RegisterInput, ResetPasswordInput } from '../validators/authSchema';
import {
    requestRegisterOtp as requestRegisterOtpService,
    verifyRegisterOtp as verifyRegisterOtpService,
    consumeEmailVerification,
} from './registerVerificationService';
import { canSendEmail, sendEmail } from './mailService';

interface TokenPair {
    accessToken: string;
    refreshToken: string;
}

interface AuthResult {
    user: IUser;
    accessToken: string;
    refreshToken: string;
}

interface ForgotPasswordResult {
    accepted: boolean;
    previewResetUrl?: string;
    expiresInSeconds?: number;
}

const RESET_PASSWORD_TOKEN_EXPIRES_MS = 15 * 60 * 1000;

const hashResetToken = (token: string): string => crypto.createHash('sha256').update(token).digest('hex');

/**
 * Generate access and refresh tokens
 */
const generateTokens = (userId: string): TokenPair => {
    const accessToken = jwt.sign(
        { userId },
        config.JWT_SECRET,
        { expiresIn: 900 } // 15 minutes in seconds
    );

    const refreshToken = jwt.sign(
        { userId },
        config.JWT_REFRESH_SECRET,
        { expiresIn: 604800 } // 7 days in seconds
    );

    return { accessToken, refreshToken };
};

/**
 * Register a new user
 */
export const register = async (userData: RegisterInput): Promise<AuthResult> => {
    consumeEmailVerification(userData.email, userData.emailVerificationToken);

    // Check if email already exists
    const existingUser = await User.findOne({ email: userData.email });
    if (existingUser) {
        throw new AppError('Email already registered', 400, 'EMAIL_EXISTS');
    }

    // Create user
    const user = await User.create({
        email: userData.email,
        password: userData.password,
        fullName: userData.fullName,
        phone: userData.phone,
    }) as IUser;

    // Generate tokens
    const tokens = generateTokens(user._id.toString());

    // Save refresh token
    user.refreshToken = tokens.refreshToken;
    await user.save({ validateBeforeSave: false });

    return {
        user,
        ...tokens,
    };
};

/**
 * Request OTP code for register email verification
 */
export const requestRegisterOtp = async (email: string, requestIp?: string): Promise<{ expiresInSeconds: number }> => {
    const existingUser = await User.findOne({ email: email.trim().toLowerCase() });
    if (existingUser) {
        throw new AppError('Email already registered', 400, 'EMAIL_EXISTS');
    }

    return requestRegisterOtpService(email, requestIp);
};

/**
 * Verify OTP code for register email verification
 */
export const verifyRegisterOtp = async (
    email: string,
    otpCode: string
): Promise<{ verificationToken: string; expiresInSeconds: number }> => {
    return verifyRegisterOtpService(email, otpCode);
};

/**
 * Login user
 */
export const login = async (email: string, password: string): Promise<AuthResult> => {
    // Find user with password
    const user = await User.findOne({ email }).select('+password') as IUser | null;

    if (!user) {
        throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
        throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    // Check if user is active
    if (user.status !== 'active') {
        throw new AppError('Your account is not active', 403, 'ACCOUNT_INACTIVE');
    }

    // Generate tokens
    const tokens = generateTokens(user._id.toString());

    // Save refresh token
    user.refreshToken = tokens.refreshToken;
    await user.save({ validateBeforeSave: false });

    return {
        user,
        ...tokens,
    };
};

/**
 * Refresh access token
 */
export const refreshToken = async (token: string): Promise<TokenPair> => {
    try {
        // Verify refresh token
        const decoded = jwt.verify(token, config.JWT_REFRESH_SECRET) as { userId: string };

        // Find user with this refresh token
        const user = await User.findById(decoded.userId).select('+refreshToken') as IUser | null;

        if (!user || user.refreshToken !== token) {
            throw new AppError('Invalid refresh token', 401, 'INVALID_TOKEN');
        }

        // Generate new tokens
        const tokens = generateTokens(user._id.toString());

        // Update refresh token
        user.refreshToken = tokens.refreshToken;
        await user.save({ validateBeforeSave: false });

        return tokens;
    } catch (error) {
        if ((error as Error).name === 'TokenExpiredError') {
            throw new AppError('Refresh token expired', 401, 'TOKEN_EXPIRED');
        }
        throw new AppError('Invalid refresh token', 401, 'INVALID_TOKEN');
    }
};

/**
 * Logout user
 */
export const logout = async (userId: string): Promise<boolean> => {
    await User.findByIdAndUpdate(userId, { refreshToken: null });
    return true;
};

/**
 * Get current user
 */
export const getCurrentUser = async (userId: string): Promise<IUser> => {
    const user = await User.findById(userId).populate('libraryId', 'name code') as IUser | null;
    if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }
    return user;
};

/**
 * Change current user password
 */
export const changePassword = async (
    userId: string,
    data: ChangePasswordInput
): Promise<boolean> => {
    const user = await User.findById(userId).select('+password') as IUser | null;
    if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const { currentPassword, newPassword } = data;
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
        throw new AppError('Current password is incorrect', 400, 'INVALID_CURRENT_PASSWORD');
    }

    const isSameAsOld = await user.comparePassword(newPassword);
    if (isSameAsOld) {
        throw new AppError('New password must be different from current password', 400, 'PASSWORD_UNCHANGED');
    }

    user.password = newPassword;
    await user.save();
    return true;
};

/**
 * Request a password reset link.
 * Always returns accepted=true to avoid email enumeration.
 */
export const forgotPassword = async (rawEmail: string): Promise<ForgotPasswordResult> => {
    const email = rawEmail.trim().toLowerCase();
    const user = await User.findOne({ email }).select('+resetPasswordTokenHash +resetPasswordTokenExpiresAt') as IUser | null;

    if (!user) {
        return { accepted: true };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashResetToken(resetToken);
    const expiresAt = new Date(Date.now() + RESET_PASSWORD_TOKEN_EXPIRES_MS);
    const baseClientUrl = config.CLIENT_URL.replace(/\/+$/, '');
    const resetUrl = `${baseClientUrl}/reset-password?token=${resetToken}`;

    user.resetPasswordTokenHash = tokenHash;
    user.resetPasswordTokenExpiresAt = expiresAt;
    await user.save({ validateBeforeSave: false });

    const subject = 'BorrowingBooks - Dat lai mat khau';
    const text = [
        'Ban vua yeu cau dat lai mat khau.',
        `Nhan vao lien ket sau de dat lai mat khau: ${resetUrl}`,
        'Lien ket co hieu luc trong 15 phut.',
        'Neu ban khong tao yeu cau nay, vui long bo qua email.',
    ].join('\n');
    const html = `
        <meta charset="UTF-8" />
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background: #f8fafc;">
            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px;">
                <h2 style="margin: 0 0 12px; color: #1e293b;">Dat lai mat khau BorrowingBooks</h2>
                <p style="margin: 0 0 16px; color: #334155; line-height: 1.5;">
                    Ban da gui yeu cau dat lai mat khau. Nhan vao nut ben duoi de tiep tuc.
                </p>
                <a href="${resetUrl}" style="display:inline-block;padding:10px 16px;border-radius:8px;background:#1d4ed8;color:#ffffff;text-decoration:none;font-weight:600;">
                    Dat lai mat khau
                </a>
                <p style="margin: 16px 0 0; color: #475569; font-size: 13px; line-height: 1.5;">
                    Lien ket nay co hieu luc trong 15 phut.
                </p>
                <p style="margin: 10px 0 0; color: #64748b; font-size: 12px; line-height: 1.5;">
                    Neu ban khong tao yeu cau nay, vui long bo qua email.
                </p>
            </div>
        </div>
    `;

    try {
        await sendEmail({
            to: email,
            subject,
            text,
            html,
        });
    } catch (error) {
        logger.warn(`[FORGOT_PASSWORD] Failed to send reset email for ${email}: ${(error as Error).message}`);
        if (config.NODE_ENV !== 'development') {
            throw new AppError('Unable to send reset email at the moment. Please try again later.', 500, 'EMAIL_SEND_FAILED');
        }
    }

    if (config.NODE_ENV === 'development' && !canSendEmail()) {
        logger.warn(`[FORGOT_PASSWORD_DEV_PREVIEW] Reset URL for ${email}: ${resetUrl}`);
        return {
            accepted: true,
            previewResetUrl: resetUrl,
            expiresInSeconds: Math.floor(RESET_PASSWORD_TOKEN_EXPIRES_MS / 1000),
        };
    }

    return { accepted: true };
};

/**
 * Reset password using a valid reset token.
 */
export const resetPassword = async (input: ResetPasswordInput): Promise<boolean> => {
    const tokenHash = hashResetToken(input.token);
    const now = new Date();

    const user = await User.findOne({
        resetPasswordTokenHash: tokenHash,
        resetPasswordTokenExpiresAt: { $gt: now },
    }).select('+password +resetPasswordTokenHash +resetPasswordTokenExpiresAt') as IUser | null;

    if (!user) {
        throw new AppError('Reset token is invalid or expired.', 400, 'RESET_TOKEN_INVALID');
    }

    const isSameAsOld = await user.comparePassword(input.newPassword);
    if (isSameAsOld) {
        throw new AppError('New password must be different from current password', 400, 'PASSWORD_UNCHANGED');
    }

    user.password = input.newPassword;
    user.resetPasswordTokenHash = null;
    user.resetPasswordTokenExpiresAt = null;
    user.refreshToken = undefined;
    await user.save();
    return true;
};
