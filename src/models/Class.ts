import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IClass extends Document {
    name: string;
    year: string;
    division?: string;
    displayName: string;
    department: Types.ObjectId;
    isActive: boolean;
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const ClassSchema = new Schema<IClass>(
    {
        name: {
            type: String,
            required: [true, 'Class name is required'],
            trim: true,
        },
        year: {
            type: String,
            required: [true, 'Year is required'],
            enum: ['FY', 'SY', 'TY', 'BTech'],
            trim: true,
        },
        division: {
            type: String,
            trim: true,
        },
        displayName: {
            type: String,
            required: true,
            trim: true,
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
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

// Compound index for unique class per department
ClassSchema.index({ year: 1, division: 1, department: 1 }, { unique: true });

// Pre-save hook to generate displayName
ClassSchema.pre('save', function () {
    if (this.division) {
        this.displayName = `${this.year}-${this.division}`;
        this.name = `${this.year}-${this.division}`;
    } else {
        this.displayName = this.year;
        this.name = this.year;
    }
});

const Class =
    (mongoose.models.Class as mongoose.Model<IClass>) ||
    mongoose.model<IClass>('Class', ClassSchema);

export default Class;
