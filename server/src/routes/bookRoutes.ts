import { Router, IRouter } from 'express';
import { bookController } from '../controllers';
import { protect, authorize, validate, optionalAuth } from '../middlewares';
import { createBookSchema, updateBookSchema, searchBooksSchema, getBookByIdSchema } from '../validators';
import { ROLES } from '../utils';

const router: IRouter = Router();

// Public routes
router.get('/', optionalAuth, validate(searchBooksSchema), bookController.getBooks);
router.get('/:id/alternatives', optionalAuth, validate(getBookByIdSchema), bookController.getBookAlternatives);
router.get('/:id', optionalAuth, validate(getBookByIdSchema), bookController.getBookById);

// Protected routes (Librarian only)
router.post(
    '/',
    protect,
    authorize(ROLES.LIBRARIAN),
    validate(createBookSchema),
    bookController.createBook
);

router.put(
    '/:id',
    protect,
    authorize(ROLES.LIBRARIAN),
    validate(updateBookSchema),
    bookController.updateBook
);

router.delete(
    '/:id',
    protect,
    authorize(ROLES.LIBRARIAN),
    bookController.deleteBook
);

export default router;
