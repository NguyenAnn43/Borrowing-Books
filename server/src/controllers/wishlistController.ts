import { Response } from 'express';
import { asyncHandler } from '../utils';
import { AuthRequest } from '../types';
import { wishlistService } from '../services';
import { GetMyWishlistQuery } from '../validators';

export const addToWishlist = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { bookId } = req.body as { bookId: string };
    const result = await wishlistService.addToWishlist(req.user!._id.toString(), bookId);

    res.status(201).json({
        success: true,
        data: result,
        message: 'Book added to wishlist',
    });
});

export const removeFromWishlist = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await wishlistService.removeFromWishlist(req.user!._id.toString(), req.params['bookId']!);

    res.json({
        success: true,
        data: result,
        message: 'Book removed from wishlist',
    });
});

export const getMyWishlist = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await wishlistService.getMyWishlist(
        req.user!._id.toString(),
        req.query as unknown as GetMyWishlistQuery
    );

    res.json({
        success: true,
        data: result.items,
        meta: result.pagination,
    });
});
