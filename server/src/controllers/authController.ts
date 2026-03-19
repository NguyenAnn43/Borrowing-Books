import { Request, Response } from 'express';
import { authService } from '../services';
import { asyncHandler, AppError } from '../utils';
import { AuthRequest } from '../types';

/**
 * Register new user
 */
export const register = asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.register(req.body);

    res.status(201).json({
        success: true,
        data: {
            user: result.user,
            accessToken: result.accessToken,
        },
        message: 'User registered successfully',
    });
});

/**
 * Request OTP for register email verification
 */
export const requestRegisterOtp = asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;
    const forwardedFor = req.headers['x-forwarded-for'];
    const proxyIp = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor?.split(',')[0];
    const requestIp = proxyIp?.trim() || req.ip;
    const result = await authService.requestRegisterOtp(email, requestIp);

    res.json({
        success: true,
        data: result,
        message: 'OTP sent to email',
    });
});

/**
 * Verify OTP for register email verification
 */
export const verifyRegisterOtp = asyncHandler(async (req: Request, res: Response) => {
    const { email, otpCode } = req.body;
    const result = await authService.verifyRegisterOtp(email, otpCode);

    res.json({
        success: true,
        data: result,
        message: 'Email verified successfully',
    });
});

/**
 * Login user
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const result = await authService.login(email, password);

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
        success: true,
        data: {
            user: result.user,
            accessToken: result.accessToken,
        },
        message: 'Login successful',
    });
});

/**
 * Logout user
 */
export const logout = asyncHandler(async (req: AuthRequest, res: Response) => {
    await authService.logout(req.user!._id.toString());

    res.clearCookie('refreshToken');

    res.json({
        success: true,
        message: 'Logout successful',
    });
});

/**
 * Refresh access token
 */
export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
    const token = req.body.refreshToken || req.cookies.refreshToken;
    if (!token) {
        throw new AppError('Refresh token is required', 401, 'TOKEN_REQUIRED');
    }

    const tokens = await authService.refreshToken(token);

    res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
        success: true,
        data: {
            accessToken: tokens.accessToken,
        },
        message: 'Token refreshed successfully',
    });
});

/**
 * Get current user
 */
export const me = asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = await authService.getCurrentUser(req.user!._id.toString());

    res.json({
        success: true,
        data: user,
    });
});

/**
 * Change password for current user
 */
export const changePassword = asyncHandler(async (req: AuthRequest, res: Response) => {
    await authService.changePassword(req.user!._id.toString(), req.body);

    res.json({
        success: true,
        message: 'Password changed successfully',
    });
});
