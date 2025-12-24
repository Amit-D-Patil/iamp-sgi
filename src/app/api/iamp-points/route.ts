import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import IAMPPoint from '@/models/IAMPPoint';
import { auth } from '@/lib/auth';

// Get all IAMP points
export async function GET() {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();
        const points = await IAMPPoint.find({}).sort({ createdAt: -1 });

        return NextResponse.json({ points }, { status: 200 });
    } catch (error) {
        console.error('Error fetching IAMP points:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// Create a new IAMP point
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session || session.user.role !== 'super_admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        await connectDB();
        const body = await request.json();
        const { name, description, applicableTypes } = body;

        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        const existingPoint = await IAMPPoint.findOne({ name });
        if (existingPoint) {
            return NextResponse.json({ error: 'IAMP Point already exists' }, { status: 409 });
        }

        const point = await IAMPPoint.create({
            name,
            description,
            applicableTypes: applicableTypes || { theory: true, practical: true, sla: true },
        });

        return NextResponse.json({ point }, { status: 201 });
    } catch (error) {
        console.error('Error creating IAMP point:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
