import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IBatch extends Document {
    name: string;
    class: Types.ObjectId;
    department: Types.ObjectId;
    isActive: boolean;
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const BatchSchema = new Schema<IBatch>(
    {
        name: {
            type: String,
            required: [true, 'Batch name is required'],
            trim: true,
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
        isActive: {
            type: Boolean,
            default: true,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    {
        timestamps: true,
    }
);

// Unique batch name per class
BatchSchema.index({ name: 1, class: 1 }, { unique: true });

const Batch: Model<IBatch> =
    mongoose.models.Batch || mongoose.model<IBatch>('Batch', BatchSchema);

export default Batch;
