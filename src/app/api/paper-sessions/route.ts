import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { auth } from '@/lib/auth';
import PaperSubmissionSession from '@/models/PaperSubmissionSession';

// GET - list all sessions (super_admin: all; faculty/hod: active only)
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await connectDB();

        const role = session.user.role;
        const filter =
            role === 'super_admin' ? {} : { isActive: true };

        const sessions = await PaperSubmissionSession.find(filter)
            .populate('createdBy', 'name')
            .sort({ createdAt: -1 });

        return NextResponse.json({ sessions });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST - super_admin creates a new submission session
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session || session.user.role !== 'super_admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        await connectDB();
        const { title, type } = await request.json();

        if (!title) {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 });
        }

        const newSession = await PaperSubmissionSession.create({
            title,
            type: type || 'class_test',
            isActive: true,
            createdBy: session.user.id,
        });

        return NextResponse.json({ session: newSession }, { status: 201 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
