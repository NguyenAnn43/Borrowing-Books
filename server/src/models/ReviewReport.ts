import mongoose, { Schema, Model } from 'mongoose';
import { IReviewReport } from '../types';
import { REVIEW_ADMIN_ACTION, REVIEW_REPORT_STATUS } from '../utils/constants';

const reviewReportSchema = new Schema<IReviewReport>(
    {
        reviewType: {
            type: String,
            enum: ['book', 'library'],
            required: [true, 'Review type is required'],
        },
        reviewId: {
            type: Schema.Types.ObjectId,
            required: [true, 'Review id is required'],
            refPath: 'reviewModel',
        },
        reviewModel: {
            type: String,
            required: true,
            enum: ['BookReview', 'LibraryReview'],
        },
        reporterId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Reporter is required'],
        },
        reason: {
            type: String,
            required: [true, 'Reason is required'],
            trim: true,
            minlength: [5, 'Reason should be at least 5 characters'],
            maxlength: [500, 'Reason cannot exceed 500 characters'],
        },
        status: {
            type: String,
            enum: Object.values(REVIEW_REPORT_STATUS),
            default: REVIEW_REPORT_STATUS.PENDING,
        },
        adminAction: {
            type: String,
            enum: Object.values(REVIEW_ADMIN_ACTION),
            default: null,
        },
        adminNote: {
            type: String,
            trim: true,
            default: null,
        },
        resolvedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        resolvedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

reviewReportSchema.index({ status: 1, createdAt: -1 });
reviewReportSchema.index({ reviewType: 1, reviewId: 1, status: 1 });
reviewReportSchema.index({ reporterId: 1, reviewType: 1, reviewId: 1 }, { unique: true });

reviewReportSchema.pre(/^find/, function (next) {
    (this as mongoose.Query<unknown, IReviewReport>)
        .populate('reporterId', 'fullName role email')
        .populate('resolvedBy', 'fullName role');
    next();
});

const ReviewReport: Model<IReviewReport> = mongoose.model<IReviewReport>('ReviewReport', reviewReportSchema);

export default ReviewReport;
