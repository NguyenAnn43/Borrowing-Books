"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Moon, Sun } from "lucide-react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

type ThemeMode = "light" | "dark";

type ThemeContextValue = {
    theme: ThemeMode;
    toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const getInitialTheme = (): ThemeMode => {
    if (typeof window === "undefined") {
        return "dark";
    }

    const saved = window.localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") {
        return saved;
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);

    useEffect(() => {
        const root = document.documentElement;
        root.classList.remove("light", "dark");
        root.classList.add(theme);
        root.setAttribute("data-theme", theme);
        window.localStorage.setItem("theme", theme);
    }, [theme]);

    const value = useMemo<ThemeContextValue>(
        () => ({
            theme,
            toggleTheme: () => {
                setTheme((prev) => (prev === "dark" ? "light" : "dark"));
            },
        }),
        [theme]
    );

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

function ThemeToggleButton() {
    const context = useContext(ThemeContext);

    if (!context) {
        return null;
    }

    const isDark = context.theme === "dark";

    return (
        <button
            type="button"
            onClick={context.toggleTheme}
            className="fixed bottom-5 right-5 z-[90] inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white/90 px-3 py-2 text-xs font-semibold text-slate-700 shadow-lg backdrop-blur transition hover:bg-white dark:border-slate-600 dark:bg-slate-900/90 dark:text-slate-200 dark:hover:bg-slate-900"
            aria-label={isDark ? "Chuyển sang Light mode" : "Chuyển sang Dark mode"}
            title={isDark ? "Light mode" : "Dark mode"}
        >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            <span>{isDark ? "Light" : "Dark"}</span>
        </button>
    );
}

export function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 60 * 1000, // 1 minute
                        refetchOnWindowFocus: false,
                    },
                },
            })
    );

    return (
        <ThemeProvider>
            <QueryClientProvider client={queryClient}>
                {children}
                <ThemeToggleButton />
            </QueryClientProvider>
        </ThemeProvider>
    );
}
