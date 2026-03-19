"use client";

import { useEffect, useState } from "react";
import { BookOpen, Heart, Loader2, ShoppingCart } from "lucide-react";
import { RouteGuard } from "@/components/RouteGuard";
import { useAuthStore } from "@/stores/authStore";
import { useCartStore } from "@/stores/cartStore";
import { bookService } from "@/services/bookService";
import { wishlistService } from "@/services/wishlistService";
import type { IBook } from "@/types";

export default function DashboardBooksPage() {
    const { user } = useAuthStore();
    const cartStore = useCartStore();
    const [books, setBooks] = useState<IBook[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [processingBookId, setProcessingBookId] = useState<string | null>(null);

    useEffect(() => {
        const fetchBooks = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await bookService.getBooks({
                    page: 1,
                    limit: 50,
                    includeWishlist: true,
                });
                setBooks(response.books);
            } catch (err) {
                const message = err instanceof Error ? err.message : "Khong tai duoc danh sach sach";
                setError(message);
            } finally {
                setLoading(false);
            }
        };

        fetchBooks();
    }, []);

    const toggleWishlist = async (book: IBook) => {
        if (!user || user.role === "guest") {
            setError("Ban can dang nhap de su dung wishlist");
            return;
        }

        setProcessingBookId(book._id);
        setError(null);

        const nextWishlisted = !book.isWishlisted;
        const previousCount = book.wishlistCount ?? 0;
        const nextCount = Math.max(0, previousCount + (nextWishlisted ? 1 : -1));

        setBooks((prev) =>
            prev.map((item) =>
                item._id === book._id
                    ? {
                          ...item,
                          isWishlisted: nextWishlisted,
                          wishlistCount: nextCount,
                      }
                    : item
            )
        );

        try {
            if (nextWishlisted) {
                const result = await wishlistService.addToWishlist(book._id);
                setBooks((prev) =>
                    prev.map((item) =>
                        item._id === book._id
                            ? {
                                  ...item,
                                  isWishlisted: result.isWishlisted,
                                  wishlistCount: result.wishlistCount,
                              }
                            : item
                    )
                );
            } else {
                const result = await wishlistService.removeFromWishlist(book._id);
                setBooks((prev) =>
                    prev.map((item) =>
                        item._id === book._id
                            ? {
                                  ...item,
                                  isWishlisted: result.isWishlisted,
                                  wishlistCount: result.wishlistCount,
                              }
                            : item
                    )
                );
            }
        } catch {
            setBooks((prev) =>
                prev.map((item) =>
                    item._id === book._id
                        ? {
                              ...item,
                              isWishlisted: book.isWishlisted,
                              wishlistCount: previousCount,
                          }
                        : item
                )
            );
            setError("Khong cap nhat duoc wishlist. Vui long thu lai.");
        } finally {
            setProcessingBookId(null);
        }
    };

    return (
        <RouteGuard>
            <div className="p-8">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-white">Danh sach sach</h1>
                    <p className="text-slate-400 mt-1 text-sm">Kham pha sach va quan ly danh sach yeu thich</p>
                </div>

                {error && (
                    <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="flex items-center gap-2 text-slate-300">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Dang tai du lieu...
                    </div>
                ) : books.length === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 text-slate-400">
                        Chua co sach trong he thong.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                        {books.map((book) => {
                            const isProcessing = processingBookId === book._id;
                            const wishlisted = Boolean(book.isWishlisted);

                            return (
                                <article key={book._id} className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <h2 className="text-white font-semibold leading-snug">{book.title}</h2>
                                            <p className="text-slate-400 text-sm mt-1">{book.author}</p>
                                            <p className="text-slate-500 text-xs mt-2">The loai: {book.category}</p>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <button
                                                type="button"
                                                onClick={() => toggleWishlist(book)}
                                                disabled={isProcessing}
                                                className={`inline-flex items-center justify-center w-10 h-10 rounded-xl border transition-all ${
                                                    wishlisted
                                                        ? "bg-rose-500/20 border-rose-400/40 text-rose-300"
                                                        : "bg-white/5 border-white/10 text-slate-300 hover:text-rose-300 hover:border-rose-400/30"
                                                } ${isProcessing ? "opacity-60 cursor-not-allowed" : ""}`}
                                                aria-label={wishlisted ? "Bo yeu thich" : "Them yeu thich"}
                                            >
                                                {isProcessing ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Heart className={`h-4 w-4 ${wishlisted ? "fill-current" : ""}`} />
                                                )}
                                            </button>
                                            
                                            {user?.role === "user" && (
                                                <button
                                                    type="button"
                                                    onClick={() => cartStore.isInCart(book._id) ? cartStore.removeFromCart(book._id) : cartStore.addToCart(book)}
                                                    className={`inline-flex items-center justify-center w-10 h-10 rounded-xl border transition-all ${
                                                        cartStore.isInCart(book._id)
                                                            ? "bg-blue-500/20 border-blue-400/40 text-blue-300"
                                                            : "bg-white/5 border-white/10 text-slate-300 hover:text-blue-300 hover:border-blue-400/30"
                                                    }`}
                                                    aria-label={cartStore.isInCart(book._id) ? "Xóa khỏi giỏ sách" : "Thêm vào giỏ sách"}
                                                    title={cartStore.isInCart(book._id) ? "Xóa khỏi giỏ sách" : "Thêm vào giỏ sách"}
                                                >
                                                    <ShoppingCart className={`h-4 w-4 ${cartStore.isInCart(book._id) ? "fill-current" : ""}`} />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                                        <span className="inline-flex items-center gap-1">
                                            <BookOpen className="h-3.5 w-3.5" />
                                            Con lai: {book.availableCopies}/{book.totalCopies}
                                        </span>
                                        <span>{book.wishlistCount ?? 0} luot yeu thich</span>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </div>
        </RouteGuard>
    );
}
