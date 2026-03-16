import api, { ApiResponse } from "@/lib/api";
import type { IWishlistItem, IPagination } from "@/types";

interface WishlistActionResponse {
    isWishlisted: boolean;
    wishlistCount: number;
}

export const wishlistService = {
    addToWishlist: async (bookId: string): Promise<WishlistActionResponse> => {
        const response = await api.post<ApiResponse<WishlistActionResponse>>("/wishlists", { bookId });
        return response.data.data;
    },

    removeFromWishlist: async (bookId: string): Promise<WishlistActionResponse> => {
        const response = await api.delete<ApiResponse<WishlistActionResponse>>(`/wishlists/${bookId}`);
        return response.data.data;
    },

    getMyWishlist: async (params: { page?: number; limit?: number } = {}) => {
        const response = await api.get<ApiResponse<IWishlistItem[]>>("/wishlists/me", { params });
        return {
            items: response.data.data,
            pagination: response.data.meta as IPagination,
        };
    },
};
