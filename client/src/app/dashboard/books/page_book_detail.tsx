"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import type { IBook } from "@/types";
import { useAuthStore } from "@/stores/authStore";
import { useCartStore } from "@/stores/cartStore";

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
}: BookDetailViewProps) {
  const { user } = useAuthStore();
  const cartStore = useCartStore();

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
              className={`rounded-full px-3 py-1 text-xs font-bold ${book.availableCopies > 0
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                }`}
            >
              {book.availableCopies > 0 ? "Available" : "Out of stock"} ({book.availableCopies}/{book.totalCopies})
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Library: {book.libraryId?.name || "Không xác định"}
            </span>

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
    </main>
  );
}