import jwt from 'jsonwebtoken';
import { User } from '../models';
import { AppError } from '../utils';
import config from '../config/env';
import { IUser } from '../types';
import { RegisterInput } from '../validators/authSchema';

interface TokenPair {
    accessToken: string;
    refreshToken: string;
}

interface AuthResult {
    user: IUser;
    accessToken: string;
    refreshToken: string;
}

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
    // Check if email already exists
    const existingUser = await User.findOne({ email: userData.email });
    if (existingUser) {
        throw new AppError('Email already registered', 400, 'EMAIL_EXISTS');
    }

    // Create user
    const user = await User.create(userData) as IUser;

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
