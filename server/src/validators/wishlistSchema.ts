import { z } from 'zod';

export const addWishlistSchema = {
    body: z.object({
        bookId: z.string().min(1, 'Book ID is required'),
    }),
};

export const removeWishlistSchema = {
    params: z.object({
        bookId: z.string().min(1, 'Book ID is required'),
    }),
};

export const getMyWishlistSchema = {
    query: z.object({
        page: z.string().transform(Number).default('1'),
        limit: z.string().transform(Number).default('10'),
    }),
};

export type AddWishlistInput = z.infer<typeof addWishlistSchema.body>;
export type RemoveWishlistInput = z.infer<typeof removeWishlistSchema.params>;
export type GetMyWishlistQuery = z.infer<typeof getMyWishlistSchema.query>;
