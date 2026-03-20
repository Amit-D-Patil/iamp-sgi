import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type NotificationType =
    | 'new_submission'       // HOD: a faculty submitted papers
    | 'submission_approved'  // Faculty: HOD approved their submission
    | 'submission_rejected'; // Faculty: HOD rejected their submission

export interface INotification extends Document {
    user: Types.ObjectId;       // recipient
    type: NotificationType;
    title: string;
    message: string;
    relatedSubmission?: Types.ObjectId;
    isRead: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        type: {
            type: String,
            enum: ['new_submission', 'submission_approved', 'submission_rejected'],
            required: true,
        },
        title: { type: String, required: true },
        message: { type: String, required: true },
        relatedSubmission: { type: Schema.Types.ObjectId, ref: 'PaperSubmission' },
        isRead: { type: Boolean, default: false },
    },
    { timestamps: true }
);

const Notification: Model<INotification> =
    mongoose.models.Notification ||
    mongoose.model<INotification>('Notification', NotificationSchema);

export default Notification;
