"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Eye, Loader2, ShieldPlus, Trash2, X } from "lucide-react";
import { RouteGuard } from "@/components/RouteGuard";
import { userService } from "@/services/userService";
import { libraryService } from "@/services/libraryService";
import type { ILibrary, IUser } from "@/types";

const DEFAULT_STAFF_FORM = {
    fullName: "",
    email: "",
    password: "",
    phone: "",
    role: "librarian" as "admin" | "librarian",
    libraryId: "",
};

interface ApiErrorShape {
    response?: {
        data?: {
            error?: {
                message?: string;
                details?: Array<{ field?: string; message?: string }>;
            };
            message?: string;
        };
    };
    message?: string;
}

const extractApiErrorMessage = (error: unknown, fallback: string): string => {
    const err = error as ApiErrorShape;
    const detailMessage = err.response?.data?.error?.details?.[0]?.message;
    const errorMessage = err.response?.data?.error?.message;
    const rootMessage = err.response?.data?.message;
    return detailMessage || errorMessage || rootMessage || err.message || fallback;
};

const isStrongPassword = (value: string): boolean => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(value);

export default function AdminUsersPage() {
    const [users, setUsers] = useState<IUser[]>([]);
    const [libraries, setLibraries] = useState<ILibrary[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [staffForm, setStaffForm] = useState(DEFAULT_STAFF_FORM);
    const [detailUser, setDetailUser] = useState<IUser | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [{ users: fetchedUsers }, { libraries: fetchedLibraries }] = await Promise.all([
                userService.getUsers({ page: 1, limit: 100 }),
                libraryService.getLibraries({ page: 1, limit: 100 }),
            ]);
            setUsers(fetchedUsers);
            setLibraries(fetchedLibraries);
        } catch (fetchError) {
            const message = fetchError instanceof Error ? fetchError.message : "Không tải được dữ liệu người dùng.";
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void fetchData();
    }, []);

    const filteredLibraries = useMemo(() => libraries.filter((item) => item.status === "active"), [libraries]);

    const handleCreateStaff = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);
        setSuccess(null);

        if (staffForm.fullName.trim().length < 2) {
            setError("Họ tên phải có ít nhất 2 ký tự.");
            return;
        }

        if (!isStrongPassword(staffForm.password)) {
            setError("Mật khẩu phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường và số.");
            return;
        }

        if (staffForm.role === "librarian" && !staffForm.libraryId) {
            setError("Vui lòng chọn thư viện cho thủ thư.");
            return;
        }

        setSubmitting(true);
        try {
            await userService.createStaff({
                fullName: staffForm.fullName.trim(),
                email: staffForm.email.trim(),
                password: staffForm.password,
                phone: staffForm.phone.trim() || undefined,
                role: staffForm.role,
                libraryId: staffForm.role === "librarian" ? staffForm.libraryId : undefined,
            });
            setSuccess("Tạo tài khoản nhân sự thành công.");
            setStaffForm(DEFAULT_STAFF_FORM);
            await fetchData();
        } catch (createError) {
            const message = extractApiErrorMessage(createError, "Không thể tạo tài khoản.");
            setError(message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteUser = async (target: IUser) => {
        if (!confirm(`Xóa người dùng ${target.fullName}?`)) return;

        setError(null);
        setSuccess(null);
        try {
            await userService.deleteUser(target._id);
            setSuccess("Xóa người dùng thành công.");
            await fetchData();
        } catch (deleteError) {
            const message = deleteError instanceof Error ? deleteError.message : "Không thể xóa người dùng.";
            setError(message);
        }
    };

    const handleRoleUpdate = async (target: IUser, role: IUser["role"]) => {
        setError(null);
        setSuccess(null);

        let libraryId: string | undefined;
        if (role === "librarian") {
            libraryId = target.libraryId?._id;

            if (!libraryId) {
                if (filteredLibraries.length === 0) {
                    setError("Không có thư viện active để gán cho librarian.");
                    return;
                }

                if (filteredLibraries.length === 1) {
                    libraryId = filteredLibraries[0]._id;
                } else {
                    const options = filteredLibraries.map((item) => `${item.code} - ${item.name}`).join("\n");
                    const selectedCode = window.prompt(`Nhập MÃ thư viện để gán librarian:\n${options}`)?.trim().toUpperCase();

                    if (!selectedCode) {
                        setError("Bạn cần chọn thư viện để set role librarian.");
                        return;
                    }

                    const selectedLibrary = filteredLibraries.find((item) => item.code.toUpperCase() === selectedCode);
                    if (!selectedLibrary) {
                        setError("Mã thư viện không hợp lệ.");
                        return;
                    }

                    libraryId = selectedLibrary._id;
                }
            }
        }

        try {
            await userService.updateUserRole(target._id, {
                role,
                libraryId,
            });
            setSuccess("Cập nhật role thành công.");
            await fetchData();
        } catch (roleError) {
            const message = roleError instanceof Error ? roleError.message : "Không thể cập nhật role.";
            setError(message);
        }
    };

    const handleViewDetail = async (target: IUser) => {
        setError(null);
        setDetailLoading(true);
        try {
            const user = await userService.getUserById(target._id);
            setDetailUser(user);
        } catch (detailError) {
            const message = extractApiErrorMessage(detailError, "Không tải được chi tiết người dùng.");
            setError(message);
        } finally {
            setDetailLoading(false);
        }
    };

    return (
        <RouteGuard allowedRoles={["admin"]}>
            <div className="p-8 space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">Quản lý người dùng</h1>
                    <p className="text-sm text-slate-400 mt-1">Admin: xem danh sách, phân quyền, tạo staff</p>
                </div>

                {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
                {success && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{success}</div>}

                <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
                    <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
                        <ShieldPlus className="h-4 w-4 text-blue-400" />
                        Tạo tài khoản staff
                    </h2>
                    <form onSubmit={handleCreateStaff} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        <input
                            className="h-10 rounded-xl border border-white/15 bg-slate-800/60 px-3 text-sm text-white"
                            placeholder="Họ tên"
                            value={staffForm.fullName}
                            onChange={(event) => setStaffForm((prev) => ({ ...prev, fullName: event.target.value }))}
                            required
                        />
                        <input
                            type="email"
                            className="h-10 rounded-xl border border-white/15 bg-slate-800/60 px-3 text-sm text-white"
                            placeholder="Email"
                            value={staffForm.email}
                            onChange={(event) => setStaffForm((prev) => ({ ...prev, email: event.target.value }))}
                            required
                        />
                        <input
                            type="password"
                            className="h-10 rounded-xl border border-white/15 bg-slate-800/60 px-3 text-sm text-white"
                            placeholder="Mật khẩu"
                            value={staffForm.password}
                            onChange={(event) => setStaffForm((prev) => ({ ...prev, password: event.target.value }))}
                            required
                        />
                        <p className="text-[11px] text-slate-400 md:col-span-2 lg:col-span-3 -mt-1">
                            Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường và số.
                        </p>
                        <input
                            className="h-10 rounded-xl border border-white/15 bg-slate-800/60 px-3 text-sm text-white"
                            placeholder="Số điện thoại"
                            value={staffForm.phone}
                            onChange={(event) => setStaffForm((prev) => ({ ...prev, phone: event.target.value }))}
                        />
                        <select
                            className="h-10 rounded-xl border border-white/15 bg-slate-800/60 px-3 text-sm text-white"
                            value={staffForm.role}
                            onChange={(event) => setStaffForm((prev) => ({ ...prev, role: event.target.value as "admin" | "librarian" }))}
                        >
                            <option value="librarian">Librarian</option>
                            <option value="admin">Admin</option>
                        </select>
                        <select
                            className="h-10 rounded-xl border border-white/15 bg-slate-800/60 px-3 text-sm text-white"
                            value={staffForm.libraryId}
                            onChange={(event) => setStaffForm((prev) => ({ ...prev, libraryId: event.target.value }))}
                            disabled={staffForm.role !== "librarian"}
                        >
                            <option value="">Chọn thư viện</option>
                            {filteredLibraries.map((library) => (
                                <option key={library._id} value={library._id}>
                                    {library.name}
                                </option>
                            ))}
                        </select>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="h-10 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 disabled:opacity-60"
                        >
                            {submitting ? "Đang tạo..." : "Tạo staff"}
                        </button>
                    </form>
                </section>

                <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
                    <h2 className="text-white font-semibold mb-4">Danh sách người dùng</h2>

                    {loading ? (
                        <div className="flex items-center gap-2 text-slate-300 text-sm">
                            <Loader2 className="h-4 w-4 animate-spin" /> Đang tải...
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[780px] text-sm">
                                <thead>
                                    <tr className="text-left text-slate-400 border-b border-white/10">
                                        <th className="py-2 pr-3">Tên</th>
                                        <th className="py-2 pr-3">Email</th>
                                        <th className="py-2 pr-3">Vai trò</th>
                                        <th className="py-2 pr-3">Trạng thái</th>
                                        <th className="py-2 pr-3">Thư viện</th>
                                        <th className="py-2 text-right">Hành động</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((item) => (
                                        <tr key={item._id} className="border-b border-white/5 text-slate-200">
                                            <td className="py-2 pr-3">{item.fullName}</td>
                                            <td className="py-2 pr-3">{item.email}</td>
                                            <td className="py-2 pr-3">{item.role}</td>
                                            <td className="py-2 pr-3">{item.status}</td>
                                            <td className="py-2 pr-3">{item.libraryId?.name || "-"}</td>
                                            <td className="py-2 text-right">
                                                <div className="inline-flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => void handleViewDetail(item)}
                                                        className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-200 hover:bg-emerald-500/20 inline-flex items-center gap-1"
                                                    >
                                                        <Eye className="h-3.5 w-3.5" /> Chi tiết
                                                    </button>
                                                    {item.role !== "admin" && (
                                                        <button
                                                            type="button"
                                                            onClick={() => void handleRoleUpdate(item, item.role === "librarian" ? "user" : "librarian")}
                                                            className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-xs text-blue-200 hover:bg-blue-500/20"
                                                        >
                                                            {item.role === "librarian" ? "Set user" : "Set librarian"}
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => void handleDeleteUser(item)}
                                                        className="rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-xs text-red-200 hover:bg-red-500/20 inline-flex items-center gap-1"
                                                    >
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

                {detailUser && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
                        <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-slate-900 p-5 shadow-2xl">
                            <div className="mb-4 flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-white">Chi tiết người dùng</h3>
                                <button
                                    type="button"
                                    onClick={() => setDetailUser(null)}
                                    className="rounded-lg border border-white/15 bg-white/5 p-1.5 text-slate-200 hover:bg-white/10"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            {detailLoading ? (
                                <div className="flex items-center gap-2 text-slate-300 text-sm py-6">
                                    <Loader2 className="h-4 w-4 animate-spin" /> Đang tải chi tiết...
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                    <div className="rounded-xl border border-white/10 bg-slate-800/60 p-3"><span className="text-slate-400">ID:</span> <span className="text-white break-all">{detailUser._id}</span></div>
                                    <div className="rounded-xl border border-white/10 bg-slate-800/60 p-3"><span className="text-slate-400">Họ tên:</span> <span className="text-white">{detailUser.fullName}</span></div>
                                    <div className="rounded-xl border border-white/10 bg-slate-800/60 p-3"><span className="text-slate-400">Email:</span> <span className="text-white">{detailUser.email}</span></div>
                                    <div className="rounded-xl border border-white/10 bg-slate-800/60 p-3"><span className="text-slate-400">Phone:</span> <span className="text-white">{detailUser.phone || "-"}</span></div>
                                    <div className="rounded-xl border border-white/10 bg-slate-800/60 p-3"><span className="text-slate-400">Role:</span> <span className="text-white">{detailUser.role}</span></div>
                                    <div className="rounded-xl border border-white/10 bg-slate-800/60 p-3"><span className="text-slate-400">Status:</span> <span className="text-white">{detailUser.status}</span></div>
                                    <div className="rounded-xl border border-white/10 bg-slate-800/60 p-3 sm:col-span-2"><span className="text-slate-400">Thư viện:</span> <span className="text-white">{detailUser.libraryId ? `${detailUser.libraryId.name} (${detailUser.libraryId.code})` : "-"}</span></div>
                                    <div className="rounded-xl border border-white/10 bg-slate-800/60 p-3"><span className="text-slate-400">Created:</span> <span className="text-white">{new Date(detailUser.createdAt).toLocaleString("vi-VN")}</span></div>
                                    <div className="rounded-xl border border-white/10 bg-slate-800/60 p-3"><span className="text-slate-400">Updated:</span> <span className="text-white">{new Date(detailUser.updatedAt).toLocaleString("vi-VN")}</span></div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </RouteGuard>
    );
}
