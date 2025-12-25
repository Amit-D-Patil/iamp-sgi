import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Batch from '@/models/Batch';
import Class from '@/models/Class';
import User from '@/models/User';
import { auth } from '@/lib/auth';

// Ensure Class model is registered
Class;

// Get batches for a class
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        const user = await User.findById(session.user.id);
        if (!user?.department) {
            return NextResponse.json({ error: 'No department assigned' }, { status: 400 });
        }

        const { searchParams } = new URL(request.url);
        const classId = searchParams.get('class');

        const query: Record<string, unknown> = { department: user.department };
        if (classId) {
            query.class = classId;
        }

        const batches = await Batch.find(query)
            .populate('class', 'displayName')
            .sort({ name: 1 });

        return NextResponse.json({ batches }, { status: 200 });
    } catch (error) {
        console.error('Error fetching batches:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// Create a new batch
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session || !['iamp_coordinator', 'feedback_coordinator'].includes(session.user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        await connectDB();

        const user = await User.findById(session.user.id);
        if (!user?.department) {
            return NextResponse.json({ error: 'No department assigned' }, { status: 400 });
        }

        const body = await request.json();
        const { name, classId } = body;

        if (!name || !classId) {
            return NextResponse.json({ error: 'Batch name and class are required' }, { status: 400 });
        }

        // Verify class belongs to user's department
        const classDoc = await Class.findOne({ _id: classId, department: user.department });
        if (!classDoc) {
            return NextResponse.json({ error: 'Class not found' }, { status: 404 });
        }

        // Check if batch already exists
        const existing = await Batch.findOne({ name, class: classId });
        if (existing) {
            return NextResponse.json({ error: 'Batch already exists for this class' }, { status: 400 });
        }

        const batch = await Batch.create({
            name,
            class: classId,
            department: user.department,
            createdBy: session.user.id,
        });

        await batch.populate('class', 'displayName');

        return NextResponse.json({ batch }, { status: 201 });
    } catch (error) {
        console.error('Error creating batch:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
