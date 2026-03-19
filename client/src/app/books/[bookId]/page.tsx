"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import BookDetailView from "@/app/dashboard/books/page_book_detail";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { bookService } from "@/services/bookService";
import { reservationService } from "@/services/reservationService";
import { useAuthStore } from "@/stores/authStore";
import type { IBook } from "@/types";

export default function BookDetailPage() {
  const { user, isAuthenticated } = useAuthStore();
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
        setReserveMessage("");
        setReserveError("");

        const alternatives = await bookService.getBookAlternatives(bookId);

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
        setRecommendationType("related");
        setRecommendations([]);
      } finally {
        setLoading(false);
      }
    };

    void fetchBookDetail();
  }, [bookId]);

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

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f6f6f8] text-[#111318] transition-colors duration-200 dark:bg-[#101622] dark:text-white">
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
        />
        
        <Footer />
      </div>
    </div>
  );
}
