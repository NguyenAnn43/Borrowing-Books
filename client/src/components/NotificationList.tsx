"use client";

import React, { useState, useEffect } from "react";
import { Bell, Check, CheckCheck, Clock, AlertCircle, Info } from "lucide-react";
import { notificationService, GetNotificationsResult } from "@/services/notificationService";
import { INotification } from "@/types";
import { Button } from "@/components/ui/Button";

interface NotificationListProps {
    onUnreadCountChange?: (count: number) => void;
}

const getNotificationIcon = (type: string) => {
    switch (type) {
        case "overdue":
            return <AlertCircle className="h-5 w-5 text-red-500" />;
        case "reservation":
            return <Clock className="h-5 w-5 text-blue-500" />;
        case "borrowing":
            return <Bell className="h-5 w-5 text-emerald-500" />;
        case "system":
        default:
            return <Info className="h-5 w-5 text-purple-500" />;
    }
};

const getNotificationColor = (type: string) => {
    switch (type) {
        case "overdue":
            return "bg-red-50 border-red-200";
        case "reservation":
            return "bg-blue-50 border-blue-200";
        case "borrowing":
            return "bg-emerald-50 border-emerald-200";
        case "system":
        default:
            return "bg-purple-50 border-purple-200";
    }
};

const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Vừa xong";
    if (diffMins < 60) return `${diffMins}m trước`;
    if (diffHours < 24) return `${diffHours}h trước`;
    if (diffDays < 7) return `${diffDays}d trước`;

    return date.toLocaleDateString("vi-VN");
};

export const NotificationList: React.FC<NotificationListProps> = ({ onUnreadCountChange }) => {
    const [notifications, setNotifications] = useState<INotification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [unreadCount, setUnreadCount] = useState(0);
    const [filter, setFilter] = useState<"all" | "unread">("all");

    const loadNotifications = async (pageNum: number = 1, filterBy: "all" | "unread" = "all") => {
        setIsLoading(true);
        setError(null);
        try {
            const result: GetNotificationsResult = await notificationService.getMyNotifications({
                page: pageNum,
                limit: 10,
                unreadOnly: filterBy === "unread",
            });
            setNotifications(result.notifications);
            setUnreadCount(result.unreadCount);
            setTotalPages(result.pagination.pages);
            setPage(pageNum);
            onUnreadCountChange?.(result.unreadCount);
        } catch (err) {
            setError("Không thể tải thông báo");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadNotifications(1, filter);
    }, []);

    const handleMarkAsRead = async (notificationId: string) => {
        try {
            await notificationService.markAsRead(notificationId);
            setNotifications((prev) =>
                prev.map((n) => (n._id === notificationId ? { ...n, isRead: true } : n))
            );
            setUnreadCount((prev) => Math.max(0, prev - 1));
            onUnreadCountChange?.(unreadCount - 1);
        } catch (err) {
            console.error("Error marking notification as read:", err);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await notificationService.markAllAsRead();
            setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
            setUnreadCount(0);
            onUnreadCountChange?.(0);
        } catch (err) {
            console.error("Error marking all notifications as read:", err);
        }
    };

    const handleFilterChange = (newFilter: "all" | "unread") => {
        setFilter(newFilter);
        loadNotifications(1, newFilter);
    };

    if (isLoading && notifications.length === 0) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                    <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-gray-200 mb-4">
                        <Bell className="h-6 w-6 text-gray-500 animate-pulse" />
                    </div>
                    <p className="text-gray-500">Đang tải thông báo...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <p className="text-gray-600">{error}</p>
                    <Button
                        onClick={() => loadNotifications(1, filter)}
                        className="mt-4"
                        size="sm"
                    >
                        Thử lại
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header with filters */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Thông báo</h2>
                {unreadCount > 0 && (
                    <div className="flex items-center gap-3">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700 border border-blue-200">
                            {unreadCount} chưa đọc
                        </span>
                        <Button
                            onClick={handleMarkAllAsRead}
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2"
                        >
                            <CheckCheck className="h-4 w-4" />
                            Đánh dấu tất cả đã đọc
                        </Button>
                    </div>
                )}
            </div>

            {/* Filter tabs */}
            <div className="flex gap-2 border-b border-gray-200">
                <button
                    onClick={() => handleFilterChange("all")}
                    className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                        filter === "all"
                            ? "border-blue-500 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                >
                    Tất cả
                </button>
                <button
                    onClick={() => handleFilterChange("unread")}
                    className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                        filter === "unread"
                            ? "border-blue-500 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                >
                    Chưa đọc
                </button>
            </div>

            {/* Notifications list */}
            {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Bell className="h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-500">
                        {filter === "unread" ? "Không có thông báo chưa đọc" : "Không có thông báo nào"}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {notifications.map((notification) => (
                        <div
                            key={notification._id}
                            className={`p-4 rounded-lg border transition-all ${getNotificationColor(
                                notification.type
                            )} ${!notification.isRead ? "bg-white border-blue-200" : "bg-gray-50 border-gray-200"}`}
                        >
                            <div className="flex items-start gap-4">
                                <div className="mt-1">{getNotificationIcon(notification.type)}</div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-gray-900">{notification.title}</h3>
                                            <p className="text-gray-600 text-sm mt-1">{notification.message}</p>
                                        </div>
                                        {!notification.isRead && (
                                            <div className="flex-shrink-0 h-2 w-2 rounded-full bg-blue-500 mt-2" />
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between gap-2 mt-3">
                                        <span className="text-xs text-gray-500">
                                            {formatDate(notification.createdAt)}
                                        </span>
                                        {!notification.isRead && (
                                            <Button
                                                onClick={() => handleMarkAsRead(notification._id)}
                                                variant="ghost"
                                                size="sm"
                                                className="flex items-center gap-1 text-xs"
                                            >
                                                <Check className="h-3 w-3" />
                                                Đánh dấu đã đọc
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <Button
                        onClick={() => loadNotifications(page - 1, filter)}
                        disabled={page === 1}
                        variant="outline"
                        size="sm"
                    >
                        Trước
                    </Button>
                    <span className="text-sm text-gray-600">
                        Trang {page} của {totalPages}
                    </span>
                    <Button
                        onClick={() => loadNotifications(page + 1, filter)}
                        disabled={page === totalPages}
                        variant="outline"
                        size="sm"
                    >
                        Tiếp
                    </Button>
                </div>
            )}
        </div>
    );
};
