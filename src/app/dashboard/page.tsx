import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import Department from '@/models/Department';
import Subject from '@/models/Subject';
import Teacher from '@/models/Teacher';
import Supervision from '@/models/Supervision';
import IAMPPoint from '@/models/IAMPPoint';

// Ensure models are registered
Department;
Subject;
Teacher;
Supervision;
IAMPPoint;

const roleLabels: Record<string, string> = {
    super_admin: 'Super Admin',
    iamp_coordinator: 'IAMP Coordinator',
    feedback_coordinator: 'Feedback Coordinator',
    principal: 'Principal',
    hod: 'Head of Department',
};

export default async function DashboardPage() {
    const session = await auth();

    if (!session) {
        redirect('/login');
    }

    await connectDB();

    const role = session.user.role;

    // Super Admin Dashboard
    if (role === 'super_admin') {
        const [userCount, departmentCount, iampPointCount] = await Promise.all([
            User.countDocuments({ role: { $ne: 'super_admin' } }),
            Department.countDocuments(),
            IAMPPoint.countDocuments(),
        ]);

        return (
            <div>
                <div className="mb-6">
                    <h1 className="text-2xl font-bold">Welcome, {session.user.name}</h1>
                    <Badge variant="destructive">{roleLabels[role]}</Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Total Users
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold">{userCount}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Departments
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold">{departmentCount}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                IAMP Points
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold">{iampPointCount}</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    // Principal Dashboard
    if (role === 'principal') {
        const departmentCount = await Department.countDocuments({ isActive: true });

        return (
            <div>
                <div className="mb-6">
                    <h1 className="text-2xl font-bold">Welcome, {session.user.name}</h1>
                    <Badge variant="secondary">{roleLabels[role]}</Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Total Departments
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold">{departmentCount}</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    // HOD and Coordinator Dashboard (needs department)
    const user = await User.findById(session.user.id).populate('department', 'name shortName');

    if (!user?.department) {
        return (
            <div>
                <div className="mb-6">
                    <h1 className="text-2xl font-bold">Welcome, {session.user.name}</h1>
                    <Badge variant={role === 'hod' ? 'outline' : 'default'}>{roleLabels[role]}</Badge>
                </div>
                <Card>
                    <CardContent className="py-8">
                        <p className="text-center text-muted-foreground">
                            No department assigned. Please contact the admin.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const dept = user.department as unknown as { _id: string; name: string; shortName: string };

    // HOD Dashboard
    if (role === 'hod') {
        return (
            <div>
                <div className="mb-6">
                    <h1 className="text-2xl font-bold">Welcome, {session.user.name}</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline">{roleLabels[role]}</Badge>
                        <span className="text-muted-foreground">
                            {dept.name} ({dept.shortName})
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Department
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xl font-bold">{dept.name}</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    // Feedback Coordinator Dashboard
    if (role === 'feedback_coordinator') {
        const [subjectCount, teacherCount] = await Promise.all([
            Subject.countDocuments({ department: dept._id }),
            Teacher.countDocuments({ department: dept._id }),
        ]);

        return (
            <div>
                <div className="mb-6">
                    <h1 className="text-2xl font-bold">Welcome, {session.user.name}</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <Badge>{roleLabels[role]}</Badge>
                        <span className="text-muted-foreground">
                            {dept.name} ({dept.shortName})
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Subjects
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold">{subjectCount}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Teachers
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold">{teacherCount}</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    // Coordinator Dashboard
    const [subjectCount, teacherCount, todaySupervisions] = await Promise.all([
        Subject.countDocuments({ department: dept._id }),
        Teacher.countDocuments({ department: dept._id }),
        Supervision.countDocuments({
            department: dept._id,
            date: {
                $gte: new Date(new Date().setHours(0, 0, 0, 0)),
                $lte: new Date(new Date().setHours(23, 59, 59, 999)),
            },
        }),
    ]);

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-bold">Welcome, {session.user.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                    <Badge>{roleLabels[role]}</Badge>
                    <span className="text-muted-foreground">
                        {dept.name} ({dept.shortName})
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Subjects
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">{subjectCount}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Teachers
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">{teacherCount}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Today&apos;s Supervisions
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">{todaySupervisions}</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
