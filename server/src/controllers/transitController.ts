import { Response } from 'express';
import { transitService } from '../services';
import { asyncHandler } from '../utils';
import { AuthRequest } from '../types';
import { GetTransitRequestsQuery } from '../validators/transitSchema';

export const getTransitRequests = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await transitService.getTransitRequests(req.query as unknown as GetTransitRequestsQuery, req.user!);
    res.json({ success: true, data: result.requests, meta: result.pagination });
});

export const getTransitRequestById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const request = await transitService.getTransitRequestById(req.params['id']!, req.user!);
    res.json({ success: true, data: request });
});

export const createTransitRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
    const request = await transitService.createTransitRequest(req.user!, req.body);
    res.status(201).json({ success: true, data: request, message: 'Transit request created successfully' });
});

export const approveTransitRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
    const request = await transitService.approveTransitRequest(req.params['id']!, req.user!, req.body?.note);
    res.json({ success: true, data: request, message: 'Transit request approved' });
});

export const rejectTransitRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
    const request = await transitService.rejectTransitRequest(req.params['id']!, req.user!, req.body);
    res.json({ success: true, data: request, message: 'Transit request rejected' });
});

export const dispatchTransitRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
    const request = await transitService.dispatchTransitRequest(req.params['id']!, req.user!, req.body);
    res.json({ success: true, data: request, message: 'Transit dispatched successfully' });
});

export const receiveTransitRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
    const request = await transitService.receiveTransitRequest(req.params['id']!, req.user!, req.body);
    res.json({ success: true, data: request, message: 'Transit received successfully' });
});

export const cancelTransitRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
    const request = await transitService.cancelTransitRequest(req.params['id']!, req.user!, req.body);
    res.json({ success: true, data: request, message: 'Transit request cancelled' });
});
