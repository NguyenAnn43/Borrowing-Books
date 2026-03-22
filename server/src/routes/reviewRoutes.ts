import { Router, IRouter } from 'express';
import { reviewController } from '../controllers';
import { optionalAuth, protect, authorize, validate } from '../middlewares';
import {
    createBookReviewSchema,
    createLibraryReviewSchema,
    createReviewReportSchema,
    deleteBookReviewSchema,
    deleteLibraryReviewSchema,
    getBookReviewsSchema,
    getLibrarianReviewDashboardSchema,
    getLibraryReviewsSchema,
    getReviewReportsSchema,
    moderateReviewSchema,
    updateBookReviewSchema,
    updateLibraryReviewSchema,
} from '../validators';
import { ROLES } from '../utils';

const router: IRouter = Router();

router.get('/books/:bookId', optionalAuth, validate(getBookReviewsSchema), reviewController.getBookReviews);
router.post(
    '/books',
    protect,
    authorize(ROLES.USER),
    validate(createBookReviewSchema),
    reviewController.createBookReview
);
router.put(
    '/books/:reviewId',
    protect,
    authorize(ROLES.USER),
    validate(updateBookReviewSchema),
    reviewController.updateBookReview
);
router.delete(
    '/books/:reviewId',
    protect,
    authorize(ROLES.USER, ROLES.ADMIN),
    validate(deleteBookReviewSchema),
    reviewController.deleteBookReview
);

router.get('/libraries/:libraryId', optionalAuth, validate(getLibraryReviewsSchema), reviewController.getLibraryReviews);
router.post(
    '/libraries',
    protect,
    authorize(ROLES.USER),
    validate(createLibraryReviewSchema),
    reviewController.createLibraryReview
);
router.put(
    '/libraries/:reviewId',
    protect,
    authorize(ROLES.USER),
    validate(updateLibraryReviewSchema),
    reviewController.updateLibraryReview
);
router.delete(
    '/libraries/:reviewId',
    protect,
    authorize(ROLES.USER, ROLES.ADMIN),
    validate(deleteLibraryReviewSchema),
    reviewController.deleteLibraryReview
);

router.post(
    '/reports',
    protect,
    authorize(ROLES.USER, ROLES.LIBRARIAN),
    validate(createReviewReportSchema),
    reviewController.createReviewReport
);
router.get(
    '/reports',
    protect,
    authorize(ROLES.ADMIN),
    validate(getReviewReportsSchema),
    reviewController.getReviewReports
);
router.put(
    '/moderate',
    protect,
    authorize(ROLES.ADMIN),
    validate(moderateReviewSchema),
    reviewController.moderateReview
);

router.get(
    '/dashboard/librarian',
    protect,
    authorize(ROLES.LIBRARIAN),
    validate(getLibrarianReviewDashboardSchema),
    reviewController.getLibrarianReviewDashboard
);

export default router;
