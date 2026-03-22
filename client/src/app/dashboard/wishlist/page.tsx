"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, BookHeart, Heart, Loader2, Trash2 } from "lucide-react";
import { RouteGuard } from "@/components/RouteGuard";
import { wishlistService } from "@/services/wishlistService";
import type { IWishlistItem } from "@/types";

export default function WishlistPage() {
    const [items, setItems] = useState<IWishlistItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [removingBookId, setRemovingBookId] = useState<string | null>(null);

    useEffect(() => {
        const fetchWishlist = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await wishlistService.getMyWishlist({ page: 1, limit: 50 });
                setItems(response.items);
            } catch {
                setError("Khong tai duoc danh sach yeu thich");
            } finally {
                setLoading(false);
            }
        };

        fetchWishlist();
    }, []);

    const handleRemove = async (bookId: string) => {
        const snapshot = items;
        setItems((prev) => prev.filter((item) => item.bookId !== bookId));
        setRemovingBookId(bookId);

        try {
            await wishlistService.removeFromWishlist(bookId);
        } catch {
            setItems(snapshot);
            setError("Khong xoa duoc khoi wishlist. Vui long thu lai.");
        } finally {
            setRemovingBookId(null);
        }
    };

    const formatSavedDate = (dateString: string) => {
        const date = new Date(dateString);
        if (Number.isNaN(date.getTime())) {
            return "Khong ro";
        }

        return new Intl.DateTimeFormat("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        }).format(date);
    };

    return (
        <RouteGuard allowedRoles={["user", "admin", "librarian"]}>
            <div className="p-4 sm:p-6 lg:p-8">
                <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 px-6 py-7 sm:px-8">
                    <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-amber-300/20 blur-3xl" />
                    <div className="pointer-events-none absolute -left-10 -bottom-16 h-40 w-40 rounded-full bg-orange-400/20 blur-3xl" />
                    <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-200">
                                <BookHeart className="h-3.5 w-3.5" />
                                Bo suu tap yeu thich
                            </div>
                            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Wishlist cua ban</h1>
                            <p className="mt-2 max-w-2xl text-sm text-slate-300">
                                Luu cac dau sach ban quan tam de theo doi nhanh va muon sach dung luc.
                            </p>
                        </div>

                        <div className="inline-flex w-fit items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
                            <div className="rounded-xl bg-white/10 p-2.5">
                                <Heart className="h-4 w-4 text-rose-300" />
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-wide text-slate-400">Tong sach da luu</p>
                                <p className="text-xl font-semibold text-white">{items.length}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {[1, 2, 3, 4, 5, 6].map((skeleton) => (
                            <div
                                key={skeleton}
                                className="rounded-2xl border border-white/10 bg-slate-900/70 p-5"
                            >
                                <div className="h-4 w-2/3 animate-pulse rounded bg-slate-700/60" />
                                <div className="mt-3 h-3 w-1/2 animate-pulse rounded bg-slate-700/40" />
                                <div className="mt-5 h-3 w-1/3 animate-pulse rounded bg-slate-700/40" />
                                <div className="mt-6 h-9 w-full animate-pulse rounded-xl bg-slate-700/30" />
                            </div>
                        ))}
                        <div className="col-span-full mt-2 flex items-center justify-center gap-2 text-sm text-slate-400">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Dang tai danh sach yeu thich...
                        </div>
                    </div>
                ) : items.length === 0 ? (
                    <div className="mt-6 rounded-3xl border border-white/10 bg-slate-900/60 p-8 text-center">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5">
                            <BookHeart className="h-6 w-6 text-amber-300" />
                        </div>
                        <h2 className="text-lg font-semibold text-white">Wishlist dang trong</h2>
                        <p className="mx-auto mt-2 max-w-xl text-sm text-slate-400">
                            Ban chua them sach nao. Kham pha thu vien va danh dau nhung cuon sach ban muon doc tiep theo.
                        </p>
                        <Link
                            href="/dashboard/books"
                            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-amber-300"
                        >
                            Xem danh sach sach
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                ) : (
                    <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {items.map((item) => (
                            <div
                                key={item._id}
                                className="group rounded-2xl border border-white/10 bg-slate-900/70 p-5 transition duration-300 hover:-translate-y-0.5 hover:border-amber-300/40 hover:bg-slate-900"
                            >
                                <Link
                                    href={`/books/${item.bookId}`}
                                    className="block rounded-xl transition group-hover:bg-white/[0.03]"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300">
                                            {item.category}
                                        </span>
                                        <span className="text-xs text-slate-500">{formatSavedDate(item.createdAt)}</span>
                                    </div>

                                    <h2 className="mt-4 line-clamp-2 text-base font-semibold text-white">{item.title}</h2>
                                    <p className="mt-1 text-sm text-slate-300">Tac gia: {item.author}</p>

                                    <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                                        <Heart className="h-3.5 w-3.5 text-rose-300" />
                                        {item.wishlistCount} luot yeu thich
                                    </div>

                                    <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-amber-300 transition group-hover:translate-x-0.5">
                                        Xem chi tiet sach
                                        <ArrowRight className="h-3.5 w-3.5" />
                                    </div>
                                </Link>

                                <button
                                    type="button"
                                    onClick={() => handleRemove(item.bookId)}
                                    disabled={removingBookId === item.bookId}
                                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-rose-400/30 px-3 py-2 text-sm font-medium text-rose-200 transition-colors hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                    {removingBookId === item.bookId ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Dang xu ly...
                                        </>
                                    ) : (
                                        <>
                                            <Trash2 className="h-4 w-4" />
                                            Bo khoi wishlist
                                        </>
                                    )}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </RouteGuard>
    );
}
