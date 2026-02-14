import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Teacher from '@/models/Teacher';
import Department from '@/models/Department';
import User from '@/models/User';
import { auth } from '@/lib/auth';

// Ensure models are registered
Department;

// Get teachers for coordinator's department (or all/filtered for super_admin/principal)
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        // Get department query param
        const { searchParams } = new URL(request.url);
        const departmentParam = searchParams.get('department');

        // Get user's department
        const user = await User.findById(session.user.id);

        // Super admin and principal can see all teachers or filter by department
        let teachers;
        if (session.user.role === 'super_admin' || session.user.role === 'principal') {
            if (departmentParam) {
                // Filter by specific department
                teachers = await Teacher.find({ department: departmentParam })
                    .populate('department', 'name shortName')
                    .sort({ createdAt: -1 });
            } else {
                // Return all teachers
                teachers = await Teacher.find()
                    .populate('department', 'name shortName')
                    .sort({ createdAt: -1 });
            }
        } else {
            if (!user?.department) {
                return NextResponse.json({ error: 'No department assigned' }, { status: 400 });
            }
            teachers = await Teacher.find({ department: user.department })
                .populate('department', 'name shortName')
                .sort({ createdAt: -1 });
        }

        return NextResponse.json({ teachers }, { status: 200 });
    } catch (error) {
        console.error('Error fetching teachers:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// Create a new teacher
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session || !['iamp_coordinator', 'feedback_coordinator'].includes(session.user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        await connectDB();

        // Get user's department
        const user = await User.findById(session.user.id);
        if (!user?.department) {
            return NextResponse.json({ error: 'No department assigned' }, { status: 400 });
        }

        const body = await request.json();
        const { name, shortName, phone, email } = body;

        if (!name) {
            return NextResponse.json({ error: 'Teacher name is required' }, { status: 400 });
        }

        const teacher = await Teacher.create({
            name,
            shortName,
            phone,
            email,
            department: user.department,
            createdBy: session.user.id,
        });

        await teacher.populate('department', 'name shortName');

        return NextResponse.json({ teacher }, { status: 201 });
    } catch (error) {
        console.error('Error creating teacher:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
