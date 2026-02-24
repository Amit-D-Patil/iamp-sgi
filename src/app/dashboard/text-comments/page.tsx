'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import StyleLayer from '@/components/StyleLayer';

interface ClassComments {
    className: string;
    departmentName: string;
    batches: {
        batchName: string;
        questions: {
            questionText: string;
            comments: string[];
        }[];
    }[];
}

interface FeedbackSession {
    _id: string;
    className: string;
    departmentId: string;
    departmentName: string;
}

// Get academic year
const getAcademicYear = () => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    if (month >= 7) {
        return `${year}-${(year + 1).toString().slice(-2)}`;
    } else {
        return `${year - 1}-${year.toString().slice(-2)}`;
    }
};

// Get month and year
const getMonthYear = () => {
    return new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

// Wrapper component to handle Suspense for useSearchParams
export default function TextCommentsPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <TextCommentsContent />
        </Suspense>
    );
}

interface Department {
    _id: string;
    name: string;
    shortName: string;
}

function TextCommentsContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { data: session } = useSession();
    const showBatchWise = searchParams.get('batch') === 'true';

    const [comments, setComments] = useState<ClassComments[]>([]);
    const [sessions, setSessions] = useState<FeedbackSession[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
    const [selectedSession, setSelectedSession] = useState<string>('all');
    const [isLoading, setIsLoading] = useState(true);

    // Check role and redirect if not authorized
    useEffect(() => {
        const allowedRoles = ['super_admin', 'principal'];
        if (session && !allowedRoles.includes(session.user?.role || '')) {
            router.replace('/dashboard');
        }
    }, [session, router]);

    useEffect(() => {
        // Only fetch if authorized
        const allowedRoles = ['super_admin', 'principal'];
        if (session && allowedRoles.includes(session.user?.role || '')) {
            fetchData();
        }
    }, [session]);

    const fetchData = async () => {
        try {
            const [commentsRes, departmentsRes] = await Promise.all([
                fetch('/api/text-comments'),
                fetch('/api/departments'),
            ]);
            const commentsData = await commentsRes.json();
            const departmentsData = await departmentsRes.json();

            setComments(commentsData.comments || []);
            setSessions(commentsData.sessions || []);
            setDepartments(departmentsData.departments || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    // Filter by department first, then by session
    const filteredByDepartment = selectedDepartment === 'all'
        ? comments
        : comments.filter(c => c.departmentName === departments.find(d => d._id === selectedDepartment)?.name);

    const filteredComments = selectedSession === 'all'
        ? filteredByDepartment
        : filteredByDepartment.filter(c => {
            const session = sessions.find(s => s.className === c.className);
            return session && session._id === selectedSession;
        });

    // Flatten comments when not showing batch-wise
    const getFlattenedComments = (classData: ClassComments) => {
        const allComments: { questionText: string; comments: string[] }[] = [];
        const questionMap = new Map<string, string[]>();

        for (const batch of classData.batches) {
            for (const question of batch.questions) {
                const existing = questionMap.get(question.questionText) || [];
                questionMap.set(question.questionText, [...existing, ...question.comments]);
            }
        }

        for (const [questionText, comments] of questionMap) {
            allComments.push({ questionText, comments });
        }

        return allComments;
    };

    if (isLoading) {
        return <div>Loading...</div>;
    }

    return (
        <div>
            {/* Controls - hidden when printing */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 screen-only">
                <div>
                    <h1 className="text-2xl font-bold">Text Comments</h1>
                    <p className="text-muted-foreground text-sm">
                        {showBatchWise ? 'Division-wise student feedback comments' : 'Student feedback comments'}
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    {/* Department Filter */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <Label className="sm:shrink-0">Department:</Label>
                        <Select value={selectedDepartment} onValueChange={(val) => {
                            setSelectedDepartment(val);
                            setSelectedSession('all'); // Reset class filter when department changes
                        }}>
                            <SelectTrigger className="w-full sm:w-48">
                                <SelectValue placeholder="Select department" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Departments</SelectItem>
                                {departments.map((dept) => (
                                    <SelectItem key={dept._id} value={dept._id}>
                                        {dept.name} ({dept.shortName})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {/* Class Filter */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <Label className="sm:shrink-0">Class:</Label>
                        <Select value={selectedSession} onValueChange={setSelectedSession}>
                            <SelectTrigger className="w-full sm:w-48">
                                <SelectValue placeholder="Select class" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Classes</SelectItem>
                                {sessions
                                    .filter(s => selectedDepartment === 'all' || s.departmentId === selectedDepartment)
                                    .map((session) => (
                                        <SelectItem key={session._id} value={session._id}>
                                            {selectedDepartment === 'all'
                                                ? `${session.departmentName ? session.departmentName + ' - ' : ''}${session.className}`
                                                : session.className}
                                        </SelectItem>
                                    ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {filteredComments.length > 0 && (
                        <Button onClick={handlePrint} variant="outline" className="shrink-0">
                            Print Report
                        </Button>
                    )}
                </div>
            </div>

            {filteredComments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                    No text comments available.
                </div>
            ) : (
                <>
                    {/* ====== SCREEN VIEW - Shadcn Style ====== */}
                    <div className="screen-only space-y-6">
                        {filteredComments.map((classData) => (
                            <Card key={`${classData.departmentName}-${classData.className}`}>
                                <CardHeader>
                                    <CardTitle className="text-lg">
                                        {classData.className}
                                    </CardTitle>
                                    <p className="text-sm text-muted-foreground">
                                        {classData.departmentName}
                                    </p>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {showBatchWise ? (
                                        // Batch-wise view
                                        classData.batches.map((batch) => (
                                            <div key={batch.batchName} className="space-y-3">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="secondary">{batch.batchName}</Badge>
                                                    <span className="text-sm text-muted-foreground">
                                                        ({batch.questions.reduce((acc, q) => acc + q.comments.length, 0)} comments)
                                                    </span>
                                                </div>

                                                {batch.questions.map((question, qIdx) => (
                                                    <div key={qIdx} className="space-y-2">
                                                        <p className="text-sm font-medium text-muted-foreground">
                                                            {question.questionText}
                                                        </p>
                                                        <ul className="space-y-2 pl-4">
                                                            {question.comments.map((comment, cIdx) => (
                                                                <li key={cIdx} className="text-sm border-l-2 border-primary pl-3 py-1">
                                                                    {comment}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                ))}
                                            </div>
                                        ))
                                    ) : (
                                        // Combined view (no batch grouping)
                                        getFlattenedComments(classData).map((question, qIdx) => (
                                            <div key={qIdx} className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-medium text-muted-foreground">
                                                        {question.questionText}
                                                    </p>
                                                    <span className="text-xs text-muted-foreground">
                                                        ({question.comments.length} comments)
                                                    </span>
                                                </div>
                                                <ul className="space-y-2 pl-4">
                                                    {question.comments.map((comment, cIdx) => (
                                                        <li key={cIdx} className="text-sm border-l-2 border-primary pl-3 py-1">
                                                            {comment}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        ))
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* ====== PRINT VIEW ====== */}
                    <div className="print-only" style={{ width: '100%' }}>
                        {filteredComments.map((classData, classIndex) => (
                            <div key={`${classData.departmentName}-${classData.className}`} style={{ pageBreakBefore: classIndex > 0 ? 'always' : 'auto' }}>
                                {/* Header */}
                                <div style={{ width: '100%', borderBottom: '1px solid black', paddingBottom: '10px', marginBottom: '10px' }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <b>
                                            Sou. Sushila Danchand Ghodawat Charitable Trust&apos;s<br />
                                            Sanjay Ghodawat Institute<br />
                                            Student Feedback - Text Comments<br />
                                            {getMonthYear()} | Year: {getAcademicYear()}
                                        </b>
                                    </div>
                                </div>

                                {/* Class Name and Department */}
                                <div style={{ marginBottom: '15px' }}>
                                    <b style={{ fontSize: '14px' }}>Class: {classData.className}</b><br />
                                    <span style={{ fontSize: '12px', color: '#666' }}>{classData.departmentName}</span>
                                </div>

                                {showBatchWise ? (
                                    // Batch-wise print view
                                    classData.batches.map((batch) => (
                                        <div key={batch.batchName} style={{ marginBottom: '20px' }}>
                                            <div style={{ backgroundColor: '#f0f0f0', padding: '5px 10px', marginBottom: '10px' }}>
                                                <b>Division: {batch.batchName}</b>
                                                <span style={{ marginLeft: '10px', fontSize: '12px' }}>
                                                    ({batch.questions.reduce((acc, q) => acc + q.comments.length, 0)} responses)
                                                </span>
                                            </div>

                                            {batch.questions.map((question, qIdx) => (
                                                <div key={qIdx} style={{ marginBottom: '10px' }}>
                                                    <p style={{ fontSize: '12px', fontStyle: 'italic', marginBottom: '5px' }}>
                                                        Q: {question.questionText}
                                                    </p>
                                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                                                        <tbody>
                                                            {question.comments.map((comment, cIdx) => (
                                                                <tr key={cIdx}>
                                                                    <td style={{ border: '1px solid #ccc', padding: '5px', width: '30px', textAlign: 'center' }}>
                                                                        {cIdx + 1}
                                                                    </td>
                                                                    <td style={{ border: '1px solid #ccc', padding: '5px' }}>
                                                                        {comment}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ))}
                                        </div>
                                    ))
                                ) : (
                                    // Combined print view (no batch grouping)
                                    getFlattenedComments(classData).map((question, qIdx) => (
                                        <div key={qIdx} style={{ marginBottom: '15px' }}>
                                            <p style={{ fontSize: '12px', fontStyle: 'italic', marginBottom: '5px' }}>
                                                Q: {question.questionText} ({question.comments.length} responses)
                                            </p>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                                                <tbody>
                                                    {question.comments.map((comment, cIdx) => (
                                                        <tr key={cIdx}>
                                                            <td style={{ border: '1px solid #ccc', padding: '5px', width: '30px', textAlign: 'center' }}>
                                                                {cIdx + 1}
                                                            </td>
                                                            <td style={{ border: '1px solid #ccc', padding: '5px' }}>
                                                                {comment}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ))
                                )}

                                {/* Footer */}
                                <div style={{ marginTop: '30px', textAlign: 'right' }}>
                                    <hr style={{ border: 'none', borderTop: '1px dashed black', marginBottom: '10px' }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Print/Screen styles */}
            <style jsx global>{`
                /* Screen only */
                .screen-only {
                    display: block;
                }
                .print-only {
                    display: none;
                }
                
                @media print {
                    /* Hide screen elements */
                    .screen-only {
                        display: none !important;
                    }
                    
                    /* Show print elements */
                    .print-only {
                        display: block !important;
                    }
                    
                    /* Hide navigation */
                    nav, aside, header {
                        display: none !important;
                    }
                    
                    /* Reset margins */
                    main {
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    
                    body {
                        print-color-adjust: exact;
                        -webkit-print-color-adjust: exact;
                    }
                    
                    @page {
                        margin: 1cm;
                        size: A4 portrait;
                    }
                }
            `}</style>
            <StyleLayer />
        </div>
    );
}
