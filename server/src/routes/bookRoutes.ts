import { Router, IRouter } from 'express';
import { bookController } from '../controllers';
import { protect, authorize, validate } from '../middlewares';
import { createBookSchema, updateBookSchema, searchBooksSchema, getBookByIdSchema } from '../validators';
import { ROLES } from '../utils';

const router: IRouter = Router();

// Public routes
router.get('/', validate(searchBooksSchema), bookController.getBooks);
router.get('/:id', validate(getBookByIdSchema), bookController.getBookById);

// Protected routes (Librarian/Admin)
router.post(
    '/',
    protect,
    authorize(ROLES.LIBRARIAN, ROLES.ADMIN),
    validate(createBookSchema),
    bookController.createBook
);

router.put(
    '/:id',
    protect,
    authorize(ROLES.LIBRARIAN, ROLES.ADMIN),
    validate(updateBookSchema),
    bookController.updateBook
);

router.delete(
    '/:id',
    protect,
    authorize(ROLES.LIBRARIAN, ROLES.ADMIN),
    bookController.deleteBook
);

export default router;
