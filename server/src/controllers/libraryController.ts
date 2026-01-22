import { Request, Response } from 'express';
import { Library } from '../models';
import { asyncHandler, AppError, formatPagination } from '../utils';
import { ILibrary } from '../types';

/**
 * Get all libraries
 */
export const getLibraries = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 10, status } = req.query;
    const query: Record<string, unknown> = {};
    if (status) query.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const [libraries, total] = await Promise.all([
        Library.find(query).skip(skip).limit(Number(limit)).sort({ createdAt: -1 }) as Promise<ILibrary[]>,
        Library.countDocuments(query),
    ]);

    res.json({
        success: true,
        data: libraries,
        meta: formatPagination(Number(page), Number(limit), total),
    });
});

/**
 * Get library by ID
 */
export const getLibraryById = asyncHandler(async (req: Request, res: Response) => {
    const library = await Library.findById(req.params.id) as ILibrary | null;

    if (!library) {
        throw new AppError('Library not found', 404, 'LIBRARY_NOT_FOUND');
    }

    res.json({
        success: true,
        data: library,
    });
});

/**
 * Create library
 */
export const createLibrary = asyncHandler(async (req: Request, res: Response) => {
    const library = await Library.create(req.body);

    res.status(201).json({
        success: true,
        data: library,
        message: 'Library created successfully',
    });
});

/**
 * Update library
 */
export const updateLibrary = asyncHandler(async (req: Request, res: Response) => {
    const library = await Library.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
    ) as ILibrary | null;

    if (!library) {
        throw new AppError('Library not found', 404, 'LIBRARY_NOT_FOUND');
    }

    res.json({
        success: true,
        data: library,
        message: 'Library updated successfully',
    });
});

/**
 * Delete library
 */
export const deleteLibrary = asyncHandler(async (req: Request, res: Response) => {
    const library = await Library.findByIdAndDelete(req.params.id);

    if (!library) {
        throw new AppError('Library not found', 404, 'LIBRARY_NOT_FOUND');
    }

    res.json({
        success: true,
        message: 'Library deleted successfully',
    });
});
