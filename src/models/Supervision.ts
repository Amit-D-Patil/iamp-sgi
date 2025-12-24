import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface ISupervision extends Document {
    teacher: Types.ObjectId;
    subject: Types.ObjectId;
    class: Types.ObjectId;
    iampPoint: Types.ObjectId;
    department: Types.ObjectId;
    semester: Types.ObjectId;
    markedBy: Types.ObjectId;
    status: 'yes' | 'no' | 'na';
    remarks?: string;
    createdAt: Date;
    updatedAt: Date;
}

const SupervisionSchema = new Schema<ISupervision>(
    {
        teacher: {
            type: Schema.Types.ObjectId,
            ref: 'Teacher',
            required: true,
        },
        subject: {
            type: Schema.Types.ObjectId,
            ref: 'Subject',
            required: true,
        },
        class: {
            type: Schema.Types.ObjectId,
            ref: 'Class',
            required: true,
        },
        iampPoint: {
            type: Schema.Types.ObjectId,
            ref: 'IAMPPoint',
            required: true,
        },
        department: {
            type: Schema.Types.ObjectId,
            ref: 'Department',
            required: true,
        },
        semester: {
            type: Schema.Types.ObjectId,
            ref: 'Semester',
            required: true,
        },
        markedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        status: {
            type: String,
            enum: ['yes', 'no', 'na'],
            required: true,
        },
        remarks: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

// Index for efficient queries - unique per teacher-subject-class-iampPoint-semester combination
SupervisionSchema.index(
    { teacher: 1, subject: 1, class: 1, iampPoint: 1, semester: 1 },
    { unique: true }
);

const Supervision: Model<ISupervision> =
    mongoose.models.Supervision || mongoose.model<ISupervision>('Supervision', SupervisionSchema);

export default Supervision;
