import { Router, IRouter } from 'express';
import { authController } from '../controllers';
import { protect } from '../middlewares';
import { validate } from '../middlewares/validate';
import {
	registerSchema,
	loginSchema,
	refreshTokenSchema,
	requestRegisterOtpSchema,
	verifyRegisterOtpSchema,
} from '../validators';

const router: IRouter = Router();

router.post('/register/request-otp', validate(requestRegisterOtpSchema), authController.requestRegisterOtp);
router.post('/register/verify-otp', validate(verifyRegisterOtpSchema), authController.verifyRegisterOtp);
router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/logout', protect, authController.logout);
router.post('/refresh-token', validate(refreshTokenSchema), authController.refreshToken);
router.get('/me', protect, authController.me);

export default router;
