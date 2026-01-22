import { Request, Response, NextFunction } from 'express';

/**
 * Async handler wrapper to avoid try-catch in every controller
 */
export const asyncHandler = <T>(
    fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
