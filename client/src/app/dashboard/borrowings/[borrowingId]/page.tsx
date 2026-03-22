"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, Landmark, Loader2, UserRound } from "lucide-react";
import { RouteGuard } from "@/components/RouteGuard";
import { borrowingService } from "@/services/borrowingService";
import type { IBorrowing } from "@/types";

const getStatusLabel = (status: IBorrowing["status"]): string => {
    const statusMap: Record<IBorrowing["status"], string> = {
        pending: "Chờ xác nhận",
        borrowed: "Đang mượn",
        returned: "Đã trả",
        overdue: "Quá hạn",
        return_transit: "Đang chuyển trả",
        cancelled: "Đã hủy",
        lost: "Mất sách",
        damaged: "Hỏng sách",
    };

    return statusMap[status];
};

const getStatusColor = (status: IBorrowing["status"]): string => {
    const colorMap: Record<IBorrowing["status"], string> = {
        pending: "bg-blue-500/20 border-blue-500/40 text-blue-200",
        borrowed: "bg-indigo-500/20 border-indigo-500/40 text-indigo-200",
        returned: "bg-emerald-500/20 border-emerald-500/40 text-emerald-200",
        overdue: "bg-amber-500/20 border-amber-500/40 text-amber-200",
        return_transit: "bg-cyan-500/20 border-cyan-500/40 text-cyan-200",
        cancelled: "bg-red-500/20 border-red-500/40 text-red-200",
        lost: "bg-red-900/40 border-red-500/40 text-red-200",
        damaged: "bg-orange-600/20 border-orange-500/40 text-orange-200",
    };

    return colorMap[status];
};

const formatDateTime = (value?: string): string => {
    if (!value) return "-";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
};

const formatMoney = (amount?: number): string => {
    const value = Number(amount || 0);
    return `${value.toLocaleString("vi-VN")} VND`;
};

export default function BorrowingDetailPage() {
    const params = useParams<{ borrowingId: string }>();
    const borrowingId = useMemo(() => params?.borrowingId || "", [params?.borrowingId]);

    const [borrowing, setBorrowing] = useState<IBorrowing | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchBorrowingDetail = async () => {
            if (!borrowingId) {
                setError("Không tìm thấy mã đơn mượn.");
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);

            try {
                const result = await borrowingService.getBorrowingById(borrowingId);
                setBorrowing(result);
            } catch (fetchError) {
                const message = fetchError instanceof Error
                    ? fetchError.message
                    : "Không thể tải chi tiết đơn mượn.";
                setError(message);
                setBorrowing(null);
            } finally {
                setLoading(false);
            }
        };

        void fetchBorrowingDetail();
    }, [borrowingId]);

    return (
        <RouteGuard allowedRoles={["admin", "librarian", "user"]}>
            <div className="p-8">
                <div className="mb-6 flex items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Chi tiết lượt mượn</h1>
                        <p className="mt-1 text-sm text-slate-400">Theo dõi trạng thái mượn/trả, tiền phạt và luồng chuyển trả.</p>
                    </div>
                    <Link
                        href="/dashboard/borrowings"
                        className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/60 px-3.5 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800/70"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Quay lại danh sách
                    </Link>
                </div>

                {loading ? (
                    <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-4 text-sm text-slate-300">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Đang tải chi tiết...
                    </div>
                ) : error ? (
                    <div className="space-y-4">
                        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                            {error}
                        </div>
                        <Link
                            href="/dashboard/borrowings"
                            className="inline-flex items-center rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-sm text-indigo-200 hover:bg-indigo-500/20"
                        >
                            Trở về trang mượn/trả
                        </Link>
                    </div>
                ) : borrowing ? (
                    <div className="space-y-6">
                        <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <p className="text-xs uppercase tracking-wide text-slate-400">Mã đơn</p>
                                    <p className="text-sm font-semibold text-slate-100">{borrowing._id}</p>
                                </div>
                                <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${getStatusColor(borrowing.status)}`}>
                                    {getStatusLabel(borrowing.status)}
                                </span>
                            </div>
                        </section>

                        <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
                                <h2 className="mb-3 text-base font-semibold text-white">Thông tin sách</h2>
                                <div className="space-y-2 text-sm">
                                    <p className="text-slate-300">
                                        Tên sách: <span className="font-medium text-white">{borrowing.bookId?.title || "-"}</span>
                                    </p>
                                    <p className="text-slate-300">
                                        Tác giả: <span className="font-medium text-white">{borrowing.bookId?.author || "-"}</span>
                                    </p>
                                    <p className="text-slate-400">Mã sách: {borrowing.bookId?._id || "-"}</p>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
                                <h2 className="mb-3 text-base font-semibold text-white">Người mượn và thư viện</h2>
                                <div className="space-y-3 text-sm text-slate-300">
                                    <p className="inline-flex items-center gap-2">
                                        <UserRound className="h-4 w-4 text-indigo-300" />
                                        {borrowing.userId?.fullName || "-"} ({borrowing.userId?.email || "-"})
                                    </p>
                                    <p className="inline-flex items-center gap-2">
                                        <Landmark className="h-4 w-4 text-blue-300" />
                                        {borrowing.libraryId?.name || "-"}
                                        {borrowing.libraryId?.code ? ` (${borrowing.libraryId.code})` : ""}
                                    </p>
                                    <p className="inline-flex items-center gap-2">
                                        <Landmark className="h-4 w-4 text-cyan-300" />
                                        Nơi nhận trả thực tế:
                                        <span className="font-medium text-slate-100">
                                            {borrowing.returnHandledLibraryId?.name || borrowing.libraryId?.name || "-"}
                                        </span>
                                        {borrowing.returnHandledLibraryId?.code ? ` (${borrowing.returnHandledLibraryId.code})` : ""}
                                    </p>
                                </div>
                            </div>
                        </section>

                        <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
                            <h2 className="mb-3 text-base font-semibold text-white">Mốc thời gian</h2>
                            <div className="grid grid-cols-1 gap-3 text-sm text-slate-300 md:grid-cols-2">
                                <p className="inline-flex items-center gap-2">
                                    <CalendarDays className="h-4 w-4 text-slate-400" />
                                    Ngày tạo: <span className="font-medium text-slate-100">{formatDateTime(borrowing.createdAt)}</span>
                                </p>
                                <p>Ngày mượn: <span className="font-medium text-slate-100">{formatDateTime(borrowing.borrowDate)}</span></p>
                                <p>Hạn trả: <span className="font-medium text-slate-100">{formatDateTime(borrowing.dueDate)}</span></p>
                                <p>Ngày trả thực tế: <span className="font-medium text-slate-100">{formatDateTime(borrowing.actualReturnDate)}</span></p>
                                <p>Hoàn tất chuyển về kho gốc: <span className="font-medium text-slate-100">{formatDateTime(borrowing.transitCompletedAt)}</span></p>
                            </div>
                        </section>

                        {(borrowing.status === "return_transit" || borrowing.returnHandledLibraryId || borrowing.transitCompletedAt) && (
                            <section className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-5">
                                <h2 className="mb-3 text-base font-semibold text-cyan-100">Luồng trả chéo thư viện</h2>
                                <div className="space-y-2 text-sm text-cyan-50">
                                    <p>1. Bạn đọc trả sách tại thư viện nhận trả (không phải thư viện gốc).</p>
                                    <p>2. Hệ thống chuyển đơn sang trạng thái &quot;Đang chuyển trả&quot;.</p>
                                    <p>3. Thư viện gốc bấm &quot;Nhận về kho gốc&quot; để hoàn tất và cộng lại tồn kho.</p>
                                    <p>
                                        Thư viện nhận trả:{" "}
                                        <span className="font-semibold">
                                            {borrowing.returnHandledLibraryId?.name || "Chưa ghi nhận"}
                                        </span>
                                    </p>
                                    <p>
                                        Thời điểm hoàn tất nhập kho gốc:{" "}
                                        <span className="font-semibold">
                                            {formatDateTime(borrowing.transitCompletedAt)}
                                        </span>
                                    </p>
                                </div>
                            </section>
                        )}

                        <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
                                <h2 className="mb-3 text-base font-semibold text-white">Thông tin phạt</h2>
                                <div className="space-y-2 text-sm text-slate-300">
                                    <p>Tổng tiền phạt: <span className="font-medium text-slate-100">{formatMoney(borrowing.fineAmount)}</span></p>
                                    <p>Có phạt: <span className="font-medium text-slate-100">{borrowing.isFined ? "Có" : "Không"}</span></p>
                                    <p>Đã thanh toán phạt: <span className="font-medium text-slate-100">{borrowing.finePaid ? "Đã thanh toán" : "Chưa thanh toán"}</span></p>
                                    <p>Số ngày quá hạn: <span className="font-medium text-slate-100">{borrowing.overdueDays ?? 0}</span></p>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
                                <h2 className="mb-3 text-base font-semibold text-white">Gia hạn và ghi chú</h2>
                                <div className="space-y-2 text-sm text-slate-300">
                                    <p>Số lần gia hạn: <span className="font-medium text-slate-100">{borrowing.renewalCount ?? 0}</span></p>
                                    <p>Giới hạn gia hạn: <span className="font-medium text-slate-100">{borrowing.maxRenewals ?? 0}</span></p>
                                    <p>Ghi chú:</p>
                                    <p className="rounded-lg border border-white/10 bg-slate-800/50 px-3 py-2 text-slate-200">
                                        {borrowing.notes || "Không có ghi chú."}
                                    </p>
                                </div>
                            </div>
                        </section>
                    </div>
                ) : null}
            </div>
        </RouteGuard>
    );
}
