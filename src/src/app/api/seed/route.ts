import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import Department from '@/models/Department';

// Seed API to create initial data
export async function POST() {
    try {
        await connectDB();

        // Check if Super Admin already exists
        const existingAdmin = await User.findOne({ role: 'super_admin' });

        if (existingAdmin) {
            return NextResponse.json(
                { message: 'Database already seeded', phone: existingAdmin.phone },
                { status: 200 }
            );
        }

        // Create a sample department first
        const department = await Department.create({
            name: 'Computer Science & Engineering',
            shortName: 'CSE',
            isActive: true,
        });

        // Create default Super Admin
        const superAdmin = await User.create({
            phone: '9999999999',
            password: '192.168',
            name: 'Super Admin',
            role: 'super_admin',
        });

        // Create a sample IAMP Coordinator
        const iampCoordinator = await User.create({
            phone: '8888888888',
            password: 'coordinator123',
            name: 'IAMP Coordinator',
            role: 'iamp_coordinator',
            department: department._id,
        });

        // Create a sample Feedback Coordinator
        const feedbackCoordinator = await User.create({
            phone: '7777777777',
            password: 'feedback123',
            name: 'Feedback Coordinator',
            role: 'feedback_coordinator',
            department: department._id,
        });

        // Create a sample HOD
        const hod = await User.create({
            phone: '6666666666',
            password: 'hod123',
            name: 'HOD CSE',
            role: 'hod',
            department: department._id,
        });

        // Create a sample Principal
        const principal = await User.create({
            phone: '5555555555',
            password: 'principal123',
            name: 'Principal',
            role: 'principal',
        });

        return NextResponse.json(
            {
                message: 'Database seeded successfully',
                users: [
                    { role: 'super_admin', phone: superAdmin.phone, password: 'admin123' },
                    { role: 'iamp_coordinator', phone: iampCoordinator.phone, password: 'coordinator123' },
                    { role: 'feedback_coordinator', phone: feedbackCoordinator.phone, password: 'feedback123' },
                    { role: 'hod', phone: hod.phone, password: 'hod123' },
                    { role: 'principal', phone: principal.phone, password: 'principal123' },
                ],
                department: { name: department.name, shortName: department.shortName },
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
