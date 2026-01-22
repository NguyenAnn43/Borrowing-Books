"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { BookOpen, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import { useAuthStore } from "@/stores/authStore";

const loginSchema = z.object({
    email: z.string().email("Email không hợp lệ"),
    password: z.string().min(1, "Mật khẩu là bắt buộc"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
    const router = useRouter();
    const { login, isLoading, error, clearError } = useAuthStore();
    const [showPassword, setShowPassword] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginForm>({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit = async (data: LoginForm) => {
        try {
            await login(data);
            router.push("/dashboard");
        } catch {
            // Error is handled in store
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
            </div>

            <Card variant="glass" className="w-full max-w-md relative z-10">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                            <BookOpen className="h-8 w-8 text-white" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl">Đăng nhập</CardTitle>
                    <p className="text-gray-500 mt-2">
                        Chào mừng bạn trở lại! Vui lòng đăng nhập để tiếp tục.
                    </p>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        {error && (
                            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
                                {error}
                                <button
                                    type="button"
                                    onClick={clearError}
                                    className="float-right text-red-400 hover:text-red-600"
                                >
                                    ×
                                </button>
                            </div>
                        )}

                        <Input
                            label="Email"
                            type="email"
                            placeholder="email@example.com"
                            leftIcon={<Mail className="h-5 w-5" />}
                            error={errors.email?.message}
                            {...register("email")}
                        />

                        <Input
                            label="Mật khẩu"
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            leftIcon={<Lock className="h-5 w-5" />}
                            rightIcon={
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-5 w-5" />
                                    ) : (
                                        <Eye className="h-5 w-5" />
                                    )}
                                </button>
                            }
                            error={errors.password?.message}
                            {...register("password")}
                        />

                        <div className="flex items-center justify-between text-sm">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-gray-600">Ghi nhớ đăng nhập</span>
                            </label>
                            <Link
                                href="/forgot-password"
                                className="text-blue-600 hover:text-blue-700"
                            >
                                Quên mật khẩu?
                            </Link>
                        </div>

                        <Button
                            type="submit"
                            className="w-full"
                            size="lg"
                            isLoading={isLoading}
                        >
                            Đăng nhập
                        </Button>
                    </form>

                    <div className="mt-6 text-center text-sm text-gray-600">
                        Chưa có tài khoản?{" "}
                        <Link
                            href="/register"
                            className="text-blue-600 hover:text-blue-700 font-medium"
                        >
                            Đăng ký ngay
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
