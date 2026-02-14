import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import TeacherMapping from '@/models/TeacherMapping';
import Teacher from '@/models/Teacher';
import Subject from '@/models/Subject';
import Class from '@/models/Class';
import Batch from '@/models/Batch';
import User from '@/models/User';
import { auth } from '@/lib/auth';

// Ensure models are registered
Teacher;
Subject;
Class;
Batch;

// Get mappings for a specific teacher or all
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        const { searchParams } = new URL(request.url);
        const teacherId = searchParams.get('teacher');
        const departmentParam = searchParams.get('department');
        const allDepartments = searchParams.get('allDepartments') === 'true';

        const query: Record<string, unknown> = {};

        // If specific department requested, use it
        if (departmentParam) {
            query.department = departmentParam;
        } else if (!allDepartments) {
            // If not requesting all departments and no specific department, use user's department
            const user = await User.findById(session.user.id);
            if (!user?.department) {
                return NextResponse.json({ error: 'No department assigned' }, { status: 400 });
            }
            query.department = user.department;
        }
        // If allDepartments=true, no department filter is applied

        if (teacherId) {
            query.teacher = teacherId;
        }

        const mappings = await TeacherMapping.find(query)
            .populate('teacher', 'name shortName')
            .populate('subject', 'name code')
            .populate('class', 'displayName year division')
            .populate('batches', 'name')
            .sort({ createdAt: -1 });

        return NextResponse.json({ mappings }, { status: 200 });
    } catch (error) {
        console.error('Error fetching mappings:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// Create a new mapping
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session || !['iamp_coordinator', 'feedback_coordinator'].includes(session.user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        await connectDB();

        const user = await User.findById(session.user.id);
        if (!user?.department) {
            return NextResponse.json({ error: 'No department assigned' }, { status: 400 });
        }

        const body = await request.json();
        const { teacher, subject, classId, teachingType, batches } = body;

        if (!teacher || !subject || !classId || !teachingType) {
            return NextResponse.json(
                { error: 'Teacher, subject, class, and teaching type are required' },
                { status: 400 }
            );
        }

        // Check if mapping already exists for this teacher
        const existing = await TeacherMapping.findOne({
            teacher,
            subject,
            class: classId,
            teachingType,
        });

        if (existing) {
            return NextResponse.json(
                { error: 'This mapping already exists' },
                { status: 400 }
            );
        }

        // Create mapping with optional batches (for practical)
        const mappingData: Record<string, unknown> = {
            teacher,
            subject,
            class: classId,
            department: user.department,
            teachingType,
            createdBy: session.user.id,
        };

        // Only add batches for practical type
        if (teachingType === 'practical' && batches && Array.isArray(batches)) {
            mappingData.batches = batches;
        }

        const mapping = await TeacherMapping.create(mappingData);

        await mapping.populate('teacher', 'name shortName');
        await mapping.populate('subject', 'name code');
        await mapping.populate('class', 'displayName year division');
        await mapping.populate('batches', 'name');

        return NextResponse.json({ mapping }, { status: 201 });
    } catch (error) {
        console.error('Error creating mapping:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
