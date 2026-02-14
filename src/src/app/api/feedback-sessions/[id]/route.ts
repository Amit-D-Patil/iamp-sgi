import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import FeedbackSession from '@/models/FeedbackSession';
import User from '@/models/User';
import { auth } from '@/lib/auth';

// Toggle or update a feedback session
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session || !['super_admin', 'feedback_coordinator'].includes(session.user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        await connectDB();

        const { id } = await params;
        const body = await request.json();

        let query: { _id: string; department?: string } = { _id: id };

        // Non-super_admin must belong to the same department
        if (session.user.role !== 'super_admin') {
            const user = await User.findById(session.user.id);
            if (!user?.department) {
                return NextResponse.json({ error: 'No department assigned' }, { status: 400 });
            }
            query.department = user.department.toString();
        }

        // Ensure session exists (and belongs to user's department if not super_admin)
        const existingSession = await FeedbackSession.findOne(query);

        if (!existingSession) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        // If closing the session, set closedAt
        if (body.isActive === false && existingSession.isActive) {
            body.closedAt = new Date();
        }

        const feedbackSession = await FeedbackSession.findByIdAndUpdate(id, body, { new: true })
            .populate('class', 'displayName year division');

        return NextResponse.json({ session: feedbackSession }, { status: 200 });
    } catch (error) {
        console.error('Error updating feedback session:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// Delete a feedback session
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session || session.user.role !== 'super_admin') {
            return NextResponse.json({ error: 'Unauthorized - Only super admin can delete sessions' }, { status: 403 });
        }

        await connectDB();

        const { id } = await params;

        const feedbackSession = await FeedbackSession.findById(id);
        if (!feedbackSession) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        await FeedbackSession.findByIdAndDelete(id);

        return NextResponse.json({ message: 'Session deleted' }, { status: 200 });
    } catch (error) {
        console.error('Error deleting feedback session:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
