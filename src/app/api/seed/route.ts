import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';

// Seed API to create initial Super Admin
export async function POST() {
    try {
        await connectDB();

        // Check if Super Admin already exists
        const existingAdmin = await User.findOne({ role: 'super_admin' });

        if (existingAdmin) {
            return NextResponse.json(
                { message: 'Super Admin already exists', phone: existingAdmin.phone },
                { status: 200 }
            );
        }

        // Create default Super Admin
        const superAdmin = await User.create({
            phone: '9999999999',
            password: 'admin123',
            name: 'Super Admin',
            role: 'super_admin',
        });

        // Create a sample IAMP Coordinator
        await User.create({
            phone: '8888888888',
            password: 'coordinator123',
            name: 'Sample Coordinator',
            role: 'iamp_coordinator',
        });

        return NextResponse.json(
            {
                message: 'Initial users created successfully',
                superAdmin: {
                    phone: superAdmin.phone,
                    name: superAdmin.name,
                    defaultPassword: 'admin123',
                },
                note: 'Please change the default passwords after first login!',
            },
            { status: 201 }
        );
    } catch (error) {
        console.error('Error seeding database:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
