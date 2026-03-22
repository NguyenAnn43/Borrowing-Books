import api, { ApiResponse } from "@/lib/api";
import type { IPagination, ITransitRequest } from "@/types";

export interface GetTransitRequestsParams {
    q?: string;
    page?: number;
    limit?: number;
    status?: "pending" | "approved" | "rejected" | "in_transit" | "completed" | "cancelled";
    direction?: "all" | "inbound" | "outbound";
    sourceLibraryId?: string;
    targetLibraryId?: string;
}

export interface CreateTransitRequestInput {
    sourceBookId: string;
    quantity?: number;
    note?: string;
    requestedForUserId?: string;
}

export const transitService = {
    getTransitRequests: async (params: GetTransitRequestsParams = {}) => {
        const response = await api.get<ApiResponse<ITransitRequest[]>>("/transits", { params });
        return {
            requests: response.data.data,
            pagination: response.data.meta as IPagination,
        };
    },

    getTransitRequestById: async (id: string): Promise<ITransitRequest> => {
        const response = await api.get<ApiResponse<ITransitRequest>>(`/transits/${id}`);
        return response.data.data;
    },

    createTransitRequest: async (data: CreateTransitRequestInput): Promise<ITransitRequest> => {
        const response = await api.post<ApiResponse<ITransitRequest>>("/transits", data);
        return response.data.data;
    },

    approveTransitRequest: async (id: string, data?: { note?: string }): Promise<ITransitRequest> => {
        const response = await api.put<ApiResponse<ITransitRequest>>(`/transits/${id}/approve`, data || {});
        return response.data.data;
    },

    rejectTransitRequest: async (id: string, data: { reason: string }): Promise<ITransitRequest> => {
        const response = await api.put<ApiResponse<ITransitRequest>>(`/transits/${id}/reject`, data);
        return response.data.data;
    },

    dispatchTransitRequest: async (id: string, data?: { note?: string }): Promise<ITransitRequest> => {
        const response = await api.put<ApiResponse<ITransitRequest>>(`/transits/${id}/dispatch`, data || {});
        return response.data.data;
    },

    receiveTransitRequest: async (id: string, data?: { note?: string }): Promise<ITransitRequest> => {
        const response = await api.put<ApiResponse<ITransitRequest>>(`/transits/${id}/receive`, data || {});
        return response.data.data;
    },

    cancelTransitRequest: async (id: string, data?: { reason?: string }): Promise<ITransitRequest> => {
        const response = await api.put<ApiResponse<ITransitRequest>>(`/transits/${id}/cancel`, data || {});
        return response.data.data;
    },
};
