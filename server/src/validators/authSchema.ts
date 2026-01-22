import { z } from 'zod';

export const registerSchema = {
    body: z.object({
        email: z.string().email('Invalid email format'),
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
        refreshToken: z.string().min(1, 'Refresh token is required'),
    }),
};

// Types from schemas
export type RegisterInput = z.infer<typeof registerSchema.body>;
export type LoginInput = z.infer<typeof loginSchema.body>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema.body>;
