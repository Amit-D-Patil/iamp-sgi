'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Eye, CheckCircle, XCircle, Clock, FileText } from 'lucide-react';

interface Submission {
    _id: string;
    faculty: { name: string; phone: string };
    subject: { name: string; code?: string };
    session: { title: string };
    department: { name: string; shortName: string };
    status: 'pending' | 'approved' | 'rejected';
    rejectionReason?: string;
    reviewedBy?: { name: string };
    reviewedAt?: string;
    set1Name: string;
    set2Name: string;
    createdAt: string;
}

const statusConfig = {
    pending: { label: 'Pending', icon: Clock, className: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
    approved: { label: 'Approved', icon: CheckCircle, className: 'bg-green-50 text-green-700 border-green-200' },
    rejected: { label: 'Rejected', icon: XCircle, className: 'bg-red-50 text-red-700 border-red-200' },
};

export default function PaperReviewPage() {
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');

    const [reviewing, setReviewing] = useState<Submission | null>(null);
    const [action, setAction] = useState<'approve' | 'reject' | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const fetchSubmissions = async () => {
        setLoading(true);
        const res = await fetch('/api/paper-submissions');
        const data = await res.json();
        setSubmissions(data.submissions || []);
        setLoading(false);
    };

    useEffect(() => { fetchSubmissions(); }, []);

    const openReview = (sub: Submission, act: 'approve' | 'reject') => {
        setReviewing(sub);
        setAction(act);
        setRejectionReason('');
        setMsg(null);
    };

    const handleReview = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reviewing || !action) return;
        setSubmitting(true);
        setMsg(null);

        const res = await fetch(`/api/paper-submissions/${reviewing._id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, rejectionReason }),
        });
        const data = await res.json();
        setSubmitting(false);

        if (res.ok) {
            setMsg({ type: 'success', text: `Submission ${action === 'approve' ? 'approved' : 'rejected'} successfully` });
            fetchSubmissions();
            setTimeout(() => setReviewing(null), 1200);
        } else {
            setMsg({ type: 'error', text: data.error || 'Failed to update submission' });
        }
    };

    const filtered = statusFilter === 'all'
        ? submissions
        : submissions.filter((s) => s.status === statusFilter);

    const pending = submissions.filter((s) => s.status === 'pending').length;
    const approved = submissions.filter((s) => s.status === 'approved').length;
    const rejected = submissions.filter((s) => s.status === 'rejected').length;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Paper Review</h1>
                <p className="text-muted-foreground text-sm mt-1">
                    Review and approve or reject faculty paper submissions for your department
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Pending Review', val: pending, color: 'text-yellow-600' },
                    { label: 'Approved', val: approved, color: 'text-green-600' },
                    { label: 'Rejected', val: rejected, color: 'text-red-600' },
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

            {/* Filter */}
            <div className="flex items-center gap-3">
                <Label>Filter:</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-44">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Submissions</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {loading ? (
                <p className="text-muted-foreground">Loading...</p>
            ) : filtered.length === 0 ? (
                <Card>
                    <CardContent className="py-10 text-center text-muted-foreground">
                        <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
                        <p>No submissions to review.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Faculty</TableHead>
                                <TableHead>Subject</TableHead>
                                <TableHead>Session</TableHead>
                                <TableHead>Papers</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Submitted</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.map((sub) => {
                                const cfg = statusConfig[sub.status];
                                const StatusIcon = cfg.icon;
                                return (
                                    <TableRow key={sub._id}>
                                        <TableCell>
                                            <p className="font-medium">{sub.faculty?.name}</p>
                                            <p className="text-xs text-muted-foreground">{sub.faculty?.phone}</p>
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-medium">{sub.subject?.name}</span>
                                            {sub.subject?.code && (
                                                <span className="text-muted-foreground text-xs ml-1">({sub.subject.code})</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-sm">{sub.session?.title}</TableCell>
                                        <TableCell>
                                            <div className="space-y-1">
                                                <a
                                                    href={`/api/paper-submissions/${sub._id}/view/1`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1 text-blue-600 hover:underline text-xs"
                                                >
                                                    <Eye className="h-3 w-3" />
                                                    Set 1: {sub.set1Name}
                                                </a>
                                                <a
                                                    href={`/api/paper-submissions/${sub._id}/view/2`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1 text-blue-600 hover:underline text-xs"
                                                >
                                                    <Eye className="h-3 w-3" />
                                                    Set 2: {sub.set2Name}
                                                </a>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={`gap-1 ${cfg.className}`}>
                                                <StatusIcon className="h-3 w-3" />
                                                {cfg.label}
                                            </Badge>
                                            {sub.status === 'rejected' && sub.rejectionReason && (
                                                <p className="text-xs text-muted-foreground mt-1 max-w-[180px]">
                                                    {sub.rejectionReason}
                                                </p>
                                            )}
                                            {sub.reviewedBy && (
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    by {sub.reviewedBy.name}
                                                </p>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {new Date(sub.createdAt).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell>
                                            {sub.status === 'pending' && (
                                                <div className="flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        className="bg-green-600 hover:bg-green-700 gap-1"
                                                        onClick={() => openReview(sub, 'approve')}
                                                    >
                                                        <CheckCircle className="h-3 w-3" />
                                                        Approve
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        className="gap-1"
                                                        onClick={() => openReview(sub, 'reject')}
                                                    >
                                                        <XCircle className="h-3 w-3" />
                                                        Reject
                                                    </Button>
                                                </div>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Review Dialog */}
            <Dialog open={!!reviewing} onOpenChange={(open) => { if (!open) setReviewing(null); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {action === 'approve' ? '✓ Approve Submission' : '✗ Reject Submission'}
                        </DialogTitle>
                    </DialogHeader>
                    {reviewing && (
                        <div className="space-y-4">
                            <div className="rounded-md bg-muted p-3 space-y-1 text-sm">
                                <p><span className="font-medium">Faculty:</span> {reviewing.faculty?.name}</p>
                                <p><span className="font-medium">Subject:</span> {reviewing.subject?.name}</p>
                                <p><span className="font-medium">Session:</span> {reviewing.session?.title}</p>
                            </div>

                            {/* Quick view links */}
                            <div className="flex gap-3">
                                <a
                                    href={`/api/paper-submissions/${reviewing._id}/view/1`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-blue-600 hover:underline text-sm"
                                >
                                    <Eye className="h-4 w-4" /> View Set 1
                                </a>
                                <a
                                    href={`/api/paper-submissions/${reviewing._id}/view/2`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-blue-600 hover:underline text-sm"
                                >
                                    <Eye className="h-4 w-4" /> View Set 2
                                </a>
                            </div>

                            <form onSubmit={handleReview} className="space-y-4">
                                {action === 'reject' && (
                                    <div className="space-y-2">
                                        <Label htmlFor="reason">Reason for Rejection *</Label>
                                        <Textarea
                                            id="reason"
                                            placeholder="Explain what needs to be corrected..."
                                            value={rejectionReason}
                                            onChange={(e) => setRejectionReason(e.target.value)}
                                            required
                                            rows={3}
                                        />
                                    </div>
                                )}

                                {action === 'approve' && (
                                    <p className="text-sm text-muted-foreground">
                                        The faculty member will be notified that their submission has been approved.
                                    </p>
                                )}

                                {msg && (
                                    <p className={`text-sm rounded-md px-3 py-2 ${msg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                        {msg.text}
                                    </p>
                                )}

                                <div className="flex gap-3">
                                    <Button
                                        type="submit"
                                        disabled={submitting}
                                        className={action === 'approve' ? 'bg-green-600 hover:bg-green-700 flex-1' : 'flex-1'}
                                        variant={action === 'reject' ? 'destructive' : 'default'}
                                    >
                                        {submitting ? 'Processing...' : action === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setReviewing(null)}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </form>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
