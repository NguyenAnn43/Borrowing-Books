"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bell, Loader2 } from "lucide-react";
import { RouteGuard } from "@/components/RouteGuard";
import { notificationService } from "@/services/notificationService";
import { Pagination } from "@/components/ui/Pagination";
import { usePagination } from "@/hooks";
import type { INotification } from "@/types";

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<INotification[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [unreadOnly, setUnreadOnly] = useState(false);
    const pendingRequestRef = useRef<AbortController | null>(null);

    const { page, limit, pagination, updatePagination, goToPage } = usePagination({ initialPage: 1, defaultLimit: 6 });

    const unreadCount = useMemo(() => notifications.filter((item) => !item.isRead).length, [notifications]);

    const fetchNotifications = useCallback(
        async () => {
            // Cancel any pending requests
            if (pendingRequestRef.current) {
                pendingRequestRef.current.abort();
            }

            const controller = new AbortController();
            pendingRequestRef.current = controller;

            setLoading(true);
            setError(null);
            try {
                const result = await notificationService.getMyNotifications({
                    page,
                    limit,
                    unreadOnly,
                });

                if (!controller.signal.aborted) {
                    setNotifications(result.notifications);
                    updatePagination(result.meta);
                }
            } catch (fetchError) {
                if ((fetchError as { name?: string })?.name !== "AbortError") {
                    const message = fetchError instanceof Error ? fetchError.message : "Không tải được thông báo.";
                    setError(message);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        },
        [page, limit, unreadOnly, updatePagination]
    );

    useEffect(() => {
        goToPage(1);
    }, [unreadOnly, goToPage]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            void fetchNotifications();
        }, 200);

        return () => clearTimeout(timeoutId);
    }, [page, fetchNotifications]);

    const handleMarkAsRead = async (id: string) => {
        setActionLoading(true);
        setError(null);
        setSuccess(null);
        try {
            await notificationService.markAsRead(id);
            setSuccess("Đã đánh dấu đã đọc.");
            await fetchNotifications();
        } catch (markError) {
            const message = markError instanceof Error ? markError.message : "Không thể cập nhật thông báo.";
            setError(message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleMarkAllAsRead = async () => {
        setActionLoading(true);
        setError(null);
        setSuccess(null);
        try {
            await notificationService.markAllAsRead();
            setSuccess("Đã đánh dấu tất cả là đã đọc.");
            await fetchNotifications();
        } catch (markError) {
            const message = markError instanceof Error ? markError.message : "Không thể cập nhật thông báo.";
            setError(message);
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <RouteGuard allowedRoles={["admin", "librarian", "user"]}>
            <div className="p-8 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Thông báo</h1>
                        <p className="text-sm text-slate-400 mt-1">{unreadCount} thông báo chưa đọc</p>
                    </div>

                    <div className="inline-flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setUnreadOnly((prev) => !prev);
                                goToPage(1);
                            }}
                            className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-xs text-indigo-200 hover:bg-indigo-500/20"
                        >
                            {unreadOnly ? "Hiện tất cả" : "Chỉ chưa đọc"}
                        </button>
                        <button
                            type="button"
                            onClick={() => void handleMarkAllAsRead()}
                            disabled={actionLoading || notifications.length === 0}
                            className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs text-blue-200 hover:bg-blue-500/20 disabled:opacity-60"
                        >
                            Đánh dấu tất cả đã đọc
                        </button>
                    </div>
                </div>

                {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
                {success && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{success}</div>}

                <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
                    {loading ? (
                        <div className="flex items-center gap-2 text-slate-300 text-sm">
                            <Loader2 className="h-4 w-4 animate-spin" /> Đang tải...
                        </div>
                    ) : notifications.length === 0 ? (
                        <p className="text-sm text-slate-400">Không có thông báo.</p>
                    ) : (
                        <div className="space-y-4">
                            <div className="space-y-3">
                                {notifications.map((item) => (
                                    <article
                                        key={item._id}
                                        className={`rounded-xl border p-4 ${item.isRead ? "border-white/10 bg-slate-800/40" : "border-blue-500/30 bg-blue-500/10"}`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                                                    <Bell className="h-4 w-4 text-blue-300" />
                                                    {item.title}
                                                </h3>
                                                <p className="mt-1 text-sm text-slate-300">{item.message}</p>
                                                <p className="mt-2 text-xs text-slate-400">
                                                    {new Date(item.createdAt).toLocaleString("vi-VN")} · {item.type}
                                                </p>
                                            </div>

                                            {!item.isRead && (
                                                <button
                                                    type="button"
                                                    onClick={() => void handleMarkAsRead(item._id)}
                                                    disabled={actionLoading}
                                                    className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-60"
                                                >
                                                    Đã đọc
                                                </button>
                                            )}
                                        </div>
                                    </article>
                                ))}
                            </div>

                            {/* Pagination */}
                            <div className="flex justify-center pt-4 border-t border-white/10">
                                <Pagination
                                    page={page}
                                    pages={pagination.pages}
                                    total={pagination.total}
                                    limit={limit}
                                    onPageChange={goToPage}
                                    showInfo={false}
                                />
                            </div>
                        </div>
                    )}
                </section>
            </div>
        </RouteGuard>
    );
}
