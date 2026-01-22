import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "@/lib/api";
import type { IUser, ILoginRequest, IRegisterRequest, IAuthResponse } from "@/types";

interface AuthState {
    user: IUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;

    // Actions
    login: (data: ILoginRequest) => Promise<void>;
    register: (data: IRegisterRequest) => Promise<void>;
    logout: () => Promise<void>;
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

            login: async (data) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await api.post<{ success: boolean; data: IAuthResponse }>(
                        "/auth/login",
                        data
                    );
                    const { user, accessToken } = response.data.data;
                    localStorage.setItem("accessToken", accessToken);
                    set({ user, isAuthenticated: true, isLoading: false });
                } catch (error: unknown) {
                    const err = error as { response?: { data?: { error?: { message?: string } } } };
                    set({
                        error: err.response?.data?.error?.message || "Login failed",
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
                    localStorage.setItem("accessToken", accessToken);
                    set({ user, isAuthenticated: true, isLoading: false });
                } catch (error: unknown) {
                    const err = error as { response?: { data?: { error?: { message?: string } } } };
                    set({
                        error: err.response?.data?.error?.message || "Registration failed",
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
                set({ user: null, isAuthenticated: false });
            },

            getCurrentUser: async () => {
                const token = localStorage.getItem("accessToken");
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
            }),
        }
    )
);
