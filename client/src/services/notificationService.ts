import api, { ApiResponse } from "@/lib/api";
import type { INotification, IPagination } from "@/types";

interface NotificationsMeta extends IPagination {
    unreadCount?: number;
}

export const notificationService = {
    getMyNotifications: async (params: { page?: number; limit?: number; unreadOnly?: boolean } = {}) => {
        const response = await api.get<ApiResponse<INotification[]>>("/notifications", { params });
        return {
            notifications: response.data.data,
            meta: response.data.meta as NotificationsMeta,
        };
    },

    markAsRead: async (id: string): Promise<INotification> => {
        const response = await api.patch<ApiResponse<INotification>>(`/notifications/${id}/read`);
        return response.data.data;
    },

    markAllAsRead: async (): Promise<void> => {
        await api.patch("/notifications/read-all");
    },
};
