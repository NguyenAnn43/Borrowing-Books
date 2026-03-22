import api, { ApiResponse } from "@/lib/api";
import type {
    IDashboardReport,
    IMonthlyFineRevenueItem,
    IReportQuery,
} from "@/types";

export const reportService = {
    getDashboardReport: async (params: IReportQuery = {}): Promise<IDashboardReport> => {
        const response = await api.get<ApiResponse<IDashboardReport>>("/reports/dashboard", { params });
        return response.data.data;
    },

    getFineRevenueByMonth: async (params: Pick<IReportQuery, "from" | "to" | "months"> = {}): Promise<IMonthlyFineRevenueItem[]> => {
        const response = await api.get<ApiResponse<IMonthlyFineRevenueItem[]>>("/reports/fine-revenue", { params });
        return response.data.data;
    },
};
