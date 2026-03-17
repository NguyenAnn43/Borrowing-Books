"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { RouteGuard } from "@/components/RouteGuard";
import { useAuthStore } from "@/stores/authStore";
import { borrowingService } from "@/services/borrowingService";
import type { IBorrowing } from "@/types";

const RENEWAL_DAYS = 7;
const DEFAULT_MAX_RENEWALS = 2;

export default function BorrowingsPage() {
    const { user } = useAuthStore();
    const [borrowings, setBorrowings] = useState<IBorrowing[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const canViewAll = user?.role === "admin" || user?.role === "librarian";
    const canManage = user?.role === "librarian";

    const fetchBorrowings = async () => {
        setLoading(true);
        setError(null);
        try {
            if (canViewAll) {
                const { borrowings: all } = await borrowingService.getBorrowings({ page: 1, limit: 100 });
                setBorrowings(all);
            } else {
                const { borrowings: mine } = await borrowingService.getMyBorrowings({ page: 1, limit: 100 });
                setBorrowings(mine);
            }
        } catch (fetchError) {
            const message = fetchError instanceof Error ? fetchError.message : "Không tải được danh sách mượn.";
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void fetchBorrowings();
    }, [canViewAll]);

    const runAction = async (id: string, action: () => Promise<unknown>, successMessage: string) => {
        setActionLoading(id);
        setError(null);
        setSuccess(null);
        try {
            await action();
            setSuccess(successMessage);
            await fetchBorrowings();
        } catch (actionError) {
            const message = actionError instanceof Error ? actionError.message : "Không thể thực hiện thao tác.";
            setError(message);
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <RouteGuard allowedRoles={["admin", "librarian", "user"]}>
            <div className="p-8 space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">{canManage ? "Quản lý mượn/trả" : canViewAll ? "Theo dõi mượn/trả" : "Mượn của tôi"}</h1>
                    <p className="text-sm text-slate-400 mt-1">
                        {canManage ? "Xử lý mượn, trả, thu phạt" : canViewAll ? "Admin chỉ giám sát dữ liệu mượn/trả" : "Theo dõi và quản lý lịch sử mượn"}
                    </p>
                    {!canViewAll && (
                        <p className="text-xs text-indigo-300 mt-2">
                            Chính sách gia hạn: mỗi lần gia hạn cộng thêm {RENEWAL_DAYS} ngày, tối đa {DEFAULT_MAX_RENEWALS} lần.
                        </p>
                    )}
                </div>

                {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
                {success && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{success}</div>}

                <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
                    {loading ? (
                        <div className="flex items-center gap-2 text-slate-300 text-sm">
                            <Loader2 className="h-4 w-4 animate-spin" /> Đang tải...
                        </div>
                    ) : borrowings.length === 0 ? (
                        <p className="text-slate-400 text-sm">Chưa có dữ liệu.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[980px] text-sm">
                                <thead>
                                    <tr className="text-left text-slate-400 border-b border-white/10">
                                        <th className="py-2 pr-3">Sách</th>
                                        <th className="py-2 pr-3">Người mượn</th>
                                        <th className="py-2 pr-3">Thư viện</th>
                                        <th className="py-2 pr-3">Trạng thái</th>
                                        <th className="py-2 pr-3">Hạn trả</th>
                                        <th className="py-2 pr-3">Phạt</th>
                                        <th className="py-2 text-right">Hành động</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {borrowings.map((item) => {
                                        const renewalCount = item.renewalCount ?? 0;
                                        const maxRenewals = item.maxRenewals ?? DEFAULT_MAX_RENEWALS;
                                        const reachedRenewalLimit = renewalCount >= maxRenewals;

                                        return (
                                        <tr key={item._id} className="border-b border-white/5 text-slate-200">
                                            <td className="py-2 pr-3">{item.bookId?.title || "-"}</td>
                                            <td className="py-2 pr-3">{item.userId?.fullName || "-"}</td>
                                            <td className="py-2 pr-3">{item.libraryId?.name || "-"}</td>
                                            <td className="py-2 pr-3">{item.status}</td>
                                            <td className="py-2 pr-3">{new Date(item.dueDate).toLocaleDateString("vi-VN")}</td>
                                            <td className="py-2 pr-3">{item.fineAmount?.toLocaleString("vi-VN") || 0}</td>
                                            <td className="py-2 text-right">
                                                <div className="inline-flex flex-wrap items-center justify-end gap-2">
                                                    {canManage && item.status === "pending" && (
                                                        <button
                                                            type="button"
                                                            disabled={actionLoading === item._id}
                                                            onClick={() => void runAction(item._id, () => borrowingService.confirmPickup(item._id), "Xác nhận nhận sách thành công.")}
                                                            className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-xs text-blue-200 hover:bg-blue-500/20 disabled:opacity-60"
                                                        >
                                                            Confirm
                                                        </button>
                                                    )}

                                                    {canManage && (item.status === "borrowed" || item.status === "overdue") && (
                                                        <button
                                                            type="button"
                                                            disabled={actionLoading === item._id}
                                                            onClick={() => void runAction(item._id, () => borrowingService.returnBook(item._id), "Đã ghi nhận trả sách.")}
                                                            className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-60"
                                                        >
                                                            Return
                                                        </button>
                                                    )}

                                                    {canManage && item.isFined && item.fineAmount > 0 && (
                                                        <button
                                                            type="button"
                                                            disabled={actionLoading === item._id}
                                                            onClick={() => void runAction(item._id, () => borrowingService.payFine(item._id), "Đã cập nhật thanh toán phạt.")}
                                                            className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-200 hover:bg-amber-500/20 disabled:opacity-60"
                                                        >
                                                            Pay fine
                                                        </button>
                                                    )}

                                                    {!canViewAll && item.status === "pending" && (
                                                        <button
                                                            type="button"
                                                            disabled={actionLoading === item._id}
                                                            onClick={() => void runAction(item._id, () => borrowingService.cancelBorrowing(item._id), "Đã hủy yêu cầu mượn.")}
                                                            className="rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-xs text-red-200 hover:bg-red-500/20 disabled:opacity-60"
                                                        >
                                                            Hủy
                                                        </button>
                                                    )}

                                                    {!canViewAll && item.status === "borrowed" && (
                                                        <button
                                                            type="button"
                                                            disabled={actionLoading === item._id || reachedRenewalLimit}
                                                            onClick={() => {
                                                                if (reachedRenewalLimit) {
                                                                    setError(`Bạn đã dùng hết số lần gia hạn (${maxRenewals}).`);
                                                                    return;
                                                                }
                                                                void runAction(item._id, () => borrowingService.renewBorrowing(item._id), "Gia hạn thành công.");
                                                            }}
                                                            className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1 text-xs text-indigo-200 hover:bg-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                                                            title={reachedRenewalLimit ? `Đã đạt giới hạn gia hạn (${maxRenewals})` : `Đã gia hạn ${renewalCount}/${maxRenewals}`}
                                                        >
                                                            {reachedRenewalLimit
                                                                ? `Hết lượt (${renewalCount}/${maxRenewals})`
                                                                : `Gia hạn +${RENEWAL_DAYS} ngày (${renewalCount}/${maxRenewals})`}
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>
        </RouteGuard>
    );
}
