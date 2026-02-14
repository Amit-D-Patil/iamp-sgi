import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import IAMPPoint from '@/models/IAMPPoint';
import { auth } from '@/lib/auth';

// Update an IAMP point
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

        const point = await IAMPPoint.findByIdAndUpdate(id, body, { new: true });

        if (!point) {
            return NextResponse.json({ error: 'IAMP Point not found' }, { status: 404 });
        }

        return NextResponse.json({ point }, { status: 200 });
    } catch (error) {
        console.error('Error updating IAMP point:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// Delete an IAMP point
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

        const point = await IAMPPoint.findByIdAndDelete(id);

        if (!point) {
            return NextResponse.json({ error: 'IAMP Point not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'IAMP Point deleted' }, { status: 200 });
    } catch (error) {
        console.error('Error deleting IAMP point:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
