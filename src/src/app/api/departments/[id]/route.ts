import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Department from '@/models/Department';
import { auth } from '@/lib/auth';

// Update a department
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session || session.user.role !== 'super_admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        await connectDB();
        const { id } = await params;
        const body = await request.json();

        const department = await Department.findByIdAndUpdate(id, body, { new: true });

        if (!department) {
            return NextResponse.json({ error: 'Department not found' }, { status: 404 });
        }

        return NextResponse.json({ department }, { status: 200 });
    } catch (error) {
        console.error('Error updating department:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// Delete a department
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session || session.user.role !== 'super_admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        await connectDB();
        const { id } = await params;

        const department = await Department.findByIdAndDelete(id);

        if (!department) {
            return NextResponse.json({ error: 'Department not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Department deleted' }, { status: 200 });
    } catch (error) {
        console.error('Error deleting department:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
