'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Upload, FileText, CheckCircle, XCircle, Clock, Eye } from 'lucide-react';

interface Session {
    _id: string;
    title: string;
    type: string;
    isActive: boolean;
}

interface Subject {
    _id: string;
    name: string;
    code?: string;
}

interface Submission {
    _id: string;
    subject: { _id: string; name: string; code?: string };
    session: { _id: string; title: string };
    status: 'pending' | 'approved' | 'rejected';
    rejectionReason?: string;
    rejectedSet?: '1' | '2' | 'both';
    yearAndDiv: string;
    set1Name: string;
    set2Name: string;
    createdAt: string;
    reviewedBy?: { name: string };
}

const statusConfig = {
    pending: { label: 'Pending Review', icon: Clock, className: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
    approved: { label: 'Approved', icon: CheckCircle, className: 'bg-green-50 text-green-700 border-green-200' },
    rejected: { label: 'Rejected', icon: XCircle, className: 'bg-red-50 text-red-700 border-red-200' },
};

export default function PaperSubmissionsPage() {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);

    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [selectedSession, setSelectedSession] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [yearAndDiv, setYearAndDiv] = useState('');
    const [set1File, setSet1File] = useState<File | null>(null);
    const [set2File, setSet2File] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadMsg, setUploadMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [reuploadSubmission, setReuploadSubmission] = useState<Submission | null>(null);

    const fetchData = async () => {
        setLoading(true);
        const [sessRes, subRes, submsRes] = await Promise.all([
            fetch('/api/paper-sessions'),
            fetch('/api/subjects'),
            fetch('/api/paper-submissions'),
        ]);
        const [sessData, subData, submsData] = await Promise.all([
            sessRes.json(), subRes.json(), submsRes.json(),
        ]);
        setSessions(sessData.sessions || []);
        setSubjects(subData.subjects || []);
        setSubmissions(submsData.submissions || []);
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, []);

    const openUpload = (resubmit?: Submission) => {
        setUploadMsg(null);
        setSet1File(null);
        setSet2File(null);
        if (resubmit) {
            setReuploadSubmission(resubmit);
            setSelectedSession((resubmit.session as unknown as { _id: string })._id || '');
            setSelectedSubject((resubmit.subject as unknown as { _id: string })._id || '');
            setYearAndDiv(resubmit.yearAndDiv || '');
        } else {
            setReuploadSubmission(null);
            setSelectedSession(sessions.find((s) => s.isActive)?._id || '');
            setSelectedSubject('');
            setYearAndDiv('');
        }
        setIsUploadOpen(true);
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        let err = '';
        const isSet1Req = !reuploadSubmission || !reuploadSubmission.rejectedSet || reuploadSubmission.rejectedSet === '1' || reuploadSubmission.rejectedSet === 'both';
        const isSet2Req = !reuploadSubmission || !reuploadSubmission.rejectedSet || reuploadSubmission.rejectedSet === '2' || reuploadSubmission.rejectedSet === 'both';

        if (!yearAndDiv.trim()) err = 'Please enter Year & Division (e.g. SY-A)';
        else if (isSet1Req && !set1File) err = 'Please select Set 1 PDF file';
        else if (isSet2Req && !set2File) err = 'Please select Set 2 PDF file';
        
        if (err) {
            setUploadMsg({ type: 'error', text: err });
            return;
        }
        setUploading(true);
        setUploadMsg(null);

        const formData = new FormData();
        formData.append('sessionId', selectedSession);
        formData.append('subjectId', selectedSubject);
        formData.append('yearAndDiv', yearAndDiv.trim());
        if (set1File) formData.append('set1', set1File);
        if (set2File) formData.append('set2', set2File);

        const res = await fetch('/api/paper-submissions', {
            method: 'POST',
            body: formData,
        });
        const data = await res.json();
        setUploading(false);

        if (res.ok) {
            setUploadMsg({ type: 'success', text: 'Papers submitted successfully!' });
            fetchData();
            setTimeout(() => setIsUploadOpen(false), 1500);
        } else {
            setUploadMsg({ type: 'error', text: data.error || 'Failed to submit papers' });
        }
    };

    const activeSessions = sessions.filter((s) => s.isActive);
    const pendingCount = submissions.filter((s) => s.status === 'pending').length;
    const approvedCount = submissions.filter((s) => s.status === 'approved').length;
    const rejectedCount = submissions.filter((s) => s.status === 'rejected').length;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Paper Submissions</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Upload your Class Test paper sets for HOD review
                    </p>
                </div>
                {activeSessions.length > 0 && (
                    <Button onClick={() => openUpload()} className="gap-2">
                        <Upload className="h-4 w-4" />
                        Submit Papers
                    </Button>
                )}
            </div>

            {/* Active submission banner */}
            {activeSessions.length > 0 ? (
                <Card className="border-green-200 bg-green-50">
                    <CardContent className="py-3 px-4 flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                        <div>
                            <p className="font-medium text-green-800">Submission window is open</p>
                            <p className="text-sm text-green-700">
                                {activeSessions.map((s) => s.title).join(', ')}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <Card className="border-yellow-200 bg-yellow-50">
                    <CardContent className="py-3 px-4 flex items-center gap-3">
                        <Clock className="h-5 w-5 text-yellow-600 shrink-0" />
                        <p className="text-yellow-800 font-medium">No active submission window. Check back later.</p>
                    </CardContent>
                </Card>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Pending', val: pendingCount, color: 'text-yellow-600' },
                    { label: 'Approved', val: approvedCount, color: 'text-green-600' },
                    { label: 'Rejected', val: rejectedCount, color: 'text-red-600' },
                ].map((s) => (
                    <Card key={s.label}>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm text-muted-foreground">{s.label}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className={`text-3xl font-bold ${s.color}`}>{s.val}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Submissions table */}
            {loading ? (
                <p className="text-muted-foreground">Loading...</p>
            ) : submissions.length === 0 ? (
                <Card>
                    <CardContent className="py-10 text-center text-muted-foreground">
                        <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
                        <p>You have not submitted any papers yet.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Session</TableHead>
                                <TableHead>Year/Div</TableHead>
                                <TableHead>Subject</TableHead>
                                <TableHead>Set 1</TableHead>
                                <TableHead>Set 2</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Submitted</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {submissions.map((sub) => {
                                const cfg = statusConfig[sub.status];
                                const StatusIcon = cfg.icon;
                                return (
                                    <TableRow key={sub._id}>
                                        <TableCell className="font-medium text-sm">
                                            {sub.session?.title}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="text-xs bg-gray-50">
                                                {sub.yearAndDiv}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-medium">{sub.subject?.name}</span>
                                            {sub.subject?.code && (
                                                <span className="text-muted-foreground text-xs ml-1">({sub.subject.code})</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <a
                                                    href={`/api/paper-submissions/${sub._id}/view/1`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1 text-blue-600 hover:underline text-sm"
                                                >
                                                    <Eye className="h-3 w-3" />
                                                    {sub.set1Name}
                                                </a>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <a
                                                href={`/api/paper-submissions/${sub._id}/view/2`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-1 text-blue-600 hover:underline text-sm"
                                            >
                                                <Eye className="h-3 w-3" />
                                                {sub.set2Name}
                                            </a>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={`gap-1 ${cfg.className}`}>
                                                <StatusIcon className="h-3 w-3" />
                                                {cfg.label}
                                            </Badge>
                                            {sub.status === 'rejected' && sub.rejectionReason && (
                                                <p className="text-xs text-red-600 mt-1 max-w-[200px]">
                                                    Reason: {sub.rejectionReason}
                                                </p>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {new Date(sub.createdAt).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell>
                                            {sub.status === 'rejected' && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="text-blue-600 border-blue-300 gap-1"
                                                    onClick={() => openUpload(sub)}
                                                >
                                                    <Upload className="h-3 w-3" />
                                                    Resubmit
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Upload Dialog */}
            <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {reuploadSubmission ? 'Resubmit Papers' : 'Submit Papers'}
                        </DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground mb-4">
                        Upload PDF sets for the selected subject. Each file must be under 10 MB.
                    </p>
                    <form onSubmit={handleUpload} className="space-y-4">
                        {/* Session */}
                        <div className="space-y-2">
                            <Label>Submission Session</Label>
                            <Select
                                value={selectedSession}
                                onValueChange={setSelectedSession}
                                disabled={!!reuploadSubmission}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select session" />
                                </SelectTrigger>
                                <SelectContent>
                                    {activeSessions.map((s) => (
                                        <SelectItem key={s._id} value={s._id}>
                                            {s.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Subject */}
                        <div className="space-y-2">
                            <Label>Subject</Label>
                            <Select
                                value={selectedSubject}
                                onValueChange={setSelectedSubject}
                                disabled={!!reuploadSubmission}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select subject" />
                                </SelectTrigger>
                                <SelectContent>
                                    {subjects.map((s) => (
                                        <SelectItem key={s._id} value={s._id}>
                                            {s.name}{s.code ? ` (${s.code})` : ''}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Year & Division */}
                        <div className="space-y-2">
                            <Label htmlFor="yearAndDiv">Year & Division</Label>
                            <input
                                id="yearAndDiv"
                                type="text"
                                placeholder="e.g. SY-A, TE-B"
                                disabled={!!reuploadSubmission}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                                value={yearAndDiv}
                                onChange={(e) => setYearAndDiv(e.target.value)}
                            />
                        </div>

                        {/* Set 1 */}
                        <div className="space-y-2">
                            <Label htmlFor="set1">Set 1 (PDF)</Label>
                            {reuploadSubmission && reuploadSubmission.rejectedSet === '2' ? (
                                <div className="border-2 rounded-lg p-4 flex items-center justify-center gap-2 bg-gray-50 border-gray-200 text-gray-500 cursor-not-allowed">
                                    <CheckCircle className="h-5 w-5 text-green-500" />
                                    <span className="text-sm font-medium">Set 1 is approved</span>
                                </div>
                            ) : (
                                <div className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${set1File ? 'border-green-400 bg-green-50' : 'border-muted-foreground/30 hover:border-primary/50'}`}>
                                    <input
                                        id="set1"
                                        type="file"
                                        accept=".pdf,application/pdf"
                                        className="hidden"
                                        onChange={(e) => setSet1File(e.target.files?.[0] || null)}
                                    />
                                    <label htmlFor="set1" className="cursor-pointer">
                                        {set1File ? (
                                            <div className="flex items-center justify-center gap-2 text-green-700">
                                                <FileText className="h-5 w-5" />
                                                <span className="text-sm font-medium">{set1File.name}</span>
                                            </div>
                                        ) : (
                                            <div className="text-muted-foreground">
                                                <Upload className="h-8 w-8 mx-auto mb-1 opacity-50" />
                                                <p className="text-sm">Click to upload Set 1 PDF</p>
                                            </div>
                                        )}
                                    </label>
                                </div>
                            )}
                        </div>

                        {/* Set 2 */}
                        <div className="space-y-2">
                            <Label htmlFor="set2">Set 2 (PDF)</Label>
                            {reuploadSubmission && reuploadSubmission.rejectedSet === '1' ? (
                                <div className="border-2 rounded-lg p-4 flex items-center justify-center gap-2 bg-gray-50 border-gray-200 text-gray-500 cursor-not-allowed">
                                    <CheckCircle className="h-5 w-5 text-green-500" />
                                    <span className="text-sm font-medium">Set 2 is approved</span>
                                </div>
                            ) : (
                                <div className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${set2File ? 'border-green-400 bg-green-50' : 'border-muted-foreground/30 hover:border-primary/50'}`}>
                                    <input
                                        id="set2"
                                        type="file"
                                        accept=".pdf,application/pdf"
                                        className="hidden"
                                        onChange={(e) => setSet2File(e.target.files?.[0] || null)}
                                    />
                                    <label htmlFor="set2" className="cursor-pointer">
                                        {set2File ? (
                                            <div className="flex items-center justify-center gap-2 text-green-700">
                                                <FileText className="h-5 w-5" />
                                                <span className="text-sm font-medium">{set2File.name}</span>
                                            </div>
                                        ) : (
                                            <div className="text-muted-foreground">
                                                <Upload className="h-8 w-8 mx-auto mb-1 opacity-50" />
                                                <p className="text-sm">Click to upload Set 2 PDF</p>
                                            </div>
                                        )}
                                    </label>
                                </div>
                            )}
                        </div>

                        {uploadMsg && (
                            <p className={`text-sm font-medium rounded-md px-3 py-2 ${uploadMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                {uploadMsg.text}
                            </p>
                        )}

                        <Button type="submit" className="w-full gap-2" disabled={uploading}>
                            <Upload className="h-4 w-4" />
                            {uploading ? 'Uploading...' : 'Submit Papers'}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
