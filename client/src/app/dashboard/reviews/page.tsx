"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Flag, Loader2, ShieldCheck, Star, Image as ImageIcon, Clock3, X, Library } from "lucide-react";
import { RouteGuard } from "@/components/RouteGuard";
import { useAuthStore } from "@/stores/authStore";
import { reviewService } from "@/services/reviewService";
import type { ILibrarianReviewDashboardItem, IReviewReport, IBookReview, ILibraryReview } from "@/types";

const getReviewId = (report: IReviewReport): string => {
    if (typeof report.reviewId === "string") return report.reviewId;
    return report.reviewId?._id || "";
};

const getReportReviewMeta = (report: IReviewReport): { itemName: string; reviewerName: string; reviewComment: string } => {
    if (!report.reviewId || typeof report.reviewId === "string") {
        return {
            itemName: "-",
            reviewerName: "-",
            reviewComment: "-",
        };
    }

    const review = report.reviewId as unknown as Record<string, unknown>;
    const user = review.userId as Record<string, unknown> | undefined;
    const book = review.bookId as Record<string, unknown> | undefined;
    const library = review.libraryId as Record<string, unknown> | undefined;

    const itemName =
        report.reviewType === "book"
            ? typeof book?.title === "string"
                ? book.title
                : "-"
            : typeof library?.name === "string"
                ? library.name
                : "-";

    const reviewerName = typeof user?.fullName === "string" ? user.fullName : "-";
    const reviewComment = typeof review.comment === "string" && review.comment.trim().length > 0 ? review.comment : "-";

    return {
        itemName,
        reviewerName,
        reviewComment,
    };
};

const reviewTypeLabel: Record<"book" | "library", string> = {
    book: "Đánh giá sách",
    library: "Đánh giá thư viện",
};

const reportStatusLabel: Record<"pending" | "resolved", string> = {
    pending: "Chờ xử lý",
    resolved: "Đã xử lý",
};

const moderationActionLabel: Record<"keep" | "hide" | "delete", string> = {
    keep: "Giữ nguyên",
    hide: "Ẩn",
    delete: "Xóa",
};

function LibrarianReviewCard({
    item,
    onReport,
    reporting,
}: {
    item: ILibrarianReviewDashboardItem;
    onReport: (item: ILibrarianReviewDashboardItem) => void;
    reporting: boolean;
}) {
    return (
        <article className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="text-xs text-slate-400">{reviewTypeLabel[item.reviewType]}</p>
                    {item.book?._id ? (
                        <Link
                            href={`/books/${item.book._id}`}
                            className="text-sm font-semibold text-blue-300 hover:text-blue-200 hover:underline"
                        >
                            {item.book?.title || "Xem chi tiết sách"}
                        </Link>
                    ) : item.library?._id ? (
                        <Link
                            href={`/libraries?libraryId=${item.library._id}`}
                            className="text-sm font-semibold text-blue-300 hover:text-blue-200 hover:underline"
                        >
                            {item.library?.name || "Xem thư viện"}
                        </Link>
                    ) : (
                        <p className="text-sm font-semibold text-white">Review</p>
                    )}
                    <p className="text-xs text-slate-400 mt-0.5">{item.user.fullName || "Bạn đọc"} · {new Date(item.createdAt).toLocaleDateString("vi-VN")}</p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/20 px-2 py-1 text-xs font-semibold text-yellow-300">
                    <Star className="h-3 w-3 fill-current" /> {item.stars}/5
                </span>
            </div>

            {item.comment && <p className="mt-3 text-sm text-slate-300 line-clamp-3">{item.comment}</p>}

            {item.images && item.images.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                    {item.images.slice(0, 3).map((img, idx) => (
                        <div key={idx} className="relative aspect-square w-16 overflow-hidden rounded-lg border border-white/10 bg-black/20">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={img} alt="Review" className="h-full w-full object-cover" />
                        </div>
                    ))}
                    {item.images.length > 3 && (
                        <div className="flex aspect-square w-16 items-center justify-center rounded-lg border border-white/10 bg-slate-800 text-xs font-bold text-slate-400">
                            +{item.images.length - 3}
                        </div>
                    )}
                </div>
            )}

            <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                    {item.images.length > 0 ? `${item.images.length} ảnh đính kèm` : "Không có ảnh"}
                </span>
                <button
                    type="button"
                    onClick={() => onReport(item)}
                    disabled={reporting}
                    className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/20 disabled:opacity-60"
                >
                    {reporting ? "Đang gửi..." : "Báo cáo lên quản trị"}
                </button>
            </div>
        </article>
    );
}

function UserReviewCard({ review, type }: { review: IBookReview | ILibraryReview; type: "book" | "library" }) {
    const itemName = type === "book" ? (review as IBookReview).bookId?.title : (review as ILibraryReview).libraryId?.name;
    const itemId = type === "book" ? (review as IBookReview).bookId?._id : (review as ILibraryReview).libraryId?._id;
    const itemLink = type === "book" ? `/books/${itemId}` : `/libraries?libraryId=${itemId}`;

    return (
        <article className="rounded-xl border border-white/10 bg-slate-900/40 p-4 transition-colors hover:bg-slate-900/60">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{type === "book" ? "Sách" : "Thư viện"}</p>
                    <Link href={itemLink} className="text-sm font-semibold text-blue-300 hover:text-blue-200 hover:underline">
                        {itemName || "Xem chi tiết"}
                    </Link>
                    <p className="mt-0.5 text-xs text-slate-400">{new Date(review.createdAt).toLocaleDateString("vi-VN")}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs font-bold text-yellow-500">
                        <Star className="h-3 w-3 fill-current" /> {review.stars}
                    </span>
                    {!review.isHidden ? (
                        <span className="text-[10px] text-emerald-500 font-medium">Công khai</span>
                    ) : (
                        <span className="text-[10px] text-red-400 font-medium">Bị ẩn</span>
                    )}
                </div>
            </div>

            {review.comment && <p className="mt-3 text-sm text-slate-300 leading-relaxed">{review.comment}</p>}

            {review.images && review.images.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                    {review.images.map((img, idx) => (
                        <div key={idx} className="relative aspect-square w-12 overflow-hidden rounded-md border border-white/5 bg-black/20">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={img} alt="Review attachment" className="h-full w-full object-cover" />
                        </div>
                    ))}
                </div>
            )}
        </article>
    );
}

export default function ReviewsDashboardPage() {
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [librarianData, setLibrarianData] = useState<{
        latest: ILibrarianReviewDashboardItem[];
        lowStar: ILibrarianReviewDashboardItem[];
        withImages: ILibrarianReviewDashboardItem[];
    }>({ latest: [], lowStar: [], withImages: [] });

    const [myReviews, setMyReviews] = useState<{
        bookReviews: IBookReview[];
        libraryReviews: ILibraryReview[];
    }>({ bookReviews: [], libraryReviews: [] });

    const [reports, setReports] = useState<IReviewReport[]>([]);
    const [reportingId, setReportingId] = useState<string | null>(null);
    const [moderatingId, setModeratingId] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<"pending" | "resolved" | "">("pending");
    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [reportReason, setReportReason] = useState("");
    const [reportTarget, setReportTarget] = useState<ILibrarianReviewDashboardItem | null>(null);
    const [hideModalOpen, setHideModalOpen] = useState(false);
    const [hideReason, setHideReason] = useState("");
    const [hideTargetReport, setHideTargetReport] = useState<IReviewReport | null>(null);

    const isAdmin = user?.role === "admin";
    const isLibrarian = user?.role === "librarian";
    const isUser = user?.role === "user";

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            if (isUser) {
                const data = await reviewService.getMyReviews();
                setMyReviews(data);
            }

            if (isLibrarian) {
                const data = await reviewService.getLibrarianReviewDashboard(12);
                setLibrarianData(data);
            }

            if (isAdmin) {
                const result = await reviewService.getReviewReports({
                    status: statusFilter || undefined,
                    page: 1,
                    limit: 50,
                });
                setReports(result.reports);
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : "Không tải được dữ liệu đánh giá.";
            setError(message);
        } finally {
            setLoading(false);
        }
    }, [isAdmin, isLibrarian, isUser, statusFilter]);

    useEffect(() => {
        void fetchData();
    }, [fetchData]);

    const handleReport = (item: ILibrarianReviewDashboardItem) => {
        setReportTarget(item);
        setReportReason("");
        setReportModalOpen(true);
    };

    const submitReport = async () => {
        if (!reportTarget) return;
        if (reportReason.trim().length < 5) {
            setError("Lý do report phải có ít nhất 5 ký tự.");
            return;
        }

        setReportingId(reportTarget.reviewId);
        setError(null);
        setSuccess(null);
        try {
            await reviewService.reportReview({
                reviewType: reportTarget.reviewType,
                reviewId: reportTarget.reviewId,
                reason: reportReason.trim(),
            });
            setSuccess("Đã gửi báo cáo đánh giá lên quản trị.");
            setReportModalOpen(false);
            setReportTarget(null);
            setReportReason("");
        } catch (err) {
            const message = err instanceof Error ? err.message : "Không thể gửi báo cáo đánh giá.";
            setError(message);
        } finally {
            setReportingId(null);
        }
    };

    const handleModerateKeep = async (report: IReviewReport) => {
        const reviewId = getReviewId(report);
        if (!reviewId) {
            setError("Không xác định được reviewId để xử lý.");
            return;
        }

        setModeratingId(report._id);
        setError(null);
        setSuccess(null);
        try {
            await reviewService.moderateReview({
                reviewType: report.reviewType,
                reviewId,
                action: "keep",
            });
            setSuccess("Đã mở lại review.");
            await fetchData();
        } catch (err) {
            const message = err instanceof Error ? err.message : "Không thể xử lý report.";
            setError(message);
        } finally {
            setModeratingId(null);
        }
    };

    const openHideModal = (report: IReviewReport) => {
        setHideTargetReport(report);
        setHideReason("");
        setHideModalOpen(true);
        setError(null);
        setSuccess(null);
    };

    const submitHideModeration = async () => {
        if (!hideTargetReport) return;
        if (hideReason.trim().length < 5) {
            setError("Lý do ẩn review phải có ít nhất 5 ký tự.");
            return;
        }

        const reviewId = getReviewId(hideTargetReport);
        if (!reviewId) {
            setError("Không xác định được reviewId để xử lý.");
            return;
        }

        setModeratingId(hideTargetReport._id);
        setError(null);
        setSuccess(null);
        try {
            await reviewService.moderateReview({
                reviewType: hideTargetReport.reviewType,
                reviewId,
                action: "hide",
                note: hideReason.trim(),
            });
            setSuccess("Đã ẩn review và gửi thông báo vi phạm cho người dùng.");
            setHideModalOpen(false);
            setHideReason("");
            setHideTargetReport(null);
            await fetchData();
        } catch (err) {
            const message = err instanceof Error ? err.message : "Không thể ẩn review.";
            setError(message);
        } finally {
            setModeratingId(null);
        }
    };

    const librarianSections = useMemo(
        () => [
            { key: "latest", title: "Review mới nhất", icon: Clock3, data: librarianData.latest },
            { key: "low", title: "Review điểm thấp", icon: Star, data: librarianData.lowStar },
            { key: "images", title: "Review có ảnh", icon: ImageIcon, data: librarianData.withImages },
        ],
        [librarianData]
    );

    return (
        <RouteGuard allowedRoles={["admin", "librarian", "user"]}>
            <div className="p-8 space-y-6">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-white">
                            {isUser ? "Lịch sử review của tôi" : "Quản lý review"}
                        </h1>
                        <p className="text-sm text-slate-400 mt-1">
                            {isUser 
                                ? "Xem lại các đánh giá bạn đã thực hiện cho sách và thư viện" 
                                : isAdmin 
                                    ? "Admin moderation toàn hệ thống" 
                                    : "Librarian dashboard review theo thư viện quản lý"}
                        </p>
                    </div>
                    {isAdmin && (
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">Trạng thái:</span>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as "pending" | "resolved" | "")}
                                className="rounded-lg border border-white/15 bg-slate-800 px-3 py-2 text-xs text-white"
                            >
                                <option value="pending">{reportStatusLabel.pending}</option>
                                <option value="resolved">{reportStatusLabel.resolved}</option>
                                <option value="">Tất cả</option>
                            </select>
                        </div>
                    )}
                </div>

                {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
                {success && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{success}</div>}

                {loading ? (
                    <div className="flex items-center gap-2 text-slate-300 text-sm">
                        <Loader2 className="h-4 w-4 animate-spin" /> Đang tải dữ liệu đánh giá...
                    </div>
                ) : isLibrarian ? (
                    <div className="space-y-6">
                        {librarianSections.map((section) => {
                            const Icon = section.icon;
                            return (
                                <section key={section.key} className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
                                    <h2 className="mb-4 flex items-center gap-2 text-white font-semibold">
                                        <Icon className="h-4 w-4 text-blue-300" /> {section.title}
                                    </h2>
                                    {section.data.length === 0 ? (
                                        <p className="text-sm text-slate-400">Không có dữ liệu.</p>
                                    ) : (
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                            {section.data.map((item) => (
                                                <LibrarianReviewCard
                                                    key={`${section.key}-${item.reviewId}`}
                                                    item={item}
                                                    onReport={handleReport}
                                                    reporting={reportingId === item.reviewId}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </section>
                            );
                        })}
                    </div>
                ) : isUser ? (
                    <div className="space-y-8">
                        <section>
                            <h2 className="mb-4 text-lg font-semibold text-white flex items-center gap-2">
                                <Star className="h-5 w-5 text-yellow-500" /> Đánh giá sách ({myReviews.bookReviews.length})
                            </h2>
                            {myReviews.bookReviews.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/20 p-12 text-center text-slate-500">
                                    Bạn chưa thực hiện đánh giá sách nào.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {myReviews.bookReviews.map((rev) => (
                                        <UserReviewCard key={rev._id} review={rev} type="book" />
                                    ))}
                                </div>
                            )}
                        </section>

                        <section>
                            <h2 className="mb-4 text-lg font-semibold text-white flex items-center gap-2">
                                <Library className="h-5 w-5 text-indigo-400" /> Đánh giá thư viện ({myReviews.libraryReviews.length})
                            </h2>
                            {myReviews.libraryReviews.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/20 p-12 text-center text-slate-500">
                                    Bạn chưa thực hiện đánh giá thư viện nào.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {myReviews.libraryReviews.map((rev) => (
                                        <UserReviewCard key={rev._id} review={rev} type="library" />
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>
                ) : (
                    <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
                        <h2 className="mb-4 flex items-center gap-2 text-white font-semibold">
                            <ShieldCheck className="h-4 w-4 text-blue-300" /> Danh sách báo cáo đánh giá
                        </h2>

                        {reports.length === 0 ? (
                            <p className="text-sm text-slate-400">Không có báo cáo.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[1240px] text-sm">
                                    <thead>
                                        <tr className="text-left text-slate-400 border-b border-white/10">
                                            <th className="py-2 pr-3">Sách/Thư viện</th>
                                            <th className="py-2 pr-3">Người đánh giá</th>
                                            <th className="py-2 pr-3">Comment review</th>
                                            <th className="py-2 pr-3">Người báo cáo</th>
                                            <th className="py-2 pr-3">Lý do</th>
                                            <th className="py-2 pr-3">Loại</th>
                                            <th className="py-2 pr-3">Trạng thái</th>
                                            <th className="py-2 pr-3">Ngày tạo</th>
                                            <th className="py-2 text-right">Xử lý</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reports.map((report) => {
                                            const reviewMeta = getReportReviewMeta(report);

                                            return (
                                                <tr key={report._id} className="border-b border-white/5 text-slate-200 align-top">
                                                    <td className="py-2 pr-3 font-medium text-blue-200">{reviewMeta.itemName}</td>
                                                    <td className="py-2 pr-3">{reviewMeta.reviewerName}</td>
                                                    <td className="py-2 pr-3 w-[280px]">
                                                        <div className="h-24 overflow-y-auto rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-slate-300">
                                                            <p className="whitespace-pre-wrap break-words leading-relaxed">{reviewMeta.reviewComment}</p>
                                                        </div>
                                                    </td>
                                                    <td className="py-2 pr-3">{report.reporterId?.fullName || "-"}</td>
                                                    <td className="py-2 pr-3 w-[300px]">
                                                        <div className="h-24 overflow-y-auto rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2">
                                                            <p className="whitespace-pre-wrap break-words leading-relaxed text-slate-200">{report.reason}</p>
                                                        </div>
                                                    </td>
                                                    <td className="py-2 pr-3">
                                                        <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 px-2 py-1 text-xs text-blue-300">
                                                            <Flag className="h-3 w-3" /> {reviewTypeLabel[report.reviewType]}
                                                        </span>
                                                    </td>
                                                    <td className="py-2 pr-3">{reportStatusLabel[report.status]}</td>
                                                    <td className="py-2 pr-3">{new Date(report.createdAt).toLocaleDateString("vi-VN")}</td>
                                                    <td className="py-2 text-right">
                                                        <div className="inline-flex items-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => void handleModerateKeep(report)}
                                                                disabled={moderatingId === report._id || report.status === "resolved"}
                                                                className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-60"
                                                            >
                                                                {moderationActionLabel.keep}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => openHideModal(report)}
                                                                disabled={moderatingId === report._id || report.status === "resolved"}
                                                                className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-200 hover:bg-amber-500/20 disabled:opacity-60"
                                                            >
                                                                {moderationActionLabel.hide}
                                                            </button>
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
                )}

                {reportModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
                        <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 p-5 shadow-2xl">
                            <div className="mb-4 flex items-center justify-between">
                                <h3 className="text-base font-semibold text-white">Báo cáo đánh giá lên quản trị</h3>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (reportingId) return;
                                        setReportModalOpen(false);
                                    }}
                                    className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            <p className="mb-2 text-sm text-slate-300">Nêu lý do rõ ràng để quản trị viên có cơ sở xử lý.</p>

                            <textarea
                                rows={4}
                                value={reportReason}
                                onChange={(e) => setReportReason(e.target.value)}
                                className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500"
                                placeholder="Nhập lý do báo cáo..."
                            />
                            <p className="mt-1 text-xs text-slate-400">Tối thiểu 5 ký tự.</p>

                            <div className="mt-4 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setReportModalOpen(false)}
                                    disabled={Boolean(reportingId)}
                                    className="rounded-lg border border-slate-600/50 bg-slate-700/40 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700/60 disabled:opacity-60"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void submitReport()}
                                    disabled={Boolean(reportingId) || reportReason.trim().length < 5}
                                    className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-200 hover:bg-red-500/20 disabled:opacity-60"
                                >
                                    {reportingId ? "Đang gửi..." : "Gửi report"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {hideModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
                        <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 p-5 shadow-2xl">
                            <div className="mb-4 flex items-center justify-between">
                                <h3 className="text-base font-semibold text-white">Ẩn review vi phạm</h3>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (moderatingId) return;
                                        setHideModalOpen(false);
                                    }}
                                    className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            <p className="mb-2 text-sm text-slate-300">
                                Nhập lý do vi phạm để lưu log moderation và gửi thông báo cho người dùng.
                            </p>
                            <textarea
                                rows={4}
                                value={hideReason}
                                onChange={(e) => setHideReason(e.target.value)}
                                className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-500"
                                placeholder="Ví dụ: Ngôn từ xúc phạm, công kích cá nhân, sai sự thật..."
                            />
                            <p className="mt-1 text-xs text-slate-400">Tối thiểu 5 ký tự.</p>

                            <div className="mt-4 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setHideModalOpen(false)}
                                    disabled={Boolean(moderatingId)}
                                    className="rounded-lg border border-slate-600/50 bg-slate-700/40 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700/60 disabled:opacity-60"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void submitHideModeration()}
                                    disabled={Boolean(moderatingId) || hideReason.trim().length < 5}
                                    className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-500/20 disabled:opacity-60"
                                >
                                    {moderatingId ? "Đang xử lý..." : "Xác nhận ẩn review"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </RouteGuard>
    );
}
