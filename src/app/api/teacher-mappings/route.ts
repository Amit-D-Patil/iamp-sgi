import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import TeacherMapping from '@/models/TeacherMapping';
import Teacher from '@/models/Teacher';
import Subject from '@/models/Subject';
import Class from '@/models/Class';
import User from '@/models/User';
import { auth } from '@/lib/auth';

// Ensure models are registered
Teacher;
Subject;
Class;

// Get mappings for a specific teacher or all
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        const user = await User.findById(session.user.id);
        if (!user?.department) {
            return NextResponse.json({ error: 'No department assigned' }, { status: 400 });
        }

        const { searchParams } = new URL(request.url);
        const teacherId = searchParams.get('teacher');

        const query: Record<string, unknown> = { department: user.department };
        if (teacherId) {
            query.teacher = teacherId;
        }

        const mappings = await TeacherMapping.find(query)
            .populate('teacher', 'name shortName')
            .populate('subject', 'name code')
            .populate('class', 'displayName year division')
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
        if (!session || session.user.role !== 'iamp_coordinator') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        await connectDB();

        const user = await User.findById(session.user.id);
        if (!user?.department) {
            return NextResponse.json({ error: 'No department assigned' }, { status: 400 });
        }

        const body = await request.json();
        const { teacher, subject, classId, teachingType } = body;

        if (!teacher || !subject || !classId || !teachingType) {
            return NextResponse.json(
                { error: 'Teacher, subject, class, and teaching type are required' },
                { status: 400 }
            );
        }

        // Check if mapping already exists
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

        const mapping = await TeacherMapping.create({
            teacher,
            subject,
            class: classId,
            department: user.department,
            teachingType,
            createdBy: session.user.id,
        });

        await mapping.populate('teacher', 'name shortName');
        await mapping.populate('subject', 'name code');
        await mapping.populate('class', 'displayName year division');

        return NextResponse.json({ mapping }, { status: 201 });
    } catch (error) {
        console.error('Error creating mapping:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
