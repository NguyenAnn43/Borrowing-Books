import { Router, IRouter } from 'express';
import * as notificationController from '../controllers/notificationController';
import { protect } from '../middlewares';

const router: IRouter = Router();

// All notification routes require authentication; owner-check is in service/controller.

/** GET /notifications — paginated list + unread count */
router.get('/', protect, notificationController.getMyNotifications);

/** PATCH /notifications/read-all — mark everything as read (must be before /:id) */
router.patch('/read-all', protect, notificationController.markAllAsRead);

/** PATCH /notifications/:id/read — mark one as read */
router.patch('/:id/read', protect, notificationController.markAsRead);

export default router;
