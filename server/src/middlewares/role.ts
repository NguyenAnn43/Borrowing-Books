import { Response, NextFunction } from 'express';
import { AppError } from '../utils';
import { AuthRequest, IUser } from '../types';
import { Role } from '../utils/constants';

/**
 * Authorize specific roles
 */
export const authorize = (...roles: Role[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
        if (!req.user) {
            throw new AppError('Please login to access this resource', 401, 'UNAUTHORIZED');
        }

        if (!roles.includes(req.user.role as Role)) {
            throw new AppError(
                `Role '${req.user.role}' is not authorized to access this resource`,
                403,
                'FORBIDDEN'
            );
        }

        next();
    };
};

/**
 * Check if user owns the resource or is admin
 */
export const authorizeOwnerOrAdmin = (getResourceUserId: (req: AuthRequest) => string | undefined) => {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
        if (!req.user) {
            throw new AppError('Please login to access this resource', 401, 'UNAUTHORIZED');
        }

        const resourceUserId = getResourceUserId(req);
        const isOwner = req.user._id.toString() === resourceUserId?.toString();
        const isAdmin = req.user.role === 'admin';

        if (!isOwner && !isAdmin) {
            throw new AppError('You are not authorized to access this resource', 403, 'FORBIDDEN');
        }

        next();
    };
};
