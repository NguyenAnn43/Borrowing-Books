"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    AlertTriangle,
    BookCopy,
    BookOpen,
    CalendarClock,
    CircleDollarSign,
    CheckCircle2,
    Clock,
    Loader2,
    Search,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { RouteGuard } from "@/components/RouteGuard";
import Link from "next/link";
import { borrowingService } from "@/services/borrowingService";
import { reservationService } from "@/services/reservationService";
import type { IBorrowing } from "@/types";

const DASHBOARD_REFRESH_MS = 45_000;

export default function UserDashboard() {
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [focusBorrowings, setFocusBorrowings] = useState<IBorrowing[]>([]);
    const [statsCounts, setStatsCounts] = useState({
        borrowingNow: 0,
        overdueBorrowings: 0,
        unresolvedFineCases: 0,
        pendingBorrowings: 0,
        returnedBorrowings: 0,
        pendingReservations: 0,
    });
    const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

    const loadDashboardData = useCallback(async (silent = false) => {
        if (!silent) {
            setLoading(true);
        }
        setError(null);
        try {
            const [borrowingsRes, reservationsRes] = await Promise.all([
                borrowingService.getMyBorrowings({ page: 1, limit: 200 }),
                reservationService.getMyReservations({ page: 1, limit: 200 }),
            ]);

            const borrowings = borrowingsRes.borrowings;
            const reservations = reservationsRes.reservations;

            const borrowedItems = borrowings.filter((item) => item.status === "borrowed");
            const overdueItems = borrowings.filter((item) => item.status === "overdue");
            const pendingBorrowingItems = borrowings.filter((item) => item.status === "pending");
            const returnedBorrowingItems = borrowings.filter((item) => item.status === "returned");
            const unresolvedFineItems = borrowings.filter((item) => item.status === "overdue" && !item.finePaid);

            const pendingReservationCount = reservations.filter(
                (item) => item.status === "pending" || item.status === "ready"
            ).length;

            setStatsCounts({
                borrowingNow: borrowedItems.length,
                overdueBorrowings: overdueItems.length,
                unresolvedFineCases: unresolvedFineItems.length,
                pendingBorrowings: pendingBorrowingItems.length,
                returnedBorrowings: returnedBorrowingItems.length,
                pendingReservations: pendingReservationCount,
            });

            setFocusBorrowings(
                borrowedItems
                    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                    .slice(0, 4)
            );
            setLastUpdatedAt(new Date());
        } catch (fetchError) {
            const status =
                typeof fetchError === "object" && fetchError !== null && "response" in fetchError
                    ? (fetchError as { response?: { status?: number } }).response?.status
                    : undefined;
            const message = status === 429
                ? "Hệ thống đang giới hạn tần suất tải dữ liệu. Vui lòng đợi vài giây rồi bấm Làm mới."
                : fetchError instanceof Error
                    ? fetchError.message
                    : "Không tải được dữ liệu dashboard.";
            setError(message);
        } finally {
            if (!silent) {
                setLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        void loadDashboardData();

        const intervalId = window.setInterval(() => {
            if (document.visibilityState === "visible") {
                void loadDashboardData(true);
            }
        }, DASHBOARD_REFRESH_MS);

        return () => {
            window.clearInterval(intervalId);
        };
    }, [loadDashboardData]);

    const stats = useMemo(() => ([
        { label: "Đang mượn", value: String(statsCounts.borrowingNow), icon: BookCopy, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
        { label: "Quá hạn hiện có", value: String(statsCounts.overdueBorrowings), icon: AlertTriangle, color: "text-rose-300", bg: "bg-rose-500/10 border-rose-500/20" },
        { label: "Chờ xác nhận", value: String(statsCounts.pendingBorrowings), icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
        { label: "Phạt cần xử lý", value: String(statsCounts.unresolvedFineCases), icon: CircleDollarSign, color: "text-rose-300", bg: "bg-rose-500/10 border-rose-500/20" },
        { label: "Đã trả", value: String(statsCounts.returnedBorrowings), icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
        { label: "Đặt trước đang chờ", value: String(statsCounts.pendingReservations), icon: BookOpen, color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/20" },
    ]), [statsCounts]);

    const completionRate = useMemo(() => {
        const finished = statsCounts.returnedBorrowings;
        const active = statsCounts.borrowingNow + statsCounts.unresolvedFineCases;
        const total = finished + active;
        if (total === 0) {
            return 0;
        }
        return Math.round((finished / total) * 100);
    }, [statsCounts]);

    const hasUnresolvedFine = statsCounts.unresolvedFineCases > 0;

    return (
        <RouteGuard allowedRoles={["user"]}>
            <div className="p-8">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-white">
                        Xin chào, <span className="text-blue-400">{user?.fullName}</span>
                    </h1>
                    <p className="text-slate-400 mt-1 text-sm">Theo dõi các yêu cầu mượn, đặt trước và các khoản phí cần xử lý</p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
                        <span>
                            Cập nhật: {lastUpdatedAt ? lastUpdatedAt.toLocaleTimeString("vi-VN") : "--:--:--"}
                        </span>
                        <button
                            type="button"
                            onClick={() => void loadDashboardData(true)}
                            className="text-blue-400 hover:text-blue-300"
                        >
                            Làm mới
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="mb-6 flex items-center gap-2 text-slate-300 text-sm">
                        <Loader2 className="h-4 w-4 animate-spin" /> Đang tải dữ liệu dashboard...
                    </div>
                ) : null}

                {!loading && hasUnresolvedFine ? (
                    <div className="mb-6 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                        <p className="font-medium">
                            Bạn có {statsCounts.unresolvedFineCases} khoản phạt chưa xử lý.
                        </p>
                        <p className="mt-1 text-rose-200/90">
                            Vào mục mượn sách để thanh toán và đồng bộ trạng thái tài khoản.
                        </p>
                    </div>
                ) : null}

                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
                    {stats.map((s) => {
                        const Icon = s.icon;
                        return (
                            <div
                                key={s.label}
                                className={`flex items-center gap-3 p-4 rounded-2xl border bg-slate-900/60 ${s.bg}`}
                            >
                                <div className="p-2.5 rounded-xl bg-slate-800/60">
                                    <Icon className={`h-5 w-5 ${s.color}`} />
                                </div>
                                <div>
                                    <p className="text-xl font-bold text-white">{s.value}</p>
                                    <p className="text-slate-400 text-xs mt-0.5">{s.label}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    <div className="lg:col-span-2 bg-slate-900/60 border border-white/5 rounded-2xl p-6">
                        <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
                            <CalendarClock className="h-4 w-4 text-blue-400" /> Sách đang mượn gần đến hạn
                        </h2>
                        {focusBorrowings.length === 0 ? (
                            <p className="text-slate-500 text-sm">Hiện chưa có bản ghi mượn đang hoạt động.</p>
                        ) : (
                            <div className="space-y-3 text-sm">
                                {focusBorrowings.map((item) => {
                                    const remainingDays = Math.ceil((new Date(item.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                                    const dueHint = remainingDays <= 0
                                        ? "Đến hạn hôm nay"
                                        : `Còn ${remainingDays} ngày`;
                                    return (
                                        <div
                                            key={item._id}
                                            className="rounded-xl border border-white/10 bg-slate-800/60 px-3 py-3"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <p className="text-slate-100 line-clamp-1">{item.bookId?.title || "Không xác định"}</p>
                                                <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[11px] font-medium text-blue-200">
                                                    {dueHint}
                                                </span>
                                            </div>
                                            <p className="mt-1 text-xs text-slate-300">
                                                Hạn trả: {new Date(item.dueDate).toLocaleDateString("vi-VN")}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        <Link
                            href="/dashboard/borrowings"
                            className="mt-4 inline-flex items-center text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors"
                        >
                            Mở danh sách mượn →
                        </Link>
                    </div>

                    <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-6">
                        <h2 className="text-white font-semibold mb-4">Tiến độ tài khoản</h2>
                        <div className="rounded-xl border border-white/10 bg-slate-800/60 p-4">
                            <div className="flex items-baseline justify-between">
                                <span className="text-xs text-slate-400">Tỷ lệ trả đúng quy trình</span>
                                <span className="text-lg font-semibold text-emerald-300">{completionRate}%</span>
                            </div>
                            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-700">
                                <div
                                    className="h-full rounded-full bg-emerald-400 transition-all duration-500"
                                    style={{ width: `${completionRate}%` }}
                                />
                            </div>
                            <p className="mt-2 text-xs text-slate-400">
                                Tỷ lệ này chỉ tính các lượt đang mượn và khoản phạt chưa xử lý; các lượt quá hạn đã thanh toán sẽ không làm giảm tiến độ.
                            </p>
                        </div>

                        <div className="mt-4 space-y-3">
                            <Link
                                href="/dashboard/books"
                                className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-800/50 px-3 py-2.5 text-sm text-slate-200 hover:border-blue-500/40 hover:text-blue-300"
                            >
                                <span className="flex items-center gap-2">
                                    <Search className="h-4 w-4" /> Tìm sách mới
                                </span>
                                <span>→</span>
                            </Link>
                            <Link
                                href="/dashboard/reservations"
                                className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-800/50 px-3 py-2.5 text-sm text-slate-200 hover:border-indigo-500/40 hover:text-indigo-300"
                            >
                                <span className="flex items-center gap-2">
                                    <BookOpen className="h-4 w-4" /> Quản lý đặt trước
                                </span>
                                <span>→</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </RouteGuard>
    );
}
