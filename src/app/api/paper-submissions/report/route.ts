import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { auth } from '@/lib/auth';
import PaperSubmission from '@/models/PaperSubmission';
import Subject from '@/models/Subject';
import User from '@/models/User';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session || !['hod', 'super_admin'].includes(session.user.role as string)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const sessionId = searchParams.get('sessionId');

        if (!sessionId) {
            return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
        }

        await connectDB();

        // 1. Get the department of the user
        const user = await User.findById(session.user.id);
        if (!user?.department && session.user.role !== 'super_admin') {
            return NextResponse.json({ error: 'No department assigned' }, { status: 400 });
        }

        const departmentId = user?.department;

        // 2. Fetch all subjects in the department
        const subjects = await Subject.find({ department: departmentId, isActive: true })
            .sort({ name: 1 })
            .select('name code');

        // 3. Fetch all submissions for the given session in this department
        const submissions = await PaperSubmission.find({
            session: sessionId,
            department: departmentId,
        })
            .populate('faculty', 'name phone')
            .select('subject status faculty reviewedAt yearAndDiv');

        // 4. Map subjects to their submission status
        const report = subjects.map(subject => {
            const submission = submissions.find((s: any) => s.subject.toString() === subject._id.toString()) as any;
            return {
                subjectId: subject._id,
                subjectName: subject.name,
                subjectCode: subject.code,
                status: submission ? submission.status : 'not_submitted',
                facultyName: submission?.faculty?.name || '-',
                yearAndDiv: submission?.yearAndDiv || '-',
                submittedAt: submission ? submission.createdAt : null, // Mongoose includes createdAt by default if timestamps: true
                reviewedAt: submission?.reviewedAt || null
            };
        });

        return NextResponse.json({
            report,
            summary: {
                total: subjects.length,
                submitted: submissions.length,
                remaining: subjects.length - submissions.length
            }
        });

    } catch (error) {
        console.error('Report API Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
