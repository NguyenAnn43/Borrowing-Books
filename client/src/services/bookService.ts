import api, { ApiResponse } from "@/lib/api";
import type { IBook, IPagination } from "@/types";

export interface GetBooksParams {
    page?: number;
    limit?: number;
    q?: string;
    category?: string;
    libraryId?: string;
    status?: "available" | "unavailable";
    includeWishlist?: boolean;
}

export interface GetBooksResponse {
    books: IBook[];
    pagination: IPagination;
}

export interface GetBookAlternativesResponse {
    sourceBook: IBook;
    alternatives: IBook[];
    matchedBy: "isbn" | "title-author";
}

export interface BookMutationPayload {
    isbn?: string;
    title?: string;
    author?: string;
    publisher?: string;
    publishYear?: number;
    category?: string;
    description?: string;
    coverImage?: string;
    language?: string;
    pageCount?: number;
    tags?: string[];
    location?: string;
    libraryId?: string;
    totalCopies?: number;
    availableCopies?: number;
    status?: "available" | "unavailable";
}

export const bookService = {
    /**
     * Get all books with filters and pagination
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
     * Get alternative libraries carrying the same title
     */
    getBookAlternatives: async (id: string): Promise<GetBookAlternativesResponse> => {
        const response = await api.get<ApiResponse<GetBookAlternativesResponse>>(`/books/${id}/alternatives`);
        return response.data.data;
    },

    /**
     * Create new book
     */
    createBook: async (data: BookMutationPayload): Promise<IBook> => {
        const response = await api.post<ApiResponse<IBook>>("/books", data);
        return response.data.data;
    },

    /**
     * Update book
     */
    updateBook: async (id: string, data: BookMutationPayload): Promise<IBook> => {
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
