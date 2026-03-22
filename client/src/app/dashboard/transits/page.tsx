"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Search, SendHorizontal, Truck, X } from "lucide-react";
import { RouteGuard } from "@/components/RouteGuard";
import { Pagination } from "@/components/ui/Pagination";
import { useAuthStore } from "@/stores/authStore";
import { usePagination, useSearch } from "@/hooks";
import { transitService } from "@/services/transitService";
import { bookService } from "@/services/bookService";
import { userService } from "@/services/userService";
import type { IBook, ITransitRequest, IUser } from "@/types";

const TRANSIT_STATUS_OPTIONS: Array<{ value: "" | ITransitRequest["status"]; label: string }> = [
    { value: "", label: "Tất cả trạng thái" },
    { value: "pending", label: "Chờ duyệt" },
    { value: "approved", label: "Đã duyệt" },
    { value: "rejected", label: "Bị từ chối" },
    { value: "in_transit", label: "Đang luân chuyển" },
    { value: "completed", label: "Hoàn tất" },
    { value: "cancelled", label: "Đã hủy" },
];

const DIRECTION_OPTIONS = [
    { value: "all", label: "Tất cả chiều" },
    { value: "inbound", label: "Chiều về thư viện tôi" },
    { value: "outbound", label: "Chiều từ thư viện tôi" },
] as const;

const SUMMARY_STATUS_OPTIONS: Array<{ value: ITransitRequest["status"]; label: string }> = [
    { value: "pending", label: "Chờ duyệt" },
    { value: "approved", label: "Đã duyệt" },
    { value: "rejected", label: "Bị từ chối" },
    { value: "in_transit", label: "Đang luân chuyển" },
    { value: "completed", label: "Hoàn tất" },
    { value: "cancelled", label: "Đã hủy" },
];

const getStatusLabel = (status: ITransitRequest["status"]): string => {
    const map: Record<ITransitRequest["status"], string> = {
        pending: "Chờ duyệt",
        approved: "Đã duyệt",
        rejected: "Bị từ chối",
        in_transit: "Đang luân chuyển",
        completed: "Hoàn tất",
        cancelled: "Đã hủy",
    };
    return map[status];
};

const getStatusClassName = (status: ITransitRequest["status"]): string => {
    const map: Record<ITransitRequest["status"], string> = {
        pending: "border-blue-500/30 bg-blue-500/10 text-blue-200",
        approved: "border-indigo-500/30 bg-indigo-500/10 text-indigo-200",
        rejected: "border-red-500/30 bg-red-500/10 text-red-200",
        in_transit: "border-cyan-500/30 bg-cyan-500/10 text-cyan-200",
        completed: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
        cancelled: "border-slate-500/30 bg-slate-500/10 text-slate-200",
    };
    return map[status];
};

const formatDateTime = (value?: string): string => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString("vi-VN");
};

const getApiErrorMessage = (error: unknown): string => {
    if (error && typeof error === "object") {
        const err = error as {
            message?: string;
            response?: { data?: { message?: string; error?: { message?: string } } };
        };
        return err.response?.data?.error?.message || err.response?.data?.message || err.message || "Đã xảy ra lỗi.";
    }
    return "Đã xảy ra lỗi.";
};

export default function TransitDashboardPage() {
    const { user } = useAuthStore();
    const isAdmin = user?.role === "admin";
    const isLibrarian = user?.role === "librarian";
    const currentLibraryId = user?.libraryId?._id;

    const [requests, setRequests] = useState<ITransitRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<"" | ITransitRequest["status"]>("");
    const [direction, setDirection] = useState<(typeof DIRECTION_OPTIONS)[number]["value"]>("all");

    const [sourceBooks, setSourceBooks] = useState<IBook[]>([]);
    const [sourceLoading, setSourceLoading] = useState(false);
    const [selectedSourceBook, setSelectedSourceBook] = useState<IBook | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [readerLoading, setReaderLoading] = useState(false);
    const [readerCandidates, setReaderCandidates] = useState<IUser[]>([]);
    const [selectedReader, setSelectedReader] = useState<IUser | null>(null);
    const [requestNote, setRequestNote] = useState("");
    const [creating, setCreating] = useState(false);
    const [noteModalOpen, setNoteModalOpen] = useState(false);
    const [noteModalAction, setNoteModalAction] = useState<"approve" | "reject" | "dispatch" | "receive" | "cancel" | null>(null);
    const [noteModalRequestId, setNoteModalRequestId] = useState<string | null>(null);
    const [noteModalTitle, setNoteModalTitle] = useState("");
    const [noteModalPlaceholder, setNoteModalPlaceholder] = useState("");
    const [noteModalRequired, setNoteModalRequired] = useState(false);
    const [noteModalSuccessMessage, setNoteModalSuccessMessage] = useState("");
    const [noteModalValue, setNoteModalValue] = useState("");
    const [noteModalError, setNoteModalError] = useState<string | null>(null);

    const { searchTerm, setSearchTerm, debouncedTerm } = useSearch({ debounceMs: 300 });
    const {
        searchTerm: sourceSearchTerm,
        setSearchTerm: setSourceSearchTerm,
        debouncedTerm: sourceDebouncedTerm,
        resetSearch: resetSourceSearch,
    } = useSearch({ debounceMs: 300 });
    const {
        searchTerm: readerSearchTerm,
        setSearchTerm: setReaderSearchTerm,
        debouncedTerm: readerDebouncedTerm,
        resetSearch: resetReaderSearch,
    } = useSearch({ debounceMs: 300 });
    const { page, limit, pagination, goToPage, updatePagination } = usePagination({
        initialPage: 1,
        defaultLimit: 10,
    });

    const fetchRequests = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await transitService.getTransitRequests({
                page,
                limit,
                status: statusFilter || undefined,
                direction,
                q: debouncedTerm || undefined,
            });
            setRequests(result.requests);
            updatePagination(result.pagination);
        } catch (fetchError) {
            setError(getApiErrorMessage(fetchError));
        } finally {
            setLoading(false);
        }
    }, [page, limit, statusFilter, direction, debouncedTerm, updatePagination]);

    useEffect(() => {
        void fetchRequests();
    }, [fetchRequests]);

    const loadSourceBooks = useCallback(async (keyword?: string) => {
        setSourceLoading(true);
        try {
            const { books } = await bookService.getBooks({
                q: keyword?.trim() ? keyword.trim() : undefined,
                page: 1,
                limit: 20,
                status: "available",
            });

            const filtered = books.filter((book) => {
                if (book.availableCopies <= 0) return false;
                if (isLibrarian && currentLibraryId && book.libraryId?._id === currentLibraryId) return false;
                return true;
            });

            setSourceBooks(filtered);
        } catch (searchError) {
            setError(getApiErrorMessage(searchError));
            setSourceBooks([]);
        } finally {
            setSourceLoading(false);
        }
    }, [isLibrarian, currentLibraryId]);

    useEffect(() => {
        if (!isLibrarian) return;
        void loadSourceBooks(sourceDebouncedTerm);
    }, [isLibrarian, sourceDebouncedTerm, loadSourceBooks]);

    const loadReaderCandidates = useCallback(async (keyword: string) => {
        const q = keyword.trim();
        if (q.length < 2) {
            setReaderCandidates([]);
            return;
        }

        setReaderLoading(true);
        try {
            const result = await userService.searchReaders({
                q,
                page: 1,
                limit: 8,
            });
            setReaderCandidates(result.users);
        } catch (readerError) {
            setError(getApiErrorMessage(readerError));
            setReaderCandidates([]);
        } finally {
            setReaderLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!isLibrarian) return;
        void loadReaderCandidates(readerDebouncedTerm);
    }, [isLibrarian, readerDebouncedTerm, loadReaderCandidates]);

    const createRequest = async () => {
        if (!selectedSourceBook) {
            setError("Vui lòng chọn sách nguồn từ thư viện khác.");
            return;
        }
        if (quantity < 1) {
            setError("Số lượng phải lớn hơn 0.");
            return;
        }

        setCreating(true);
        setError(null);
        setSuccess(null);
        try {
            await transitService.createTransitRequest({
                sourceBookId: selectedSourceBook._id,
                quantity,
                note: requestNote.trim() || undefined,
                requestedForUserId: selectedReader?._id || undefined,
            });
            setSuccess("Đã tạo yêu cầu luân chuyển.");
            setSelectedSourceBook(null);
            resetSourceSearch();
            setQuantity(1);
            setSelectedReader(null);
            setReaderCandidates([]);
            resetReaderSearch();
            setRequestNote("");
            goToPage(1);
            await loadSourceBooks();
            await fetchRequests();
        } catch (createError) {
            setError(getApiErrorMessage(createError));
        } finally {
            setCreating(false);
        }
    };

    const runAction = async (id: string, action: () => Promise<unknown>, successMessage: string) => {
        setActionLoadingId(id);
        setError(null);
        setSuccess(null);
        try {
            await action();
            setSuccess(successMessage);
            await fetchRequests();
        } catch (actionError) {
            setError(getApiErrorMessage(actionError));
        } finally {
            setActionLoadingId(null);
        }
    };

    const openNoteModal = (
        requestId: string,
        action: "approve" | "reject" | "dispatch" | "receive" | "cancel"
    ) => {
        const configMap: Record<typeof action, { title: string; placeholder: string; required: boolean; successMessage: string }> = {
            approve: {
                title: "Duyệt yêu cầu luân chuyển",
                placeholder: "Ghi chú duyệt (tuỳ chọn)...",
                required: false,
                successMessage: "Đã duyệt yêu cầu luân chuyển.",
            },
            reject: {
                title: "Từ chối yêu cầu luân chuyển",
                placeholder: "Nhập lý do từ chối (bắt buộc)...",
                required: true,
                successMessage: "Đã từ chối yêu cầu luân chuyển.",
            },
            dispatch: {
                title: "Xác nhận xuất kho luân chuyển",
                placeholder: "Ghi chú xuất kho (tuỳ chọn)...",
                required: false,
                successMessage: "Đã xuất kho và chuyển trạng thái đang luân chuyển.",
            },
            receive: {
                title: "Xác nhận nhận kho",
                placeholder: "Ghi chú nhận kho (tuỳ chọn)...",
                required: false,
                successMessage: "Đã nhận kho và hoàn tất luân chuyển.",
            },
            cancel: {
                title: "Hủy yêu cầu luân chuyển",
                placeholder: "Lý do hủy (tuỳ chọn)...",
                required: false,
                successMessage: "Đã hủy yêu cầu luân chuyển.",
            },
        };

        const config = configMap[action];
        setNoteModalRequestId(requestId);
        setNoteModalAction(action);
        setNoteModalTitle(config.title);
        setNoteModalPlaceholder(config.placeholder);
        setNoteModalRequired(config.required);
        setNoteModalSuccessMessage(config.successMessage);
        setNoteModalValue("");
        setNoteModalError(null);
        setNoteModalOpen(true);
    };

    const closeNoteModal = () => {
        if (noteModalRequestId && actionLoadingId === noteModalRequestId) return;
        setNoteModalOpen(false);
        setNoteModalAction(null);
        setNoteModalRequestId(null);
        setNoteModalValue("");
        setNoteModalError(null);
    };

    const submitNoteModalAction = async () => {
        if (!noteModalAction || !noteModalRequestId) return;
        const note = noteModalValue.trim();
        if (noteModalRequired && !note) {
            setNoteModalError("Vui lòng nhập nội dung bắt buộc.");
            return;
        }

        setNoteModalError(null);
        const requestId = noteModalRequestId;
        const action = noteModalAction;
        const successMessage = noteModalSuccessMessage;
        closeNoteModal();

        if (action === "approve") {
            await runAction(
                requestId,
                () => transitService.approveTransitRequest(requestId, note ? { note } : undefined),
                successMessage
            );
            return;
        }

        if (action === "reject") {
            await runAction(
                requestId,
                () => transitService.rejectTransitRequest(requestId, { reason: note }),
                successMessage
            );
            return;
        }

        if (action === "dispatch") {
            await runAction(
                requestId,
                () => transitService.dispatchTransitRequest(requestId, note ? { note } : undefined),
                successMessage
            );
            return;
        }

        if (action === "receive") {
            await runAction(
                requestId,
                () => transitService.receiveTransitRequest(requestId, note ? { note } : undefined),
                successMessage
            );
            return;
        }

        await runAction(
            requestId,
            () => transitService.cancelTransitRequest(requestId, note ? { reason: note } : undefined),
            successMessage
        );
    };

    const summary = useMemo(() => {
        const map: Record<ITransitRequest["status"], number> = {
            pending: 0,
            approved: 0,
            rejected: 0,
            in_transit: 0,
            completed: 0,
            cancelled: 0,
        };

        for (const request of requests) {
            map[request.status] = (map[request.status] || 0) + 1;
        }
        return map;
    }, [requests]);

    return (
        <RouteGuard allowedRoles={["admin", "librarian"]}>
            <div className="p-8 space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Luân chuyển sách liên thư viện</h1>
                        <p className="mt-1 text-sm text-slate-400">
                            Luồng: tạo yêu cầu tại thư viện đích → thư viện nguồn duyệt/xuất kho → thư viện đích nhận kho.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => void fetchRequests()}
                        className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10"
                    >
                        <RefreshCw className="h-3.5 w-3.5" /> Làm mới
                    </button>
                </div>

                {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
                {success && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{success}</div>}

                {isLibrarian && (
                    <section className="rounded-2xl border border-cyan-500/25 bg-cyan-500/5 p-5">
                        <h2 className="mb-3 flex items-center gap-2 font-semibold text-cyan-100">
                            <SendHorizontal className="h-4 w-4" /> Tạo yêu cầu luân chuyển
                        </h2>
                        <div className="grid gap-3 lg:grid-cols-[2fr_1fr]">
                            <div className="space-y-2">
                                <div className="flex gap-2">
                                    <input
                                        value={sourceSearchTerm}
                                        onChange={(event) => setSourceSearchTerm(event.target.value)}
                                        placeholder="Tìm sách nguồn (tên sách/tác giả/ISBN)..."
                                        className="h-10 w-full rounded-xl border border-white/15 bg-slate-800/70 px-3 text-sm text-white"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => void loadSourceBooks(sourceDebouncedTerm)}
                                        disabled={sourceLoading}
                                        className="inline-flex h-10 items-center gap-1 rounded-xl border border-cyan-400/30 bg-cyan-500/20 px-3 text-xs font-semibold text-cyan-100 hover:bg-cyan-500/30 disabled:opacity-60"
                                    >
                                        {sourceLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                                        Làm mới
                                    </button>
                                </div>

                                <p className="text-[11px] text-cyan-100/80">
                                    Danh sách tự động hiển thị sách còn tại thư viện khác, bạn có thể gõ từ khóa để lọc nhanh.
                                </p>

                                {selectedSourceBook && (
                                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
                                        <p>
                                            Đã chọn: <span className="font-semibold">{selectedSourceBook.title}</span> | Thư viện nguồn:{" "}
                                            <span className="font-semibold">{selectedSourceBook.libraryId?.name || "-"}</span>
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedSourceBook(null)}
                                            className="rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-100 hover:bg-emerald-500/25"
                                        >
                                            Bỏ chọn
                                        </button>
                                    </div>
                                )}

                                {sourceBooks.length > 0 && (
                                    <div className="max-h-56 space-y-2 overflow-y-auto rounded-xl border border-white/10 bg-slate-900/60 p-2">
                                        {sourceBooks.map((book) => (
                                            <div
                                                key={book._id}
                                                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-slate-800/50 px-3 py-2 text-xs text-slate-200"
                                            >
                                                <div>
                                                    <p className="font-semibold text-white">{book.title}</p>
                                                    <p className="text-slate-300">
                                                        {book.author} | {book.libraryId?.name || "-"} | Còn: {book.availableCopies}
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedSourceBook(book)}
                                                    disabled={selectedSourceBook?._id === book._id}
                                                    className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-[11px] font-semibold text-blue-200 hover:bg-blue-500/20"
                                                >
                                                    {selectedSourceBook?._id === book._id ? "Đã chọn" : "Chọn"}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <input
                                    type="number"
                                    min={1}
                                    value={quantity}
                                    onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))}
                                    className="h-10 w-full rounded-xl border border-white/15 bg-slate-800/70 px-3 text-sm text-white"
                                    placeholder="Số lượng"
                                />
                                <div className="space-y-2">
                                    <input
                                        value={readerSearchTerm}
                                        onChange={(event) => setReaderSearchTerm(event.target.value)}
                                        className="h-10 w-full rounded-xl border border-white/15 bg-slate-800/70 px-3 text-sm text-white"
                                        placeholder="Tìm bạn đọc theo tên/email (tuỳ chọn)"
                                    />
                                    {selectedReader && (
                                        <div className="flex items-center justify-between gap-2 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-xs text-indigo-100">
                                            <p>
                                                Đã chọn: <span className="font-semibold">{selectedReader.fullName}</span> ({selectedReader.email})
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedReader(null);
                                                    setReaderSearchTerm("");
                                                    setReaderCandidates([]);
                                                }}
                                                className="rounded-lg border border-indigo-400/40 bg-indigo-500/15 px-2.5 py-1 text-[11px] font-semibold text-indigo-100 hover:bg-indigo-500/25"
                                            >
                                                Bỏ chọn
                                            </button>
                                        </div>
                                    )}
                                    {readerLoading ? (
                                        <p className="text-[11px] text-slate-400">Đang tìm bạn đọc...</p>
                                    ) : readerCandidates.length > 0 ? (
                                        <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-white/10 bg-slate-900/60 p-2">
                                            {readerCandidates.map((candidate) => (
                                                <button
                                                    key={candidate._id}
                                                    type="button"
                                                    onClick={() => setSelectedReader(candidate)}
                                                    className="w-full rounded-md border border-white/10 bg-slate-800/60 px-2 py-1.5 text-left text-xs text-slate-200 hover:bg-slate-700/70"
                                                >
                                                    <p className="font-semibold text-white">{candidate.fullName}</p>
                                                    <p className="text-slate-300">{candidate.email}</p>
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        readerSearchTerm.trim().length >= 2 && (
                                            <p className="text-[11px] text-slate-400">Không tìm thấy bạn đọc phù hợp.</p>
                                        )
                                    )}
                                </div>
                                <textarea
                                    rows={3}
                                    value={requestNote}
                                    onChange={(event) => setRequestNote(event.target.value)}
                                    className="w-full rounded-xl border border-white/15 bg-slate-800/70 px-3 py-2 text-sm text-white"
                                    placeholder="Ghi chú điều chuyển..."
                                />
                                <button
                                    type="button"
                                    onClick={() => void createRequest()}
                                    disabled={creating}
                                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/20 px-3 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/30 disabled:opacity-60"
                                >
                                    {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
                                    Gửi yêu cầu
                                </button>
                            </div>
                        </div>
                    </section>
                )}

                <section className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                    {SUMMARY_STATUS_OPTIONS.map((option) => (
                        <div key={option.value} className="rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2">
                            <p className="text-[11px] uppercase tracking-wide text-slate-400">{option.label}</p>
                            <p className="mt-1 text-xl font-bold text-white">{summary[option.value] || 0}</p>
                        </div>
                    ))}
                </section>

                <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
                    <div className="mb-4 grid gap-2 lg:grid-cols-[2fr_1fr_1fr]">
                        <input
                            value={searchTerm}
                            onChange={(event) => {
                                setSearchTerm(event.target.value);
                                goToPage(1);
                            }}
                            className="h-10 rounded-xl border border-white/15 bg-slate-800/70 px-3 text-sm text-white"
                            placeholder="Tìm theo mã yêu cầu, tên sách, người yêu cầu..."
                        />
                        <select
                            value={statusFilter}
                            onChange={(event) => {
                                setStatusFilter(event.target.value as "" | ITransitRequest["status"]);
                                goToPage(1);
                            }}
                            className="h-10 rounded-xl border border-white/15 bg-slate-800/70 px-3 text-sm text-white"
                        >
                            {TRANSIT_STATUS_OPTIONS.map((option) => (
                                <option key={option.value || "all"} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        <select
                            value={direction}
                            onChange={(event) => {
                                setDirection(event.target.value as (typeof DIRECTION_OPTIONS)[number]["value"]);
                                goToPage(1);
                            }}
                            className="h-10 rounded-xl border border-white/15 bg-slate-800/70 px-3 text-sm text-white"
                        >
                            {DIRECTION_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {loading ? (
                        <div className="flex items-center gap-2 text-sm text-slate-300">
                            <Loader2 className="h-4 w-4 animate-spin" /> Đang tải yêu cầu luân chuyển...
                        </div>
                    ) : requests.length === 0 ? (
                        <p className="text-sm text-slate-400">Không có yêu cầu phù hợp.</p>
                    ) : (
                        <div className="space-y-3">
                            {requests.map((request) => {
                                const isSourceLibrary = Boolean(currentLibraryId && request.sourceLibraryId?._id === currentLibraryId);
                                const isTargetLibrary = Boolean(currentLibraryId && request.targetLibraryId?._id === currentLibraryId);
                                const isRequester = Boolean(user?._id && request.requestedBy?._id === user._id);
                                const canApprove = request.status === "pending" && (isAdmin || isSourceLibrary);
                                const canReject = request.status === "pending" && (isAdmin || isSourceLibrary);
                                const canDispatch = request.status === "approved" && (isAdmin || isSourceLibrary);
                                const canReceive = request.status === "in_transit" && (isAdmin || isTargetLibrary);
                                const canCancel = (request.status === "pending" || request.status === "approved")
                                    && (isAdmin || isRequester || isTargetLibrary);

                                return (
                                    <article key={request._id} className="rounded-xl border border-white/10 bg-slate-800/50 p-4">
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div>
                                                <p className="text-sm font-semibold text-white">{request.bookId?.title || "Sách"}</p>
                                                <p className="text-xs text-slate-400">
                                                    {request.bookId?.author || "-"} | Số lượng: {request.quantity} | Mã yêu cầu: {request._id}
                                                </p>
                                            </div>
                                            <span className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${getStatusClassName(request.status)}`}>
                                                {getStatusLabel(request.status)}
                                            </span>
                                        </div>

                                        <div className="mt-3 grid gap-2 text-xs text-slate-300 md:grid-cols-2 xl:grid-cols-4">
                                            <p>Nguồn: <span className="text-slate-100">{request.sourceLibraryId?.name || "-"}</span></p>
                                            <p>Đích: <span className="text-slate-100">{request.targetLibraryId?.name || "-"}</span></p>
                                            <p>Người yêu cầu: <span className="text-slate-100">{request.requestedBy?.fullName || "-"}</span></p>
                                            <p>Tạo lúc: <span className="text-slate-100">{formatDateTime(request.requestedAt)}</span></p>
                                            <p>Duyệt lúc: <span className="text-slate-100">{formatDateTime(request.approvedAt)}</span></p>
                                            <p>Xuất kho lúc: <span className="text-slate-100">{formatDateTime(request.dispatchedAt)}</span></p>
                                            <p>Nhận kho lúc: <span className="text-slate-100">{formatDateTime(request.receivedAt)}</span></p>
                                            <p>Bạn đọc đích: <span className="text-slate-100">{request.requestedForUserId?.fullName || "-"}</span></p>
                                        </div>

                                        {(request.note || request.decisionNote || request.dispatchNote || request.receiveNote || request.cancelReason) && (
                                            <div className="mt-3 rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-xs text-slate-300">
                                                {request.note && <p>Ghi chú yêu cầu: {request.note}</p>}
                                                {request.decisionNote && <p>Ghi chú duyệt/từ chối: {request.decisionNote}</p>}
                                                {request.dispatchNote && <p>Ghi chú xuất kho: {request.dispatchNote}</p>}
                                                {request.receiveNote && <p>Ghi chú nhận kho: {request.receiveNote}</p>}
                                                {request.cancelReason && <p>Lý do hủy: {request.cancelReason}</p>}
                                            </div>
                                        )}

                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {canApprove && (
                                                <button
                                                    type="button"
                                                    disabled={actionLoadingId === request._id}
                                                    onClick={() => openNoteModal(request._id, "approve")}
                                                    className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold text-indigo-200 hover:bg-indigo-500/20 disabled:opacity-60"
                                                >
                                                    Duyệt
                                                </button>
                                            )}
                                            {canReject && (
                                                <button
                                                    type="button"
                                                    disabled={actionLoadingId === request._id}
                                                    onClick={() => openNoteModal(request._id, "reject")}
                                                    className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-200 hover:bg-red-500/20 disabled:opacity-60"
                                                >
                                                    Từ chối
                                                </button>
                                            )}
                                            {canDispatch && (
                                                <button
                                                    type="button"
                                                    disabled={actionLoadingId === request._id}
                                                    onClick={() => openNoteModal(request._id, "dispatch")}
                                                    className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/20 disabled:opacity-60"
                                                >
                                                    Xuất kho
                                                </button>
                                            )}
                                            {canReceive && (
                                                <button
                                                    type="button"
                                                    disabled={actionLoadingId === request._id}
                                                    onClick={() => openNoteModal(request._id, "receive")}
                                                    className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-60"
                                                >
                                                    Nhận kho
                                                </button>
                                            )}
                                            {canCancel && (
                                                <button
                                                    type="button"
                                                    disabled={actionLoadingId === request._id}
                                                    onClick={() => openNoteModal(request._id, "cancel")}
                                                    className="rounded-lg border border-slate-500/30 bg-slate-500/10 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-500/20 disabled:opacity-60"
                                                >
                                                    Hủy
                                                </button>
                                            )}
                                            {actionLoadingId === request._id && (
                                                <span className="inline-flex items-center gap-1 text-xs text-slate-300">
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang xử lý...
                                                </span>
                                            )}
                                        </div>
                                    </article>
                                );
                            })}

                            <div className="flex justify-center pt-2">
                                <Pagination
                                    page={page}
                                    pages={pagination.pages}
                                    total={pagination.total}
                                    limit={limit}
                                    onPageChange={goToPage}
                                    showInfo={false}
                                />
                            </div>
                        </div>
                    )}
                </section>

                {noteModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4">
                        <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 p-5 shadow-2xl">
                            <div className="mb-4 flex items-center justify-between">
                                <h3 className="text-base font-semibold text-white">{noteModalTitle}</h3>
                                <button
                                    type="button"
                                    onClick={closeNoteModal}
                                    className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            {noteModalError && (
                                <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                                    {noteModalError}
                                </div>
                            )}

                            <textarea
                                rows={4}
                                value={noteModalValue}
                                onChange={(event) => setNoteModalValue(event.target.value)}
                                placeholder={noteModalPlaceholder}
                                className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500"
                            />

                            <div className="mt-4 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={closeNoteModal}
                                    className="rounded-lg border border-slate-600/50 bg-slate-700/40 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700/60"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void submitNoteModalAction()}
                                    className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/20"
                                >
                                    Xác nhận
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </RouteGuard>
    );
}
