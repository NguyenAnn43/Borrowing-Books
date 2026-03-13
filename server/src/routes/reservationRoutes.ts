import { Router, IRouter } from 'express';
import * as reservationController from '../controllers/reservationController';
import { protect, authorize, validate } from '../middlewares';
import { createReservationSchema, getReservationsSchema, reservationIdSchema } from '../validators/reservationSchema';
import { ROLES } from '../utils';

const router: IRouter = Router();

// ── User routes ───────────────────────────────────────────────────────────────

/** GET /reservations/my — user's own reservations */
router.get('/my', protect, reservationController.getMyReservations);

/** POST /reservations — user creates a reservation */
router.post(
    '/',
    protect,
    authorize(ROLES.USER),
    validate(createReservationSchema),
    reservationController.createReservation
);

/** DELETE /reservations/:id/cancel — owner cancels */
router.delete(
    '/:id/cancel',
    protect,
    validate(reservationIdSchema),
    reservationController.cancelReservation
);

// ── Admin / Librarian routes ──────────────────────────────────────────────────

/** GET /reservations — all reservations (librarian/admin) */
router.get(
    '/',
    protect,
    authorize(ROLES.LIBRARIAN, ROLES.ADMIN),
    validate(getReservationsSchema),
    reservationController.getReservations
);

/** GET /reservations/:id — owner | librarian | admin */
router.get(
    '/:id',
    protect,
    validate(reservationIdSchema),
    reservationController.getReservationById
);

/** PUT /reservations/:id/ready — librarian marks ready (sets expiryDate) */
router.put(
    '/:id/ready',
    protect,
    authorize(ROLES.LIBRARIAN, ROLES.ADMIN),
    validate(reservationIdSchema),
    reservationController.markReady
);

/** PUT /reservations/:id/fulfill — librarian fulfills → creates Borrowing */
router.put(
    '/:id/fulfill',
    protect,
    authorize(ROLES.LIBRARIAN, ROLES.ADMIN),
    validate(reservationIdSchema),
    reservationController.fulfillReservation
);

export default router;
