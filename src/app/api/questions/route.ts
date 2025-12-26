import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Question from '@/models/Question';
import { auth } from '@/lib/auth';

// Get all questions (global for all departments)
export async function GET() {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        const questions = await Question.find({ isActive: true })
            .sort({ order: 1, createdAt: 1 });

        return NextResponse.json({ questions }, { status: 200 });
    } catch (error) {
        console.error('Error fetching questions:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// Create a new question (super_admin only)
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session || session.user.role !== 'super_admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        await connectDB();

        const body = await request.json();
        const { text, type, category } = body;

        if (!text) {
            return NextResponse.json({ error: 'Question text is required' }, { status: 400 });
        }

        // Get the next order number
        const lastQuestion = await Question.findOne().sort({ order: -1 });
        const nextOrder = lastQuestion ? lastQuestion.order + 1 : 1;

        const question = await Question.create({
            text,
            type: type || 'abcd_grade',
            category,
            order: nextOrder,
            createdBy: session.user.id,
        });

        return NextResponse.json({ question }, { status: 201 });
    } catch (error) {
        console.error('Error creating question:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
