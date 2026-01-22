import { Request, Response } from 'express';
import { User } from '../models';
import { asyncHandler, AppError, formatPagination, ROLES } from '../utils';
import { IUser } from '../types';

/**
 * Get all users
 */
export const getUsers = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 10, role, status } = req.query;
    const query: Record<string, unknown> = {};
    if (role) query.role = role;
    if (status) query.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const [users, total] = await Promise.all([
        User.find(query)
            .populate('libraryId', 'name code')
            .skip(skip)
            .limit(Number(limit))
            .sort({ createdAt: -1 }) as Promise<IUser[]>,
        User.countDocuments(query),
    ]);

    res.json({
        success: true,
        data: users,
        meta: formatPagination(Number(page), Number(limit), total),
    });
});

/**
 * Get user by ID
 */
export const getUserById = asyncHandler(async (req: Request, res: Response) => {
    const user = await User.findById(req.params.id).populate('libraryId', 'name code') as IUser | null;

    if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    res.json({
        success: true,
        data: user,
    });
});

/**
 * Update user
 */
export const updateUser = asyncHandler(async (req: Request, res: Response) => {
    // Prevent updating sensitive fields
    const { password, role, ...updateData } = req.body;

    const user = await User.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
    ).populate('libraryId', 'name code') as IUser | null;

    if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    res.json({
        success: true,
        data: user,
        message: 'User updated successfully',
    });
});

/**
 * Delete user
 */
export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
    const user = await User.findById(req.params.id) as IUser | null;

    if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Prevent deleting admin
    if (user.role === ROLES.ADMIN) {
        throw new AppError('Cannot delete admin user', 403, 'CANNOT_DELETE_ADMIN');
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({
        success: true,
        message: 'User deleted successfully',
    });
});

/**
 * Update user role
 */
export const updateUserRole = asyncHandler(async (req: Request, res: Response) => {
    const { role, libraryId } = req.body;

    if (!Object.values(ROLES).includes(role)) {
        throw new AppError('Invalid role', 400, 'INVALID_ROLE');
    }

    const updateData: Record<string, unknown> = { role };

    // If role is librarian, libraryId is required
    if (role === ROLES.LIBRARIAN) {
        if (!libraryId) {
            throw new AppError('Library ID is required for librarian role', 400, 'LIBRARY_REQUIRED');
        }
        updateData.libraryId = libraryId;
    } else {
        updateData.libraryId = null;
    }

    const user = await User.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
    ).populate('libraryId', 'name code') as IUser | null;

    if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    res.json({
        success: true,
        data: user,
        message: 'User role updated successfully',
    });
});
