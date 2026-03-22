import { Request, Response, NextFunction } from 'express';
import { logger, AppError } from '../utils';
import config from '../config/env';

/**
 * Global error handler middleware
 */
export const errorHandler = (
    err: AppError | Error,
    req: Request,
    res: Response,
    _next: NextFunction
): void => {
    const normalizedError = normalizeError(err);
    const statusCode = normalizedError.statusCode || 500;

    // Log error
    logger.error(`${statusCode} - ${normalizedError.message} - ${req.originalUrl} - ${req.method}`);

    if (config.NODE_ENV === 'development') {
        sendErrorDev(normalizedError, res);
    } else {
        sendErrorProd(normalizedError, res);
    }
};

const isMongoDuplicateKeyError = (err: unknown): err is { code: number; keyPattern?: Record<string, unknown>; keyValue?: Record<string, unknown> } => {
    return Boolean(err && typeof err === 'object' && 'code' in err && (err as { code?: number }).code === 11000);
};

const normalizeError = (err: AppError | Error): AppError => {
    if (isMongoDuplicateKeyError(err)) {
        const keyPattern = err.keyPattern || {};
        const isBookDuplicateInLibrary = 'libraryId' in keyPattern && 'isbnNormalized' in keyPattern;

        return new AppError(
            isBookDuplicateInLibrary
                ? 'A book with this ISBN already exists in the selected library'
                : 'Duplicate data violates unique constraint',
            409,
            isBookDuplicateInLibrary ? 'BOOK_DUPLICATE_IN_LIBRARY' : 'DUPLICATE_KEY',
            err.keyValue || null
        );
    }

    return err as AppError;
};

/**
 * Send error in development mode
 */
const sendErrorDev = (err: AppError, res: Response): void => {
    res.status(err.statusCode || 500).json({
        success: false,
        error: {
            code: err.code || 'ERROR',
            message: err.message,
            details: err.details || null,
            stack: err.stack,
        },
    });
};

/**
 * Send error in production mode
 */
const sendErrorProd = (err: AppError, res: Response): void => {
    // Operational, trusted error: send message to client
    if (err.isOperational) {
        res.status(err.statusCode).json({
            success: false,
            error: {
                code: err.code || 'ERROR',
                message: err.message,
                details: err.details || null,
            },
        });
    } else {
        // Programming or unknown error: don't leak error details
        logger.error('ERROR 💥:', err);

        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Something went wrong!',
            },
        });
    }
};

/**
 * Handle 404 not found
 */
export const notFound = (req: Request, res: Response, _next: NextFunction): void => {
    res.status(404).json({
        success: false,
        error: {
            code: 'NOT_FOUND',
            message: `Route ${req.originalUrl} not found`,
        },
    });
};
