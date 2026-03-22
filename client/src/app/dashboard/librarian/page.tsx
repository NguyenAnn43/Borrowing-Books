"use client";

import { useEffect, useMemo, useState } from "react";
import { BookCopy, CheckCircle2, BookOpen, Clock, Loader2, Flag, RefreshCw } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { RouteGuard } from "@/components/RouteGuard";
import { borrowingService } from "@/services/borrowingService";
import { reservationService } from "@/services/reservationService";
import { bookService } from "@/services/bookService";
import { reviewService } from "@/services/reviewService";

type LibrarianStats = {
    pendingBorrowings: number;
    activeBorrowings: number;
    returnTransit: number;
    pendingReservations: number;
    managedBooks: number;
    reviewsNeedFollow: number;
};

const initialStats: LibrarianStats = {
    pendingBorrowings: 0,
    activeBorrowings: 0,
    returnTransit: 0,
    pendingReservations: 0,
    managedBooks: 0,
    reviewsNeedFollow: 0,
};

export default function LibrarianDashboard() {
    const { user } = useAuthStore();
    const [stats, setStats] = useState<LibrarianStats>(initialStats);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchStats = async () => {
        setLoading(true);
        setError(null);
        try {
            const [pendingBorrowings, borrowed, overdue, returnTransit, pendingReservations, books, reviewDashboard] = await Promise.all([
                borrowingService.getBorrowings({ page: 1, limit: 1, status: "pending" }),
                borrowingService.getBorrowings({ page: 1, limit: 1, status: "borrowed" }),
                borrowingService.getBorrowings({ page: 1, limit: 1, status: "overdue" }),
                borrowingService.getBorrowings({ page: 1, limit: 1, status: "return_transit" }),
                reservationService.getReservations({ page: 1, limit: 1, status: "pending" }),
                bookService.getBooks({ page: 1, limit: 1, libraryId: user?.libraryId?._id }),
                reviewService.getLibrarianReviewDashboard(12),
            ]);

            setStats({
                pendingBorrowings: pendingBorrowings.pagination.total,
                activeBorrowings: borrowed.pagination.total + overdue.pagination.total,
                returnTransit: returnTransit.pagination.total,
                pendingReservations: pendingReservations.pagination.total,
                managedBooks: books.pagination.total,
                reviewsNeedFollow: reviewDashboard.lowStar.length,
            });
        } catch {
            setError("Khong tai duoc so lieu dashboard thu thu.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void fetchStats();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.libraryId?._id]);

    const cards = useMemo(
        () => [
            { label: "Yeu cau cho duyet", value: stats.pendingBorrowings, icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
            { label: "Dang cho muon", value: stats.activeBorrowings, icon: BookCopy, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
            { label: "Cho nhan ve kho", value: stats.returnTransit, icon: CheckCircle2, color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/20" },
            { label: "Dat truoc cho xu ly", value: stats.pendingReservations, icon: Clock, color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/20" },
            { label: "Tong dau sach quan ly", value: stats.managedBooks, icon: BookOpen, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
            { label: "Review can theo doi", value: stats.reviewsNeedFollow, icon: Flag, color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/20" },
        ],
        [stats]
    );

    return (
        <RouteGuard allowedRoles={["librarian"]}>
            <div className="p-8">
                <div className="mb-8 flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-white">
                            Xin chao, <span className="text-blue-400">{user?.fullName}</span>
                        </h1>
                        <p className="text-slate-400 mt-1 text-sm">
                            Bang dieu khien thu thu
                            {user?.libraryId?.name ? ` · ${user.libraryId.name}` : ""}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => void fetchStats()}
                        className="inline-flex items-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-xs font-semibold text-indigo-200 hover:bg-indigo-500/20"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                        Lam moi
                    </button>
                </div>

                {error && (
                    <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="mb-6 flex items-center gap-2 text-slate-300 text-sm">
                        <Loader2 className="h-4 w-4 animate-spin" /> Dang tai so lieu...
                    </div>
                ) : null}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
                    {cards.map((card) => {
                        const Icon = card.icon;
                        return (
                            <div
                                key={card.label}
                                className={`flex items-center gap-4 rounded-2xl border bg-slate-900/60 p-5 ${card.bg}`}
                            >
                                <div className="rounded-xl bg-slate-800/60 p-3">
                                    <Icon className={`h-5 w-5 ${card.color}`} />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-white">{card.value}</p>
                                    <p className="text-slate-400 text-xs mt-0.5">{card.label}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-6">
                    <h2 className="text-white font-semibold mb-4">Thao tac nhanh</h2>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {[
                            { label: "Quan ly muon/tra", icon: BookCopy, href: "/dashboard/borrowings" },
                            { label: "Quan ly dat truoc", icon: Clock, href: "/dashboard/reservations" },
                            { label: "Quan ly sach", icon: BookOpen, href: "/dashboard/books" },
                            { label: "Quan ly review", icon: Flag, href: "/dashboard/reviews" },
                        ].map((action) => {
                            const Icon = action.icon;
                            return (
                                <a
                                    key={action.label}
                                    href={action.href}
                                    className="flex flex-col items-center gap-2 rounded-xl border border-blue-500/20 bg-blue-600/10 p-4 text-center text-xs font-medium text-blue-300 transition-all hover:border-blue-500/40 hover:bg-blue-600/20 hover:text-blue-200"
                                >
                                    <Icon className="h-5 w-5" />
                                    {action.label}
                                </a>
                            );
                        })}
                    </div>
                </div>
            </div>
        </RouteGuard>
    );
}
