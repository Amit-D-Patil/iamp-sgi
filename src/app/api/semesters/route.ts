import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Semester from '@/models/Semester';
import { auth } from '@/lib/auth';

// Get all semesters
export async function GET() {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        const semesters = await Semester.find()
            .sort({ startDate: -1 });

        return NextResponse.json({ semesters }, { status: 200 });
    } catch (error) {
        console.error('Error fetching semesters:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// Create a new semester (super admin only)
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session || session.user.role !== 'super_admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        await connectDB();

        const body = await request.json();
        const { academicYear, type, startDate, endDate } = body;

        if (!academicYear || !type || !startDate || !endDate) {
            return NextResponse.json(
                { error: 'Academic year, type, start date, and end date are required' },
                { status: 400 }
            );
        }

        // Generate display name
        const name = `${academicYear} (${type === 'odd' ? 'Odd Sem' : 'Even Sem'})`;

        // Check for duplicate
        const existing = await Semester.findOne({ academicYear, type });
        if (existing) {
            return NextResponse.json(
                { error: 'Semester already exists' },
                { status: 400 }
            );
        }

        const semester = await Semester.create({
            name,
            academicYear,
            type,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            createdBy: session.user.id,
        });

        return NextResponse.json({ semester }, { status: 201 });
    } catch (error) {
        console.error('Error creating semester:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
