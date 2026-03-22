"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import { RouteGuard } from "@/components/RouteGuard";
import { useAuthStore } from "@/stores/authStore";
import { reservationService } from "@/services/reservationService";
import { Pagination } from "@/components/ui/Pagination";
import { Input } from "@/components/ui/Input";
import { usePagination, useSearch } from "@/hooks";
import type { IReservation } from "@/types";

const RESERVATION_STATUS = [
    { value: "pending", label: "Chờ xử lý" },
    { value: "ready", label: "Đã sẵn sàng" },
    { value: "completed", label: "Đã hoàn thành" },
    { value: "cancelled", label: "Đã hủy" },
    { value: "expired", label: "Hết hạn" },
] as const;

type ReservationStatusType = typeof RESERVATION_STATUS[number]["value"];

const getStatusColor = (status: string): string => {
    const colorMap: Record<string, string> = {
        pending: "bg-blue-500/20 border border-blue-500/50 text-blue-200",
        ready: "bg-indigo-500/20 border border-indigo-500/50 text-indigo-200",
        completed: "bg-green-500/20 border border-green-500/50 text-green-200",
        cancelled: "bg-red-500/20 border border-red-500/50 text-red-200",
        expired: "bg-amber-500/20 border border-amber-500/50 text-amber-200",
    };
    return colorMap[status] || "bg-slate-500/20 border border-slate-500/50 text-slate-200";
};

export default function ReservationsPage() {
    const { user } = useAuthStore();
    const [reservations, setReservations] = useState<IReservation[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

    const { searchTerm, setSearchTerm, debouncedTerm, resetSearch } = useSearch({ debounceMs: 300 });
    const { page, limit, pagination, updatePagination, goToPage } = usePagination({ initialPage: 1, defaultLimit: 10 });

    const canViewAll = user?.role === "admin" || user?.role === "librarian";
    const canManage = user?.role === "librarian";

    const fetchReservations = useCallback(
        async (p?: number, l?: number, searchQ?: string) => {
            setLoading(true);
            setError(null);
            try {
                const currentPage = p || page;
                const currentLimit = l || limit;
                const query = searchQ || debouncedTerm;

                if (canViewAll) {
                    const result = await reservationService.getReservations({
                        page: currentPage,
                        limit: currentLimit,
                        q: query || undefined,
                        status: (selectedStatus as ReservationStatusType) || undefined,
                    });
                    setReservations(result.reservations);
                    updatePagination(result.pagination);
                } else {
                    const result = await reservationService.getMyReservations({
                        page: currentPage,
                        limit: currentLimit,
                        status: selectedStatus || undefined,
                    });
                    setReservations(result.reservations);
                    updatePagination(result.pagination);
                }
            } catch (fetchError) {
                const message = fetchError instanceof Error ? fetchError.message : "Không tải được danh sách đặt trước.";
                setError(message);
            } finally {
                setLoading(false);
            }
        },
        [page, limit, debouncedTerm, canViewAll, selectedStatus, updatePagination]
    );

    useEffect(() => {
        void fetchReservations(1, limit, debouncedTerm);
        // Reset to page 1 when search changes
        if (debouncedTerm) {
            goToPage(1);
        }
    }, [debouncedTerm, limit, selectedStatus, fetchReservations, goToPage]);

    useEffect(() => {
        void fetchReservations();
    }, [fetchReservations, page]);

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

                {/* Search bar for admin/librarian */}
                {canViewAll && (
                    <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/5 p-4">
                        <div className="flex items-center gap-2">
                            <Search className="h-5 w-5 text-indigo-400" />
                            <Input
                                type="text"
                                placeholder="Tìm kiếm theo tên sách..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="flex-1"
                            />
                            {searchTerm && (
                                <button
                                    onClick={resetSearch}
                                    className="p-2 text-slate-400 hover:text-slate-200"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    </div>
                )}

                <div className="rounded-2xl border-2 border-indigo-500/30 bg-indigo-500/5 p-4">
                    <p className="text-xs font-semibold text-indigo-300 mb-3 uppercase">Lọc theo trạng thái</p>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => {
                                setSelectedStatus(null);
                                goToPage(1);
                            }}
                            className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all duration-200 ${
                                selectedStatus === null
                                    ? "bg-indigo-500/40 border-2 border-indigo-400 text-indigo-100 shadow-lg shadow-indigo-500/20"
                                    : "bg-slate-700/40 border-2 border-slate-600/50 text-slate-300 hover:bg-slate-700/60 hover:border-slate-500"
                            }`}
                        >
                            Tất cả
                        </button>
                        {RESERVATION_STATUS.map((status) => (
                            <button
                                key={status.value}
                                onClick={() => {
                                    setSelectedStatus(status.value);
                                    goToPage(1);
                                }}
                                className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all duration-200 ${
                                    selectedStatus === status.value
                                        ? `${getStatusColor(status.value)} shadow-lg opacity-100`
                                        : "bg-slate-700/40 border-2 border-slate-600/50 text-slate-300 hover:bg-slate-700/60 hover:border-slate-500"
                                }`}
                            >
                                {status.label}
                            </button>
                        ))}
                    </div>
                </div>

                <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
                    {loading ? (
                        <div className="flex items-center gap-2 text-slate-300 text-sm">
                            <Loader2 className="h-4 w-4 animate-spin" /> Đang tải...
                        </div>
                    ) : reservations.length === 0 ? (
                        <p className="text-slate-400 text-sm">Chưa có dữ liệu.</p>
                    ) : (
                        <div className="space-y-4">
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
                                            <tr key={item._id} className="border-b border-white/5 text-slate-200 hover:bg-slate-800/30 transition-colors">
                                                <td className="py-2 pr-3 font-medium">{item.bookId?.title || "-"}</td>
                                                <td className="py-2 pr-3">{item.userId?.fullName || "-"}</td>
                                                <td className="py-2 pr-3">{item.libraryId?.name || "-"}</td>
                                                <td className="py-2 pr-3">
                                                    <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-semibold ${getStatusColor(item.status)}`}>
                                                        {item.status}
                                                    </span>
                                                </td>
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
