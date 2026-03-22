import { z } from 'zod';

export const transitIdParamSchema = {
    params: z.object({
        id: z.string().min(1, 'Transit request ID is required'),
    }),
};

export const getTransitRequestsSchema = {
    query: z.object({
        q: z.string().optional(),
        status: z.enum(['pending', 'approved', 'rejected', 'in_transit', 'completed', 'cancelled']).optional(),
        direction: z.enum(['all', 'inbound', 'outbound']).default('all'),
        sourceLibraryId: z.string().optional(),
        targetLibraryId: z.string().optional(),
        page: z.string().transform(Number).default('1'),
        limit: z.string().transform(Number).default('10'),
    }),
};

export const createTransitRequestSchema = {
    body: z.object({
        sourceBookId: z.string().min(1, 'Source book ID is required'),
        quantity: z.coerce.number().int().min(1).max(20).default(1),
        note: z.string().max(1000).optional(),
        requestedForUserId: z.string().optional(),
    }),
};

export const approveTransitRequestSchema = {
    ...transitIdParamSchema,
    body: z.object({
        note: z.string().max(1000).optional(),
    }).optional(),
};

export const rejectTransitRequestSchema = {
    ...transitIdParamSchema,
    body: z.object({
        reason: z.string().trim().min(3, 'Reason must be at least 3 characters').max(1000),
    }),
};

export const dispatchTransitRequestSchema = {
    ...transitIdParamSchema,
    body: z.object({
        note: z.string().max(1000).optional(),
    }).optional(),
};

export const receiveTransitRequestSchema = {
    ...transitIdParamSchema,
    body: z.object({
        note: z.string().max(1000).optional(),
    }).optional(),
};

export const cancelTransitRequestSchema = {
    ...transitIdParamSchema,
    body: z.object({
        reason: z.string().max(1000).optional(),
    }).optional(),
};

export type GetTransitRequestsQuery = z.infer<typeof getTransitRequestsSchema.query>;
export type CreateTransitRequestInput = z.infer<typeof createTransitRequestSchema.body>;
export type ApproveTransitRequestInput = z.infer<NonNullable<typeof approveTransitRequestSchema.body>>;
export type RejectTransitRequestInput = z.infer<typeof rejectTransitRequestSchema.body>;
export type DispatchTransitRequestInput = z.infer<NonNullable<typeof dispatchTransitRequestSchema.body>>;
export type ReceiveTransitRequestInput = z.infer<NonNullable<typeof receiveTransitRequestSchema.body>>;
export type CancelTransitRequestInput = z.infer<NonNullable<typeof cancelTransitRequestSchema.body>>;
