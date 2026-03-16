import { Router, IRouter } from 'express';
import { wishlistController } from '../controllers';
import { protect, authorize, validate } from '../middlewares';
import { ROLES } from '../utils';
import { addWishlistSchema, removeWishlistSchema, getMyWishlistSchema } from '../validators';

const router: IRouter = Router();

router.get(
    '/me',
    protect,
    authorize(ROLES.USER, ROLES.ADMIN, ROLES.LIBRARIAN),
    validate(getMyWishlistSchema),
    wishlistController.getMyWishlist
);

router.post(
    '/',
    protect,
    authorize(ROLES.USER, ROLES.ADMIN, ROLES.LIBRARIAN),
    validate(addWishlistSchema),
    wishlistController.addToWishlist
);

router.delete(
    '/:bookId',
    protect,
    authorize(ROLES.USER, ROLES.ADMIN, ROLES.LIBRARIAN),
    validate(removeWishlistSchema),
    wishlistController.removeFromWishlist
);

export default router;
