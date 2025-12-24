import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface ITeacher extends Document {
    name: string;
    shortName: string;
    phone?: string;
    email?: string;
    department: Types.ObjectId;
    createdBy: Types.ObjectId;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const TeacherSchema = new Schema<ITeacher>(
    {
        name: {
            type: String,
            required: [true, 'Teacher name is required'],
            trim: true,
        },
        shortName: {
            type: String,
            trim: true,
        },
        phone: {
            type: String,
            trim: true,
        },
        email: {
            type: String,
            trim: true,
        },
        department: {
            type: Schema.Types.ObjectId,
            ref: 'Department',
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

const Teacher: Model<ITeacher> =
    mongoose.models.Teacher || mongoose.model<ITeacher>('Teacher', TeacherSchema);

export default Teacher;
