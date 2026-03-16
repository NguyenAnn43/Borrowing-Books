"use client";

import { BookCopy, BookOpen, Clock, CheckCircle2 } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { RouteGuard } from "@/components/RouteGuard";
import Link from "next/link";

const stats = [
    { label: "Đang mượn", value: "—", icon: BookCopy, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
    { label: "Chờ xác nhận", value: "—", icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
    { label: "Đã trả", value: "—", icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
    { label: "Đặt trước đang chờ", value: "—", icon: BookOpen, color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/20" },
];

export default function UserDashboard() {
    const { user } = useAuthStore();

    return (
        <RouteGuard allowedRoles={["user", "admin", "librarian"]}>
            <div className="p-8">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-white">
                        Xin chào, <span className="text-blue-400">{user?.fullName}</span> 👋
                    </h1>
                    <p className="text-slate-400 mt-1 text-sm">Quản lý sách bạn đang mượn và đặt trước</p>
                </div>

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
                        <p className="text-slate-500 text-sm">Chưa có dữ liệu</p>
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
