import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IPaperSubmissionSession extends Document {
    title: string;
    type: 'class_test';
    isActive: boolean;
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const PaperSubmissionSessionSchema = new Schema<IPaperSubmissionSession>(
    {
        title: {
            type: String,
            required: [true, 'Session title is required'],
            trim: true,
        },
        type: {
            type: String,
            enum: ['class_test'],
            default: 'class_test',
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    },
    { timestamps: true }
);

const PaperSubmissionSession: Model<IPaperSubmissionSession> =
    mongoose.models.PaperSubmissionSession ||
    mongoose.model<IPaperSubmissionSession>('PaperSubmissionSession', PaperSubmissionSessionSchema);

export default PaperSubmissionSession;
