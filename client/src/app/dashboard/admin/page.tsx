"use client";

import { useEffect, useMemo, useState } from "react";
import { Users, BookOpen, Library, BookCopy, TrendingUp, AlertTriangle, Flag } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { RouteGuard } from "@/components/RouteGuard";
import { userService } from "@/services/userService";
import { bookService } from "@/services/bookService";
import { libraryService } from "@/services/libraryService";
import { borrowingService } from "@/services/borrowingService";
import { reservationService } from "@/services/reservationService";

export default function AdminDashboard() {
    const { user } = useAuthStore();
    const [counts, setCounts] = useState({
        users: 0,
        books: 0,
        activeLibraries: 0,
        borrowed: 0,
        overdue: 0,
        pendingReservations: 0,
    });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [usersRes, booksRes, librariesRes, borrowedRes, overdueRes, pendingReservationsRes] = await Promise.all([
                    userService.getUsers({ page: 1, limit: 1 }),
                    bookService.getBooks({ page: 1, limit: 1 }),
                    libraryService.getLibraries({ page: 1, limit: 100 }),
                    borrowingService.getBorrowings({ page: 1, limit: 1, status: "borrowed" }),
                    borrowingService.getBorrowings({ page: 1, limit: 1, status: "overdue" }),
                    reservationService.getReservations({ page: 1, limit: 1, status: "pending" }),
                ]);

                setCounts({
                    users: usersRes.pagination.total,
                    books: booksRes.pagination.total,
                    activeLibraries: librariesRes.libraries.filter((library) => library.status === "active").length,
                    borrowed: borrowedRes.pagination.total,
                    overdue: overdueRes.pagination.total,
                    pendingReservations: pendingReservationsRes.pagination.total,
                });
            } catch {
                // keep defaults if stats fail to load
            }
        };

        void fetchStats();
    }, []);

    const stats = useMemo(
        () => [
            { label: "Tổng người dùng", value: String(counts.users), icon: Users, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
            { label: "Sách trong hệ thống", value: String(counts.books), icon: BookOpen, color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/20" },
            { label: "Thư viện đang hoạt động", value: String(counts.activeLibraries), icon: Library, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
            { label: "Đang mượn", value: String(counts.borrowed), icon: BookCopy, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
            { label: "Quá hạn", value: String(counts.overdue), icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
            { label: "Đặt trước chờ xử lý", value: String(counts.pendingReservations), icon: TrendingUp, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
        ],
        [counts]
    );

    return (
        <RouteGuard allowedRoles={["admin"]}>
            <div className="p-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-white">
                        Xin chào, <span className="text-blue-400">{user?.fullName}</span> 👋
                    </h1>
                    <p className="text-slate-400 mt-1 text-sm">Tổng quan hệ thống quản lý thư viện liên trường</p>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                    {stats.map((s) => {
                        const Icon = s.icon;
                        return (
                            <div
                                key={s.label}
                                className={`flex items-center gap-4 p-5 rounded-2xl border bg-slate-900/60 ${s.bg} backdrop-blur-sm`}
                            >
                                <div className={`p-3 rounded-xl bg-slate-800/60`}>
                                    <Icon className={`h-5 w-5 ${s.color}`} />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-white">{s.value}</p>
                                    <p className="text-slate-400 text-xs mt-0.5">{s.label}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Quick actions */}
                <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-6">
                    <h2 className="text-white font-semibold mb-4">Thao tác nhanh</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                            { label: "Thêm thư viện mới", icon: Library, href: "/dashboard/libraries" },
                            { label: "Quản lý người dùng", icon: Users, href: "/dashboard/users" },
                            { label: "Reported Reviews", icon: Flag, href: "/dashboard/reviews" },
                            { label: "Hồ sơ cá nhân", icon: Users, href: "/dashboard/profile" },
                            { label: "Thông báo", icon: BookCopy, href: "/dashboard/notifications" },
                        ].map((action) => {
                            const Icon = action.icon;
                            return (
                                <a
                                    key={action.label}
                                    href={action.href}
                                    className="flex flex-col items-center gap-2 p-4 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 hover:border-blue-500/40 text-blue-300 hover:text-blue-200 transition-all text-center text-xs font-medium"
                                >
                                    <Icon className="h-5 w-5" />
                                    {action.label}
                                </a>
                            );
                        })}
                    </div>
                </div>
            </div>
        </RouteGuard>
    );
}
