'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

interface PaperSession {
    _id: string;
    title: string;
    type: string;
    isActive: boolean;
    createdBy: { name: string };
    createdAt: string;
}

export default function PaperSessionsPage() {
    const [sessions, setSessions] = useState<PaperSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const fetchSessions = async () => {
        setLoading(true);
        const res = await fetch('/api/paper-sessions');
        const data = await res.json();
        setSessions(data.sessions || []);
        setLoading(false);
    };

    useEffect(() => { fetchSessions(); }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setMsg(null);
        const res = await fetch('/api/paper-sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, type: 'class_test' }),
        });
        const data = await res.json();
        if (res.ok) {
            setMsg({ type: 'success', text: 'Session created successfully' });
            setTitle('');
            setIsCreateOpen(false);
            fetchSessions();
        } else {
            setMsg({ type: 'error', text: data.error || 'Failed to create session' });
        }
    };

    const toggleActive = async (session: PaperSession) => {
        await fetch(`/api/paper-sessions/${session._id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isActive: !session.isActive }),
        });
        fetchSessions();
    };

    const deleteSession = async (id: string) => {
        if (!confirm('Delete this session? This cannot be undone.')) return;
        await fetch(`/api/paper-sessions/${id}`, { method: 'DELETE' });
        fetchSessions();
    };

    const activeCount = sessions.filter((s) => s.isActive).length;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Paper Submission Sessions</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Manage Class Test paper submission windows for faculty
                    </p>
                </div>
                <Button onClick={() => { setIsCreateOpen(true); setMsg(null); }}>
                    + New Session
                </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-muted-foreground">Total Sessions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">{sessions.length}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-muted-foreground">Active Now</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold text-green-600">{activeCount}</p>
                    </CardContent>
                </Card>
            </div>

            {msg && (
                <p className={`text-sm font-medium rounded-md px-4 py-2 ${msg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {msg.text}
                </p>
            )}

            {loading ? (
                <p className="text-muted-foreground">Loading...</p>
            ) : sessions.length === 0 ? (
                <Card>
                    <CardContent className="py-10 text-center text-muted-foreground">
                        No sessions yet. Create one to allow faculty to submit papers.
                    </CardContent>
                </Card>
            ) : (
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Title</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Created By</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sessions.map((s) => (
                                <TableRow key={s._id}>
                                    <TableCell className="font-medium">{s.title}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{s.type === 'class_test' ? 'Class Test' : s.type}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        {s.isActive ? (
                                            <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>
                                        ) : (
                                            <Badge variant="secondary">Closed</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">{s.createdBy?.name}</TableCell>
                                    <TableCell className="text-muted-foreground text-sm">
                                        {new Date(s.createdAt).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => toggleActive(s)}
                                                className={s.isActive ? 'text-orange-600 border-orange-300' : 'text-green-600 border-green-300'}
                                            >
                                                {s.isActive ? 'Close' : 'Reopen'}
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                onClick={() => deleteSession(s._id)}
                                            >
                                                Delete
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Create dialog */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create Submission Session</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        Once created and active, faculty will be able to upload Class Test paper sets.
                    </p>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="session-title">Session Title</Label>
                            <Input
                                id="session-title"
                                placeholder='e.g. "Class Test 1 – March 2026"'
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                            />
                        </div>
                        {msg && (
                            <p className={`text-sm ${msg.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>
                                {msg.text}
                            </p>
                        )}
                        <Button type="submit" className="w-full">Create Session</Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
