import mongoose, { Schema, Model } from 'mongoose';
import { INotification } from '../types';
import { NOTIFICATION_TYPE } from '../utils/constants';

const notificationSchema = new Schema<INotification>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'User is required'],
        },
        title: {
            type: String,
            required: [true, 'Title is required'],
        },
        message: {
            type: String,
            required: [true, 'Message is required'],
        },
        type: {
            type: String,
            enum: Object.values(NOTIFICATION_TYPE),
            default: NOTIFICATION_TYPE.SYSTEM,
        },
        isRead: {
            type: Boolean,
            default: false,
        },
        metadata: {
            type: Schema.Types.Mixed,
            default: {},
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for faster queries
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

const Notification: Model<INotification> = mongoose.model<INotification>('Notification', notificationSchema);

export default Notification;
