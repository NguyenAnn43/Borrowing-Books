"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { RouteGuard } from "@/components/RouteGuard";
import { Pagination } from "@/components/ui/Pagination";
import { usePagination } from "@/hooks";
import { paymentService } from "@/services/paymentService";
import type { IPayment } from "@/types";

const getStatusLabel = (status: IPayment["status"]): string => {
    if (status === "success") return "Thành công";
    if (status === "failed") return "Thất bại";
    return "Đang xử lý";
};

const getStatusColor = (status: IPayment["status"]): string => {
    if (status === "success") return "bg-emerald-500/20 border border-emerald-500/40 text-emerald-200";
    if (status === "failed") return "bg-red-500/20 border border-red-500/40 text-red-200";
    return "bg-amber-500/20 border border-amber-500/40 text-amber-200";
};

export default function PaymentHistoryPage() {
    const searchParams = useSearchParams();
    const [payments, setPayments] = useState<IPayment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "success" | "failed">("all");

    const { page, limit, pagination, updatePagination, goToPage } = usePagination({ initialPage: 1, defaultLimit: 10 });

    const callbackStatus = searchParams.get("status");
    const callbackMessage = searchParams.get("message");
    const callbackTxnRef = searchParams.get("txnRef");

    const callbackBanner = useMemo(() => {
        if (!callbackStatus) return null;

        if (callbackStatus === "success") {
            return {
                type: "success" as const,
                message: `Thanh toán VNPay thành công. Vui lòng kiểm tra tài khoản.`,
            };
        }

        return {
            type: "error" as const,
            message: callbackMessage || "Thanh toán VNPay thất bại. Vui lòng thử lại.",
        };
    }, [callbackMessage, callbackStatus, callbackTxnRef]);

    const fetchHistory = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const result = await paymentService.getPaymentHistory({
                page,
                limit,
                status: statusFilter === "all" ? undefined : statusFilter,
            });
            setPayments(result.payments);
            updatePagination(result.pagination);
        } catch (fetchError) {
            const message = fetchError instanceof Error ? fetchError.message : "Không tải được lịch sử thanh toán.";
            setError(message);
        } finally {
            setLoading(false);
        }
    }, [limit, page, statusFilter, updatePagination]);

    useEffect(() => {
        void fetchHistory();
    }, [fetchHistory]);

    return (
        <RouteGuard allowedRoles={["user", "admin", "librarian"]}>
            <div className="p-8 space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">Lịch sử thanh toán</h1>
                    <p className="mt-1 text-sm text-slate-400">Theo dõi các giao dịch thanh toán phạt qua VNPay.</p>
                </div>

                {callbackBanner ? (
                    <div
                        className={`rounded-xl px-4 py-3 text-sm ${callbackBanner.type === "success"
                            ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                            : "border border-red-500/30 bg-red-500/10 text-red-200"
                            }`}
                    >
                        {callbackBanner.message}
                    </div>
                ) : null}

                {error ? (
                    <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                        {error}
                    </div>
                ) : null}

                <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/5 p-4">
                    <p className="mb-3 text-xs font-semibold uppercase text-indigo-300">Lọc trạng thái giao dịch</p>
                    <div className="flex flex-wrap gap-2">
                        {(["all", "pending", "success", "failed"] as const).map((status) => (
                            <button
                                key={status}
                                onClick={() => {
                                    setStatusFilter(status);
                                    goToPage(1);
                                }}
                                className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${statusFilter === status
                                    ? "bg-indigo-500/40 border border-indigo-400 text-indigo-100"
                                    : "bg-slate-700/40 border border-slate-600/50 text-slate-300 hover:bg-slate-700/60"
                                    }`}
                            >
                                {status === "all" ? "Tất cả" : getStatusLabel(status)}
                            </button>
                        ))}
                    </div>
                </div>

                <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
                    {loading ? (
                        <div className="flex items-center gap-2 text-sm text-slate-300">
                            <Loader2 className="h-4 w-4 animate-spin" /> Đang tải lịch sử thanh toán...
                        </div>
                    ) : payments.length === 0 ? (
                        <p className="text-sm text-slate-400">Chưa có giao dịch thanh toán nào.</p>
                    ) : (
                        <div className="space-y-4">
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[900px] text-sm">
                                    <thead>
                                        <tr className="border-b border-white/10 text-left text-slate-400">
                                            <th className="py-2 pr-3">TxnRef</th>
                                            <th className="py-2 pr-3">Sách</th>
                                            <th className="py-2 pr-3">Số tiền</th>
                                            <th className="py-2 pr-3">Trạng thái</th>
                                            <th className="py-2 pr-3">Mã giao dịch VNPay</th>
                                            <th className="py-2 pr-3">Thời gian</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {payments.map((payment) => (
                                            <tr key={payment._id} className="border-b border-white/5 text-slate-200">
                                                <td className="py-2 pr-3 font-medium">{payment.txnRef}</td>
                                                <td className="py-2 pr-3">
                                                    {payment.borrowingId?.bookId?.title || "-"}
                                                </td>
                                                <td className="py-2 pr-3">{payment.amount.toLocaleString("vi-VN")} VND</td>
                                                <td className="py-2 pr-3">
                                                    <span className={`inline-block rounded-md px-2.5 py-1 text-xs font-semibold ${getStatusColor(payment.status)}`}>
                                                        {getStatusLabel(payment.status)}
                                                    </span>
                                                </td>
                                                <td className="py-2 pr-3">{payment.vnpTxnNo || "-"}</td>
                                                <td className="py-2 pr-3">
                                                    {(payment.paidAt || payment.createdAt)
                                                        ? new Date(payment.paidAt || payment.createdAt).toLocaleString("vi-VN")
                                                        : "-"}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex justify-center border-t border-white/10 pt-4">
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
