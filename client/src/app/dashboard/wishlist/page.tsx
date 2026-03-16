"use client";

import { useEffect, useState } from "react";
import { Heart, Loader2 } from "lucide-react";
import { RouteGuard } from "@/components/RouteGuard";
import { wishlistService } from "@/services/wishlistService";
import type { IWishlistItem } from "@/types";

export default function WishlistPage() {
    const [items, setItems] = useState<IWishlistItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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

        try {
            await wishlistService.removeFromWishlist(bookId);
        } catch {
            setItems(snapshot);
            setError("Khong xoa duoc khoi wishlist. Vui long thu lai.");
        }
    };

    return (
        <RouteGuard allowedRoles={["user", "admin", "librarian"]}>
            <div className="p-8">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-white">My Wishlist</h1>
                    <p className="text-slate-400 mt-1 text-sm">Danh sach sach ban da danh dau yeu thich</p>
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
                ) : items.length === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 text-slate-400">
                        Ban chua co sach nao trong wishlist.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {items.map((item) => (
                            <div
                                key={item._id}
                                className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 flex items-center justify-between gap-4"
                            >
                                <div>
                                    <h2 className="text-white font-medium">{item.title}</h2>
                                    <p className="text-slate-400 text-sm mt-1">{item.author}</p>
                                    <p className="text-slate-500 text-xs mt-1">The loai: {item.category}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleRemove(item.bookId)}
                                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-rose-400/30 text-rose-300 hover:bg-rose-500/10 transition-colors text-sm"
                                >
                                    <Heart className="h-4 w-4 fill-current" />
                                    Bo yeu thich
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </RouteGuard>
    );
}
