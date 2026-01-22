import { z } from 'zod';

export const createBorrowingSchema = {
    body: z.object({
        bookId: z.string().min(1, 'Book ID is required'),
        libraryId: z.string().min(1, 'Library ID is required'),
        notes: z.string().optional(),
    }),
};

export const updateBorrowingSchema = {
    params: z.object({
        id: z.string().min(1, 'Borrowing ID is required'),
    }),
};

export const getBorrowingsSchema = {
    query: z.object({
        status: z.enum(['pending', 'borrowed', 'returned', 'overdue']).optional(),
        libraryId: z.string().optional(),
        userId: z.string().optional(),
        page: z.string().transform(Number).default('1'),
        limit: z.string().transform(Number).default('10'),
    }),
};

// Types
export type CreateBorrowingInput = z.infer<typeof createBorrowingSchema.body>;
export type GetBorrowingsQuery = z.infer<typeof getBorrowingsSchema.query>;
