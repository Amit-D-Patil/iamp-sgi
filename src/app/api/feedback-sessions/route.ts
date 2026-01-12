import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import FeedbackSession from '@/models/FeedbackSession';
import FeedbackResponse from '@/models/FeedbackResponse';
import Class from '@/models/Class';
import Batch from '@/models/Batch';
import User from '@/models/User';
import { auth } from '@/lib/auth';
import { nanoid } from 'nanoid';

// Ensure models are registered
Class;
FeedbackResponse;

// Get feedback sessions - super_admin sees all or filtered by department, coordinators see their department
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        const { searchParams } = new URL(request.url);
        const departmentParam = searchParams.get('department');

        let query: { department?: string } = {};

        // Super admin can filter by department or see all
        if (session.user.role === 'super_admin') {
            if (departmentParam) {
                query = { department: departmentParam };
            }
            // else: no filter, see all
        } else {
            // Coordinators see only their department
            const user = await User.findById(session.user.id);
            if (!user?.department) {
                return NextResponse.json({ error: 'No department assigned' }, { status: 400 });
            }
            query = { department: user.department.toString() };
        }

        const sessions = await FeedbackSession.find(query)
            .populate({
                path: 'class',
                select: 'displayName year division department',
                populate: { path: 'department', select: 'shortName' }
            })
            .sort({ createdAt: -1 });

        // Get response counts for each session
        const sessionsWithCounts = await Promise.all(
            sessions.map(async (s) => {
                const responseCount = await FeedbackResponse.countDocuments({ feedbackSession: s._id });
                return {
                    ...s.toObject(),
                    responseCount,
                };
            })
        );

        return NextResponse.json({ sessions: sessionsWithCounts }, { status: 200 });
    } catch (error) {
        console.error('Error fetching feedback sessions:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// Create a new feedback session
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session || session.user.role !== 'super_admin') {
            return NextResponse.json({ error: 'Unauthorized - Only super admin can create feedback sessions' }, { status: 403 });
        }

        await connectDB();

        const body = await request.json();
        const { classId, studentCount } = body;

        if (!classId || !studentCount) {
            return NextResponse.json(
                { error: 'Class and student count are required' },
                { status: 400 }
            );
        }

        // Get class to find its department
        const classDoc = await Class.findById(classId);
        if (!classDoc) {
            return NextResponse.json({ error: 'Class not found' }, { status: 404 });
        }

        // Check if batches exist for this class
        const batchCount = await Batch.countDocuments({ class: classId, isActive: true });
        if (batchCount === 0) {
            return NextResponse.json(
                { error: 'No batches found for this class. Please create batches first before starting feedback.' },
                { status: 400 }
            );
        }

        // Generate unique code
        const uniqueCode = nanoid(8);

        const feedbackSession = await FeedbackSession.create({
            class: classId,
            department: classDoc.department,
            studentCount,
            uniqueCode,
            createdBy: session.user.id,
        });

        await feedbackSession.populate('class', 'displayName year division');

        return NextResponse.json({ session: feedbackSession }, { status: 201 });
    } catch (error) {
        console.error('Error creating feedback session:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
