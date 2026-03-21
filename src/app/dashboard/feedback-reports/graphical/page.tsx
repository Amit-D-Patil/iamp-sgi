'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import letterhead from '@/assets/letterhead.jpg';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Printer } from 'lucide-react';
import StyleLayer from '@/components/StyleLayer';
import { cn } from '@/lib/utils';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    Cell,
    LabelList
} from 'recharts';

interface QuestionAverage {
    questionId: string;
    average: number;
}

interface DepartmentStats {
    departmentId: string;
    departmentName: string;
    departmentShortName: string;
    questionAverages: QuestionAverage[];
    overallAverage: number;
    percentage: number;
    rank: number;
}

interface GraphicalReportData {
    questions: { _id: string; text: string; shortText: string }[];
    departments: DepartmentStats[];
    institute: {
        questionAverages: QuestionAverage[];
        overallAverage: number;
        percentage: number;
    };
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

const getMonthYear = () => {
    return new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

// Colors matching PHP script
const COLORS = [
    '#F7A032', // Orange (BSH equivalent)
    '#25A032', // Green (CSE)
    '#0034FF', // Blue (CE)
    '#D0FF00', // Yellow (ETC)
    '#D40000', // Red (EE)
    '#00FFF3', // Cyan (ME)
    '#FF00FF', // Magenta (if more depts)
    '#A020F0', // Purple
];

export default function GraphicalReportPage() {
    const { data: session } = useSession();
    const [data, setData] = useState<GraphicalReportData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const showWatermark = process.env.NEXT_PUBLIC_UI_LAYER === 'enabled';

    useEffect(() => {
        if (showWatermark) {
            document.addEventListener('copy', (e) => e.preventDefault());
        }
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const res = await fetch('/api/feedback-reports/graphical');
            const result = await res.json();
            if (result.questions) {
                setData(result);
            }
        } catch (error) {
            console.error('Error fetching graphical reports:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    if (isLoading) {
        return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading graphical reports...</div>;
    }

    if (!data || data.departments.length === 0) {
        return <div className="p-8 text-center text-muted-foreground">No feedback data available to generate report.</div>;
    }

    // Prepare chart data for Institute vs Departments
    const instVsDeptData = data.departments.map(d => ({
        name: d.departmentShortName || d.departmentName,
        avg: Number(d.percentage.toFixed(2)) // PHP script charts percentages
    }));

    // Prepare chart data for Institute vs Questions
    const instVsQuestionData = data.questions.map((q, idx) => {
        const qAvg = data.institute.questionAverages.find(a => a.questionId === q._id);
        return {
            name: `Q${idx + 1}`,
            avg: qAvg ? Number(qAvg.average.toFixed(2)) : 0
        };
    });

    return (
        <div className={cn(showWatermark && 'select-none', 'report-root pb-12')}>
            {/* Control Panel */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 screen-only">
                <div>
                    <h1 className="text-2xl font-bold">Graphical Feedback Report</h1>
                    <p className="text-muted-foreground text-sm">Department-wise feedback analysis with charts</p>
                </div>
                <Button onClick={handlePrint} className="gap-2 print:hidden w-fit">
                    <Printer className="h-4 w-4" />
                    Print Report
                </Button>
            </div>

            {/* Print View Container */}
            <div className="print-container bg-white" style={{ maxWidth: '1260px', margin: '0 auto', color: '#000' }}>
                
                {/* Header Strip */}
                <div className="flex border-b border-black pb-2 mb-4 items-center gap-6">
                    <div className="w-[100px] shrink-0 print:w-[100px]">
                         <Image src={letterhead} alt="Logo" width={100} height={100} style={{ objectFit: 'contain', width: '100%', height: 'auto' }} priority />
                    </div>
                    <div className="flex-1 text-center font-serif">
                        <h2 className="text-xl md:text-3xl font-bold">Sou. Sushila Danchand Ghodawat Charitable Trust&apos;s</h2>
                        <h1 className="text-2xl md:text-4xl font-extrabold mt-1">Sanjay Ghodawat Polytechnic</h1>
                        <h3 className="text-lg md:text-2xl font-bold mt-2">Formative Feedback {getMonthYear()}</h3>
                    </div>
                    <div className="w-[100px] shrink-0" />
                </div>

                {/* Dense Summary Table matching PHP style exactly */}
                <div className="w-full border border-black mb-8 overflow-x-auto text-xs md:text-sm font-bold">
                    <div className="flex border-b border-black text-center bg-gray-100/50 print:bg-transparent">
                        <div className="flex-1 min-w-[80px] p-2 border-r border-black flex items-center justify-center">DEPT</div>
                        {data.questions.map((q, i) => (
                            <div key={q._id} className="w-[60px] md:w-[70px] shrink-0 p-2 border-r border-black flex items-center justify-center">Q{i + 1}</div>
                        ))}
                        <div className="w-[60px] md:w-[70px] shrink-0 p-2 border-r border-black flex items-center justify-center">AVG</div>
                        <div className="w-[70px] md:w-[80px] shrink-0 p-2 border-r border-black flex items-center justify-center">AVG(%)</div>
                        <div className="w-[60px] md:w-[70px] shrink-0 p-2 flex items-center justify-center">RANK</div>
                    </div>

                    {/* Department Rows */}
                    {data.departments.map(dept => (
                        <div key={dept.departmentId} className="flex border-b border-black text-center font-normal last:border-0 hover:bg-gray-50/50 print:hover:bg-transparent">
                            <div className="flex-1 min-w-[80px] p-2 border-r border-black flex items-center justify-center font-bold">
                                {dept.departmentShortName || dept.departmentName}
                            </div>
                            {data.questions.map(q => {
                                const qAvg = dept.questionAverages.find(a => a.questionId === q._id);
                                return (
                                    <div key={q._id} className="w-[60px] md:w-[70px] shrink-0 p-2 border-r border-black flex items-center justify-center">
                                        {qAvg ? qAvg.average.toFixed(2) : '0.00'}
                                    </div>
                                );
                            })}
                            <div className="w-[60px] md:w-[70px] shrink-0 p-2 border-r border-black flex items-center justify-center font-bold">
                                {dept.overallAverage.toFixed(2)}
                            </div>
                            <div className="w-[70px] md:w-[80px] shrink-0 p-2 border-r border-black flex items-center justify-center text-blue-700 font-bold print:text-black">
                                {dept.percentage.toFixed(2)}
                            </div>
                            <div className="w-[60px] md:w-[70px] shrink-0 p-2 flex items-center justify-center font-bold">
                                {dept.rank || '-'}
                            </div>
                        </div>
                    ))}

                    {/* Overall Institute Row */}
                    <div className="flex border-t-2 border-black text-center bg-gray-50 font-bold print:bg-transparent">
                        <div className="flex-1 min-w-[80px] p-2 border-r border-black flex items-center justify-center">AVG</div>
                        {data.questions.map(q => {
                            const qAvg = data.institute.questionAverages.find(a => a.questionId === q._id);
                            return (
                                <div key={q._id} className="w-[60px] md:w-[70px] shrink-0 p-2 border-r border-black flex items-center justify-center">
                                    {qAvg ? qAvg.average.toFixed(2) : '0.00'}
                                </div>
                            );
                        })}
                        <div className="w-[60px] md:w-[70px] shrink-0 p-2 border-r border-black flex items-center justify-center">
                            {data.institute.overallAverage.toFixed(2)}
                        </div>
                        <div className="w-[70px] md:w-[80px] shrink-0 p-2 border-r border-black flex items-center justify-center text-blue-700 print:text-black">
                            {data.institute.percentage.toFixed(2)}
                        </div>
                        <div className="w-[60px] md:w-[70px] shrink-0 p-2 flex items-center justify-center">-</div>
                    </div>
                </div>

                {/* Departmental Per-Question Bar Charts - Grid layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12 page-break-container">
                    {data.departments.map((dept, i) => {
                        const deptColor = COLORS[i % COLORS.length];
                        const chartData = data.questions.map((q, idx) => {
                            const qAvg = dept.questionAverages.find(a => a.questionId === q._id);
                            return { name: `Q${idx + 1}`, avg: qAvg ? Number(qAvg.average.toFixed(2)) : 0 };
                        });

                        return (
                            <div key={dept.departmentId} className="border border-black/30 p-2 pt-4 bg-white avoid-break">
                                <h4 className="text-center font-bold text-lg mb-2">{dept.departmentShortName || dept.departmentName}</h4>
                                <div className="h-[250px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={chartData} margin={{ top: 15, right: 5, left: -20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ccc" />
                                            <XAxis dataKey="name" axisLine={true} tickLine={false} tick={{ fontSize: 10, fill: 'black' }} />
                                            <YAxis domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} axisLine={true} tickLine={false} tick={{ fontSize: 10, fill: 'black' }} />
                                            <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{color: 'black'}} />
                                            <Bar dataKey="avg" fill={deptColor} barSize={25}>
                                                <LabelList dataKey="avg" position="top" style={{ fontSize: '10px', fill: 'black', fontWeight: 'bold' }} />
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Page break marker for printer */}
                <div className="print-page-break mb-8" />

                {/* Top Header repeatedly for second printed page */}
                <div className="print-only-heading hidden print:flex border-b border-black pb-2 mb-4 items-center gap-6">
                    <div className="w-[100px] shrink-0">
                         <Image src={letterhead} alt="Logo" width={100} height={100} style={{ objectFit: 'contain', width: '100%', height: 'auto' }} priority />
                    </div>
                    <div className="flex-1 text-center font-serif">
                        <h2 className="text-xl md:text-3xl font-bold">Sou. Sushila Danchand Ghodawat Charitable Trust&apos;s</h2>
                        <h1 className="text-2xl md:text-4xl font-extrabold mt-1">Sanjay Ghodawat Polytechnic</h1>
                        <h3 className="text-lg md:text-2xl font-bold mt-2">Formative Feedback {getMonthYear()}</h3>
                    </div>
                    <div className="w-[100px] shrink-0" />
                </div>

                {/* SGP Overall Avg vs Departments */}
                <div className="border border-black/30 p-4 mb-8 bg-white avoid-break">
                    <h3 className="text-center text-xl font-bold mb-4">SGP VS Departments</h3>
                    <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={instVsDeptData} margin={{ top: 20, right: 20, left: 0, bottom: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ccc" />
                                <XAxis dataKey="name" axisLine={true} tickLine={false} tick={{ fontSize: 14, fill: 'black', fontWeight: 'bold' }} />
                                <YAxis domain={[0, 100]} ticks={[0, 20, 40, 60, 80, 100]} axisLine={true} tickLine={false} tick={{ fontSize: 12, fill: 'black' }} />
                                <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{color: 'black'}} />
                                <Bar dataKey="avg" fill="#25A032" barSize={50}>
                                    <LabelList dataKey="avg" position="top" style={{ fontSize: '14px', fill: 'black', fontWeight: 'bold' }} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* SGP Overall Avg vs Questions */}
                <div className="border border-black/30 p-4 mb-8 bg-white avoid-break">
                    <h3 className="text-center text-xl font-bold mb-4">SGP VS Questions</h3>
                    <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={instVsQuestionData} margin={{ top: 20, right: 20, left: -10, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ccc" />
                                <XAxis dataKey="name" axisLine={true} tickLine={false} tick={{ fontSize: 14, fill: 'black', fontWeight: 'bold' }} />
                                <YAxis domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} axisLine={true} tickLine={false} tick={{ fontSize: 12, fill: 'black' }} />
                                <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{color: 'black'}} />
                                <Bar dataKey="avg" fill="#3b8bba" barSize={40}>
                                    <LabelList dataKey="avg" position="top" style={{ fontSize: '14px', fill: 'black', fontWeight: 'bold' }} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>

            <StyleLayer />

            <style jsx global>{`
                .screen-only {
                    display: flex;
                }
                .print-only-heading {
                    display: none;
                }
                
                @media print {
                    .screen-only, header, nav, aside {
                        display: none !important;
                    }
                    .print-only-heading {
                        display: flex !important;
                    }
                    body {
                        background: transparent !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .report-root {
                        background: transparent;
                        padding: 0 !important;
                        margin: 0 !important;
                    }
                    .avoid-break {
                        page-break-inside: avoid;
                    }
                    .print-page-break {
                        page-break-after: always;
                    }
                    @page {
                        margin: 1cm;
                        size: A4 portrait;
                    }
                }
            `}</style>
        </div>
    );
}
