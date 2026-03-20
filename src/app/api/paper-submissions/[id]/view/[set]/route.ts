import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { auth } from '@/lib/auth';
import PaperSubmission from '@/models/PaperSubmission';
import User from '@/models/User';

type Params = { params: Promise<{ id: string; set: string }> };

/**
 * Secure PDF streaming endpoint.
 * Checks authentication + authorization before streaming the PDF from Vercel Blob.
 * Raw blob URLs are NEVER sent to the client — only this route fetches them server-side.
 */
export async function GET(request: NextRequest, { params }: Params) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();
        const { id, set } = await params;

        if (!['1', '2'].includes(set)) {
            return NextResponse.json({ error: 'Invalid set number' }, { status: 400 });
        }

        const submission = await PaperSubmission.findById(id);
        if (!submission) {
            return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
        }

        const role = session.user.role as string;

        // Access control
        if (role === 'faculty') {
            // Only the submitting faculty can view their own papers
            if (submission.faculty.toString() !== session.user.id) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
        } else if (role === 'hod') {
            // HOD can only view their department's submissions
            const hodUser = await User.findById(session.user.id);
            if (submission.department.toString() !== hodUser?.department?.toString()) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
        } else if (role !== 'super_admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const blobUrl = set === '1' ? submission.set1BlobUrl : submission.set2BlobUrl;
        const fileName = set === '1' ? submission.set1Name : submission.set2Name;

        // Fetch from Vercel Blob server-side and stream to client
        // A private blob requires the BLOB_READ_WRITE_TOKEN in the Authorization header
        const blobResponse = await fetch(blobUrl, {
            headers: {
                Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`,
            },
        });
        if (!blobResponse.ok) {
            console.error('Failed to fetch PDF from Vercel Blob:', await blobResponse.text());
            return NextResponse.json({ error: 'Failed to retrieve file from storage' }, { status: 502 });
        }

        const contentType = blobResponse.headers.get('content-type') || 'application/pdf';
        const headers: Record<string, string> = {
            'Content-Type': contentType,
            'Content-Disposition': `inline; filename="${fileName}"`,
            'Cache-Control': 'no-store, no-cache',
        };

        const contentLength = blobResponse.headers.get('content-length');
        if (contentLength) headers['Content-Length'] = contentLength;

        return new NextResponse(blobResponse.body, { headers });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
