"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { BookOpen, LayoutDashboard, BookCopy, Users, Library, Bell, LogOut, ChevronRight, Heart, UserRound, ShoppingCart, Home } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useCartStore } from "@/stores/cartStore";
import { RouteGuard } from "@/components/RouteGuard";

const roleLabel: Record<string, string> = {
    admin: "Quản trị viên",
    librarian: "Thủ thư",
    user: "Độc giả",
};

const roleBadgeColor: Record<string, string> = {
    admin: "bg-red-500/20 text-red-300 border-red-500/30",
    librarian: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    user: "bg-blue-500/20 text-blue-300 border-blue-500/30",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, logout } = useAuthStore();
    const cartItems = useCartStore((state) => state.items);

    const handleLogout = async () => {
        await logout();
        router.push("/login");
    };

    const navItems = [
        {
            href: user?.role === "admin"
                ? "/dashboard/admin"
                : user?.role === "librarian"
                    ? "/dashboard/librarian"
                    : "/dashboard/user",
            label: "Tổng quan",
            icon: LayoutDashboard,
        },
        ...(user?.role !== "admin"
            ? [{ href: "/dashboard/books", label: "Sách", icon: BookOpen }]
            : []),
        ...(user?.role === "user"
            ? [
                { href: "/dashboard/borrowings", label: "Mượn của tôi", icon: BookCopy },
                { href: "/dashboard/reservations", label: "Đặt trước", icon: BookCopy },
                { href: "/dashboard/payments", label: "Lịch sử thanh toán", icon: BookCopy },
                { href: "/dashboard/wishlist", label: "Yêu thích", icon: Heart },
                { href: "/dashboard/cart", label: "Giỏ sách", icon: ShoppingCart },
            ]
            : []),
        ...(user?.role === "librarian"
            ? [
                { href: "/dashboard/borrowings", label: "Quản lý mượn/trả", icon: BookCopy },
                { href: "/dashboard/reservations", label: "Đặt trước", icon: BookCopy },
            ]
            : []),
        ...(user?.role === "admin"
            ? [
                { href: "/dashboard/users", label: "Người dùng", icon: Users },
                { href: "/dashboard/libraries", label: "Thư viện", icon: Library },
            ]
            : []),
        { href: "/dashboard/profile", label: "Hồ sơ cá nhân", icon: UserRound },
        { href: "/dashboard/notifications", label: "Thông báo", icon: Bell },
    ];

    return (
        <RouteGuard allowedRoles={["admin", "librarian", "user"]}>
            <div className="min-h-screen bg-slate-950 flex">
                {/* Sidebar */}
                <aside className="w-64 flex-shrink-0 bg-slate-900/80 border-r border-white/5 flex flex-col">
                    {/* Logo */}
                    <div className="p-6 border-b border-white/5">
                        <Link href="/" className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                                <BookOpen className="h-5 w-5 text-white" />
                            </div>
                            <span className="font-bold text-white text-lg">
                                Borrowing<span className="text-blue-400">Books</span>
                            </span>
                        </Link>
                    </div>

                    {/* User info */}
                    <div className="px-4 py-4 border-b border-white/5">
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                {user?.fullName?.charAt(0).toUpperCase() ?? "U"}
                            </div>
                            <div className="min-w-0">
                                <p className="text-white text-sm font-medium truncate">{user?.fullName}</p>
                                <span className={`inline-block text-xs px-2 py-0.5 rounded-full border mt-0.5 ${roleBadgeColor[user?.role ?? "user"]}`}>
                                    {roleLabel[user?.role ?? "user"]}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Exit Dashboard */}
                    <div className="px-3 py-3 border-b border-white/5">
                        <Link
                            href="/"
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                        >
                            <Home className="h-4 w-4" />
                            <span>Quay lại trang chủ</span>
                        </Link>
                    </div>

                    {/* Nav */}
                    <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const active = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative ${active
                                            ? "bg-blue-600/20 text-blue-300 border border-blue-500/30"
                                            : "text-slate-400 hover:text-white hover:bg-white/5"
                                        }`}
                                >
                                    <Icon className="h-4 w-4 flex-shrink-0" />
                                    <span>{item.label}</span>
                                    {item.href === "/dashboard/cart" && cartItems.length > 0 && (
                                        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">
                                            {cartItems.length}
                                        </span>
                                    )}
                                    {active && item.href !== "/dashboard/cart" && <ChevronRight className="h-3 w-3 ml-auto text-blue-400" />}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Logout */}
                    <div className="p-3 border-t border-white/5">
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                        >
                            <LogOut className="h-4 w-4" />
                            Đăng xuất
                        </button>
                    </div>
                </aside>

                {/* Main content */}
                <main className="flex-1 min-w-0 overflow-y-auto">
                    {children}
                </main>
            </div>
        </RouteGuard>
    );
}
