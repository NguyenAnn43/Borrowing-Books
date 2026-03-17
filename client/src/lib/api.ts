import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";
const SESSION_EXPIRY_KEY = "auth-session-expiry";
let refreshTokenInFlight: Promise<string> | null = null;
let hasRedirectedToLogin = false;

const getAccessToken = (): string | null => {
    if (typeof window === "undefined") return null;
    const localToken = localStorage.getItem("accessToken");
    const expiryRaw = localStorage.getItem(SESSION_EXPIRY_KEY);

    if (localToken && expiryRaw) {
        const expiresAt = parseInt(expiryRaw, 10);
        if (Number.isNaN(expiresAt) || Date.now() > expiresAt) {
            localStorage.removeItem("accessToken");
            localStorage.removeItem(SESSION_EXPIRY_KEY);
        }
    }

    return localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken");
};

const saveAccessToken = (token: string): void => {
    if (typeof window === "undefined") return;

    // Keep the same persistence strategy currently in use.
    if (localStorage.getItem("accessToken")) {
        localStorage.setItem("accessToken", token);
        return;
    }

    if (sessionStorage.getItem("accessToken")) {
        sessionStorage.setItem("accessToken", token);
        return;
    }

    // Fallback for first login flow.
    sessionStorage.setItem("accessToken", token);
};

const clearAccessToken = (): void => {
    if (typeof window === "undefined") return;
    localStorage.removeItem("accessToken");
    localStorage.removeItem(SESSION_EXPIRY_KEY);
    sessionStorage.removeItem("accessToken");
};

// Create axios instance
const api = axios.create({
    baseURL: API_URL,
    headers: {
        "Content-Type": "application/json",
    },
    withCredentials: true,
});

// Request interceptor
api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = getAccessToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor
api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & {
            _retry?: boolean;
        };

        const requestUrl = originalRequest?.url || "";
        const isAuthRequest =
            requestUrl.includes("/auth/login") ||
            requestUrl.includes("/auth/register") ||
            requestUrl.includes("/auth/refresh-token");

        // Do not force redirect/retry for auth endpoints.
        // Login/Register should surface server errors to the form UI.
        if (isAuthRequest) {
            return Promise.reject(error);
        }

        // If error is 401 and we haven't retried yet
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                if (!refreshTokenInFlight) {
                    refreshTokenInFlight = axios
                        .post(
                            `${API_URL}/auth/refresh-token`,
                            {},
                            { withCredentials: true }
                        )
                        .then((response) => response.data.data.accessToken as string)
                        .finally(() => {
                            refreshTokenInFlight = null;
                        });
                }

                const accessToken = await refreshTokenInFlight;
                saveAccessToken(accessToken);

                // Retry original request
                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                // Refresh failed, clear storage and redirect to login
                clearAccessToken();
                if (typeof window !== "undefined" && !hasRedirectedToLogin) {
                    hasRedirectedToLogin = true;
                    window.location.href = "/login";
                }
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default api;

// Error type
export interface ApiError {
    success: false;
    error: {
        code: string;
        message: string;
        details?: unknown;
    };
}

// Response type
export interface ApiResponse<T> {
    success: true;
    data: T;
    message?: string;
    meta?: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}
