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

        // Get teacher ID from query params (optional)
        const { searchParams } = new URL(request.url);
        const teacherId = searchParams.get('teacher');
        const sessionId = searchParams.get('session');

        // Get all questions (for headers)
        const questions = await Question.find({ isActive: true }).sort({ order: 1 });

        // Get teachers (filter by department for non-super-admin)
        let teacherQuery: { _id?: string; department?: string } = {};
        if (teacherId) {
            teacherQuery._id = teacherId;
        }
        if (session.user.role !== 'super_admin' && user?.department) {
            teacherQuery.department = user.department.toString();
        }

        const teachers = await Teacher.find(teacherQuery).select('name shortName');

        // Get feedback sessions (filter by department)
        let sessionQuery: { _id?: string; department?: string } = {};
        if (sessionId) {
            sessionQuery._id = sessionId;
        }
        if (session.user.role !== 'super_admin' && user?.department) {
            sessionQuery.department = user.department.toString();
        }

        const feedbackSessions = await FeedbackSession.find(sessionQuery)
            .populate('class', 'displayName');

        const sessionIds = feedbackSessions.map(s => s._id);

        // Get all feedback responses
        const feedbackResponses = await FeedbackResponse.find({
            feedbackSession: { $in: sessionIds },
        });

        // Get teacher mappings for class/subject info
        const mappings = await TeacherMapping.find({
            teacher: { $in: teachers.map(t => t._id) },
        })
            .populate('teacher', 'name shortName')
            .populate('class', 'displayName')
            .populate('subject', 'name code');

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
                // Find all responses for this teacher/class/type combination
                const questionAverages: { questionId: string; average: number; count: number }[] = [];
                let totalPoints = 0;
                let totalCount = 0;

                for (const question of questions) {
                    if (question.type !== 'abcd_grade') continue;

                    let sum = 0;
                    let count = 0;

                    for (const response of feedbackResponses) {
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
                    rows.push({
                        class: (mapping.class as unknown as { displayName: string }).displayName,
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
