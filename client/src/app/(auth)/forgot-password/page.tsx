"use client";

import Link from "next/link";
import { useState } from "react";
import { Mail, BookOpen } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import api, { ApiResponse } from "@/lib/api";
import type { IForgotPasswordResponse } from "@/types";

const forgotPasswordSchema = z.object({
    email: z.string().email("Email khong hop le"),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [previewResetUrl, setPreviewResetUrl] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ForgotPasswordForm>({
        resolver: zodResolver(forgotPasswordSchema),
    });

    const onSubmit = async (data: ForgotPasswordForm) => {
        setError(null);
        setSuccessMessage(null);
        setPreviewResetUrl(null);
        setIsSubmitting(true);

        try {
            const response = await api.post<ApiResponse<IForgotPasswordResponse>>("/auth/forgot-password", {
                email: data.email.trim().toLowerCase(),
            });

            setSuccessMessage(
                response.data.message || "Neu email ton tai, he thong da gui lien ket dat lai mat khau."
            );
            if (response.data.data.previewResetUrl) {
                setPreviewResetUrl(response.data.data.previewResetUrl);
            }
        } catch (requestError) {
            const message = (requestError as { response?: { data?: { error?: { message?: string }; message?: string } } })
                ?.response?.data?.error?.message
                || (requestError as { response?: { data?: { message?: string } } })?.response?.data?.message
                || "Khong the gui yeu cau dat lai mat khau.";
            setError(message);
        } finally {
            setIsSubmitting(false);
        }
    };

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

            <div className="relative z-10 w-full max-w-md">
                <div className="mb-6 text-center">
                    <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-xl shadow-blue-500/35">
                        <BookOpen className="h-7 w-7 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Quen Mat Khau</h1>
                    <p className="mt-1 text-sm text-blue-200/75">Nhap email de nhan lien ket dat lai mat khau</p>
                </div>

                <div className="rounded-2xl border border-white/25 bg-white/15 p-6 backdrop-blur-xl shadow-2xl">
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
                    {previewResetUrl && (
                        <div className="mb-4 rounded-lg border border-blue-400/30 bg-blue-500/10 p-3 text-sm text-blue-100 break-words">
                            Dev preview link:{" "}
                            <Link href={previewResetUrl} className="font-medium underline hover:text-blue-200">
                                Mo trang reset
                            </Link>
                        </div>
                    )}

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-blue-100">Email</label>
                            <div className="relative">
                                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-300/60" />
                                <input
                                    type="email"
                                    autoComplete="email"
                                    placeholder="email@example.com"
                                    {...register("email")}
                                    className="h-11 w-full rounded-xl border border-white/20 bg-white/10 pl-10 pr-4 text-sm text-white placeholder-blue-300/50 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30"
                                />
                            </div>
                            {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex h-11 w-full items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-sm font-semibold text-white shadow-lg shadow-blue-700/30 transition hover:from-blue-500 hover:to-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isSubmitting ? "Dang gui..." : "Gui lien ket dat lai mat khau"}
                        </button>
                    </form>

                    <div className="mt-5 text-center text-sm text-blue-200/75">
                        <Link href="/login" className="font-medium text-blue-300 transition hover:text-blue-200">
                            Quay lai dang nhap
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
