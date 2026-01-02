'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import letterhead from '@/assets/letterhead.jpg';

interface Teacher {
    _id: string;
    name: string;
    shortName?: string;
    department: string;
}

interface Semester {
    _id: string;
    name: string;
}

interface MappingScore {
    subjectCode: string;
    subjectName: string;
    teachingType: string;
    class: string;
    overallAverage: number;
}

interface LetterData {
    teacher: { _id: string; name: string; department: string };
    semester: string;
    mappings: MappingScore[];
    grandTotal: number;
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

// Format date
const formatDate = () => {
    return new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
};

// Get remark based on percentage score
const getRemark = (percentage: number): string => {
    if (percentage > 90) return 'Excellent';
    if (percentage >= 81) return 'Good';
    if (percentage >= 71) return 'Average';
    return 'Poor';
};

export default function AppreciationLetterPage() {
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [semesters, setSemesters] = useState<Semester[]>([]);
    const [selectedTeacher, setSelectedTeacher] = useState<string>('');
    const [selectedSemester, setSelectedSemester] = useState<string>('');
    const [letterData, setLetterData] = useState<LetterData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const letterRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchTeachers();
    }, []);

    const fetchTeachers = async () => {
        try {
            const res = await fetch('/api/appreciation-letter');
            const data = await res.json();
            setTeachers(data.teachers || []);
            setSemesters(data.semesters || []);
        } catch (error) {
            console.error('Error fetching teachers:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const generateLetter = async () => {
        if (!selectedTeacher) return;
        setIsGenerating(true);
        try {
            const url = `/api/appreciation-letter?teacher=${selectedTeacher}${selectedSemester ? `&semester=${selectedSemester}` : ''}`;
            const res = await fetch(url);
            const data = await res.json();
            setLetterData(data);
        } catch (error) {
            console.error('Error generating letter:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    if (isLoading) {
        return <div>Loading...</div>;
    }

    return (
        <div>
            {/* Screen View - Controls */}
            <div className="print:hidden">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold">Appreciation Letter</h1>
                    <p className="text-muted-foreground text-sm">
                        Generate appreciation letters for faculty based on feedback scores
                    </p>
                </div>

                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle className="text-lg">Select Faculty</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Semester (Optional)</Label>
                                <Select
                                    value={selectedSemester}
                                    onValueChange={setSelectedSemester}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="All semesters" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Semesters</SelectItem>
                                        {semesters.map((sem) => (
                                            <SelectItem key={sem._id} value={sem._id}>
                                                {sem.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Faculty</Label>
                                <Select
                                    value={selectedTeacher}
                                    onValueChange={setSelectedTeacher}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select faculty" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {teachers.map((teacher) => (
                                            <SelectItem key={teacher._id} value={teacher._id}>
                                                {teacher.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-end gap-2">
                                <Button
                                    onClick={generateLetter}
                                    disabled={!selectedTeacher || isGenerating}
                                >
                                    {isGenerating ? 'Generating...' : 'Generate Letter'}
                                </Button>
                                {letterData && (
                                    <Button variant="outline" onClick={handlePrint}>
                                        Print / Download
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Letter Preview */}
                {letterData && letterData.mappings.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Letter Preview</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="border rounded-lg p-4 bg-white">
                                <LetterContent data={letterData} />
                            </div>
                        </CardContent>
                    </Card>
                )}

                {letterData && letterData.mappings.length === 0 && (
                    <Card>
                        <CardContent className="py-8">
                            <p className="text-muted-foreground text-center">
                                No feedback data found for this faculty.
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Print View */}
            <div className="hidden print:block" ref={letterRef}>
                {letterData && <LetterContent data={letterData} />}
            </div>
        </div>
    );
}

function LetterContent({ data }: { data: LetterData }) {
    const academicYear = getAcademicYear();
    const currentDate = formatDate();

    // Get all unique subjects for the header
    const subjectsList = data.mappings.map(m =>
        `${m.subjectName}${m.subjectCode ? ` (${m.subjectCode})` : ''} - ${m.teachingType} - ${m.class}`
    ).join(', ');

    return (
        <div className="font-serif text-sm" style={{ maxWidth: '210mm', margin: '0 auto' }}>
            {/* Letterhead */}
            <div className="relative w-full mb-4">
                <Image
                    src={letterhead}
                    alt="SGI Letterhead"
                    width={800}
                    height={150}
                    className="w-full h-auto"
                    priority
                />
            </div>

            {/* Date */}
            <div className="text-right mb-6">
                <p>Date: {currentDate}</p>
            </div>

            {/* To */}
            <div className="mb-4">
                <p>To,</p>
                <p className="font-bold">{data.teacher.name}</p>
                <p>Lecturer, {data.teacher.department}</p>
                <p>SGI, Atigre.</p>
            </div>

            {/* Subject */}
            <div className="mb-4">
                <p><strong>Subject:</strong> Regarding Analysis of Student Feedback</p>
            </div>

            {/* Salutation */}
            <div className="mb-4">
                <p>Dear Sir/Madam,</p>
            </div>

            {/* Body */}
            <div className="mb-6 text-justify leading-relaxed">
                <p className="indent-8">
                    According to the record, you were incharge of the subjects{' '}
                    <strong>{subjectsList}</strong>, for the year <strong>{academicYear}</strong>
                    {data.semester && ` (${data.semester})`}. After receiving the students feedback
                    and analyzing the same, we find that your score in this regard is as follows:
                </p>
            </div>

            {/* Scores Table */}
            <div className="mb-6 overflow-x-auto">
                <Table className="border text-sm">
                    <TableHeader>
                        <TableRow>
                            <TableHead className="border bg-gray-100 font-bold text-center">Sr No</TableHead>
                            <TableHead className="border bg-gray-100 font-bold">Subject</TableHead>
                            <TableHead className="border bg-gray-100 font-bold text-center">Format</TableHead>
                            <TableHead className="border bg-gray-100 font-bold text-center">Class</TableHead>
                            <TableHead className="border bg-gray-100 font-bold text-center">Score</TableHead>
                            <TableHead className="border bg-gray-100 font-bold text-center">Remark</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.mappings.map((mapping, idx) => (
                            <TableRow key={idx}>
                                <TableCell className="border text-center">{idx + 1}</TableCell>
                                <TableCell className="border">
                                    {mapping.subjectName}
                                    {mapping.subjectCode && ` (${mapping.subjectCode})`}
                                </TableCell>
                                <TableCell className="border text-center">
                                    {mapping.teachingType === 'TH' ? 'Theory' : 'Practical'}
                                </TableCell>
                                <TableCell className="border text-center">{mapping.class}</TableCell>
                                <TableCell className="border text-center">
                                    {(mapping.overallAverage * 10).toFixed(0)}%
                                </TableCell>
                                <TableCell className="border text-center font-medium">
                                    {getRemark(mapping.overallAverage * 10)}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Appreciation text */}
            <div className="mb-8 text-justify leading-relaxed">
                <p className="indent-8">
                    We appreciate the efforts taken by you and recommend you to keep the excellent work
                    and also strive for better results.
                </p>
            </div>

            {/* Closing */}
            <div className="mb-16">
                <p className="indent-8">Wishing you the best in your endeavors</p>
            </div>

            {/* Signatures */}
            <div className="flex justify-between mt-16 pt-4">
                <div className="text-center">
                    <div className="h-12"></div>
                    <p className="font-bold">H.O.D.</p>
                </div>
                <div className="text-center">
                    <div className="h-12"></div>
                    <p className="font-bold">Director</p>
                </div>
            </div>
        </div>
    );
}
