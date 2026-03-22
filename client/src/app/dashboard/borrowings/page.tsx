"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
    { value: "return_transit", label: "Đang chuyển trả" },
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
        return_transit: "Đang chuyển trả",
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
        return_transit: "bg-cyan-500/20 border border-cyan-500/50 text-cyan-200",
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

const formatDate = (value?: string): string => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("vi-VN");
};

const formatMoney = (amount?: number): string => {
    const value = Number(amount || 0);
    return `${value.toLocaleString("vi-VN")} VND`;
};

type LibraryRef = { _id?: string; name?: string } | string | null | undefined;

type LibrarianFlowHint = {
    tone: "cyan" | "amber" | "emerald" | "slate";
    title: string;
    message: string;
};

const getEntityId = (value: LibraryRef): string | undefined => {
    if (!value) return undefined;
    if (typeof value === "string") return value;
    return value._id;
};

const getFlowHintClassName = (tone: LibrarianFlowHint["tone"]): string => {
    const toneMap: Record<LibrarianFlowHint["tone"], string> = {
        cyan: "border-cyan-500/30 bg-cyan-500/10 text-cyan-100",
        amber: "border-amber-500/30 bg-amber-500/10 text-amber-100",
        emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-100",
        slate: "border-slate-500/30 bg-slate-500/10 text-slate-200",
    };
    return toneMap[tone];
};

const getLibrarianFlowHint = (borrowing: IBorrowing, currentLibraryId?: string): LibrarianFlowHint | null => {
    const homeLibraryId = getEntityId(borrowing.libraryId);
    const receivingLibraryId = getEntityId(borrowing.returnHandledLibraryId);
    const isAtHomeLibrary = Boolean(currentLibraryId && homeLibraryId === currentLibraryId);
    const isAtReceivingLibrary = Boolean(currentLibraryId && receivingLibraryId === currentLibraryId);
    const hasUnpaidFine = borrowing.isFined && borrowing.fineAmount > 0 && !borrowing.finePaid;

    if (borrowing.status === "return_transit") {
        if (isAtHomeLibrary) {
            return {
                tone: "cyan",
                title: "Bước 3: Chờ thư viện gốc nhận về kho",
                message: `Sách đã được ${borrowing.returnHandledLibraryId?.name || "thư viện nhận trả"} tiếp nhận. Bấm "Nhận về kho gốc" để chốt.`,
            };
        }

        if (isAtReceivingLibrary) {
            return {
                tone: "amber",
                title: "Bước 2: Đã tiếp nhận tại thư viện bạn",
                message: "Đang chờ thư viện gốc xác nhận nhập kho. Tạm thời kho thư viện bạn chưa tăng.",
            };
        }

        return {
            tone: "cyan",
            title: "Đơn đang chuyển trả chéo",
            message: "Chờ thư viện gốc xác nhận nhận về kho để khép kín đơn.",
        };
    }

    if (hasUnpaidFine) {
        return {
            tone: "amber",
            title: "Cần xác nhận thu tiền phạt",
            message: `Thu tại quầy ${formatMoney(borrowing.fineAmount)} rồi bấm "Xác nhận đã thu tiền phạt".`,
        };
    }

    if (borrowing.returnHandledLibraryId && (borrowing.status === "returned" || borrowing.status === "overdue")) {
        return {
            tone: "emerald",
            title: "Luồng trả chéo đã hoàn tất",
            message: "Đơn đã được tiếp nhận trả chéo và chốt thành công tại thư viện gốc.",
        };
    }

    if ((borrowing.status === "borrowed" || borrowing.status === "overdue") && currentLibraryId && !isAtHomeLibrary) {
        return {
            tone: "slate",
            title: "Đơn thuộc thư viện khác",
            message: "Nếu bạn đọc trả tại đây, dùng mục Tra cứu trả chéo để tiếp nhận thay vì trả thường.",
        };
    }

    return null;
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
    const [reviewGuidelinesAccepted, setReviewGuidelinesAccepted] = useState(false);
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
    const [libraryReviewGuidelinesAccepted, setLibraryReviewGuidelinesAccepted] = useState(false);
    const [libraryReviewError, setLibraryReviewError] = useState<string | null>(null);

    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [reportBorrowingId, setReportBorrowingId] = useState<string | null>(null);
    const [reportBookTitle, setReportBookTitle] = useState("");
    const [reportStatus, setReportStatus] = useState<"lost" | "damaged">("lost");
    const [reportNotes, setReportNotes] = useState("");
    const [reportSubmitting, setReportSubmitting] = useState(false);
    const [reportError, setReportError] = useState<string | null>(null);
    const [crossLookupQuery, setCrossLookupQuery] = useState("");
    const [crossLookupLoading, setCrossLookupLoading] = useState(false);
    const [crossLookupError, setCrossLookupError] = useState<string | null>(null);
    const [crossLookupResults, setCrossLookupResults] = useState<IBorrowing[]>([]);
    const [crossLookupSearched, setCrossLookupSearched] = useState(false);
    const [searchMode, setSearchMode] = useState<"list" | "cross">("list");

    const { searchTerm, setSearchTerm, debouncedTerm, resetSearch } = useSearch({ debounceMs: 300 });
    const { page, limit, pagination, updatePagination, goToPage } = usePagination({ initialPage: 1, defaultLimit: 10 });

    const canViewAll = user?.role === "admin" || user?.role === "librarian";
    const canManage = user?.role === "librarian";
    const librarianLibraryId = user?.role === "librarian" ? user.libraryId?._id : undefined;
    const librarianLibraryName = user?.role === "librarian" ? user.libraryId?.name : undefined;
    const statusCountInPage = useMemo(() => {
        const initial: Record<string, number> = {};
        for (const status of BORROWING_STATUS) {
            initial[status.value] = 0;
        }

        for (const borrowing of borrowings) {
            initial[borrowing.status] = (initial[borrowing.status] || 0) + 1;
        }

        return initial;
    }, [borrowings]);

    const unpaidFineCountInPage = useMemo(
        () => borrowings.filter((item) => item.isFined && item.fineAmount > 0 && !item.finePaid).length,
        [borrowings]
    );
    const pageStart = pagination.total === 0 ? 0 : (page - 1) * limit + 1;
    const pageEnd = pagination.total === 0 ? 0 : Math.min((page - 1) * limit + borrowings.length, pagination.total);

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
                        status: (selectedStatus as "pending" | "borrowed" | "returned" | "overdue" | "return_transit" | "cancelled" | "lost" | "damaged" | undefined) || undefined,
                    });
                    setBorrowings(result.borrowings);
                    updatePagination(result.pagination);
                } else {
                    const result = await borrowingService.getMyBorrowings({
                        page: page,
                        limit: limit,
                        q: debouncedTerm || undefined,
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
        setReviewGuidelinesAccepted(false);
        setReviewLoading(true);

        try {
            const result = await reviewService.getBookReviews(bookId, { page: 1, limit: 100 });
            const mine = result.reviews.find((review) => review.userId?._id === user._id) || null;

            if (mine) {
                setCurrentReview(mine);
                setReviewStars(mine.stars);
                setReviewComment(mine.comment || "");
                setReviewImagesText(mine.images.join("\n"));
                setReviewGuidelinesAccepted(true);
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

        if (currentReview?.isHidden) {
            setReviewError("Review của bạn đã bị ẩn do vi phạm tiêu chuẩn cộng đồng, không thể chỉnh sửa hoặc gửi lại.");
            return;
        }

        if (!currentReview && !reviewGuidelinesAccepted) {
            setReviewError("Bạn cần xác nhận tuân thủ quy tắc review trước khi gửi.");
            return;
        }

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
                    agreedToGuidelines: true,
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
        setLibraryReviewGuidelinesAccepted(false);
        setLibraryReviewLoading(true);

        try {
            const result = await reviewService.getLibraryReviews(libraryId, { page: 1, limit: 100 });
            const mine = result.reviews.find((review) => review.userId?._id === user._id) || null;

            if (mine) {
                setCurrentLibraryReview(mine);
                setLibraryReviewStars(mine.stars);
                setLibraryReviewComment(mine.comment || "");
                setLibraryReviewImagesText(mine.images.join("\n"));
                setLibraryReviewGuidelinesAccepted(true);
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

        if (currentLibraryReview?.isHidden) {
            setLibraryReviewError("Review của bạn đã bị ẩn do vi phạm tiêu chuẩn cộng đồng, không thể chỉnh sửa hoặc gửi lại.");
            return;
        }

        if (!currentLibraryReview && !libraryReviewGuidelinesAccepted) {
            setLibraryReviewError("Bạn cần xác nhận tuân thủ quy tắc review trước khi gửi.");
            return;
        }

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
                    agreedToGuidelines: true,
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

    const submitCrossLookup = async () => {
        const keyword = crossLookupQuery.trim();
        if (keyword.length < 2) {
            setCrossLookupError("Nhập ít nhất 2 ký tự để tra cứu đơn trả chéo.");
            setCrossLookupSearched(false);
            setCrossLookupResults([]);
            return;
        }

        setCrossLookupLoading(true);
        setCrossLookupError(null);
        try {
            const results = await borrowingService.lookupCrossReturnCandidates({
                q: keyword,
                limit: 8,
            });
            setCrossLookupResults(results);
            setCrossLookupSearched(true);
        } catch (lookupError) {
            const message = getApiErrorMessage(lookupError) || "Không thể tra cứu đơn trả chéo.";
            setCrossLookupError(message);
            setCrossLookupResults([]);
            setCrossLookupSearched(false);
        } finally {
            setCrossLookupLoading(false);
        }
    };

    const handleCrossReturnReceive = async (borrowingId: string) => {
        setActionLoading(borrowingId);
        setError(null);
        setSuccess(null);
        try {
            await borrowingService.receiveCrossLibraryReturn(borrowingId);
            setSuccess("Đã tiếp nhận trả chéo. Đơn được chuyển sang trạng thái đang chuyển trả.");
            setCrossLookupResults((prev) => prev.filter((item) => item._id !== borrowingId));
            await fetchBorrowings();
        } catch (receiveError) {
            const message = getApiErrorMessage(receiveError) || "Không thể tiếp nhận trả chéo.";
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
                    {canManage && librarianLibraryName && (
                        <p className="text-xs text-cyan-200 mt-2">
                            Bạn đang thao tác với vai trò thủ thư tại <span className="font-semibold">{librarianLibraryName}</span>.
                        </p>
                    )}
                    {!canViewAll && (
                        <p className="text-xs text-indigo-300 mt-2">
                            Chính sách gia hạn: mỗi lần gia hạn cộng thêm {RENEWAL_DAYS} ngày, tối đa {DEFAULT_MAX_RENEWALS} lần.
                        </p>
                    )}
                </div>

                {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
                {success && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{success}</div>}

                <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/5 p-4">
                    {canManage && (
                        <div className="mb-3 flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => setSearchMode("list")}
                                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${searchMode === "list"
                                    ? "border border-indigo-400 bg-indigo-500/30 text-indigo-100"
                                    : "border border-slate-500/40 bg-slate-700/40 text-slate-300 hover:bg-slate-700/60"
                                    }`}
                            >
                                Lọc danh sách
                            </button>
                            <button
                                type="button"
                                onClick={() => setSearchMode("cross")}
                                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${searchMode === "cross"
                                    ? "border border-cyan-400 bg-cyan-500/30 text-cyan-100"
                                    : "border border-slate-500/40 bg-slate-700/40 text-slate-300 hover:bg-slate-700/60"
                                    }`}
                            >
                                Tra cứu trả chéo
                            </button>
                        </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2">
                        <Search className="h-5 w-5 text-indigo-400" />
                        <Input
                            type="text"
                            placeholder={
                                canManage && searchMode === "cross"
                                    ? "Nhập mã đơn, tên sách, tên/email bạn đọc..."
                                    : canViewAll
                                        ? "Tìm kiếm theo tên sách hoặc người mượn..."
                                        : "Tìm kiếm theo tên sách..."
                            }
                            value={canManage && searchMode === "cross" ? crossLookupQuery : searchTerm}
                            onChange={(e) => {
                                if (canManage && searchMode === "cross") {
                                    setCrossLookupQuery(e.target.value);
                                    return;
                                }
                                setSearchTerm(e.target.value);
                            }}
                            onKeyDown={(e) => {
                                if (canManage && searchMode === "cross" && e.key === "Enter") {
                                    e.preventDefault();
                                    void submitCrossLookup();
                                }
                            }}
                            className="flex-1 min-w-[220px]"
                        />
                        {((canManage && searchMode === "cross" && crossLookupQuery) || (!(canManage && searchMode === "cross") && searchTerm)) && (
                            <button
                                type="button"
                                onClick={() => {
                                    if (canManage && searchMode === "cross") {
                                        setCrossLookupQuery("");
                                        setCrossLookupError(null);
                                        setCrossLookupSearched(false);
                                        setCrossLookupResults([]);
                                        return;
                                    }
                                    resetSearch();
                                }}
                                className="rounded-lg border border-slate-500/40 px-2.5 py-2 text-slate-300 hover:bg-slate-700/40"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                        {canManage && searchMode === "cross" && (
                            <button
                                type="button"
                                onClick={() => void submitCrossLookup()}
                                disabled={crossLookupLoading}
                                className="rounded-lg border border-cyan-400/40 bg-cyan-500/20 px-3 py-2 text-xs font-semibold text-cyan-100 hover:bg-cyan-500/30 disabled:opacity-60"
                            >
                                {crossLookupLoading ? "Đang tra..." : "Tra cứu"}
                            </button>
                        )}
                    </div>

                    {canManage && searchMode === "cross" && (
                        <div className="mt-3">
                            <p className="text-xs text-cyan-200/90">
                                Tra theo mã đơn, tên sách, tên/email bạn đọc để tiếp nhận trả tại thư viện hiện tại.
                            </p>

                            {crossLookupError && (
                                <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                                    {crossLookupError}
                                </div>
                            )}

                            {crossLookupResults.length > 0 && (
                                <div className="mt-3 space-y-2">
                                    {crossLookupResults.map((item) => {
                                        const hasFine = item.isFined && item.fineAmount > 0;
                                        const hasUnpaidFine = hasFine && !item.finePaid;

                                        return (
                                            <div
                                                key={`cross-${item._id}`}
                                                className="flex flex-col gap-2 rounded-xl border border-cyan-500/20 bg-slate-900/60 px-3 py-2 lg:flex-row lg:items-center lg:justify-between"
                                            >
                                                <div className="text-xs text-slate-200">
                                                    <p className="font-semibold text-cyan-100">{item.bookId?.title || "Sách"}</p>
                                                    <p className="text-slate-300">
                                                        Người mượn: {item.userId?.fullName || "-"} | Thư viện gốc: {item.libraryId?.name || "-"}
                                                    </p>
                                                    <p className="text-slate-400">
                                                        Mã đơn: {item._id} | Hạn trả: {formatDate(item.dueDate)} | Trạng thái: {getStatusLabel(item.status)}
                                                    </p>
                                                    <p className="mt-1 rounded-md border border-cyan-500/20 bg-cyan-500/10 px-2 py-1 text-cyan-100">
                                                        Sau khi tiếp nhận, đơn chuyển sang <span className="font-semibold">Đang chuyển trả</span> để thư viện gốc xác nhận nhập kho.
                                                    </p>
                                                    {hasFine && (
                                                        <p className={`mt-1 rounded-md border px-2 py-1 ${hasUnpaidFine ? "border-amber-500/20 bg-amber-500/10 text-amber-100" : "border-emerald-500/20 bg-emerald-500/10 text-emerald-100"}`}>
                                                            Phạt hiện tại: <span className="font-semibold">{formatMoney(item.fineAmount)}</span>
                                                            {" - "}
                                                            {hasUnpaidFine ? "Chưa thanh toán" : "Đã thanh toán"}
                                                        </p>
                                                    )}
                                                </div>
                                                <button
                                                    type="button"
                                                    disabled={actionLoading === item._id}
                                                    onClick={() => void handleCrossReturnReceive(item._id)}
                                                    className="rounded-lg border border-emerald-500/30 bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/25 disabled:opacity-60"
                                                >
                                                    {actionLoading === item._id ? "Đang xử lý..." : "Tiếp nhận trả tại thư viện này"}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {crossLookupSearched && crossLookupResults.length === 0 && !crossLookupError && !crossLookupLoading && (
                                <p className="mt-3 text-xs text-cyan-100/80">
                                    Không tìm thấy đơn đang mượn/quá hạn ở thư viện khác phù hợp từ khóa.
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {canManage && (
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                        <button
                            type="button"
                            onClick={() => {
                                setSelectedStatus("pending");
                                goToPage(1);
                            }}
                            className={`rounded-2xl border px-4 py-3 text-left transition ${selectedStatus === "pending"
                                ? "border-blue-400 bg-blue-500/20"
                                : "border-white/10 bg-slate-900/60 hover:border-blue-500/40"
                                }`}
                        >
                            <p className="text-xs uppercase tracking-wide text-slate-400">Chờ xác nhận</p>
                            <p className="mt-1 text-2xl font-bold text-blue-200">{statusCountInPage.pending || 0}</p>
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setSelectedStatus("borrowed");
                                goToPage(1);
                            }}
                            className={`rounded-2xl border px-4 py-3 text-left transition ${selectedStatus === "borrowed"
                                ? "border-indigo-400 bg-indigo-500/20"
                                : "border-white/10 bg-slate-900/60 hover:border-indigo-500/40"
                                }`}
                        >
                            <p className="text-xs uppercase tracking-wide text-slate-400">Đang mượn</p>
                            <p className="mt-1 text-2xl font-bold text-indigo-200">{statusCountInPage.borrowed || 0}</p>
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setSelectedStatus("return_transit");
                                goToPage(1);
                            }}
                            className={`rounded-2xl border px-4 py-3 text-left transition ${selectedStatus === "return_transit"
                                ? "border-cyan-400 bg-cyan-500/20"
                                : "border-white/10 bg-slate-900/60 hover:border-cyan-500/40"
                                }`}
                        >
                            <p className="text-xs uppercase tracking-wide text-slate-400">Chờ nhận về kho</p>
                            <p className="mt-1 text-2xl font-bold text-cyan-200">{statusCountInPage.return_transit || 0}</p>
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setSelectedStatus("overdue");
                                goToPage(1);
                            }}
                            className={`rounded-2xl border px-4 py-3 text-left transition ${selectedStatus === "overdue"
                                ? "border-amber-400 bg-amber-500/20"
                                : "border-white/10 bg-slate-900/60 hover:border-amber-500/40"
                                }`}
                        >
                            <p className="text-xs uppercase tracking-wide text-slate-400">Quá hạn</p>
                            <p className="mt-1 text-2xl font-bold text-amber-200">{statusCountInPage.overdue || 0}</p>
                        </button>
                        <div className="rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3">
                            <p className="text-xs uppercase tracking-wide text-slate-400">Phạt chưa thu</p>
                            <p className="mt-1 text-2xl font-bold text-emerald-200">{unpaidFineCountInPage}</p>
                            <p className="mt-1 text-xs text-slate-400">Trong danh sách hiện tại</p>
                        </div>
                    </div>
                )}

                {canManage && (
                    <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-cyan-200">Luồng Trả Chéo 3 Bước</p>
                        <div className="mt-3 grid gap-3 md:grid-cols-3">
                            <div className="rounded-xl border border-cyan-500/20 bg-slate-900/60 p-3">
                                <p className="text-xs font-semibold text-cyan-100">1. Tiếp nhận tại thư viện Y</p>
                                <p className="mt-1 text-xs text-slate-300">Tra cứu đơn khác thư viện rồi bấm nút Tiếp nhận trả tại thư viện này.</p>
                            </div>
                            <div className="rounded-xl border border-cyan-500/20 bg-slate-900/60 p-3">
                                <p className="text-xs font-semibold text-cyan-100">2. Đơn chuyển sang return_transit</p>
                                <p className="mt-1 text-xs text-slate-300">Nếu có phạt thì thu tại quầy và xác nhận đã thu để tránh kẹt trạng thái quá hạn.</p>
                            </div>
                            <div className="rounded-xl border border-cyan-500/20 bg-slate-900/60 p-3">
                                <p className="text-xs font-semibold text-cyan-100">3. Thư viện gốc X nhận về kho</p>
                                <p className="mt-1 text-xs text-slate-300">Bấm nút Nhận về kho gốc để tăng tồn kho thư viện gốc và khép kín đơn.</p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/5 p-4">
                    <p className="mb-3 text-xs font-semibold uppercase text-indigo-300">Lọc theo trạng thái</p>
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setSelectedStatus(null);
                                goToPage(1);
                            }}
                            className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all duration-200 ${selectedStatus === null
                                ? "bg-indigo-500/40 border-2 border-indigo-400 text-indigo-100 shadow-lg shadow-indigo-500/20"
                                : "bg-slate-700/40 border-2 border-slate-600/50 text-slate-300 hover:bg-slate-700/60 hover:border-slate-500"
                                }`}
                        >
                            Tất cả
                        </button>
                        {BORROWING_STATUS.map((status) => (
                            <button
                                type="button"
                                key={status.value}
                                onClick={() => {
                                    setSelectedStatus(status.value);
                                    goToPage(1);
                                }}
                                className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all duration-200 ${selectedStatus === status.value
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
                        <div className="flex items-center gap-2 text-sm text-slate-300">
                            <Loader2 className="h-4 w-4 animate-spin" /> Đang tải...
                        </div>
                    ) : borrowings.length === 0 ? (
                        <p className="text-sm text-slate-400">Chưa có dữ liệu.</p>
                    ) : canManage ? (
                        <div className="space-y-4">
                            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-4 py-3 text-xs text-cyan-100">
                                Trạng thái <span className="font-semibold">Đang chuyển trả</span> nghĩa là sách đã được nhận ở thư viện khác và đang chờ thư viện gốc bấm <span className="font-semibold">Nhận về kho</span>.
                            </div>

                            <div className="rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <p className="text-xs text-slate-300">
                                        Hiển thị <span className="font-semibold text-white">{pageStart}</span>
                                        {" - "}
                                        <span className="font-semibold text-white">{pageEnd}</span>
                                        {" / "}
                                        <span className="font-semibold text-white">{pagination.total}</span> đơn
                                    </p>
                                    <Pagination
                                        page={page}
                                        pages={pagination.pages}
                                        total={pagination.total}
                                        limit={limit}
                                        onPageChange={goToPage}
                                        showInfo={false}
                                        className="w-full sm:w-auto sm:flex-row sm:items-center sm:justify-end"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                {borrowings.map((item) => {
                                    const hasFine = item.isFined && item.fineAmount > 0;
                                    const hasUnpaidFine = hasFine && !item.finePaid;
                                    const isCurrentActionLoading = actionLoading === item._id;
                                    const canReportIssue = item.status === "borrowed" || item.status === "overdue";
                                    const canReviewBook =
                                        !canViewAll &&
                                        Boolean(item.bookId?._id) &&
                                        (item.status === "borrowed" || item.status === "returned" || item.status === "overdue" || item.status === "return_transit");
                                    const flowHint = getLibrarianFlowHint(item, librarianLibraryId);

                                    let primaryActionLabel: string | null = null;
                                    let primaryActionClass =
                                        "rounded-lg border border-slate-500/30 bg-slate-500/10 px-3 py-2 text-sm font-semibold text-slate-200";
                                    let primaryAction: (() => void) | null = null;

                                    if (item.status === "pending") {
                                        primaryActionLabel = "Xác nhận nhận sách";
                                        primaryActionClass = "rounded-lg border border-blue-500/30 bg-blue-500/15 px-3 py-2 text-sm font-semibold text-blue-200 hover:bg-blue-500/25";
                                        primaryAction = () =>
                                            void runAction(
                                                item._id,
                                                () => borrowingService.confirmPickup(item._id),
                                                "Xác nhận nhận sách thành công."
                                            );
                                    } else if (item.status === "borrowed") {
                                        primaryActionLabel = "Ghi nhận trả sách";
                                        primaryActionClass = "rounded-lg border border-emerald-500/30 bg-emerald-500/15 px-3 py-2 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/25";
                                        primaryAction = () =>
                                            void runAction(
                                                item._id,
                                                () => borrowingService.returnBook(item._id),
                                                "Đã ghi nhận trả sách."
                                            );
                                    } else if (item.status === "return_transit") {
                                        primaryActionLabel = "Nhận về kho gốc";
                                        primaryActionClass = "rounded-lg border border-cyan-500/30 bg-cyan-500/15 px-3 py-2 text-sm font-semibold text-cyan-200 hover:bg-cyan-500/25";
                                        primaryAction = () =>
                                            void runAction(
                                                item._id,
                                                () => borrowingService.receiveTransitReturn(item._id),
                                                "Đã nhận sách chuyển trả về kho gốc."
                                            );
                                    } else if (hasUnpaidFine) {
                                        primaryActionLabel = "Xác nhận đã thu tiền phạt";
                                        primaryActionClass = "rounded-lg border border-amber-500/30 bg-amber-500/15 px-3 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-500/25";
                                        primaryAction = () =>
                                            void runAction(
                                                item._id,
                                                () => borrowingService.payFine(item._id),
                                                "Đã xác nhận thu tiền phạt tại thư viện."
                                            );
                                    }

                                    return (
                                        <article key={item._id} className="rounded-2xl border border-white/10 bg-slate-900/80 p-4">
                                            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                                                <div className="space-y-2">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        {item.bookId?._id ? (
                                                            <Link
                                                                href={`/books/${item.bookId._id}`}
                                                                className="text-base font-semibold text-blue-300 hover:underline"
                                                            >
                                                                {item.bookId?.title || "Sách"}
                                                            </Link>
                                                        ) : (
                                                            <p className="text-base font-semibold text-slate-100">{item.bookId?.title || "Sách"}</p>
                                                        )}
                                                        <span className={`inline-flex rounded-md px-2.5 py-1 text-xs font-semibold ${getStatusColor(item.status)}`}>
                                                            {getStatusLabel(item.status)}
                                                        </span>
                                                    </div>

                                                    <p className="text-xs text-slate-400">Mã đơn: {item._id}</p>

                                                    <div className="grid gap-1 text-sm text-slate-300 md:grid-cols-2 xl:grid-cols-3">
                                                        <p>
                                                            Người mượn: <span className="text-slate-100">{item.userId?.fullName || "-"}</span>
                                                        </p>
                                                        <p>
                                                            Thư viện gốc: <span className="text-slate-100">{item.libraryId?.name || "-"}</span>
                                                        </p>
                                                        <p>
                                                            Hạn trả: <span className="text-slate-100">{formatDate(item.dueDate)}</span>
                                                        </p>
                                                        <p>
                                                            Trả thực tế: <span className="text-slate-100">{formatDate(item.actualReturnDate)}</span>
                                                        </p>
                                                        <p>
                                                            Phạt: <span className="text-slate-100">{formatMoney(item.fineAmount)}</span>
                                                        </p>
                                                        <p>
                                                            Thanh toán:{" "}
                                                            <span className={item.finePaid ? "text-emerald-300" : hasFine ? "text-amber-300" : "text-slate-100"}>
                                                                {hasFine ? (item.finePaid ? "Đã thanh toán" : "Chưa thanh toán") : "Không có phạt"}
                                                            </span>
                                                        </p>
                                                    </div>

                                                    {flowHint && (
                                                        <p className={`rounded-lg border px-3 py-2 text-xs ${getFlowHintClassName(flowHint.tone)}`}>
                                                            <span className="font-semibold">{flowHint.title}:</span> {flowHint.message}
                                                        </p>
                                                    )}
                                                </div>

                                                <div className="w-full space-y-2 xl:w-[280px]">
                                                    {primaryAction ? (
                                                        <button
                                                            type="button"
                                                            disabled={isCurrentActionLoading}
                                                            onClick={primaryAction}
                                                            className={`${primaryActionClass} w-full disabled:opacity-60`}
                                                        >
                                                            {isCurrentActionLoading ? "Đang xử lý..." : primaryActionLabel}
                                                        </button>
                                                    ) : (
                                                        <p className="rounded-lg border border-white/10 bg-slate-800/40 px-3 py-2 text-center text-xs text-slate-400">
                                                            Không có thao tác chính cho trạng thái này
                                                        </p>
                                                    )}

                                                    <div className="flex flex-wrap gap-2">
                                                        <Link
                                                            href={`/dashboard/borrowings/${item._id}`}
                                                            className="rounded-lg border border-slate-500/40 bg-slate-500/10 px-2.5 py-1.5 text-xs text-slate-200 hover:bg-slate-500/20"
                                                        >
                                                            Xem chi tiết
                                                        </Link>
                                                        {canReviewBook && (
                                                            <button
                                                                type="button"
                                                                onClick={() => void openReviewModal(item.bookId!._id, item.bookId?.title || "Sách")}
                                                                className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-2.5 py-1.5 text-xs text-yellow-200 hover:bg-yellow-500/20"
                                                            >
                                                                <span className="inline-flex items-center gap-1">
                                                                    <Star className="h-3 w-3" /> ĐG sách
                                                                </span>
                                                            </button>
                                                        )}
                                                        {canReportIssue && (
                                                            <button
                                                                type="button"
                                                                disabled={isCurrentActionLoading}
                                                                onClick={() => openReportModal(item._id, item.bookId?.title || "Sách")}
                                                                className="rounded-lg border border-orange-500/30 bg-orange-500/10 px-2.5 py-1.5 text-xs text-orange-200 hover:bg-orange-500/20 disabled:opacity-60"
                                                            >
                                                                Báo mất/hỏng
                                                            </button>
                                                        )}
                                                        {hasUnpaidFine && primaryActionLabel !== "Xác nhận đã thu tiền phạt" && (
                                                            <button
                                                                type="button"
                                                                disabled={isCurrentActionLoading}
                                                                onClick={() =>
                                                                    void runAction(
                                                                        item._id,
                                                                        () => borrowingService.payFine(item._id),
                                                                        "Đã xác nhận thu tiền phạt tại thư viện."
                                                                    )
                                                                }
                                                                className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-200 hover:bg-amber-500/20 disabled:opacity-60"
                                                            >
                                                                Xác nhận đã thu
                                                            </button>
                                                        )}
                                                        {hasFine && item.finePaid && (
                                                            <span className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-xs text-emerald-200">
                                                                Đã thu tại quầy
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>

                            <div className="rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <p className="text-xs text-slate-300">
                                        Trang <span className="font-semibold text-white">{page}</span>
                                        {" / "}
                                        <span className="font-semibold text-white">{Math.max(pagination.pages, 1)}</span>
                                    </p>
                                    <Pagination
                                        page={page}
                                        pages={pagination.pages}
                                        total={pagination.total}
                                        limit={limit}
                                        onPageChange={goToPage}
                                        showInfo={false}
                                        className="w-full sm:w-auto sm:flex-row sm:items-center sm:justify-end"
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <p className="text-xs text-slate-300">
                                        Hiển thị <span className="font-semibold text-white">{pageStart}</span>
                                        {" - "}
                                        <span className="font-semibold text-white">{pageEnd}</span>
                                        {" / "}
                                        <span className="font-semibold text-white">{pagination.total}</span> đơn
                                    </p>
                                    <Pagination
                                        page={page}
                                        pages={pagination.pages}
                                        total={pagination.total}
                                        limit={limit}
                                        onPageChange={goToPage}
                                        showInfo={false}
                                        className="w-full sm:w-auto sm:flex-row sm:items-center sm:justify-end"
                                    />
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[980px] text-sm">
                                    <thead>
                                        <tr className="border-b border-white/10 text-left text-slate-400">
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
                                            const canPayFineViaVnpay =
                                                item.status === "overdue" ||
                                                item.status === "returned" ||
                                                item.status === "return_transit";
                                            const canReviewBook =
                                                !canViewAll &&
                                                Boolean(item.bookId?._id) &&
                                                (item.status === "borrowed" || item.status === "returned" || item.status === "overdue" || item.status === "return_transit");

                                            return (
                                                <tr key={item._id} className="border-b border-white/5 text-slate-200 transition-colors hover:bg-slate-800/30">
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
                                                        <span className={`inline-block rounded-md px-2.5 py-1 text-xs font-semibold ${getStatusColor(item.status)}`}>
                                                            {getStatusLabel(item.status)}
                                                        </span>
                                                    </td>
                                                    <td className="py-2 pr-3">{formatDate(item.dueDate)}</td>
                                                    <td className="py-2 pr-3">
                                                        {item.fineAmount?.toLocaleString("vi-VN") || 0}
                                                        {item.isFined && item.fineAmount > 0 ? (
                                                            <span
                                                                className={`ml-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${item.finePaid
                                                                    ? "bg-emerald-500/20 text-emerald-200"
                                                                    : "bg-amber-500/20 text-amber-200"
                                                                    }`}
                                                            >
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

                                                            {!canViewAll && item.status === "pending" && (
                                                                <button
                                                                    type="button"
                                                                    disabled={actionLoading === item._id}
                                                                    onClick={() =>
                                                                        void runAction(
                                                                            item._id,
                                                                            () => borrowingService.cancelBorrowing(item._id),
                                                                            "Đã hủy yêu cầu mượn."
                                                                        )
                                                                    }
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

                                                            {!canViewAll && (item.status === "borrowed" || item.status === "returned" || item.status === "overdue" || item.status === "return_transit") && item.libraryId?._id && (
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
                                                            {canReviewBook && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => void openReviewModal(item.bookId!._id, item.bookId?.title || "Sách")}
                                                                    className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-2.5 py-1 text-xs text-yellow-200 hover:bg-yellow-500/20"
                                                                >
                                                                    <span className="inline-flex items-center gap-1">
                                                                        <Star className="h-3 w-3" /> ĐG sách
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

                            <div className="rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <p className="text-xs text-slate-300">
                                        Trang <span className="font-semibold text-white">{page}</span>
                                        {" / "}
                                        <span className="font-semibold text-white">{Math.max(pagination.pages, 1)}</span>
                                    </p>
                                    <Pagination
                                        page={page}
                                        pages={pagination.pages}
                                        total={pagination.total}
                                        limit={limit}
                                        onPageChange={goToPage}
                                        showInfo={false}
                                        className="w-full sm:w-auto sm:flex-row sm:items-center sm:justify-end"
                                    />
                                </div>
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

                                    {currentReview?.isHidden && (
                                        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                                            Review này đã bị ẩn do vi phạm tiêu chuẩn cộng đồng. Bạn không thể chỉnh sửa hoặc review lại sách này.
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
                                        {!currentReview && (
                                            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                                                <p className="font-semibold">Quy tắc review</p>
                                                <ul className="mt-1 list-disc space-y-0.5 pl-4">
                                                    <li>Giữ thái độ lịch sự, không công kích cá nhân.</li>
                                                    <li>Không spam, không nội dung sai sự thật.</li>
                                                    <li>Chia sẻ trải nghiệm thực tế, đúng ngữ cảnh sách.</li>
                                                </ul>
                                                <label className="mt-2 flex items-start gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={reviewGuidelinesAccepted}
                                                        onChange={(e) => setReviewGuidelinesAccepted(e.target.checked)}
                                                        className="mt-0.5 h-4 w-4 rounded border-slate-400"
                                                    />
                                                    <span>Tôi đã đọc và đồng ý tuân thủ quy tắc review.</span>
                                                </label>
                                            </div>
                                        )}
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
                                                disabled={reviewSubmitting || Boolean(currentReview?.isHidden)}
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
                                            disabled={reviewSubmitting || Boolean(currentReview?.isHidden) || (!currentReview && !reviewGuidelinesAccepted)}
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

                                    {currentLibraryReview?.isHidden && (
                                        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                                            Review này đã bị ẩn do vi phạm tiêu chuẩn cộng đồng. Bạn không thể chỉnh sửa hoặc review lại thư viện này.
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
                                        {!currentLibraryReview && (
                                            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100">
                                                <p className="font-semibold">Quy tắc review</p>
                                                <ul className="mt-1 list-disc space-y-0.5 pl-4">
                                                    <li>Giữ thái độ lịch sự, không công kích cá nhân.</li>
                                                    <li>Không spam, không nội dung sai sự thật.</li>
                                                    <li>Chia sẻ trải nghiệm thực tế, đúng ngữ cảnh thư viện.</li>
                                                </ul>
                                                <label className="mt-2 flex items-start gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={libraryReviewGuidelinesAccepted}
                                                        onChange={(e) => setLibraryReviewGuidelinesAccepted(e.target.checked)}
                                                        className="mt-0.5 h-4 w-4 rounded border-slate-400"
                                                    />
                                                    <span>Tôi đã đọc và đồng ý tuân thủ quy tắc review.</span>
                                                </label>
                                            </div>
                                        )}
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
                                                disabled={libraryReviewSubmitting || Boolean(currentLibraryReview?.isHidden)}
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
                                            disabled={libraryReviewSubmitting || Boolean(currentLibraryReview?.isHidden) || (!currentLibraryReview && !libraryReviewGuidelinesAccepted)}
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
