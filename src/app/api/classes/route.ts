import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Class from '@/models/Class';
import Department from '@/models/Department';
import User from '@/models/User';
import { auth } from '@/lib/auth';

// Ensure Department model is registered
Department;

// Get classes for coordinator's department
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

        const classes = await Class.find({ department: user.department })
            .populate('department', 'name shortName')
            .sort({ year: 1, division: 1 });

        return NextResponse.json({ classes }, { status: 200 });
    } catch (error) {
        console.error('Error fetching classes:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// Create a new class (auto-linked to coordinator's department)
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
        const { year, division } = body;

        if (!year) {
            return NextResponse.json({ error: 'Year is required' }, { status: 400 });
        }

        // Check if class already exists
        const existingClass = await Class.findOne({
            year,
            division: division || null,
            department: user.department,
        });

        if (existingClass) {
            return NextResponse.json(
                { error: 'Class already exists for this department' },
                { status: 400 }
            );
        }

        // Generate displayName
        const displayName = division ? `${year}-${division}` : year;
        const name = displayName;

        const newClass = await Class.create({
            name,
            year,
            division: division || undefined,
            displayName,
            department: user.department,
            createdBy: session.user.id,
        });

        await newClass.populate('department', 'name shortName');

        return NextResponse.json({ class: newClass }, { status: 201 });
    } catch (error) {
        console.error('Error creating class:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
