import { z } from 'zod';
import { ROLES } from '../utils/constants';

export const createStaffSchema = {
    body: z.object({
        email: z.string().email('Invalid email format'),
        password: z
            .string()
            .min(8, 'Password must be at least 8 characters')
            .regex(
                /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                'Password must contain at least one uppercase letter, one lowercase letter, and one number'
            ),
        fullName: z.string().min(2, 'Full name must be at least 2 characters'),
        phone: z.string().optional(),
        role: z.enum([ROLES.ADMIN, ROLES.LIBRARIAN]),
        libraryId: z.string().optional(),
    }),
};

export type CreateStaffInput = z.infer<typeof createStaffSchema.body>;
