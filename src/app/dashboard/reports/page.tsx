'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface Department {
    _id: string;
    name: string;
    shortName: string;
}

interface Semester {
    _id: string;
    name: string;
    academicYear: string;
    type: 'odd' | 'even';
}

interface Column {
    key: string;
    teacherId: string;
    teacherName: string;
    teacherShortName: string;
    subjectId: string;
    subjectName: string;
    subjectCode?: string;
    classId: string;
    className?: string;
}

interface Row {
    srNo: number;
    pointId: string;
    pointName: string;
    values: Record<string, string>;
}

interface Report {
    department: {
        id: string;
        name: string;
        shortName: string;
    };
    semester: {
        id: string;
        name: string;
        academicYear: string;
        type: string;
    };
    coordinator: {
        name: string;
    } | null;
    columns: Column[];
    rows: Row[];
    supervisedBy: Record<string, string>;
}

export default function ReportsPage() {
    const { data: session } = useSession();
    const [departments, setDepartments] = useState<Department[]>([]);
    const [semesters, setSemesters] = useState<Semester[]>([]);
    const [report, setReport] = useState<Report | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedDepartment, setSelectedDepartment] = useState<string>('');
    const [selectedSemester, setSelectedSemester] = useState<string>('');
    const printRef = useRef<HTMLDivElement>(null);

    const role = session?.user?.role;
    const canSelectDepartment = role === 'super_admin' || role === 'principal';

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (selectedSemester) {
            if (canSelectDepartment && selectedDepartment) {
                fetchReport();
            } else if (!canSelectDepartment) {
                fetchReport();
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedDepartment, selectedSemester, canSelectDepartment]);

    const fetchInitialData = async () => {
        try {
            const res = await fetch('/api/reports');
            const data = await res.json();
            setDepartments(data.departments || []);
            setSemesters(data.semesters || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchReport = async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            if (canSelectDepartment && selectedDepartment) {
                params.append('department', selectedDepartment);
            }
            if (selectedSemester) {
                params.append('semester', selectedSemester);
            }
            const res = await fetch(`/api/reports?${params.toString()}`);
            const data = await res.json();
            setReport(data.report);
        } catch (error) {
            console.error('Error fetching report:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getColumnKey = (col: Column) => {
        return col.key;
    };

    const handlePrint = () => {
        const printContent = printRef.current;
        if (!printContent || !report) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>IAMP Report - ${report.department.name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; font-size: 12px; }
            .header { text-align: center; margin-bottom: 20px; }
            .header h1 { margin: 0; font-size: 18px; }
            .header p { margin: 5px 0; color: #666; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #000; padding: 6px; text-align: center; }
            th { background-color: #f0f0f0; }
            .point-name { text-align: left; }
            .completed { background-color: #d4edda; }
            .not-completed { background-color: #f8d7da; }
            .na-cell { background-color: #e9ecef; color: #6c757d; }
            .signature-row td { height: 50px; vertical-align: bottom; }
            .checked-by { margin-top: 30px; text-align: right; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>IAMP Supervision Report</h1>
            <p>Department: ${report.department.name} (${report.department.shortName})</p>
            <p>Semester: ${report.semester.name}</p>
          </div>
          ${printContent.innerHTML}
          <div class="checked-by">
            <p><strong>Checked By:</strong> ${report.coordinator?.name || '_________________'}</p>
            <p>IAMP Coordinator</p>
          </div>
        </body>
      </html>
    `);
        printWindow.document.close();
        printWindow.print();
    };

    const getStatusCell = (status: string) => {
        if (!status) return <span className="text-muted-foreground">-</span>;
        const colors: Record<string, string> = {
            yes: 'bg-green-100 text-green-800',
            no: 'bg-red-100 text-red-800',
            na: 'bg-gray-200 text-gray-600',
        };
        const labels: Record<string, string> = { yes: 'Yes', no: 'No', na: 'N/A' };
        return (
            <span className={`px-2 py-1 rounded text-xs font-medium ${colors[status]}`}>
                {labels[status]}
            </span>
        );
    };

    const getStatusText = (status: string) => {
        const labels: Record<string, string> = { yes: 'Yes', no: 'No', na: 'N/A' };
        return labels[status] || '-';
    };

    const isColumnCompleted = (col: Column) => {
        if (!report) return false;
        const colKey = getColumnKey(col);
        // Ignore N/A entries, check if all other entries are "yes"
        return report.rows.every((row) => {
            const value = row.values[colKey];
            // N/A is ignored, empty is not completed, "yes" is completed, "no" is not
            return value === 'yes' || value === 'na';
        });
    };

    const showNoSemesterMessage = semesters.length === 0;

    return (
        <div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <h1 className="text-2xl font-bold">Reports</h1>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    {canSelectDepartment && (
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                            <Label className="sm:shrink-0">Department:</Label>
                            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                                <SelectTrigger className="w-full sm:w-48">
                                    <SelectValue placeholder="Select department" />
                                </SelectTrigger>
                                <SelectContent>
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
                        <Label className="sm:shrink-0">Semester:</Label>
                        <Select value={selectedSemester} onValueChange={setSelectedSemester}>
                            <SelectTrigger className="w-full sm:w-56">
                                <SelectValue placeholder="Select semester" />
                            </SelectTrigger>
                            <SelectContent>
                                {semesters.map((sem) => (
                                    <SelectItem key={sem._id} value={sem._id}>
                                        {sem.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {report && report.columns.length > 0 && (
                        <Button onClick={handlePrint} variant="outline" className="shrink-0">
                            Print Report
                        </Button>
                    )}
                </div>
            </div>

            {showNoSemesterMessage ? (
                <Card>
                    <CardContent className="py-8">
                        <p className="text-center text-muted-foreground">
                            No semesters found. Please contact admin to create semesters.
                        </p>
                    </CardContent>
                </Card>
            ) : !selectedSemester ? (
                <Card>
                    <CardContent className="py-8">
                        <p className="text-center text-muted-foreground">
                            Please select a semester to view the report
                        </p>
                    </CardContent>
                </Card>
            ) : canSelectDepartment && !selectedDepartment ? (
                <Card>
                    <CardContent className="py-8">
                        <p className="text-center text-muted-foreground">
                            Please select a department to view the report
                        </p>
                    </CardContent>
                </Card>
            ) : isLoading ? (
                <div>Loading...</div>
            ) : !report ? (
                <Card>
                    <CardContent className="py-8">
                        <p className="text-center text-muted-foreground">
                            {canSelectDepartment
                                ? 'No data found for the selected department'
                                : 'No department assigned. Please contact admin.'}
                        </p>
                    </CardContent>
                </Card>
            ) : report.columns.length === 0 ? (
                <Card>
                    <CardContent className="py-8">
                        <p className="text-center text-muted-foreground">
                            No teacher mappings found in this department. Please add teacher mappings first.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <span>Department: {report.department.name}</span>
                                <Badge variant="outline">{report.department.shortName}</Badge>
                            </div>
                            <Badge>{report.semester.name}</Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="overflow-x-auto">
                        <table className="w-full border-collapse text-sm">
                            <thead>
                                <tr className="bg-yellow-100">
                                    <th className="border p-2 text-left" rowSpan={4}>Sr.No.</th>
                                    <th className="border p-2 text-left" rowSpan={4}>Index</th>
                                </tr>
                                <tr className="bg-yellow-100">
                                    {report.columns.map((col) => (
                                        <th key={`name-${getColumnKey(col)}`} className="border p-2 text-center font-bold">
                                            {col.teacherShortName || col.teacherName}
                                        </th>
                                    ))}
                                </tr>
                                <tr className="bg-yellow-50">
                                    {report.columns.map((col) => (
                                        <th key={`subject-${getColumnKey(col)}`} className="border p-2 text-center text-xs font-medium">
                                            {col.subjectCode || col.subjectName}
                                        </th>
                                    ))}
                                </tr>
                                <tr className="bg-gray-100">
                                    {report.columns.map((col) => (
                                        <th key={`class-${getColumnKey(col)}`} className="border p-2 text-center text-xs">
                                            {col.className || '-'}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {report.rows.map((row) => (
                                    <tr key={row.pointId} className="hover:bg-gray-50">
                                        <td className="border p-2 text-center">{row.srNo}</td>
                                        <td className="border p-2">{row.pointName}</td>
                                        {report.columns.map((col) => (
                                            <td key={getColumnKey(col)} className="border p-2 text-center">
                                                {getStatusCell(row.values[getColumnKey(col)])}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                                <tr className="bg-gray-100 font-medium">
                                    <td className="border p-2 text-center" colSpan={2}>Status</td>
                                    {report.columns.map((col) => {
                                        const completed = isColumnCompleted(col);
                                        return (
                                            <td
                                                key={`${getColumnKey(col)}-status`}
                                                className={`border p-2 text-center text-xs ${completed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                                            >
                                                {completed ? 'Completed' : 'Not Completed'}
                                            </td>
                                        );
                                    })}
                                </tr>
                                <tr className="bg-blue-50">
                                    <td className="border p-2 text-center font-medium" colSpan={2}>Supervised By</td>
                                    {report.columns.map((col) => (
                                        <td
                                            key={`${getColumnKey(col)}-supervisor`}
                                            className="border p-2 text-center text-xs"
                                        >
                                            {report.supervisedBy[getColumnKey(col)] || '-'}
                                        </td>
                                    ))}
                                </tr>
                            </tbody>
                        </table>

                        <div ref={printRef} className="hidden">
                            <table>
                                <thead>
                                    <tr>
                                        <th rowSpan={4}>Sr.No.</th>
                                        <th rowSpan={4}>Index</th>
                                    </tr>
                                    <tr>
                                        {report.columns.map((col) => (
                                            <th key={`print-name-${getColumnKey(col)}`}>{col.teacherShortName || col.teacherName}</th>
                                        ))}
                                    </tr>
                                    <tr>
                                        {report.columns.map((col) => (
                                            <th key={`print-subject-${getColumnKey(col)}`}>{col.subjectCode || col.subjectName}</th>
                                        ))}
                                    </tr>
                                    <tr>
                                        {report.columns.map((col) => (
                                            <th key={`print-class-${getColumnKey(col)}`}>{col.className || '-'}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {report.rows.map((row) => (
                                        <tr key={row.pointId}>
                                            <td>{row.srNo}</td>
                                            <td className="point-name">{row.pointName}</td>
                                            {report.columns.map((col) => (
                                                <td key={getColumnKey(col)} className={row.values[getColumnKey(col)] === 'na' ? 'na-cell' : ''}>
                                                    {getStatusText(row.values[getColumnKey(col)])}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                    <tr>
                                        <td colSpan={2}><strong>Status</strong></td>
                                        {report.columns.map((col) => {
                                            const completed = isColumnCompleted(col);
                                            return (
                                                <td key={`${getColumnKey(col)}-status`} className={completed ? 'completed' : 'not-completed'}>
                                                    {completed ? 'Completed' : 'Not Completed'}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                    <tr>
                                        <td colSpan={2}><strong>Supervised By</strong></td>
                                        {report.columns.map((col) => (
                                            <td key={`${getColumnKey(col)}-print-supervisor`}>
                                                {report.supervisedBy[getColumnKey(col)] || '-'}
                                            </td>
                                        ))}
                                    </tr>
                                    <tr className="signature-row">
                                        <td colSpan={2}><strong>Teacher Signature</strong></td>
                                        {report.columns.map((col, idx) => (<td key={idx}></td>))}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
