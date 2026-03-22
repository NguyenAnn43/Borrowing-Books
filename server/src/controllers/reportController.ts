import { Response } from 'express';
import { reportService } from '../services';
import { asyncHandler } from '../utils';
import { AuthRequest } from '../types';
import {
    DashboardReportQuery,
    FineRevenueReportQuery,
    LateReturnRateReportQuery,
    TopBorrowedBooksReportQuery,
    UserActivityReportQuery,
} from '../validators/reportSchema';

export const getDashboardReport = asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await reportService.getDashboardReport(req.user!, req.query as unknown as DashboardReportQuery);

    res.json({
        success: true,
        data,
    });
});

export const getFineRevenueByMonth = asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await reportService.getFineRevenueByMonth(
        req.user!,
        req.query as unknown as FineRevenueReportQuery
    );

    res.json({
        success: true,
        data,
    });
});

export const getTopBorrowedBooks = asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await reportService.getTopBorrowedBooks(
        req.user!,
        req.query as unknown as TopBorrowedBooksReportQuery
    );

    res.json({
        success: true,
        data,
    });
});

export const getLateReturnRate = asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await reportService.getLateReturnRate(
        req.user!,
        req.query as unknown as LateReturnRateReportQuery
    );

    res.json({
        success: true,
        data,
    });
});

export const getUserActivityReport = asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await reportService.getUserActivityReport(
        req.user!,
        req.query as unknown as UserActivityReportQuery
    );

    res.json({
        success: true,
        data,
    });
});
