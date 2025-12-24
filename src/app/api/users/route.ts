import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import { auth } from '@/lib/auth';

// Create a new user (Super Admin only)
export async function POST(request: NextRequest) {
    try {
        const session = await auth();

        if (!session || session.user.role !== 'super_admin') {
            return NextResponse.json(
                { error: 'Unauthorized. Only Super Admins can create users.' },
                { status: 403 }
            );
        }

        await connectDB();

        const body = await request.json();
        const { phone, password, name, role, department } = body;

        if (!phone || !password || !name) {
            return NextResponse.json(
                { error: 'Phone, password, and name are required' },
                { status: 400 }
            );
        }

        // Check if user already exists
        const existingUser = await User.findOne({ phone });
        if (existingUser) {
            return NextResponse.json(
                { error: 'User with this phone number already exists' },
                { status: 409 }
            );
        }

        const user = await User.create({
            phone,
            password,
            name,
            role: role || 'iamp_coordinator',
            department: department || undefined,
        });

        await user.populate('department', 'name');

        return NextResponse.json(
            {
                message: 'User created successfully',
                user: {
                    id: user._id,
                    phone: user.phone,
                    name: user.name,
                    role: user.role,
                    department: user.department,
                    isActive: user.isActive,
                },
            },
            { status: 201 }
        );
    } catch (error) {
        console.error('Error creating user:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// Get all users (Super Admin only)
export async function GET() {
    try {
        const session = await auth();

        if (!session || session.user.role !== 'super_admin') {
            return NextResponse.json(
                { error: 'Unauthorized. Only Super Admins can view users.' },
                { status: 403 }
            );
        }

        await connectDB();

        const users = await User.find({}, '-password')
            .populate('department', 'name')
            .sort({ createdAt: -1 });

        return NextResponse.json({ users }, { status: 200 });
    } catch (error) {
        console.error('Error fetching users:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
