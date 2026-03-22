"use client";

import { FormEvent, useEffect, useState } from "react";
import { Building2, Loader2, Pencil, Trash2, X } from "lucide-react";
import { RouteGuard } from "@/components/RouteGuard";
import { libraryService } from "@/services/libraryService";
import type { ILibrary } from "@/types";

const DEFAULT_FORM = {
    name: "",
    code: "",
    address: "",
    phone: "",
    email: "",
    status: "active" as "active" | "inactive",
    open: "08:00",
    close: "17:00",
    description: "",
};

const libraryStatusLabel: Record<"active" | "inactive", string> = {
    active: "Đang hoạt động",
    inactive: "Tạm ngưng",
};

export default function AdminLibrariesPage() {
    const [libraries, setLibraries] = useState<ILibrary[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState(DEFAULT_FORM);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const fetchLibraries = async () => {
        setLoading(true);
        setError(null);
        try {
            const { libraries: fetchedLibraries } = await libraryService.getLibraries({ page: 1, limit: 100 });
            setLibraries(fetchedLibraries);
        } catch (fetchError) {
            const message = fetchError instanceof Error ? fetchError.message : "Không tải được danh sách thư viện.";
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void fetchLibraries();
    }, []);

    const resetForm = () => {
        setForm(DEFAULT_FORM);
        setEditingId(null);
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);
        setSuccess(null);
        setSubmitting(true);

        const payload = {
            name: form.name.trim(),
            code: form.code.trim().toUpperCase(),
            address: form.address.trim(),
            phone: form.phone.trim() || undefined,
            email: form.email.trim() || undefined,
            status: form.status,
            description: form.description.trim() || undefined,
            workingHours: {
                open: form.open,
                close: form.close,
            },
        };

        try {
            if (editingId) {
                await libraryService.updateLibrary(editingId, payload);
                setSuccess("Cập nhật thư viện thành công.");
            } else {
                await libraryService.createLibrary(payload);
                setSuccess("Tạo thư viện thành công.");
            }

            resetForm();
            await fetchLibraries();
        } catch (submitError) {
            const message = submitError instanceof Error ? submitError.message : "Không thể lưu thư viện.";
            setError(message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (library: ILibrary) => {
        setEditingId(library._id);
        setForm({
            name: library.name,
            code: library.code,
            address: library.address,
            phone: library.phone || "",
            email: library.email || "",
            status: library.status,
            open: library.workingHours?.open || "08:00",
            close: library.workingHours?.close || "17:00",
            description: library.description || "",
        });
    };

    const handleDelete = async (library: ILibrary) => {
        if (!confirm(`Xóa thư viện ${library.name}?`)) return;

        setError(null);
        setSuccess(null);
        try {
            await libraryService.deleteLibrary(library._id);
            setSuccess("Xóa thư viện thành công.");
            if (editingId === library._id) {
                resetForm();
            }
            await fetchLibraries();
        } catch (deleteError) {
            const message = deleteError instanceof Error ? deleteError.message : "Không thể xóa thư viện.";
            setError(message);
        }
    };

    return (
        <RouteGuard allowedRoles={["admin"]}>
            <div className="p-8 space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">Quản lý thư viện</h1>
                    <p className="text-sm text-slate-400 mt-1">Quản trị viên: thêm, sửa, xóa thư viện</p>
                </div>

                {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
                {success && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{success}</div>}

                <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
                    <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-blue-400" />
                        {editingId ? "Cập nhật thư viện" : "Tạo thư viện mới"}
                    </h2>

                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        <input className="h-10 rounded-xl border border-white/15 bg-slate-800/60 px-3 text-sm text-white" placeholder="Tên thư viện" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
                        <input className="h-10 rounded-xl border border-white/15 bg-slate-800/60 px-3 text-sm text-white" placeholder="Mã thư viện" value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} required />
                        <input className="h-10 rounded-xl border border-white/15 bg-slate-800/60 px-3 text-sm text-white" placeholder="Địa chỉ" value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} required />
                        <input className="h-10 rounded-xl border border-white/15 bg-slate-800/60 px-3 text-sm text-white" placeholder="Số điện thoại" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
                        <input type="email" className="h-10 rounded-xl border border-white/15 bg-slate-800/60 px-3 text-sm text-white" placeholder="Email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
                        <select className="h-10 rounded-xl border border-white/15 bg-slate-800/60 px-3 text-sm text-white" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as "active" | "inactive" }))}>
                            <option value="active">{libraryStatusLabel.active}</option>
                            <option value="inactive">{libraryStatusLabel.inactive}</option>
                        </select>
                        <input type="time" className="h-10 rounded-xl border border-white/15 bg-slate-800/60 px-3 text-sm text-white" value={form.open} onChange={(e) => setForm((p) => ({ ...p, open: e.target.value }))} />
                        <input type="time" className="h-10 rounded-xl border border-white/15 bg-slate-800/60 px-3 text-sm text-white" value={form.close} onChange={(e) => setForm((p) => ({ ...p, close: e.target.value }))} />
                        <input className="h-10 rounded-xl border border-white/15 bg-slate-800/60 px-3 text-sm text-white md:col-span-2" placeholder="Mô tả" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />

                        <div className="flex items-center gap-2">
                            <button type="submit" disabled={submitting} className="h-10 rounded-xl bg-blue-600 px-4 text-white text-sm font-semibold hover:bg-blue-500 disabled:opacity-60">
                                {submitting ? "Đang lưu..." : editingId ? "Cập nhật" : "Tạo mới"}
                            </button>
                            {editingId && (
                                <button type="button" onClick={resetForm} className="h-10 rounded-xl border border-white/15 bg-white/5 px-4 text-sm text-slate-200 hover:bg-white/10 inline-flex items-center gap-1.5">
                                    <X className="h-4 w-4" /> Hủy
                                </button>
                            )}
                        </div>
                    </form>
                </section>

                <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
                    <h2 className="text-white font-semibold mb-4">Danh sách thư viện</h2>

                    {loading ? (
                        <div className="flex items-center gap-2 text-slate-300 text-sm">
                            <Loader2 className="h-4 w-4 animate-spin" /> Đang tải...
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[760px] text-sm">
                                <thead>
                                    <tr className="text-left text-slate-400 border-b border-white/10">
                                        <th className="py-2 pr-3">Tên</th>
                                        <th className="py-2 pr-3">Mã</th>
                                        <th className="py-2 pr-3">Trạng thái</th>
                                        <th className="py-2 pr-3">Giờ mở cửa</th>
                                        <th className="py-2 pr-3">Email</th>
                                        <th className="py-2 text-right">Hành động</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {libraries.map((library) => (
                                        <tr key={library._id} className="border-b border-white/5 text-slate-200">
                                            <td className="py-2 pr-3">{library.name}</td>
                                            <td className="py-2 pr-3">{library.code}</td>
                                            <td className="py-2 pr-3">{libraryStatusLabel[library.status] ?? library.status}</td>
                                            <td className="py-2 pr-3">{library.workingHours?.open || "08:00"} - {library.workingHours?.close || "17:00"}</td>
                                            <td className="py-2 pr-3">{library.email || "-"}</td>
                                            <td className="py-2 text-right">
                                                <div className="inline-flex items-center gap-2">
                                                    <button type="button" onClick={() => handleEdit(library)} className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1 text-xs text-indigo-200 hover:bg-indigo-500/20 inline-flex items-center gap-1">
                                                        <Pencil className="h-3.5 w-3.5" /> Sửa
                                                    </button>
                                                    <button type="button" onClick={() => void handleDelete(library)} className="rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-xs text-red-200 hover:bg-red-500/20 inline-flex items-center gap-1">
                                                        <Trash2 className="h-3.5 w-3.5" /> Xóa
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
            </div>
        </RouteGuard>
    );
}
