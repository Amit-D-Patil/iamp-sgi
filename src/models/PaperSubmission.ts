import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type PaperSubmissionStatus = 'pending' | 'approved' | 'rejected';

export interface IPaperSubmission extends Document {
    session: Types.ObjectId;
    faculty: Types.ObjectId;
    subject: Types.ObjectId;
    department: Types.ObjectId;
    // Internal blob URLs — never sent to client directly
    set1BlobUrl: string;
    set2BlobUrl: string;
    set1Name: string; // original filename for display
    set2Name: string;
    status: PaperSubmissionStatus;
    rejectionReason?: string;
    reviewedBy?: Types.ObjectId;
    reviewedAt?: Date;
    finalSet?: 1 | 2;
    finalSetSelectedBy?: Types.ObjectId;
    finalSetSelectedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const PaperSubmissionSchema = new Schema<IPaperSubmission>(
    {
        session: {
            type: Schema.Types.ObjectId,
            ref: 'PaperSubmissionSession',
            required: true,
        },
        faculty: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        subject: {
            type: Schema.Types.ObjectId,
            ref: 'Subject',
            required: true,
        },
        department: {
            type: Schema.Types.ObjectId,
            ref: 'Department',
            required: true,
        },
        set1BlobUrl: { type: String, required: true },
        set2BlobUrl: { type: String, required: true },
        set1Name: { type: String, required: true },
        set2Name: { type: String, required: true },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending',
        },
        rejectionReason: { type: String },
        reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        reviewedAt: { type: Date },
        finalSet: {
            type: Number,
            enum: [1, 2],
        },
        finalSetSelectedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        finalSetSelectedAt: { type: Date },
    },
    { timestamps: true }
);

// One submission per faculty per session per subject
PaperSubmissionSchema.index({ faculty: 1, session: 1, subject: 1 }, { unique: true });

const PaperSubmission: Model<IPaperSubmission> =
    mongoose.models.PaperSubmission ||
    mongoose.model<IPaperSubmission>('PaperSubmission', PaperSubmissionSchema);

export default PaperSubmission;
