"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { BookOpen, Mail, Lock, Eye, EyeOff, User, Phone } from "lucide-react";
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
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
        try {
            await registerUser({
                email: data.email,
                password: data.password,
                fullName: data.fullName,
                phone: data.phone,
            });
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
                    <CardTitle className="text-2xl">Tạo tài khoản</CardTitle>
                    <p className="text-gray-500 mt-2">
                        Điền thông tin để tạo tài khoản mới
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
                            label="Họ và tên"
                            type="text"
                            placeholder="Nguyễn Văn A"
                            leftIcon={<User className="h-5 w-5" />}
                            error={errors.fullName?.message}
                            {...register("fullName")}
                        />

                        <Input
                            label="Email"
                            type="email"
                            placeholder="email@example.com"
                            leftIcon={<Mail className="h-5 w-5" />}
                            error={errors.email?.message}
                            {...register("email")}
                        />

                        <Input
                            label="Số điện thoại (tùy chọn)"
                            type="tel"
                            placeholder="0123456789"
                            leftIcon={<Phone className="h-5 w-5" />}
                            error={errors.phone?.message}
                            {...register("phone")}
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

                        <Input
                            label="Xác nhận mật khẩu"
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="••••••••"
                            leftIcon={<Lock className="h-5 w-5" />}
                            rightIcon={
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    {showConfirmPassword ? (
                                        <EyeOff className="h-5 w-5" />
                                    ) : (
                                        <Eye className="h-5 w-5" />
                                    )}
                                </button>
                            }
                            error={errors.confirmPassword?.message}
                            {...register("confirmPassword")}
                        />

                        <div className="flex items-start gap-2 text-sm">
                            <input
                                type="checkbox"
                                required
                                className="w-4 h-4 mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-gray-600">
                                Tôi đồng ý với{" "}
                                <Link href="/terms" className="text-blue-600 hover:text-blue-700">
                                    Điều khoản dịch vụ
                                </Link>{" "}
                                và{" "}
                                <Link href="/privacy" className="text-blue-600 hover:text-blue-700">
                                    Chính sách bảo mật
                                </Link>
                            </span>
                        </div>

                        <Button
                            type="submit"
                            className="w-full"
                            size="lg"
                            isLoading={isLoading}
                        >
                            Đăng ký
                        </Button>
                    </form>

                    <div className="mt-6 text-center text-sm text-gray-600">
                        Đã có tài khoản?{" "}
                        <Link
                            href="/login"
                            className="text-blue-600 hover:text-blue-700 font-medium"
                        >
                            Đăng nhập
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
