import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Supervision from '@/models/Supervision';
import Semester from '@/models/Semester';
import Class from '@/models/Class';
import User from '@/models/User';
import IAMPPoint from '@/models/IAMPPoint';
import { auth } from '@/lib/auth';

// Ensure models are registered
Semester;
Class;
IAMPPoint;

// Get supervisions
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        const { searchParams } = new URL(request.url);
        const teacherId = searchParams.get('teacher');
        const subjectId = searchParams.get('subject');
        const classId = searchParams.get('class');
        const semesterId = searchParams.get('semester');
        const departmentId = searchParams.get('department'); // Accept department from query

        const query: Record<string, unknown> = {};

        // Use provided department or require it if not provided
        if (departmentId) {
            query.department = departmentId;
        }

        if (teacherId) query.teacher = teacherId;
        if (subjectId) query.subject = subjectId;
        if (classId) query.class = classId;
        if (semesterId) query.semester = semesterId;

        const supervisions = await Supervision.find(query)
            .populate('teacher', 'name')
            .populate('subject', 'name code')
            .populate('class', 'displayName')
            .populate('iampPoint', 'name')
            .populate('semester', 'name')
            .sort({ createdAt: -1 });

        return NextResponse.json({ supervisions }, { status: 200 });
    } catch (error) {
        console.error('Error fetching supervisions:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// Create or update supervision
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session || session.user.role !== 'iamp_coordinator') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        await connectDB();

        const body = await request.json();
        const { teacher, subject, classId, iampPoint, status, remarks, semester, department } = body;

        if (!teacher || !subject || !classId || !iampPoint || !status || !semester || !department) {
            return NextResponse.json(
                { error: 'Teacher, subject, class, IAMP point, semester, department, and status are required' },
                { status: 400 }
            );
        }

        // Check if supervision already exists for this combination
        const existingSupervision = await Supervision.findOne({
            teacher,
            subject,
            class: classId,
            iampPoint,
            semester,
        });

        let supervision;
        if (existingSupervision) {
            // Update existing
            supervision = await Supervision.findByIdAndUpdate(
                existingSupervision._id,
                { status, remarks, markedBy: session.user.id },
                { new: true }
            );
        } else {
            // Create new
            supervision = await Supervision.create({
                teacher,
                subject,
                class: classId,
                iampPoint,
                department, // Use department from request
                semester,
                markedBy: session.user.id,
                status,
                remarks,
            });
        }

        await supervision?.populate('teacher', 'name');
        await supervision?.populate('subject', 'name code');
        await supervision?.populate('class', 'displayName');
        await supervision?.populate('iampPoint', 'name');
        await supervision?.populate('semester', 'name');

        return NextResponse.json({ supervision }, { status: 201 });
    } catch (error) {
        console.error('Error creating supervision:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
