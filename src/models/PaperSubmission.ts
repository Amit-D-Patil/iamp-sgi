import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type PaperSubmissionStatus = 'pending' | 'approved' | 'rejected';

export interface IPaperSubmission extends Document {
    session: Types.ObjectId;
    faculty: Types.ObjectId;
    subject: Types.ObjectId;
    department: Types.ObjectId;
    yearAndDiv: string;
    // Internal blob URLs — never sent to client directly
    set1BlobUrl: string;
    set2BlobUrl: string;
    set1Name: string; // original filename for display
    set2Name: string;
    status: PaperSubmissionStatus;
    rejectionReason?: string;
    rejectedSet?: '1' | '2' | 'both';
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
        yearAndDiv: { type: String, required: true },
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
        rejectedSet: {
            type: String,
            enum: ['1', '2', 'both'],
        },
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

// One submission per faculty per session per subject per year/div
PaperSubmissionSchema.index({ faculty: 1, session: 1, subject: 1, yearAndDiv: 1 }, { unique: true });

// In development, clear the model cache to ensure latest schema is used
if (process.env.NODE_ENV !== 'production' && mongoose.models.PaperSubmission) {
    delete mongoose.models.PaperSubmission;
}

const PaperSubmission: Model<IPaperSubmission> =
    mongoose.models.PaperSubmission ||
    mongoose.model<IPaperSubmission>('PaperSubmission', PaperSubmissionSchema);

// Force index sync to drop the old `faculty_1_session_1_subject_1` index that blocked multiple divisions
if (process.env.NODE_ENV !== 'production' && !mongoose.models.PaperSubmission) {
    PaperSubmission.syncIndexes()
        .then(() => console.log('PaperSubmission indexes synced!'))
        .catch((err) => console.error('PaperSubmission index sync error:', err));
}

export default PaperSubmission;

