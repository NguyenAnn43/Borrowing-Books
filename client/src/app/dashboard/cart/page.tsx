"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Trash2, BookOpen, Loader2, ArrowRight } from "lucide-react";
import { useCartStore } from "@/stores/cartStore";
import { borrowingService } from "@/services/borrowingService";
import { RouteGuard } from "@/components/RouteGuard";

const FALLBACK_COVER =
    "https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=900&auto=format&fit=crop";

export default function CartPage() {
    const router = useRouter();
    const { items, removeFromCart, clearCart } = useCartStore();
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Group items by Library because books might belong to different libraries
    const itemsByLibrary = items.reduce((acc, item) => {
        const libraryId = item.book.libraryId?._id || item.book.libraryId?.toString();
        const libraryName = item.book.libraryId?.name || "Thư viện không xác định";
        
        if (!libraryId) return acc;
        
        if (!acc[libraryId]) {
            acc[libraryId] = {
                libraryId,
                libraryName,
                items: [],
            };
        }
        acc[libraryId]!.items.push(item);
        return acc;
    }, {} as Record<string, { libraryId: string; libraryName: string; items: typeof items }>);

    const handleCheckout = async (libraryId: string, bookIds: string[]) => {
        setSubmitting(true);
        setError(null);
        
        try {
            await borrowingService.createBulkBorrowing({
                bookIds,
                libraryId,
            });
            
            // Remove the checked out items from cart
            bookIds.forEach((id) => removeFromCart(id));
            
            // Show success message or redirect
            alert("Tạo yêu cầu mượn sách thành công! Vui lòng chờ thư viện xác nhận.");
            if (items.length === bookIds.length) {
                // If cart is now empty, go to borrowings page
                router.push("/dashboard/borrowings");
            }
        } catch (err: any) {
            console.error("Bulk borrowing error:", err.response?.data || err);
            const errorMsg = err.response?.data?.error?.message 
                             || err.response?.data?.message 
                             || (err instanceof Error ? err.message : "Đã có lỗi xảy ra. Không thể tạo yêu cầu mượn sách.");
            setError(errorMsg);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <RouteGuard>
            <div className="p-8 max-w-5xl mx-auto">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Giỏ sách của bạn</h1>
                        <p className="text-slate-400 mt-1 text-sm">
                            Xem lại các sách đã chọn và gửi yêu cầu mượn
                        </p>
                    </div>
                    {items.length > 0 && (
                        <button
                            type="button"
                            onClick={clearCart}
                            className="text-sm font-medium text-red-400 hover:text-red-300 transition-colors bg-red-500/10 px-4 py-2 rounded-xl"
                        >
                            Xóa toàn bộ
                        </button>
                    )}
                </div>

                {error && (
                    <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                        {error}
                    </div>
                )}

                {items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-white/10 bg-slate-900/60">
                        <div className="h-20 w-20 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                            <BookOpen className="h-10 w-10 text-slate-500" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Giỏ sách trống</h3>
                        <p className="text-slate-400 mb-6 max-w-sm">
                            Bạn chưa chọn cuốn sách nào. Hãy khám phá thư viện và thêm sách vào giỏ để mượn nhé.
                        </p>
                        <button
                            onClick={() => router.push("/dashboard/books")}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-medium transition-colors"
                        >
                            Khám phá sách ngay
                        </button>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {Object.values(itemsByLibrary).map((group) => (
                            <div key={group.libraryId} className="rounded-2xl border border-white/10 bg-slate-900/60 overflow-hidden">
                                <div className="bg-slate-800/80 px-6 py-4 flex items-center justify-between border-b border-white/5">
                                    <h3 className="font-bold text-white flex items-center gap-2">
                                        <span className="material-symbols-outlined text-blue-400 text-xl">library_books</span>
                                        {group.libraryName}
                                    </h3>
                                    <span className="text-sm text-slate-400">{group.items.length} cuốn sách</span>
                                </div>
                                
                                <div className="divide-y divide-white/5 px-6">
                                    {group.items.map((item) => (
                                        <div key={item.book._id} className="py-4 flex gap-4">
                                            <div
                                                className="w-16 h-24 rounded-lg bg-slate-800 bg-cover bg-center flex-shrink-0 border border-white/10"
                                                style={{ backgroundImage: `url(${item.book.coverImage || FALLBACK_COVER})` }}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-white font-medium text-lg truncate">{item.book.title}</h4>
                                                <p className="text-slate-400 text-sm mt-1 truncate">{item.book.author}</p>
                                                <div className="mt-2 text-xs text-slate-500">
                                                    Thể loại: <span className="text-slate-300">{item.book.category || "Khác"}</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end justify-between ml-4">
                                                <button
                                                    onClick={() => removeFromCart(item.book._id)}
                                                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                    title="Xóa khỏi giỏ"
                                                >
                                                    <Trash2 className="h-5 w-5" />
                                                </button>
                                                <div className="text-xs">
                                                    {item.book.availableCopies > 0 ? (
                                                        <span className="text-emerald-400 flex items-center gap-1">
                                                            Sẵn sàng mượn
                                                        </span>
                                                    ) : (
                                                        <span className="text-orange-400 flex items-center gap-1">
                                                            Hết sách
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                
                                <div className="bg-slate-900 px-6 py-5 border-t border-white/5 flex items-center justify-between">
                                    <p className="text-sm text-slate-400">
                                        Yêu cầu mượn sách sẽ được gửi đến <span className="text-white font-medium">{group.libraryName}</span>
                                    </p>
                                    <button
                                        onClick={() => handleCheckout(group.libraryId, group.items.map(i => i.book._id))}
                                        disabled={submitting || group.items.some(i => i.book.availableCopies <= 0)}
                                        className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2"
                                    >
                                        {submitting ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Đang xử lý...
                                            </>
                                        ) : (
                                            <>
                                                Gửi yêu cầu mượn
                                                <ArrowRight className="h-4 w-4" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        ))}
                        
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-start gap-3 mt-8">
                            <span className="material-symbols-outlined text-blue-400 mt-0.5">info</span>
                            <div className="text-sm text-blue-200">
                                <p className="font-medium mb-1">Quy định mượn sách:</p>
                                <ul className="list-disc list-inside space-y-1 text-blue-200/80">
                                    <li>Mỗi yêu cầu mượn bắt buộc phải thuộc cùng một thư viện.</li>
                                    <li>Thời gian mượn mặc định thường là 14 ngày.</li>
                                    <li>Bạn không thể mượn sách nếu đã đạt giới hạn mượn của tài khoản.</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </RouteGuard>
    );
}
