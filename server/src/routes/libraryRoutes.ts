import { Router, IRouter } from 'express';
import { libraryController } from '../controllers';
import { protect, authorize } from '../middlewares';
import { ROLES } from '../utils';

const router: IRouter = Router();

// Public routes
router.get('/', libraryController.getLibraries);
router.get('/:id', libraryController.getLibraryById);

// Admin only routes
router.post('/', protect, authorize(ROLES.ADMIN), libraryController.createLibrary);
router.put('/:id', protect, authorize(ROLES.ADMIN), libraryController.updateLibrary);
router.delete('/:id', protect, authorize(ROLES.ADMIN), libraryController.deleteLibrary);

export default router;
