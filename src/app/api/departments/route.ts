import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Department from '@/models/Department';
import { auth } from '@/lib/auth';

// Get all departments
export async function GET() {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();
        const departments = await Department.find({}).sort({ createdAt: -1 });

        return NextResponse.json({ departments }, { status: 200 });
    } catch (error) {
        console.error('Error fetching departments:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// Create a new department
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session || session.user.role !== 'super_admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        await connectDB();
        const body = await request.json();
        const { name, shortName } = body;

        if (!name || !shortName) {
            return NextResponse.json({ error: 'Name and short name are required' }, { status: 400 });
        }

        const existingDepartment = await Department.findOne({ name });
        if (existingDepartment) {
            return NextResponse.json({ error: 'Department already exists' }, { status: 409 });
        }

        const department = await Department.create({ name, shortName });

        return NextResponse.json({ department }, { status: 201 });
    } catch (error) {
        console.error('Error creating department:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
