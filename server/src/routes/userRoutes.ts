import { Router, IRouter } from 'express';
import { userController } from '../controllers';
import { protect, authorize, authorizeOwnerOrAdmin, validate } from '../middlewares';
import { ROLES } from '../utils';
import { AuthRequest } from '../types';
import { createStaffSchema } from '../validators';

const router: IRouter = Router();

// Admin only routes
router.get('/', protect, authorize(ROLES.ADMIN), userController.getUsers);
router.post('/staff', protect, authorize(ROLES.ADMIN), validate(createStaffSchema), userController.createStaffAccount);

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
