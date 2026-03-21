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

interface InstituteFaculty {
    teacherId: string;
    teacherName: string;
    teacherShortName: string;
    average: number;
    rank: number;
    displayName: string;
    annotation: string; // e.g. "R1 | 9.80"
}

export default function InstituteFacultyRankReportPage() {
    const { data: session } = useSession();
    const [faculties, setFaculties] = useState<InstituteFaculty[]>([]);
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
            const res = await fetch('/api/feedback-reports/institute-faculty-rank');
            const result = await res.json();
            if (result.faculties) {
                setFaculties(result.faculties);
            }
        } catch (error) {
            console.error('Error fetching institute faculty rank reports:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    if (isLoading) {
        return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading institute rank reports...</div>;
    }

    if (faculties.length === 0) {
        return <div className="p-8 text-center text-muted-foreground">No faculty rank data available.</div>;
    }

    // Determine a dynamic height so the chart isn't cramped if there are a lot of teachers.
    const dynamicHeight = Math.max(900, faculties.length * 35);

    return (
        <div className={cn(showWatermark && 'select-none', 'report-root pb-12')}>
            {/* Control Panel */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 screen-only">
                <div>
                    <h1 className="text-2xl font-bold">Institute Faculty Rank</h1>
                    <p className="text-muted-foreground text-sm">Overall ranking of all active faculty members across the entire institute</p>
                </div>
                <Button onClick={handlePrint} className="gap-2 print:hidden w-fit">
                    <Printer className="h-4 w-4" />
                    Print Report
                </Button>
            </div>

            {/* Print View Container */}
            <div className="print-container bg-white" style={{ maxWidth: '1260px', margin: '0 auto', color: '#000' }}>
                <div className="flex flex-col pt-8" style={{ height: '100%' }}>
                    
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

                    {/* Titles exactly like PHP script */}
                    <h2 className="text-center text-xl md:text-2xl font-extrabold mb-8 uppercase tracking-wider text-gray-800">
                        RANK OF FACULTY IN INSTITUTE
                    </h2>

                    {/* The modern analytical Horizontal Bar Chart */}
                    <div className="flex-1 w-full flex justify-center mt-6 p-4 md:p-8 bg-white border border-indigo-50 shadow-2xl rounded-[2rem] print:border-none print:shadow-none print:p-0 print:rounded-none">
                        <div className="w-full max-w-[1200px]" style={{ height: `${dynamicHeight}px` }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart 
                                    data={faculties} 
                                    layout="vertical"
                                    margin={{ top: 20, right: 120, left: 5, bottom: 20 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={true} stroke="#e5e7eb" />
                                    
                                    <XAxis 
                                        type="number" 
                                        domain={[0, 10]} 
                                        ticks={[0, 2, 4, 6, 8, 10]} 
                                        axisLine={true} 
                                        tickLine={false} 
                                        tick={{ fontSize: 13, fill: '#374151', fontWeight: 'bold' }} 
                                    />
                                    
                                    <YAxis 
                                        type="category" 
                                        dataKey="displayName" 
                                        axisLine={true} 
                                        tickLine={false} 
                                        tick={{ fontSize: 13, fill: '#111827', fontWeight: 'bold' }} 
                                        width={120}
                                    />

                                    <RechartsTooltip cursor={{fill: 'rgba(0,0,0,0.05)'}} contentStyle={{color: 'black'}} />
                                    
                                    {/* Traditional Google Charts Blue turned into Modern Gradient */}
                                    <Bar dataKey="average" fill="url(#colorUvVert)" barSize={22} radius={[0, 8, 8, 0]}>
                                        {/* Right-aligned text formatting (R1 | 9.80) */}
                                        <LabelList dataKey="annotation" position="right" style={{ fontSize: '12.5px', fill: '#4b5563', fontWeight: 'bold' }} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                            
                            {/* SVG Gradient for modern horizontal glowing effect */}
                            <svg width="0" height="0">
                                <defs>
                                <linearGradient id="colorUvVert" x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.9}/>
                                    <stop offset="95%" stopColor="#2563eb" stopOpacity={1}/>
                                </linearGradient>
                                </defs>
                            </svg>
                        </div>
                    </div>
                </div>
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
                    @page {
                        margin: 0.5cm;
                        size: auto; /* Allow the browser to decide height depending on dynamic content height */
                    }
                }
            `}</style>
        </div>
    );
}
