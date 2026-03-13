import { Router, IRouter } from 'express';
import { borrowingController } from '../controllers';
import { protect, authorize, validate } from '../middlewares';
import { createBorrowingSchema, updateBorrowingSchema, getBorrowingsSchema } from '../validators';
import { ROLES } from '../utils';

const router: IRouter = Router();

// ── User routes ───────────────────────────────────────────────────────────────

/** GET /borrowings/my — user's own borrowing history */
router.get('/my', protect, borrowingController.getMyBorrowings);

/** POST /borrowings — user creates a borrow request */
router.post(
    '/',
    protect,
    authorize(ROLES.USER),
    validate(createBorrowingSchema),
    borrowingController.createBorrowing
);

/** DELETE /borrowings/:id/cancel — owner cancels a PENDING request */
router.delete(
    '/:id/cancel',
    protect,
    validate(updateBorrowingSchema),
    borrowingController.cancelBorrowing
);

/** PUT /borrowings/:id/renew — owner renews an active borrowing */
router.put(
    '/:id/renew',
    protect,
    validate(updateBorrowingSchema),
    borrowingController.renewBorrowing
);

// ── Admin / Librarian routes ──────────────────────────────────────────────────

/** GET /borrowings — all borrowings (paginated, filtered) */
router.get(
    '/',
    protect,
    authorize(ROLES.LIBRARIAN, ROLES.ADMIN),
    validate(getBorrowingsSchema),
    borrowingController.getBorrowings
);

/** GET /borrowings/:id — owner | librarian | admin */
router.get(
    '/:id',
    protect,
    validate(updateBorrowingSchema),
    borrowingController.getBorrowingById
);

/** PUT /borrowings/:id/confirm — librarian confirms pickup */
router.put(
    '/:id/confirm',
    protect,
    authorize(ROLES.LIBRARIAN, ROLES.ADMIN),
    validate(updateBorrowingSchema),
    borrowingController.confirmPickup
);

/** PUT /borrowings/:id/return — librarian records return */
router.put(
    '/:id/return',
    protect,
    authorize(ROLES.LIBRARIAN, ROLES.ADMIN),
    validate(updateBorrowingSchema),
    borrowingController.returnBook
);

/** PUT /borrowings/:id/pay-fine — librarian marks fine as paid */
router.put(
    '/:id/pay-fine',
    protect,
    authorize(ROLES.LIBRARIAN, ROLES.ADMIN),
    validate(updateBorrowingSchema),
    borrowingController.payFine
);

export default router;
