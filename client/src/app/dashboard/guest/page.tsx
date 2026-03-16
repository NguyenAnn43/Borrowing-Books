"use client";

import Link from "next/link";
import { BookOpen, Library, Compass, UserRound } from "lucide-react";
import { RouteGuard } from "@/components/RouteGuard";

export default function GuestDashboard() {
    return (
        <RouteGuard allowedRoles={["guest", "user", "librarian", "admin"]}>
            <div className="p-8">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-white">
                        Chào mừng bạn ở chế độ <span className="text-blue-400">Guest</span>
                    </h1>
                    <p className="text-slate-400 mt-1 text-sm">
                        Bạn có thể xem dữ liệu công khai. Đăng nhập để dùng mượn/trả và đặt trước.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                    <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-5">
                        <BookOpen className="h-5 w-5 text-blue-300 mb-2" />
                        <p className="text-white font-semibold">Xem danh mục sách</p>
                        <p className="text-slate-400 text-sm mt-1">Tra cứu đầu sách khả dụng từ các thư viện</p>
                    </div>
                    <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-5">
                        <Library className="h-5 w-5 text-indigo-300 mb-2" />
                        <p className="text-white font-semibold">Xem thư viện</p>
                        <p className="text-slate-400 text-sm mt-1">Xem thông tin các thư viện trong hệ thống</p>
                    </div>
                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5">
                        <Compass className="h-5 w-5 text-emerald-300 mb-2" />
                        <p className="text-white font-semibold">Khám phá nhanh</p>
                        <p className="text-slate-400 text-sm mt-1">Dùng chế độ đọc thử trước khi tạo tài khoản</p>
                    </div>
                </div>

                <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-6">
                    <p className="text-blue-200 mb-4 flex items-center gap-2">
                        <UserRound className="h-4 w-4" />
                        Bạn đang ở chế độ khách, một số chức năng sẽ bị giới hạn.
                    </p>
                    <Link
                        href="/login"
                        className="inline-flex items-center h-10 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-semibold transition-all"
                    >
                        Đăng nhập để dùng đầy đủ chức năng
                    </Link>
                </div>
            </div>
        </RouteGuard>
    );
}
