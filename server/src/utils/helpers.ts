import { PaginationMeta } from '../types';

/**
 * Format pagination metadata
 */
export const formatPagination = (page: number, limit: number, total: number): PaginationMeta => ({
    page: Number(page),
    limit: Number(limit),
    total,
    pages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1,
});

/**
 * Calculate overdue days
 */
export const calculateOverdueDays = (dueDate: Date): number => {
    const now = new Date();
    const due = new Date(dueDate);

    if (now <= due) return 0;

    const diffTime = Math.abs(now.getTime() - due.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
};

/**
 * Calculate fine amount
 */
export const calculateFine = (overdueDays: number, finePerDay: number = 5000): number => {
    return overdueDays * finePerDay;
};

/**
 * Generate due date from borrow date
 */
export const generateDueDate = (borrowDate: Date, days: number = 14): Date => {
    const dueDate = new Date(borrowDate);
    dueDate.setDate(dueDate.getDate() + days);
    return dueDate;
};

/**
 * Sanitize object by removing undefined values
 */
export const sanitizeObject = <T extends Record<string, unknown>>(obj: T): Partial<T> => {
    return Object.fromEntries(
        Object.entries(obj).filter(([_, v]) => v !== undefined && v !== null)
    ) as Partial<T>;
};
