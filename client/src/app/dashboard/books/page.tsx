"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, Heart, Loader2, Pencil, Plus, Search, ShoppingCart, Trash2, X } from "lucide-react";
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

export default function DashboardBooksPage() {
    const { user } = useAuthStore();
    const cartStore = useCartStore();
    const isLibrarian = user?.role === "librarian";
    const canUseWishlist = user?.role === "user" || user?.role === "admin" || user?.role === "librarian";
    const canBorrow = user?.role === "user";

    const [books, setBooks] = useState<IBook[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [processingBookId, setProcessingBookId] = useState<string | null>(null);

    const [query, setQuery] = useState("");
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

    const displayedBooks = useMemo(() => {
        if (!isLibrarian) return books;
        const keyword = query.trim().toLowerCase();
        if (!keyword) return books;

        return books.filter((book) => {
            const searchable = [
                book.title,
                book.author,
                book.category,
                book.isbn || "",
                book.location || "",
            ]
                .join(" ")
                .toLowerCase();
            return searchable.includes(keyword);
        });
    }, [books, isLibrarian, query]);

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

    return (
        <RouteGuard>
            <div className="p-8">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-white">{isLibrarian ? "Quan ly sach thu vien" : "Danh sach sach"}</h1>
                    <p className="text-slate-400 mt-1 text-sm">
                        {isLibrarian
                            ? `CRUD dau sach cho thu vien ${user?.libraryId?.name || ""}`
                            : "Kham pha sach va quan ly danh sach yeu thich"}
                    </p>
                </div>

                {error && (
                    <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                        {error}
                    </div>
                )}
                {success && (
                    <div className="mb-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                        {success}
                    </div>
                )}

                {isLibrarian ? (
                    <section className="space-y-4">
                        <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/5 p-4">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                <div className="relative w-full lg:max-w-xl">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        value={query}
                                        onChange={(event) => setQuery(event.target.value)}
                                        placeholder="Tim theo tieu de, tac gia, ISBN, vi tri..."
                                        className="w-full rounded-xl border border-white/10 bg-slate-900/70 py-2.5 pl-10 pr-3 text-sm text-slate-100 outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={openCreateModal}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/20 px-4 py-2.5 text-sm font-semibold text-emerald-100 hover:bg-emerald-500/30"
                                >
                                    <Plus className="h-4 w-4" /> Them sach moi
                                </button>
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex items-center gap-2 text-slate-300">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Dang tai du lieu...
                            </div>
                        ) : displayedBooks.length === 0 ? (
                            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 text-slate-400">
                                Khong co dau sach nao trong thu vien hien tai.
                            </div>
                        ) : (
                            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/70">
                                <table className="w-full min-w-[980px] text-sm">
                                    <thead className="bg-slate-950/50 text-left text-slate-400">
                                        <tr>
                                            <th className="px-4 py-3">Sach</th>
                                            <th className="px-4 py-3">The loai</th>
                                            <th className="px-4 py-3">Vi tri</th>
                                            <th className="px-4 py-3">Ton kho</th>
                                            <th className="px-4 py-3">Trang thai</th>
                                            <th className="px-4 py-3 text-right">Thao tac</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {displayedBooks.map((book) => (
                                            <tr key={book._id} className="border-t border-white/5 text-slate-200">
                                                <td className="px-4 py-3">
                                                    <p className="font-semibold text-white">{book.title}</p>
                                                    <p className="text-xs text-slate-400">
                                                        {book.author}
                                                        {book.isbn ? ` • ISBN: ${book.isbn}` : ""}
                                                    </p>
                                                </td>
                                                <td className="px-4 py-3">{book.category || "-"}</td>
                                                <td className="px-4 py-3">{book.location || "-"}</td>
                                                <td className="px-4 py-3">
                                                    <span className="font-semibold text-slate-100">{book.availableCopies}</span>
                                                    <span className="text-slate-500"> / {book.totalCopies}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`rounded-md px-2 py-1 text-xs font-semibold ${book.availableCopies > 0 ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-200" : "border border-amber-500/30 bg-amber-500/10 text-amber-200"}`}>
                                                        {book.availableCopies > 0 ? "Co san" : "Tam het"}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => openEditModal(book)}
                                                            className="inline-flex items-center gap-1 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1.5 text-xs text-indigo-200 hover:bg-indigo-500/20"
                                                        >
                                                            <Pencil className="h-3.5 w-3.5" /> Sua
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={deleteLoadingId === book._id}
                                                            onClick={() => void deleteBook(book._id)}
                                                            className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-xs text-red-200 hover:bg-red-500/20 disabled:opacity-60"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                            {deleteLoadingId === book._id ? "Dang xoa..." : "Xoa"}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                ) : loading ? (
                    <div className="flex items-center gap-2 text-slate-300">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Dang tai du lieu...
                    </div>
                ) : books.length === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 text-slate-400">
                        Chua co sach trong he thong.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
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
                                            <p className="text-slate-500 text-xs mt-1">Thu vien: {book.libraryId?.name || "Khong xac dinh"}</p>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <button
                                                type="button"
                                                onClick={() => void toggleWishlist(book)}
                                                disabled={isProcessing}
                                                className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border transition-all ${
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

                                            {canBorrow && (
                                                <button
                                                    type="button"
                                                    onClick={() => cartStore.isInCart(book._id) ? cartStore.removeFromCart(book._id) : cartStore.addToCart(book)}
                                                    className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border transition-all ${
                                                        cartStore.isInCart(book._id)
                                                            ? "bg-blue-500/20 border-blue-400/40 text-blue-300"
                                                            : "bg-white/5 border-white/10 text-slate-300 hover:text-blue-300 hover:border-blue-400/30"
                                                    }`}
                                                    aria-label={cartStore.isInCart(book._id) ? "Xoa khoi gio sach" : "Them vao gio sach"}
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

                {isLibrarian && isBookModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
                        <div className="w-full max-w-4xl rounded-2xl border border-white/10 bg-slate-900 p-5">
                            <div className="mb-4 flex items-start justify-between gap-3">
                                <div>
                                    <h2 className="text-lg font-semibold text-white">{editingBookId ? "Cap nhat sach" : "Them sach moi"}</h2>
                                    <p className="text-xs text-slate-400 mt-1">
                                        Thu vien quan ly: {user?.libraryId?.name || "-"}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={closeBookModal}
                                    className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            {formError && (
                                <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                                    {formError}
                                </div>
                            )}

                            <div className="grid gap-3 md:grid-cols-2">
                                <input value={bookForm.title} onChange={(e) => onChangeField("title", e.target.value)} placeholder="Tieu de *" className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500" />
                                <input value={bookForm.author} onChange={(e) => onChangeField("author", e.target.value)} placeholder="Tac gia *" className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500" />
                                <input value={bookForm.category} onChange={(e) => onChangeField("category", e.target.value)} placeholder="The loai *" className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500" />
                                <input value={bookForm.isbn} onChange={(e) => onChangeField("isbn", e.target.value)} placeholder="ISBN" className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500" />
                                <input value={bookForm.publisher} onChange={(e) => onChangeField("publisher", e.target.value)} placeholder="Nha xuat ban" className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500" />
                                <input value={bookForm.location} onChange={(e) => onChangeField("location", e.target.value)} placeholder="Vi tri ke sach" className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500" />
                                <input value={bookForm.language} onChange={(e) => onChangeField("language", e.target.value)} placeholder="Ngon ngu (mac dinh: vi)" className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500" />
                                <input value={bookForm.publishYear} onChange={(e) => onChangeField("publishYear", e.target.value)} placeholder="Nam xuat ban" className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500" />
                                <input value={bookForm.pageCount} onChange={(e) => onChangeField("pageCount", e.target.value)} placeholder="So trang" className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500" />
                                <input value={bookForm.coverImage} onChange={(e) => onChangeField("coverImage", e.target.value)} placeholder="URL anh bia" className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500" />
                                <input value={bookForm.totalCopies} onChange={(e) => onChangeField("totalCopies", e.target.value)} placeholder="Tong so ban *" className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500" />
                                <input value={bookForm.availableCopies} onChange={(e) => onChangeField("availableCopies", e.target.value)} placeholder="So ban kha dung *" className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500" />
                            </div>

                            <div className="mt-3 space-y-3">
                                <input
                                    value={bookForm.tags}
                                    onChange={(e) => onChangeField("tags", e.target.value)}
                                    placeholder="Tags, cach nhau boi dau phay"
                                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
                                />
                                <textarea
                                    value={bookForm.description}
                                    onChange={(e) => onChangeField("description", e.target.value)}
                                    rows={3}
                                    placeholder="Mo ta sach"
                                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
                                />
                            </div>

                            <div className="mt-5 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={closeBookModal}
                                    disabled={submitting}
                                    className="rounded-lg border border-slate-600/50 bg-slate-700/40 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-700/60 disabled:opacity-60"
                                >
                                    Huy
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void submitBook()}
                                    disabled={submitting}
                                    className="rounded-lg border border-emerald-500/40 bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-100 hover:bg-emerald-500/30 disabled:opacity-60"
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
