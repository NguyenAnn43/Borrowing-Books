import { Router, IRouter } from 'express';
import { borrowingController } from '../controllers';
import { protect, authorize, validate } from '../middlewares';
import { createBorrowingSchema, updateBorrowingSchema, getBorrowingsSchema } from '../validators';
import { ROLES } from '../utils';

const router: IRouter = Router();

// User routes
router.get('/my', protect, borrowingController.getMyBorrowings);
router.post(
    '/',
    protect,
    authorize(ROLES.USER),
    validate(createBorrowingSchema),
    borrowingController.createBorrowing
);

// Admin/Librarian routes
router.get(
    '/',
    protect,
    authorize(ROLES.LIBRARIAN, ROLES.ADMIN),
    validate(getBorrowingsSchema),
    borrowingController.getBorrowings
);

router.get(
    '/:id',
    protect,
    validate(updateBorrowingSchema),
    borrowingController.getBorrowingById
);

router.put(
    '/:id/confirm',
    protect,
    authorize(ROLES.LIBRARIAN, ROLES.ADMIN),
    validate(updateBorrowingSchema),
    borrowingController.confirmPickup
);

router.put(
    '/:id/return',
    protect,
    authorize(ROLES.LIBRARIAN, ROLES.ADMIN),
    validate(updateBorrowingSchema),
    borrowingController.returnBook
);

export default router;
