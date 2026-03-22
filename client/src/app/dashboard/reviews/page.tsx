"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Flag, Loader2, ShieldCheck, Star, Image as ImageIcon, Clock3, X } from "lucide-react";
import { RouteGuard } from "@/components/RouteGuard";
import { useAuthStore } from "@/stores/authStore";
import { reviewService } from "@/services/reviewService";
import type { ILibrarianReviewDashboardItem, IReviewReport } from "@/types";

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
                    ) : (
                        <p className="text-sm font-semibold text-white">{item.book?.title || item.library?.name || "Review"}</p>
                    )}
                    <p className="text-xs text-slate-400 mt-0.5">{item.user.fullName || "Bạn đọc"} · {new Date(item.createdAt).toLocaleDateString("vi-VN")}</p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/20 px-2 py-1 text-xs font-semibold text-yellow-300">
                    <Star className="h-3 w-3 fill-current" /> {item.stars}/5
                </span>
            </div>

            {item.comment && <p className="mt-3 text-sm text-slate-300 line-clamp-3">{item.comment}</p>}

            <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-slate-400">{item.images.length > 0 ? `${item.images.length} ảnh đính kèm` : "Không có ảnh"}</span>
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

    const [reports, setReports] = useState<IReviewReport[]>([]);
    const [reportingId, setReportingId] = useState<string | null>(null);
    const [moderatingId, setModeratingId] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<"pending" | "resolved" | "">("pending");
    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [reportReason, setReportReason] = useState("");
    const [reportTarget, setReportTarget] = useState<ILibrarianReviewDashboardItem | null>(null);

    const isAdmin = user?.role === "admin";
    const isLibrarian = user?.role === "librarian";

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
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
    }, [isAdmin, isLibrarian, statusFilter]);

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
        if (!reportReason.trim()) {
            setError("Vui lòng nhập lý do báo cáo.");
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

    const handleModerate = async (report: IReviewReport, action: "keep" | "hide" | "delete") => {
        const note = window.prompt("Ghi chú xử lý (tùy chọn):") || undefined;
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
                action,
                note,
            });
            setSuccess(`Đã xử lý báo cáo: ${moderationActionLabel[action]}.`);
            await fetchData();
        } catch (err) {
            const message = err instanceof Error ? err.message : "Không thể xử lý báo cáo.";
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
        <RouteGuard allowedRoles={["admin", "librarian"]}>
            <div className="p-8 space-y-6">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Quản lý đánh giá</h1>
                        <p className="text-sm text-slate-400 mt-1">
                            {isAdmin ? "Quản trị viên kiểm duyệt toàn hệ thống" : "Thủ thư theo dõi đánh giá thuộc thư viện quản lý"}
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
                                                                onClick={() => void handleModerate(report, "keep")}
                                                                disabled={moderatingId === report._id}
                                                                className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-60"
                                                            >
                                                                {moderationActionLabel.keep}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => void handleModerate(report, "hide")}
                                                                disabled={moderatingId === report._id}
                                                                className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-200 hover:bg-amber-500/20 disabled:opacity-60"
                                                            >
                                                                {moderationActionLabel.hide}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => void handleModerate(report, "delete")}
                                                                disabled={moderatingId === report._id}
                                                                className="rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-xs text-red-200 hover:bg-red-500/20 disabled:opacity-60"
                                                            >
                                                                {moderationActionLabel.delete}
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
                                    disabled={Boolean(reportingId)}
                                    className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-200 hover:bg-red-500/20 disabled:opacity-60"
                                >
                                    {reportingId ? "Đang gửi..." : "Gửi báo cáo"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </RouteGuard>
    );
}
