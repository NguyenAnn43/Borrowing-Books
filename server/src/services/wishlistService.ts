import { Book, Wishlist } from '../models';
import { AppError, formatPagination, PAGINATION } from '../utils';
import { PaginationMeta } from '../types';
import { GetMyWishlistQuery } from '../validators';

interface WishlistActionResult {
    isWishlisted: boolean;
    wishlistCount: number;
}

interface WishlistBookItem {
    _id: string;
    bookId: string;
    title: string;
    author: string;
    coverImage?: string;
    category: string;
    wishlistCount: number;
    createdAt: Date;
}

interface GetMyWishlistResult {
    items: WishlistBookItem[];
    pagination: PaginationMeta;
}

/**
 * Add book to wishlist. Idempotent behavior: existing records are kept as-is.
 */
export const addToWishlist = async (userId: string, bookId: string): Promise<WishlistActionResult> => {
    const book = await Book.findById(bookId);
    if (!book) {
        throw new AppError('Book not found', 404, 'BOOK_NOT_FOUND');
    }

    const result = await Wishlist.updateOne(
        { userId, bookId },
        { $setOnInsert: { userId, bookId } },
        { upsert: true }
    );

    if (result.upsertedCount > 0) {
        await Book.updateOne({ _id: bookId }, { $inc: { wishlistCount: 1 } });
    }

    const refreshedBook = await Book.findById(bookId).select('wishlistCount');

    return {
        isWishlisted: true,
        wishlistCount: refreshedBook?.wishlistCount ?? 0,
    };
};

/**
 * Remove book from wishlist. Idempotent behavior: no-op if not found.
 */
export const removeFromWishlist = async (userId: string, bookId: string): Promise<WishlistActionResult> => {
    const result = await Wishlist.deleteOne({ userId, bookId });

    if (result.deletedCount > 0) {
        await Book.updateOne({ _id: bookId, wishlistCount: { $gt: 0 } }, { $inc: { wishlistCount: -1 } });
    }

    const refreshedBook = await Book.findById(bookId).select('wishlistCount');

    return {
        isWishlisted: false,
        wishlistCount: refreshedBook?.wishlistCount ?? 0,
    };
};

/**
 * Get current user's wishlist with pagination.
 */
export const getMyWishlist = async (
    userId: string,
    params: GetMyWishlistQuery
): Promise<GetMyWishlistResult> => {
    const { page = PAGINATION.DEFAULT_PAGE, limit = PAGINATION.DEFAULT_LIMIT } = params;
    const actualLimit = Math.min(limit, PAGINATION.MAX_LIMIT);
    const skip = (page - 1) * actualLimit;

    const [rows, total] = await Promise.all([
        Wishlist.find({ userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(actualLimit)
            .populate('bookId', 'title author coverImage category wishlistCount')
            .lean(),
        Wishlist.countDocuments({ userId }),
    ]);

    const items: WishlistBookItem[] = rows
        .filter((row) => row.bookId)
        .map((row) => {
            const book = row.bookId as unknown as {
                _id: { toString(): string };
                title: string;
                author: string;
                coverImage?: string;
                category: string;
                wishlistCount?: number;
            };

            return {
                _id: row._id.toString(),
                bookId: book._id.toString(),
                title: book.title,
                author: book.author,
                coverImage: book.coverImage,
                category: book.category,
                wishlistCount: book.wishlistCount ?? 0,
                createdAt: row.createdAt,
            };
        });

    return {
        items,
        pagination: formatPagination(page, actualLimit, total),
    };
};

/**
 * Get wished book ids for a user.
 */
export const getWishlistedBookIdSet = async (userId: string, bookIds: string[]): Promise<Set<string>> => {
    if (!bookIds.length) return new Set();

    const rows = await Wishlist.find(
        { userId, bookId: { $in: bookIds } },
        { bookId: 1 }
    ).lean();

    return new Set(rows.map((row) => row.bookId.toString()));
};

/**
 * Remove all wishlist records tied to a book (used when deleting books).
 */
export const deleteByBookId = async (bookId: string): Promise<void> => {
    await Wishlist.deleteMany({ bookId });
};
