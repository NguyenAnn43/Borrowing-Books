import { Router, IRouter } from 'express';
import { reportController } from '../controllers';
import { protect, authorize, validate } from '../middlewares';
import {
    getDashboardReportSchema,
    getFineRevenueReportSchema,
    getTopBorrowedBooksReportSchema,
    getLateReturnRateReportSchema,
    getUserActivityReportSchema,
} from '../validators';
import { ROLES } from '../utils';

const router: IRouter = Router();

router.use(protect);
router.use(authorize(ROLES.ADMIN, ROLES.LIBRARIAN));

router.get('/dashboard', validate(getDashboardReportSchema), reportController.getDashboardReport);
router.get('/fine-revenue', validate(getFineRevenueReportSchema), reportController.getFineRevenueByMonth);
router.get('/top-borrowed-books', validate(getTopBorrowedBooksReportSchema), reportController.getTopBorrowedBooks);
router.get('/late-return-rate', validate(getLateReturnRateReportSchema), reportController.getLateReturnRate);
router.get('/user-activity', validate(getUserActivityReportSchema), reportController.getUserActivityReport);

export default router;
