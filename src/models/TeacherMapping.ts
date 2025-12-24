import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ITeacherMapping extends Document {
    teacher: Types.ObjectId;
    subject: Types.ObjectId;
    class: Types.ObjectId;
    department: Types.ObjectId;
    teachingType: 'theory' | 'practical' | 'sla';
    createdBy: Types.ObjectId;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const TeacherMappingSchema = new Schema<ITeacherMapping>(
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
        department: {
            type: Schema.Types.ObjectId,
            ref: 'Department',
            required: true,
        },
        teachingType: {
            type: String,
            enum: ['theory', 'practical', 'sla'],
            required: true,
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

// Compound index for unique mapping per teacher-subject-class-type
TeacherMappingSchema.index(
    { teacher: 1, subject: 1, class: 1, teachingType: 1 },
    { unique: true }
);

const TeacherMapping =
    (mongoose.models.TeacherMapping as mongoose.Model<ITeacherMapping>) ||
    mongoose.model<ITeacherMapping>('TeacherMapping', TeacherMappingSchema);

export default TeacherMapping;
