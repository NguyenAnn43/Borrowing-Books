"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";

interface RouteGuardProps {
    children: React.ReactNode;
    /** Roles được phép truy cập. Không truyền = chỉ cần đăng nhập. */
    allowedRoles?: Array<"admin" | "librarian" | "user" | "guest">;
}

export function RouteGuard({ children, allowedRoles }: RouteGuardProps) {
    const router = useRouter();
    const { isAuthenticated, user, isLoading, getCurrentUser } = useAuthStore();
    const [isBootstrapped, setIsBootstrapped] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const bootstrapAuth = async () => {
            const token =
                typeof window !== "undefined"
                    ? localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken")
                    : null;

            if (!user && token) {
                await getCurrentUser();
            }

            if (isMounted) {
                setIsBootstrapped(true);
            }
        };

        void bootstrapAuth();

        return () => {
            isMounted = false;
        };
    }, [user, getCurrentUser]);

    useEffect(() => {
        if (!isBootstrapped || isLoading) return;

        if (!isAuthenticated || !user) {
            router.replace("/login");
            return;
        }

        if (allowedRoles && !allowedRoles.includes(user.role as typeof allowedRoles[number])) {
            // Redirect về dashboard phù hợp với role
            if (user.role === "admin") router.replace("/dashboard/admin");
            else if (user.role === "librarian") router.replace("/dashboard/librarian");
            else if (user.role === "guest") router.replace("/dashboard/guest");
            else router.replace("/dashboard/user");
        }
    }, [isAuthenticated, user, isLoading, isBootstrapped, allowedRoles, router]);

    // Đang tải hoặc chưa xác thực → hiện loading
    if (!isBootstrapped || isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950">
                <div className="flex flex-col items-center gap-4">
                    <svg className="animate-spin h-10 w-10 text-blue-500" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <p className="text-blue-300/60 text-sm">Đang xác thực...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated || !user) {
        return null;
    }

    // Sai role → trống (redirect đang xảy ra)
    if (allowedRoles && !allowedRoles.includes(user.role as typeof allowedRoles[number])) {
        return null;
    }

    return <>{children}</>;
}
