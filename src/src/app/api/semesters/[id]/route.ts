import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Semester from '@/models/Semester';
import { auth } from '@/lib/auth';

// Update semester
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session || session.user.role !== 'super_admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        await connectDB();

        const { id } = await params;
        const body = await request.json();

        const semester = await Semester.findByIdAndUpdate(id, body, { new: true });

        if (!semester) {
            return NextResponse.json({ error: 'Semester not found' }, { status: 404 });
        }

        return NextResponse.json({ semester }, { status: 200 });
    } catch (error) {
        console.error('Error updating semester:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// Delete semester
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session || session.user.role !== 'super_admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        await connectDB();

        const { id } = await params;
        const semester = await Semester.findByIdAndDelete(id);

        if (!semester) {
            return NextResponse.json({ error: 'Semester not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Semester deleted' }, { status: 200 });
    } catch (error) {
        console.error('Error deleting semester:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
