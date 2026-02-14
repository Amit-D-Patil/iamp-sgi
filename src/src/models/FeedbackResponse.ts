import mongoose, { Schema, Document, Model, Types } from 'mongoose';

interface QuestionResponse {
    question: Types.ObjectId;
    // For abcd_grade type: stores the grade given to each teacher
    teacherResponses?: {
        teacher: Types.ObjectId;
        teachingType: 'theory' | 'practical' | 'sla';
        grade?: 'A' | 'B' | 'C' | 'D';
        points?: number;
    }[];
    // For text type: single text response
    textResponse?: string;
    // For yes_no type: true = yes, false = no
    yesNoResponse?: boolean;
}

export interface IFeedbackResponse extends Document {
    feedbackSession: Types.ObjectId;
    batch?: Types.ObjectId;
    responses: QuestionResponse[];
    submittedAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const FeedbackResponseSchema = new Schema<IFeedbackResponse>(
    {
        feedbackSession: {
            type: Schema.Types.ObjectId,
            ref: 'FeedbackSession',
            required: true,
        },
        batch: {
            type: Schema.Types.ObjectId,
            ref: 'Batch',
        },
        responses: [{
            question: {
                type: Schema.Types.ObjectId,
                ref: 'Question',
                required: true,
            },
            teacherResponses: [{
                teacher: {
                    type: Schema.Types.ObjectId,
                    ref: 'Teacher',
                },
                teachingType: {
                    type: String,
                    enum: ['theory', 'practical', 'sla'],
                },
                grade: {
                    type: String,
                    enum: ['A', 'B', 'C', 'D'],
                },
                points: Number,
            }],
            textResponse: String,
            yesNoResponse: Boolean,
        }],
        submittedAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

// Index for querying by session
FeedbackResponseSchema.index({ feedbackSession: 1 });

const FeedbackResponse: Model<IFeedbackResponse> =
    mongoose.models.FeedbackResponse ||
    mongoose.model<IFeedbackResponse>('FeedbackResponse', FeedbackResponseSchema);

export default FeedbackResponse;
