import { Router, IRouter } from 'express';
import { userController } from '../controllers';
import { protect, authorize, authorizeOwnerOrAdmin } from '../middlewares';
import { ROLES } from '../utils';
import { AuthRequest } from '../types';

const router: IRouter = Router();

// Admin only routes
router.get('/', protect, authorize(ROLES.ADMIN), userController.getUsers);

router.get(
    '/:id',
    protect,
    authorizeOwnerOrAdmin((req: AuthRequest) => req.params.id),
    userController.getUserById
);

router.put(
    '/:id',
    protect,
    authorizeOwnerOrAdmin((req: AuthRequest) => req.params.id),
    userController.updateUser
);

router.delete('/:id', protect, authorize(ROLES.ADMIN), userController.deleteUser);

router.put('/:id/role', protect, authorize(ROLES.ADMIN), userController.updateUserRole);

export default router;
