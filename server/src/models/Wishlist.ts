import mongoose, { Schema, Model } from 'mongoose';
import { IWishlist } from '../types';

const wishlistSchema = new Schema<IWishlist>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'User is required'],
        },
        bookId: {
            type: Schema.Types.ObjectId,
            ref: 'Book',
            required: [true, 'Book is required'],
        },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
    }
);

wishlistSchema.index({ userId: 1, bookId: 1 }, { unique: true });
wishlistSchema.index({ userId: 1, createdAt: -1 });
wishlistSchema.index({ bookId: 1 });

const Wishlist: Model<IWishlist> = mongoose.model<IWishlist>('Wishlist', wishlistSchema);

export default Wishlist;
