import { z } from 'zod';

export const registerSchema = {
    body: z.object({
        email: z.string().email('Invalid email format'),
        emailVerificationToken: z.string().min(1, 'Email verification token is required'),
        password: z
            .string()
            .min(8, 'Password must be at least 8 characters')
            .regex(
                /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                'Password must contain at least one uppercase letter, one lowercase letter, and one number'
            ),
        fullName: z.string().min(2, 'Full name must be at least 2 characters'),
        phone: z.string().optional(),
    }),
};

export const loginSchema = {
    body: z.object({
        email: z.string().email('Invalid email format'),
        password: z.string().min(1, 'Password is required'),
    }),
};

export const refreshTokenSchema = {
    body: z.object({
        refreshToken: z.string().min(1, 'Refresh token is required').optional(),
    }),
};

export const requestRegisterOtpSchema = {
    body: z.object({
        email: z.string().email('Invalid email format'),
    }),
};

export const verifyRegisterOtpSchema = {
    body: z.object({
        email: z.string().email('Invalid email format'),
        otpCode: z
            .string()
            .regex(/^\d{6}$/, 'OTP code must be 6 digits'),
    }),
};

export const changePasswordSchema = {
    body: z.object({
        currentPassword: z.string().min(1, 'Current password is required'),
        newPassword: z
            .string()
            .min(8, 'Password must be at least 8 characters')
            .regex(
                /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                'Password must contain at least one uppercase letter, one lowercase letter, and one number'
            ),
    }),
};

export const forgotPasswordSchema = {
    body: z.object({
        email: z.string().email('Invalid email format'),
    }),
};

export const resetPasswordSchema = {
    body: z.object({
        token: z.string().min(1, 'Reset token is required'),
        newPassword: z
            .string()
            .min(8, 'Password must be at least 8 characters')
            .regex(
                /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                'Password must contain at least one uppercase letter, one lowercase letter, and one number'
            ),
    }),
};

// Types from schemas
export type RegisterInput = z.infer<typeof registerSchema.body>;
export type LoginInput = z.infer<typeof loginSchema.body>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema.body>;
export type RequestRegisterOtpInput = z.infer<typeof requestRegisterOtpSchema.body>;
export type VerifyRegisterOtpInput = z.infer<typeof verifyRegisterOtpSchema.body>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema.body>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema.body>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema.body>;
