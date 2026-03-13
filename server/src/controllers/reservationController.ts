import { Response } from 'express';
import * as reservationService from '../services/reservationService';
import { asyncHandler } from '../utils';
import { AuthRequest } from '../types';
import { GetReservationsQuery } from '../validators/reservationSchema';

export const getReservations = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await reservationService.getReservations(req.query as unknown as GetReservationsQuery);
    res.json({ success: true, data: result.reservations, meta: result.pagination });
});

export const getMyReservations = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await reservationService.getMyReservations(req.user!._id.toString(), req.query);
    res.json({ success: true, data: result.reservations, meta: result.pagination });
});

export const getReservationById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const reservation = await reservationService.getReservationById(req.params['id']!, req.user!);
    res.json({ success: true, data: reservation });
});

export const createReservation = asyncHandler(async (req: AuthRequest, res: Response) => {
    const reservation = await reservationService.createReservation(req.user!._id.toString(), req.body);
    res.status(201).json({ success: true, data: reservation, message: 'Reservation created successfully' });
});

export const markReady = asyncHandler(async (req: AuthRequest, res: Response) => {
    const reservation = await reservationService.markReady(req.params['id']!);
    res.json({ success: true, data: reservation, message: 'Reservation marked as ready' });
});

export const cancelReservation = asyncHandler(async (req: AuthRequest, res: Response) => {
    const reservation = await reservationService.cancelReservation(req.params['id']!, req.user!._id.toString());
    res.json({ success: true, data: reservation, message: 'Reservation cancelled' });
});

export const fulfillReservation = asyncHandler(async (req: AuthRequest, res: Response) => {
    const reservation = await reservationService.fulfillReservation(req.params['id']!);
    res.json({ success: true, data: reservation, message: 'Reservation fulfilled and borrowing created' });
});
