import { Response } from 'express';
import * as notificationService from '../services/notificationService';
import { asyncHandler, AppError } from '../utils';
import { AuthRequest } from '../types';

/**
 * GET /notifications — current user's notifications
 * Query: ?unreadOnly=true&page=1&limit=10
 */
export const getMyNotifications = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page, limit, unreadOnly } = req.query;
    const result = await notificationService.getByUserId(req.user!._id.toString(), {
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 10,
        unreadOnly: unreadOnly === 'true',
    });

    res.json({
        success: true,
        data: result.notifications,
        meta: { ...result.pagination, unreadCount: result.unreadCount },
    });
});

/**
 * PATCH /notifications/:id/read — mark a single notification as read (owner only)
 */
export const markAsRead = asyncHandler(async (req: AuthRequest, res: Response) => {
    const notification = await notificationService.markAsRead(req.params['id']!, req.user!._id.toString());

    if (!notification) {
        throw new AppError('Notification not found or not yours', 404, 'NOTIFICATION_NOT_FOUND');
    }

    res.json({ success: true, data: notification, message: 'Notification marked as read' });
});

/**
 * PATCH /notifications/read-all — mark all notifications as read (owner only)
 */
export const markAllAsRead = asyncHandler(async (req: AuthRequest, res: Response) => {
    await notificationService.markAllAsRead(req.user!._id.toString());
    res.json({ success: true, message: 'All notifications marked as read' });
});
