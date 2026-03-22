import api, { ApiResponse } from "@/lib/api";
import type { IPagination, IReservation } from "@/types";

export interface GetReservationsParams {
    q?: string;
    page?: number;
    limit?: number;
    status?: "pending" | "ready" | "completed" | "cancelled" | "expired";
    libraryId?: string;
    userId?: string;
}

export interface CreateReservationInput {
    bookId: string;
    libraryId: string;
}

export const reservationService = {
    createReservation: async (data: CreateReservationInput): Promise<IReservation> => {
        const response = await api.post<ApiResponse<IReservation>>("/reservations", data);
        return response.data.data;
    },

    getReservations: async (params: GetReservationsParams = {}) => {
        const response = await api.get<ApiResponse<IReservation[]>>("/reservations", { params });
        return {
            reservations: response.data.data,
            pagination: response.data.meta as IPagination,
        };
    },

    getMyReservations: async (params: { page?: number; limit?: number; status?: string } = {}) => {
        const response = await api.get<ApiResponse<IReservation[]>>("/reservations/my", { params });
        return {
            reservations: response.data.data,
            pagination: response.data.meta as IPagination,
        };
    },

    markReady: async (id: string): Promise<IReservation> => {
        const response = await api.put<ApiResponse<IReservation>>(`/reservations/${id}/ready`);
        return response.data.data;
    },

    fulfillReservation: async (id: string): Promise<IReservation> => {
        const response = await api.put<ApiResponse<IReservation>>(`/reservations/${id}/fulfill`);
        return response.data.data;
    },

    cancelReservation: async (id: string): Promise<IReservation> => {
        const response = await api.delete<ApiResponse<IReservation>>(`/reservations/${id}/cancel`);
        return response.data.data;
    },
};
