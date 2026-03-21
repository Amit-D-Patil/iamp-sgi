'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import letterhead from '@/assets/letterhead.jpg';
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
    LabelList
} from 'recharts';

interface RankedFaculty {
    teacherId: string;
    teacherName: string;
    teacherShortName: string;
    average: number;
    rank: number;
    displayName: string; // e.g. "1) Smith"
}

interface DepartmentRankData {
    departmentId: string;
    departmentName: string;
    faculties: RankedFaculty[];
}

export default function FacultyRankReportPage() {
    const { data: session } = useSession();
    const [departments, setDepartments] = useState<DepartmentRankData[]>([]);
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
            const res = await fetch('/api/feedback-reports/faculty-rank');
            const result = await res.json();
            if (result.departments) {
                setDepartments(result.departments);
            }
        } catch (error) {
            console.error('Error fetching faculty rank reports:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    if (isLoading) {
        return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading rank reports...</div>;
    }

    if (departments.length === 0) {
        return <div className="p-8 text-center text-muted-foreground">No faculty rank data available.</div>;
    }

    return (
        <div className={cn(showWatermark && 'select-none', 'report-root pb-12')}>
            {/* Control Panel */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 screen-only">
                <div>
                    <h1 className="text-2xl font-bold">Faculty Rank Report</h1>
                    <p className="text-muted-foreground text-sm">Department-wise faculty ranking based on overall feedback</p>
                </div>
                <Button onClick={handlePrint} className="gap-2 print:hidden w-fit">
                    <Printer className="h-4 w-4" />
                    Print Report
                </Button>
            </div>

            {/* Print View Container */}
            <div className="print-container bg-white" style={{ maxWidth: '1260px', margin: '0 auto', color: '#000' }}>
                {departments.map((dept, index) => (
                    <div 
                        key={dept.departmentId} 
                        className="department-page flex flex-col pt-8" 
                        style={{ height: '100%', minHeight: '885px', pageBreakAfter: index < departments.length - 1 ? 'always' : 'auto' }}
                    >
                        {/* Letterhead Logo exactly like PHP's <img src="SGP Logo.jpg"> */}
                        <div className="w-full flex justify-center mb-4">
                            <Image 
                                src={letterhead} 
                                alt="SGP Logo" 
                                width={800} 
                                height={100} 
                                style={{ objectFit: 'contain', width: '100%', maxWidth: '800px', height: 'auto' }} 
                                priority 
                            />
                        </div>

                        {/* Titles */}
                        <h2 className="text-center text-lg md:text-xl font-bold mb-1 uppercase tracking-wider text-gray-800">
                            RANK OF FACULTY IN DEPARTMENT
                        </h2>
                        <h1 className="text-center text-xl md:text-2xl font-bold mb-8 text-primary">
                            Department of {dept.departmentName}
                        </h1>

                        {/* The analytical Bar Chart */}
                        <div className="flex-1 w-full flex justify-center mt-6 border border-gray-100 shadow-lg rounded-3xl p-6 bg-white print:border-transparent print:shadow-none print:p-0 print:border-none print:rounded-none">
                            <div className="w-full max-w-[1000px] h-[450px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart 
                                        data={dept.faculties} 
                                        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ccc" />
                                        <XAxis 
                                            dataKey="displayName" 
                                            axisLine={true} 
                                            tickLine={false} 
                                            tick={{ fontSize: 12, fill: 'black', fontWeight: 'bold' }} 
                                            angle={-35}
                                            textAnchor="end"
                                            interval={0}
                                        />
                                        <YAxis 
                                            domain={[0, 10]} 
                                            ticks={[0, 2, 4, 6, 8, 10]} 
                                            axisLine={true} 
                                            tickLine={false} 
                                            tick={{ fontSize: 11, fill: 'black', fontWeight: 'bold' }} 
                                        />
                                        <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{color: 'black'}} />
                                        
                                        {/* Dynamic Bar with shadow styling */}
                                        <Bar dataKey="average" fill="url(#colorUv)" radius={[10, 10, 0, 0]} barSize={60}>
                                            <LabelList dataKey="average" position="top" style={{ fontSize: '13px', fill: '#4b5563', fontWeight: 'bold' }} />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                                
                                {/* SVG Gradients for glowing effect on screen */}
                                <svg width="0" height="0">
                                  <defs>
                                    <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.9}/>
                                      <stop offset="95%" stopColor="#059669" stopOpacity={1}/>
                                    </linearGradient>
                                  </defs>
                                </svg>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <StyleLayer />

            <style jsx global>{`
                .screen-only {
                    display: flex;
                }
                
                @media print {
                    .screen-only, header, nav, aside {
                        display: none !important;
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
                    .department-page {
                        page-break-inside: avoid;
                    }
                    @page {
                        margin: 1cm;
                        size: A4 landscape; /* Fits wide bar charts better! or portrait if needed */
                    }
                }
            `}</style>
        </div>
    );
}
