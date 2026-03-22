"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { libraryService } from "@/services/libraryService";
import { bookService } from "@/services/bookService";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import LibraryReviewSection from "./LibraryReviewSection";
import type { ILibrary, IBook, IPagination } from "@/types";

const FALLBACK_COVER =
  "https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=900&auto=format&fit=crop";

const LibrarySkeleton = () => (
  <div className="animate-pulse rounded-xl overflow-hidden bg-white dark:bg-gray-800">
    <div className="h-48 bg-gray-300 dark:bg-gray-700" />
    <div className="p-4 space-y-3">
      <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4" />
      <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-1/2" />
      <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-full" />
    </div>
  </div>
);

const BookSkeleton = () => (
  <div className="min-w-40 max-w-40 animate-pulse">
    <div className="aspect-[3/4] w-full rounded-xl bg-gray-300 dark:bg-gray-700" />
    <div className="mt-3 space-y-2 px-1">
      <div className="h-4 w-full rounded bg-gray-300 dark:bg-gray-700" />
      <div className="h-3 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
    </div>
  </div>
);

export default function LibrariesPage() {
  const [libraries, setLibraries] = useState<ILibrary[]>([]);
  const [filteredLibraries, setFilteredLibraries] = useState<ILibrary[]>([]);
  const [selectedLibrary, setSelectedLibrary] = useState<ILibrary | null>(null);
  const [books, setBooks] = useState<IBook[]>([]);
  const [pagination, setPagination] = useState<IPagination | null>(null);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("active");
  const [isLoadingLibraries, setIsLoadingLibraries] = useState(true);
  const [isLoadingBooks, setIsLoadingBooks] = useState(false);
  const [error, setError] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [autoSelectLibraryId, setAutoSelectLibraryId] = useState<string | null>(null);
  const booksContainerRef = useRef<HTMLDivElement>(null);

  // Load libraries
  const loadLibraries = useCallback(async () => {
    setIsLoadingLibraries(true);
    setError("");
    try {
      const { libraries: fetchedLibraries } = await libraryService.getLibraries({
        page: 1,
        limit: 100,
        status: statusFilter === "all" ? undefined : statusFilter,
      });
      setLibraries(fetchedLibraries);
    } catch {
      setError("Không tải được danh sách thư viện. Vui lòng thử lại.");
      setLibraries([]);
    } finally {
      setIsLoadingLibraries(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void loadLibraries();
  }, [loadLibraries]);

  // Auto-select library from query param (e.g. /libraries?libraryId=xxx)
  const autoSelectedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setAutoSelectLibraryId(params.get("libraryId"));
  }, []);

  // Load books for selected library
  const loadBooksForLibrary = useCallback(async (library: ILibrary, page = 1) => {
    setIsLoadingBooks(true);
    setError("");
    try {
      const { books: fetchedBooks, pagination: paginationData } = await bookService.getBooks({
        page,
        limit: 12,
        libraryId: library._id,
      });
      setBooks(fetchedBooks);
      setPagination(paginationData);
      setCurrentPage(page);
      setSelectedLibrary(library);

      // Scroll to books section
      setTimeout(() => {
        booksContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch {
      setError("Không tải được danh sách sách. Vui lòng thử lại.");
      setBooks([]);
      setPagination(null);
    } finally {
      setIsLoadingBooks(false);
    }
  }, []);

  useEffect(() => {
    if (autoSelectLibraryId && libraries.length > 0 && !autoSelectedRef.current) {
      const target = libraries.find((lib) => lib._id === autoSelectLibraryId);
      if (target) {
        autoSelectedRef.current = true;
        void loadBooksForLibrary(target, 1);
      }
    }
  }, [autoSelectLibraryId, libraries, loadBooksForLibrary]);

  // Filter libraries based on search
  useEffect(() => {
    if (!searchText.trim()) {
      setFilteredLibraries(libraries);
      return;
    }

    const normalized = searchText.toLowerCase();
    const filtered = libraries.filter(
      (lib) =>
        lib.name.toLowerCase().includes(normalized) ||
        lib.code.toLowerCase().includes(normalized) ||
        (lib.address && lib.address.toLowerCase().includes(normalized))
    );
    setFilteredLibraries(filtered);
  }, [searchText, libraries]);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  const handleLibraryClick = (library: ILibrary) => {
    void loadBooksForLibrary(library, 1);
  };

  const handlePageChange = (newPage: number) => {
    if (selectedLibrary) {
      void loadBooksForLibrary(selectedLibrary, newPage);
    }
  };

  const activeLibrariesCount = useMemo(
    () => libraries.filter((lib) => lib.status === "active").length,
    [libraries]
  );

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
      `}</style>

      <div className="mx-auto w-full max-w-[1200px]">
        <Header searchText={searchText} onSearchChange={setSearchText} onSearch={handleSearch} showSearch={false} />

        {/* Hero Section */}
        <section className="px-4 py-12 sm:px-6">
          <div className="relative flex flex-col items-center justify-center gap-6 overflow-hidden rounded-2xl bg-gradient-to-r from-[#2b6cee] to-[#1e4cba] p-8 shadow-xl sm:gap-8">
            <div className="z-10 flex max-w-[700px] flex-col gap-4 text-center">
              <h1 className="animate-fade-in text-3xl font-extrabold leading-tight tracking-[-0.033em] text-white sm:text-4xl">
                Explore Our Libraries
              </h1>
              <p className="animate-fade-in text-sm font-normal leading-relaxed text-white/90 sm:text-base">
                Discover {activeLibrariesCount} partner libraries in our network. Click on any library to browse their book collection.
              </p>
            </div>

            <form
              className="z-10 flex h-12 w-full max-w-[500px] flex-col shadow-xl transition-all duration-300 sm:h-14"
              onSubmit={handleSearch}
            >
              <div className="flex h-full w-full flex-1 items-stretch rounded-xl">
                <div className="flex items-center justify-center rounded-l-xl border border-r-0 border-white/20 bg-white pl-3 text-[#616f89]">
                  <span className="material-symbols-outlined">search</span>
                </div>
                <input
                  className="form-input h-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl rounded-l-none rounded-r-none border border-l-0 border-r-0 border-white/20 bg-white px-4 pl-2 pr-2 text-sm font-normal leading-normal text-[#111318] placeholder:text-[#616f89] transition-all duration-300 focus:bg-gray-50 focus:outline-0 focus:ring-0"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Search libraries by name, code..."
                />
                <button
                  className="flex items-center justify-center rounded-r-xl border border-l-0 border-white/20 bg-white px-3 text-gray-600 hover:text-[#2b6cee] transition-colors"
                  type="submit"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* Filters */}
        <section className="px-4 py-6 sm:px-6">
          <div className="flex flex-wrap gap-3">
            {(["all", "active", "inactive"] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
                  statusFilter === status
                    ? "bg-[#2b6cee] text-white shadow-lg"
                    : "bg-white border border-gray-200 text-[#111318] hover:border-[#2b6cee] hover:text-[#2b6cee] dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
                }`}
              >
                {status === "all" ? "All Libraries" : status === "active" ? "Active" : "Inactive"}
              </button>
            ))}
          </div>
        </section>

        {/* Libraries Grid */}
        <section className="px-4 py-8 sm:px-6">
          <h2 className="pb-6 text-2xl font-extrabold leading-tight tracking-[-0.015em] text-[#111318] dark:text-white">
            {selectedLibrary ? `Books from ${selectedLibrary.name}` : "All Libraries"}
          </h2>

          {error && (
            <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
              ⚠️ {error}
            </div>
          )}

          {/* Show libraries grid if no library is selected */}
          {!selectedLibrary && (
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {isLoadingLibraries
                ? Array.from({ length: 6 }).map((_, i) => <LibrarySkeleton key={i} />)
                : filteredLibraries.length === 0
                  ? (
                    <div className="col-span-full py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <span className="material-symbols-outlined text-5xl text-gray-300 dark:text-gray-600">
                          library_books
                        </span>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Không tìm thấy thư viện nào</p>
                      </div>
                    </div>
                  )
                  : filteredLibraries.map((library) => (
                      <button
                        key={library._id}
                        type="button"
                        onClick={() => handleLibraryClick(library)}
                        className="group relative flex flex-col overflow-hidden rounded-xl bg-white shadow-md transition-all duration-300 hover:shadow-xl hover:scale-105 dark:bg-gray-800 active:scale-95"
                      >
                        <div
                          className="h-48 w-full bg-gradient-to-br from-[#2b6cee] to-[#1e4cba] flex items-center justify-center"
                          style={{
                            backgroundImage: `linear-gradient(135deg, #2b6cee 0%, #1e4cba 100%)`,
                          }}
                        >
                          <span className="material-symbols-outlined text-6xl text-white/80">
                            account_balance
                          </span>
                        </div>

                        <div className="flex flex-col gap-3 p-4">
                          <div>
                            <h3 className="line-clamp-1 text-lg font-bold text-[#111318] dark:text-white group-hover:text-[#2b6cee] transition-colors">
                              {library.name}
                            </h3>
                            <p className="text-xs font-semibold text-[#616f89] dark:text-gray-400 uppercase tracking-widest">
                              {library.code}
                            </p>
                          </div>

                          <p className="line-clamp-2 text-sm text-[#616f89] dark:text-gray-300">
                            {library.address || "Địa chỉ không xác định"}
                          </p>

                          <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                                library.status === "active"
                                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                  : "bg-gray-100 text-gray-700 dark:bg-gray-700/50 dark:text-gray-300"
                              }`}
                            >
                              {library.status === "active" ? "✓ Active" : "✗ Inactive"}
                            </span>
                            <span className="text-xs font-semibold text-[#2b6cee] dark:text-blue-400">
                              View Books →
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
            </div>
          )}

          {/* Show books grid if a library is selected */}
          {selectedLibrary && (
            <div ref={booksContainerRef} className="space-y-6">
              {/* Selected Library Info */}
              <div className="rounded-xl bg-white p-6 shadow-md dark:bg-gray-800">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-[#111318] dark:text-white">
                      {selectedLibrary.name}
                    </h3>
                    <p className="mt-1 text-sm text-[#616f89] dark:text-gray-400">
                      {selectedLibrary.code}
                    </p>
                    <p className="mt-2 text-sm text-[#616f89] dark:text-gray-300">
                      📍 {selectedLibrary.address}
                    </p>
                    {selectedLibrary.phone && (
                      <p className="mt-1 text-sm text-[#616f89] dark:text-gray-300">
                        📱 {selectedLibrary.phone}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedLibrary(null);
                      setBooks([]);
                      setPagination(null);
                    }}
                    className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-[#111318] transition-all duration-300 hover:bg-gray-50 hover:border-[#2b6cee] hover:text-[#2b6cee] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                  >
                    ← Back to Libraries
                  </button>
                </div>
              </div>

              {/* Books Grid */}
              <div className="grid gap-6 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {isLoadingBooks
                  ? Array.from({ length: 12 }).map((_, i) => <BookSkeleton key={i} />)
                  : books.length === 0
                    ? (
                      <div className="col-span-full py-12 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <span className="material-symbols-outlined text-5xl text-gray-300 dark:text-gray-600">
                            library_books
                          </span>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Thư viện này chưa có sách</p>
                        </div>
                      </div>
                    )
                    : books.map((book) => (
                        <Link
                          key={book._id}
                          href={`/books/${book._id}`}
                          className="group flex flex-col gap-2 rounded-lg transition-all duration-300 hover:scale-105"
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
                              className="line-clamp-2 text-xs font-bold leading-tight text-[#111318] dark:text-white"
                              title={book.title}
                            >
                              {book.title}
                            </p>
                            <p className="truncate text-xs font-medium leading-normal text-[#616f89] dark:text-gray-400">
                              {book.author}
                            </p>
                            <div className="mt-2 flex items-center justify-between gap-1">
                              <span
                                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
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

              {/* Pagination */}
              {pagination && pagination.pages > 1 && (
                <div className="flex items-center justify-center gap-2 py-6">
                  <button
                    type="button"
                    disabled={currentPage === 1 || isLoadingBooks}
                    onClick={() => handlePageChange(currentPage - 1)}
                    className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-[#111318] transition-all duration-300 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                  >
                    ← Previous
                  </button>

                  <div className="flex items-center gap-2">
                    {Array.from({ length: pagination.pages }).map((_, i) => {
                      const pageNum = i + 1;
                      return (
                        <button
                          key={pageNum}
                          type="button"
                          disabled={isLoadingBooks}
                          onClick={() => handlePageChange(pageNum)}
                          className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                            currentPage === pageNum
                              ? "bg-[#2b6cee] text-white"
                              : "border border-gray-200 bg-white text-[#111318] hover:border-[#2b6cee] hover:text-[#2b6cee] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    disabled={currentPage === pagination.pages || isLoadingBooks}
                    onClick={() => handlePageChange(currentPage + 1)}
                    className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-[#111318] transition-all duration-300 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                  >
                    Next →
                  </button>
                </div>
              )}

              {/* Library Reviews */}
              <LibraryReviewSection library={selectedLibrary} />
            </div>
          )}
        </section>

        <Footer />
      </div>
    </div>
  );
}
