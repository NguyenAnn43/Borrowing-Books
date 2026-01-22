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
    const statusCode = (err as AppError).statusCode || 500;
    const status = (err as AppError).status || 'error';

    // Log error
    logger.error(`${statusCode} - ${err.message} - ${req.originalUrl} - ${req.method}`);

    if (config.NODE_ENV === 'development') {
        sendErrorDev(err as AppError, res);
    } else {
        sendErrorProd(err as AppError, res);
    }
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
