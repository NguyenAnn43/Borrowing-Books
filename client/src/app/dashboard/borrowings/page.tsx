"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Loader2, Search, Star, X } from "lucide-react";
import { RouteGuard } from "@/components/RouteGuard";
import { useAuthStore } from "@/stores/authStore";
import { borrowingService } from "@/services/borrowingService";
import { reviewService } from "@/services/reviewService";
import { paymentService } from "@/services/paymentService";
import { Pagination } from "@/components/ui/Pagination";
import { Input } from "@/components/ui/Input";
import { usePagination, useSearch } from "@/hooks";
import type { IBookReview, IBorrowing, ILibraryReview } from "@/types";

const RENEWAL_DAYS = 7;
const DEFAULT_MAX_RENEWALS = 2;
const BORROWING_STATUS = [
    { value: "pending", label: "Chờ xác nhận" },
    { value: "borrowed", label: "Đang mượn" },
    { value: "returned", label: "Đã trả" },
    { value: "overdue", label: "Quá hạn" },
    { value: "cancelled", label: "Đã hủy" },
    { value: "lost", label: "Mất sách" },
    { value: "damaged", label: "Hỏng sách" },
] as const;

const getStatusLabel = (status: string): string => {
    const statusMap: Record<string, string> = {
        pending: "Chờ xác nhận",
        borrowed: "Đang mượn",
        returned: "Đã trả",
        overdue: "Quá hạn",
        cancelled: "Đã hủy",
        lost: "Mất sách",
        damaged: "Hỏng sách",
    };
    return statusMap[status] || status;
};

const getStatusColor = (status: string): string => {
    const colorMap: Record<string, string> = {
        pending: "bg-blue-500/20 border border-blue-500/50 text-blue-200",
        borrowed: "bg-indigo-500/20 border border-indigo-500/50 text-indigo-200",
        returned: "bg-green-500/20 border border-green-500/50 text-green-200",
        overdue: "bg-amber-500/20 border border-amber-500/50 text-amber-200",
        cancelled: "bg-red-500/20 border border-red-500/50 text-red-200",
        lost: "bg-red-900/40 border border-red-500/50 text-red-200",
        damaged: "bg-orange-600/20 border border-orange-500/50 text-orange-200",
    };
    return colorMap[status] || "bg-slate-500/20 border border-slate-500/50 text-slate-200";
};

const getApiErrorMessage = (err: unknown): string | undefined => {
    if (!err || typeof err !== "object") return undefined;

    const data = (err as {
        message?: string;
        response?: { data?: { error?: { message?: string }; message?: string } };
    });

    return data.response?.data?.error?.message
        || data.response?.data?.message
        || data.message;
};

export default function BorrowingsPage() {
    const { user } = useAuthStore();
    const [borrowings, setBorrowings] = useState<IBorrowing[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
    const [reviewModalOpen, setReviewModalOpen] = useState(false);
    const [reviewLoading, setReviewLoading] = useState(false);
    const [reviewSubmitting, setReviewSubmitting] = useState(false);
    const [reviewBookId, setReviewBookId] = useState<string | null>(null);
    const [reviewBookTitle, setReviewBookTitle] = useState<string>("");
    const [currentReview, setCurrentReview] = useState<IBookReview | null>(null);
    const [reviewStars, setReviewStars] = useState<number>(5);
    const [reviewComment, setReviewComment] = useState<string>("");
    const [reviewImagesText, setReviewImagesText] = useState<string>("");
    const [reviewError, setReviewError] = useState<string | null>(null);
    const [libraryReviewModalOpen, setLibraryReviewModalOpen] = useState(false);
    const [libraryReviewLoading, setLibraryReviewLoading] = useState(false);
    const [libraryReviewSubmitting, setLibraryReviewSubmitting] = useState(false);
    const [reviewLibraryId, setReviewLibraryId] = useState<string | null>(null);
    const [reviewLibraryName, setReviewLibraryName] = useState<string>("");
    const [currentLibraryReview, setCurrentLibraryReview] = useState<ILibraryReview | null>(null);
    const [libraryReviewStars, setLibraryReviewStars] = useState<number>(5);
    const [libraryReviewComment, setLibraryReviewComment] = useState<string>("");
    const [libraryReviewImagesText, setLibraryReviewImagesText] = useState<string>("");
    const [libraryReviewError, setLibraryReviewError] = useState<string | null>(null);

    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [reportBorrowingId, setReportBorrowingId] = useState<string | null>(null);
    const [reportBookTitle, setReportBookTitle] = useState("");
    const [reportStatus, setReportStatus] = useState<"lost" | "damaged">("lost");
    const [reportNotes, setReportNotes] = useState("");
    const [reportSubmitting, setReportSubmitting] = useState(false);
    const [reportError, setReportError] = useState<string | null>(null);

    const { searchTerm, setSearchTerm, debouncedTerm, resetSearch } = useSearch({ debounceMs: 300 });
    const { page, limit, pagination, updatePagination, goToPage } = usePagination({ initialPage: 1, defaultLimit: 10 });

    const canViewAll = user?.role === "admin" || user?.role === "librarian";
    const canManage = user?.role === "librarian";

    const fetchBorrowings = useCallback(
        async () => {
            setLoading(true);
            setError(null);
            try {
                if (canViewAll) {
                    const result = await borrowingService.getBorrowings({
                        page: page,
                        limit: limit,
                        q: debouncedTerm || undefined,
                        status: (selectedStatus as "pending" | "borrowed" | "returned" | "overdue" | "cancelled" | "lost" | "damaged" | undefined) || undefined,
                    });
                    setBorrowings(result.borrowings);
                    updatePagination(result.pagination);
                } else {
                    const result = await borrowingService.getMyBorrowings({
                        page: page,
                        limit: limit,
                        status: selectedStatus || undefined,
                    });
                    setBorrowings(result.borrowings);
                    updatePagination(result.pagination);
                }
            } catch (fetchError) {
                const message = fetchError instanceof Error ? fetchError.message : "Không tải được danh sách mượn.";
                setError(message);
            } finally {
                setLoading(false);
            }
        },
        [page, limit, debouncedTerm, canViewAll, selectedStatus, updatePagination]
    );

    // Reset page to 1 if search term or status changes, except on initial load where page is already 1.
    // To prevent fetch loops and race conditions, we track the previous search/status.
    const prevSearchRef = useRef(debouncedTerm);
    const prevStatusRef = useRef(selectedStatus);
    const prevLimitRef = useRef(limit);

    useEffect(() => {
        let shouldResetPage = false;
        
        if (prevSearchRef.current !== debouncedTerm) {
            prevSearchRef.current = debouncedTerm;
            shouldResetPage = true;
        }
        if (prevStatusRef.current !== selectedStatus) {
            prevStatusRef.current = selectedStatus;
            shouldResetPage = true;
        }
        if (prevLimitRef.current !== limit) {
            prevLimitRef.current = limit;
            shouldResetPage = true;
        }

        if (shouldResetPage && page !== 1) {
            goToPage(1);
        } else {
            void fetchBorrowings();
        }
    }, [fetchBorrowings, debouncedTerm, selectedStatus, limit, page, goToPage]);

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

    const openReportModal = (id: string, title: string) => {
        setReportBorrowingId(id);
        setReportBookTitle(title);
        setReportStatus("lost");
        setReportNotes("");
        setReportError(null);
        setReportModalOpen(true);
    };

    const closeReportModal = () => {
        if (reportSubmitting) return;
        setReportModalOpen(false);
        setReportBorrowingId(null);
    };

    const submitReportIssue = async () => {
        if (!reportBorrowingId) return;
        setReportSubmitting(true);
        setReportError(null);
        try {
            await borrowingService.reportLostOrDamaged(reportBorrowingId, {
                status: reportStatus,
                notes: reportNotes.trim() || undefined,
            });
            setSuccess("Đã báo cáo sách thành công.");
            await fetchBorrowings();
            closeReportModal();
        } catch (err) {
            const message = getApiErrorMessage(err) || "Đã xảy ra lỗi khi báo cáo.";
            setReportError(message);
        } finally {
            setReportSubmitting(false);
        }
    };

    const openReviewModal = async (bookId: string, bookTitle: string) => {
        if (!user?._id) return;

        setReviewModalOpen(true);
        setReviewBookId(bookId);
        setReviewBookTitle(bookTitle);
        setReviewError(null);
        setCurrentReview(null);
        setReviewStars(5);
        setReviewComment("");
        setReviewImagesText("");
        setReviewLoading(true);

        try {
            const result = await reviewService.getBookReviews(bookId, { page: 1, limit: 100 });
            const mine = result.reviews.find((review) => review.userId?._id === user._id) || null;

            if (mine) {
                setCurrentReview(mine);
                setReviewStars(mine.stars);
                setReviewComment(mine.comment || "");
                setReviewImagesText(mine.images.join("\n"));
            }
        } catch (fetchError) {
            const message = fetchError instanceof Error ? fetchError.message : "Không thể tải dữ liệu review.";
            setReviewError(message);
        } finally {
            setReviewLoading(false);
        }
    };

    const closeReviewModal = () => {
        if (reviewSubmitting) return;
        setReviewModalOpen(false);
        setReviewBookId(null);
        setReviewBookTitle("");
        setCurrentReview(null);
        setReviewError(null);
    };

    const submitReview = async () => {
        if (!reviewBookId) return;

        setReviewSubmitting(true);
        setReviewError(null);

        const images = reviewImagesText
            .split(/\n|,/g)
            .map((item) => item.trim())
            .filter(Boolean);

        try {
            if (currentReview) {
                await reviewService.updateBookReview(currentReview._id, {
                    stars: reviewStars,
                    comment: reviewComment.trim() || undefined,
                    images,
                });
                setSuccess("Đã cập nhật đánh giá sách.");
            } else {
                await reviewService.createBookReview(reviewBookId, {
                    stars: reviewStars,
                    comment: reviewComment.trim() || undefined,
                    images,
                });
                setSuccess("Đã gửi đánh giá sách.");
            }

            closeReviewModal();
        } catch (submitError) {
            const message = submitError instanceof Error ? submitError.message : "Không thể gửi đánh giá.";
            setReviewError(message);
        } finally {
            setReviewSubmitting(false);
        }
    };

    const removeBookReview = async () => {
        if (!currentReview) return;

        setReviewSubmitting(true);
        setReviewError(null);

        try {
            await reviewService.deleteBookReview(currentReview._id);
            setSuccess("Đã xóa đánh giá sách.");
            closeReviewModal();
        } catch (deleteError) {
            const message = deleteError instanceof Error ? deleteError.message : "Không thể xóa đánh giá.";
            setReviewError(message);
        } finally {
            setReviewSubmitting(false);
        }
    };

    const openLibraryReviewModal = async (libraryId: string, libraryName: string) => {
        if (!user?._id) return;

        setLibraryReviewModalOpen(true);
        setReviewLibraryId(libraryId);
        setReviewLibraryName(libraryName);
        setLibraryReviewError(null);
        setCurrentLibraryReview(null);
        setLibraryReviewStars(5);
        setLibraryReviewComment("");
        setLibraryReviewImagesText("");
        setLibraryReviewLoading(true);

        try {
            const result = await reviewService.getLibraryReviews(libraryId, { page: 1, limit: 100 });
            const mine = result.reviews.find((review) => review.userId?._id === user._id) || null;

            if (mine) {
                setCurrentLibraryReview(mine);
                setLibraryReviewStars(mine.stars);
                setLibraryReviewComment(mine.comment || "");
                setLibraryReviewImagesText(mine.images.join("\n"));
            }
        } catch (fetchError) {
            const message = fetchError instanceof Error ? fetchError.message : "Không thể tải review thư viện.";
            setLibraryReviewError(message);
        } finally {
            setLibraryReviewLoading(false);
        }
    };

    const closeLibraryReviewModal = () => {
        if (libraryReviewSubmitting) return;
        setLibraryReviewModalOpen(false);
        setReviewLibraryId(null);
        setReviewLibraryName("");
        setCurrentLibraryReview(null);
        setLibraryReviewError(null);
    };

    const submitLibraryReview = async () => {
        if (!reviewLibraryId) return;

        setLibraryReviewSubmitting(true);
        setLibraryReviewError(null);

        const images = libraryReviewImagesText
            .split(/\n|,/g)
            .map((item) => item.trim())
            .filter(Boolean);

        try {
            if (currentLibraryReview) {
                await reviewService.updateLibraryReview(currentLibraryReview._id, {
                    stars: libraryReviewStars,
                    comment: libraryReviewComment.trim() || undefined,
                    images,
                });
                setSuccess("Đã cập nhật đánh giá thư viện.");
            } else {
                await reviewService.createLibraryReview(reviewLibraryId, {
                    stars: libraryReviewStars,
                    comment: libraryReviewComment.trim() || undefined,
                    images,
                });
                setSuccess("Đã gửi đánh giá thư viện.");
            }

            closeLibraryReviewModal();
        } catch (submitError) {
            const message = submitError instanceof Error ? submitError.message : "Không thể gửi đánh giá thư viện.";
            setLibraryReviewError(message);
        } finally {
            setLibraryReviewSubmitting(false);
        }
    };

    const removeLibraryReview = async () => {
        if (!currentLibraryReview) return;

        setLibraryReviewSubmitting(true);
        setLibraryReviewError(null);

        try {
            await reviewService.deleteLibraryReview(currentLibraryReview._id);
            setSuccess("Đã xóa đánh giá thư viện.");
            closeLibraryReviewModal();
        } catch (deleteError) {
            const message = deleteError instanceof Error ? deleteError.message : "Không thể xóa đánh giá thư viện.";
            setLibraryReviewError(message);
        } finally {
            setLibraryReviewSubmitting(false);
        }
    };

    const handleFinePayment = async (borrowingId: string) => {
        setActionLoading(borrowingId);
        setError(null);
        setSuccess(null);

        try {
            const result = await paymentService.createVnpayFinePayment(borrowingId);
            window.location.href = result.paymentUrl;
        } catch (actionError) {
            const message = getApiErrorMessage(actionError) || "Không thể tạo link thanh toán VNPay.";
            setError(message);
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

                {/* Search bar for all users */}
                <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/5 p-4">
                    <div className="flex items-center gap-2">
                        <Search className="h-5 w-5 text-indigo-400" />
                        <Input
                            type="text"
                            placeholder={canViewAll ? "Tìm kiếm theo tên sách hoặc người mượn..." : "Tìm kiếm theo tên sách..."}
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
                        {BORROWING_STATUS.map((status) => (
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
                    ) : borrowings.length === 0 ? (
                        <p className="text-slate-400 text-sm">Chưa có dữ liệu.</p>
                    ) : (
                        <div className="space-y-4">
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
                                            const canPayFineViaVnpay = item.status === "overdue" || item.status === "returned";

                                            return (
                                            <tr key={item._id} className="border-b border-white/5 text-slate-200 hover:bg-slate-800/30 transition-colors">
                                                <td className="py-2 pr-3 font-medium">
                                                    {item.bookId?._id ? (
                                                        <Link
                                                            href={`/books/${item.bookId._id}`}
                                                            className="text-blue-300 hover:text-blue-200 hover:underline"
                                                        >
                                                            {item.bookId?.title || "Xem sách"}
                                                        </Link>
                                                    ) : (
                                                        item.bookId?.title || "-"
                                                    )}
                                                </td>
                                                <td className="py-2 pr-3">{item.userId?.fullName || "-"}</td>
                                                <td className="py-2 pr-3">{item.libraryId?.name || "-"}</td>
                                                <td className="py-2 pr-3">
                                                    <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-semibold ${getStatusColor(item.status)}`}>
                                                        {getStatusLabel(item.status)}
                                                    </span>
                                                </td>
                                                <td className="py-2 pr-3">{new Date(item.dueDate).toLocaleDateString("vi-VN")}</td>
                                                <td className="py-2 pr-3">
                                                    {item.fineAmount?.toLocaleString("vi-VN") || 0}
                                                    {item.isFined && item.fineAmount > 0 ? (
                                                        <span className={`ml-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${item.finePaid
                                                            ? "bg-emerald-500/20 text-emerald-200"
                                                            : "bg-amber-500/20 text-amber-200"
                                                            }`}>
                                                            {item.finePaid ? "Đã thanh toán" : "Chưa thanh toán"}
                                                        </span>
                                                    ) : null}
                                                </td>
                                                <td className="py-2 text-right">
                                                    <div className="inline-flex flex-wrap items-center justify-end gap-2">
                                                        <Link
                                                            href={`/dashboard/borrowings/${item._id}`}
                                                            className="rounded-lg border border-slate-500/40 bg-slate-500/10 px-2.5 py-1 text-xs text-slate-200 hover:bg-slate-500/20"
                                                        >
                                                            Chi tiết
                                                        </Link>

                                                        {canManage && item.status === "pending" && (
                                                            <button
                                                                type="button"
                                                                disabled={actionLoading === item._id}
                                                                onClick={() => void runAction(item._id, () => borrowingService.confirmPickup(item._id), "Xác nhận nhận sách thành công.")}
                                                                className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-xs text-blue-200 hover:bg-blue-500/20 disabled:opacity-60"
                                                            >
                                                                Xác nhận
                                                            </button>
                                                        )}

                                                        {canManage && item.status === "borrowed" && (
                                                        <button
                                                            type="button"
                                                            disabled={actionLoading === item._id}
                                                            onClick={() => void runAction(item._id, () => borrowingService.returnBook(item._id), "Đã ghi nhận trả sách.")}
                                                            className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-60"
                                                        >
                                                            Trả sách
                                                        </button>
                                                    )}

                                                    {canManage && (item.status === "borrowed" || item.status === "overdue") && (
                                                        <button
                                                            type="button"
                                                            disabled={actionLoading === item._id}
                                                            onClick={() => openReportModal(item._id, item.bookId?.title || "Sách")}
                                                            className="rounded-lg border border-orange-500/30 bg-orange-500/10 px-2.5 py-1 text-xs text-orange-200 hover:bg-orange-500/20 disabled:opacity-60"
                                                        >
                                                            Báo lỗi
                                                        </button>
                                                    )}

                                                    {/* Librarian confirms cash payment at library; users can pay online via VNPay when eligible. */}

                                                    {canManage && item.isFined && item.fineAmount > 0 && !item.finePaid && (
                                                        <button
                                                            type="button"
                                                            disabled={actionLoading === item._id}
                                                            onClick={() =>
                                                                void runAction(
                                                                    item._id,
                                                                    () => borrowingService.payFine(item._id),
                                                                    "Đã xác nhận thu tiền phạt tại thư viện."
                                                                )
                                                            }
                                                            className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-60"
                                                        >
                                                            Xác nhận đã thu
                                                        </button>
                                                    )}

                                                    {canManage && item.isFined && item.fineAmount > 0 && item.finePaid && (
                                                        <button
                                                            type="button"
                                                            disabled
                                                            className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-200 opacity-70"
                                                        >
                                                            Đã thu tại quầy
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

                                                    {!canViewAll && (item.status === "borrowed" || item.status === "returned" || item.status === "overdue") && item.bookId?._id && (
                                                        <button
                                                            type="button"
                                                            onClick={() => void openReviewModal(item.bookId._id, item.bookId.title || "Sách")}
                                                            className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-2.5 py-1 text-xs text-yellow-200 hover:bg-yellow-500/20"
                                                        >
                                                            <span className="inline-flex items-center gap-1">
                                                                <Star className="h-3 w-3" /> Đánh giá
                                                            </span>
                                                        </button>
                                                    )}

                                                    {!canViewAll && (item.status === "borrowed" || item.status === "returned" || item.status === "overdue") && item.libraryId?._id && (
                                                        <button
                                                            type="button"
                                                            onClick={() => void openLibraryReviewModal(item.libraryId._id, item.libraryId.name || "Thư viện")}
                                                            className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-xs text-cyan-200 hover:bg-cyan-500/20"
                                                        >
                                                            <span className="inline-flex items-center gap-1">
                                                                <Star className="h-3 w-3" /> ĐG thư viện
                                                            </span>
                                                        </button>
                                                    )}

                                                    {!canViewAll && canPayFineViaVnpay && item.isFined && item.fineAmount > 0 && !item.finePaid && (
                                                        <button
                                                            type="button"
                                                            disabled={actionLoading === item._id}
                                                            onClick={() => void handleFinePayment(item._id)}
                                                            className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-200 hover:bg-amber-500/20 disabled:opacity-60"
                                                        >
                                                            Thanh toán VNPay
                                                        </button>
                                                    )}

                                                    {!canViewAll && canPayFineViaVnpay && item.isFined && item.fineAmount > 0 && item.finePaid && (
                                                        <button
                                                            type="button"
                                                            disabled
                                                            className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-200 opacity-70"
                                                        >
                                                            Đã thanh toán
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

                {reviewModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
                        <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-slate-900 p-5 shadow-2xl">
                            <div className="mb-4 flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-white">
                                    {currentReview ? "Cập nhật đánh giá" : "Đánh giá sách"}
                                </h2>
                                <button
                                    type="button"
                                    onClick={closeReviewModal}
                                    disabled={reviewSubmitting}
                                    className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200 disabled:opacity-50"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            <p className="mb-4 text-sm text-slate-300">{reviewBookTitle}</p>

                            {reviewLoading ? (
                                <div className="flex items-center gap-2 text-sm text-slate-300">
                                    <Loader2 className="h-4 w-4 animate-spin" /> Đang tải review...
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {reviewError && (
                                        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                                            {reviewError}
                                        </div>
                                    )}

                                    <div>
                                        <label className="mb-1 block text-xs font-semibold text-slate-300">Số sao (1-5)</label>
                                        <Input
                                            type="number"
                                            min={1}
                                            max={5}
                                            value={reviewStars}
                                            onChange={(e) => setReviewStars(Math.min(5, Math.max(1, Number(e.target.value) || 1)))}
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-xs font-semibold text-slate-300">Nhận xét</label>
                                        <textarea
                                            value={reviewComment}
                                            onChange={(e) => setReviewComment(e.target.value)}
                                            rows={4}
                                            className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500"
                                            placeholder="Chia sẻ trải nghiệm của bạn về cuốn sách..."
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-xs font-semibold text-slate-300">Ảnh (URL, mỗi dòng 1 ảnh)</label>
                                        <textarea
                                            value={reviewImagesText}
                                            onChange={(e) => setReviewImagesText(e.target.value)}
                                            rows={3}
                                            className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500"
                                            placeholder="https://..."
                                        />
                                    </div>

                                    <div className="flex justify-end gap-2 pt-2">
                                        {currentReview && (
                                            <button
                                                type="button"
                                                onClick={() => void removeBookReview()}
                                                disabled={reviewSubmitting}
                                                className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-200 hover:bg-red-500/20 disabled:opacity-60"
                                            >
                                                Xóa đánh giá
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={closeReviewModal}
                                            disabled={reviewSubmitting}
                                            className="rounded-lg border border-slate-600/50 bg-slate-700/40 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700/60 disabled:opacity-60"
                                        >
                                            Hủy
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => void submitReview()}
                                            disabled={reviewSubmitting}
                                            className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-xs font-semibold text-yellow-200 hover:bg-yellow-500/20 disabled:opacity-60"
                                        >
                                            {reviewSubmitting ? "Đang lưu..." : currentReview ? "Cập nhật" : "Gửi đánh giá"}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {libraryReviewModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
                        <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-slate-900 p-5 shadow-2xl">
                            <div className="mb-4 flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-white">
                                    {currentLibraryReview ? "Cập nhật đánh giá thư viện" : "Đánh giá thư viện"}
                                </h2>
                                <button
                                    type="button"
                                    onClick={closeLibraryReviewModal}
                                    disabled={libraryReviewSubmitting}
                                    className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200 disabled:opacity-50"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            <p className="mb-4 text-sm text-slate-300">{reviewLibraryName}</p>

                            {libraryReviewLoading ? (
                                <div className="flex items-center gap-2 text-sm text-slate-300">
                                    <Loader2 className="h-4 w-4 animate-spin" /> Đang tải review thư viện...
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {libraryReviewError && (
                                        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                                            {libraryReviewError}
                                        </div>
                                    )}

                                    <div>
                                        <label className="mb-1 block text-xs font-semibold text-slate-300">Số sao (1-5)</label>
                                        <Input
                                            type="number"
                                            min={1}
                                            max={5}
                                            value={libraryReviewStars}
                                            onChange={(e) => setLibraryReviewStars(Math.min(5, Math.max(1, Number(e.target.value) || 1)))}
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-xs font-semibold text-slate-300">Nhận xét</label>
                                        <textarea
                                            value={libraryReviewComment}
                                            onChange={(e) => setLibraryReviewComment(e.target.value)}
                                            rows={4}
                                            className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500"
                                            placeholder="Chia sẻ trải nghiệm của bạn về thư viện..."
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-xs font-semibold text-slate-300">Ảnh (URL, mỗi dòng 1 ảnh)</label>
                                        <textarea
                                            value={libraryReviewImagesText}
                                            onChange={(e) => setLibraryReviewImagesText(e.target.value)}
                                            rows={3}
                                            className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500"
                                            placeholder="https://..."
                                        />
                                    </div>

                                    <div className="flex justify-end gap-2 pt-2">
                                        {currentLibraryReview && (
                                            <button
                                                type="button"
                                                onClick={() => void removeLibraryReview()}
                                                disabled={libraryReviewSubmitting}
                                                className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-200 hover:bg-red-500/20 disabled:opacity-60"
                                            >
                                                Xóa đánh giá
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={closeLibraryReviewModal}
                                            disabled={libraryReviewSubmitting}
                                            className="rounded-lg border border-slate-600/50 bg-slate-700/40 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700/60 disabled:opacity-60"
                                        >
                                            Hủy
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => void submitLibraryReview()}
                                            disabled={libraryReviewSubmitting}
                                            className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/20 disabled:opacity-60"
                                        >
                                            {libraryReviewSubmitting ? "Đang lưu..." : currentLibraryReview ? "Cập nhật" : "Gửi đánh giá"}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                {/* Modal Báo mất / hỏng sách */}
                {reportModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
                        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-5 shadow-2xl">
                            <div className="mb-4 flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-white">
                                    Báo cáo Sách Mất / Hỏng
                                </h2>
                                <button
                                    type="button"
                                    onClick={closeReportModal}
                                    disabled={reportSubmitting}
                                    className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200 disabled:opacity-50"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            <p className="mb-4 text-sm text-slate-300">
                                Đang báo cáo cho sách: <span className="font-semibold text-white">{reportBookTitle}</span>
                            </p>

                            <div className="space-y-4">
                                {reportError && (
                                    <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                                        {reportError}
                                    </div>
                                )}

                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-slate-300">Tình trạng</label>
                                    <select
                                        value={reportStatus}
                                        onChange={(e) => setReportStatus(e.target.value as "lost" | "damaged")}
                                        className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500"
                                    >
                                        <option value="lost">Mất sách (Phạt x3 giá sách)</option>
                                        <option value="damaged">Hỏng sách (Phạt x2 giá sách)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-slate-300">Ghi chú thêm</label>
                                    <textarea
                                        value={reportNotes}
                                        onChange={(e) => setReportNotes(e.target.value)}
                                        rows={3}
                                        className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500"
                                        placeholder="Mô tả chi tiết tình trạng hoặc thỏa thuận với người dùng..."
                                    />
                                </div>

                                <div className="flex justify-end gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={closeReportModal}
                                        disabled={reportSubmitting}
                                        className="rounded-lg border border-slate-600/50 bg-slate-700/40 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700/60 disabled:opacity-60"
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => void submitReportIssue()}
                                        disabled={reportSubmitting}
                                        className="rounded-lg border border-orange-500/30 bg-orange-500/10 px-4 py-2 text-xs font-semibold text-orange-200 hover:bg-orange-500/20 disabled:opacity-60"
                                    >
                                        {reportSubmitting ? "Đang xử lý..." : "Xác nhận báo cáo"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </RouteGuard>
    );
}
