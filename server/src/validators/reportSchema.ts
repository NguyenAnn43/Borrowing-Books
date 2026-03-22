import { z } from 'zod';

const dateString = z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)), {
        message: 'Invalid date format',
    });

const positiveIntString = (fieldName: string, defaultValue: string) => z
    .string()
    .transform(Number)
    .refine((value) => Number.isInteger(value) && value > 0, {
        message: `${fieldName} must be a positive integer`,
    })
    .default(defaultValue);

const reportRangeQueryBase = z.object({
    from: dateString.optional(),
    to: dateString.optional(),
});

const withRangeValidation = <T extends z.AnyZodObject>(schema: T) => schema.refine((value) => {
    if (!value.from || !value.to) return true;
    return new Date(value.from).getTime() <= new Date(value.to).getTime();
}, {
    message: 'from must be before or equal to to',
    path: ['from'],
});

export const reportRangeQuerySchema = withRangeValidation(reportRangeQueryBase);

export const getDashboardReportSchema = {
    query: withRangeValidation(reportRangeQueryBase.extend({
        topLimit: positiveIntString('topLimit', '5'),
        months: positiveIntString('months', '12'),
        activityThreshold: positiveIntString('activityThreshold', '3'),
    })),
};

export const getFineRevenueReportSchema = {
    query: withRangeValidation(reportRangeQueryBase.extend({
        months: positiveIntString('months', '12'),
    })),
};

export const getTopBorrowedBooksReportSchema = {
    query: withRangeValidation(reportRangeQueryBase.extend({
        limit: positiveIntString('limit', '10'),
    })),
};

export const getUserActivityReportSchema = {
    query: withRangeValidation(reportRangeQueryBase.extend({
        activityThreshold: positiveIntString('activityThreshold', '3'),
    })),
};

export const getLateReturnRateReportSchema = {
    query: reportRangeQuerySchema,
};

export type ReportRangeQuery = z.infer<typeof reportRangeQuerySchema>;
export type DashboardReportQuery = z.infer<typeof getDashboardReportSchema.query>;
export type FineRevenueReportQuery = z.infer<typeof getFineRevenueReportSchema.query>;
export type TopBorrowedBooksReportQuery = z.infer<typeof getTopBorrowedBooksReportSchema.query>;
export type UserActivityReportQuery = z.infer<typeof getUserActivityReportSchema.query>;
export type LateReturnRateReportQuery = z.infer<typeof getLateReturnRateReportSchema.query>;
