import { z } from 'zod';

export const createReservationSchema = {
    body: z.object({
        bookId: z.string().min(1, 'Book ID is required'),
        libraryId: z.string().min(1, 'Library ID is required'),
    }),
};

export const getReservationsSchema = {
    query: z.object({
        status: z.enum(['pending', 'ready', 'completed', 'cancelled', 'expired']).optional(),
        libraryId: z.string().optional(),
        userId: z.string().optional(),
        page: z.string().transform(Number).default('1'),
        limit: z.string().transform(Number).default('10'),
    }),
};

export const reservationIdSchema = {
    params: z.object({
        id: z.string().min(1, 'Reservation ID is required'),
    }),
};

// Types
export type CreateReservationInput = z.infer<typeof createReservationSchema.body>;
export type GetReservationsQuery = z.infer<typeof getReservationsSchema.query>;
