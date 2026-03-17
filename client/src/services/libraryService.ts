import api, { ApiResponse } from "@/lib/api";
import type { ILibrary, IPagination } from "@/types";

export interface GetLibrariesParams {
    page?: number;
    limit?: number;
    status?: "active" | "inactive";
}

export interface GetLibrariesResponse {
    libraries: ILibrary[];
    pagination: IPagination;
}

export interface UpsertLibraryPayload {
    name: string;
    code: string;
    address: string;
    phone?: string;
    email?: string;
    status?: "active" | "inactive";
    workingHours?: {
        open: string;
        close: string;
    };
    description?: string;
}

export const libraryService = {
    getLibraries: async (params: GetLibrariesParams = {}): Promise<GetLibrariesResponse> => {
        const response = await api.get<ApiResponse<ILibrary[]>>("/libraries", { params });
        return {
            libraries: response.data.data,
            pagination: response.data.meta as IPagination,
        };
    },

    createLibrary: async (data: UpsertLibraryPayload): Promise<ILibrary> => {
        const response = await api.post<ApiResponse<ILibrary>>("/libraries", data);
        return response.data.data;
    },

    updateLibrary: async (id: string, data: Partial<UpsertLibraryPayload>): Promise<ILibrary> => {
        const response = await api.put<ApiResponse<ILibrary>>(`/libraries/${id}`, data);
        return response.data.data;
    },

    deleteLibrary: async (id: string): Promise<void> => {
        await api.delete(`/libraries/${id}`);
    },
};
