"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Image as ImageIcon, MessageSquare, Sparkles, Star, X } from "lucide-react";
import { ShoppingCart } from "lucide-react";
import type { IBook, IBookReview } from "@/types";
import { reviewService } from "@/services/reviewService";
import { useAuthStore } from "@/stores/authStore";
import { useCartStore } from "@/stores/cartStore";
import { useEffect, useState } from "react";

const FALLBACK_COVER =
  "https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=900&auto=format&fit=crop";

interface BookDetailViewProps {
  book: IBook | null;
  recommendations: IBook[];
  recommendationType?: "alternatives" | "related";
  loading: boolean;
  error: string;
  onReserve?: () => void;
  reserveLoading?: boolean;
  reserveMessage?: string;
  reserveError?: string;
  isWishlisted?: boolean;
  wishlistCount?: number;
  wishlistLoading?: boolean;
  onWishlistToggle?: () => void;
  reviews?: IBookReview[];
  reviewsLoading?: boolean;
  reviewsError?: string;
  canReview?: boolean;
  canReviewLoading?: boolean;
  myBookReview?: IBookReview | null;
  onReviewChanged?: () => Promise<void>;
}

function BookCard({ book }: { book: IBook }) {
  return (
    <Link href={`/books/${book._id}`} className="group block">
      <div
        className="aspect-[3/4] w-full rounded-xl bg-gray-200 shadow-sm transition-all group-hover:shadow-xl dark:bg-gray-700"
        style={{
          backgroundImage: `url("${book.coverImage || FALLBACK_COVER}")`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <p className="mt-3 line-clamp-1 text-sm font-bold text-[#111318] dark:text-white">{book.title}</p>
      <p className="line-clamp-1 text-xs text-[#616f89] dark:text-gray-400">{book.author}</p>
    </Link>
  );
}

export default function BookDetailView({
  book,
  recommendations,
  recommendationType = "related",
  loading,
  error,
  onReserve,
  reserveLoading = false,
  reserveMessage = "",
  reserveError = "",
  isWishlisted = false,
  wishlistCount = 0,
  wishlistLoading = false,
  onWishlistToggle,
  reviews = [],
  reviewsLoading = false,
  reviewsError = "",
  canReview = false,
  canReviewLoading = false,
  myBookReview = null,
  onReviewChanged,
}: BookDetailViewProps) {
  const router = useRouter();

  const handleClose = () => {
    router.back();
  };

  const { user } = useAuthStore();
  const cartStore = useCartStore();
  const [reportSubmittingId, setReportSubmittingId] = useState<string | null>(null);
  const [reportMessage, setReportMessage] = useState<string>("");
  const [reportError, setReportError] = useState<string>("");
  const [moderatingReviewId, setModeratingReviewId] = useState<string | null>(null);
  const [moderationMessage, setModerationMessage] = useState<string>("");
  const [moderationError, setModerationError] = useState<string>("");
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [targetReviewId, setTargetReviewId] = useState<string | null>(null);
  const [reviewStars, setReviewStars] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>("");
  const [reviewImagesText, setReviewImagesText] = useState<string>("");
  const [selectedImageFiles, setSelectedImageFiles] = useState<File[]>([]);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSubmitMessage, setReviewSubmitMessage] = useState<string>("");
  const [reviewSubmitError, setReviewSubmitError] = useState<string>("");
  const [reviewGuidelinesAccepted, setReviewGuidelinesAccepted] = useState(false);
  const [hideModalOpen, setHideModalOpen] = useState(false);
  const [hideReason, setHideReason] = useState("");
  const [hideTargetReview, setHideTargetReview] = useState<IBookReview | null>(null);

  const canReportReview = user?.role === "user" || user?.role === "librarian";
  const isAdmin = user?.role === "admin";
  const canShowReviewForm = user?.role === "user";
  const isMyReviewBlocked = Boolean(myBookReview?.isHidden);
  const averageRating = reviews.length
    ? Math.round((reviews.reduce((sum, item) => sum + item.stars, 0) / reviews.length) * 10) / 10
    : 0;
  const highRatingCount = reviews.filter((item) => item.stars >= 4).length;

  useEffect(() => {
    if (myBookReview) {
      setReviewStars(myBookReview.stars);
      setReviewComment(myBookReview.comment || "");
      setReviewImagesText(myBookReview.images.join("\n"));
      setReviewGuidelinesAccepted(true);
    } else {
      setReviewStars(5);
      setReviewComment("");
      setReviewImagesText("");
      setReviewGuidelinesAccepted(false);
    }
    setSelectedImageFiles([]);
  }, [myBookReview]);

  const handleReportReview = async (reviewId: string) => {
    if (!canReportReview) {
      setReportError("Bạn cần đăng nhập tài khoản Member hoặc Librarian để report.");
      return;
    }

    setTargetReviewId(reviewId);
    setReportReason("");
    setReportError("");
    setReportModalOpen(true);
  };

  const submitReportReview = async () => {
    if (!targetReviewId) return;
    if (reportReason.trim().length < 5) {
      setReportError("Lý do report phải có ít nhất 5 ký tự.");
      return;
    }

    setReportSubmittingId(targetReviewId);
    setReportMessage("");
    setReportError("");

    try {
      await reviewService.reportReview({
        reviewType: "book",
        reviewId: targetReviewId,
        reason: reportReason.trim(),
      });
      setReportMessage("Đã gửi report lên Admin.");
      setReportModalOpen(false);
      setTargetReviewId(null);
      setReportReason("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không thể report review.";
      setReportError(message);
    } finally {
      setReportSubmittingId(null);
    }
  };

  const handleSaveMyReview = async () => {
    if (!book) return;

    if (!canReview) {
      setReviewSubmitError("Bạn cần mượn sách này trước khi đăng review.");
      return;
    }

    if (!myBookReview && !reviewGuidelinesAccepted) {
      setReviewSubmitError("Bạn cần xác nhận đã đọc quy tắc review trước khi đăng.");
      return;
    }

    setReviewSubmitting(true);
    setReviewSubmitError("");
    setReviewSubmitMessage("");

    const pastedImages = reviewImagesText
      .split(/\n|,/g)
      .map((item) => item.trim())
      .filter(Boolean);

    try {
      let uploadedUrls: string[] = [];
      if (selectedImageFiles.length > 0) {
        uploadedUrls = await reviewService.uploadReviewImages(selectedImageFiles);
      }
      
      const images = [...pastedImages, ...uploadedUrls];
      if (myBookReview) {
        await reviewService.updateBookReview(myBookReview._id, {
          stars: reviewStars,
          comment: reviewComment.trim() || undefined,
          images,
        });
        setReviewSubmitMessage("Đã cập nhật review của bạn.");
      } else {
        await reviewService.createBookReview(book._id, {
          stars: reviewStars,
          comment: reviewComment.trim() || undefined,
          images,
          agreedToGuidelines: true,
        });
        setReviewSubmitMessage("Đã đăng review thành công.");
      }

      if (onReviewChanged) {
        await onReviewChanged();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không thể lưu review.";
      setReviewSubmitError(message);
    } finally {
      setReviewSubmitting(false);
      setSelectedImageFiles([]);
    }
  };

  const handleDeleteMyReview = async () => {
    if (!myBookReview) return;

    setReviewSubmitting(true);
    setReviewSubmitError("");
    setReviewSubmitMessage("");

    try {
      await reviewService.deleteBookReview(myBookReview._id);
      setReviewSubmitMessage("Đã xóa review của bạn.");
      if (onReviewChanged) {
        await onReviewChanged();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không thể xóa review.";
      setReviewSubmitError(message);
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleAdminToggleHide = async (review: IBookReview) => {
    if (!isAdmin) return;

    if (!review.isHidden) {
      setHideTargetReview(review);
      setHideReason("");
      setHideModalOpen(true);
      setModerationError("");
      return;
    }

    setModeratingReviewId(review._id);
    setModerationMessage("");
    setModerationError("");

    try {
      await reviewService.moderateReview({
        reviewType: "book",
        reviewId: review._id,
        action: review.isHidden ? "keep" : "hide",
        note: review.isHidden ? "Admin unhide trực tiếp từ trang detail" : "Admin hide trực tiếp từ trang detail",
      });

      setModerationMessage(review.isHidden ? "Đã hiển thị lại review." : "Đã ẩn review.");
      if (onReviewChanged) {
        await onReviewChanged();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không thể cập nhật trạng thái review.";
      setModerationError(message);
    } finally {
      setModeratingReviewId(null);
    }
  };

  const submitAdminHideReview = async () => {
    if (!hideTargetReview) return;
    if (hideReason.trim().length < 5) {
      setModerationError("Lý do ẩn review phải có ít nhất 5 ký tự.");
      return;
    }

    setModeratingReviewId(hideTargetReview._id);
    setModerationMessage("");
    setModerationError("");

    try {
      await reviewService.moderateReview({
        reviewType: "book",
        reviewId: hideTargetReview._id,
        action: "hide",
        note: hideReason.trim(),
      });

      setModerationMessage("Đã ẩn review và gửi thông báo vi phạm cho người dùng.");
      setHideModalOpen(false);
      setHideReason("");
      setHideTargetReview(null);
      if (onReviewChanged) {
        await onReviewChanged();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không thể cập nhật trạng thái review.";
      setModerationError(message);
    } finally {
      setModeratingReviewId(null);
    }
  };

  if (loading) {
    return (
      <main className="relative mx-auto w-full max-w-[1200px] px-6 py-10">
        <button
          type="button"
          onClick={handleClose}
          aria-label="Đóng chi tiết sách"
          className="absolute right-6 top-6 inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:bg-gray-50 hover:text-gray-900 dark:border-gray-700 dark:bg-[#1a2130] dark:text-gray-300 dark:hover:bg-[#222b3d] dark:hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="animate-pulse rounded-2xl bg-white p-8 dark:bg-[#1a2130]">
          <div className="h-8 w-52 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="mt-4 h-4 w-72 rounded bg-gray-100 dark:bg-gray-800" />
          <div className="mt-8 h-72 rounded-xl bg-gray-100 dark:bg-gray-800" />
        </div>
      </main>
    );
  }

  if (error || !book) {
    return (
      <main className="relative mx-auto w-full max-w-[1200px] px-6 py-10">
        <button
          type="button"
          onClick={handleClose}
          aria-label="Đóng chi tiết sách"
          className="absolute right-6 top-6 inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:bg-gray-50 hover:text-gray-900 dark:border-gray-700 dark:bg-[#1a2130] dark:text-gray-300 dark:hover:bg-[#222b3d] dark:hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700 dark:border-red-500/30 dark:bg-red-900/20 dark:text-red-300">
          {error || "Không tìm thấy thông tin sách."}
        </div>
        <Link href="/" className="mt-4 inline-block text-sm font-bold text-[#2b6cee] hover:underline">
          ← Quay lại trang chủ
        </Link>
      </main>
    );
  }

  return (
    <main className="relative mx-auto w-full max-w-[1200px] px-6 py-8">
      <button
        type="button"
        onClick={handleClose}
        aria-label="Đóng chi tiết sách"
        className="absolute right-6 top-6 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:bg-gray-50 hover:text-gray-900 dark:border-gray-700 dark:bg-[#1a2130] dark:text-gray-300 dark:hover:bg-[#222b3d] dark:hover:text-white"
      >
        <X className="h-5 w-5" />
      </button>
      <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm">
        <Link href="/" className="font-medium text-[#616f89] transition-colors hover:text-[#2b6cee]">
          Home
        </Link>
        <span className="text-[#616f89]">/</span>
        <span className="font-bold text-[#111318] dark:text-white">{book.title}</span>
      </nav>

      <section className="grid grid-cols-1 gap-8 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-[#1a2130] md:grid-cols-12 md:p-8">
        <div className="md:col-span-4">
          <div
            className="aspect-[2/3] w-full rounded-xl bg-gray-200 shadow-xl dark:bg-gray-700"
            style={{
              backgroundImage: `url("${book.coverImage || FALLBACK_COVER}")`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
        </div>

        <div className="md:col-span-8">
          <h1 className="text-3xl font-extrabold leading-tight text-[#111318] dark:text-white md:text-4xl">{book.title}</h1>
          <p className="mt-2 text-lg font-semibold text-[#2b6cee]">{book.author}</p>

          <p className="mt-5 rounded-xl bg-[#f6f6f8] p-4 text-sm leading-relaxed text-[#4b5563] dark:bg-[#101622] dark:text-gray-300">
            {book.description || "Hiện chưa có mô tả cho đầu sách này."}
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3 rounded-xl border border-gray-100 bg-[#f9fafb] p-4 text-sm dark:border-gray-800 dark:bg-[#101622] lg:grid-cols-4">
            <div>
              <p className="text-xs font-bold uppercase text-gray-500">ISBN</p>
              <p className="font-semibold text-[#111318] dark:text-white">{book.isbn || "N/A"}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-gray-500">Pages</p>
              <p className="font-semibold text-[#111318] dark:text-white">{book.pageCount || "N/A"}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-gray-500">Language</p>
              <p className="font-semibold text-[#111318] dark:text-white">{book.language || "N/A"}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-gray-500">Category</p>
              <p className="font-semibold text-[#111318] dark:text-white">{book.category || "N/A"}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${book.availableCopies > 0
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                }`}
            >
              {book.availableCopies > 0 ? "Available" : "Out of stock"} ({book.availableCopies}/{book.totalCopies})
            </span>
            <Link
              href={`/libraries?libraryId=${book.libraryId?._id || ""}`}
              className="text-xs font-semibold text-[#2b6cee] hover:underline dark:text-blue-400"
            >
              📚 Thư viện: {book.libraryId?.name || "Không xác định"}
            </Link>

            {(user?.role === "user" || !user) && (
              <button
                type="button"
                disabled={book.availableCopies <= 0}
                onClick={() => {
                  if (!user) {
                    window.location.href = "/login";
                    return;
                  }
                  return cartStore.isInCart(book._id) ? cartStore.removeFromCart(book._id) : cartStore.addToCart(book);
                }}
                className={`ml-auto inline-flex items-center gap-2 rounded-xl px-4 py-2 font-bold text-sm transition-all shadow-sm ${book.availableCopies <= 0 ? "bg-gray-200 text-gray-400 dark:bg-gray-800 dark:text-gray-500 cursor-not-allowed"
                    : cartStore.isInCart(book._id)
                      ? "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"
                      : "bg-[#2b6cee] text-white hover:bg-blue-700 hover:shadow-md"
                  }`}
              >
                <ShoppingCart className="h-4 w-4" />
                {cartStore.isInCart(book._id) ? "Remove from Cart" : "Add to Cart"}
              </button>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onReserve}
              disabled={!onReserve || reserveLoading || book.availableCopies > 0}
              className="rounded-lg bg-[#2b6cee] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1e4cba] disabled:cursor-not-allowed disabled:opacity-60"
              title={book.availableCopies > 0 ? "Sách còn sẵn, vui lòng mượn trực tiếp" : "Đặt trước khi sách hết"}
            >
              {reserveLoading ? "Đang đặt trước..." : "Đặt trước"}
            </button>

            <button
              type="button"
              onClick={onWishlistToggle}
              disabled={wishlistLoading}
              aria-label={isWishlisted ? "Bỏ yêu thích" : "Thêm yêu thích"}
              className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-all disabled:opacity-60 ${
                isWishlisted
                  ? "border-rose-300 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:border-rose-700/50 dark:bg-rose-900/20 dark:text-rose-300"
                  : "border-gray-200 bg-white text-gray-600 hover:border-rose-300 hover:text-rose-600 dark:border-gray-700 dark:bg-transparent dark:text-gray-300"
              }`}
            >
              <span className="text-base leading-none">
                {wishlistLoading ? "..." : isWishlisted ? "♥" : "♡"}
              </span>
              <span>{isWishlisted ? "Đã yêu thích" : "Yêu thích"}</span>
              {wishlistCount > 0 && (
                <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-xs font-bold text-rose-600 dark:bg-rose-900/30 dark:text-rose-300">
                  {wishlistCount}
                </span>
              )}
            </button>

            {book.availableCopies > 0 && (
              <span className="text-xs text-amber-600 dark:text-amber-300">
                Sách đang có sẵn, hệ thống chỉ cho đặt trước khi đã hết sách.
              </span>
            )}
          </div>

          {reserveMessage && (
            <div className="mt-3 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300">
              {reserveMessage}
            </div>
          )}
          {reserveError && (
            <div className="mt-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-700/30 dark:bg-red-900/20 dark:text-red-300">
              {reserveError}
            </div>
          )}
        </div>
      </section>

      <section className="mt-10 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-[#1a2130]">
        <div className="grid grid-cols-1 border-b border-gray-100 bg-gradient-to-r from-sky-50 via-blue-50 to-indigo-50 p-6 dark:border-gray-800 dark:from-sky-900/10 dark:via-blue-900/10 dark:to-indigo-900/10 md:grid-cols-3 md:items-center md:gap-4 md:px-8">
          <div className="md:col-span-2">
            <h2 className="flex items-center gap-2 text-xl font-bold text-[#111318] dark:text-white">
              <Sparkles className="h-5 w-5 text-blue-500" /> Review từ độc giả
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Đánh giá thực tế từ những người đã mượn và đọc cuốn sách này.</p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 md:mt-0">
            <div className="rounded-xl border border-blue-200/60 bg-white/80 p-3 text-center dark:border-blue-500/20 dark:bg-[#101622]/60">
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">Điểm trung bình</p>
              <p className="mt-1 text-2xl font-extrabold text-blue-600 dark:text-blue-300">{averageRating || "-"}</p>
            </div>
            <div className="rounded-xl border border-emerald-200/60 bg-white/80 p-3 text-center dark:border-emerald-500/20 dark:bg-[#101622]/60">
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">Đánh giá tốt</p>
              <p className="mt-1 text-2xl font-extrabold text-emerald-600 dark:text-emerald-300">{highRatingCount}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-0 md:grid-cols-5">
          <div className="border-b border-gray-100 p-6 dark:border-gray-800 md:col-span-2 md:border-b-0 md:border-r md:p-8">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-[#111318] dark:text-white">
              <MessageSquare className="h-4 w-4 text-blue-500" /> Đăng review của bạn
            </h3>

            {!canShowReviewForm ? (
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
                Chỉ tài khoản Member mới có thể đăng review.
              </p>
            ) : canReviewLoading ? (
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
                Đang kiểm tra điều kiện review...
              </p>
            ) : !canReview ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-700/30 dark:bg-amber-900/10 dark:text-amber-300">
                Bạn cần mượn sách này trước khi đăng review.
              </p>
            ) : isMyReviewBlocked ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-700/30 dark:bg-red-900/10 dark:text-red-300">
                Review trước của bạn đã bị ẩn do vi phạm tiêu chuẩn cộng đồng, nên bạn không thể review lại cuốn sách này.
              </p>
            ) : (
              <div className="space-y-3">
                {reviewSubmitMessage && (
                  <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300">
                    {reviewSubmitMessage}
                  </div>
                )}

                {reviewSubmitError && (
                  <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-700/30 dark:bg-red-900/20 dark:text-red-300">
                    {reviewSubmitError}
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-300">Mức đánh giá</label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setReviewStars(value)}
                        className={`rounded-lg p-2 transition ${
                          reviewStars >= value
                            ? "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-300"
                            : "bg-gray-100 text-gray-400 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-500 dark:hover:bg-slate-700"
                        }`}
                        aria-label={`Chọn ${value} sao`}
                      >
                        <Star className="h-4 w-4 fill-current" />
                      </button>
                    ))}
                    <span className="ml-1 text-xs font-semibold text-slate-500 dark:text-slate-300">{reviewStars}/5</span>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-300">Nhận xét</label>
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    rows={4}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-[#111318] outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-[#101622] dark:text-white dark:focus:ring-blue-900/40"
                    placeholder="Chia sẻ trải nghiệm mượn và đọc sách của bạn..."
                  />
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold text-slate-500 dark:text-slate-300">Quy tắc review</p>
                  <ul className="mb-2 list-disc space-y-1 pl-5 text-xs text-slate-600 dark:text-slate-300">
                    <li>Ngôn từ lịch sự, không công kích cá nhân.</li>
                    <li>Không spam, không nội dung sai sự thật.</li>
                    <li>Chỉ chia sẻ trải nghiệm thực tế liên quan sách.</li>
                  </ul>
                  {!myBookReview && (
                    <label className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={reviewGuidelinesAccepted}
                        onChange={(e) => setReviewGuidelinesAccepted(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-gray-300"
                      />
                      <span>Tôi đã đọc và cam kết tuân thủ quy tắc review.</span>
                    </label>
                  )}
                </div>

                <div>
                  <label className="mb-1 flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-300">
                    <ImageIcon className="h-3.5 w-3.5" /> Ảnh đính kèm
                  </label>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files) {
                        setSelectedImageFiles(Array.from(e.target.files).slice(0, 5));
                      }
                    }}
                    className="mb-2 block w-full text-sm text-slate-500 file:mr-4 file:rounded-full file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100 dark:text-slate-400 dark:file:bg-blue-900/30 dark:file:text-blue-300"
                  />
                  <textarea
                    value={reviewImagesText}
                    onChange={(e) => setReviewImagesText(e.target.value)}
                    rows={2}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-[#111318] outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-[#101622] dark:text-white dark:focus:ring-blue-900/40"
                    placeholder="Hoặc dán URL ảnh có sẵn (mỗi dòng 1 ảnh)"
                  />
                </div>

                <div className="flex flex-wrap justify-end gap-2 pt-1">
                  {myBookReview && (
                    <button
                      type="button"
                      onClick={() => void handleDeleteMyReview()}
                      disabled={reviewSubmitting}
                      className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/20 disabled:opacity-60"
                    >
                      Xóa review
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleSaveMyReview()}
                    disabled={reviewSubmitting || isMyReviewBlocked || (!myBookReview && !reviewGuidelinesAccepted)}
                    className="rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:from-blue-700 hover:to-indigo-700 disabled:opacity-60"
                  >
                    {reviewSubmitting ? "Đang lưu..." : myBookReview ? "Cập nhật review" : "Đăng review"}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="p-6 md:col-span-3 md:p-8">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h3 className="text-base font-bold text-[#111318] dark:text-white">Danh sách review</h3>
              <span className="rounded-full bg-[#f1f5ff] px-3 py-1 text-xs font-semibold text-[#2b6cee] dark:bg-[#15213c] dark:text-blue-300">
                {reviews.length} đánh giá
              </span>
            </div>

        {reportMessage && (
          <div className="mb-3 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300">
            {reportMessage}
          </div>
        )}

        {reportError && (
          <div className="mb-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-700/30 dark:bg-red-900/20 dark:text-red-300">
            {reportError}
          </div>
        )}

        {moderationMessage && (
          <div className="mb-3 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300">
            {moderationMessage}
          </div>
        )}

        {moderationError && (
          <div className="mb-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-700/30 dark:bg-red-900/20 dark:text-red-300">
            {moderationError}
          </div>
        )}

        {reviewsLoading ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Đang tải review...</p>
        ) : reviewsError ? (
          <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-700/30 dark:bg-red-900/20 dark:text-red-300">
            {reviewsError}
          </div>
        ) : reviews.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Chưa có review nào cho cuốn sách này.</p>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => {
              const avatar = review.userId?.avatar;
              const name = review.userId?.fullName || "Bạn đọc";
              const reviewToneClass =
                review.stars >= 4
                  ? "border-emerald-200/70 bg-emerald-50/40 dark:border-emerald-800/40 dark:bg-emerald-900/10"
                  : review.stars <= 2
                    ? "border-amber-200/70 bg-amber-50/40 dark:border-amber-800/40 dark:bg-amber-900/10"
                    : "border-gray-100 bg-[#fafbff] dark:border-gray-800 dark:bg-[#101622]";

              return (
                <article
                  key={review._id}
                  className={`rounded-xl border p-4 transition ${reviewToneClass}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={avatar}
                          alt={name}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                          {name.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-semibold text-[#111318] dark:text-white">{name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(review.createdAt).toLocaleDateString("vi-VN")}
                        </p>
                      </div>
                    </div>

                    <div className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-1 text-xs font-bold text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
                      <Star className="h-3.5 w-3.5 fill-current" />
                      {review.stars}/5
                    </div>
                  </div>

                  {review.comment && (
                    <p className="mt-3 text-sm leading-relaxed text-gray-700 dark:text-gray-300">{review.comment}</p>
                  )}

                  {review.images.length > 0 && (
                    <div className="mt-3 grid grid-cols-3 gap-2 md:grid-cols-4 lg:grid-cols-5">
                      {review.images.map((imageUrl, idx) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={`${review._id}-${idx}`}
                          src={imageUrl}
                          alt={`review-image-${idx + 1}`}
                          className="aspect-square w-full rounded-lg border border-gray-200 object-cover dark:border-gray-700"
                        />
                      ))}
                    </div>
                  )}

                  {canReportReview && user?._id !== review.userId?._id && (
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() => void handleReportReview(review._id)}
                        disabled={reportSubmittingId === review._id}
                        className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/20 disabled:opacity-60"
                      >
                        {reportSubmittingId === review._id ? "Đang gửi..." : "Report review"}
                      </button>
                    </div>
                  )}

                  {isAdmin && (
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() => void handleAdminToggleHide(review)}
                        disabled={moderatingReviewId === review._id}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-60 ${
                          review.isHidden
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                            : "border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
                        }`}
                      >
                        {moderatingReviewId === review._id
                          ? "Đang xử lý..."
                          : review.isHidden
                            ? "Hiện lại"
                            : "Ẩn review"}
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
          </div>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-1 text-xl font-bold text-[#111318] dark:text-white">
          {recommendationType === "alternatives" ? "Có ở thư viện khác" : "Readers also enjoyed"}
        </h2>
        <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
          {recommendationType === "alternatives"
            ? "Các thư viện khác hiện có cùng đầu sách này để bạn chọn nơi mượn phù hợp."
            : "Một vài gợi ý cùng thể loại nếu hiện chưa có bản sao ở thư viện khác."}
        </p>
        {recommendations.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Chưa có gợi ý phù hợp.</p>
        ) : (
          <div className="grid grid-cols-2 gap-5 md:grid-cols-4 lg:grid-cols-5">
            {recommendations.map((item) => (
              <BookCard key={item._id} book={item} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-12 bg-white rounded-2xl p-8 shadow-sm dark:bg-[#1a2130] dark:border-gray-800 border border-gray-100">
        <h2 className="text-2xl font-extrabold leading-tight tracking-[-0.015em] text-[#111318] dark:text-white mb-6">
          Explore Categories
        </h2>
        
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          <div className="group relative flex h-40 flex-col justify-end overflow-hidden rounded-xl p-5 transition-all duration-300 bg-gradient-to-br from-[#2b6cee] to-[#1e4cba] hover:shadow-xl">
            <div className="absolute -right-4 -top-4 opacity-10 transition-all duration-300 group-hover:opacity-20">
              <span className="material-symbols-outlined text-9xl text-white">auto_stories</span>
            </div>
            <div className="z-10 space-y-1">
              <span className="material-symbols-outlined mb-2 block text-3xl text-white transition-transform duration-300 group-hover:scale-110">auto_stories</span>
              <p className="text-lg font-bold text-white">Công Nghệ</p>
              <p className="text-sm text-white/80">100+ titles</p>
            </div>
          </div>
          
          <div className="group relative flex h-40 flex-col justify-end overflow-hidden rounded-xl p-5 transition-all duration-300 bg-gradient-to-br from-[#0f172a] to-[#1a2542] hover:shadow-xl">
            <div className="absolute -right-4 -top-4 opacity-10 transition-all duration-300 group-hover:opacity-20">
              <span className="material-symbols-outlined text-9xl text-white">terminal</span>
            </div>
            <div className="z-10 space-y-1">
              <span className="material-symbols-outlined mb-2 block text-3xl text-white transition-transform duration-300 group-hover:scale-110">terminal</span>
              <p className="text-lg font-bold text-white">Khoa Học</p>
              <p className="text-sm text-white/80">80+ titles</p>
            </div>
          </div>
          
          <div className="group relative flex h-40 flex-col justify-end overflow-hidden rounded-xl p-5 transition-all duration-300 bg-gradient-to-br from-[#065f46] to-[#064e3b] hover:shadow-xl">
            <div className="absolute -right-4 -top-4 opacity-10 transition-all duration-300 group-hover:opacity-20">
              <span className="material-symbols-outlined text-9xl text-white">biotech</span>
            </div>
            <div className="z-10 space-y-1">
              <span className="material-symbols-outlined mb-2 block text-3xl text-white transition-transform duration-300 group-hover:scale-110">biotech</span>
              <p className="text-lg font-bold text-white">Văn Học</p>
              <p className="text-sm text-white/80">120+ titles</p>
            </div>
          </div>
          
          <div className="group relative flex h-40 flex-col justify-end overflow-hidden rounded-xl p-5 transition-all duration-300 bg-gradient-to-br from-[#9d174d] to-[#831843] hover:shadow-xl">
            <div className="absolute -right-4 -top-4 opacity-10 transition-all duration-300 group-hover:opacity-20">
              <span className="material-symbols-outlined text-9xl text-white">palette</span>
            </div>
            <div className="z-10 space-y-1">
              <span className="material-symbols-outlined mb-2 block text-3xl text-white transition-transform duration-300 group-hover:scale-110">palette</span>
              <p className="text-lg font-bold text-white">Nghệ Thuật</p>
              <p className="text-sm text-white/80">60+ titles</p>
            </div>
          </div>
        </div>
      </section>

      {reportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">Report đánh giá</h3>
              <button
                type="button"
                onClick={() => {
                  if (reportSubmittingId) return;
                  setReportModalOpen(false);
                }}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mb-2 text-sm text-slate-300">Lý do report sẽ được gửi thẳng cho Admin xử lý.</p>

            <textarea
              rows={4}
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500"
              placeholder="Nhập lý do report..."
            />
            <p className="mt-1 text-xs text-slate-400">Tối thiểu 5 ký tự.</p>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReportModalOpen(false)}
                disabled={Boolean(reportSubmittingId)}
                className="rounded-lg border border-slate-600/50 bg-slate-700/40 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700/60 disabled:opacity-60"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => void submitReportReview()}
                disabled={Boolean(reportSubmittingId) || reportReason.trim().length < 5}
                className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-200 hover:bg-red-500/20 disabled:opacity-60"
              >
                {reportSubmittingId ? "Đang gửi..." : "Gửi report"}
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
                  if (moderatingReviewId) return;
                  setHideModalOpen(false);
                }}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mb-2 text-sm text-slate-300">Nhập lý do vi phạm để thông báo rõ cho người dùng.</p>
            <textarea
              rows={4}
              value={hideReason}
              onChange={(e) => setHideReason(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-500"
              placeholder="Ví dụ: Nội dung công kích cá nhân, sai sự thật..."
            />
            <p className="mt-1 text-xs text-slate-400">Tối thiểu 5 ký tự.</p>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setHideModalOpen(false)}
                disabled={Boolean(moderatingReviewId)}
                className="rounded-lg border border-slate-600/50 bg-slate-700/40 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700/60 disabled:opacity-60"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => void submitAdminHideReview()}
                disabled={Boolean(moderatingReviewId) || hideReason.trim().length < 5}
                className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-500/20 disabled:opacity-60"
              >
                {moderatingReviewId ? "Đang xử lý..." : "Xác nhận ẩn review"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}