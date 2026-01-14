import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Teacher from '@/models/Teacher';
import TeacherMapping from '@/models/TeacherMapping';
import { auth } from '@/lib/auth';

// Update a teacher
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

        const teacher = await Teacher.findByIdAndUpdate(id, body, { new: true })
            .populate('department', 'name shortName')
            .populate('subjects', 'name code');

        if (!teacher) {
            return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
        }

        return NextResponse.json({ teacher }, { status: 200 });
    } catch (error) {
        console.error('Error updating teacher:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// Delete a teacher
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

        const teacher = await Teacher.findByIdAndDelete(id);

        if (!teacher) {
            return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
        }

        // Cascade delete: Remove all teacher mappings for this teacher
        const deletedMappings = await TeacherMapping.deleteMany({ teacher: id });
        console.log(`Deleted ${deletedMappings.deletedCount} mappings for teacher ${id}`);

        return NextResponse.json({
            message: 'Teacher deleted',
            deletedMappings: deletedMappings.deletedCount
        }, { status: 200 });
    } catch (error) {
        console.error('Error deleting teacher:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
