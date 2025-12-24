import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISemester extends Document {
    name: string;
    academicYear: string;
    type: 'odd' | 'even';
    startDate: Date;
    endDate: Date;
    isActive: boolean;
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const SemesterSchema = new Schema<ISemester>(
    {
        name: {
            type: String,
            required: [true, 'Semester name is required'],
            trim: true,
        },
        academicYear: {
            type: String,
            required: [true, 'Academic year is required'],
            trim: true,
        },
        type: {
            type: String,
            enum: ['odd', 'even'],
            required: [true, 'Semester type is required'],
        },
        startDate: {
            type: Date,
            required: [true, 'Start date is required'],
        },
        endDate: {
            type: Date,
            required: [true, 'End date is required'],
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
    {
        timestamps: true,
    }
);

// Virtual for display name
SemesterSchema.virtual('displayName').get(function () {
    return `${this.academicYear} (${this.type === 'odd' ? 'Odd Sem' : 'Even Sem'})`;
});

const Semester =
    (mongoose.models.Semester as mongoose.Model<ISemester>) ||
    mongoose.model<ISemester>('Semester', SemesterSchema);

export default Semester;
