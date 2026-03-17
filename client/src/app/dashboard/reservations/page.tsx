"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { RouteGuard } from "@/components/RouteGuard";
import { useAuthStore } from "@/stores/authStore";
import { reservationService } from "@/services/reservationService";
import type { IReservation } from "@/types";

export default function ReservationsPage() {
    const { user } = useAuthStore();
    const [reservations, setReservations] = useState<IReservation[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const canViewAll = user?.role === "admin" || user?.role === "librarian";
    const canManage = user?.role === "librarian";

    const fetchReservations = async () => {
        setLoading(true);
        setError(null);
        try {
            if (canViewAll) {
                const { reservations: all } = await reservationService.getReservations({ page: 1, limit: 100 });
                setReservations(all);
            } else {
                const { reservations: mine } = await reservationService.getMyReservations({ page: 1, limit: 100 });
                setReservations(mine);
            }
        } catch (fetchError) {
            const message = fetchError instanceof Error ? fetchError.message : "Không tải được danh sách đặt trước.";
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void fetchReservations();
    }, [canViewAll]);

    const runAction = async (id: string, action: () => Promise<unknown>, successMessage: string) => {
        setActionLoading(id);
        setError(null);
        setSuccess(null);
        try {
            await action();
            setSuccess(successMessage);
            await fetchReservations();
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
                    <h1 className="text-2xl font-bold text-white">{canManage ? "Quản lý đặt trước" : canViewAll ? "Theo dõi đặt trước" : "Đặt trước của tôi"}</h1>
                    <p className="text-sm text-slate-400 mt-1">
                        {canManage ? "Xử lý hàng chờ và fulfillment" : canViewAll ? "Admin chỉ giám sát dữ liệu đặt trước" : "Theo dõi trạng thái đặt trước"}
                    </p>
                </div>

                {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
                {success && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{success}</div>}

                <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
                    {loading ? (
                        <div className="flex items-center gap-2 text-slate-300 text-sm">
                            <Loader2 className="h-4 w-4 animate-spin" /> Đang tải...
                        </div>
                    ) : reservations.length === 0 ? (
                        <p className="text-slate-400 text-sm">Chưa có dữ liệu.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[920px] text-sm">
                                <thead>
                                    <tr className="text-left text-slate-400 border-b border-white/10">
                                        <th className="py-2 pr-3">Sách</th>
                                        <th className="py-2 pr-3">Người đặt</th>
                                        <th className="py-2 pr-3">Thư viện</th>
                                        <th className="py-2 pr-3">Trạng thái</th>
                                        <th className="py-2 pr-3">Ngày đặt</th>
                                        <th className="py-2 text-right">Hành động</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reservations.map((item) => (
                                        <tr key={item._id} className="border-b border-white/5 text-slate-200">
                                            <td className="py-2 pr-3">{item.bookId?.title || "-"}</td>
                                            <td className="py-2 pr-3">{item.userId?.fullName || "-"}</td>
                                            <td className="py-2 pr-3">{item.libraryId?.name || "-"}</td>
                                            <td className="py-2 pr-3">{item.status}</td>
                                            <td className="py-2 pr-3">{new Date(item.reservationDate).toLocaleDateString("vi-VN")}</td>
                                            <td className="py-2 text-right">
                                                <div className="inline-flex flex-wrap items-center justify-end gap-2">
                                                    {canManage && item.status === "pending" && (
                                                        <button
                                                            type="button"
                                                            disabled={actionLoading === item._id}
                                                            onClick={() => void runAction(item._id, () => reservationService.markReady(item._id), "Đã đánh dấu READY.")}
                                                            className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-xs text-blue-200 hover:bg-blue-500/20 disabled:opacity-60"
                                                        >
                                                            Ready
                                                        </button>
                                                    )}

                                                    {canManage && item.status === "ready" && (
                                                        <button
                                                            type="button"
                                                            disabled={actionLoading === item._id}
                                                            onClick={() => void runAction(item._id, () => reservationService.fulfillReservation(item._id), "Đã fulfill reservation.")}
                                                            className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-60"
                                                        >
                                                            Fulfill
                                                        </button>
                                                    )}

                                                    {!canViewAll && item.status === "pending" && (
                                                        <button
                                                            type="button"
                                                            disabled={actionLoading === item._id}
                                                            onClick={() => void runAction(item._id, () => reservationService.cancelReservation(item._id), "Đã hủy đặt trước.")}
                                                            className="rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-xs text-red-200 hover:bg-red-500/20 disabled:opacity-60"
                                                        >
                                                            Hủy
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>
        </RouteGuard>
    );
}
