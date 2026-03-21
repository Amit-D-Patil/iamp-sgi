import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import FeedbackResponse from '@/models/FeedbackResponse';
import FeedbackSession from '@/models/FeedbackSession';
import Question from '@/models/Question';
import Department from '@/models/Department';
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
        const questions = await Question.find({ isActive: true, type: 'abcd_grade' }).sort({ order: 1 });

        // Find all feedback sessions associated with these departments
        const sessions = await FeedbackSession.find({
            department: { $in: departments.map(d => d._id) }
        });

        const responses = await FeedbackResponse.find({
            feedbackSession: { $in: sessions.map(s => s._id) }
        });

        // Group responses by department
        const sessionToDeptMap = new Map();
        sessions.forEach(s => sessionToDeptMap.set(s._id.toString(), s.department.toString()));

        // Precompute responses per dept to reduce loops
        const deptResponses = new Map();
        departments.forEach(d => deptResponses.set(d._id.toString(), []));

        responses.forEach(r => {
            const deptId = sessionToDeptMap.get(r.feedbackSession.toString());
            if (deptId && deptResponses.has(deptId)) {
                deptResponses.get(deptId).push(r);
            }
        });

        const reportData = [];
        let instituteGlobalPoints = 0;
        let instituteGlobalCount = 0;
        const instituteQuestionStats = new Map();

        questions.forEach(q => {
            instituteQuestionStats.set(q._id.toString(), { sum: 0, count: 0 });
        });

        for (const dept of departments) {
            const rList = deptResponses.get(dept._id.toString());
            const qAverages = [];
            let deptTotalPoints = 0;
            let deptTotalCount = 0;

            for (const q of questions) {
                let qSum = 0;
                let qCount = 0;

                for (const r of rList) {
                    const ans = r.responses.find((ansAny: any) => ansAny.question.toString() === q._id.toString());
                    if (ans && ans.teacherResponses) {
                        for (const tr of ans.teacherResponses) {
                            if (typeof tr.points === 'number') {
                                qSum += tr.points;
                                qCount++;
                                
                                // Add to global stats
                                const instQ = instituteQuestionStats.get(q._id.toString());
                                if (instQ) {
                                    instQ.sum += tr.points;
                                    instQ.count++;
                                }
                                instituteGlobalPoints += tr.points;
                                instituteGlobalCount++;
                            }
                        }
                    }
                }

                deptTotalPoints += qSum;
                deptTotalCount += qCount;

                qAverages.push({
                    questionId: q._id.toString(),
                    average: qCount > 0 ? Number((qSum / qCount).toFixed(2)) : 0
                });
            }

            const overallAvg = deptTotalCount > 0 ? Number((deptTotalPoints / deptTotalCount).toFixed(2)) : 0;
            
            reportData.push({
                departmentId: dept._id.toString(),
                departmentName: dept.name,
                departmentShortName: dept.shortName,
                questionAverages: qAverages,
                overallAverage: overallAvg,
                percentage: Number((overallAvg * 10).toFixed(2)) // PHP script did avg * 10
            });
        }

        // Rank calculation
        reportData.sort((a, b) => b.overallAverage - a.overallAverage);
        reportData.forEach((r, idx) => {
            (r as any).rank = r.overallAverage > 0 ? idx + 1 : 0;
        });

        // Institute calculations
        const instituteQAverages = questions.map(q => {
            const stats = instituteQuestionStats.get(q._id.toString());
            return {
                questionId: q._id.toString(),
                average: stats && stats.count > 0 ? Number((stats.sum / stats.count).toFixed(2)) : 0
            };
        });

        const instituteOverall = instituteGlobalCount > 0 ? Number((instituteGlobalPoints / instituteGlobalCount).toFixed(2)) : 0;

        return NextResponse.json({
            questions: questions.map(q => ({ _id: q._id.toString(), text: q.text, shortText: q.text.substring(0, 15) })),
            departments: reportData,
            institute: {
                questionAverages: instituteQAverages,
                overallAverage: instituteOverall,
                percentage: Number((instituteOverall * 10).toFixed(2))
            }
        });

    } catch (error) {
        console.error('Graphical Report API Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
