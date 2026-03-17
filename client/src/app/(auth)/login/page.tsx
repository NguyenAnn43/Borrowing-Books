"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { BookOpen, Mail, Lock, Eye, EyeOff, BookMarked, Library, LogIn, UserRound, UserCheck } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

const loginSchema = z.object({
    email: z.string().email("Email không hợp lệ"),
    password: z.string().min(1, "Mật khẩu là bắt buộc"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
    const router = useRouter();
    const { login, isLoading, error, clearError, isAuthenticated, user, logout, continueAsGuest, lastLoginAccount, getCurrentUser } = useAuthStore();
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(() => {
        if (typeof window === "undefined") return false;
        return Boolean(localStorage.getItem("rememberedEmail"));
    });
    const [showLoginForm, setShowLoginForm] = useState(false);

    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors },
    } = useForm<LoginForm>({
        resolver: zodResolver(loginSchema),
    });

    useEffect(() => {
        if (isAuthenticated || user?.role === "guest") return;

        const token =
            typeof window !== "undefined"
                ? localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken")
                : null;

        if (token) {
            void getCurrentUser();
        }
    }, [getCurrentUser, isAuthenticated, user]);

    useEffect(() => {
        const rememberedEmail = localStorage.getItem("rememberedEmail");
        if (rememberedEmail) {
            setValue("email", rememberedEmail);
        }
    }, [setValue]);

    const onSubmit = async (data: LoginForm) => {
        clearError();
        try {
            await login(data, rememberMe);

            if (rememberMe) {
                localStorage.setItem("rememberedEmail", data.email);
            } else {
                localStorage.removeItem("rememberedEmail");
            }

            // Redirect based on role (user is set in store after login)
            const stored = JSON.parse(localStorage.getItem("auth-storage") || "{}");
            const role = stored?.state?.user?.role;
            if (role === "admin") router.push("/dashboard/admin");
            else if (role === "librarian") router.push("/dashboard/librarian");
            else router.push("/dashboard/user");
        } catch {
            // Error is handled in store
        }
    };

    const redirectByRole = (role?: string) => {
        if (role === "admin") router.push("/dashboard/admin");
        else if (role === "librarian") router.push("/dashboard/librarian");
        else if (role === "guest") router.push("/dashboard/guest");
        else router.push("/dashboard/user");
    };

    const handleContinueWithCurrent = () => {
        if (user?.role) {
            redirectByRole(user.role);
        }
    };

    const handleLoginAnotherAccount = async () => {
        await logout();
        setShowLoginForm(true);
        clearError();
    };

    const handleContinueGuest = () => {
        continueAsGuest();
        router.push("/dashboard/guest");
    };

    return (
        <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
            {/* Bookshelf background */}
            <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{
                    backgroundImage:
                        "url('https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1920&q=80')",
                }}
            />
            {/* Brighter blue overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-900/50 via-slate-900/35 to-indigo-900/45" />

            {/* Floating book icons (decorative) */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <BookMarked className="absolute top-[12%] left-[8%] h-8 w-8 text-blue-400/20 rotate-[-15deg]" />
                <Library className="absolute top-[20%] right-[10%] h-10 w-10 text-indigo-400/20" />
                <BookOpen className="absolute bottom-[18%] left-[12%] h-7 w-7 text-blue-300/20 rotate-12" />
                <BookMarked className="absolute bottom-[25%] right-[8%] h-9 w-9 text-blue-400/15 rotate-[-8deg]" />
            </div>

            {/* Card */}
            <div className="relative z-10 w-full max-w-md mx-4">
                {/* Branding above card */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-2xl shadow-blue-500/40 mb-4">
                        <BookOpen className="h-8 w-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">
                        Borrowing<span className="text-blue-400">Books</span>
                    </h1>
                    <p className="text-blue-200/70 text-sm mt-1">Hệ thống thư viện liên trường</p>
                </div>

                {/* Form card */}
                <div className="bg-white/16 backdrop-blur-xl border border-white/25 rounded-2xl shadow-2xl p-8">
                    <h2 className="text-xl font-semibold text-white mb-1">Đăng nhập</h2>
                    <p className="text-blue-200/70 text-sm mb-6">
                        Chào mừng trở lại! Vui lòng nhập thông tin của bạn.
                    </p>

                    {!showLoginForm && isAuthenticated && user?.role !== "guest" ? (
                        <div className="space-y-4">
                            <div className="rounded-xl border border-white/20 bg-white/10 p-4">
                                <p className="text-blue-100 text-sm mb-3">Bạn đã đăng nhập sẵn bằng tài khoản:</p>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-blue-500/30 border border-blue-400/30 flex items-center justify-center text-white font-semibold">
                                        {user?.fullName?.charAt(0).toUpperCase() || "U"}
                                    </div>
                                    <div>
                                        <p className="text-white font-medium text-sm">{user?.fullName}</p>
                                        <p className="text-blue-200/70 text-xs">{user?.email}</p>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={handleContinueWithCurrent}
                                className="w-full h-11 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm transition-all shadow-lg shadow-blue-700/30 hover:shadow-blue-500/40 flex items-center justify-center gap-2"
                            >
                                <UserCheck className="h-4 w-4" />
                                Tiếp tục với tài khoản này
                            </button>

                            <button
                                type="button"
                                onClick={handleLoginAnotherAccount}
                                className="w-full h-11 rounded-xl border border-white/25 bg-white/10 hover:bg-white/15 text-blue-100 font-medium text-sm transition-all flex items-center justify-center gap-2"
                            >
                                <LogIn className="h-4 w-4" />
                                Đăng nhập tài khoản khác
                            </button>

                            <button
                                type="button"
                                onClick={handleContinueGuest}
                                className="w-full h-11 rounded-xl border border-white/20 bg-transparent hover:bg-white/10 text-blue-200/90 font-medium text-sm transition-all"
                            >
                                Vào với vai trò guest
                            </button>
                        </div>
                    ) : (
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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

                        {/* Email */}
                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-blue-100">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-300/60 pointer-events-none" />
                                <input
                                    type="email"
                                    placeholder="email@example.com"
                                    autoComplete="username"
                                    {...register("email")}
                                    className="w-full h-11 pl-10 pr-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-blue-300/40 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30 transition-all text-sm"
                                />
                            </div>
                            {errors.email && (
                                <p className="text-xs text-red-400">{errors.email.message}</p>
                            )}
                        </div>

                        {/* Password */}
                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-blue-100">Mật khẩu</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-300/60 pointer-events-none" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    autoComplete="current-password"
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
                            {errors.password && (
                                <p className="text-xs text-red-400">{errors.password.message}</p>
                            )}
                        </div>

                        <div className="flex items-center justify-between text-sm">
                            <label className="flex items-center gap-2 cursor-pointer text-blue-200/70">
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="w-4 h-4 rounded border-white/20 bg-white/10 text-blue-500 focus:ring-blue-500"
                                />
                                Ghi nhớ đăng nhập 7 ngày
                            </label>
                            <Link
                                href="/forgot-password"
                                className="text-blue-400 hover:text-blue-300 transition-colors"
                            >
                                Quên mật khẩu?
                            </Link>
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
                            {isLoading ? "Đang đăng nhập..." : "Đăng nhập"}
                        </button>

                        {lastLoginAccount && !isAuthenticated && (
                            <button
                                type="button"
                                onClick={() => {
                                    setValue("email", lastLoginAccount.email);
                                    setRememberMe(true);
                                }}
                                className="w-full h-10 rounded-xl border border-white/20 bg-white/8 hover:bg-white/12 text-blue-100 text-sm transition-all flex items-center justify-center gap-2"
                            >
                                <UserRound className="h-4 w-4" />
                                Dùng tài khoản gần nhất: {lastLoginAccount.email}
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={handleContinueGuest}
                            className="w-full h-10 rounded-xl border border-white/20 bg-transparent hover:bg-white/10 text-blue-200/90 text-sm transition-all"
                        >
                            Vào với vai trò guest
                        </button>
                    </form>
                    )}

                    <div className="mt-6 text-center text-sm text-blue-200/60">
                        Chưa có tài khoản?{" "}
                        <Link
                            href="/register"
                            className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
                        >
                            Đăng ký ngay
                        </Link>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-xs text-blue-300/30 mt-6">
                    © 2026 BorrowingBooks · Hệ thống thư viện liên trường
                </p>
            </div>
        </div>
    );
}
