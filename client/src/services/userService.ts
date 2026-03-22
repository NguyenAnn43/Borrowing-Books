import api, { ApiResponse } from "@/lib/api";
import type { IPagination, IUser } from "@/types";

export interface UpdateUserPayload {
    fullName?: string;
    phone?: string;
    avatar?: string;
}

export interface ChangePasswordPayload {
    currentPassword: string;
    newPassword: string;
}

export interface GetUsersParams {
    page?: number;
    limit?: number;
    role?: IUser["role"];
    status?: IUser["status"];
}

export interface SearchReadersParams {
    q?: string;
    page?: number;
    limit?: number;
}

export interface GetUsersResponse {
    users: IUser[];
    pagination: IPagination;
}

export interface CreateStaffPayload {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    role: "admin" | "librarian";
    libraryId?: string;
}

export const userService = {
    getUsers: async (params: GetUsersParams = {}): Promise<GetUsersResponse> => {
        const response = await api.get<ApiResponse<IUser[]>>("/users", { params });
        return {
            users: response.data.data,
            pagination: response.data.meta as IPagination,
        };
    },

    createStaff: async (data: CreateStaffPayload): Promise<IUser> => {
        const response = await api.post<ApiResponse<IUser>>("/users/staff", data);
        return response.data.data;
    },

    searchReaders: async (params: SearchReadersParams = {}): Promise<GetUsersResponse> => {
        const response = await api.get<ApiResponse<IUser[]>>("/users/readers/search", { params });
        return {
            users: response.data.data,
            pagination: response.data.meta as IPagination,
        };
    },

    getUserById: async (userId: string): Promise<IUser> => {
        const response = await api.get<ApiResponse<IUser>>(`/users/${userId}`);
        return response.data.data;
    },

    updateUserRole: async (userId: string, data: { role: IUser["role"]; libraryId?: string }): Promise<IUser> => {
        const response = await api.put<ApiResponse<IUser>>(`/users/${userId}/role`, data);
        return response.data.data;
    },

    deleteUser: async (userId: string): Promise<void> => {
        await api.delete(`/users/${userId}`);
    },

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

    changePassword: async (data: ChangePasswordPayload): Promise<void> => {
        await api.post("/auth/change-password", data);
    },
};
