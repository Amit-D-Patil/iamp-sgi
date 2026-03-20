'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, CheckCircle, AlertCircle, Eye } from 'lucide-react';

interface Session {
    _id: string;
    title: string;
    isActive: boolean;
}

interface Department {
    _id: string;
    name: string;
    shortName: string;
}

interface PaperItem {
    subjectId: string;
    subjectname: string;
    subjectCode?: string;
    hasApprovedSubmission: boolean;
    submissionId: string | null;
    facultyName: string;
    set1Name: string | null;
    set2Name: string | null;
    finalSet: 1 | 2 | null;
    finalSetSelectedAt: string | null;
}

export default function PaperSelectionPage() {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    
    const [selectedSession, setSelectedSession] = useState<string>('');
    const [selectedDepartment, setSelectedDepartment] = useState<string>('');
    
    const [papers, setPapers] = useState<PaperItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [updating, setUpdating] = useState<string | null>(null);

    // Initial data fetch
    useEffect(() => {
        const fetchFilters = async () => {
            try {
                const [sessionsRes, deptsRes] = await Promise.all([
                    fetch('/api/paper-sessions'),
                    fetch('/api/departments')
                ]);
                
                const sessionsData = await sessionsRes.json();
                const deptsData = await deptsRes.json();
                
                const fetchedSessions = sessionsData.sessions || [];
                setSessions(fetchedSessions);
                
                if (fetchedSessions.length > 0) {
                    const active = fetchedSessions.find((s: Session) => s.isActive);
                    setSelectedSession(active?._id || fetchedSessions[0]._id);
                }
                
                setDepartments(deptsData.departments || []);
            } catch (err) {
                console.error('Failed to fetch initial filters:', err);
            }
        };
        fetchFilters();
    }, []);

    // Fetch papers when filters change
    useEffect(() => {
        if (selectedSession && selectedDepartment) {
            fetchPapers();
        } else {
            setPapers([]); // clear if not fully selected
        }
    }, [selectedSession, selectedDepartment]);

    const fetchPapers = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/exam-coordinator/papers?sessionId=${selectedSession}&departmentId=${selectedDepartment}`);
            const data = await res.json();
            setPapers(data.data || []);
        } catch (error) {
            console.error('Failed to fetch papers:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectFinalSet = async (submissionId: string, setNumber: 1 | 2) => {
        setUpdating(submissionId);
        try {
            const res = await fetch(`/api/exam-coordinator/papers/${submissionId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ finalSet: setNumber })
            });
            if (res.ok) {
                // Instantly update UI optimistically
                setPapers(prev => prev.map(p => 
                    p.submissionId === submissionId 
                        ? { ...p, finalSet: setNumber, finalSetSelectedAt: new Date().toISOString() }
                        : p
                ));
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to select final set');
            }
        } catch (error) {
            console.error(error);
            alert('Something went wrong');
        } finally {
            setUpdating(null);
        }
    };

    const approvedCount = papers.filter(p => p.hasApprovedSubmission).length;
    const finalSelectedCount = papers.filter(p => p.finalSet !== null).length;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Final Paper Selection</h1>
            
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="py-3">
                        <CardTitle className="text-sm">Session</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Select value={selectedSession} onValueChange={setSelectedSession}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Session" />
                            </SelectTrigger>
                            <SelectContent>
                                {sessions.map(s => (
                                    <SelectItem key={s._id} value={s._id}>
                                        {s.title}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="py-3">
                        <CardTitle className="text-sm">Department</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Department" />
                            </SelectTrigger>
                            <SelectContent>
                                {departments.map(d => (
                                    <SelectItem key={d._id} value={d._id}>
                                        {d.name} ({d.shortName})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </CardContent>
                </Card>

                <Card className="bg-primary/5">
                    <CardHeader className="py-3">
                        <CardTitle className="text-sm">Department Progress</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm">
                            <span className="font-semibold text-primary">{approvedCount}</span> / {papers.length} Approved by HOD
                        </div>
                        <div className="text-sm mt-1">
                            <span className="font-semibold text-green-600">{finalSelectedCount}</span> / {approvedCount} Selected
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Table */}
            <div className="border rounded-lg bg-white overflow-hidden shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50/50">
                            <TableHead className="w-[120px]">Code</TableHead>
                            <TableHead>Subject</TableHead>
                            <TableHead>Faculty</TableHead>
                            <TableHead className="text-center">Set 1</TableHead>
                            <TableHead className="text-center">Set 2</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {!selectedDepartment || !selectedSession ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                                    Please select both Session and Department to view papers.
                                </TableCell>
                            </TableRow>
                        ) : loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                                    Loading submitted papers...
                                </TableCell>
                            </TableRow>
                        ) : papers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                                    No subjects found for this department.
                                </TableCell>
                            </TableRow>
                        ) : (
                            papers.map(p => (
                                <TableRow key={p.subjectId}>
                                    <TableCell className="font-medium text-xs">{p.subjectCode || '-'}</TableCell>
                                    <TableCell className="font-medium">{p.subjectname}</TableCell>
                                    
                                    {!p.hasApprovedSubmission ? (
                                        <TableCell colSpan={4} className="text-muted-foreground text-sm italic">
                                            <div className="flex items-center gap-2 text-amber-600">
                                                <AlertCircle className="h-4 w-4" />
                                                Pending HOD approval or not submitted
                                            </div>
                                        </TableCell>
                                    ) : (
                                        <>
                                            <TableCell className="text-sm">{p.facultyName}</TableCell>
                                            
                                            {/* SET 1 */}
                                            <TableCell>
                                                <div className="flex flex-col items-center gap-2">
                                                    <div className="flex items-center gap-1">
                                                        <a 
                                                            href={`/api/paper-submissions/${p.submissionId}/view/1`} 
                                                            target="_blank" 
                                                            title={p.set1Name || 'View PDF'}
                                                            className="text-blue-600 hover:text-blue-800 p-1 bg-blue-50 rounded"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </a>
                                                        <a 
                                                            href={`/api/paper-submissions/${p.submissionId}/view/1`} 
                                                            download 
                                                            className="text-gray-600 hover:text-gray-800 p-1 bg-gray-50 rounded"
                                                        >
                                                            <Download className="h-4 w-4" />
                                                        </a>
                                                    </div>
                                                    <Button 
                                                        variant={p.finalSet === 1 ? 'default' : 'outline'} 
                                                        size="sm"
                                                        className={`h-7 text-xs ${p.finalSet === 1 ? 'bg-green-600 hover:bg-green-700' : ''}`}
                                                        disabled={updating === p.submissionId}
                                                        onClick={() => handleSelectFinalSet(p.submissionId!, 1)}
                                                    >
                                                        {p.finalSet === 1 && <CheckCircle className="h-3 w-3 mr-1" />}
                                                        Select
                                                    </Button>
                                                </div>
                                            </TableCell>
                                            
                                            {/* SET 2 */}
                                            <TableCell>
                                                <div className="flex flex-col items-center gap-2">
                                                    <div className="flex items-center gap-1">
                                                        <a 
                                                            href={`/api/paper-submissions/${p.submissionId}/view/2`} 
                                                            target="_blank" 
                                                            title={p.set2Name || 'View PDF'}
                                                            className="text-blue-600 hover:text-blue-800 p-1 bg-blue-50 rounded"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </a>
                                                        <a 
                                                            href={`/api/paper-submissions/${p.submissionId}/view/2`} 
                                                            download 
                                                            className="text-gray-600 hover:text-gray-800 p-1 bg-gray-50 rounded"
                                                        >
                                                            <Download className="h-4 w-4" />
                                                        </a>
                                                    </div>
                                                    <Button 
                                                        variant={p.finalSet === 2 ? 'default' : 'outline'} 
                                                        size="sm"
                                                        className={`h-7 text-xs ${p.finalSet === 2 ? 'bg-green-600 hover:bg-green-700' : ''}`}
                                                        disabled={updating === p.submissionId}
                                                        onClick={() => handleSelectFinalSet(p.submissionId!, 2)}
                                                    >
                                                        {p.finalSet === 2 && <CheckCircle className="h-3 w-3 mr-1" />}
                                                        Select
                                                    </Button>
                                                </div>
                                            </TableCell>

                                            <TableCell>
                                                {p.finalSet ? (
                                                    <div className="text-xs">
                                                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                                            Set {p.finalSet} Selected
                                                        </Badge>
                                                        <div className="mt-1 text-muted-foreground opacity-70">
                                                            {new Date(p.finalSetSelectedAt!).toLocaleDateString()}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <Badge variant="secondary">Action Needed</Badge>
                                                )}
                                            </TableCell>
                                        </>
                                    )}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
            {/* End Table */}
        </div>
    );
}
