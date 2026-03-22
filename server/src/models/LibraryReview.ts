import mongoose, { Schema, Model } from 'mongoose';
import { ILibraryReview } from '../types';

const libraryReviewSchema = new Schema<ILibraryReview>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'User is required'],
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

libraryReviewSchema.index({ userId: 1, libraryId: 1 }, { unique: true });
libraryReviewSchema.index({ libraryId: 1, createdAt: -1 });
libraryReviewSchema.index({ libraryId: 1, stars: 1, createdAt: -1 });

libraryReviewSchema.pre(/^find/, function (next) {
    (this as mongoose.Query<unknown, ILibraryReview>)
        .populate('userId', 'fullName avatar')
        .populate('libraryId', 'name code');
    next();
});

const LibraryReview: Model<ILibraryReview> = mongoose.model<ILibraryReview>('LibraryReview', libraryReviewSchema);

export default LibraryReview;
