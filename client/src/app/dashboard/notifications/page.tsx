'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { notificationService } from '@/services/notificationService';
import type { INotification } from '@/types';
import { AlertCircle, Bell, Clock, CheckCircle2, ArrowLeft, Clock as ClockIcon, AlertCircle as AlertIcon, Info as InfoIcon, CheckCircle } from 'lucide-react';
import type { AxiosError } from 'axios';

export default function NotificationsPage() {
    const router = useRouter();
    const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();
    const [notifications, setNotifications] = useState<INotification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedType, setSelectedType] = useState<string | null>(null);
    const [isMarkingAsRead, setIsMarkingAsRead] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchNotifications = useCallback(async (pageNum: number = 1) => {
        try {
            setIsLoading(true);
            setError(null);

            const result = await notificationService.getMyNotifications({
                page: pageNum,
                limit: 10,
                unreadOnly: selectedType === 'unread'
            });

            setNotifications(result.notifications);
            setUnreadCount(result.unreadCount);
            setTotalPages(result.pagination.pages);
            setPage(pageNum);
        } catch (err) {
            const error = err as AxiosError<{ error?: { message?: string } }> | unknown;
            if (error && typeof error === 'object' && 'response' in error) {
                const axiosError = error as AxiosError<{ error?: { message?: string } }>;
                setError(
                    axiosError.response?.data?.error?.message || 'Failed to load notifications'
                );
            } else {
                setError('Failed to load notifications');
            }
        } finally {
            setIsLoading(false);
        }
    }, [selectedType]);

    useEffect(() => {
        if (authLoading) return;

        if (!isAuthenticated || !user) {
            router.push('/login');
            return;
        }

        if (user.role === 'guest') {
            router.push('/dashboard');
            return;
        }

        fetchNotifications(1);
    }, [isAuthenticated, user, authLoading, router, fetchNotifications]);

    const handleMarkAsRead = async (notificationId: string) => {
        try {
            setIsMarkingAsRead(notificationId);
            await notificationService.markAsRead(notificationId);
            setNotifications(prev =>
                prev.map(n => n._id === notificationId ? { ...n, isRead: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error('Error marking notification as read:', err);
        } finally {
            setIsMarkingAsRead(null);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            setIsLoading(true);
            await notificationService.markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (err) {
            console.error('Error marking all as read:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'overdue':
                return <AlertIcon className="w-5 h-5 text-red-600" />;
            case 'reservation':
                return <ClockIcon className="w-5 h-5 text-blue-600" />;
            case 'borrowing':
                return <Bell className="w-5 h-5 text-green-600" />;
            case 'system':
            default:
                return <InfoIcon className="w-5 h-5 text-gray-600" />;
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'overdue':
                return 'bg-red-100 text-red-800';
            case 'reservation':
                return 'bg-blue-100 text-blue-800';
            case 'borrowing':
                return 'bg-green-100 text-green-800';
            case 'system':
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const notificationTypes = [
        { value: 'borrowing', label: 'Borrowing', icon: Bell },
        { value: 'reservation', label: 'Reservation', icon: ClockIcon },
        { value: 'overdue', label: 'Overdue', icon: AlertIcon },
        { value: 'system', label: 'System', icon: InfoIcon },
    ];

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleDateString('vi-VN');
    };

    if (authLoading || isLoading) {
        return (
            <div className="min-h-screen bg-white p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="animate-pulse">
                        <div className="h-8 w-1/3 bg-gray-300 rounded mb-4" />
                        <div className="space-y-4">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="h-20 bg-gray-300 rounded" />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const filteredNotifications = selectedType === 'unread'
        ? notifications.filter(n => !n.isRead)
        : selectedType
            ? notifications.filter(n => n.type === selectedType)
            : notifications;

    return (
        <div className="min-h-screen bg-white p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.back()}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-6 h-6 text-gray-700" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">
                                Thông báo
                            </h1>
                            <p className="text-gray-600 text-sm mt-1">
                                Tổng: {filteredNotifications.length} thông báo {unreadCount > 0 && `(${unreadCount} chưa đọc)`}
                            </p>
                        </div>
                    </div>
                    {unreadCount > 0 && (
                        <button
                            onClick={handleMarkAllAsRead}
                            className="px-4 py-2 bg-[#2b6cee] hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors"
                        >
                            Đánh dấu tất cả đã đọc
                        </button>
                    )}
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex gap-2">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-red-800 text-sm font-medium">{error}</p>
                        </div>
                    </div>
                )}

                {/* Type Filter */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6 shadow-sm border border-gray-200">
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => {
                                setSelectedType(null);
                                fetchNotifications(1);
                            }}
                            className={`px-4 py-2 rounded-lg font-medium transition-all ${
                                selectedType === null
                                    ? 'bg-[#2b6cee] text-white'
                                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                            }`}
                        >
                            All ({notifications.length})
                        </button>
                        <button
                            onClick={() => {
                                setSelectedType('unread');
                                fetchNotifications(1);
                            }}
                            className={`px-4 py-2 rounded-lg font-medium transition-all ${
                                selectedType === 'unread'
                                    ? 'bg-[#2b6cee] text-white'
                                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                            }`}
                        >
                            Unread ({unreadCount})
                        </button>
                        {notificationTypes.map(type => (
                            <button
                                key={type.value}
                                onClick={() => {
                                    setSelectedType(type.value);
                                    fetchNotifications(1);
                                }}
                                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                                    selectedType === type.value
                                        ? 'bg-[#2b6cee] text-white'
                                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                                }`}
                            >
                                {type.label} ({notifications.filter(n => n.type === type.value).length})
                            </button>
                        ))}
                    </div>
                </div>

                {/* Notifications List */}
                {filteredNotifications.length === 0 ? (
                    <div className="bg-gray-50 rounded-lg p-12 text-center border border-gray-200">
                        <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 text-lg">No notifications found</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredNotifications.map((notification) => (
                            <div
                                key={notification._id}
                                className={`rounded-lg p-5 border hover:shadow-lg transition-shadow ${
                                    notification.isRead
                                        ? 'bg-white border-gray-200'
                                        : 'bg-blue-50 border-blue-200'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    {/* Notification Content */}
                                    <div className="flex-1">
                                        <div className="flex items-start gap-4">
                                            <div className="mt-1">
                                                {getNotificationIcon(notification.type)}
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="text-lg font-bold text-gray-900 mb-1">
                                                    {notification.title}
                                                </h3>
                                                <p className="text-gray-600 text-sm mb-3">
                                                    {notification.message}
                                                </p>

                                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                                    {/* Type Badge */}
                                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${getTypeColor(notification.type)}`}>
                                                        {notification.type.charAt(0).toUpperCase() + notification.type.slice(1)}
                                                    </span>

                                                    {/* Time */}
                                                    <span className="text-xs text-gray-500">
                                                        {formatDate(notification.createdAt)}
                                                    </span>

                                                    {/* Unread Indicator */}
                                                    {!notification.isRead && (
                                                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action */}
                                    {!notification.isRead && (
                                        <button
                                            onClick={() => handleMarkAsRead(notification._id)}
                                            disabled={isMarkingAsRead === notification._id}
                                            className="px-4 py-2 bg-[#2b6cee] hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
                                        >
                                            <CheckCircle className="w-4 h-4" />
                                            Mark Read
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-6 border-t border-gray-200 mt-6">
                        <button
                            onClick={() => {
                                if (page > 1) fetchNotifications(page - 1);
                            }}
                            disabled={page === 1}
                            className="px-4 py-2 bg-white hover:bg-gray-50 disabled:opacity-50 text-gray-700 rounded-lg font-medium text-sm transition-colors border border-gray-300"
                        >
                            Previous
                        </button>
                        <span className="text-sm text-gray-600">
                            Page {page} of {totalPages}
                        </span>
                        <button
                            onClick={() => {
                                if (page < totalPages) fetchNotifications(page + 1);
                            }}
                            disabled={page === totalPages}
                            className="px-4 py-2 bg-white hover:bg-gray-50 disabled:opacity-50 text-gray-700 rounded-lg font-medium text-sm transition-colors border border-gray-300"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
