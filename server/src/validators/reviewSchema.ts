import { z } from 'zod';

const imageUrlSchema = z.string().url('Image must be a valid URL');

const paginationQuerySchema = z.object({
    page: z.string().transform(Number).default('1'),
    limit: z.string().transform(Number).default('10'),
    includeHidden: z
        .string()
        .optional()
        .transform((value) => value === 'true'),
});

const baseReviewBodySchema = z.object({
    stars: z.number().int().min(1, 'Stars must be between 1 and 5').max(5, 'Stars must be between 1 and 5'),
    comment: z.string().max(1500, 'Comment cannot exceed 1500 characters').optional(),
    images: z.array(imageUrlSchema).max(10, 'At most 10 images').optional(),
});

export const getBookReviewsSchema = {
    params: z.object({
        bookId: z.string().min(1, 'Book ID is required'),
    }),
    query: paginationQuerySchema,
};

export const createBookReviewSchema = {
    body: baseReviewBodySchema.extend({
        bookId: z.string().min(1, 'Book ID is required'),
    }),
};

export const updateBookReviewSchema = {
    params: z.object({
        reviewId: z.string().min(1, 'Review ID is required'),
    }),
    body: baseReviewBodySchema.partial(),
};

export const deleteBookReviewSchema = {
    params: z.object({
        reviewId: z.string().min(1, 'Review ID is required'),
    }),
};

export const getLibraryReviewsSchema = {
    params: z.object({
        libraryId: z.string().min(1, 'Library ID is required'),
    }),
    query: paginationQuerySchema,
};

export const createLibraryReviewSchema = {
    body: baseReviewBodySchema.extend({
        libraryId: z.string().min(1, 'Library ID is required'),
    }),
};

export const updateLibraryReviewSchema = {
    params: z.object({
        reviewId: z.string().min(1, 'Review ID is required'),
    }),
    body: baseReviewBodySchema.partial(),
};

export const deleteLibraryReviewSchema = {
    params: z.object({
        reviewId: z.string().min(1, 'Review ID is required'),
    }),
};

export const createReviewReportSchema = {
    body: z.object({
        reviewType: z.enum(['book', 'library']),
        reviewId: z.string().min(1, 'Review ID is required'),
        reason: z.string().min(5, 'Reason should be at least 5 characters').max(500, 'Reason cannot exceed 500 characters'),
    }),
};

export const getReviewReportsSchema = {
    query: z.object({
        status: z.enum(['pending', 'resolved']).optional(),
        reviewType: z.enum(['book', 'library']).optional(),
        page: z.string().transform(Number).default('1'),
        limit: z.string().transform(Number).default('10'),
    }),
};

export const moderateReviewSchema = {
    body: z.object({
        reviewType: z.enum(['book', 'library']),
        reviewId: z.string().min(1, 'Review ID is required'),
        action: z.enum(['keep', 'hide', 'delete']),
        note: z.string().max(1000, 'Note cannot exceed 1000 characters').optional(),
    }),
};

export const getLibrarianReviewDashboardSchema = {
    query: z.object({
        limit: z.string().transform(Number).default('10'),
    }),
};

export type CreateBookReviewInput = z.infer<typeof createBookReviewSchema.body>;
export type UpdateBookReviewInput = z.infer<typeof updateBookReviewSchema.body>;
export type CreateLibraryReviewInput = z.infer<typeof createLibraryReviewSchema.body>;
export type UpdateLibraryReviewInput = z.infer<typeof updateLibraryReviewSchema.body>;
export type GetReviewListQuery = z.infer<typeof paginationQuerySchema>;
export type CreateReviewReportInput = z.infer<typeof createReviewReportSchema.body>;
export type GetReviewReportsQuery = z.infer<typeof getReviewReportsSchema.query>;
export type ModerateReviewInput = z.infer<typeof moderateReviewSchema.body>;
export type GetLibrarianReviewDashboardQuery = z.infer<typeof getLibrarianReviewDashboardSchema.query>;
