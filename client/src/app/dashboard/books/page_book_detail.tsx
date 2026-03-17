"use client";

import Link from "next/link";
import type { IBook } from "@/types";

const FALLBACK_COVER =
  "https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=900&auto=format&fit=crop";

interface BookDetailViewProps {
  book: IBook | null;
  recommendations: IBook[];
  recommendationType?: "alternatives" | "related";
  loading: boolean;
  error: string;
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

export default function BookDetailView({ book, recommendations, recommendationType = "related", loading, error }: BookDetailViewProps) {
  if (loading) {
    return (
      <main className="mx-auto w-full max-w-[1200px] px-6 py-10">
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
      <main className="mx-auto w-full max-w-[1200px] px-6 py-10">
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
    <main className="mx-auto w-full max-w-[1200px] px-6 py-8">
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
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                book.availableCopies > 0
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
              }`}
            >
              {book.availableCopies > 0 ? "Available" : "Out of stock"} ({book.availableCopies}/{book.totalCopies})
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Library: {book.libraryId?.name || "Không xác định"}
            </span>
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
    </main>
  );
}