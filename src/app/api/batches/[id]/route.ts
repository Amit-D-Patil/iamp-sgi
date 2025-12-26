import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Batch from '@/models/Batch';
import User from '@/models/User';
import { auth } from '@/lib/auth';

// Delete a batch
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

        // Ensure batch belongs to user's department
        const batch = await Batch.findOne({ _id: id, department: user.department });
        if (!batch) {
            return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
        }

        await Batch.findByIdAndDelete(id);

        return NextResponse.json({ message: 'Batch deleted' }, { status: 200 });
    } catch (error) {
        console.error('Error deleting batch:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// Update a batch
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

        // Ensure batch belongs to user's department
        const existingBatch = await Batch.findOne({ _id: id, department: user.department });
        if (!existingBatch) {
            return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
        }

        const batch = await Batch.findByIdAndUpdate(id, body, { new: true })
            .populate('class', 'displayName');

        return NextResponse.json({ batch }, { status: 200 });
    } catch (error) {
        console.error('Error updating batch:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
