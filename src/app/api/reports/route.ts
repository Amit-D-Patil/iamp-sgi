import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Supervision from '@/models/Supervision';
import TeacherMapping from '@/models/TeacherMapping';
import Teacher from '@/models/Teacher';
import Subject from '@/models/Subject';
import IAMPPoint from '@/models/IAMPPoint';
import Department, { IDepartment } from '@/models/Department';
import Semester, { ISemester } from '@/models/Semester';
import User from '@/models/User';
import { auth } from '@/lib/auth';

// Ensure models are registered
Teacher;
Subject;

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        const { searchParams } = new URL(request.url);
        const departmentId = searchParams.get('department');
        const semesterId = searchParams.get('semester');

        // Get user info
        const user = await User.findById(session.user.id);
        const role = session.user.role;

        // Determine which department(s) to show based on role
        let departmentFilter: string | undefined;
        let canSelectDepartment = false;

        if (role === 'super_admin' || role === 'principal') {
            canSelectDepartment = true;
            departmentFilter = departmentId || undefined;
        } else if (role === 'hod' || role === 'iamp_coordinator') {
            if (!user?.department) {
                return NextResponse.json({ error: 'No department assigned' }, { status: 400 });
            }
            departmentFilter = user.department.toString();
        } else {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Get departments for filter dropdown
        let departments: IDepartment[] = [];
        if (canSelectDepartment) {
            departments = await Department.find({ isActive: true }).sort({ name: 1 });
        }

        // Get semesters for filter dropdown
        const semesters: ISemester[] = await Semester.find({ isActive: true }).sort({ startDate: -1 });

        // If no department or semester selected, return filter options
        if (canSelectDepartment && !departmentFilter) {
            return NextResponse.json({ departments, semesters, report: null }, { status: 200 });
        }
        if (!semesterId) {
            return NextResponse.json({ departments, semesters, report: null }, { status: 200 });
        }

        // Get department and semester info
        const department = await Department.findById(departmentFilter);
        if (!department) {
            return NextResponse.json({ error: 'Department not found' }, { status: 404 });
        }

        const semester = await Semester.findById(semesterId);
        if (!semester) {
            return NextResponse.json({ error: 'Semester not found' }, { status: 404 });
        }

        // Get all active IAMP points
        const iampPoints = await IAMPPoint.find({ isActive: true }).sort({ name: 1 });

        // Get all teacher mappings for this department
        const teacherMappings = await TeacherMapping.find({
            department: departmentFilter,
            isActive: true,
        })
            .populate('teacher', 'name shortName')
            .populate('subject', 'name code')
            .populate('class', 'displayName');

        // Get supervisions for this semester
        const supervisions = await Supervision.find({
            department: departmentFilter,
            semester: semesterId,
        });

        // Group mappings by teacher-subject-class (ignore type)
        const columnMap = new Map<string, {
            key: string;
            teacherId: string;
            teacherName: string;
            teacherShortName: string;
            subjectId: string;
            subjectName: string;
            subjectCode?: string;
            classId: string;
            className?: string;
        }>();

        teacherMappings.forEach((mapping) => {
            const teacher = mapping.teacher as unknown as { _id: { toString(): string }; name: string; shortName: string };
            const subject = mapping.subject as unknown as { _id: { toString(): string }; name: string; code?: string };
            const classInfo = mapping.class as unknown as { _id: { toString(): string }; displayName: string };

            const key = `${teacher._id.toString()}-${subject._id.toString()}-${classInfo?._id?.toString() || ''}`;

            if (!columnMap.has(key)) {
                columnMap.set(key, {
                    key,
                    teacherId: teacher._id.toString(),
                    teacherName: teacher.name,
                    teacherShortName: teacher.shortName,
                    subjectId: subject._id.toString(),
                    subjectName: subject.name,
                    subjectCode: subject.code,
                    classId: classInfo?._id?.toString() || '',
                    className: classInfo?.displayName,
                });
            }
        });

        const columns = Array.from(columnMap.values());

        // Build supervision lookup map
        const supervisionMap = new Map<string, string>();
        supervisions.forEach((sup) => {
            const key = `${sup.teacher.toString()}-${sup.subject.toString()}-${sup.class?.toString() || ''}-${sup.iampPoint.toString()}`;
            supervisionMap.set(key, sup.status);
        });

        // Build rows (each IAMP point is a row)
        const rows = iampPoints.map((point, index) => {
            const values: Record<string, string> = {};

            columns.forEach((col) => {
                const supervisionKey = `${col.teacherId}-${col.subjectId}-${col.classId}-${point._id.toString()}`;
                values[col.key] = supervisionMap.get(supervisionKey) || '';
            });

            return {
                srNo: index + 1,
                pointId: point._id.toString(),
                pointName: point.name,
                values,
            };
        });

        // Build supervisor info for each column
        const supervisorMap = new Map<string, Set<string>>();
        for (const sup of supervisions) {
            const colKey = `${sup.teacher.toString()}-${sup.subject.toString()}-${sup.class?.toString() || ''}`;
            if (!supervisorMap.has(colKey)) {
                supervisorMap.set(colKey, new Set());
            }
            if (sup.markedBy) {
                supervisorMap.get(colKey)!.add(sup.markedBy.toString());
            }
        }

        // Get supervisor names
        const allSupervisorIds = new Set<string>();
        supervisorMap.forEach((ids) => ids.forEach((id) => allSupervisorIds.add(id)));
        const supervisorUsers = await User.find({ _id: { $in: Array.from(allSupervisorIds) } }).select('name');
        const supervisorNameMap = new Map<string, string>();
        supervisorUsers.forEach((u) => {
            supervisorNameMap.set(u._id.toString(), u.name);
        });

        // Build supervisedBy for each column
        const supervisedBy: Record<string, string> = {};
        columns.forEach((col) => {
            const supervisorIds = supervisorMap.get(col.key);
            if (supervisorIds && supervisorIds.size > 0) {
                const names = Array.from(supervisorIds).map((id) => supervisorNameMap.get(id) || '').filter(Boolean);
                supervisedBy[col.key] = names.join(', ');
            } else {
                supervisedBy[col.key] = '';
            }
        });

        // Get coordinator for this department
        const coordinator = await User.findOne({
            department: departmentFilter,
            role: 'iamp_coordinator',
        });

        return NextResponse.json(
            {
                departments,
                semesters,
                report: {
                    department: {
                        id: department._id,
                        name: department.name,
                        shortName: department.shortName,
                    },
                    semester: {
                        id: semester._id,
                        name: semester.name,
                        academicYear: semester.academicYear,
                        type: semester.type,
                    },
                    coordinator: coordinator ? { name: coordinator.name } : null,
                    columns,
                    rows,
                    supervisedBy,
                },
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('Error generating report:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
