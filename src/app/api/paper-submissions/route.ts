import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { auth } from '@/lib/auth';
import { put } from '@vercel/blob';
import PaperSubmission from '@/models/PaperSubmission';
import PaperSubmissionSession from '@/models/PaperSubmissionSession';
import Teacher from '@/models/Teacher';
import User from '@/models/User';
import Notification from '@/models/Notification';

// GET - list submissions (faculty: own; HOD: department; super_admin: all)
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await connectDB();

        const { searchParams } = new URL(request.url);
        const sessionId = searchParams.get('sessionId');
        const role = session.user.role as string;

        let filter: Record<string, unknown> = {};
        if (sessionId) filter.session = sessionId;

        if (role === 'faculty') {
            filter.faculty = session.user.id;
        } else if (role === 'hod') {
            // Find HOD's department
            const hodUser = await User.findById(session.user.id);
            if (!hodUser?.department) {
                return NextResponse.json({ submissions: [] });
            }
            filter.department = hodUser.department;
        }
        // super_admin sees everything

        const submissions = await PaperSubmission.find(filter)
            .populate('faculty', 'name phone')
            .populate('subject', 'name code')
            .populate('department', 'name shortName')
            .populate('session', 'title type')
            .populate('reviewedBy', 'name')
            .sort({ createdAt: -1 })
            .select('-set1BlobUrl -set2BlobUrl'); // never expose raw blob URLs

        return NextResponse.json({ submissions });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST - faculty uploads paper sets
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session || (session.user.role as string) !== 'faculty') {
            return NextResponse.json({ error: 'Only faculty can submit papers' }, { status: 403 });
        }

        await connectDB();

        const formData = await request.formData();
        const sessionId = formData.get('sessionId') as string;
        const subjectId = formData.get('subjectId') as string;
        const yearAndDiv = formData.get('yearAndDiv') as string;
        const set1File = formData.get('set1') as File | null;
        const set2File = formData.get('set2') as File | null;

        // We need to check for existing submission first to know which files are required
        const existing = await PaperSubmission.findOne({
            faculty: session.user.id,
            session: sessionId,
            subject: subjectId,
            yearAndDiv: yearAndDiv,
        });

        if (existing && existing.status !== 'rejected') {
            return NextResponse.json(
                { error: 'You have already submitted papers for this subject in this session' },
                { status: 409 }
            );
        }

        let isSet1Required = true;
        let isSet2Required = true;

        if (existing && existing.status === 'rejected') {
            if (existing.rejectedSet === '1') {
                isSet2Required = false;
            } else if (existing.rejectedSet === '2') {
                isSet1Required = false;
            }
        }

        if (!sessionId || !subjectId || !yearAndDiv) {
            return NextResponse.json(
                { error: 'sessionId, subjectId, and yearAndDiv are required' },
                { status: 400 }
            );
        }
        if (isSet1Required && !set1File) {
            return NextResponse.json({ error: 'Set 1 file is required' }, { status: 400 });
        }
        if (isSet2Required && !set2File) {
            return NextResponse.json({ error: 'Set 2 file is required' }, { status: 400 });
        }

        // Validate files are PDFs if provided
        for (const file of [set1File, set2File]) {
            if (!file) continue;
            if (file.type !== 'application/pdf') {
                return NextResponse.json({ error: 'Only PDF files are allowed' }, { status: 400 });
            }
            if (file.size > 10 * 1024 * 1024) {
                return NextResponse.json({ error: 'Each file must be under 10MB' }, { status: 400 });
            }
        }

        // Verify session is active
        const paperSession = await PaperSubmissionSession.findById(sessionId);
        if (!paperSession || !paperSession.isActive) {
            return NextResponse.json({ error: 'Submission window is not active' }, { status: 400 });
        }

        // Get faculty's department via user schema
        const facultyUser = await User.findById(session.user.id);
        if (!facultyUser?.department) {
            return NextResponse.json(
                { error: 'Your teacher profile is not linked to a department. Contact the coordinator.' },
                { status: 400 }
            );
        }



        // Upload provided PDFs to Vercel Blob
        const timestamp = Date.now();
        const uploadPromises = [];
        let blob1Url = '', blob2Url = '';

        if (set1File) {
            uploadPromises.push(
                put(`papers/${sessionId}/${subjectId}/${session.user.id}/set1_${timestamp}.pdf`, set1File, { access: 'private' })
                    .then(b => blob1Url = b.url)
            );
        }
        if (set2File) {
            uploadPromises.push(
                put(`papers/${sessionId}/${subjectId}/${session.user.id}/set2_${timestamp}.pdf`, set2File, { access: 'private' })
                    .then(b => blob2Url = b.url)
            );
        }

        await Promise.all(uploadPromises);

        let submission;
        if (existing && existing.status === 'rejected') {
            // Update existing rejected submission with new sets
            if (set1File) {
                existing.set1BlobUrl = blob1Url;
                existing.set1Name = set1File.name;
            }
            if (set2File) {
                existing.set2BlobUrl = blob2Url;
                existing.set2Name = set2File.name;
            }
            existing.status = 'pending';
            existing.rejectionReason = undefined;
            existing.rejectedSet = undefined;
            existing.reviewedBy = undefined;
            existing.reviewedAt = undefined;
            submission = await existing.save();
        } else {
            submission = await PaperSubmission.create({
                session: sessionId,
                faculty: session.user.id,
                subject: subjectId,
                department: facultyUser.department,
                yearAndDiv,
                set1BlobUrl: blob1Url,
                set2BlobUrl: blob2Url,
                set1Name: set1File!.name,
                set2Name: set2File!.name,
                status: 'pending',
            });
        }

        // Notify HODs of this department
        const hodUsers = await User.find({
            role: 'hod',
            department: facultyUser.department,
        });

        if (hodUsers.length > 0) {
            await Notification.insertMany(
                hodUsers.map((hod) => ({
                    user: hod._id,
                    type: 'new_submission',
                    title: 'New Paper Submission',
                    message: `${facultyUser?.name || 'A faculty member'} submitted papers for ${paperSession.title}. Please review.`,
                    relatedSubmission: submission._id,
                }))
            );
        }

        return NextResponse.json({ message: 'Papers submitted successfully', submission }, { status: 201 });
    } catch (error: any) {
        console.error(error);
        if (error.code === 11000) {
            return NextResponse.json(
                { error: 'A submission for this subject in this session already exists. Try resubmitting or modifying the original.' },
                { status: 409 }
            );
        }
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
