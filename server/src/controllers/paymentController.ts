import { Request, Response } from 'express';
import { paymentService } from '../services';
import { asyncHandler } from '../utils';
import { AuthRequest } from '../types';

export const createVnpayPayment = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { borrowingId } = req.body as { borrowingId?: string };

    if (!borrowingId) {
        res.status(400).json({
            success: false,
            error: {
                code: 'BORROWING_ID_REQUIRED',
                message: 'borrowingId is required',
            },
        });
        return;
    }

    const clientIp = req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim()
        || req.socket.remoteAddress
        || '127.0.0.1';

    const result = await paymentService.createVnpayFinePayment(req.user!, borrowingId, clientIp);

    res.json({
        success: true,
        data: result,
        message: 'VNPay payment link created',
    });
});

export const vnpayReturn = asyncHandler(async (req: Request, res: Response) => {
    const query = Object.fromEntries(
        Object.entries(req.query).map(([key, value]) => [key, Array.isArray(value) ? value[0] : String(value || '')])
    ) as Record<string, string>;

    const result = await paymentService.handleVnpayReturn(query);
    res.redirect(result.redirectUrl);
});

export const getPaymentHistory = asyncHandler(async (req: AuthRequest, res: Response) => {
    const params = {
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        status: req.query.status as 'pending' | 'success' | 'failed' | undefined,
    };

    const result = await paymentService.getPaymentHistory(req.user!, params);

    res.json({
        success: true,
        data: result.payments,
        meta: result.pagination,
    });
});
