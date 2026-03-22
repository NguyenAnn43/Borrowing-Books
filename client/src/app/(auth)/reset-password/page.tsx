"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Lock, Eye, EyeOff, BookOpen } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import api from "@/lib/api";

const resetPasswordSchema = z
    .object({
        newPassword: z
            .string()
            .min(8, "Mat khau phai co it nhat 8 ky tu")
            .regex(
                /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                "Mat khau phai co it nhat 1 chu hoa, 1 chu thuong va 1 so"
            ),
        confirmPassword: z.string(),
    })
    .refine((value) => value.newPassword === value.confirmPassword, {
        message: "Mat khau xac nhan khong khop",
        path: ["confirmPassword"],
    });

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

function AuthBackdrop({ children }: { children: React.ReactNode }) {
    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8">
            <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{
                    backgroundImage:
                        "url('https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1920&q=80')",
                }}
            />
            <div className="absolute inset-0 bg-gradient-to-br from-blue-900/55 via-slate-900/40 to-indigo-900/50" />
            <div className="relative z-10 w-full max-w-md">{children}</div>
        </div>
    );
}

function ResetPasswordFormContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get("token") || "";

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ResetPasswordForm>({
        resolver: zodResolver(resetPasswordSchema),
    });

    const onSubmit = async (data: ResetPasswordForm) => {
        setError(null);
        setSuccessMessage(null);

        if (!token) {
            setError("Lien ket dat lai mat khau khong hop le hoac da het han.");
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await api.post("/auth/reset-password", {
                token,
                newPassword: data.newPassword,
            });
            const message = (response.data as { message?: string })?.message || "Dat lai mat khau thanh cong.";
            setSuccessMessage(message);
        } catch (requestError) {
            const message = (requestError as { response?: { data?: { error?: { message?: string }; message?: string } } })
                ?.response?.data?.error?.message
                || (requestError as { response?: { data?: { message?: string } } })?.response?.data?.message
                || "Khong the dat lai mat khau.";
            setError(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <div className="mb-6 text-center">
                <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-xl shadow-blue-500/35">
                    <BookOpen className="h-7 w-7 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-white">Dat Lai Mat Khau</h1>
                <p className="mt-1 text-sm text-blue-200/75">Nhap mat khau moi cho tai khoan cua ban</p>
            </div>

            <div className="rounded-2xl border border-white/25 bg-white/15 p-6 backdrop-blur-xl shadow-2xl">
                {!token && (
                    <div className="mb-4 rounded-lg border border-amber-400/30 bg-amber-500/15 p-3 text-sm text-amber-100">
                        Lien ket dat lai mat khau khong hop le. Vui long gui yeu cau moi.
                    </div>
                )}

                {error && (
                    <div className="mb-4 rounded-lg border border-red-400/30 bg-red-500/15 p-3 text-sm text-red-200 break-words">
                        {error}
                    </div>
                )}
                {successMessage && (
                    <div className="mb-4 rounded-lg border border-emerald-400/30 bg-emerald-500/15 p-3 text-sm text-emerald-200 break-words">
                        {successMessage}
                    </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-blue-100">Mat khau moi</label>
                        <div className="relative">
                            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-300/60" />
                            <input
                                type={showPassword ? "text" : "password"}
                                autoComplete="new-password"
                                placeholder="••••••••"
                                {...register("newPassword")}
                                className="h-11 w-full rounded-xl border border-white/20 bg-white/10 pl-10 pr-11 text-sm text-white placeholder-blue-300/50 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((prev) => !prev)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-300/70 transition hover:text-blue-100"
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                        {errors.newPassword && <p className="text-xs text-red-400">{errors.newPassword.message}</p>}
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-blue-100">Xac nhan mat khau</label>
                        <div className="relative">
                            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-300/60" />
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                autoComplete="new-password"
                                placeholder="••••••••"
                                {...register("confirmPassword")}
                                className="h-11 w-full rounded-xl border border-white/20 bg-white/10 pl-10 pr-11 text-sm text-white placeholder-blue-300/50 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword((prev) => !prev)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-300/70 transition hover:text-blue-100"
                            >
                                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                        {errors.confirmPassword && <p className="text-xs text-red-400">{errors.confirmPassword.message}</p>}
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting || !token}
                        className="flex h-11 w-full items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-sm font-semibold text-white shadow-lg shadow-blue-700/30 transition hover:from-blue-500 hover:to-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isSubmitting ? "Dang cap nhat..." : "Cap nhat mat khau"}
                    </button>
                </form>

                <div className="mt-5 text-center text-sm text-blue-200/75">
                    <Link href="/login" className="font-medium text-blue-300 transition hover:text-blue-200">
                        Quay lai dang nhap
                    </Link>
                </div>
            </div>
        </>
    );
}

export default function ResetPasswordPage() {
    return (
        <AuthBackdrop>
            <Suspense
                fallback={
                    <div className="rounded-2xl border border-white/25 bg-white/15 p-6 text-center text-blue-100 backdrop-blur-xl shadow-2xl">
                        Dang tai du lieu...
                    </div>
                }
            >
                <ResetPasswordFormContent />
            </Suspense>
        </AuthBackdrop>
    );
}
