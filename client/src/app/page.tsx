"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookHeart, BookOpen, Library, Search, Sparkles } from "lucide-react";
import { bookService } from "@/services/bookService";
import { wishlistService } from "@/services/wishlistService";
import { useAuthStore } from "@/stores/authStore";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import type { IBook } from "@/types";

const FALLBACK_COVER =
  "https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=900&auto=format&fit=crop";

interface UICategory {
  name: string;
  count: number;
}

const BookSkeleton = () => (
  <div className="min-w-48 max-w-48 animate-pulse">
    <div className="aspect-[3/4] w-full rounded-xl bg-gray-300 dark:bg-gray-700" />
    <div className="mt-3 space-y-2 px-1">
      <div className="h-4 w-full rounded bg-gray-300 dark:bg-gray-700" />
      <div className="h-3 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
      <div className="h-3 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
    </div>
  </div>
);

const formatCategoryCount = (count: number): string => {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1).replace(/\.0$/, "")}k+ đầu sách`;
  }
  return `${count}+ đầu sách`;
};

const normalizeCategory = (value?: string): string => {
  if (!value) return "Khác";
  const trimmed = value.trim();
  if (!trimmed) return "Khác";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
};

export default function HomePage() {
  const [books, setBooks] = useState<IBook[]>([]);
  const [allBooks, setAllBooks] = useState<IBook[]>([]);
  const [libraryPresenceByBookId, setLibraryPresenceByBookId] = useState<Record<string, number>>({});
  const [searchText, setSearchText] = useState("");
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [isLoadingBooks, setIsLoadingBooks] = useState(true);
  const [error, setError] = useState<string>("");

  const hasInitializedRef = useRef(false);
  const browseSectionRef = useRef<HTMLElement>(null);
  const [shouldLoadLibraryPresence, setShouldLoadLibraryPresence] = useState(false);

  const [wishlistMessage, setWishlistMessage] = useState<string>("");
  const [wishlistMessageType, setWishlistMessageType] = useState<"info" | "error">("info");
  const [wishlistedBookIds, setWishlistedBookIds] = useState<Record<string, boolean>>({});
  const [wishlistLoadingBookId, setWishlistLoadingBookId] = useState<string | null>(null);
  const { user, getCurrentUser } = useAuthStore();
  const isSignedIn = Boolean(user && user.role !== "guest");

  const loadBooks = useCallback(async (nextQuery = "", nextCategory = "") => {
    setIsLoadingBooks(true);
    setError("");

    try {
      const [{ books: featuredBooks }, { books: categorySourceBooks }] = await Promise.all([
        bookService.getBooks({
          page: 1,
          limit: 6,
          q: nextQuery || undefined,
          category: nextCategory || undefined,
          status: "available",
          includeWishlist: true,
        }),
        bookService.getBooks({
          page: 1,
          limit: 100,
          q: nextQuery || undefined,
          status: "available",
        }),
      ]);

      setBooks(featuredBooks);
      setAllBooks(categorySourceBooks);
      setWishlistedBookIds(
        featuredBooks.reduce<Record<string, boolean>>((acc, book) => {
          acc[book._id] = Boolean(book.isWishlisted);
          return acc;
        }, {})
      );
      setLibraryPresenceByBookId((prev) => {
        const next = { ...prev };
        featuredBooks.forEach((book) => {
          if (!next[book._id]) {
            next[book._id] = 1;
          }
        });
        return next;
      });
    } catch {
      setError("Không tải được dữ liệu sách. Vui lòng thử lại.");
      setBooks([]);
      setAllBooks([]);
      setWishlistedBookIds({});
      setLibraryPresenceByBookId({});
    } finally {
      setIsLoadingBooks(false);
    }
  }, []);

  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;
    void loadBooks();
  }, [loadBooks]);

  useEffect(() => {
    const section = browseSectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          setShouldLoadLibraryPresence(true);
          observer.disconnect();
        }
      },
      { rootMargin: "120px" }
    );

    observer.observe(section);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!shouldLoadLibraryPresence || books.length === 0) return;

    const pendingBooks = books.filter((book) => !libraryPresenceByBookId[book._id]);
    if (pendingBooks.length === 0) return;

    let cancelled = false;

    const loadLibraryPresence = async () => {
      const entries = await Promise.all(
        pendingBooks.map(async (book) => {
          try {
            const alternatives = await bookService.getBookAlternatives(book._id);

            const libraryIds = new Set<string>([
              book.libraryId?._id,
              ...alternatives.alternatives.map((item) => item.libraryId?._id),
            ].filter((value): value is string => Boolean(value)));

            const fallbackCount = alternatives.alternatives.length + 1;
            return [book._id, Math.max(libraryIds.size, fallbackCount)] as const;
          } catch {
            return [book._id, 1] as const;
          }
        })
      );

      if (cancelled) return;

      setLibraryPresenceByBookId((prev) => ({
        ...prev,
        ...Object.fromEntries(entries),
      }));
    };

    void loadLibraryPresence();

    return () => {
      cancelled = true;
    };
  }, [books, libraryPresenceByBookId, shouldLoadLibraryPresence]);

  useEffect(() => {
    void getCurrentUser();
  }, [getCurrentUser]);

  useEffect(() => {
    void loadBooks(query, activeCategory);
  }, [isSignedIn, user?._id, query, activeCategory, loadBooks]);



  useEffect(() => {
    if (!wishlistMessage) return;

    const timeoutId = window.setTimeout(() => {
      setWishlistMessage("");
    }, 2600);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [wishlistMessage]);

  const categories = useMemo<UICategory[]>(() => {
    const counts = new Map<string, number>();

    allBooks.forEach((book) => {
      const normalizedCategory = normalizeCategory(book.category);
      counts.set(normalizedCategory, (counts.get(normalizedCategory) || 0) + 1);
    });

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([name, count]) => ({
        name,
        count,
      }));
  }, [allBooks]);
  const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedQuery = searchText.trim();
    setQuery(normalizedQuery);
    await loadBooks(normalizedQuery, activeCategory);
  };

  const handleCategoryClick = async (categoryName: string) => {
    const normalized = activeCategory === categoryName ? "" : categoryName;
    setActiveCategory(normalized);
    await loadBooks(query, normalized);
  };

  const isBookWishlisted = (book: IBook): boolean => {
    if (wishlistedBookIds[book._id] !== undefined) {
      return wishlistedBookIds[book._id];
    }
    return Boolean(book.isWishlisted);
  };

  const handleWishlistToggle = async (event: React.MouseEvent, book: IBook) => {
    event.preventDefault();
    event.stopPropagation();

    if (!isSignedIn) {
      setWishlistMessageType("info");
      setWishlistMessage("Bạn cần đăng nhập để thêm sách vào wishlist.");
      return;
    }

    const currentWishlisted = isBookWishlisted(book);
    setWishlistLoadingBookId(book._id);
    setWishlistMessage("");

    try {
      if (currentWishlisted) {
        const result = await wishlistService.removeFromWishlist(book._id);
        setWishlistedBookIds((prev) => ({ ...prev, [book._id]: result.isWishlisted }));
        setBooks((prev) => prev.map((b) => b._id === book._id ? { ...b, wishlistCount: result.wishlistCount } : b));
        setWishlistMessageType("info");
        setWishlistMessage("Đã bỏ khỏi wishlist.");
      } else {
        const result = await wishlistService.addToWishlist(book._id);
        setWishlistedBookIds((prev) => ({ ...prev, [book._id]: result.isWishlisted }));
        setBooks((prev) => prev.map((b) => b._id === book._id ? { ...b, wishlistCount: result.wishlistCount } : b));
        setWishlistMessageType("info");
        setWishlistMessage("Đã thêm vào wishlist.");
      }
    } catch {
      setWishlistMessageType("error");
      setWishlistMessage("Không thể cập nhật wishlist. Vui lòng thử lại.");
    } finally {
      setWishlistLoadingBookId(null);
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f6f6f8] text-[#111318] transition-colors duration-200 dark:bg-[#101622] dark:text-white">
      {wishlistMessage ? (
        <div className="fixed right-4 top-4 z-50 sm:right-6 sm:top-6">
          <div
            className={`rounded-xl px-4 py-3 text-sm font-medium shadow-xl backdrop-blur ${wishlistMessageType === "error"
              ? "border border-red-300 bg-red-50/95 text-red-700 dark:border-red-700/50 dark:bg-red-900/80 dark:text-red-300"
              : "border border-blue-300 bg-blue-50/95 text-blue-700 dark:border-blue-700/50 dark:bg-blue-900/80 dark:text-blue-200"
              }`}
          >
            {wishlistMessage}
          </div>
        </div>
      ) : null}

      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;700;800&display=swap");
        @import url("https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap");

        .material-symbols-outlined {
font-variation-settings: "FILL" 0, "wght" 400, "GRAD" 0, "opsz" 24;
        }

        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }

        .animation-delay-200 {
          animation-delay: 0.2s;
        }
      `}</style>

      <div className="mx-auto w-full max-w-[1240px]">
        <Header searchText={searchText} onSearchChange={setSearchText} onSearch={handleSearch} showSearch={true} />

        <main className="space-y-8 px-4 py-6 sm:px-6 lg:px-8">
          <section className="relative overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-[#eaf1ff] via-[#f7f9ff] to-[#eef6ff] p-6 dark:border-slate-700 dark:from-[#13203a] dark:via-[#111b31] dark:to-[#0f2338] sm:p-8">
            <div className="pointer-events-none absolute -right-16 -top-14 h-52 w-52 rounded-full bg-blue-300/30 blur-3xl dark:bg-cyan-500/20" />
            <div className="pointer-events-none absolute -bottom-20 left-10 h-52 w-52 rounded-full bg-cyan-300/30 blur-3xl dark:bg-blue-500/20" />

            <div className="relative grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-center">
              <div>
                <p className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/80 px-3 py-1 text-xs font-semibold text-blue-700 dark:border-slate-600 dark:bg-slate-900/70 dark:text-cyan-200">
                  <Sparkles className="h-3.5 w-3.5" />
                  Nền tảng mượn sách liên thư viện
                </p>
                <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-[-0.02em] text-slate-900 dark:text-white sm:text-5xl">
                  Tìm sách nhanh, biết ngay mượn ở đâu
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300 sm:text-base">
                  Nhập tên sách, tác giả hoặc ISBN để xem thư viện còn sách, thêm vào wishlist, rồi tạo yêu cầu mượn chỉ trong vài bước.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href="#browse"
                    className="inline-flex items-center gap-2 rounded-xl bg-[#2b6cee] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1f53c9]"
                  >
                    Khám phá sách <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href={isSignedIn ? "/dashboard/books" : "/login"}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    {isSignedIn ? "Vào dashboard" : "Đăng nhập để mượn"}
                  </Link>
                </div>
              </div>

              <div className="rounded-2xl border border-white/70 bg-white/85 p-4 shadow-xl backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/80">
                <form onSubmit={handleSearch} className="space-y-3">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                    Tìm sách ngay
                  </label>
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950/70">
                    <Search className="h-4 w-4 text-slate-400" />
                    <input
                      className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
                      value={searchText}
                      onChange={(event) => setSearchText(event.target.value)}
                      placeholder="Ví dụ: Clean Architecture, Martin Fowler..."
                    />
                  </div>
                  <button
                    className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-[#2b6cee] text-sm font-semibold text-white transition hover:bg-[#1f53c9] disabled:opacity-70"
                    disabled={isLoadingBooks}
                    type="submit"
                  >
                    {isLoadingBooks ? "Đang tải..." : "Tìm kiếm"}
                  </button>
                </form>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-lg bg-blue-50 p-2 dark:bg-blue-900/20">
                    <p className="font-bold text-blue-700 dark:text-blue-300">{allBooks.length}</p>
                    <p className="text-slate-500 dark:text-slate-400">Sách sẵn có</p>
                  </div>
                  <div className="rounded-lg bg-emerald-50 p-2 dark:bg-emerald-900/20">
                    <p className="font-bold text-emerald-700 dark:text-emerald-300">{categories.length}</p>
                    <p className="text-slate-500 dark:text-slate-400">Danh mục</p>
                  </div>
                  <div className="rounded-lg bg-cyan-50 p-2 dark:bg-cyan-900/20">
                    <p className="font-bold text-cyan-700 dark:text-cyan-300">{books.length}</p>
                    <p className="text-slate-500 dark:text-slate-400">Sách nổi bật</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section id="about" className="grid gap-3 md:grid-cols-3">
            <article className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/70">
              <BookOpen className="h-5 w-5 text-blue-500" />
              <h3 className="mt-2 text-sm font-bold text-slate-900 dark:text-white">Bước 1: Tìm sách</h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                Tìm theo tên, tác giả hoặc ISBN để xem còn sách ở thư viện nào.
              </p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/70">
              <BookHeart className="h-5 w-5 text-rose-500" />
              <h3 className="mt-2 text-sm font-bold text-slate-900 dark:text-white">Bước 2: Lưu yêu thích</h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                Thêm wishlist để theo dõi nhanh những sách bạn muốn mượn sau.
              </p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/70">
              <Library className="h-5 w-5 text-emerald-500" />
              <h3 className="mt-2 text-sm font-bold text-slate-900 dark:text-white">Bước 3: Mượn/đặt trước</h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                Vào dashboard để tạo yêu cầu mượn hoặc đặt trước khi sách chưa sẵn.
              </p>
            </article>
          </section>

          <section id="browse" ref={browseSectionRef} className="scroll-mt-20 rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/70 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Sách nổi bật đang có sẵn</h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Mẹo: Bấm vào danh mục để lọc nhanh, hoặc tìm kiếm phía trên để thu hẹp kết quả.
                </p>
              </div>
              <Link
                href="/dashboard/books"
                className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20"
              >
                Xem toàn bộ kho sách <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {categories.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveCategory("");
                    void loadBooks(query, "");
                  }}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${activeCategory === ""
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                    : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                    }`}
                >
                  Tất cả danh mục
                </button>
                {categories.map((category) => (
                  <button
                    key={category.name}
                    type="button"
                    onClick={() => void handleCategoryClick(category.name)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${activeCategory === category.name
                      ? "bg-[#2b6cee] text-white"
                      : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                      }`}
                  >
                    {category.name} · {formatCategoryCount(category.count)}
                  </button>
                ))}
              </div>
            )}

            {error && (
              <div className="mt-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
                {error}
              </div>
            )}

            {isLoadingBooks ? (
              <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                {Array.from({ length: 6 }).map((_, i) => <BookSkeleton key={i} />)}
              </div>
            ) : books.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-10 text-center dark:border-slate-700 dark:bg-slate-800/60">
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Không có sách phù hợp bộ lọc hiện tại.</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Hãy thử từ khóa khác hoặc bỏ lọc danh mục.</p>
              </div>
            ) : (
              <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                {books.map((book) => (
                  <Link
                    key={book._id}
                    href={`/books/${book._id}`}
                    className="group rounded-2xl border border-slate-200 bg-white p-2 transition hover:-translate-y-1 hover:shadow-xl dark:border-slate-700 dark:bg-slate-900/80"
                  >
                    <div
                      className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-slate-200 dark:bg-slate-700"
                      style={{
                        backgroundImage: `url("${book.coverImage || FALLBACK_COVER}")`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                    >
                      <button
                        type="button"
                        disabled={wishlistLoadingBookId === book._id}
                        onClick={(event) => void handleWishlistToggle(event, book)}
                        className={`absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold backdrop-blur-sm ${isBookWishlisted(book)
                          ? "bg-white/90 text-rose-500"
                          : "bg-black/45 text-white"
                          } disabled:opacity-60`}
                        aria-label={isBookWishlisted(book) ? "Bỏ yêu thích" : "Thêm yêu thích"}
                      >
                        <span>{wishlistLoadingBookId === book._id ? "..." : isBookWishlisted(book) ? "♥" : "♡"}</span>
                        <span>{book.wishlistCount || 0}</span>
                      </button>
                    </div>

                    <div className="px-1 pb-1 pt-2">
                      <p className="line-clamp-2 text-sm font-bold text-slate-900 dark:text-white" title={book.title}>
                        {book.title}
                      </p>
                      <p className="mt-0.5 line-clamp-1 text-xs text-slate-500 dark:text-slate-400">{book.author}</p>
                      <p className="mt-1 line-clamp-1 text-[11px] font-medium text-[#2b6cee] dark:text-blue-300" title={book.libraryId?.name || "Không xác định thư viện"}>
                        {book.libraryId?.name || "Không xác định thư viện"} {book.libraryId?.code ? `(${book.libraryId.code})` : ""}
                      </p>

                      <div className="mt-2 flex items-center justify-between gap-1 text-[10px]">
                        <span className={`rounded-full px-2 py-1 font-semibold ${book.availableCopies > 0
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                          }`}>
                          {book.availableCopies}/{book.totalCopies}
                        </span>
                        <span className="rounded-full bg-blue-100 px-2 py-1 font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                          {libraryPresenceByBookId[book._id] && libraryPresenceByBookId[book._id] > 1
                            ? `${libraryPresenceByBookId[book._id]} thư viện`
                            : "1 thư viện"}
                        </span>
                      </div>

                      <div className="mt-2 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                        ⭐ {book.averageRating ? `${book.averageRating}/5` : "Chưa có đánh giá"}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </main>

        <Footer />
      </div>
    </div>
  );
}
