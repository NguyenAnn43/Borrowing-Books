"use client";

import { useEffect, useMemo, useState } from "react";
import {
    AlertTriangle,
    BookCopy,
    BookOpen,
    CheckCircle2,
    CircleDollarSign,
    Clock,
    Flag,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { RouteGuard } from "@/components/RouteGuard";
import { borrowingService } from "@/services/borrowingService";
import { reportService } from "@/services/reportService";
import type { IDashboardReport } from "@/types";

const formatMoney = (amount: number): string =>
    new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0,
    }).format(amount);

const shortMoney = (amount: number): string => {
    if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
    if (amount >= 1_000) return `${Math.round(amount / 1_000)}k`;
    return `${amount}`;
};

export default function LibrarianDashboard() {
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [analytics, setAnalytics] = useState<IDashboardReport | null>(null);
    const [analyticsError, setAnalyticsError] = useState<string | null>(null);
    const [opsCounts, setOpsCounts] = useState({
        pending: 0,
        borrowed: 0,
        overdue: 0,
    });

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                setLoading(true);
                setAnalyticsError(null);

                const [pendingRes, borrowedRes, overdueRes, dashboardReport] = await Promise.all([
                    borrowingService.getBorrowings({ page: 1, limit: 1, status: "pending" }),
                    borrowingService.getBorrowings({ page: 1, limit: 1, status: "borrowed" }),
                    borrowingService.getBorrowings({ page: 1, limit: 1, status: "overdue", finePaid: false }),
                    reportService.getDashboardReport({ months: 12, topLimit: 6, activityThreshold: 3 }),
                ]);

                setOpsCounts({
                    pending: pendingRes.pagination.total,
                    borrowed: borrowedRes.pagination.total,
                    overdue: overdueRes.pagination.total,
                });
                setAnalytics(dashboardReport);
            } catch {
                setAnalyticsError("Không thể tải dữ liệu dashboard thủ thư.");
            } finally {
                setLoading(false);
            }
        };

        void fetchDashboard();
    }, []);

    const incurredFine12m = useMemo(
        () => (analytics?.fineIncurredByMonth || []).reduce((sum, item) => sum + item.totalFineIncurred, 0),
        [analytics]
    );

    const monthlyFineIncurred = useMemo(() => (analytics?.fineIncurredByMonth || []).slice(-8), [analytics]);
    const maxMonthlyRevenue = useMemo(
        () => Math.max(...monthlyFineIncurred.map((item) => item.totalFineIncurred), 1),
        [monthlyFineIncurred]
    );

    const topBooks = useMemo(() => (analytics?.topBorrowedBooks || []).slice(0, 6), [analytics]);
    const maxTopBooks = useMemo(() => Math.max(...topBooks.map((item) => item.totalBorrowings), 1), [topBooks]);

    const topViolators = useMemo(() => (analytics?.userActivity.topViolators || []).slice(0, 6), [analytics]);
    const maxViolatorCount = useMemo(() => Math.max(...topViolators.map((item) => item.violationCount), 1), [topViolators]);

    const onTimeCount = analytics?.lateReturnRate.onTimeCount || 0;
    const lateCount = analytics?.lateReturnRate.lateOrOverdueCount || 0;
    const totalReturnPerf = Math.max(onTimeCount + lateCount, 1);
    const latePercent = (lateCount / totalReturnPerf) * 100;

    const kpis = [
        {
            label: "Yêu cầu chờ duyệt",
            value: String(opsCounts.pending),
            icon: Clock,
            accent: "text-amber-300",
            box: "border-amber-500/30 bg-amber-500/10",
        },
        {
            label: "Đang cho mượn",
            value: String(opsCounts.borrowed),
            icon: BookCopy,
            accent: "text-blue-300",
            box: "border-blue-500/30 bg-blue-500/10",
        },
        {
            label: "Quá hạn chưa thanh toán",
            value: String(opsCounts.overdue),
            icon: AlertTriangle,
            accent: "text-rose-300",
            box: "border-rose-500/30 bg-rose-500/10",
        },
        {
            label: "Phạt phát sinh (12 tháng)",
            value: formatMoney(incurredFine12m),
            icon: CircleDollarSign,
            accent: "text-emerald-300",
            box: "border-emerald-500/30 bg-emerald-500/10",
        },
    ];

    return (
        <RouteGuard allowedRoles={["librarian", "admin"]}>
            <div className="p-8 space-y-6">
                <div className="rounded-3xl border border-white/10 bg-slate-950/60 px-6 py-5">
                    <h1 className="text-2xl font-bold text-white">
                        Dashboard Thủ Thư · <span className="text-blue-400">{user?.fullName}</span>
                    </h1>
                    
                    <div className="mt-4 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-amber-300">Pending: {opsCounts.pending}</span>
                        <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-blue-300">Borrowed: {opsCounts.borrowed}</span>
                        <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-rose-300">Overdue unpaid: {opsCounts.overdue}</span>
                        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-emerald-300">Fine incurred: {formatMoney(incurredFine12m)}</span>
                    </div>
                </div>

                {loading ? <p className="text-slate-400 text-sm">Đang tải dữ liệu dashboard...</p> : null}
                {analyticsError ? <p className="text-red-300 text-sm">{analyticsError}</p> : null}

                {!loading && !analyticsError && (
                    <>
                        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                            {kpis.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <div key={item.label} className={`rounded-2xl border p-4 ${item.box}`}>
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-xs text-slate-300">{item.label}</p>
                                            <Icon className={`h-4 w-4 ${item.accent}`} />
                                        </div>
                                        <p className={`text-2xl font-bold ${item.accent}`}>{item.value}</p>
                                    </div>
                                );
                            })}
                        </section>

                        <section className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                            <div className="xl:col-span-2 rounded-2xl border border-white/10 bg-slate-950/60 p-5">
                                <h2 className="text-sm font-semibold text-white mb-4">Phạt phát sinh theo tháng (8 tháng gần nhất)</h2>
                                <p className="mb-3 text-xs text-slate-400">Cột ghi nhận theo tháng đến hạn phát sinh phạt, nên trễ ở 02/2026 sẽ hiển thị ở 02/2026.</p>
                                <div className="h-64 grid grid-cols-8 gap-2">
                                    {monthlyFineIncurred.map((item) => (
                                        <div key={`mrev-${item.label}`} className="flex flex-col justify-end">
                                            <div className="text-[10px] text-center text-emerald-300 mb-1 min-h-4">
                                                {item.totalFineIncurred > 0 ? shortMoney(item.totalFineIncurred) : "0"}
                                            </div>
                                            <div className="h-48 flex items-end">
                                                <div
                                                    className="w-full rounded-t-md bg-gradient-to-t from-emerald-500/70 to-emerald-300"
                                                    style={{ height: `${Math.max((item.totalFineIncurred / maxMonthlyRevenue) * 100, 4)}%` }}
                                                />
                                            </div>
                                            <div className="text-[11px] text-center text-slate-400 mt-2">{item.label.slice(0, 2)}/{item.label.slice(-2)}</div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-4 rounded-xl border border-white/10 bg-slate-900/60 p-3 text-xs text-slate-300">
                                    Tổng phạt phát sinh 12 tháng: <span className="text-emerald-300 font-semibold">{formatMoney((analytics?.fineIncurredByMonth || []).reduce((sum, item) => sum + item.totalFineIncurred, 0))}</span>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
                                <h2 className="text-sm font-semibold text-white mb-4">Hiệu suất trả sách</h2>
                                <div className="flex items-center gap-4 mb-5">
                                    <div
                                        className="h-24 w-24 rounded-full"
                                        style={{
                                            background: `conic-gradient(#fb7185 ${latePercent}%, #34d399 ${latePercent}% 100%)`,
                                        }}
                                    >
                                        <div className="h-full w-full scale-[0.7] rounded-full bg-slate-950" />
                                    </div>
                                    <div className="space-y-1 text-sm">
                                        <p className="text-slate-300">Đúng hạn: <span className="text-emerald-300 font-semibold">{onTimeCount}</span></p>
                                        <p className="text-slate-300">Muộn/quá hạn: <span className="text-rose-300 font-semibold">{lateCount}</span></p>
                                    </div>
                                </div>
                                <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-2">
                                    <div className="h-full bg-rose-400" style={{ width: `${latePercent}%` }} />
                                </div>
                                <p className="text-xs text-slate-400">Tỷ lệ muộn hiện tại: <span className="text-rose-300">{analytics?.lateReturnRate.lateReturnRate || 0}%</span></p>
                            </div>
                        </section>

                        <section className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
                                <h2 className="text-sm font-semibold text-white mb-4">Top sách được mượn nhiều</h2>
                                <div className="space-y-3">
                                    {topBooks.map((book, index) => (
                                        <div key={book.bookId}>
                                            <div className="flex items-center justify-between text-xs mb-1">
                                                <span className="text-slate-200 truncate pr-3">#{index + 1} {book.title}</span>
                                                <span className="text-blue-300">{book.totalBorrowings} lượt</span>
                                            </div>
                                            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                                <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-300" style={{ width: `${(book.totalBorrowings / maxTopBooks) * 100}%` }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
                                <h2 className="text-sm font-semibold text-white mb-4">Người dùng vi phạm</h2>
                                <div className="space-y-3">
                                    {topViolators.map((item) => (
                                        <div key={item.userId}>
                                            <div className="flex items-center justify-between text-xs mb-1">
                                                <span className="text-slate-200 truncate pr-3">{item.fullName}</span>
                                                <span className="text-amber-300">{item.violationCount} lượt</span>
                                            </div>
                                            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-amber-500 to-yellow-300"
                                                    style={{ width: `${(item.violationCount / maxViolatorCount) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>
                    </>
                )}

                <section className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
                    <h2 className="text-sm font-semibold text-white mb-3">Lối tắt</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        {[
                            { label: "Xác nhận lấy sách", icon: CheckCircle2, href: "/dashboard/borrowings" },
                            { label: "Ghi nhận trả sách", icon: BookCopy, href: "/dashboard/borrowings" },
                            { label: "Thêm sách mới", icon: BookOpen, href: "/dashboard/books" },
                            { label: "Review cần theo dõi", icon: Flag, href: "/dashboard/reviews" },
                        ].map((item) => {
                            const Icon = item.icon;
                            return (
                                <a key={item.label} href={item.href} className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-blue-300 hover:bg-blue-500/20 transition-colors flex items-center gap-2">
                                    <Icon className="h-4 w-4" />
                                    <span>{item.label}</span>
                                </a>
                            );
                        })}
                    </div>
                </section>
            </div>
        </RouteGuard>
    );
}
