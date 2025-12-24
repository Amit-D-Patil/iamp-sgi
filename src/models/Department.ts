import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IDepartment extends Document {
    name: string;
    shortName: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const DepartmentSchema = new Schema<IDepartment>(
    {
        name: {
            type: String,
            required: [true, 'Department name is required'],
            unique: true,
            trim: true,
        },
        shortName: {
            type: String,
            required: [true, 'Short name is required'],
            trim: true,
            uppercase: true,
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

const Department: Model<IDepartment> =
    mongoose.models.Department || mongoose.model<IDepartment>('Department', DepartmentSchema);

export default Department;
