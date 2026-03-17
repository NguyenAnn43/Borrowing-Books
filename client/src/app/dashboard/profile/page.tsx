"use client";

import { type ChangeEvent, type ElementType, useEffect, useRef, useState } from "react";
import { Building2, CalendarClock, ImageUp, Mail, Pencil, Phone, RefreshCw, Save, Shield, UserRound, X } from "lucide-react";
import { RouteGuard } from "@/components/RouteGuard";
import { useAuthStore } from "@/stores/authStore";
import { userService } from "@/services/userService";

const roleLabel: Record<string, string> = {
    admin: "Quản trị viên",
    librarian: "Thủ thư",
    user: "Độc giả",
    guest: "Khách",
};

const statusLabel: Record<string, string> = {
    active: "Đang hoạt động",
    inactive: "Tạm ngưng",
    banned: "Bị khóa",
};

const statusColor: Record<string, string> = {
    active: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    inactive: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    banned: "bg-red-500/20 text-red-300 border-red-500/30",
};

const formatDateTime = (value?: string): string => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";

    return new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(date);
};

interface ProfileFieldProps {
    label: string;
    value: string;
    icon: ElementType;
}

function ProfileField({ label, value, icon: Icon }: ProfileFieldProps) {
    return (
        <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">{label}</p>
            <div className="flex items-center gap-2 text-slate-100">
                <Icon className="h-4 w-4 text-blue-300" />
                <span className="text-sm break-all">{value}</span>
            </div>
        </div>
    );
}

export default function ProfilePage() {
    const { user, isLoading, getCurrentUser } = useAuthStore();
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [fullName, setFullName] = useState("");
    const [phone, setPhone] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    useEffect(() => {
        setFullName(user?.fullName ?? "");
        setPhone(user?.phone ?? "");
    }, [user]);

    const canEdit = Boolean(user && user.role !== "guest");

    const handleStartEdit = () => {
        setError(null);
        setSuccessMessage(null);
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        setFullName(user?.fullName ?? "");
        setPhone(user?.phone ?? "");
        setError(null);
        setSuccessMessage(null);
        setIsEditing(false);
    };

    const handleSaveProfile = async () => {
        if (!user?._id) return;

        const normalizedName = fullName.trim();
        const normalizedPhone = phone.trim();

        if (!normalizedName) {
            setError("Họ tên không được để trống.");
            return;
        }

        setIsSaving(true);
        setError(null);
        setSuccessMessage(null);

        try {
            await userService.updateUser(user._id, {
                fullName: normalizedName,
                phone: normalizedPhone || undefined,
            });
            await getCurrentUser();
            setSuccessMessage("Cập nhật hồ sơ thành công.");
            setIsEditing(false);
        } catch (saveError) {
            const message = saveError instanceof Error ? saveError.message : "Không thể cập nhật hồ sơ.";
            setError(message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleAvatarUpload = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !user?._id) return;

        if (!file.type.startsWith("image/")) {
            setError("Vui lòng chọn file ảnh hợp lệ.");
            event.target.value = "";
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setError("Kích thước ảnh tối đa là 5MB.");
            event.target.value = "";
            return;
        }

        setIsUploadingAvatar(true);
        setError(null);
        setSuccessMessage(null);

        try {
            await userService.uploadAvatar(user._id, file);
            await getCurrentUser();
            setSuccessMessage("Cập nhật ảnh đại diện thành công.");
        } catch (uploadError) {
            const message = uploadError instanceof Error ? uploadError.message : "Không thể tải ảnh lên.";
            setError(message);
        } finally {
            setIsUploadingAvatar(false);
            event.target.value = "";
        }
    };

    return (
        <RouteGuard allowedRoles={["admin", "librarian", "user", "guest"]}>
            <div className="p-8">
                <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Hồ sơ cá nhân</h1>
                        <p className="text-slate-400 mt-1 text-sm">Xem thông tin tài khoản hiện tại</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => void getCurrentUser()}
                        disabled={isLoading || isSaving}
                        className="inline-flex items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-300 hover:bg-blue-500/20 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                    >
                        <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                        Làm mới
                    </button>
                </div>

                {error && (
                    <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                        {error}
                    </div>
                )}

                {successMessage && (
                    <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                        {successMessage}
                    </div>
                )}

                {!user ? (
                    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 text-slate-300">
                        Không tải được thông tin hồ sơ.
                    </div>
                ) : (
                    <>
                        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 mb-6">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        {user.avatar ? (
                                            <img
                                                src={user.avatar}
                                                alt="Avatar"
                                                className="h-14 w-14 rounded-full object-cover border border-white/20"
                                            />
                                        ) : (
                                            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold">
                                                {(user.fullName || "U").charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-semibold text-white">{user.fullName}</h2>
                                        <p className="text-slate-400 text-sm">ID: {user._id}</p>
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/20 px-3 py-1 text-xs text-blue-200">
                                        <Shield className="h-3.5 w-3.5" />
                                        {roleLabel[user.role] ?? user.role}
                                    </span>
                                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs ${statusColor[user.status] ?? "bg-slate-500/20 text-slate-300 border-slate-500/30"}`}>
                                        {statusLabel[user.status] ?? user.status}
                                    </span>
                                    {canEdit && !isEditing && (
                                        <button
                                            type="button"
                                            onClick={handleStartEdit}
                                            className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs text-indigo-200 hover:bg-indigo-500/20 transition-all"
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                            Chỉnh sửa
                                        </button>
                                    )}
                                    {canEdit && (
                                        <>
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={handleAvatarUpload}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={isUploadingAvatar}
                                                className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs text-sky-200 hover:bg-sky-500/20 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                                            >
                                                <ImageUp className="h-3.5 w-3.5" />
                                                {isUploadingAvatar ? "Đang tải ảnh..." : "Upload ảnh"}
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {isEditing && canEdit && (
                            <div className="mb-6 rounded-2xl border border-indigo-500/20 bg-slate-900/60 p-5">
                                <h3 className="text-sm font-semibold text-indigo-200 mb-4">Cập nhật thông tin hồ sơ</h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <label className="block">
                                        <span className="mb-1.5 block text-xs text-slate-400 uppercase tracking-wide">Họ tên</span>
                                        <input
                                            value={fullName}
                                            onChange={(event) => setFullName(event.target.value)}
                                            className="h-10 w-full rounded-xl border border-white/15 bg-slate-800/60 px-3 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
                                            placeholder="Nhập họ tên"
                                            disabled={isSaving}
                                        />
                                    </label>

                                    <label className="block">
                                        <span className="mb-1.5 block text-xs text-slate-400 uppercase tracking-wide">Số điện thoại</span>
                                        <input
                                            value={phone}
                                            onChange={(event) => setPhone(event.target.value)}
                                            className="h-10 w-full rounded-xl border border-white/15 bg-slate-800/60 px-3 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
                                            placeholder="Nhập số điện thoại"
                                            disabled={isSaving}
                                        />
                                    </label>
                                </div>

                                <div className="mt-4 flex flex-wrap items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => void handleSaveProfile()}
                                        disabled={isSaving}
                                        className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                                    >
                                        <Save className="h-4 w-4" />
                                        {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleCancelEdit}
                                        disabled={isSaving}
                                        className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-white/10 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                                    >
                                        <X className="h-4 w-4" />
                                        Hủy
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <ProfileField label="Email" value={user.email || "-"} icon={Mail} />
                            <ProfileField label="Số điện thoại" value={user.phone || "Chưa cập nhật"} icon={Phone} />
                            <ProfileField
                                label="Thư viện"
                                value={user.libraryId ? `${user.libraryId.name} (${user.libraryId.code})` : "Chưa gán thư viện"}
                                icon={Building2}
                            />
                            <ProfileField label="Loại tài khoản" value={roleLabel[user.role] ?? user.role} icon={UserRound} />
                            <ProfileField label="Ngày tạo" value={formatDateTime(user.createdAt)} icon={CalendarClock} />
                            <ProfileField label="Cập nhật gần nhất" value={formatDateTime(user.updatedAt)} icon={CalendarClock} />
                        </div>

                        <div className="mt-6 rounded-2xl border border-white/10 bg-slate-900/60 p-5">
                            <p className="text-sm text-slate-300">
                                Hạn mức mượn hiện tại: <span className="font-semibold text-white">{user.maxBorrowLimit}</span> quyển.
                            </p>
                        </div>
                    </>
                )}
            </div>
        </RouteGuard>
    );
}
