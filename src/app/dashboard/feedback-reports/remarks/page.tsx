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
    PieChart,
    Pie,
    Cell,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';

interface RankedFaculty {
    teacherId: string;
    teacherName: string;
    teacherShortName: string;
    average: number;
    rank: number;
    displayName: string;
}

interface DepartmentRankData {
    departmentId: string;
    departmentName: string;
    faculties: RankedFaculty[];
}

// Map the PHP conditions to distinct colors
const CATEGORY_COLORS = {
    'Excellent': '#2ecc71', // Green
    'Good': '#3498db',      // Blue
    'Average': '#f1c40f',   // Yellow
    'Poor': '#e74c3c'       // Red
};

export default function RemarksReportPage() {
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
            // Reuse the faculty-rank API which provides exact department-wise averages for all teachers!
            const res = await fetch('/api/feedback-reports/faculty-rank');
            const result = await res.json();
            if (result.departments) {
                setDepartments(result.departments);
            }
        } catch (error) {
            console.error('Error fetching remarks report data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    if (isLoading) {
        return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading remarks reports...</div>;
    }

    if (departments.length === 0) {
        return <div className="p-8 text-center text-muted-foreground">No faculty rank data available.</div>;
    }

    // Process Department data exactly like PHP: categorizing lengths
    const computePieData = (faculties: RankedFaculty[]) => {
        let nume = 0; // Excellent >= 9
        let numg = 0; // Good >= 8 and < 9
        let numa = 0; // Average >= 7 and < 8
        let nump = 0; // Poor < 7

        faculties.forEach(f => {
            if (f.average >= 9) nume++;
            else if (f.average >= 8) numg++;
            else if (f.average >= 7) numa++;
            else nump++;
        });

        // Mapping to PieChart required array structure
        return [
            { name: `Excellent No. of Faculty ${nume}`, value: nume, category: 'Excellent' },
            { name: `Good No. of Faculty ${numg}`, value: numg, category: 'Good' },
            { name: `Average No. of Faculty ${numa}`, value: numa, category: 'Average' },
            { name: `Poor No. of Faculty ${nump}`, value: nump, category: 'Poor' }
        ].filter(item => item.value > 0); // Don't draw slices for 0
    };

    return (
        <div className={cn(showWatermark && 'select-none', 'report-root pb-12')}>
            {/* Control Panel */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 screen-only">
                <div>
                    <h1 className="text-2xl font-bold">Faculty Remarks Overview</h1>
                    <p className="text-muted-foreground text-sm">Department-wise faculty classifications (Excellent, Good, Average, Poor)</p>
                </div>
                <Button onClick={handlePrint} className="gap-2 print:hidden w-fit">
                    <Printer className="h-4 w-4" />
                    Print Report
                </Button>
            </div>

            {/* Print View Container */}
            <div className="print-container bg-white" style={{ maxWidth: '1260px', margin: '0 auto', color: '#000' }}>
                <div className="flex flex-col pt-8 min-h-[400px]">
                    
                    {/* Letterhead Logo exactly like PHP's <img src="SGP Logo.jpg"> */}
                    <div className="w-full flex justify-center mb-6">
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
                    <h2 className="text-center text-xl md:text-2xl font-bold mb-10 text-gray-800 tracking-wider">
                        FACULTY FEEDBACK REMARKS ANALYSIS
                    </h2>

                    {/* Full width CSS layout to accommodate long labels */}
                    <div className="flex flex-col gap-12 px-4 md:px-8 print:px-0">
                        {departments.map((dept) => {
                            const pieData = computePieData(dept.faculties);
                            
                            return (
                                <div key={dept.departmentId} className="flex flex-col items-center justify-start border border-gray-200 shadow-sm p-4 print:shadow-none print:border-gray-400 avoid-break rounded-md">
                                    <h2 className="w-full text-center text-xl font-bold mb-4">{dept.departmentName}</h2>
                                    
                                    {pieData.length > 0 ? (
                                        <div className="w-full h-[450px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={pieData}
                                                        cx="50%"
                                                        cy="50%"
                                                        outerRadius={130}
                                                        dataKey="value"
                                                        label={({ name, percent = 0 }: any) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                                        labelLine={true}
                                                    >
                                                        {pieData.map((entry, index) => (
                                                            <Cell 
                                                                key={`cell-${index}`} 
                                                                fill={CATEGORY_COLORS[entry.category as keyof typeof CATEGORY_COLORS]} 
                                                            />
                                                        ))}
                                                    </Pie>
                                                    <RechartsTooltip formatter={(value, name) => [value, 'Faculty Count']} />
                                                    <Legend wrapperStyle={{ position: 'relative', marginTop: '-10px' }} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                    ) : (
                                        <div className="w-full h-[450px] flex items-center justify-center text-gray-400 italic">
                                            No faculty feedback data available
                                        </div>
                                    )}
                                </div>
                            );
                        })}
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
                    .avoid-break {
                        page-break-inside: avoid;
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
