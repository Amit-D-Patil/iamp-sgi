import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import FeedbackSession from '@/models/FeedbackSession';
import FeedbackResponse from '@/models/FeedbackResponse';
import TeacherMapping from '@/models/TeacherMapping';
import Question from '@/models/Question';
import Batch from '@/models/Batch';
import Class from '@/models/Class';
import Department from '@/models/Department';
import Teacher from '@/models/Teacher';
import Subject from '@/models/Subject';

// Ensure models are registered
Class;
Department;
Teacher;
Subject;
Batch;

// Grade to points mapping
const gradePoints: Record<string, number> = {
    A: 10,
    B: 7.5,
    C: 5,
    D: 2.5,
};

// GET - Get feedback session info and questions (public)
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ code: string }> }
) {
    try {
        await connectDB();

        const { code } = await params;

        const feedbackSession = await FeedbackSession.findOne({ uniqueCode: code })
            .populate('class', 'displayName year division')
            .populate('department', 'name shortName');

        if (!feedbackSession) {
            return NextResponse.json({ error: 'Feedback session not found' }, { status: 404 });
        }

        if (!feedbackSession.isActive) {
            return NextResponse.json({ error: 'This feedback session is closed' }, { status: 400 });
        }

        // Get response count
        const responseCount = await FeedbackResponse.countDocuments({
            feedbackSession: feedbackSession._id
        });

        // Check if limit reached
        if (responseCount >= feedbackSession.studentCount) {
            return NextResponse.json({ error: 'Maximum responses reached' }, { status: 400 });
        }

        // Check if already submitted via cookie
        const cookieName = `feedback_${code}`;
        const submittedCookie = request.cookies.get(cookieName);
        const alreadySubmitted = submittedCookie?.value === 'submitted';

        // Get batches for this class
        const batches = await Batch.find({
            class: feedbackSession.class._id,
            isActive: true,
        }).select('name');

        // Get questions
        const questions = await Question.find({ isActive: true }).sort({ order: 1 });

        // Get teacher mappings for this class (exclude SLA - only theory and practical for feedback)
        const rawMappings = await TeacherMapping.find({
            class: feedbackSession.class._id,
            isActive: true,
            teachingType: { $in: ['theory', 'practical'] }, // Exclude SLA
        })
            .populate('teacher', 'name shortName')
            .populate('subject', 'name code')
            .populate('batches', 'name');

        // Filter out mappings with deleted teachers or subjects
        const mappings = rawMappings.filter(mapping => {
            // Check if teacher and subject exist (not deleted)
            return mapping.teacher && mapping.subject;
        });

        return NextResponse.json({
            session: {
                id: feedbackSession._id,
                class: feedbackSession.class,
                department: feedbackSession.department,
                studentCount: feedbackSession.studentCount,
                responseCount,
                remainingSlots: feedbackSession.studentCount - responseCount,
                alreadySubmitted,
            },
            batches,
            questions,
            mappings,
        }, { status: 200 });
    } catch (error) {
        console.error('Error fetching feedback session:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST - Submit feedback response (public)
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ code: string }> }
) {
    try {
        await connectDB();

        const { code } = await params;

        const feedbackSession = await FeedbackSession.findOne({ uniqueCode: code });

        if (!feedbackSession) {
            return NextResponse.json({ error: 'Feedback session not found' }, { status: 404 });
        }

        if (!feedbackSession.isActive) {
            return NextResponse.json({ error: 'This feedback session is closed' }, { status: 400 });
        }

        // Check if limit reached
        const responseCount = await FeedbackResponse.countDocuments({
            feedbackSession: feedbackSession._id
        });

        if (responseCount >= feedbackSession.studentCount) {
            return NextResponse.json({ error: 'Maximum responses reached' }, { status: 400 });
        }

        const body = await request.json();
        const { batchId, responses } = body;

        if (!responses || !Array.isArray(responses)) {
            return NextResponse.json({ error: 'Responses are required' }, { status: 400 });
        }

        // Process responses and calculate points
        const processedResponses = responses.map((r: {
            questionId: string;
            type: string;
            teacherResponses?: { teacherId: string; teachingType: string; grade: string }[];
            textResponse?: string;
            yesNoResponse?: boolean;
        }) => {
            const response: {
                question: string;
                teacherResponses?: { teacher: string; teachingType: string; grade: string; points: number }[];
                textResponse?: string;
                yesNoResponse?: boolean;
            } = {
                question: r.questionId,
            };

            if (r.type === 'abcd_grade' && r.teacherResponses) {
                response.teacherResponses = r.teacherResponses.map((tr) => ({
                    teacher: tr.teacherId,
                    teachingType: tr.teachingType,
                    grade: tr.grade,
                    points: gradePoints[tr.grade] || 0,
                }));
            } else if (r.type === 'text') {
                response.textResponse = r.textResponse;
            } else if (r.type === 'yes_no') {
                response.yesNoResponse = r.yesNoResponse;
            }

            return response;
        });

        // Type assertion needed because Mongoose handles ObjectId conversion
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const feedbackResponse = await FeedbackResponse.create({
            feedbackSession: feedbackSession._id,
            batch: batchId || undefined,
            responses: processedResponses,
        } as any) as unknown as { _id: string };

        // Set cookie to prevent duplicate submissions
        const cookieName = `feedback_${code}`;
        const response = NextResponse.json({
            message: 'Feedback submitted successfully',
            responseId: feedbackResponse._id,
        }, { status: 201 });

        // Cookie expires in 30 days
        response.cookies.set(cookieName, 'submitted', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 30, // 30 days
        });

        return response;
    } catch (error) {
        console.error('Error submitting feedback:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
