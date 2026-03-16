import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "@/lib/api";
import type { IUser, ILoginRequest, IRegisterRequest, IAuthResponse } from "@/types";

const REMEMBERED_SESSION_MS = 7 * 24 * 60 * 60 * 1000;
const SESSION_EXPIRY_KEY = "auth-session-expiry";

interface LastLoginAccount {
    email: string;
    fullName: string;
    role: IUser["role"];
}

interface ApiErrorShape {
    response?: {
        data?: {
            error?: {
                message?: string;
                details?: Array<{ field?: string; message?: string }>;
            };
            message?: string;
        };
    };
    message?: string;
}

const extractApiErrorMessage = (error: unknown, fallback: string): string => {
    const err = error as ApiErrorShape;
    const detailMessage = err.response?.data?.error?.details?.[0]?.message;
    const errorMessage = err.response?.data?.error?.message;
    const rootMessage = err.response?.data?.message;

    return detailMessage || errorMessage || rootMessage || err.message || fallback;
};

interface AuthState {
    user: IUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    sessionExpiresAt: number | null;
    lastLoginAccount: LastLoginAccount | null;

    // Actions
    login: (data: ILoginRequest, rememberMe?: boolean) => Promise<void>;
    register: (data: IRegisterRequest) => Promise<void>;
    logout: () => Promise<void>;
    continueAsGuest: () => void;
    getCurrentUser: () => Promise<void>;
    clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
            sessionExpiresAt: null,
            lastLoginAccount: null,

            login: async (data, rememberMe = false) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await api.post<{ success: boolean; data: IAuthResponse }>(
                        "/auth/login",
                        data
                    );
                    const { user, accessToken } = response.data.data;
                    if (rememberMe) {
                        localStorage.setItem("accessToken", accessToken);
                        sessionStorage.removeItem("accessToken");
                        const expiresAt = Date.now() + REMEMBERED_SESSION_MS;
                        localStorage.setItem(SESSION_EXPIRY_KEY, String(expiresAt));
                        set({ sessionExpiresAt: expiresAt });
                    } else {
                        sessionStorage.setItem("accessToken", accessToken);
                        localStorage.removeItem("accessToken");
                        localStorage.removeItem(SESSION_EXPIRY_KEY);
                        set({ sessionExpiresAt: null });
                    }
                    set({
                        user,
                        isAuthenticated: true,
                        isLoading: false,
                        lastLoginAccount: {
                            email: user.email,
                            fullName: user.fullName,
                            role: user.role,
                        },
                    });
                } catch (error: unknown) {
                    set({
                        error: extractApiErrorMessage(error, "Login failed"),
                        isLoading: false,
                    });
                    throw error;
                }
            },

            register: async (data) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await api.post<{ success: boolean; data: IAuthResponse }>(
                        "/auth/register",
                        data
                    );
                    const { user, accessToken } = response.data.data;
                    // Registration defaults to non-persistent session until user chooses remember me on login.
                    sessionStorage.setItem("accessToken", accessToken);
                    localStorage.removeItem("accessToken");
                    localStorage.removeItem(SESSION_EXPIRY_KEY);
                    set({
                        user,
                        isAuthenticated: true,
                        isLoading: false,
                        sessionExpiresAt: null,
                        lastLoginAccount: {
                            email: user.email,
                            fullName: user.fullName,
                            role: user.role,
                        },
                    });
                } catch (error: unknown) {
                    set({
                        error: extractApiErrorMessage(error, "Registration failed"),
                        isLoading: false,
                    });
                    throw error;
                }
            },

            logout: async () => {
                try {
                    await api.post("/auth/logout");
                } catch {
                    // Ignore error
                }
                localStorage.removeItem("accessToken");
                sessionStorage.removeItem("accessToken");
                localStorage.removeItem(SESSION_EXPIRY_KEY);
                set({
                    user: null,
                    isAuthenticated: false,
                    sessionExpiresAt: null,
                    error: null,
                });
            },

            continueAsGuest: () => {
                const now = new Date().toISOString();
                localStorage.removeItem("accessToken");
                sessionStorage.removeItem("accessToken");
                localStorage.removeItem(SESSION_EXPIRY_KEY);

                set({
                    user: {
                        _id: "guest",
                        email: "guest@local",
                        fullName: "Guest",
                        role: "guest",
                        status: "active",
                        maxBorrowLimit: 0,
                        createdAt: now,
                        updatedAt: now,
                    },
                    isAuthenticated: true,
                    isLoading: false,
                    error: null,
                    sessionExpiresAt: null,
                });
            },

            getCurrentUser: async () => {
                const currentUser = useAuthStore.getState().user;
                if (currentUser?.role === "guest") {
                    set({ isAuthenticated: true, isLoading: false });
                    return;
                }

                const localToken = localStorage.getItem("accessToken");
                const expiryRaw = localStorage.getItem(SESSION_EXPIRY_KEY);
                if (localToken && expiryRaw) {
                    const expiresAt = parseInt(expiryRaw, 10);
                    if (Number.isNaN(expiresAt) || Date.now() > expiresAt) {
                        localStorage.removeItem("accessToken");
                        localStorage.removeItem(SESSION_EXPIRY_KEY);
                        set({ sessionExpiresAt: null });
                    } else {
                        set({ sessionExpiresAt: expiresAt });
                    }
                }

                const token = localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken");
                if (!token) {
                    set({ isAuthenticated: false, user: null });
                    return;
                }

                set({ isLoading: true });
                try {
                    const response = await api.get<{ success: boolean; data: IUser }>("/auth/me");
                    set({ user: response.data.data, isAuthenticated: true, isLoading: false });
                } catch {
                    localStorage.removeItem("accessToken");
                    sessionStorage.removeItem("accessToken");
                    localStorage.removeItem(SESSION_EXPIRY_KEY);
                    set({ user: null, isAuthenticated: false, isLoading: false });
                }
            },

            clearError: () => set({ error: null }),
        }),
        {
            name: "auth-storage",
            partialize: (state) => ({
                user: state.user,
                isAuthenticated: state.isAuthenticated,
                lastLoginAccount: state.lastLoginAccount,
                sessionExpiresAt: state.sessionExpiresAt,
            }),
        }
    )
);
