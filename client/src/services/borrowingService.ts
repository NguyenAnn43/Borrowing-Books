import api, { ApiResponse } from "@/lib/api";
import type { IBorrowing, IPagination } from "@/types";

export interface CreateBorrowingData {
    bookId: string;
    libraryId: string;
    notes?: string;
}

export interface GetBorrowingsParams {
    q?: string;
    page?: number;
    limit?: number;
    status?: "pending" | "borrowed" | "returned" | "overdue" | "return_transit" | "cancelled" | "lost" | "damaged";
    finePaid?: boolean;
    libraryId?: string;
    userId?: string;
}

export interface CrossReturnLookupParams {
    q: string;
    limit?: number;
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
    getMyBorrowings: async (params: { page?: number; limit?: number; status?: string; finePaid?: boolean } = {}) => {
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
     * Lookup active borrowings from other libraries for cross-library return handling
     */
    lookupCrossReturnCandidates: async (params: CrossReturnLookupParams): Promise<IBorrowing[]> => {
        const response = await api.get<ApiResponse<IBorrowing[]>>("/borrowings/cross-return/candidates", { params });
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
     * Create bulk borrowing request
     */
    createBulkBorrowing: async (data: { bookIds: string[]; libraryId: string; notes?: string }): Promise<IBorrowing[]> => {
        const response = await api.post<ApiResponse<IBorrowing[]>>("/borrowings/bulk", data);
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

    /**
     * Receiving librarian handles cross-library return intake
     */
    receiveCrossLibraryReturn: async (id: string): Promise<IBorrowing> => {
        const response = await api.put<ApiResponse<IBorrowing>>(`/borrowings/${id}/receive-cross-return`);
        return response.data.data;
    },

    /**
     * Home library confirms receiving an inbound cross-library return
     */
    receiveTransitReturn: async (id: string): Promise<IBorrowing> => {
        const response = await api.put<ApiResponse<IBorrowing>>(`/borrowings/${id}/receive-transit`);
        return response.data.data;
    },

    /**
     * Pay fine (admin/librarian)
     */
    payFine: async (id: string): Promise<IBorrowing> => {
        const response = await api.put<ApiResponse<IBorrowing>>(`/borrowings/${id}/pay-fine`);
        return response.data.data;
    },

    /**
     * Cancel pending borrowing (owner)
     */
    cancelBorrowing: async (id: string): Promise<IBorrowing> => {
        const response = await api.delete<ApiResponse<IBorrowing>>(`/borrowings/${id}/cancel`);
        return response.data.data;
    },

    /**
     * Renew active borrowing (owner)
     */
    renewBorrowing: async (id: string): Promise<IBorrowing> => {
        const response = await api.put<ApiResponse<IBorrowing>>(`/borrowings/${id}/renew`);
        return response.data.data;
    },

    /**
     * Report a book as lost or damaged (admin/librarian)
     */
    reportLostOrDamaged: async (id: string, data: { status: "lost" | "damaged"; notes?: string }): Promise<IBorrowing> => {
        const response = await api.post<ApiResponse<IBorrowing>>(`/borrowings/${id}/report-issue`, data);
        return response.data.data;
    },
};
