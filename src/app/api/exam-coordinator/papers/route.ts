import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { auth } from '@/lib/auth';
import PaperSubmission from '@/models/PaperSubmission';
import User from '@/models/User';

// GET - Get approved submissions for Exam Coordinator by department and session
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session || !['exam_coordinator', 'super_admin'].includes(session.user.role as string)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const departmentId = searchParams.get('departmentId');
        const sessionId = searchParams.get('sessionId');

        if (!departmentId || !sessionId) {
            return NextResponse.json({ error: 'departmentId and sessionId are required' }, { status: 400 });
        }

        await connectDB();

        // Exam Coordinator only sees 'approved' submissions from HOD
        const submissions = await PaperSubmission.find({
            department: departmentId,
            session: sessionId,
            status: 'approved'
        })
        .populate('faculty', 'name phone')
        .populate('subject', 'name code')
        .sort({ createdAt: -1 })
        .select('-set1BlobUrl -set2BlobUrl'); // Hide raw blob URLs

        // Only return subjects that actually have an approved submission
        const report = submissions.map((submission: any) => {
            const subject = submission.subject as any;
            return {
                subjectId: subject._id,
                subjectname: subject.name,
                subjectCode: subject.code,
                hasApprovedSubmission: true,
                submissionId: submission._id,
                yearAndDiv: submission.yearAndDiv || '-',
                facultyName: submission.faculty?.name || '-',
                set1Name: submission.set1Name,
                set2Name: submission.set2Name,
                finalSet: submission.finalSet || null,
                finalSetSelectedAt: submission.finalSetSelectedAt || null
            };
        });

        return NextResponse.json({ data: report });
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
