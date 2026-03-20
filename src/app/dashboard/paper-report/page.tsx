'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Printer, FileText, CheckCircle, XCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Session {
    _id: string;
    title: string;
    isActive: boolean;
}

interface ReportItem {
    subjectId: string;
    subjectName: string;
    subjectCode?: string;
    status: 'pending' | 'approved' | 'rejected' | 'not_submitted';
    facultyName: string;
    submittedAt?: string;
    reviewedAt?: string;
}

const statusConfig = {
    pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
    approved: { label: 'Approved', color: 'bg-green-100 text-green-800', icon: CheckCircle },
    rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800', icon: XCircle },
    not_submitted: { label: 'Not Submitted', color: 'bg-gray-100 text-gray-800', icon: EyeOff },
};

export default function PaperReportPage() {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [selectedSession, setSelectedSession] = useState<string>('');
    const [report, setReport] = useState<ReportItem[]>([]);
    const [summary, setSummary] = useState({ total: 0, submitted: 0, remaining: 0 });
    const [loading, setLoading] = useState(false);
    const [watermark, setWatermark] = useState('CONFIDENTIAL - HOD COPY');
    const [showWatermark, setShowWatermark] = useState(true);
    const [mounted, setMounted] = useState(false);
    const [printDate, setPrintDate] = useState('');

    const printRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMounted(true);
        setPrintDate(new Date().toLocaleString());

        const fetchSessions = async () => {
            try {
                const res = await fetch('/api/paper-sessions');
                const data = await res.json();
                const fetchedSessions = data.sessions || [];
                setSessions(fetchedSessions);

                if (fetchedSessions.length > 0) {
                    const active = fetchedSessions.find((s: Session) => s.isActive);
                    setSelectedSession(active?._id || fetchedSessions[0]._id);
                }
            } catch (err) {
                console.error('Failed to fetch sessions:', err);
            }
        };
        fetchSessions();
    }, []);

    useEffect(() => {
        if (selectedSession && mounted) {
            fetchReport();
        }
    }, [selectedSession, mounted]);

    const fetchReport = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/paper-submissions/report?sessionId=${selectedSession}`);
            const data = await res.json();
            setReport(data.report || []);
            setSummary(data.summary || { total: 0, submitted: 0, remaining: 0 });
        } catch (error) {
            console.error('Failed to fetch report:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="space-y-6">
            {/* Control Panel - Hidden when printing */}
            <div className="print:hidden space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Paper Submission Report</h1>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={fetchReport} disabled={loading}>
                            Refresh
                        </Button>
                        <Button onClick={handlePrint} className="gap-2" disabled={loading || report.length === 0}>
                            <Printer className="h-4 w-4" />
                            Print Report
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardHeader className="py-3">
                            <CardTitle className="text-sm">Select Session</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Select value={selectedSession} onValueChange={setSelectedSession}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Choose a session" />
                                </SelectTrigger>
                                <SelectContent>
                                    {sessions.map((s) => (
                                        <SelectItem key={s._id} value={s._id}>
                                            {s.title} {s.isActive ? '(Active)' : ''}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="py-3">
                            <CardTitle className="text-sm">Watermark Settings</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                                <Input
                                    value={watermark}
                                    onChange={(e) => setWatermark(e.target.value)}
                                    placeholder="Watermark text"
                                    className="h-8"
                                />
                                <Button
                                    variant={showWatermark ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setShowWatermark(!showWatermark)}
                                >
                                    {showWatermark ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-primary/5 border-primary/20">
                        <CardHeader className="py-3">
                            <CardTitle className="text-sm">Completion Status</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex justify-between items-center text-sm">
                                <span>{summary.submitted} of {summary.total} Subjects</span>
                                <Badge variant={summary.remaining === 0 ? 'default' : 'secondary'}>
                                    {summary.remaining === 0 ? 'COMPLETED' : `${summary.remaining} REMAINING`}
                                </Badge>
                            </div>
                            <div className="w-full h-2 bg-gray-200 rounded-full mt-2 overflow-hidden">
                                <div
                                    className="h-full bg-primary transition-all duration-500"
                                    style={{ width: `${(summary.submitted / summary.total) * 100 || 0}%` }}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Report Content - Visible always but styled for print */}
            <div
                ref={printRef}
                className={`relative report-container bg-white p-4 md:p-8 rounded-lg shadow-sm border min-h-[600px] overflow-hidden ${showWatermark ? 'watermark-enabled' : ''}`}
                style={{ '--watermark-text': `"${watermark || 'CONFIDENTIAL'}"` } as React.CSSProperties}
            >
                {/* Watermark layer (On screen Grid) */}
                {showWatermark && (
                    <div className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0 opacity-[0.03] flex flex-wrap gap-[100px] items-center justify-center -rotate-45 print:hidden">
                        {Array.from({ length: 40 }).map((_, i) => (
                            <span key={i} className="text-4xl font-black whitespace-nowrap text-black uppercase tracking-widest leading-none">
                                {watermark || 'CONFIDENTIAL'}
                            </span>
                        ))}
                    </div>
                )}

                <div className="relative z-10 flex flex-col h-full bg-transparent">
                    {/* Header for report */}
                    <div className="flex flex-col items-center justify-center mb-8 border-b-2 pb-6">
                        <h2 className="text-2xl font-bold text-center uppercase tracking-wider">Departmental Paper Submission Report</h2>
                        <p className="text-lg text-muted-foreground mt-1">
                            Session: <span className="font-semibold text-foreground uppercase">{sessions.find(s => s._id === selectedSession)?.title || '...'}</span>
                        </p>
                        <div className="text-sm text-muted-foreground mt-4 grid grid-cols-2 gap-x-8 gap-y-1">
                            <span>Printed On: <span className="text-foreground">{printDate || '...'}</span></span>
                            <span>Report Status: <Badge variant="outline">{summary.remaining === 0 ? 'Full' : 'Partial'}</Badge></span>
                        </div>
                    </div>

                    <Table className="bg-transparent">
                        <TableHeader>
                            <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                                <TableHead className="w-[100px] font-bold">Code</TableHead>
                                <TableHead className="font-bold">Subject Name</TableHead>
                                <TableHead className="font-bold">Faculty Name</TableHead>
                                <TableHead className="font-bold text-center">Status</TableHead>
                                <TableHead className="font-bold text-right">Submitted At</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {report.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground italic">
                                        {loading ? 'Crunching data...' : 'No subjects found for this department.'}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                report.map((item) => {
                                    const cfg = statusConfig[item.status];
                                    const StatusIcon = cfg.icon;
                                    return (
                                        <TableRow key={item.subjectId} className="hover:bg-gray-50/30">
                                            <TableCell className="font-medium">{item.subjectCode || '-'}</TableCell>
                                            <TableCell>{item.subjectName}</TableCell>
                                            <TableCell className={item.facultyName === '-' ? 'text-muted-foreground italic' : 'font-medium'}>
                                                {item.facultyName}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold ${cfg.color}`}>
                                                    <StatusIcon className="h-3 w-3" />
                                                    {cfg.label}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right text-xs text-muted-foreground">
                                                {item.submittedAt ? new Date(item.submittedAt).toLocaleDateString() : '-'}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>

                    {/* Report Footer */}
                    <div className="mt-auto pt-12 flex justify-between items-end border-t border-dashed mt-8">
                        <div className="text-xs text-muted-foreground">
                            <p>End of Report</p>
                            <p className="mt-1">Generated by IA MP-SGI System</p>
                        </div>
                        <div className="flex flex-col items-center">
                            <div className="w-48 h-px bg-black/20 mb-2" />
                            <p className="text-sm font-semibold uppercase tracking-wider">HOD Signature</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Global Print Styles */}
            <style jsx global>{`
                @media print {
                    body {
                        background: white !important;
                    }
                    .report-container {
                        border: none !important;
                        box-shadow: none !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        min-height: auto !important;
                        background: transparent !important;
                    }
                    .report-container.watermark-enabled::before {
                        content: var(--watermark-text);
                        position: fixed;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%) rotate(-45deg);
                        font-size: 72px;
                        font-weight: 900;
                        font-family: Arial, sans-serif;
                        color: rgba(20, 20, 20, 0.08); /* Matches StyleLayer but slightly lighter for report legibility */
                        white-space: nowrap;
                        pointer-events: none;
                        z-index: 0;
                        letter-spacing: 8px;
                        display: block;
                    }
                    .print-hidden, header, sidebar, footer {
                        display: none !important;
                    }
                    main {
                        padding: 0 !important;
                        margin: 0 !important;
                    }
                    @page {
                        margin: 1cm;
                    }
                }
            `}</style>
        </div>
    );
}
