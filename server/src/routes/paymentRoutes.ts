import { Router, IRouter } from 'express';
import { paymentController } from '../controllers';
import { protect, authorize } from '../middlewares';
import { ROLES } from '../utils';

const router: IRouter = Router();

// User creates a VNPay payment URL for fine payment
router.post('/vnpay/create', protect, authorize(ROLES.USER), paymentController.createVnpayPayment);

// VNPay redirect return URL (public endpoint)
router.get('/vnpay/return', paymentController.vnpayReturn);

// Payment history
router.get('/history', protect, authorize(ROLES.USER, ROLES.ADMIN, ROLES.LIBRARIAN), paymentController.getPaymentHistory);

export default router;
