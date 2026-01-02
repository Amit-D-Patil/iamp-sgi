import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IIAMPPoint extends Document {
    name: string;
    description?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const IAMPPointSchema = new Schema<IIAMPPoint>(
    {
        name: {
            type: String,
            required: [true, 'IAMC Point name is required'],
            unique: true,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
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

const IAMPPoint: Model<IIAMPPoint> =
    mongoose.models.IAMPPoint || mongoose.model<IIAMPPoint>('IAMPPoint', IAMPPointSchema);

export default IAMPPoint;
