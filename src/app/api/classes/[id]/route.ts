import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Class from '@/models/Class';
import User from '@/models/User';
import { auth } from '@/lib/auth';

// Update class
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
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

        const { id } = await params;
        const body = await request.json();

        // Ensure class belongs to user's department
        const existingClass = await Class.findOne({
            _id: id,
            department: user.department,
        });

        if (!existingClass) {
            return NextResponse.json({ error: 'Class not found' }, { status: 404 });
        }

        const updatedClass = await Class.findByIdAndUpdate(id, body, { new: true });

        return NextResponse.json({ class: updatedClass }, { status: 200 });
    } catch (error) {
        console.error('Error updating class:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// Delete class
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
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

        const { id } = await params;

        // Ensure class belongs to user's department
        const existingClass = await Class.findOne({
            _id: id,
            department: user.department,
        });

        if (!existingClass) {
            return NextResponse.json({ error: 'Class not found' }, { status: 404 });
        }

        await Class.findByIdAndDelete(id);

        return NextResponse.json({ message: 'Class deleted' }, { status: 200 });
    } catch (error) {
        console.error('Error deleting class:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
