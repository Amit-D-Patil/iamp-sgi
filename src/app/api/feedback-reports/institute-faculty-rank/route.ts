import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import FeedbackResponse from '@/models/FeedbackResponse';
import FeedbackSession from '@/models/FeedbackSession';
import Question from '@/models/Question';
import Teacher from '@/models/Teacher';
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
        
        let teacherFilter: Record<string, any> = { isActive: true };
        if (session.user.role === 'hod' && user?.department) {
            teacherFilter.department = user.department;
        }

        const teachers = await Teacher.find(teacherFilter).select('name shortName');
        const questions = await Question.find({ isActive: true, type: 'abcd_grade' }).select('_id');
        const qIds = questions.map(q => q._id.toString());

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

        const facultyStats = [];

        for (const t of teachers) {
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

        // Sort DESC by average globally!
        facultyStats.sort((a, b) => b.average - a.average);

        // Assign ranks and format exactly like PHP: 'R1 | 9.8'
        const rankedFaculties = facultyStats.map((fs, idx) => ({
            ...fs,
            rank: idx + 1,
            displayName: fs.teacherShortName, // Google Charts format had name on Y-Axis
            annotation: `R${idx + 1} | ${fs.average.toFixed(2)}` // Used as Label in Recharts
        }));

        return NextResponse.json({
            faculties: rankedFaculties
        }, { status: 200 });

    } catch (error) {
        console.error('Institute Faculty Rank Report API Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
