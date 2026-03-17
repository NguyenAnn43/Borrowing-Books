"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { bookService } from "@/services/bookService";
import type { IBook } from "@/types";

const FALLBACK_COVER =
  "https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=900&auto=format&fit=crop";

const CATEGORY_STYLE_POOL = [
  { icon: "auto_stories", bg: "bg-gradient-to-br from-[#2b6cee] to-[#1e4cba]" },
  { icon: "terminal", bg: "bg-gradient-to-br from-[#0f172a] to-[#1a2542]" },
  { icon: "biotech", bg: "bg-gradient-to-br from-[#065f46] to-[#064e3b]" },
  { icon: "palette", bg: "bg-gradient-to-br from-[#9d174d] to-[#831843]" },
];

interface UICategory {
  name: string;
  count: number;
  icon: string;
  bg: string;
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

const CategorySkeleton = () => (
  <div className="h-40 animate-pulse rounded-xl bg-gradient-to-br from-gray-300 to-gray-200 dark:from-gray-700 dark:to-gray-600" />
);

const formatCategoryCount = (count: number): string => {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1).replace(/\.0$/, "")}k+ titles`;
  }
  return `${count}+ titles`;
};

const normalizeCategory = (value?: string): string => {
  if (!value) return "Others";
  const trimmed = value.trim();
  if (!trimmed) return "Others";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
};

const HEADER_NAV_ITEMS = [
  { label: "Home", href: "/" },
  { label: "Browse", href: "#browse" },
  { label: "Libraries", href: "#libraries" },
  { label: "About", href: "#about" },
];

const FOOTER_LINK_SECTIONS = [
  {
    title: "Services",
    links: [
      { label: "E-Books", href: "/dashboard/books" },
      { label: "Audiobooks", href: "/dashboard/books" },
      { label: "Local Events", href: "#about" },
    ],
  },
  {
    title: "Platform",
    links: [
      { label: "For Librarians", href: "/login" },
      { label: "API Access", href: "/login" },
      { label: "Mobile App", href: "/register" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Us", href: "#about" },
      { label: "Support", href: "mailto:support@mosa-library.local" },
      { label: "Contact", href: "mailto:contact@mosa-library.local" },
    ],
  },
];

const FOOTER_SOCIAL_LINKS = [
  { icon: "public", href: "/" },
  { icon: "rss_feed", href: "#browse" },
  { icon: "alternate_email", href: "mailto:contact@mosa-library.local" },
];

export default function HomePage() {
  const [books, setBooks] = useState<IBook[]>([]);
  const [allBooks, setAllBooks] = useState<IBook[]>([]);
  const [searchText, setSearchText] = useState("");
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [isLoadingBooks, setIsLoadingBooks] = useState(true);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [error, setError] = useState<string>("");

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
    } catch {
      setError("Không tải được dữ liệu sách. Vui lòng thử lại.");
      setBooks([]);
      setAllBooks([]);
    } finally {
      setIsLoadingBooks(false);
      setIsLoadingCategories(false);
    }
  }, []);

  useEffect(() => {
    void loadBooks();
  }, [loadBooks]);

  const categories = useMemo<UICategory[]>(() => {
    const counts = new Map<string, number>();

    allBooks.forEach((book) => {
      const normalizedCategory = normalizeCategory(book.category);
      counts.set(normalizedCategory, (counts.get(normalizedCategory) || 0) + 1);
    });

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([name, count], index) => ({
        name,
        count,
        icon: CATEGORY_STYLE_POOL[index % CATEGORY_STYLE_POOL.length].icon,
        bg: CATEGORY_STYLE_POOL[index % CATEGORY_STYLE_POOL.length].bg,
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

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f6f6f8] text-[#111318] transition-colors duration-200 dark:bg-[#101622] dark:text-white">
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

      <div className="mx-auto w-full max-w-[1200px]">
        <header className="flex items-center justify-between border-b border-[#f0f2f4] bg-white px-6 py-3 shadow-sm transition-shadow duration-300 dark:border-gray-800 dark:bg-[#101622] md:px-10">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-4 text-[#2b6cee] transition-transform duration-300 hover:scale-105">
              <div className="size-6">
                <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M24 4C25.7818 14.2173 33.7827 22.2182 44 24C33.7827 25.7818 25.7818 33.7827 24 44C22.2182 33.7827 14.2173 25.7818 4 24C14.2173 22.2182 22.2182 14.2173 24 4Z"
                    fill="currentColor"
                  />
                </svg>
              </div>
              <Link href="/" className="text-xl font-extrabold leading-tight tracking-[-0.015em] text-[#111318] dark:text-white">
                Mosa
              </Link>
            </div>
            <nav className="hidden items-center gap-9 md:flex">
              {HEADER_NAV_ITEMS.map((item) => (
                <Link
                  key={item.label}
                  className="text-sm font-semibold leading-normal text-[#111318] transition-all duration-300 hover:text-[#2b6cee] dark:text-gray-200"
                  href={item.href}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex flex-1 items-center justify-end gap-4 md:gap-6">
            <label className="hidden h-10 min-w-40 max-w-64 flex-col lg:flex">
              <form className="flex h-full w-full flex-1 items-stretch rounded-lg" onSubmit={handleSearch}>
                <div className="flex items-center justify-center rounded-l-lg border-r-0 bg-gray-100 pl-4 text-[#616f89] transition-colors duration-300 dark:bg-gray-800">
                  <span className="material-symbols-outlined text-xl">search</span>
                </div>
                <input
                  className="form-input h-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg rounded-l-none border-none border-l-0 bg-gray-100 px-4 pl-2 text-sm font-normal leading-normal text-[#111318] placeholder:text-[#616f89] transition-all duration-300 focus:bg-gray-50 focus:border-none focus:outline-0 focus:ring-0 dark:bg-gray-800 dark:text-white dark:focus:bg-gray-700"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Quick search..."
                />
              </form>
            </label>

            <Link href="/login" className="flex h-10 min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-[#2b6cee] px-4 text-sm font-bold leading-normal tracking-[0.015em] text-white transition-all duration-300 hover:bg-blue-700 hover:shadow-lg active:scale-95 dark:hover:bg-blue-600">
              <span className="truncate">Sign In</span>
            </Link>

            <Link
              className="size-10 overflow-hidden rounded-full border border-gray-200 bg-cover bg-center bg-no-repeat transition-all duration-300 hover:ring-2 hover:ring-[#2b6cee] hover:ring-offset-2 dark:border-gray-700 dark:hover:ring-offset-[#101622]"
              style={{
                backgroundImage:
                  'url("https://lh3.googleusercontent.com/aida-public/AB6AXuCQhrvkpn7QIkSQrWD6ryk8-VjcLjjdfyBeE4MTZoL8wPCzy0f7NGQsTUQyRBxEXN5a1RtksfJFs3JP6KDlMnwX2ilQwOkEDreem4zWAIk6K4ja2AiLsC8X1l9kw69nbSiajR8kROHyMMSV6PxWZpVNXKK_AGL3gUsizt3p0fU6ZJx7G1w3LDWDBELQlyMdAB3jSth93Y-X6b3igC_x4s7UYAIbi8oZHg0lqng5pXU-9-Rr9ZVu2mHgntW_Vr1Ablp0pjEo7RowVb6x")',
              }}
              href="/dashboard/profile"
              aria-label="View profile"
            />
          </div>
        </header>

        <section className="px-4 py-5 sm:px-6">
          <div
            className="relative flex min-h-[480px] flex-col items-center justify-center gap-6 overflow-hidden rounded-2xl bg-cover bg-center bg-no-repeat p-8 shadow-2xl sm:gap-8"
            style={{
              backgroundImage:
                'linear-gradient(rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0.7) 100%), url("https://lh3.googleusercontent.com/aida-public/AB6AXuAgMR0Oaf2igJ_zAb3fJagUcaFBFgfXNazzSjxcI5XW8lYKfWEEG5srRN186LtDeES9kZxw_WUmJ7OOQCjXMmlohYUfQviN0A_pvudzaFHJ9yQ5b_fHFcC1AcbD0tmB3j6HPi-Uh_LijnvZDbvw2SvTNz2UlUQxqfEjW4CTmw34F2RHhDlbIiSPFzY7Ble_zGs_JLYNjpv790X2LK_qyW2TuDjnRpf2ItnRy4qKXPYB9s-LviLGMN_R6s06RDgsegkEapJc2qV7MirH")',
            }}
          >
            <div className="z-10 flex max-w-[720px] flex-col gap-4 text-center">
              <h1 className="animate-fade-in text-4xl font-extrabold leading-tight tracking-[-0.033em] text-white sm:text-6xl">
                Your gateway to world&apos;s knowledge.
              </h1>
              <h2 className="animate-fade-in animation-delay-200 mx-auto max-w-[500px] text-sm font-normal leading-relaxed text-white/90 sm:text-lg">
                Access over 2 million titles from 500+ partnered local libraries. Borrow
                digitally or reserve physical copies instantly.
              </h2>
            </div>

            <form className="z-10 flex h-14 w-full max-w-[600px] flex-col shadow-2xl transition-all duration-300 sm:h-16" onSubmit={handleSearch}>
              <div className="flex h-full w-full flex-1 items-stretch rounded-xl">
                <div className="flex items-center justify-center rounded-l-xl border border-r-0 border-white/20 bg-white pl-[15px] text-[#616f89]">
                  <span className="material-symbols-outlined">search</span>
                </div>
                <input
                  className="form-input h-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl rounded-l-none rounded-r-none border border-l-0 border-r-0 border-white/20 bg-white px-[15px] pl-2 pr-2 text-sm font-normal leading-normal text-[#111318] placeholder:text-[#616f89] transition-all duration-300 focus:bg-gray-50 focus:border-white/30 focus:outline-0 focus:ring-0 sm:text-lg"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Search by title, author, or ISBN"
                />
                <div className="flex items-center justify-center rounded-r-xl border border-l-0 border-white/20 bg-white pr-[7px]">
                  <button
                    className="flex h-10 min-w-[100px] cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-gradient-to-r from-[#2b6cee] to-[#1e4cba] px-4 text-sm font-bold leading-normal tracking-[0.015em] text-white transition-all duration-300 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70 active:scale-95 sm:h-12 sm:px-6 sm:text-base"
                    disabled={isLoadingBooks}
                    type="submit"
                  >
                    <span className="truncate">{isLoadingBooks ? "Searching..." : "Search"}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </section>

        <section id="browse" className="py-5 scroll-mt-20">
          <div className="flex items-center justify-between px-4 pb-3 pt-5">
            <h2 className="text-2xl font-extrabold leading-tight tracking-[-0.015em] text-[#111318] dark:text-white">
              Most Borrowed Books
            </h2>
            <Link href="/dashboard/books" className="text-sm font-bold text-[#2b6cee] transition-colors hover:text-blue-700 dark:hover:text-blue-400">
              View All
            </Link>
          </div>

          {error && (
            <div className="mx-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
              ⚠️ {error}
            </div>
          )}

          <div className="flex overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex items-stretch gap-6 px-4">
              {isLoadingBooks
                ? Array.from({ length: 6 }).map((_, i) => <BookSkeleton key={i} />)
                : books.length === 0
                  ? <div className="w-full py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <span className="material-symbols-outlined text-5xl text-gray-300 dark:text-gray-600">
                          library_books
                        </span>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Không có sách phù hợp</p>
                      </div>
                    </div>
                  : books.map((book) => (
                      <Link
                        key={book._id}
                        href={`/books/${book._id}`}
                        className="group flex min-w-48 max-w-48 flex-col gap-3 rounded-lg transition-all duration-300 hover:scale-105"
                      >
                        <div
                          className="aspect-[3/4] w-full overflow-hidden rounded-xl bg-gray-200 shadow-lg transition-all duration-300 group-hover:shadow-2xl dark:bg-gray-700"
                          style={{
                            backgroundImage: `url("${book.coverImage || FALLBACK_COVER}")`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                          }}
                        />
                        <div className="px-1">
                          <p
                            className="line-clamp-1 text-base font-bold leading-tight text-[#111318] dark:text-white"
                            title={book.title}
                          >
                            {book.title}
                          </p>
                          <p className="truncate text-sm font-medium leading-normal text-[#616f89] dark:text-gray-400">
                            {book.author}
                          </p>
                          <div className="mt-2 flex items-center gap-1">
                            <span
                              className={`text-xs font-semibold px-2 py-1 rounded-full ${
                                book.availableCopies > 0
                                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                  : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                              }`}
                            >
                              {book.availableCopies}/{book.totalCopies}
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
            </div>
          </div>
        </section>

        <section id="libraries" className="bg-white py-10 scroll-mt-20 dark:bg-[#101622]/50">
          <h2 className="px-4 pb-6 text-2xl font-extrabold leading-tight tracking-[-0.015em] text-[#111318] dark:text-white">
            Featured Categories
          </h2>

          <div className="grid grid-cols-2 gap-6 px-4 md:grid-cols-4">
            {isLoadingCategories
              ? Array.from({ length: 4 }).map((_, i) => <CategorySkeleton key={i} />)
              : categories.length === 0
                ? <p className="col-span-2 text-center text-sm text-gray-500 dark:text-gray-400 md:col-span-4">
                    Chưa có danh mục
                  </p>
                : categories.map((category) => (
                    <button
                      key={category.name}
                      type="button"
                      onClick={() => void handleCategoryClick(category.name)}
                      className={`group relative flex h-40 flex-col justify-end overflow-hidden rounded-xl p-5 transition-all duration-300 ${
                        activeCategory === category.name ? "ring-2 ring-offset-2 ring-[#2b6cee] dark:ring-offset-[#101622]" : ""
                      } hover:shadow-xl`}
                    >
                      <div
                        className={`absolute inset-0 transition-all duration-300 ${category.bg} ${
                          activeCategory === category.name ? "opacity-100" : "opacity-80 group-hover:opacity-95"
                        }`}
                      />
                      <div className="absolute -right-4 -top-4 opacity-10 transition-all duration-300 group-hover:opacity-20">
                        <span className="material-symbols-outlined text-9xl text-white">{category.icon}</span>
                      </div>
                      <div className="z-10 space-y-1">
                        <span className="material-symbols-outlined mb-2 block text-3xl text-white transition-transform duration-300 group-hover:scale-110">
                          {category.icon}
                        </span>
                        <p className="text-lg font-bold text-white">{category.name}</p>
                        <p className="text-sm text-white/80">{formatCategoryCount(category.count)}</p>
                      </div>
                    </button>
                  ))}
          </div>
        </section>

        <footer id="about" className="border-t border-[#f0f2f4] bg-white py-10 scroll-mt-20 shadow-sm dark:border-gray-800 dark:bg-[#101622]">
          <div className="px-6 md:px-10">
            <div className="flex flex-col items-start justify-between gap-10 md:flex-row">
              <div className="flex max-w-xs flex-col gap-4">
                <div className="flex items-center gap-3 text-[#2b6cee] transition-transform duration-300 hover:scale-105">
                  <div className="size-5">
                    <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M24 4C25.7818 14.2173 33.7827 22.2182 44 24C33.7827 25.7818 25.7818 33.7827 24 44C22.2182 33.7827 14.2173 25.7818 4 24C14.2173 22.2182 22.2182 14.2173 24 4Z"
                        fill="currentColor"
                      />
                    </svg>
                  </div>
                  <h2 className="text-lg font-bold">Mosa Library</h2>
                </div>
                <p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                  Modernizing the way we explore knowledge. Connecting libraries,
                  readers, and stories across the globe.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-12 sm:grid-cols-3">
                {FOOTER_LINK_SECTIONS.map((section) => (
                  <div key={section.title} className="flex flex-col gap-4">
                    <h4 className="text-sm font-extrabold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                      {section.title}
                    </h4>
                    {section.links.map((link) => (
                      link.href.startsWith("mailto:")
                        ? (
                            <a
                              key={link.label}
                              className="text-sm font-medium text-gray-600 transition-colors duration-300 hover:text-[#2b6cee] dark:text-gray-400 dark:hover:text-blue-400"
                              href={link.href}
                            >
                              {link.label}
                            </a>
                          )
                        : (
                            <Link
                              key={link.label}
                              className="text-sm font-medium text-gray-600 transition-colors duration-300 hover:text-[#2b6cee] dark:text-gray-400 dark:hover:text-blue-400"
                              href={link.href}
                            >
                              {link.label}
                            </Link>
                          )
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-gray-100 pt-8 dark:border-gray-800 md:flex-row">
              <p className="text-xs text-gray-400">© 2024 Mosa Library Systems. All rights reserved.</p>
              <div className="flex gap-6">
                {FOOTER_SOCIAL_LINKS.map((item) => (
                  item.href.startsWith("mailto:")
                    ? (
                        <a
                          key={item.icon}
                          className="text-gray-400 transition-all duration-300 hover:scale-110 hover:text-[#2b6cee] dark:hover:text-blue-400"
                          href={item.href}
                        >
                          <span className="material-symbols-outlined text-lg">{item.icon}</span>
                        </a>
                      )
                    : (
                        <Link
                          key={item.icon}
                          className="text-gray-400 transition-all duration-300 hover:scale-110 hover:text-[#2b6cee] dark:hover:text-blue-400"
                          href={item.href}
                        >
                          <span className="material-symbols-outlined text-lg">{item.icon}</span>
                        </Link>
                      )
                ))}
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
