import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IFeedbackSession extends Document {
    class: Types.ObjectId;
    department: Types.ObjectId;
    studentCount: number;
    uniqueCode: string;
    isActive: boolean;
    closedAt?: Date;
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const FeedbackSessionSchema = new Schema<IFeedbackSession>(
    {
        class: {
            type: Schema.Types.ObjectId,
            ref: 'Class',
            required: true,
        },
        department: {
            type: Schema.Types.ObjectId,
            ref: 'Department',
            required: true,
        },
        studentCount: {
            type: Number,
            required: true,
            min: 1,
        },
        uniqueCode: {
            type: String,
            required: true,
            unique: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        closedAt: {
            type: Date,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

const FeedbackSession: Model<IFeedbackSession> =
    mongoose.models.FeedbackSession ||
    mongoose.model<IFeedbackSession>('FeedbackSession', FeedbackSessionSchema);

export default FeedbackSession;
