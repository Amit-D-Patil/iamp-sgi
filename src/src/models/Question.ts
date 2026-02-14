import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IQuestion extends Document {
    text: string;
    type: 'abcd_grade' | 'text' | 'yes_no';
    category?: string;
    order: number;
    isActive: boolean;
    isRequired: boolean;
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const QuestionSchema = new Schema<IQuestion>(
    {
        text: {
            type: String,
            required: [true, 'Question text is required'],
            trim: true,
        },
        type: {
            type: String,
            enum: ['abcd_grade', 'text', 'yes_no'],
            default: 'abcd_grade',
        },
        category: {
            type: String,
            trim: true,
        },
        order: {
            type: Number,
            default: 0,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        isRequired: {
            type: Boolean,
            default: false,
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

// Index for ordering
QuestionSchema.index({ order: 1 });

const Question: Model<IQuestion> =
    mongoose.models.Question || mongoose.model<IQuestion>('Question', QuestionSchema);

export default Question;
