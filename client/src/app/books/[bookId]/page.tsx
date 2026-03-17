"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import BookDetailView from "@/app/dashboard/books/page_book_detail";
import { bookService } from "@/services/bookService";
import type { IBook } from "@/types";

export default function BookDetailPage() {
  const params = useParams<{ bookId: string }>();
  const bookId = useMemo(() => params?.bookId ?? "", [params?.bookId]);

  const [book, setBook] = useState<IBook | null>(null);
  const [recommendations, setRecommendations] = useState<IBook[]>([]);
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

        const related = await bookService.getBooks({
          page: 1,
          limit: 6,
          category: selectedBook.category || undefined,
          status: "available",
        });

        setRecommendations(related.books.filter((item) => item._id !== selectedBook._id).slice(0, 5));
      } catch {
        setError("Không thể tải chi tiết sách. Vui lòng thử lại.");
        setBook(null);
        setRecommendations([]);
      } finally {
        setLoading(false);
      }
    };

    void fetchBookDetail();
  }, [bookId]);

  return <BookDetailView book={book} recommendations={recommendations} loading={loading} error={error} />;
}
