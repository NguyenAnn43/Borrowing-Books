import { z } from 'zod';

export const createBookSchema = {
    body: z.object({
        isbn: z.string().optional(),
        title: z.string().min(1, 'Title is required'),
        author: z.string().min(1, 'Author is required'),
        publisher: z.string().optional(),
        publishYear: z.number().int().positive().optional(),
        category: z.string().min(1, 'Category is required'),
        description: z.string().optional(),
        coverImage: z.string().url().optional(),
        language: z.string().default('vi'),
        pageCount: z.number().int().positive().optional(),
        tags: z.array(z.string()).optional(),
        location: z.string().optional(),
        libraryId: z.string().min(1, 'Library ID is required'),
        totalCopies: z.number().int().min(0, 'Total copies must be non-negative'),
        availableCopies: z.number().int().min(0, 'Available copies must be non-negative'),
    }),
};

export const updateBookSchema = {
    params: z.object({
        id: z.string().min(1, 'Book ID is required'),
    }),
    body: z.object({
        isbn: z.string().optional(),
        title: z.string().min(1).optional(),
        author: z.string().min(1).optional(),
        publisher: z.string().optional(),
        publishYear: z.number().int().positive().optional(),
        category: z.string().optional(),
        description: z.string().optional(),
        coverImage: z.string().url().optional(),
        language: z.string().optional(),
        pageCount: z.number().int().positive().optional(),
        tags: z.array(z.string()).optional(),
        location: z.string().optional(),
        totalCopies: z.number().int().min(0).optional(),
        availableCopies: z.number().int().min(0).optional(),
        status: z.enum(['available', 'unavailable']).optional(),
    }),
};

export const searchBooksSchema = {
    query: z.object({
        q: z.string().optional(),
        category: z.string().optional(),
        libraryId: z.string().optional(),
        status: z.enum(['available', 'unavailable']).optional(),
        page: z.string().transform(Number).default('1'),
        limit: z.string().transform(Number).default('10'),
    }),
};

export const getBookByIdSchema = {
    params: z.object({
        id: z.string().min(1, 'Book ID is required'),
    }),
};

// Types
export type CreateBookInput = z.infer<typeof createBookSchema.body>;
export type UpdateBookInput = z.infer<typeof updateBookSchema.body>;
export type SearchBooksQuery = z.infer<typeof searchBooksSchema.query>;
