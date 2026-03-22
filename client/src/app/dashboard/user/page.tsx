"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BookCopy, BookOpen, Clock, CheckCircle2, Loader2 } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { RouteGuard } from "@/components/RouteGuard";
import Link from "next/link";
import { borrowingService } from "@/services/borrowingService";
import { reservationService } from "@/services/reservationService";
import type { IBorrowing, IReservation } from "@/types";

const DASHBOARD_REFRESH_MS = 45_000;

export default function UserDashboard() {
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [borrowings, setBorrowings] = useState<IBorrowing[]>([]);
    const [reservations, setReservations] = useState<IReservation[]>([]);
    const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

    const loadDashboardData = useCallback(async (silent = false) => {
        if (!silent) {
            setLoading(true);
        }
        setError(null);
        try {
            const [{ borrowings: myBorrowings }, { reservations: myReservations }] = await Promise.all([
                borrowingService.getMyBorrowings({ page: 1, limit: 200 }),
                reservationService.getMyReservations({ page: 1, limit: 200 }),
            ]);

            setBorrowings(myBorrowings);
            setReservations(myReservations);
            setLastUpdatedAt(new Date());
        } catch (fetchError) {
            const message = fetchError instanceof Error ? fetchError.message : "Không tải được dữ liệu dashboard.";
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

    const stats = useMemo(() => {
        const borrowingNow = borrowings.filter((item) => item.status === "borrowed" || item.status === "overdue").length;
        const pendingBorrowings = borrowings.filter((item) => item.status === "pending").length;
        const returnedBorrowings = borrowings.filter((item) => item.status === "returned").length;
        const pendingReservations = reservations.filter((item) => item.status === "pending" || item.status === "ready").length;

        return [
            { label: "Đang mượn", value: String(borrowingNow), icon: BookCopy, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
            { label: "Chờ xác nhận", value: String(pendingBorrowings), icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
            { label: "Đã trả", value: String(returnedBorrowings), icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
            { label: "Đặt trước đang chờ", value: String(pendingReservations), icon: BookOpen, color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/20" },
        ];
    }, [borrowings, reservations]);

    const activeBorrowings = useMemo(
        () => borrowings
            .filter((item) => item.status === "borrowed" || item.status === "overdue")
            .slice(0, 3),
        [borrowings]
    );

    return (
        <RouteGuard allowedRoles={["user"]}>
            <div className="p-8">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-white">
                        Xin chào, <span className="text-blue-400">{user?.fullName}</span> 👋
                    </h1>
                    <p className="text-slate-400 mt-1 text-sm">Quản lý sách bạn đang mượn và đặt trước</p>
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

                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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

                {/* Quick actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-6">
                        <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
                            <BookCopy className="h-4 w-4 text-blue-400" /> Sách đang mượn
                        </h2>
                        {activeBorrowings.length === 0 ? (
                            <p className="text-slate-500 text-sm">Bạn chưa có sách đang mượn.</p>
                        ) : (
                            <div className="space-y-2 text-sm">
                                {activeBorrowings.map((item) => (
                                    <div key={item._id} className="rounded-lg bg-slate-800/60 px-3 py-2">
                                        <p className="text-slate-100 line-clamp-1">{item.bookId?.title || "Không xác định"}</p>
                                        <p className="text-xs text-slate-400 mt-1">
                                            Hạn trả: {new Date(item.dueDate).toLocaleDateString("vi-VN")}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                        <Link
                            href="/dashboard/borrowings"
                            className="mt-4 inline-flex items-center text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors"
                        >
                            Xem tất cả →
                        </Link>
                    </div>

                    <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-6">
                        <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-indigo-400" /> Khám phá sách
                        </h2>
                        <p className="text-slate-500 text-sm">Tìm kiếm sách từ các thư viện trong mạng lưới</p>
                        <Link
                            href="/dashboard/books"
                            className="mt-4 inline-flex items-center text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors"
                        >
                            Tìm sách ngay →
                        </Link>
                    </div>
                </div>
            </div>
        </RouteGuard>
    );
}
