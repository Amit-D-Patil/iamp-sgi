import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import FeedbackResponse from '@/models/FeedbackResponse';
import FeedbackSession from '@/models/FeedbackSession';
import TeacherMapping from '@/models/TeacherMapping';
import Teacher from '@/models/Teacher';
import Question from '@/models/Question';
import User from '@/models/User';
import Class from '@/models/Class';
import Subject from '@/models/Subject';
import Semester from '@/models/Semester';
import { auth } from '@/lib/auth';

// Ensure models are registered
Class;
Subject;

// GET - Get appreciation letter data for teachers
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Only allow feedback_coordinator, principal, hod
        const allowedRoles = ['super_admin', 'feedback_coordinator', 'principal', 'hod'];
        if (!allowedRoles.includes(session.user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        await connectDB();

        const user = await User.findById(session.user.id);
        const { searchParams } = new URL(request.url);
        const teacherId = searchParams.get('teacher');
        const semesterId = searchParams.get('semester');

        // If specific teacher requested, return detailed data for letter generation
        if (teacherId) {
            const teacher = await Teacher.findById(teacherId)
                .populate('department', 'name shortName');

            if (!teacher) {
                return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
            }

            // Get semester info
            let semesterName = '';
            if (semesterId) {
                const semester = await Semester.findById(semesterId);
                semesterName = semester?.name || '';
            }

            // Get all questions
            const questions = await Question.find({ isActive: true, type: 'abcd_grade' }).sort({ order: 1 });

            // Get teacher mappings
            const mappings = await TeacherMapping.find({ teacher: teacherId, isActive: true })
                .populate('class', 'displayName')
                .populate('subject', 'name code');

            // Get all feedback sessions for this teacher's classes
            const classIds = mappings.map(m => m.class._id);
            const feedbackSessions = await FeedbackSession.find({ class: { $in: classIds } })
                .populate('class', 'displayName');

            const sessionIds = feedbackSessions.map(s => s._id);

            // Get all responses
            const feedbackResponses = await FeedbackResponse.find({
                feedbackSession: { $in: sessionIds },
            });

            // Calculate scores per mapping
            const mappingScores: {
                subjectCode: string;
                subjectName: string;
                teachingType: string;
                class: string;
                overallAverage: number;
            }[] = [];

            for (const mapping of mappings) {
                // Get sessions for this class
                const classId = (mapping.class as unknown as { _id: { toString: () => string } })._id.toString();
                const relevantSessions = feedbackSessions.filter(
                    s => (s.class as unknown as { _id: { toString: () => string } })._id.toString() === classId
                );
                const relevantSessionIds = relevantSessions.map(s => s._id.toString());
                const classResponses = feedbackResponses.filter(
                    r => relevantSessionIds.includes(r.feedbackSession.toString())
                );

                let totalPoints = 0;
                let totalCount = 0;

                for (const question of questions) {
                    for (const response of classResponses) {
                        const questionResponse = response.responses.find(
                            (r: { question: { toString: () => string } }) =>
                                r.question.toString() === question._id.toString()
                        );

                        if (questionResponse?.teacherResponses) {
                            const teacherResponse = questionResponse.teacherResponses.find(
                                (tr: { teacher: { toString: () => string }; teachingType: string }) =>
                                    tr.teacher?.toString() === teacher._id.toString() &&
                                    tr.teachingType === mapping.teachingType
                            );

                            if (teacherResponse?.points) {
                                totalPoints += teacherResponse.points;
                                totalCount++;
                            }
                        }
                    }
                }

                if (totalCount > 0) {
                    const subjectInfo = mapping.subject as unknown as { name: string; code?: string };
                    const classInfo = mapping.class as unknown as { displayName: string };

                    mappingScores.push({
                        subjectCode: subjectInfo.code || '',
                        subjectName: subjectInfo.name,
                        teachingType: mapping.teachingType === 'theory' ? 'TH' : 'PR',
                        class: classInfo.displayName,
                        overallAverage: Number((totalPoints / totalCount).toFixed(2)),
                    });
                }
            }

            // Calculate grand total
            const grandTotal = mappingScores.length > 0
                ? Number((mappingScores.reduce((sum, m) => sum + m.overallAverage, 0) / mappingScores.length).toFixed(2))
                : 0;

            return NextResponse.json({
                teacher: {
                    _id: teacher._id,
                    name: teacher.name,
                    department: (teacher.department as unknown as { name: string })?.name || '',
                },
                semester: semesterName,
                mappings: mappingScores,
                grandTotal,
            }, { status: 200 });
        }

        // List all teachers for the user's department
        let teacherQuery: { department?: string } = {};
        if (session.user.role !== 'super_admin' && session.user.role !== 'principal') {
            if (!user?.department) {
                return NextResponse.json({ error: 'No department assigned' }, { status: 400 });
            }
            teacherQuery.department = user.department.toString();
        }

        const teachers = await Teacher.find(teacherQuery)
            .populate('department', 'name shortName')
            .sort({ name: 1 });

        // Get semesters for filter
        const semesters = await Semester.find({ isActive: true }).sort({ startDate: -1 });

        return NextResponse.json({
            teachers: teachers.map(t => ({
                _id: t._id,
                name: t.name,
                shortName: t.shortName,
                department: (t.department as unknown as { name: string; shortName: string })?.name || '',
            })),
            semesters: semesters.map(s => ({
                _id: s._id,
                name: s.name,
            })),
        }, { status: 200 });
    } catch (error) {
        console.error('Error generating appreciation letter data:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
