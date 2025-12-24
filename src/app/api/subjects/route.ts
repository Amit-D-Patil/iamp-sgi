import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Subject from '@/models/Subject';
import Department from '@/models/Department';
import User from '@/models/User';
import { auth } from '@/lib/auth';

// Ensure Department model is registered
Department;

// Get subjects for coordinator's department
export async function GET() {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        // Get user's department
        const user = await User.findById(session.user.id);
        if (!user?.department) {
            return NextResponse.json({ error: 'No department assigned' }, { status: 400 });
        }

        const subjects = await Subject.find({ department: user.department })
            .populate('department', 'name shortName')
            .sort({ createdAt: -1 });

        return NextResponse.json({ subjects }, { status: 200 });
    } catch (error) {
        console.error('Error fetching subjects:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// Create a new subject (auto-linked to coordinator's department)
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session || session.user.role !== 'iamp_coordinator') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        await connectDB();

        // Get user's department
        const user = await User.findById(session.user.id);
        if (!user?.department) {
            return NextResponse.json({ error: 'No department assigned' }, { status: 400 });
        }

        const body = await request.json();
        const { name, code, types } = body;

        if (!name) {
            return NextResponse.json({ error: 'Subject name is required' }, { status: 400 });
        }

        const subject = await Subject.create({
            name,
            code,
            types: types || {
                hasTheory: true,
                hasPractical: false,
                practicalType: { saPr: { enabled: false }, faPr: false },
                hasSLA: false,
            },
            department: user.department,
            createdBy: session.user.id,
        });

        await subject.populate('department', 'name shortName');

        return NextResponse.json({ subject }, { status: 201 });
    } catch (error) {
        console.error('Error creating subject:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
