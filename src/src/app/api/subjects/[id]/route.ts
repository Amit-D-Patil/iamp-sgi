import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Subject from '@/models/Subject';
import { auth } from '@/lib/auth';

// Update a subject
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
        const { id } = await params;
        const body = await request.json();

        const subject = await Subject.findByIdAndUpdate(id, body, { new: true })
            .populate('department', 'name shortName');

        if (!subject) {
            return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
        }

        return NextResponse.json({ subject }, { status: 200 });
    } catch (error) {
        console.error('Error updating subject:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// Delete a subject
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
        const { id } = await params;

        const subject = await Subject.findByIdAndDelete(id);

        if (!subject) {
            return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Subject deleted' }, { status: 200 });
    } catch (error) {
        console.error('Error deleting subject:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
