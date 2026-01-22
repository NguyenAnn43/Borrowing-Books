import { Router, IRouter } from 'express';
import { authController } from '../controllers';
import { protect } from '../middlewares';
import { validate } from '../middlewares/validate';
import { registerSchema, loginSchema, refreshTokenSchema } from '../validators';

const router: IRouter = Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/logout', protect, authController.logout);
router.post('/refresh-token', validate(refreshTokenSchema), authController.refreshToken);
router.get('/me', protect, authController.me);

export default router;
