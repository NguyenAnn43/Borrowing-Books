import { z } from 'zod';

export const createBorrowingSchema = {
    body: z.object({
        bookId: z.string().min(1, 'Book ID is required'),
        libraryId: z.string().min(1, 'Library ID is required'),
        notes: z.string().optional(),
    }),
};

export const createBulkBorrowingSchema = {
    body: z.object({
        bookIds: z.array(z.string().min(1, 'Book ID is required')).min(1, 'At least one book is required'),
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
        q: z.string().optional(),
        status: z.enum(['pending', 'borrowed', 'returned', 'overdue', 'return_transit', 'cancelled', 'lost', 'damaged']).optional(),
        finePaid: z.enum(['true', 'false']).optional(),
        libraryId: z.string().optional(),
        userId: z.string().optional(),
        page: z.string().transform(Number).default('1'),
        limit: z.string().transform(Number).default('10'),
    }),
};

export const crossReturnLookupSchema = {
    query: z.object({
        q: z.string().trim().min(2, 'Search query must be at least 2 characters'),
        limit: z.string().transform(Number).default('10'),
    }),
};

export const reportIssueSchema = {
    params: z.object({
        id: z.string().min(1, 'Borrowing ID is required'),
    }),
    body: z.object({
        status: z.enum(['lost', 'damaged']),
        notes: z.string().optional(),
    }),
};

// Types
export type CreateBorrowingInput = z.infer<typeof createBorrowingSchema.body>;
export type CreateBulkBorrowingInput = z.infer<typeof createBulkBorrowingSchema.body>;
export type ReportIssueInput = z.infer<typeof reportIssueSchema.body>;
export type GetBorrowingsQuery = z.infer<typeof getBorrowingsSchema.query>;
export type CrossReturnLookupQuery = z.infer<typeof crossReturnLookupSchema.query>;
