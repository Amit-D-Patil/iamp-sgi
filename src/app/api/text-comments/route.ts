import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import FeedbackResponse from '@/models/FeedbackResponse';
import FeedbackSession from '@/models/FeedbackSession';
import Question from '@/models/Question';
import User from '@/models/User';
import Class from '@/models/Class';
import Batch from '@/models/Batch';
import { auth } from '@/lib/auth';

// Ensure models are registered
Class;
Batch;

// GET - Get text comments report (division-wise)
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

        const { searchParams } = new URL(request.url);
        const sessionId = searchParams.get('session');

        // Get text questions
        const textQuestions = await Question.find({
            isActive: true,
            type: 'text'
        }).sort({ order: 1 });

        if (textQuestions.length === 0) {
            return NextResponse.json({
                questions: [],
                sessions: [],
                comments: [],
            }, { status: 200 });
        }

        // Get feedback sessions (filter by department for non-super-admin)
        let sessionQuery: Record<string, unknown> = {};
        if (sessionId) {
            sessionQuery._id = sessionId;
        }
        if (session.user.role !== 'super_admin' && session.user.role !== 'principal' && user?.department) {
            sessionQuery.department = user.department;
        }

        const feedbackSessions = await FeedbackSession.find(sessionQuery)
            .populate('class', 'displayName year division')
            .populate('department', 'name shortName');

        const sessionIds = feedbackSessions.map(s => s._id);

        // Get all feedback responses with text answers
        const feedbackResponses = await FeedbackResponse.find({
            feedbackSession: { $in: sessionIds },
        }).populate('batch', 'name');

        // Group comments by session (class) and batch (division)
        const commentsMap: Record<string, {
            sessionId: string;
            className: string;
            batchName: string;
            questionId: string;
            questionText: string;
            comments: string[];
        }> = {};

        for (const response of feedbackResponses) {
            const feedbackSession = feedbackSessions.find(
                s => s._id.toString() === response.feedbackSession.toString()
            );
            if (!feedbackSession) continue;

            const classInfo = feedbackSession.class as unknown as { displayName: string };
            const batchInfo = response.batch as unknown as { name: string } | null;
            const batchName = batchInfo?.name || 'General';

            for (const questionResponse of response.responses) {
                if (!questionResponse.textResponse || questionResponse.textResponse.trim() === '') {
                    continue;
                }

                const question = textQuestions.find(
                    q => q._id.toString() === questionResponse.question.toString()
                );
                if (!question) continue;

                const key = `${feedbackSession._id}-${batchName}-${question._id}`;

                if (!commentsMap[key]) {
                    commentsMap[key] = {
                        sessionId: feedbackSession._id.toString(),
                        className: classInfo.displayName,
                        batchName,
                        questionId: question._id.toString(),
                        questionText: question.text,
                        comments: [],
                    };
                }

                commentsMap[key].comments.push(questionResponse.textResponse.trim());
            }
        }

        // Convert to array and group by class
        const commentsArray = Object.values(commentsMap);

        // Group by class for easier display
        const groupedByClass: Record<string, {
            className: string;
            batches: {
                batchName: string;
                questions: {
                    questionText: string;
                    comments: string[];
                }[];
            }[];
        }> = {};

        for (const item of commentsArray) {
            if (!groupedByClass[item.className]) {
                groupedByClass[item.className] = {
                    className: item.className,
                    batches: [],
                };
            }

            let batch = groupedByClass[item.className].batches.find(
                b => b.batchName === item.batchName
            );
            if (!batch) {
                batch = { batchName: item.batchName, questions: [] };
                groupedByClass[item.className].batches.push(batch);
            }

            batch.questions.push({
                questionText: item.questionText,
                comments: item.comments,
            });
        }

        return NextResponse.json({
            questions: textQuestions.map(q => ({ _id: q._id, text: q.text })),
            sessions: feedbackSessions.map(s => ({
                _id: s._id,
                className: (s.class as unknown as { displayName: string }).displayName,
            })),
            comments: Object.values(groupedByClass),
        }, { status: 200 });
    } catch (error) {
        console.error('Error generating text comments report:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
