"use client";

import { FormEvent, useRef, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/stores/authStore";
import { useCartStore } from "@/stores/cartStore";
import { ShoppingCart, Search } from "lucide-react";

interface HeaderProps {
  searchText: string;
  onSearchChange: (value: string) => void;
  onSearch: (event: FormEvent<HTMLFormElement>) => void;
  showSearch?: boolean;
}

const HEADER_NAV_ITEMS = [
  { label: "Home", href: "/" },
  { label: "Browse", href: "#browse" },
  { label: "Libraries", href: "/libraries" },
  { label: "About", href: "#about" },
];

export function Header({
  searchText,
  onSearchChange,
  onSearch,
  showSearch = true,
}: HeaderProps) {
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const { user, isAuthenticated, logout } = useAuthStore();
  const cartItems = useCartStore((state) => state.items);
  const isSignedIn = isAuthenticated && Boolean(user) && user?.role !== "guest";
  const canUseCart = user?.role === "user";

  const dashboardHref = user?.role === "admin"
    ? "/dashboard/admin"
    : user?.role === "librarian"
      ? "/dashboard/librarian"
      : "/dashboard/user";

  return (
    <header className="flex items-center justify-between border-b border-[#f0f2f4] bg-white px-6 py-3 shadow-sm transition-shadow duration-300 dark:border-gray-800 dark:bg-[#101622] md:px-10">
      <div className="flex items-center gap-8">
        <Link href="/" className="flex items-center gap-4 text-[#2b6cee] transition-transform duration-300 hover:scale-105">
          <div className="size-6">
            <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M24 4C25.7818 14.2173 33.7827 22.2182 44 24C33.7827 25.7818 25.7818 33.7827 24 44C22.2182 33.7827 14.2173 25.7818 4 24C14.2173 22.2182 22.2182 14.2173 24 4Z"
                fill="currentColor"
              />
            </svg>
          </div>
          <span className="text-xl font-extrabold leading-tight tracking-[-0.015em] text-[#111318] dark:text-white">
            Mosa
          </span>
        </Link>
        <nav className="hidden items-center gap-9 md:flex">
          {HEADER_NAV_ITEMS.map((item) => (
            <Link
              key={item.label}
              className="text-sm font-semibold leading-normal text-[#111318] transition-all duration-300 hover:text-[#2b6cee] dark:text-gray-200"
              href={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="flex flex-1 items-center justify-end gap-4 md:gap-6">
        {showSearch && (
          <label className="hidden h-10 min-w-40 max-w-64 flex-col lg:flex">
            <form className="flex h-full w-full flex-1 items-stretch rounded-lg" onSubmit={onSearch}>
              <div className="flex items-center justify-center rounded-l-lg border-r-0 bg-gray-100 pl-4 text-[#616f89] transition-colors duration-300 dark:bg-gray-800">
                <Search className="h-5 w-5" />
              </div>
              <input
                className="form-input h-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg rounded-l-none border-none border-l-0 bg-gray-100 px-4 pl-2 text-sm font-normal leading-normal text-[#111318] placeholder:text-[#616f89] transition-all duration-300 focus:bg-gray-50 focus:border-none focus:outline-0 focus:ring-0 dark:bg-gray-800 dark:text-white dark:focus:bg-gray-700"
                value={searchText}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Quick search..."
              />
            </form>
          </label>
        )}

        {isSignedIn ? (
          <>
            {canUseCart ? (
              <Link href="/dashboard/cart" className="relative flex h-10 w-10 items-center justify-center rounded-full text-[#111318] transition-all duration-300 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-800">
                <ShoppingCart className="h-5 w-5" />
                {cartItems.length > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                    {cartItems.length}
                  </span>
                )}
              </Link>
            ) : null}

            <div className="relative" ref={accountMenuRef}>
              <button
                type="button"
                onClick={() => setIsAccountMenuOpen((prev) => !prev)}
                className="flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-[#111318] transition-all duration-300 hover:border-[#2b6cee] hover:text-[#2b6cee] dark:border-gray-700 dark:bg-[#101622] dark:text-gray-200"
              >
                <span className="flex size-7 items-center justify-center rounded-full bg-[#2b6cee] text-xs font-bold text-white">
                  {user?.fullName?.charAt(0).toUpperCase() ?? "U"}
                </span>
                <span className="hidden sm:inline">Tài khoản</span>
              </button>

              {isAccountMenuOpen ? (
                <div className="absolute right-0 z-20 mt-2 w-52 rounded-xl border border-gray-200 bg-white p-2 shadow-xl dark:border-gray-700 dark:bg-[#0f172a]">
                  <Link
                    href={dashboardHref}
                    onClick={() => setIsAccountMenuOpen(false)}
                    className="flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium text-[#111318] transition-colors hover:bg-[#eef3ff] hover:text-[#2b6cee] dark:text-gray-200 dark:hover:bg-gray-800"
                  >
                    Vào Dashboard
                  </Link>
                  {(user?.role === "admin" || user?.role === "librarian") ? (
                    <Link
                      href={dashboardHref}
                      onClick={() => setIsAccountMenuOpen(false)}
                      className="flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium text-[#111318] transition-colors hover:bg-[#eef3ff] hover:text-[#2b6cee] dark:text-gray-200 dark:hover:bg-gray-800"
                    >
                      Quản trị
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    onClick={async () => {
                      await logout();
                      setIsAccountMenuOpen(false);
                    }}
                    className="mt-1 flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    Đăng xuất
                  </button>
                </div>
              ) : null}
            </div>
          </>
        ) : (
          <>
            <Link href="/login" className="flex h-10 min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-[#2b6cee] px-4 text-sm font-bold leading-normal tracking-[0.015em] text-white transition-all duration-300 hover:bg-blue-700 hover:shadow-lg active:scale-95 dark:hover:bg-blue-600">
              <span className="truncate">Sign In</span>
            </Link>

            <Link
              className="size-10 overflow-hidden rounded-full border border-gray-200 bg-cover bg-center bg-no-repeat transition-all duration-300 hover:ring-2 hover:ring-[#2b6cee] hover:ring-offset-2 dark:border-gray-700 dark:hover:ring-offset-[#101622]"
              style={{
                backgroundImage:
                  'url("https://lh3.googleusercontent.com/aida-public/AB6AXuCQhrvkpn7QIkSQrWD6ryk8-VjcLjjdfyBeE4MTZoL8wPCzy0f7NGQsTUQyRBxEXN5a1RtksfJFs3JP6KDlMnwX2ilQwOkEDreem4zWAIk6K4ja2AiLsC8X1l9kw69nbSiajR8kROHyMMSV6PxWZpVNXKK_AGL3gUsizt3p0fU6ZJx7G1w3LDWDBELQlyMdAB3jSth93Y-X6b3igC_x4s7UYAIbi8oZHg0lqng5pXU-9-Rr9ZVu2mHgntW_Vr1Ablp0pjEo7RowVb6x")',
              }}
              href="/register"
              aria-label="Create account"
            />
          </>
        )}
      </div>
    </header>
  );
}
