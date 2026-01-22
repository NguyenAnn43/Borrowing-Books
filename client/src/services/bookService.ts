import api, { ApiResponse } from "@/lib/api";
import type { IBook, IPagination } from "@/types";

export interface GetBooksParams {
    page?: number;
    limit?: number;
    q?: string;
    category?: string;
    libraryId?: string;
    status?: "available" | "unavailable";
}

export interface GetBooksResponse {
    books: IBook[];
    pagination: IPagination;
}

export const bookService = {
    /**
     * Get all books with filters
     */
    getBooks: async (params: GetBooksParams = {}): Promise<GetBooksResponse> => {
        const response = await api.get<ApiResponse<IBook[]>>("/books", { params });
        return {
            books: response.data.data,
            pagination: response.data.meta as IPagination,
        };
    },

    /**
     * Get book by ID
     */
    getBookById: async (id: string): Promise<IBook> => {
        const response = await api.get<ApiResponse<IBook>>(`/books/${id}`);
        return response.data.data;
    },

    /**
     * Create new book
     */
    createBook: async (data: Partial<IBook>): Promise<IBook> => {
        const response = await api.post<ApiResponse<IBook>>("/books", data);
        return response.data.data;
    },

    /**
     * Update book
     */
    updateBook: async (id: string, data: Partial<IBook>): Promise<IBook> => {
        const response = await api.put<ApiResponse<IBook>>(`/books/${id}`, data);
        return response.data.data;
    },

    /**
     * Delete book
     */
    deleteBook: async (id: string): Promise<void> => {
        await api.delete(`/books/${id}`);
    },
};
