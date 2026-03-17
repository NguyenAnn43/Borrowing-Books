import api, { ApiResponse } from "@/lib/api";
import type { IUser } from "@/types";

export interface UpdateUserPayload {
    fullName?: string;
    phone?: string;
    avatar?: string;
}

export const userService = {
    updateUser: async (userId: string, data: UpdateUserPayload): Promise<IUser> => {
        const response = await api.put<ApiResponse<IUser>>(`/users/${userId}`, data);
        return response.data.data;
    },

    uploadAvatar: async (userId: string, file: File): Promise<IUser> => {
        const formData = new FormData();
        formData.append("avatar", file);

        const response = await api.put<ApiResponse<IUser>>(`/users/${userId}/avatar`, formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });

        return response.data.data;
    },
};
