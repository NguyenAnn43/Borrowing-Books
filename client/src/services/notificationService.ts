import api, { ApiResponse } from "@/lib/api";
import type { INotification, IPagination } from "@/types";

export interface GetNotificationsParams {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
}

export interface GetNotificationsResult {
    notifications: INotification[];
    unreadCount: number;
    pagination: IPagination;
}

export const notificationService = {
    /**
     * Get current user's notifications
     */
    getMyNotifications: async (
        params: GetNotificationsParams = {}
    ): Promise<GetNotificationsResult> => {
        const response = await api.get<
            ApiResponse<INotification[]> & { meta: IPagination & { unreadCount: number } }
        >("/notifications", { params });

        return {
            notifications: response.data.data,
            unreadCount: response.data.meta.unreadCount,
            pagination: {
                page: response.data.meta.page,
                limit: response.data.meta.limit,
                total: response.data.meta.total,
                pages: response.data.meta.pages,
                hasNext: response.data.meta.hasNext,
                hasPrev: response.data.meta.hasPrev,
            },
        };
    },

    /**
     * Mark a single notification as read
     */
    markAsRead: async (notificationId: string): Promise<INotification> => {
        const response = await api.patch<ApiResponse<INotification>>(
            `/notifications/${notificationId}/read`
        );
        return response.data.data;
    },

    /**
     * Mark all notifications as read
     */
    markAllAsRead: async (): Promise<void> => {
        await api.patch("/notifications/read-all");
    },

    /**
     * Get unread notifications count
     */
    getUnreadCount: async (): Promise<{ unreadCount: number }> => {
        const response = await api.get("/notifications", { params: { limit: 1 } });
        return {
            unreadCount: response.data.meta.unreadCount,
        };
    },
};
