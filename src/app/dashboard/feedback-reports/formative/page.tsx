'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import letterhead from '@/assets/letterhead.jpg';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import StyleLayer from '@/components/StyleLayer';

interface Department {
    _id: string;
    name: string;
    shortName: string;
}

interface Question {
    _id: string;
    text: string;
}

interface QuestionAverage {
    questionId: string;
    average: number;
    count: number;
}

interface ReportRow {
    class: string;
    subject: string;
    teachingType: string;
    questionAverages: QuestionAverage[];
    overallAverage: number;
}

interface TeacherReport {
    teacher: { _id: string; name: string };
    rows: ReportRow[];
}

interface Teacher {
    _id: string;
    name: string;
}

const typeLabels: Record<string, string> = {
    theory: 'Theory',
    practical: 'Practical',
};

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

export default function FeedbackReportsPage() {
    const { data: session } = useSession();
    const [departments, setDepartments] = useState<Department[]>([]);
    const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
    const [questions, setQuestions] = useState<Question[]>([]);
    const [reports, setReports] = useState<TeacherReport[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [selectedTeacher, setSelectedTeacher] = useState<string>('all');
    const [isLoading, setIsLoading] = useState(true);

    const canFilterByDepartment = session?.user?.role === 'super_admin' || session?.user?.role === 'principal';

    useEffect(() => {
        if (canFilterByDepartment) {
            fetchDepartments();
        }
        fetchData();
    }, [canFilterByDepartment]);

    // Refetch when department changes (for super_admin and principal)
    useEffect(() => {
        if (canFilterByDepartment) {
            fetchData();
            setSelectedTeacher('all'); // Reset teacher filter when department changes
        }
    }, [selectedDepartment, canFilterByDepartment]);

    const fetchDepartments = async () => {
        try {
            const res = await fetch('/api/departments');
            const data = await res.json();
            setDepartments(data.departments || []);
        } catch (error) {
            console.error('Error fetching departments:', error);
        }
    };

    const fetchData = async () => {
        try {
            // Build query params
            const params = new URLSearchParams();
            if (canFilterByDepartment && selectedDepartment !== 'all') {
                params.set('department', selectedDepartment);
            }

            const [reportsRes, teachersRes] = await Promise.all([
                fetch(`/api/feedback-reports?${params.toString()}`),
                fetch(`/api/teachers${canFilterByDepartment && selectedDepartment !== 'all' ? `?department=${selectedDepartment}` : ''}`),
            ]);
            const reportsData = await reportsRes.json();
            const teachersData = await teachersRes.json();

            setQuestions(reportsData.questions || []);
            setReports(reportsData.reports || []);
            setTeachers(teachersData.teachers || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const filteredReports = selectedTeacher === 'all'
        ? reports
        : reports.filter(r => r.teacher._id === selectedTeacher);

    if (isLoading) {
        return <div>Loading...</div>;
    }

    return (
        <div>
            {/* Controls - hidden when printing */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 screen-only">
                <div>
                    <h1 className="text-2xl font-bold">Feedback Reports</h1>
                    <p className="text-muted-foreground text-sm">Teacher-wise feedback analysis</p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    {/* Department filter - for super_admin and principal */}
                    {canFilterByDepartment && (
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                            <Label className="sm:shrink-0">Department:</Label>
                            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
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
                    )}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <Label className="sm:shrink-0">Faculty:</Label>
                        <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                            <SelectTrigger className="w-full sm:w-48">
                                <SelectValue placeholder="Select faculty" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Faculty</SelectItem>
                                {teachers.map((teacher) => (
                                    <SelectItem key={teacher._id} value={teacher._id}>
                                        {teacher.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {filteredReports.length > 0 && (
                        <Button onClick={handlePrint} variant="outline" className="shrink-0">
                            Print Report
                        </Button>
                    )}
                </div>
            </div>

            {filteredReports.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                    No feedback data available.
                </div>
            ) : (
                <>
                    {/* ====== SCREEN VIEW - Shadcn Style ====== */}
                    <div className="screen-only space-y-6">
                        {filteredReports.map((report) => (
                            <Card key={report.teacher._id}>
                                <CardHeader>
                                    <CardTitle className="text-lg">{report.teacher.name}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="border rounded-lg overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="min-w-[120px]">Class</TableHead>
                                                    <TableHead className="min-w-[150px]">Subject</TableHead>
                                                    <TableHead className="min-w-[80px]">Type</TableHead>
                                                    {questions.map((q, idx) => (
                                                        <TableHead key={q._id} className="text-center min-w-[60px]">
                                                            Q{idx + 1}
                                                        </TableHead>
                                                    ))}
                                                    <TableHead className="text-center min-w-[70px]">Avg</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {report.rows.map((row, idx) => (
                                                    <TableRow key={idx}>
                                                        <TableCell className="font-medium">{row.class}</TableCell>
                                                        <TableCell>{row.subject}</TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline">
                                                                {typeLabels[row.teachingType] || row.teachingType}
                                                            </Badge>
                                                        </TableCell>
                                                        {questions.map((q) => {
                                                            const qAvg = row.questionAverages.find(qa => qa.questionId === q._id);
                                                            return (
                                                                <TableCell key={q._id} className="text-center">
                                                                    {qAvg?.average ? qAvg.average.toFixed(1) : '-'}
                                                                </TableCell>
                                                            );
                                                        })}
                                                        <TableCell className="text-center">
                                                            <Badge
                                                                variant={row.overallAverage >= 7.5 ? 'default' :
                                                                    row.overallAverage >= 5 ? 'secondary' : 'destructive'}
                                                            >
                                                                {row.overallAverage.toFixed(1)}
                                                            </Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}

                        {/* Question Legend */}
                        {questions.length > 0 && (
                            <div className="p-4 bg-muted rounded-lg">
                                <h3 className="font-medium mb-2">Question Reference:</h3>
                                <ul className="text-sm text-muted-foreground space-y-1">
                                    {questions.map((q, idx) => (
                                        <li key={q._id}>
                                            <strong>Q{idx + 1}:</strong> {q.text}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    {/* ====== PRINT VIEW - PHP Style ====== */}
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
            <div className="print-only" style={{ width: '100%', maxWidth: '950px' }}>
                {filteredReports.map((report, reportIndex) => (
                    <div key={report.teacher._id} className="faculty-page" style={{ pageBreakBefore: reportIndex > 0 ? 'always' : 'auto' }}>
                        {/* Header with letterhead */}
                        <div style={{ width: '100%', borderBottom: '1px solid black', paddingBottom: '10px', marginBottom: '10px' }}>
                            <Image
                                src={letterhead}
                                alt="SGI Letterhead"
                                width={950}
                                height={150}
                                style={{ width: '100%', height: 'auto' }}
                                priority
                            />
                            <div style={{ textAlign: 'center', marginTop: '10px' }}>
                                <b>
                                    Formative Feedback {getMonthYear()}<br />
                                    Performance Appraisal by Students Year: {getAcademicYear()}
                                </b>
                            </div>
                        </div>

                        {/* Faculty Name */}
                        <div style={{ marginTop: '5px', width: '100%' }}>
                            <b style={{ marginLeft: '5px' }}>Faculty Name: {report.teacher.name}</b>
                            <br /><br />

                            {/* Report Table */}
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                <thead>
                                    <tr>
                                        <th style={{ border: '1px solid black', padding: '5px', width: '12%' }}>Class</th>
                                        <th style={{ border: '1px solid black', padding: '5px', width: '15%' }}>Subject</th>
                                        <th style={{ border: '1px solid black', padding: '5px', width: '10%' }}>Type</th>
                                        {questions.map((q, idx) => (
                                            <th key={q._id} style={{ border: '1px solid black', padding: '5px', width: '6%' }}>
                                                Q{idx + 1}
                                            </th>
                                        ))}
                                        <th style={{ border: '1px solid black', padding: '5px', width: '6%' }}>Avg</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {report.rows.map((row, idx) => (
                                        <tr key={idx}>
                                            <td style={{ border: '1px solid black', padding: '5px' }}>{row.class}</td>
                                            <td style={{ border: '1px solid black', padding: '5px' }}>{row.subject}</td>
                                            <td style={{ border: '1px solid black', padding: '5px' }}>
                                                {typeLabels[row.teachingType] || row.teachingType}
                                            </td>
                                            {questions.map((q) => {
                                                const qAvg = row.questionAverages.find(qa => qa.questionId === q._id);
                                                return (
                                                    <td key={q._id} style={{ border: '1px solid black', padding: '5px', textAlign: 'center' }}>
                                                        {qAvg?.average ? qAvg.average.toFixed(2) : '-'}
                                                    </td>
                                                );
                                            })}
                                            <td style={{ border: '1px solid black', padding: '5px', textAlign: 'center', fontWeight: 'bold' }}>
                                                {row.overallAverage.toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Signature Section */}
                            <div style={{ height: '115px', textAlign: 'left' }}>
                                <br /><br /><br />
                                <div style={{ marginRight: '85px', textAlign: 'right' }}>
                                    HOD sign
                                </div>
                                <hr style={{ border: 'none', borderTop: '1px dashed black' }} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <StyleLayer />
        </div>
    );
}
