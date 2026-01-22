import { Request, Response, NextFunction } from 'express';
import { ZodObject, ZodRawShape } from 'zod';
import { AppError } from '../utils';

interface ValidationSchema {
    body?: ZodObject<ZodRawShape>;
    params?: ZodObject<ZodRawShape>;
    query?: ZodObject<ZodRawShape>;
}

interface ValidationError {
    field: string;
    message: string;
}

/**
 * Validate request using Zod schema
 */
export const validate = (schema: ValidationSchema) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        const errors: ValidationError[] = [];

        // Validate body
        if (schema.body) {
            const result = schema.body.safeParse(req.body);
            if (!result.success) {
                errors.push(
                    ...result.error.issues.map((issue) => ({
                        field: `body.${issue.path.join('.')}`,
                        message: issue.message,
                    }))
                );
            } else {
                req.body = result.data;
            }
        }

        // Validate params
        if (schema.params) {
            const result = schema.params.safeParse(req.params);
            if (!result.success) {
                errors.push(
                    ...result.error.issues.map((issue) => ({
                        field: `params.${issue.path.join('.')}`,
                        message: issue.message,
                    }))
                );
            } else {
                req.params = result.data as typeof req.params;
            }
        }

        // Validate query
        if (schema.query) {
            const result = schema.query.safeParse(req.query);
            if (!result.success) {
                errors.push(
                    ...result.error.issues.map((issue) => ({
                        field: `query.${issue.path.join('.')}`,
                        message: issue.message,
                    }))
                );
            } else {
                req.query = result.data as typeof req.query;
            }
        }

        if (errors.length > 0) {
            throw new AppError('Validation failed', 400, 'VALIDATION_ERROR', errors);
        }

        next();
    };
};
