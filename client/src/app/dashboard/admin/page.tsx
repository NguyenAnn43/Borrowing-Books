"use client";

import { Users, BookOpen, Library, BookCopy, TrendingUp, AlertTriangle } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { RouteGuard } from "@/components/RouteGuard";

const stats = [
    { label: "Tổng người dùng", value: "—", icon: Users, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
    { label: "Sách trong hệ thống", value: "—", icon: BookOpen, color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/20" },
    { label: "Thư viện đang hoạt động", value: "—", icon: Library, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
    { label: "Đang mượn", value: "—", icon: BookCopy, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
    { label: "Quá hạn", value: "—", icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
    { label: "Đặt trước chờ xử lý", value: "—", icon: TrendingUp, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
];

export default function AdminDashboard() {
    const { user } = useAuthStore();

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
                            { label: "Thêm sách", icon: BookOpen, href: "/dashboard/books" },
                            { label: "Xem danh sách mượn", icon: BookCopy, href: "/dashboard/borrowings" },
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
