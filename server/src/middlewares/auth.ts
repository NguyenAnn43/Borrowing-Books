import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models';
import { AppError, asyncHandler } from '../utils';
import config from '../config/env';
import { AuthRequest, IUser } from '../types';

interface JwtPayload {
    userId: string;
}

/**
 * Protect routes - verify JWT token
 */
export const protect = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
    let token: string | undefined;

    // Check for token in Authorization header
    if (req.headers.authorization?.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    // Check for token in cookies
    if (!token && req.cookies?.accessToken) {
        token = req.cookies.accessToken;
    }

    if (!token) {
        throw new AppError('Please login to access this resource', 401, 'UNAUTHORIZED');
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, config.JWT_SECRET) as JwtPayload;

        // Check if user still exists
        const user = await User.findById(decoded.userId) as IUser | null;
        if (!user) {
            throw new AppError('User no longer exists', 401, 'USER_NOT_FOUND');
        }

        // Check if user is active
        if (user.status !== 'active') {
            throw new AppError('Your account is not active', 403, 'ACCOUNT_INACTIVE');
        }

        // Attach user to request
        req.user = user;
        next();
    } catch (error) {
        if ((error as Error).name === 'TokenExpiredError') {
            throw new AppError('Token expired, please login again', 401, 'TOKEN_EXPIRED');
        }
        throw new AppError('Invalid token', 401, 'INVALID_TOKEN');
    }
});

/**
 * Optional authentication - attach user if token exists
 */
export const optionalAuth = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
    let token: string | undefined;

    if (req.headers.authorization?.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return next();
    }

    try {
        const decoded = jwt.verify(token, config.JWT_SECRET) as JwtPayload;
        const user = await User.findById(decoded.userId) as IUser | null;
        if (user && user.status === 'active') {
            req.user = user;
        }
    } catch {
        // Ignore token errors for optional auth
    }

    next();
});
