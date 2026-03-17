import api, { ApiResponse } from "@/lib/api";
import type { IPagination } from "@/types";

export interface IReservation {
    _id: string;
    userId: string;
    bookId: {
        _id: string;
        title: string;
        author: string;
        coverImage?: string;
    };
    libraryId: string;
    status: "pending" | "ready" | "completed" | "cancelled" | "expired";
    reservationDate: string;
    readyDate?: string;
    expiryDate?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateReservationData {
    bookId: string;
    libraryId: string;
    notes?: string;
}

export interface GetReservationsParams {
    page?: number;
    limit?: number;
    status?: "pending" | "ready" | "completed" | "cancelled" | "expired";
    libraryId?: string;
    userId?: string;
}

export const reservationService = {
    /**
     * Get all reservations (admin/librarian)
     */
    getReservations: async (params: GetReservationsParams = {}) => {
        const response = await api.get<ApiResponse<IReservation[]>>("/reservations", { params });
        return {
            reservations: response.data.data,
            pagination: response.data.meta as IPagination,
        };
    },

    /**
     * Get my reservations (user)
     */
    getMyReservations: async (params: { page?: number; limit?: number; status?: string } = {}) => {
        const response = await api.get<ApiResponse<IReservation[]>>("/reservations/my", { params });
        return {
            reservations: response.data.data,
            pagination: response.data.meta as IPagination,
        };
    },

    /**
     * Get reservation by ID
     */
    getReservationById: async (id: string): Promise<IReservation> => {
        const response = await api.get<ApiResponse<IReservation>>(`/reservations/${id}`);
        return response.data.data;
    },

    /**
     * Create reservation request
     */
    createReservation: async (data: CreateReservationData): Promise<IReservation> => {
        const response = await api.post<ApiResponse<IReservation>>("/reservations", data);
        return response.data.data;
    },

    /**
     * Cancel reservation (user only)
     */
    cancelReservation: async (id: string): Promise<IReservation> => {
        const response = await api.delete<ApiResponse<IReservation>>(`/reservations/${id}/cancel`);
        return response.data.data;
    },

    /**
     * Mark reservation as ready (librarian/admin)
     */
    markReady: async (id: string): Promise<IReservation> => {
        const response = await api.put<ApiResponse<IReservation>>(`/reservations/${id}/ready`);
        return response.data.data;
    },

    /**
     * Fulfill reservation (librarian/admin)
     */
    fulfillReservation: async (id: string): Promise<IReservation> => {
        const response = await api.put<ApiResponse<IReservation>>(`/reservations/${id}/fulfill`);
        return response.data.data;
    },
};
