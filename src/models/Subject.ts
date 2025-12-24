import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface ISubjectTypes {
    hasTheory: boolean;
    hasPractical: boolean;
    practicalType?: {
        saPr?: {
            enabled: boolean;
            type?: 'internal' | 'external';
        };
        faPr?: boolean;
    };
    hasSLA: boolean;
}

export interface ISubject extends Document {
    name: string;
    code?: string;
    department: Types.ObjectId;
    types: ISubjectTypes;
    createdBy: Types.ObjectId;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const SubjectSchema = new Schema<ISubject>(
    {
        name: {
            type: String,
            required: [true, 'Subject name is required'],
            trim: true,
        },
        code: {
            type: String,
            trim: true,
        },
        department: {
            type: Schema.Types.ObjectId,
            ref: 'Department',
            required: true,
        },
        types: {
            hasTheory: {
                type: Boolean,
                default: true,
            },
            hasPractical: {
                type: Boolean,
                default: false,
            },
            practicalType: {
                saPr: {
                    enabled: {
                        type: Boolean,
                        default: false,
                    },
                    type: {
                        type: String,
                        enum: ['internal', 'external'],
                    },
                },
                faPr: {
                    type: Boolean,
                    default: false,
                },
            },
            hasSLA: {
                type: Boolean,
                default: false,
            },
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

// Compound index to ensure unique subject name per department
SubjectSchema.index({ name: 1, department: 1 }, { unique: true });

const Subject: Model<ISubject> =
    mongoose.models.Subject || mongoose.model<ISubject>('Subject', SubjectSchema);

export default Subject;
