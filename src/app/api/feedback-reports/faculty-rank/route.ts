import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import FeedbackResponse from '@/models/FeedbackResponse';
import FeedbackSession from '@/models/FeedbackSession';
import Question from '@/models/Question';
import Department from '@/models/Department';
import Teacher from '@/models/Teacher';
import TeacherMapping from '@/models/TeacherMapping';
import User from '@/models/User';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const allowedRoles = ['super_admin', 'feedback_coordinator', 'principal', 'hod'];
        if (!allowedRoles.includes(session.user.role as string)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        await connectDB();

        const user = await User.findById(session.user.id);
        
        let departmentFilter: Record<string, any> = { isActive: true };
        if (session.user.role === 'hod' && user?.department) {
            departmentFilter._id = user.department;
        }

        const departments = await Department.find(departmentFilter).sort({ shortName: 1 });
        const teachers = await Teacher.find({ isActive: true }).select('name shortName department');
        const questions = await Question.find({ isActive: true, type: 'abcd_grade' }).select('_id');
        const qIds = questions.map(q => q._id.toString());

        // Get all teacher mappings
        const mappings = await TeacherMapping.find({ teacher: { $in: teachers.map(t => t._id) } });

        // Build a lookup: Teacher ID -> Set of allowed FeedbackSession IDs
        // wait, we can just look up teacher points directly from FeedbackResponses
        // because responses strictly tie points to specific teacher IDs!
        // We only need valid sessions.
        const allSessions = await FeedbackSession.find({ isActive: false }).select('_id isActive');
        // Actually, we can fetch all sessions or just all responses directly
        const responses = await FeedbackResponse.find({});

        const teacherScores = new Map(); // teacherId -> { totalPoints: 0, count: 0 }

        for (const r of responses) {
            for (const qRes of r.responses) {
                if (qRes.question && qIds.includes(qRes.question.toString())) {
                    if (qRes.teacherResponses && Array.isArray(qRes.teacherResponses)) {
                        for (const tr of qRes.teacherResponses) {
                            if (tr.teacher && typeof tr.points === 'number') {
                                const tid = tr.teacher.toString();
                                if (!teacherScores.has(tid)) {
                                    teacherScores.set(tid, { totalPoints: 0, count: 0 });
                                }
                                const stats = teacherScores.get(tid);
                                stats.totalPoints += tr.points;
                                stats.count++;
                            }
                        }
                    }
                }
            }
        }

        // Now compile the report per department
        const reportData = [];

        for (const dept of departments) {
            const deptTeachers = teachers.filter(t => t.department?.toString() === dept._id.toString());
            const facultyStats = [];

            for (const t of deptTeachers) {
                const stats = teacherScores.get(t._id.toString());
                if (stats && stats.count > 0) {
                    const avg = stats.totalPoints / stats.count;
                    facultyStats.push({
                        teacherId: t._id.toString(),
                        teacherName: t.name,
                        teacherShortName: t.shortName || t.name,
                        average: Number(avg.toFixed(2))
                    });
                }
            }

            // Sort DESC by average
            facultyStats.sort((a, b) => b.average - a.average);

            // Assign ranks (prefix the name like "1) John Doe")
            const rankedFaculties = facultyStats.map((fs, idx) => ({
                ...fs,
                rank: idx + 1,
                displayName: `${idx + 1}) ${fs.teacherShortName}`
            }));

            if (rankedFaculties.length > 0) {
                reportData.push({
                    departmentId: dept._id.toString(),
                    departmentName: dept.name,
                    faculties: rankedFaculties
                });
            }
        }

        return NextResponse.json({
            departments: reportData
        }, { status: 200 });

    } catch (error) {
        console.error('Faculty Rank Report API Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
