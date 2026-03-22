"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import BookDetailView from "@/app/dashboard/books/page_book_detail";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { bookService } from "@/services/bookService";
import { borrowingService } from "@/services/borrowingService";
import { reviewService } from "@/services/reviewService";
import { reservationService } from "@/services/reservationService";
import { wishlistService } from "@/services/wishlistService";
import { useAuthStore } from "@/stores/authStore";
import type { IBook, IBookReview } from "@/types";

export default function BookDetailPage() {
  const { user, isAuthenticated, getCurrentUser } = useAuthStore();
  const params = useParams<{ bookId: string }>();
  const bookId = useMemo(() => params?.bookId ?? "", [params?.bookId]);

  const [book, setBook] = useState<IBook | null>(null);
  const [recommendations, setRecommendations] = useState<IBook[]>([]);
  const [recommendationType, setRecommendationType] = useState<"alternatives" | "related">("related");
  const [isReserving, setIsReserving] = useState(false);
  const [reserveMessage, setReserveMessage] = useState("");
  const [reserveError, setReserveError] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviews, setReviews] = useState<IBookReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState("");
  const [canReview, setCanReview] = useState(false);
  const [canReviewLoading, setCanReviewLoading] = useState(false);
  const [myBookReview, setMyBookReview] = useState<IBookReview | null>(null);

  const [isWishlisted, setIsWishlisted] = useState(false);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [wishlistMessage, setWishlistMessage] = useState("");

  useEffect(() => {
    void getCurrentUser();
  }, [getCurrentUser]);

  const loadReviews = async (targetBookId: string) => {
    setReviewsLoading(true);
    setReviewsError("");
    try {
      // Admin and Librarian can see hidden reviews
      const includeHidden = user?.role === "admin" || user?.role === "librarian";
      const reviewsResult = await reviewService.getBookReviews(targetBookId, { page: 1, limit: 20, includeHidden });
      setReviews(reviewsResult.reviews);

      if (user?._id) {
        const mine = reviewsResult.reviews.find((item) => item.userId?._id === user._id) || null;
        setMyBookReview(mine);
      } else {
        setMyBookReview(null);
      }
    } catch {
      setReviews([]);
      setMyBookReview(null);
      setReviewsError("Không thể tải review của độc giả.");
    } finally {
      setReviewsLoading(false);
    }
  };

  const loadCanReview = async (targetBookId: string) => {
    if (!isAuthenticated || !user || user.role !== "user") {
      setCanReview(false);
      setCanReviewLoading(false);
      return;
    }

    setCanReviewLoading(true);
    try {
      const myBorrowings = await borrowingService.getMyBorrowings({ page: 1, limit: 200 });
      const eligibleStatuses = new Set(["borrowed", "returned", "overdue"]);
      const hasBorrowedThisBook = myBorrowings.borrowings.some(
        (item) => item.bookId?._id === targetBookId && eligibleStatuses.has(item.status)
      );
      setCanReview(hasBorrowedThisBook);
    } catch {
      setCanReview(false);
    } finally {
      setCanReviewLoading(false);
    }
  };

  useEffect(() => {
    const fetchBookDetail = async () => {
      if (!bookId) {
        setError("ID sách không hợp lệ.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const selectedBook = await bookService.getBookById(bookId);
        setBook(selectedBook);
        setIsWishlisted(Boolean(selectedBook.isWishlisted));
        setWishlistCount(selectedBook.wishlistCount || 0);
        setReserveMessage("");
        setReserveError("");

        const alternatives = await bookService.getBookAlternatives(bookId);

        await Promise.all([
          loadReviews(bookId),
          loadCanReview(bookId),
        ]);

        if (alternatives.alternatives.length > 0) {
          setRecommendationType("alternatives");
          setRecommendations(alternatives.alternatives.slice(0, 5));
        } else {
          setRecommendationType("related");
          const related = await bookService.getBooks({
            page: 1,
            limit: 6,
            category: selectedBook.category || undefined,
            status: "available",
          });

          setRecommendations(related.books.filter((item) => item._id !== selectedBook._id).slice(0, 5));
        }
      } catch {
        setError("Không thể tải chi tiết sách. Vui lòng thử lại.");
        setBook(null);
        setReviews([]);
        setCanReview(false);
        setCanReviewLoading(false);
        setMyBookReview(null);
        setReviewsError("Không thể tải review của độc giả.");
        setRecommendationType("related");
        setRecommendations([]);
      } finally {
        setLoading(false);
      }
    };

    void fetchBookDetail();
  }, [bookId, isAuthenticated, user?._id]);

  const handleReserve = async () => {
    if (!book) return;

    setReserveError("");
    setReserveMessage("");

    if (!isAuthenticated || !user || user.role === "guest") {
      setReserveError("Vui lòng đăng nhập tài khoản người dùng để đặt trước.");
      return;
    }

    if (user.role !== "user") {
      setReserveError("Chỉ tài khoản bạn đọc mới có thể tạo yêu cầu đặt trước.");
      return;
    }

    if (book.availableCopies > 0) {
      setReserveError("Sách hiện còn sẵn, vui lòng mượn trực tiếp thay vì đặt trước.");
      return;
    }

    setIsReserving(true);
    try {
      await reservationService.createReservation({
        bookId: book._id,
        libraryId: book.libraryId._id,
      });
      setReserveMessage("Đã tạo yêu cầu đặt trước. Bạn có thể theo dõi trong mục Đặt trước của tôi.");
    } catch (reserveActionError) {
      let message = "Không thể tạo đặt trước. Vui lòng thử lại.";
      
      // Check if it's an axios error with response data
      if (
        reserveActionError &&
        typeof reserveActionError === "object" &&
        "response" in reserveActionError &&
        reserveActionError.response &&
        typeof reserveActionError.response === "object"
      ) {
        const response = reserveActionError.response as Record<string, unknown>;
        if (response.data && typeof response.data === "object") {
          const data = response.data as Record<string, unknown>;
          if (data.error && typeof data.error === "object") {
            const error = data.error as Record<string, unknown>;
            if (error.message && typeof error.message === "string") {
              message = error.message;
            }
          }
        }
      } else if (reserveActionError instanceof Error) {
        // Fallback for regular Error objects
        message = reserveActionError.message;
      }
      
      setReserveError(message);
    } finally {
      setIsReserving(false);
    }
  };

  const handleWishlistToggle = async () => {
    const isSignedIn = user && user.role !== "guest";
    if (!isSignedIn) {
      setWishlistMessage("Bạn cần đăng nhập để thêm sách vào wishlist.");
      return;
    }

    setWishlistLoading(true);
    try {
      if (isWishlisted) {
        const result = await wishlistService.removeFromWishlist(book!._id);
        setIsWishlisted(result.isWishlisted);
        setWishlistCount(result.wishlistCount);
      } else {
        const result = await wishlistService.addToWishlist(book!._id);
        setIsWishlisted(result.isWishlisted);
        setWishlistCount(result.wishlistCount);
      }
    } catch {
      setWishlistMessage("Không thể cập nhật wishlist. Vui lòng thử lại.");
    } finally {
      setWishlistLoading(false);
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f6f6f8] text-[#111318] transition-colors duration-200 dark:bg-[#101622] dark:text-white">
      {wishlistMessage && (
        <div className="fixed right-4 top-4 z-50 sm:right-6 sm:top-6">
          <div className="rounded-xl border border-blue-300 bg-blue-50/95 px-4 py-3 text-sm font-medium text-blue-700 shadow-xl backdrop-blur dark:border-blue-700/50 dark:bg-blue-900/80 dark:text-blue-200">
            {wishlistMessage}
          </div>
        </div>
      )}
      <div className="mx-auto w-full max-w-[1200px]">
        <Header searchText="" onSearchChange={() => {}} onSearch={() => {}} showSearch={true} />
        
        <BookDetailView
          book={book}
          recommendations={recommendations}
          recommendationType={recommendationType}
          loading={loading}
          error={error}
          onReserve={handleReserve}
          reserveLoading={isReserving}
          reserveMessage={reserveMessage}
          reserveError={reserveError}
          isWishlisted={isWishlisted}
          wishlistCount={wishlistCount}
          wishlistLoading={wishlistLoading}
          onWishlistToggle={() => void handleWishlistToggle()}
          reviews={reviews}
          reviewsLoading={reviewsLoading}
          reviewsError={reviewsError}
          canReview={canReview}
          canReviewLoading={canReviewLoading}
          myBookReview={myBookReview}
          onReviewChanged={() => loadReviews(bookId)}
        />
        
        <Footer />
      </div>
    </div>
  );
}
