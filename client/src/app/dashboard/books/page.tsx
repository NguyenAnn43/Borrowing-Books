"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import {
    BookOpen,
    Boxes,
    Heart,
    ImageIcon,
    Library,
    Loader2,
    PackageCheck,
    Pencil,
    Plus,
    Search,
    ShoppingCart,
    Trash2,
    X,
} from "lucide-react";
import { RouteGuard } from "@/components/RouteGuard";
import { useAuthStore } from "@/stores/authStore";
import { useCartStore } from "@/stores/cartStore";
import { bookService, type BookMutationPayload } from "@/services/bookService";
import { wishlistService } from "@/services/wishlistService";
import type { IBook } from "@/types";

type BookFormState = {
    isbn: string;
    title: string;
    author: string;
    publisher: string;
    publishYear: string;
    category: string;
    description: string;
    coverImage: string;
    language: string;
    pageCount: string;
    tags: string;
    location: string;
    totalCopies: string;
    availableCopies: string;
};

const COVER_POOL = [
    "https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=900&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?q=80&w=900&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1474932430478-367dbb6832c1?q=80&w=900&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?q=80&w=900&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?q=80&w=900&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1516979187457-637abb4f9353?q=80&w=900&auto=format&fit=crop",
];

const emptyBookForm = (): BookFormState => ({
    isbn: "",
    title: "",
    author: "",
    publisher: "",
    publishYear: "",
    category: "",
    description: "",
    coverImage: "",
    language: "vi",
    pageCount: "",
    tags: "",
    location: "",
    totalCopies: "1",
    availableCopies: "1",
});

const getApiErrorMessage = (err: unknown, fallback: string): string => {
    if (!err || typeof err !== "object") return fallback;
    const data = err as {
        message?: string;
        response?: { data?: { error?: { message?: string }; message?: string } };
    };

    return data.response?.data?.error?.message
        || data.response?.data?.message
        || data.message
        || fallback;
};

const normalize = (value?: string): string => (value ?? "").trim().toLowerCase();

const pickCoverBySeed = (seed: string): string => {
    if (!seed) return COVER_POOL[0];
    let hash = 0;
    for (let i = 0; i < seed.length; i += 1) {
        hash = (hash << 5) - hash + seed.charCodeAt(i);
        hash |= 0;
    }
    return COVER_POOL[Math.abs(hash) % COVER_POOL.length];
};

const getAvailabilityLabel = (book: IBook): { label: string; className: string } => {
    if (book.availableCopies <= 0) {
        return {
            label: "Tam het",
            className: "border-amber-500/30 bg-amber-500/10 text-amber-200",
        };
    }

    const stockRatio = book.totalCopies > 0 ? book.availableCopies / book.totalCopies : 0;
    if (stockRatio <= 0.25) {
        return {
            label: "Sap het",
            className: "border-orange-500/30 bg-orange-500/10 text-orange-200",
        };
    }

    return {
        label: "Co san",
        className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
    };
};

type StatCardProps = {
    title: string;
    value: string;
    hint: string;
    icon: LucideIcon;
};

function StatCard({ title, value, hint, icon: Icon }: StatCardProps) {
    return (
        <article className="rounded-2xl border border-white/10 bg-slate-900/65 p-4">
            <div className="mb-3 flex items-center justify-between">
                <span className="text-xs uppercase tracking-wide text-slate-400">{title}</span>
                <Icon className="h-4 w-4 text-blue-300" />
            </div>
            <p className="text-2xl font-semibold text-white">{value}</p>
            <p className="mt-1 text-xs text-slate-400">{hint}</p>
        </article>
    );
}

export default function DashboardBooksPage() {
    const { user } = useAuthStore();
    const cartStore = useCartStore();
    const isLibrarian = user?.role === "librarian";
    const canUseWishlist = user?.role === "user" || user?.role === "admin" || user?.role === "librarian";
    const canBorrow = user?.role === "user";
    const pageSize = isLibrarian ? 9 : 8;

    const [books, setBooks] = useState<IBook[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [processingBookId, setProcessingBookId] = useState<string | null>(null);
    const [brokenCoverByBookId, setBrokenCoverByBookId] = useState<Record<string, boolean>>({});

    const [query, setQuery] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [availabilityFilter, setAvailabilityFilter] = useState<"all" | "available" | "unavailable">("all");
    const [currentPage, setCurrentPage] = useState(1);

    const [isBookModalOpen, setIsBookModalOpen] = useState(false);
    const [editingBookId, setEditingBookId] = useState<string | null>(null);
    const [bookForm, setBookForm] = useState<BookFormState>(emptyBookForm);
    const [formError, setFormError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);

    const fetchBooks = async () => {
        setLoading(true);
        setError(null);

        if (isLibrarian && !user?.libraryId?._id) {
            setBooks([]);
            setLoading(false);
            setError("Tai khoan thu thu chua duoc gan thu vien. Vui long lien he admin.");
            return;
        }

        try {
            const response = await bookService.getBooks({
                page: 1,
                limit: 200,
                includeWishlist: !isLibrarian,
                libraryId: isLibrarian ? user?.libraryId?._id : undefined,
            });
            setBooks(response.books);
        } catch (fetchError) {
            const message = getApiErrorMessage(fetchError, "Khong tai duoc danh sach sach.");
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void fetchBooks();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLibrarian, user?.libraryId?._id]);

    const categories = useMemo(() => {
        const source = books
            .map((book) => (book.category ?? "").trim())
            .filter(Boolean);
        return Array.from(new Set(source)).sort((a, b) => a.localeCompare(b));
    }, [books]);

    const filteredBooks = useMemo(() => {
        const keyword = normalize(query);
        return books.filter((book) => {
            if (keyword) {
                const searchable = [
                    book.title,
                    book.author,
                    book.category,
                    book.isbn || "",
                    book.location || "",
                    book.libraryId?.name || "",
                ]
                    .join(" ")
                    .toLowerCase();
                if (!searchable.includes(keyword)) return false;
            }

            if (categoryFilter !== "all" && normalize(book.category) !== normalize(categoryFilter)) {
                return false;
            }

            if (availabilityFilter === "available" && book.availableCopies <= 0) {
                return false;
            }

            if (availabilityFilter === "unavailable" && book.availableCopies > 0) {
                return false;
            }

            return true;
        });
    }, [availabilityFilter, books, categoryFilter, query]);

    useEffect(() => {
        setCurrentPage(1);
    }, [availabilityFilter, categoryFilter, query]);

    const totalPages = Math.max(1, Math.ceil(filteredBooks.length / pageSize));

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    const paginatedBooks = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredBooks.slice(start, start + pageSize);
    }, [currentPage, filteredBooks, pageSize]);

    const stats = useMemo(() => {
        const source = filteredBooks;
        const totalTitles = source.length;
        const totalCopies = source.reduce((acc, book) => acc + (book.totalCopies || 0), 0);
        const availableCopies = source.reduce((acc, book) => acc + (book.availableCopies || 0), 0);
        const outOfStock = source.filter((book) => book.availableCopies <= 0).length;

        return { totalTitles, totalCopies, availableCopies, outOfStock };
    }, [filteredBooks]);

    const pagingNumbers = useMemo(() => {
        if (totalPages <= 1) return [1];
        const maxButtons = 5;
        let start = Math.max(1, currentPage - 2);
        const end = Math.min(totalPages, start + maxButtons - 1);

        if (end - start < maxButtons - 1) {
            start = Math.max(1, end - maxButtons + 1);
        }

        const numbers: number[] = [];
        for (let page = start; page <= end; page += 1) {
            numbers.push(page);
        }
        return numbers;
    }, [currentPage, totalPages]);

    const resolveCover = (book: IBook): string => {
        if (brokenCoverByBookId[book._id]) {
            return pickCoverBySeed(book._id || `${book.title}-${book.author}`);
        }
        const raw = book.coverImage?.trim();
        if (raw) return raw;
        return pickCoverBySeed(book._id || `${book.title}-${book.author}`);
    };

    const markCoverBroken = (bookId: string) => {
        setBrokenCoverByBookId((prev) => {
            if (prev[bookId]) return prev;
            return { ...prev, [bookId]: true };
        });
    };

    const toggleWishlist = async (book: IBook) => {
        if (!canUseWishlist) {
            setError("Ban can dang nhap de su dung wishlist.");
            return;
        }

        setProcessingBookId(book._id);
        setError(null);
        setSuccess(null);

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

    const openCreateModal = () => {
        setEditingBookId(null);
        setBookForm(emptyBookForm());
        setFormError(null);
        setIsBookModalOpen(true);
    };

    const openEditModal = (book: IBook) => {
        setEditingBookId(book._id);
        setBookForm({
            isbn: book.isbn || "",
            title: book.title || "",
            author: book.author || "",
            publisher: book.publisher || "",
            publishYear: book.publishYear ? String(book.publishYear) : "",
            category: book.category || "",
            description: book.description || "",
            coverImage: book.coverImage || "",
            language: book.language || "vi",
            pageCount: book.pageCount ? String(book.pageCount) : "",
            tags: (book.tags || []).join(", "),
            location: book.location || "",
            totalCopies: String(book.totalCopies || 0),
            availableCopies: String(book.availableCopies || 0),
        });
        setFormError(null);
        setIsBookModalOpen(true);
    };

    const closeBookModal = () => {
        if (submitting) return;
        setIsBookModalOpen(false);
        setEditingBookId(null);
        setFormError(null);
    };

    const onChangeField = (field: keyof BookFormState, value: string) => {
        setBookForm((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const applySuggestedCover = () => {
        const seed = `${bookForm.title}-${bookForm.author}-${bookForm.category}`;
        onChangeField("coverImage", pickCoverBySeed(seed));
    };

    const submitBook = async () => {
        if (!isLibrarian) return;
        if (!user?.libraryId?._id) {
            setFormError("Tai khoan thu thu chua duoc gan thu vien.");
            return;
        }

        setFormError(null);
        setError(null);
        setSuccess(null);

        const title = bookForm.title.trim();
        const author = bookForm.author.trim();
        const category = bookForm.category.trim();
        const language = bookForm.language.trim() || "vi";
        const totalCopies = Number(bookForm.totalCopies);
        const availableCopies = Number(bookForm.availableCopies);

        if (!title || !author || !category) {
            setFormError("Vui long nhap day du Tieu de, Tac gia va The loai.");
            return;
        }

        if (!Number.isFinite(totalCopies) || !Number.isInteger(totalCopies) || totalCopies < 0) {
            setFormError("Tong so ban phai la so nguyen >= 0.");
            return;
        }

        if (!Number.isFinite(availableCopies) || !Number.isInteger(availableCopies) || availableCopies < 0) {
            setFormError("So ban kha dung phai la so nguyen >= 0.");
            return;
        }

        if (availableCopies > totalCopies) {
            setFormError("So ban kha dung khong duoc lon hon Tong so ban.");
            return;
        }

        const parseOptionalNumber = (value: string): number | undefined => {
            const trimmed = value.trim();
            if (!trimmed) return undefined;
            const parsed = Number(trimmed);
            if (!Number.isFinite(parsed)) return undefined;
            return parsed;
        };

        const payload: BookMutationPayload = {
            title,
            author,
            category,
            isbn: bookForm.isbn.trim() || undefined,
            publisher: bookForm.publisher.trim() || undefined,
            publishYear: parseOptionalNumber(bookForm.publishYear),
            description: bookForm.description.trim() || undefined,
            coverImage: bookForm.coverImage.trim() || undefined,
            language,
            pageCount: parseOptionalNumber(bookForm.pageCount),
            tags: bookForm.tags
                .split(",")
                .map((tag) => tag.trim())
                .filter(Boolean),
            location: bookForm.location.trim() || undefined,
            totalCopies,
            availableCopies,
            libraryId: user.libraryId._id,
        };

        setSubmitting(true);
        try {
            if (editingBookId) {
                await bookService.updateBook(editingBookId, payload);
                setSuccess("Da cap nhat sach thanh cong.");
            } else {
                await bookService.createBook(payload);
                setSuccess("Da them sach moi thanh cong.");
            }
            closeBookModal();
            await fetchBooks();
        } catch (submitError) {
            const message = getApiErrorMessage(submitError, "Khong the luu thong tin sach.");
            setFormError(message);
        } finally {
            setSubmitting(false);
        }
    };

    const deleteBook = async (bookId: string) => {
        if (!isLibrarian) return;
        if (!window.confirm("Ban chac chan muon xoa dau sach nay?")) return;

        setDeleteLoadingId(bookId);
        setError(null);
        setSuccess(null);

        try {
            await bookService.deleteBook(bookId);
            setSuccess("Da xoa sach thanh cong.");
            await fetchBooks();
        } catch (deleteError) {
            const message = getApiErrorMessage(deleteError, "Khong the xoa sach.");
            setError(message);
        } finally {
            setDeleteLoadingId(null);
        }
    };

    const pageStartIndex = filteredBooks.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const pageEndIndex = Math.min(currentPage * pageSize, filteredBooks.length);

    const previewCover = bookForm.coverImage.trim() || pickCoverBySeed(`${bookForm.title}-${bookForm.author}-${bookForm.category}`);

    return (
        <RouteGuard>
            <div className="space-y-6 p-6 lg:p-8">
                <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-6">
                    <div className="pointer-events-none absolute right-0 top-0 h-40 w-40 rounded-full bg-blue-500/20 blur-3xl" />
                    <div className="pointer-events-none absolute bottom-0 left-1/3 h-28 w-28 rounded-full bg-cyan-500/20 blur-3xl" />
                    <div className="relative space-y-6">
                        <div>
                            <h1 className="text-2xl font-bold text-white">
                                {isLibrarian ? "Quan ly sach thu vien" : "Kham pha dau sach"}
                            </h1>
                            <p className="mt-1 text-sm text-slate-300">
                                {isLibrarian
                                    ? `Quan ly danh muc sach va ton kho cho ${user?.libraryId?.name || "thu vien cua ban"}.`
                                    : "Tim sach nhanh, xem ton kho va thao tac wishlist/gio sach ngay tai day."}
                            </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            <StatCard
                                title="Dau Sach"
                                value={stats.totalTitles.toLocaleString("vi-VN")}
                                hint="Theo bo loc hien tai"
                                icon={BookOpen}
                            />
                            <StatCard
                                title="Tong Ban"
                                value={stats.totalCopies.toLocaleString("vi-VN")}
                                hint="Tong ban da nhap"
                                icon={Boxes}
                            />
                            <StatCard
                                title="Con Lai"
                                value={stats.availableCopies.toLocaleString("vi-VN")}
                                hint="Ban co san de muon"
                                icon={PackageCheck}
                            />
                            <StatCard
                                title="Tam Het"
                                value={stats.outOfStock.toLocaleString("vi-VN")}
                                hint="Can bo sung them ban"
                                icon={Library}
                            />
                        </div>
                    </div>
                </section>

                {error && (
                    <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                        {error}
                    </div>
                )}
                {success && (
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                        {success}
                    </div>
                )}

                <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                    <div className="grid gap-3 xl:grid-cols-[2fr,1fr,1fr,auto]">
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder="Tim theo tieu de, tac gia, ISBN, vi tri..."
                                className="w-full rounded-xl border border-white/10 bg-slate-950 py-2.5 pl-10 pr-3 text-sm text-slate-100 outline-none focus:border-blue-500"
                            />
                        </div>

                        <select
                            value={categoryFilter}
                            onChange={(event) => setCategoryFilter(event.target.value)}
                            className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-blue-500"
                        >
                            <option value="all">Tat ca the loai</option>
                            {categories.map((category) => (
                                <option key={category} value={category}>
                                    {category}
                                </option>
                            ))}
                        </select>

                        <select
                            value={availabilityFilter}
                            onChange={(event) =>
                                setAvailabilityFilter(event.target.value as "all" | "available" | "unavailable")
                            }
                            className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-blue-500"
                        >
                            <option value="all">Tat ca trang thai</option>
                            <option value="available">Co san</option>
                            <option value="unavailable">Tam het</option>
                        </select>

                        {isLibrarian && (
                            <button
                                type="button"
                                onClick={openCreateModal}
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/20 px-4 py-2.5 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/30"
                            >
                                <Plus className="h-4 w-4" />
                                Them sach moi
                            </button>
                        )}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                        <p>
                            Hien thi <span className="font-semibold text-slate-200">{pageStartIndex}-{pageEndIndex}</span>{" "}
                            tren <span className="font-semibold text-slate-200">{filteredBooks.length}</span> dau sach
                        </p>
                        {totalPages > 1 && (
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    disabled={currentPage <= 1}
                                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                                    className="rounded-lg border border-white/10 bg-slate-800 px-2.5 py-1 text-slate-200 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    Truoc
                                </button>
                                {pagingNumbers.map((page) => (
                                    <button
                                        key={page}
                                        type="button"
                                        onClick={() => setCurrentPage(page)}
                                        className={`rounded-lg border px-2.5 py-1 transition ${
                                            page === currentPage
                                                ? "border-blue-500/40 bg-blue-500/20 text-blue-100"
                                                : "border-white/10 bg-slate-800 text-slate-200 hover:bg-slate-700"
                                        }`}
                                    >
                                        {page}
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    disabled={currentPage >= totalPages}
                                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                                    className="rounded-lg border border-white/10 bg-slate-800 px-2.5 py-1 text-slate-200 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    Sau
                                </button>
                            </div>
                        )}
                    </div>
                </section>

                {loading ? (
                    <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-900/50 p-6 text-slate-200">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Dang tai du lieu...
                    </div>
                ) : paginatedBooks.length === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-8 text-sm text-slate-400">
                        Khong tim thay dau sach phu hop voi bo loc hien tai.
                    </div>
                ) : (
                    <section className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
                        {paginatedBooks.map((book) => {
                            const availability = getAvailabilityLabel(book);
                            const isProcessing = processingBookId === book._id;
                            const isWishlisted = Boolean(book.isWishlisted);
                            const inCart = cartStore.isInCart(book._id);
                            const coverSrc = resolveCover(book);

                            return (
                                <article
                                    key={book._id}
                                    className="group overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 transition hover:border-blue-400/30"
                                >
                                    <div className="relative aspect-[16/9] overflow-hidden border-b border-white/10 bg-slate-800">
                                        <Image
                                            src={coverSrc}
                                            alt={`bia-sach-${book.title}`}
                                            fill
                                            sizes="(max-width: 768px) 100vw, (max-width: 1536px) 50vw, 33vw"
                                            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                                            onError={() => markCoverBroken(book._id)}
                                        />
                                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent" />
                                        <div className="absolute left-3 top-3">
                                            <span className={`inline-flex rounded-md border px-2 py-1 text-[11px] font-semibold ${availability.className}`}>
                                                {availability.label}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="space-y-3 p-4">
                                        <div>
                                            <h2 className="line-clamp-2 text-base font-semibold text-white">{book.title}</h2>
                                            <p className="mt-1 text-sm text-slate-300">{book.author}</p>
                                            {book.isbn && <p className="mt-1 text-xs text-slate-500">ISBN: {book.isbn}</p>}
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div className="rounded-lg border border-white/10 bg-slate-800/70 p-2 text-slate-300">
                                                <p className="text-[11px] uppercase tracking-wide text-slate-500">Ton kho</p>
                                                <p className="mt-1 font-semibold text-slate-100">
                                                    {book.availableCopies}/{book.totalCopies}
                                                </p>
                                            </div>
                                            <div className="rounded-lg border border-white/10 bg-slate-800/70 p-2 text-slate-300">
                                                <p className="text-[11px] uppercase tracking-wide text-slate-500">The loai</p>
                                                <p className="mt-1 font-semibold text-slate-100">{book.category || "-"}</p>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                                            <span className="rounded-md border border-white/10 bg-slate-800 px-2 py-1">
                                                Vi tri: {book.location || "-"}
                                            </span>
                                            {!isLibrarian && (
                                                <span className="rounded-md border border-white/10 bg-slate-800 px-2 py-1">
                                                    Thu vien: {book.libraryId?.name || "-"}
                                                </span>
                                            )}
                                            <span className="rounded-md border border-white/10 bg-slate-800 px-2 py-1">
                                                {book.wishlistCount ?? 0} yeu thich
                                            </span>
                                        </div>

                                        {isLibrarian ? (
                                            <div className="flex items-center gap-2 pt-1">
                                                <button
                                                    type="button"
                                                    onClick={() => openEditModal(book)}
                                                    className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-blue-500/35 bg-blue-500/15 px-3 py-2 text-xs font-semibold text-blue-100 transition hover:bg-blue-500/25"
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                    Sua
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={deleteLoadingId === book._id}
                                                    onClick={() => void deleteBook(book._id)}
                                                    className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-red-500/35 bg-red-500/15 px-3 py-2 text-xs font-semibold text-red-100 transition hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-55"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                    {deleteLoadingId === book._id ? "Dang xoa..." : "Xoa"}
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 pt-1">
                                                <button
                                                    type="button"
                                                    onClick={() => void toggleWishlist(book)}
                                                    disabled={isProcessing}
                                                    className={`inline-flex flex-1 items-center justify-center gap-1 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                                                        isWishlisted
                                                            ? "border-rose-500/40 bg-rose-500/20 text-rose-100"
                                                            : "border-white/10 bg-slate-800 text-slate-100 hover:border-rose-500/35 hover:text-rose-200"
                                                    } ${isProcessing ? "cursor-not-allowed opacity-60" : ""}`}
                                                >
                                                    {isProcessing ? (
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    ) : (
                                                        <Heart className={`h-3.5 w-3.5 ${isWishlisted ? "fill-current" : ""}`} />
                                                    )}
                                                    {isWishlisted ? "Da yeu thich" : "Yeu thich"}
                                                </button>

                                                {canBorrow && (
                                                    <button
                                                        type="button"
                                                        onClick={() => (inCart ? cartStore.removeFromCart(book._id) : cartStore.addToCart(book))}
                                                        className={`inline-flex flex-1 items-center justify-center gap-1 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                                                            inCart
                                                                ? "border-blue-500/45 bg-blue-500/20 text-blue-100"
                                                                : "border-white/10 bg-slate-800 text-slate-100 hover:border-blue-500/35 hover:text-blue-200"
                                                        }`}
                                                    >
                                                        <ShoppingCart className={`h-3.5 w-3.5 ${inCart ? "fill-current" : ""}`} />
                                                        {inCart ? "Da them gio" : "Them gio"}
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </article>
                            );
                        })}
                    </section>
                )}

                {isLibrarian && isBookModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
                        <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-white/10 bg-slate-900 p-5">
                            <div className="mb-4 flex items-start justify-between gap-3">
                                <div>
                                    <h2 className="text-lg font-semibold text-white">
                                        {editingBookId ? "Cap nhat sach" : "Them sach moi"}
                                    </h2>
                                    <p className="mt-1 text-xs text-slate-400">
                                        Thu vien quan ly: {user?.libraryId?.name || "-"}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={closeBookModal}
                                    className="rounded-md p-1 text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            {formError && (
                                <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                                    {formError}
                                </div>
                            )}

                            <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
                                <section className="space-y-3">
                                    <div className="grid gap-3 md:grid-cols-2">
                                        <input
                                            value={bookForm.title}
                                            onChange={(e) => onChangeField("title", e.target.value)}
                                            placeholder="Tieu de *"
                                            className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                                        />
                                        <input
                                            value={bookForm.author}
                                            onChange={(e) => onChangeField("author", e.target.value)}
                                            placeholder="Tac gia *"
                                            className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                                        />
                                        <input
                                            value={bookForm.category}
                                            onChange={(e) => onChangeField("category", e.target.value)}
                                            placeholder="The loai *"
                                            className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                                        />
                                        <input
                                            value={bookForm.isbn}
                                            onChange={(e) => onChangeField("isbn", e.target.value)}
                                            placeholder="ISBN"
                                            className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                                        />
                                        <input
                                            value={bookForm.publisher}
                                            onChange={(e) => onChangeField("publisher", e.target.value)}
                                            placeholder="Nha xuat ban"
                                            className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                                        />
                                        <input
                                            value={bookForm.location}
                                            onChange={(e) => onChangeField("location", e.target.value)}
                                            placeholder="Vi tri ke sach"
                                            className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                                        />
                                        <input
                                            value={bookForm.language}
                                            onChange={(e) => onChangeField("language", e.target.value)}
                                            placeholder="Ngon ngu (mac dinh: vi)"
                                            className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                                        />
                                        <input
                                            value={bookForm.publishYear}
                                            onChange={(e) => onChangeField("publishYear", e.target.value)}
                                            placeholder="Nam xuat ban"
                                            className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                                        />
                                        <input
                                            value={bookForm.pageCount}
                                            onChange={(e) => onChangeField("pageCount", e.target.value)}
                                            placeholder="So trang"
                                            className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                                        />
                                        <input
                                            value={bookForm.coverImage}
                                            onChange={(e) => onChangeField("coverImage", e.target.value)}
                                            placeholder="URL anh bia"
                                            className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                                        />
                                        <input
                                            value={bookForm.totalCopies}
                                            onChange={(e) => onChangeField("totalCopies", e.target.value)}
                                            placeholder="Tong so ban *"
                                            className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                                        />
                                        <input
                                            value={bookForm.availableCopies}
                                            onChange={(e) => onChangeField("availableCopies", e.target.value)}
                                            placeholder="So ban kha dung *"
                                            className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                                        />
                                    </div>

                                    <input
                                        value={bookForm.tags}
                                        onChange={(e) => onChangeField("tags", e.target.value)}
                                        placeholder="Tags, cach nhau boi dau phay"
                                        className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                                    />

                                    <textarea
                                        value={bookForm.description}
                                        onChange={(e) => onChangeField("description", e.target.value)}
                                        rows={4}
                                        placeholder="Mo ta sach"
                                        className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                                    />
                                </section>

                                <aside className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/70 p-3">
                                    <p className="text-sm font-semibold text-white">Preview anh bia</p>
                                    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-slate-800">
                                        <div className="aspect-[3/4]">
                                            <Image
                                                src={previewCover}
                                                alt="preview-bia-sach"
                                                fill
                                                sizes="(max-width: 768px) 90vw, 320px"
                                                className="h-full w-full object-cover"
                                                onError={(event) => {
                                                    event.currentTarget.src = pickCoverBySeed(`${bookForm.title}-${bookForm.author}`);
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <button
                                            type="button"
                                            onClick={applySuggestedCover}
                                            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-blue-500/35 bg-blue-500/15 px-3 py-2 text-xs font-semibold text-blue-100 transition hover:bg-blue-500/25"
                                        >
                                            <ImageIcon className="h-3.5 w-3.5" />
                                            Dung anh goi y
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onChangeField("coverImage", "")}
                                            className="inline-flex w-full items-center justify-center rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-700"
                                        >
                                            Xoa URL anh
                                        </button>
                                    </div>
                                    <p className="text-xs text-slate-400">
                                        Neu URL anh loi, he thong tu dong dung anh bia du phong de giao dien van dep va de nhin.
                                    </p>
                                </aside>
                            </div>

                            <div className="mt-5 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={closeBookModal}
                                    disabled={submitting}
                                    className="rounded-lg border border-slate-600/50 bg-slate-700/40 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-700/60 disabled:opacity-60"
                                >
                                    Huy
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void submitBook()}
                                    disabled={submitting}
                                    className="rounded-lg border border-emerald-500/40 bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/30 disabled:opacity-60"
                                >
                                    {submitting ? "Dang luu..." : editingBookId ? "Cap nhat" : "Them sach"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </RouteGuard>
    );
}
