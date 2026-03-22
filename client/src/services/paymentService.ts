import api, { ApiResponse } from "@/lib/api";
import type { IPagination, IPayment } from "@/types";

export const paymentService = {
    createVnpayFinePayment: async (borrowingId: string): Promise<{ paymentUrl: string; txnRef: string }> => {
        const response = await api.post<ApiResponse<{ paymentUrl: string; txnRef: string }>>("/payments/vnpay/create", {
            borrowingId,
        });
        return response.data.data;
    },

    getPaymentHistory: async (params: { page?: number; limit?: number; status?: "pending" | "success" | "failed" } = {}) => {
        const response = await api.get<ApiResponse<IPayment[]>>("/payments/history", { params });

        return {
            payments: response.data.data,
            pagination: response.data.meta as IPagination,
        };
    },
};
