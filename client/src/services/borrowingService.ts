import api, { ApiResponse } from "@/lib/api";
import type { IBorrowing, IPagination } from "@/types";

export interface CreateBorrowingData {
    bookId: string;
    libraryId: string;
    notes?: string;
}

export interface GetBorrowingsParams {
    page?: number;
    limit?: number;
    status?: "pending" | "borrowed" | "returned" | "overdue";
    libraryId?: string;
    userId?: string;
}

export const borrowingService = {
    /**
     * Get all borrowings (admin/librarian)
     */
    getBorrowings: async (params: GetBorrowingsParams = {}) => {
        const response = await api.get<ApiResponse<IBorrowing[]>>("/borrowings", { params });
        return {
            borrowings: response.data.data,
            pagination: response.data.meta as IPagination,
        };
    },

    /**
     * Get my borrowings (user)
     */
    getMyBorrowings: async (params: { page?: number; limit?: number; status?: string } = {}) => {
        const response = await api.get<ApiResponse<IBorrowing[]>>("/borrowings/my", { params });
        return {
            borrowings: response.data.data,
            pagination: response.data.meta as IPagination,
        };
    },

    /**
     * Get borrowing by ID
     */
    getBorrowingById: async (id: string): Promise<IBorrowing> => {
        const response = await api.get<ApiResponse<IBorrowing>>(`/borrowings/${id}`);
        return response.data.data;
    },

    /**
     * Create borrowing request
     */
    createBorrowing: async (data: CreateBorrowingData): Promise<IBorrowing> => {
        const response = await api.post<ApiResponse<IBorrowing>>("/borrowings", data);
        return response.data.data;
    },

    /**
     * Confirm book pickup (librarian)
     */
    confirmPickup: async (id: string): Promise<IBorrowing> => {
        const response = await api.put<ApiResponse<IBorrowing>>(`/borrowings/${id}/confirm`);
        return response.data.data;
    },

    /**
     * Return book (librarian)
     */
    returnBook: async (id: string): Promise<IBorrowing> => {
        const response = await api.put<ApiResponse<IBorrowing>>(`/borrowings/${id}/return`);
        return response.data.data;
    },
};
