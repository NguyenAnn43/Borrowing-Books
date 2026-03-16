"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { BookOpen, Mail, Lock, Eye, EyeOff, User, Phone, BookMarked, Library } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

const registerSchema = z
    .object({
        fullName: z.string().min(2, "Họ tên phải có ít nhất 2 ký tự"),
        email: z.string().email("Email không hợp lệ"),
        phone: z.string().optional(),
        password: z
            .string()
            .min(8, "Mật khẩu phải có ít nhất 8 ký tự")
            .regex(
                /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                "Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 số"
            ),
        confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Mật khẩu xác nhận không khớp",
        path: ["confirmPassword"],
    });

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
    const router = useRouter();
    const { register: registerUser, isLoading, error, clearError } = useAuthStore();
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<RegisterForm>({
        resolver: zodResolver(registerSchema),
    });

    const onSubmit = async (data: RegisterForm) => {
        clearError();
        try {
            await registerUser({
                email: data.email,
                password: data.password,
                fullName: data.fullName,
                phone: data.phone,
            });
            router.push("/dashboard/user");
        } catch {
            // Error is handled in store
        }
    };

    return (
        <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
            <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{
                    backgroundImage:
                        "url('https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1920&q=80')",
                }}
            />
            <div className="absolute inset-0 bg-gradient-to-br from-blue-900/50 via-slate-900/35 to-indigo-900/45" />

            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <BookMarked className="absolute top-[12%] left-[8%] h-8 w-8 text-blue-400/20 rotate-[-15deg]" />
                <Library className="absolute top-[20%] right-[10%] h-10 w-10 text-indigo-400/20" />
                <BookOpen className="absolute bottom-[18%] left-[12%] h-7 w-7 text-blue-300/20 rotate-12" />
                <BookMarked className="absolute bottom-[25%] right-[8%] h-9 w-9 text-blue-400/15 rotate-[-8deg]" />
            </div>

            <div className="relative z-10 w-full max-w-md mx-4 my-8">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-2xl shadow-blue-500/40 mb-4">
                        <BookOpen className="h-8 w-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">
                        Borrowing<span className="text-blue-400">Books</span>
                    </h1>
                    <p className="text-blue-200/70 text-sm mt-1">Hệ thống thư viện liên trường</p>
                </div>

                <div className="bg-white/16 backdrop-blur-xl border border-white/25 rounded-2xl shadow-2xl p-8">
                    <h2 className="text-xl font-semibold text-white mb-1">Tạo tài khoản</h2>
                    <p className="text-blue-200/70 text-sm mb-6">
                        Điền thông tin để bắt đầu sử dụng hệ thống.
                    </p>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        {error && (
                            <div className="flex items-start justify-between p-3 rounded-lg bg-red-500/15 border border-red-400/30 text-red-300 text-sm">
                                <span>{error}</span>
                                <button
                                    type="button"
                                    onClick={clearError}
                                    className="ml-2 text-red-300/70 hover:text-red-200 flex-shrink-0 leading-none text-lg"
                                >
                                    ×
                                </button>
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-blue-100">Họ và tên</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-300/60 pointer-events-none" />
                                <input
                                    type="text"
                                    placeholder="Nguyễn Văn A"
                                    autoComplete="name"
                                    {...register("fullName")}
                                    className="w-full h-11 pl-10 pr-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-blue-300/40 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30 transition-all text-sm"
                                />
                            </div>
                            {errors.fullName && <p className="text-xs text-red-400">{errors.fullName.message}</p>}
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-blue-100">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-300/60 pointer-events-none" />
                                <input
                                    type="email"
                                    placeholder="email@example.com"
                                    autoComplete="email"
                                    {...register("email")}
                                    className="w-full h-11 pl-10 pr-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-blue-300/40 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30 transition-all text-sm"
                                />
                            </div>
                            {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-blue-100">Số điện thoại (tùy chọn)</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-300/60 pointer-events-none" />
                                <input
                                    type="tel"
                                    placeholder="0123456789"
                                    autoComplete="tel"
                                    {...register("phone")}
                                    className="w-full h-11 pl-10 pr-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-blue-300/40 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30 transition-all text-sm"
                                />
                            </div>
                            {errors.phone && <p className="text-xs text-red-400">{errors.phone.message}</p>}
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-blue-100">Mật khẩu</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-300/60 pointer-events-none" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    autoComplete="new-password"
                                    {...register("password")}
                                    className="w-full h-11 pl-10 pr-11 rounded-xl bg-white/10 border border-white/20 text-white placeholder-blue-300/40 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30 transition-all text-sm"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-300/60 hover:text-blue-200 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-blue-100">Xác nhận mật khẩu</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-300/60 pointer-events-none" />
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    autoComplete="new-password"
                                    {...register("confirmPassword")}
                                    className="w-full h-11 pl-10 pr-11 rounded-xl bg-white/10 border border-white/20 text-white placeholder-blue-300/40 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30 transition-all text-sm"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-300/60 hover:text-blue-200 transition-colors"
                                >
                                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            {errors.confirmPassword && (
                                <p className="text-xs text-red-400">{errors.confirmPassword.message}</p>
                            )}
                        </div>

                        <div className="flex items-start gap-2 text-sm text-blue-200/70">
                            <input
                                type="checkbox"
                                required
                                className="w-4 h-4 mt-0.5 rounded border-white/20 bg-white/10 text-blue-500 focus:ring-blue-500"
                            />
                            <span>
                                Tôi đồng ý với{" "}
                                <Link href="/terms" className="text-blue-400 hover:text-blue-300 transition-colors">
                                    Điều khoản dịch vụ
                                </Link>{" "}
                                và{" "}
                                <Link href="/privacy" className="text-blue-400 hover:text-blue-300 transition-colors">
                                    Chính sách bảo mật
                                </Link>
                            </span>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-11 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all shadow-lg shadow-blue-700/30 hover:shadow-blue-500/40 flex items-center justify-center gap-2"
                        >
                            {isLoading && (
                                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                            )}
                            {isLoading ? "Đang tạo tài khoản..." : "Đăng ký"}
                        </button>
                    </form>

                    <div className="mt-6 text-center text-sm text-blue-200/60">
                        Đã có tài khoản?{" "}
                        <Link
                            href="/login"
                            className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
                        >
                            Đăng nhập
                        </Link>
                    </div>
                </div>

                <p className="text-center text-xs text-blue-300/30 mt-6">
                    © 2026 BorrowingBooks · Hệ thống thư viện liên trường
                </p>
            </div>
        </div>
    );
}
