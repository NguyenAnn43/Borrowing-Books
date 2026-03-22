import mongoose, { Schema, Model } from 'mongoose';
import { IBookReview } from '../types';

const bookReviewSchema = new Schema<IBookReview>(
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
        libraryId: {
            type: Schema.Types.ObjectId,
            ref: 'Library',
            required: [true, 'Library is required'],
        },
        stars: {
            type: Number,
            required: [true, 'Stars are required'],
            min: [1, 'Stars must be at least 1'],
            max: [5, 'Stars cannot exceed 5'],
        },
        comment: {
            type: String,
            trim: true,
            default: null,
        },
        images: {
            type: [String],
            default: [],
        },
        isHidden: {
            type: Boolean,
            default: false,
        },
        hiddenBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        hiddenAt: {
            type: Date,
            default: null,
        },
        hiddenReason: {
            type: String,
            trim: true,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

bookReviewSchema.index({ userId: 1, bookId: 1 }, { unique: true });
bookReviewSchema.index({ bookId: 1, createdAt: -1 });
bookReviewSchema.index({ libraryId: 1, createdAt: -1 });
bookReviewSchema.index({ libraryId: 1, stars: 1, createdAt: -1 });

bookReviewSchema.pre(/^find/, function (next) {
    (this as mongoose.Query<unknown, IBookReview>)
        .populate('userId', 'fullName avatar')
        .populate('bookId', 'title author coverImage')
        .populate('libraryId', 'name code');
    next();
});

const BookReview: Model<IBookReview> = mongoose.model<IBookReview>('BookReview', bookReviewSchema);

export default BookReview;
