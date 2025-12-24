import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IIAMPPointApplicableTypes {
    theory: boolean;
    practical: boolean;
    sla: boolean;
}

export interface IIAMPPoint extends Document {
    name: string;
    description?: string;
    applicableTypes: IIAMPPointApplicableTypes;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const IAMPPointSchema = new Schema<IIAMPPoint>(
    {
        name: {
            type: String,
            required: [true, 'IAMP Point name is required'],
            unique: true,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        applicableTypes: {
            theory: {
                type: Boolean,
                default: true,
            },
            practical: {
                type: Boolean,
                default: true,
            },
            sla: {
                type: Boolean,
                default: true,
            },
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
