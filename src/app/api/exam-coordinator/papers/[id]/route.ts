import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { auth } from '@/lib/auth';
import PaperSubmission from '@/models/PaperSubmission';

type Params = { params: Promise<{ id: string }> };

// PATCH - Exam Coordinator chooses the final set
export async function PATCH(request: NextRequest, { params }: Params) {
    try {
        const session = await auth();
        if (!session || !['exam_coordinator', 'super_admin'].includes(session.user.role as string)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        await connectDB();
        const { id } = await params;
        const body = await request.json();
        const { finalSet } = body; // 1 or 2

        if (![1, 2].includes(finalSet)) {
            return NextResponse.json({ error: 'Invalid set selected. Must be 1 or 2.' }, { status: 400 });
        }

        const submission = await PaperSubmission.findById(id);

        if (!submission) {
            return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
        }

        if (submission.status !== 'approved') {
            return NextResponse.json({ error: 'Cannot finalize unapproved papers' }, { status: 400 });
        }

        submission.finalSet = finalSet;
        submission.finalSetSelectedBy = session.user.id as any;
        submission.finalSetSelectedAt = new Date();

        await submission.save();

        return NextResponse.json({ message: 'Final set updated successfully', submission });
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
