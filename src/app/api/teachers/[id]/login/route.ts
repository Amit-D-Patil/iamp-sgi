import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import Teacher from '@/models/Teacher';
import { auth } from '@/lib/auth';

type Params = { params: Promise<{ id: string }> };

// POST - Create a new faculty login for a teacher
export async function POST(request: NextRequest, { params }: Params) {
    try {
        const session = await auth();
        if (!session || session.user.role !== 'iamp_coordinator') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        await connectDB();
        const { id } = await params;
        const { password, phone } = await request.json();

        if (!password || !phone) {
            return NextResponse.json(
                { error: 'Phone number and password are required' },
                { status: 400 }
            );
        }

        if (password.length < 6) {
            return NextResponse.json(
                { error: 'Password must be at least 6 characters' },
                { status: 400 }
            );
        }

        // Find the teacher
        const teacher = await Teacher.findById(id);
        if (!teacher) {
            return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
        }

        // Check if a user already exists with this phone
        const existingUser = await User.findOne({ phone });
        if (existingUser) {
            return NextResponse.json(
                { error: 'A login with this phone number already exists' },
                { status: 409 }
            );
        }

        // Create the faculty user
        const user = await User.create({
            phone,
            password,
            name: teacher.name,
            role: 'faculty',
            department: teacher.department,
        });

        // Update the teacher's phone number to match the login phone
        teacher.phone = phone;
        await teacher.save();

        return NextResponse.json(
            {
                message: 'Faculty login created successfully',
                user: { id: user._id, phone: user.phone, name: user.name, role: user.role },
            },
            { status: 201 }
        );
    } catch (error) {
        console.error('Error creating faculty login:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PATCH - Reset password for an existing faculty login (matched by teacher's phone)
export async function PATCH(request: NextRequest, { params }: Params) {
    try {
        const session = await auth();
        if (!session || session.user.role !== 'iamp_coordinator') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        await connectDB();
        const { id } = await params;
        const { newPassword, phone } = await request.json();

        if (!newPassword) {
            return NextResponse.json({ error: 'New password is required' }, { status: 400 });
        }

        if (newPassword.length < 6) {
            return NextResponse.json(
                { error: 'Password must be at least 6 characters' },
                { status: 400 }
            );
        }

        // Find the teacher to get their name / verify existence
        const teacher = await Teacher.findById(id);
        if (!teacher) {
            return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
        }

        // Look up the user by phone
        const lookupPhone = phone || teacher.phone;
        if (!lookupPhone) {
            return NextResponse.json(
                { error: 'No phone number provided to locate the faculty login' },
                { status: 400 }
            );
        }

        const user = await User.findOne({ phone: lookupPhone, role: 'faculty' });
        if (!user) {
            return NextResponse.json(
                { error: 'No faculty login found for this phone number' },
                { status: 404 }
            );
        }

        // Update password — pre-save hook will hash it
        user.password = newPassword;
        await user.save();

        return NextResponse.json({ message: 'Password reset successfully' }, { status: 200 });
    } catch (error) {
        console.error('Error resetting faculty password:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// GET - Check if a faculty login exists for this teacher (by teacher phone)
export async function GET(request: NextRequest, { params }: Params) {
    try {
        const session = await auth();
        if (!session || session.user.role !== 'iamp_coordinator') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        await connectDB();
        const { id } = await params;

        const teacher = await Teacher.findById(id);
        if (!teacher) {
            return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
        }

        // We look up by the teacher's phone stored in teacher record
        if (!teacher.phone) {
            return NextResponse.json({ hasLogin: false, phone: null });
        }

        const user = await User.findOne({ phone: teacher.phone, role: 'faculty' }).select('-password');
        return NextResponse.json({
            hasLogin: !!user,
            phone: teacher.phone,
            user: user ? { id: user._id, phone: user.phone, name: user.name } : null,
        });
    } catch (error) {
        console.error('Error checking faculty login:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
