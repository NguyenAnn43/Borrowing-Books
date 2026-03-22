import { Router, IRouter } from 'express';
import { transitController } from '../controllers';
import { protect, authorize, validate } from '../middlewares';
import {
    approveTransitRequestSchema,
    cancelTransitRequestSchema,
    createTransitRequestSchema,
    dispatchTransitRequestSchema,
    getTransitRequestsSchema,
    rejectTransitRequestSchema,
    receiveTransitRequestSchema,
    transitIdParamSchema,
} from '../validators';
import { ROLES } from '../utils';

const router: IRouter = Router();

router.get(
    '/',
    protect,
    authorize(ROLES.LIBRARIAN, ROLES.ADMIN),
    validate(getTransitRequestsSchema),
    transitController.getTransitRequests
);

router.post(
    '/',
    protect,
    authorize(ROLES.LIBRARIAN),
    validate(createTransitRequestSchema),
    transitController.createTransitRequest
);

router.get(
    '/:id',
    protect,
    authorize(ROLES.LIBRARIAN, ROLES.ADMIN),
    validate(transitIdParamSchema),
    transitController.getTransitRequestById
);

router.put(
    '/:id/approve',
    protect,
    authorize(ROLES.LIBRARIAN, ROLES.ADMIN),
    validate(approveTransitRequestSchema),
    transitController.approveTransitRequest
);

router.put(
    '/:id/reject',
    protect,
    authorize(ROLES.LIBRARIAN, ROLES.ADMIN),
    validate(rejectTransitRequestSchema),
    transitController.rejectTransitRequest
);

router.put(
    '/:id/dispatch',
    protect,
    authorize(ROLES.LIBRARIAN, ROLES.ADMIN),
    validate(dispatchTransitRequestSchema),
    transitController.dispatchTransitRequest
);

router.put(
    '/:id/receive',
    protect,
    authorize(ROLES.LIBRARIAN, ROLES.ADMIN),
    validate(receiveTransitRequestSchema),
    transitController.receiveTransitRequest
);

router.put(
    '/:id/cancel',
    protect,
    authorize(ROLES.LIBRARIAN, ROLES.ADMIN),
    validate(cancelTransitRequestSchema),
    transitController.cancelTransitRequest
);

export default router;
