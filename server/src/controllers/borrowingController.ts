import { Request, Response } from 'express';
import { borrowingService } from '../services';
import { asyncHandler } from '../utils';
import { AuthRequest } from '../types';

/**
 * Get all borrowings
 */
export const getBorrowings = asyncHandler(async (req: Request, res: Response) => {
    const result = await borrowingService.getBorrowings(req.query as unknown as Parameters<typeof borrowingService.getBorrowings>[0]);

    res.json({
        success: true,
        data: result.borrowings,
        meta: result.pagination,
    });
});

/**
 * Get my borrowings
 */
export const getMyBorrowings = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await borrowingService.getMyBorrowings(req.user!._id.toString(), req.query);

    res.json({
        success: true,
        data: result.borrowings,
        meta: result.pagination,
    });
});

/**
 * Get borrowing by ID
 */
export const getBorrowingById = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const borrowing = await borrowingService.getBorrowingById(id);

    res.json({
        success: true,
        data: borrowing,
    });
});

/**
 * Create borrowing request
 */
export const createBorrowing = asyncHandler(async (req: AuthRequest, res: Response) => {
    const borrowing = await borrowingService.createBorrowing(req.user!._id.toString(), req.body);

    res.status(201).json({
        success: true,
        data: borrowing,
        message: 'Borrowing request created successfully',
    });
});

/**
 * Confirm book pickup
 */
export const confirmPickup = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const borrowing = await borrowingService.confirmPickup(id);

    res.json({
        success: true,
        data: borrowing,
        message: 'Book pickup confirmed',
    });
});

/**
 * Return book
 */
export const returnBook = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const borrowing = await borrowingService.returnBook(id);

    res.json({
        success: true,
        data: borrowing,
        message: 'Book returned successfully',
    });
});
