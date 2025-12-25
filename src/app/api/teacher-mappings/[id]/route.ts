import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import TeacherMapping from '@/models/TeacherMapping';
import User from '@/models/User';
import { auth } from '@/lib/auth';

// Delete mapping
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

        // Ensure mapping belongs to user's department
        const mapping = await TeacherMapping.findOne({
            _id: id,
            department: user.department,
        });

        if (!mapping) {
            return NextResponse.json({ error: 'Mapping not found' }, { status: 404 });
        }

        await TeacherMapping.findByIdAndDelete(id);

        return NextResponse.json({ message: 'Mapping deleted' }, { status: 200 });
    } catch (error) {
        console.error('Error deleting mapping:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
