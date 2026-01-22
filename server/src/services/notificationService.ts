import { Types } from 'mongoose';
import { Notification } from '../models';
import { INotification, PaginationMeta } from '../types';
import { formatPagination, NotificationType } from '../utils';

interface CreateNotificationData {
    userId: string | Types.ObjectId;
    title: string;
    message: string;
    type: NotificationType;
    metadata?: Record<string, unknown>;
}

interface GetNotificationsResult {
    notifications: INotification[];
    unreadCount: number;
    pagination: PaginationMeta;
}

/**
 * Create notification
 */
export const create = async (data: CreateNotificationData): Promise<INotification> => {
    const notification = await Notification.create(data) as INotification;
    return notification;
};

/**
 * Get user's notifications
 */
export const getByUserId = async (
    userId: string,
    params: { page?: number; limit?: number; unreadOnly?: boolean } = {}
): Promise<GetNotificationsResult> => {
    const { page = 1, limit = 10, unreadOnly = false } = params;

    const query: Record<string, unknown> = { userId };
    if (unreadOnly) query.isRead = false;

    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
        Notification.find(query)
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 }) as Promise<INotification[]>,
        Notification.countDocuments(query),
        Notification.countDocuments({ userId, isRead: false }),
    ]);

    return {
        notifications,
        unreadCount,
        pagination: formatPagination(page, limit, total),
    };
};

/**
 * Mark notification as read
 */
export const markAsRead = async (id: string, userId: string): Promise<INotification | null> => {
    const notification = await Notification.findOneAndUpdate(
        { _id: id, userId },
        { isRead: true },
        { new: true }
    ) as INotification | null;

    return notification;
};

/**
 * Mark all notifications as read
 */
export const markAllAsRead = async (userId: string): Promise<boolean> => {
    await Notification.updateMany(
        { userId, isRead: false },
        { isRead: true }
    );

    return true;
};

/**
 * Delete old notifications (older than 30 days and already read)
 */
export const cleanupOld = async (daysOld: number = 30): Promise<number> => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await Notification.deleteMany({
        isRead: true,
        createdAt: { $lt: cutoffDate },
    });

    return result.deletedCount;
};
