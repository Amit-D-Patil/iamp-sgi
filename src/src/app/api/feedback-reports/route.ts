import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import FeedbackResponse from '@/models/FeedbackResponse';
import FeedbackSession from '@/models/FeedbackSession';
import Teacher from '@/models/Teacher';
import Question from '@/models/Question';
import User from '@/models/User';
import Class from '@/models/Class';
import Subject from '@/models/Subject';
import TeacherMapping from '@/models/TeacherMapping';
import { auth } from '@/lib/auth';

// Ensure models are registered
Class;
Subject;
TeacherMapping;

// GET - Get feedback report per teacher
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Only allow feedback_coordinator and above
        const allowedRoles = ['super_admin', 'feedback_coordinator', 'principal', 'hod'];
        if (!allowedRoles.includes(session.user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        await connectDB();

        const user = await User.findById(session.user.id);

        // Get query params
        const { searchParams } = new URL(request.url);
        const teacherId = searchParams.get('teacher');
        const sessionId = searchParams.get('session');
        const departmentId = searchParams.get('department');

        // Get only abcd_grade questions (for headers)
        const questions = await Question.find({ isActive: true, type: 'abcd_grade' }).sort({ order: 1 });

        // Determine department filter
        let departmentFilter: string | undefined;
        if (session.user.role === 'super_admin' || session.user.role === 'principal') {
            // Super admin and principal can filter by department or see all
            departmentFilter = departmentId || undefined;
        } else if (user?.department) {
            // Other roles see only their department
            departmentFilter = user.department.toString();
        }

        // Get teachers (filter by department)
        const teacherQuery: { _id?: string; department?: string } = {};
        if (teacherId) {
            teacherQuery._id = teacherId;
        }
        if (departmentFilter) {
            teacherQuery.department = departmentFilter;
        }

        const teachers = await Teacher.find(teacherQuery).select('name shortName');

        // Get feedback sessions (filter by department)
        const sessionQuery: { _id?: string; department?: string } = {};
        if (sessionId) {
            sessionQuery._id = sessionId;
        }
        if (departmentFilter) {
            sessionQuery.department = departmentFilter;
        }

        const feedbackSessions = await FeedbackSession.find(sessionQuery)
            .populate('class', 'displayName');

        const sessionIds = feedbackSessions.map(s => s._id);

        // Get all feedback responses
        const feedbackResponses = await FeedbackResponse.find({
            feedbackSession: { $in: sessionIds },
        });

        // Get teacher mappings for class/subject info
        const rawMappings = await TeacherMapping.find({
            teacher: { $in: teachers.map(t => t._id) },
        })
            .populate('teacher', 'name shortName')
            .populate({
                path: 'class',
                select: 'displayName department',
                populate: { path: 'department', select: 'shortName' }
            })
            .populate('subject', 'name code');

        // Filter out mappings with deleted teachers, subjects, or classes
        const mappings = rawMappings.filter(m => m.teacher && m.class && m.subject);

        // Calculate averages per teacher per question per class/type
        const reports: {
            teacher: { _id: string; name: string };
            rows: {
                class: string;
                subject: string;
                teachingType: string;
                questionAverages: { questionId: string; average: number; count: number }[];
                overallAverage: number;
            }[];
        }[] = [];

        for (const teacher of teachers) {
            const teacherMappings = mappings.filter(
                m => m.teacher._id.toString() === teacher._id.toString()
            );

            const rows: typeof reports[0]['rows'] = [];

            for (const mapping of teacherMappings) {
                // Find feedback sessions for this specific class
                const classId = (mapping.class as unknown as { _id: { toString: () => string } })._id.toString();
                const relevantSessions = feedbackSessions.filter(
                    s => (s.class as unknown as { _id: { toString: () => string } })._id.toString() === classId
                );
                const relevantSessionIds = relevantSessions.map(s => s._id.toString());

                // Only consider responses from feedback sessions for this class
                const classResponses = feedbackResponses.filter(
                    r => relevantSessionIds.includes(r.feedbackSession.toString())
                );

                // Find all responses for this teacher/class/type combination
                const questionAverages: { questionId: string; average: number; count: number }[] = [];
                let totalPoints = 0;
                let totalCount = 0;

                for (const question of questions) {
                    if (question.type !== 'abcd_grade') continue;

                    let sum = 0;
                    let count = 0;

                    for (const response of classResponses) {
                        const questionResponse = response.responses.find(
                            (r: { question: { toString: () => string } }) => r.question.toString() === question._id.toString()
                        );

                        if (questionResponse?.teacherResponses) {
                            const teacherResponse = questionResponse.teacherResponses.find(
                                (tr: { teacher: { toString: () => string }; teachingType: string }) =>
                                    tr.teacher?.toString() === teacher._id.toString() &&
                                    tr.teachingType === mapping.teachingType
                            );

                            if (teacherResponse?.points) {
                                sum += teacherResponse.points;
                                count++;
                            }
                        }
                    }

                    const average = count > 0 ? Number((sum / count).toFixed(2)) : 0;
                    questionAverages.push({
                        questionId: question._id.toString(),
                        average,
                        count,
                    });

                    totalPoints += sum;
                    totalCount += count;
                }

                if (totalCount > 0) {
                    const classData = mapping.class as unknown as {
                        displayName: string;
                        department?: { shortName: string }
                    };
                    const deptShortName = classData.department?.shortName || '';
                    const classDisplay = deptShortName
                        ? `${deptShortName}-${classData.displayName}`
                        : classData.displayName;

                    rows.push({
                        class: classDisplay,
                        subject: (mapping.subject as unknown as { name: string }).name,
                        teachingType: mapping.teachingType,
                        questionAverages,
                        overallAverage: Number((totalPoints / totalCount).toFixed(2)),
                    });
                }
            }

            if (rows.length > 0) {
                reports.push({
                    teacher: { _id: teacher._id.toString(), name: teacher.name },
                    rows,
                });
            }
        }

        return NextResponse.json({
            questions: questions.map(q => ({ _id: q._id, text: q.text })),
            reports,
        }, { status: 200 });
    } catch (error) {
        console.error('Error generating feedback report:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
