import { Response } from 'express';
import { borrowingService } from '../services';
import { asyncHandler } from '../utils';
import { AuthRequest } from '../types';
import { GetBorrowingsQuery } from '../validators/borrowingSchema';

/**
 * Get all borrowings (admin/librarian)
 */
export const getBorrowings = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await borrowingService.getBorrowings(req.query as unknown as GetBorrowingsQuery);
    res.json({ success: true, data: result.borrowings, meta: result.pagination });
});

/**
 * Get my borrowings (owner)
 */
export const getMyBorrowings = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await borrowingService.getMyBorrowings(req.user!._id.toString(), req.query);
    res.json({ success: true, data: result.borrowings, meta: result.pagination });
});

/**
 * Get borrowing by ID — owner | librarian | admin only (enforced in service)
 */
export const getBorrowingById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const borrowing = await borrowingService.getBorrowingById(req.params['id']!, req.user!);
    res.json({ success: true, data: borrowing });
});

/**
 * Create borrowing request
 */
export const createBorrowing = asyncHandler(async (req: AuthRequest, res: Response) => {
    const borrowing = await borrowingService.createBorrowing(req.user!._id.toString(), req.body);
    res.status(201).json({ success: true, data: borrowing, message: 'Borrowing request created successfully' });
});

/**
 * Confirm book pickup (librarian/admin)
 */
export const confirmPickup = asyncHandler(async (req: AuthRequest, res: Response) => {
    const borrowing = await borrowingService.confirmPickup(req.params['id']!);
    res.json({ success: true, data: borrowing, message: 'Book pickup confirmed' });
});

/**
 * Return book (librarian/admin)
 */
export const returnBook = asyncHandler(async (req: AuthRequest, res: Response) => {
    const borrowing = await borrowingService.returnBook(req.params['id']!);
    res.json({ success: true, data: borrowing, message: 'Book returned successfully' });
});

/**
 * Cancel a pending borrowing (owner only — enforced in service)
 */
export const cancelBorrowing = asyncHandler(async (req: AuthRequest, res: Response) => {
    const borrowing = await borrowingService.cancelBorrowing(req.params['id']!, req.user!._id.toString());
    res.json({ success: true, data: borrowing, message: 'Borrowing cancelled' });
});

/**
 * Renew an active borrowing (owner only — enforced in service)
 */
export const renewBorrowing = asyncHandler(async (req: AuthRequest, res: Response) => {
    const borrowing = await borrowingService.renewBorrowing(req.params['id']!, req.user!._id.toString());
    res.json({ success: true, data: borrowing, message: 'Borrowing renewed successfully' });
});

/**
 * Mark fine as paid (librarian/admin)
 */
export const payFine = asyncHandler(async (req: AuthRequest, res: Response) => {
    const borrowing = await borrowingService.payFine(req.params['id']!);
    res.json({ success: true, data: borrowing, message: 'Fine marked as paid' });
});
