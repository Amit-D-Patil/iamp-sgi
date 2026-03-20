import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { auth } from '@/lib/auth';
import PaperSubmission from '@/models/PaperSubmission';
import User from '@/models/User';
import Notification from '@/models/Notification';

type Params = { params: Promise<{ id: string }> };

// PATCH - HOD approves or rejects a submission
export async function PATCH(request: NextRequest, { params }: Params) {
    try {
        const session = await auth();
        if (!session || (session.user.role as string) !== 'hod') {
            return NextResponse.json({ error: 'Only HOD can review submissions' }, { status: 403 });
        }

        await connectDB();
        const { id } = await params;
        const { action, rejectionReason } = await request.json();

        if (!['approve', 'reject'].includes(action)) {
            return NextResponse.json({ error: 'action must be approve or reject' }, { status: 400 });
        }

        if (action === 'reject' && !rejectionReason?.trim()) {
            return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 });
        }

        // Verify HOD owns the department of this submission
        const hodUser = await User.findById(session.user.id);
        const submission = await PaperSubmission.findById(id)
            .populate('session', 'title')
            .populate('subject', 'name');

        if (!submission) {
            return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
        }

        if (submission.department.toString() !== hodUser?.department?.toString()) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const newStatus = action === 'approve' ? 'approved' : 'rejected';
        submission.status = newStatus;
        submission.reviewedBy = session.user.id as unknown as import('mongoose').Types.ObjectId;
        submission.reviewedAt = new Date();
        if (action === 'reject') {
            submission.rejectionReason = rejectionReason.trim();
        } else {
            submission.rejectionReason = undefined;
        }
        await submission.save();

        // Notify the faculty member
        const sessionTitle = (submission.session as unknown as { title: string })?.title || 'the session';
        const subjectName = (submission.subject as unknown as { name: string })?.name || 'the subject';

        await Notification.create({
            user: submission.faculty,
            type: newStatus === 'approved' ? 'submission_approved' : 'submission_rejected',
            title: newStatus === 'approved' ? 'Paper Approved ✓' : 'Paper Rejected ✗',
            message:
                newStatus === 'approved'
                    ? `Your paper submission for "${subjectName}" (${sessionTitle}) has been approved.`
                    : `Your paper submission for "${subjectName}" (${sessionTitle}) was rejected. Reason: ${rejectionReason}`,
            relatedSubmission: submission._id,
        });

        return NextResponse.json({ message: `Submission ${newStatus}`, submission });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// GET - get a single submission (without blob URLs)
export async function GET(request: NextRequest, { params }: Params) {
    try {
        const session = await auth();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await connectDB();
        const { id } = await params;

        const submission = await PaperSubmission.findById(id)
            .populate('faculty', 'name phone')
            .populate('subject', 'name code')
            .populate('department', 'name shortName')
            .populate('session', 'title type')
            .populate('reviewedBy', 'name')
            .select('-set1BlobUrl -set2BlobUrl');

        if (!submission) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        return NextResponse.json({ submission });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
