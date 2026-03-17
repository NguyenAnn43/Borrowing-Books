"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, RefreshCw, Search } from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@/components/ui";
import { bookService } from "@/services/bookService";
import type { IBook, IPagination } from "@/types";
import { cn, truncate } from "@/lib/utils";
import { useRouter } from "next/navigation";
interface BooksState {
    items: IBook[];
    pagination: IPagination | null;
}

const DEFAULT_LIMIT = 12;
const SEARCH_DELAY_MS = 350;

export default function BooksPage() {
    const router = useRouter();
    const [query, setQuery] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [booksState, setBooksState] = useState<BooksState>({
        items: [],
        pagination: null,
    });

    const fetchBooks = async (searchText: string) => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await bookService.getBooks({
                q: searchText || undefined,
                page: 1,
                limit: DEFAULT_LIMIT,
            });
            setBooksState({ items: response.books, pagination: response.pagination });
        } catch (fetchError) {
            setError("Failed to load books. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const handler = window.setTimeout(() => {
            void fetchBooks(query.trim());
        }, SEARCH_DELAY_MS);

        return () => window.clearTimeout(handler);
    }, [query]);

    const headerStats = useMemo(() => {
        if (!booksState.pagination) return null;
        return `${booksState.pagination.total} books`;
    }, [booksState.pagination]);

    const handleViewDetail = (book: IBook) => {
    router.push(`/books/${book._id}`);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.15),_transparent_55%)]" />
            <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-12 sm:px-6 lg:px-8">
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="text-sm uppercase tracking-[0.3em] text-blue-200/80">Library catalog</p>
                            <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">
                                Browse available books
                            </h1>
                            <p className="mt-2 max-w-xl text-sm text-blue-100/70">
                                Search by title, author, or tags to discover what is ready to borrow.
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            {headerStats && (
                                <span className="rounded-full border border-white/10 bg-white/5 px-4 py-1 text-sm text-blue-100">
                                    {headerStats}
                                </span>
                            )}
                            <Button
                                variant="ghost"
                                className="text-white hover:bg-white/10"
                                onClick={() => void fetchBooks(query.trim())}
                                disabled={isLoading}
                            >
                                <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
                                Refresh
                            </Button>
                        </div>
                    </div>

                    <Card variant="glass" className="border-white/10 bg-white/5">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-white">Search books</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                                <Input
                                    value={query}
                                    onChange={(event) => setQuery(event.target.value)}
                                    placeholder="Type a title, author, or tag"
                                    leftIcon={<Search className="h-4 w-4" />}
                                    className="bg-white text-gray-900"
                                />
                                <Button
                                    variant="outline"
                                    className="border-white/30 text-white hover:bg-white/10"
                                    onClick={() => setQuery("")}
                                    disabled={!query}
                                >
                                    Clear
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {error && (
                        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                            {error}
                        </div>
                    )}

                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {booksState.items.map((book) => (
                            <Card key={book._id} variant="glass" className="border-white/10 bg-white/5">
                                <CardHeader className="gap-4">
                                    <div className="flex items-start gap-4">
                                        <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-blue-500/20">
                                            {book.coverImage ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={book.coverImage}
                                                    alt={book.title}
                                                    className="h-full w-full rounded-xl object-cover"
                                                />
                                            ) : (
                                                <BookOpen className="h-6 w-6 text-blue-200" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <CardTitle className="text-white">{book.title}</CardTitle>
                                            <p className="mt-1 text-sm text-blue-100/70">by {book.author}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2 text-xs text-blue-100/70">
                                        <span className="rounded-full bg-white/10 px-3 py-1">{book.category}</span>
                                        <span className="rounded-full bg-white/10 px-3 py-1">
                                            {book.availableCopies}/{book.totalCopies} available
                                        </span>
                                        <span
                                            className={cn(
                                                "rounded-full px-3 py-1",
                                                book.status === "available"
                                                    ? "bg-emerald-400/20 text-emerald-100"
                                                    : "bg-amber-400/20 text-amber-100"
                                            )}
                                        >
                                            {book.status}
                                        </span>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3 text-sm text-blue-100/70">
                                    {book.description && <p>{truncate(book.description, 120)}</p>}
                                    <div className="flex items-center gap-2 text-xs text-blue-100/60">
                                        <span className="rounded-full bg-white/10 px-3 py-1">
                                            {book.language.toUpperCase()}
                                        </span>
                                        {book.pageCount && (
                                            <span className="rounded-full bg-white/10 px-3 py-1">
                                                {book.pageCount} pages
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-xs text-blue-100/60">
                                        <span className="font-semibold text-blue-100">Library:</span>{" "}
                                        {book.libraryId?.name || "Unknown"}
                                    </div>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleViewDetail(book)}
                                    >
                                        Xem chi tiết
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {!isLoading && booksState.items.length === 0 && !error && (
                        <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-12 text-center">
                            <p className="text-lg text-white">No books found</p>
                            <p className="mt-2 text-sm text-blue-100/70">
                                Try a different keyword or clear the search to see all books.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
