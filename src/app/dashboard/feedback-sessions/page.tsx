'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Department {
    _id: string;
    name: string;
    shortName: string;
}

interface ClassItem {
    _id: string;
    displayName: string;
}

interface FeedbackSession {
    _id: string;
    class: { _id: string; displayName: string };
    studentCount: number;
    uniqueCode: string;
    isActive: boolean;
    responseCount: number;
    createdAt: string;
    closedAt?: string;
}

export default function FeedbackSessionsPage() {
    const [sessions, setSessions] = useState<FeedbackSession[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [classes, setClasses] = useState<ClassItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const [formData, setFormData] = useState({
        departmentId: '',
        classId: '',
        studentCount: '',
    });

    useEffect(() => {
        fetchData();
    }, []);

    // Fetch classes when department changes
    useEffect(() => {
        if (formData.departmentId) {
            fetchClassesForDepartment(formData.departmentId);
        } else {
            setClasses([]);
        }
    }, [formData.departmentId]);

    const fetchData = async () => {
        try {
            const [sessionsRes, departmentsRes] = await Promise.all([
                fetch('/api/feedback-sessions'),
                fetch('/api/departments'),
            ]);
            const sessionsData = await sessionsRes.json();
            const departmentsData = await departmentsRes.json();

            setSessions(sessionsData.sessions || []);
            setDepartments(departmentsData.departments || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchClassesForDepartment = async (departmentId: string) => {
        try {
            const res = await fetch(`/api/classes?department=${departmentId}`);
            const data = await res.json();
            setClasses(data.classes?.filter((c: ClassItem & { isActive: boolean }) => c.isActive) || []);
        } catch (error) {
            console.error('Error fetching classes:', error);
            setClasses([]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/feedback-sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    classId: formData.classId,
                    studentCount: parseInt(formData.studentCount),
                }),
            });
            if (res.ok) {
                setIsOpen(false);
                setFormData({ departmentId: '', classId: '', studentCount: '' });
                fetchData();
            } else {
                const data = await res.json();
                alert(data.error || 'Error creating feedback session');
            }
        } catch (error) {
            console.error('Error creating session:', error);
        }
    };

    const toggleStatus = async (id: string, currentStatus: boolean) => {
        try {
            await fetch(`/api/feedback-sessions/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !currentStatus }),
            });
            fetchData();
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const deleteSession = async (id: string) => {
        if (!confirm('Are you sure you want to delete this feedback session?')) return;
        try {
            await fetch(`/api/feedback-sessions/${id}`, { method: 'DELETE' });
            fetchData();
        } catch (error) {
            console.error('Error deleting session:', error);
        }
    };

    const copyLink = (code: string) => {
        const url = `${window.location.origin}/feedback/${code}`;
        navigator.clipboard.writeText(url);
        alert('Link copied to clipboard!');
    };

    if (isLoading) {
        return <div>Loading...</div>;
    }

    return (
        <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold">Feedback Sessions</h1>
                    <p className="text-muted-foreground text-sm">
                        Create and manage student feedback collection
                    </p>
                </div>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button>Start New Feedback</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Start Feedback Collection</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="department">Select Department</Label>
                                <Select
                                    value={formData.departmentId}
                                    onValueChange={(value) =>
                                        setFormData({ ...formData, departmentId: value, classId: '' })
                                    }
                                >
                                    <SelectTrigger>
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
                            <div className="space-y-2">
                                <Label htmlFor="class">Select Class</Label>
                                <Select
                                    value={formData.classId}
                                    onValueChange={(value) =>
                                        setFormData({ ...formData, classId: value })
                                    }
                                    disabled={!formData.departmentId}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={formData.departmentId ? "Select class" : "Select department first"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {classes.map((cls) => (
                                            <SelectItem key={cls._id} value={cls._id}>
                                                {cls.displayName}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="studentCount">Number of Students</Label>
                                <Input
                                    id="studentCount"
                                    type="number"
                                    min="1"
                                    value={formData.studentCount}
                                    onChange={(e) =>
                                        setFormData({ ...formData, studentCount: e.target.value })
                                    }
                                    placeholder="e.g., 60"
                                    required
                                />
                                <p className="text-xs text-muted-foreground">
                                    Maximum number of feedback responses allowed
                                </p>
                            </div>
                            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <p className="text-xs text-yellow-800">
                                    <strong>Note:</strong> Make sure batches are created for the selected class before starting feedback. Without batches, students won&apos;t be able to submit feedback.
                                </p>
                            </div>
                            <Button
                                type="submit"
                                className="w-full"
                                disabled={!formData.classId || !formData.studentCount}
                            >
                                Create Feedback Session
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {sessions.length === 0 ? (
                <Card>
                    <CardHeader>
                        <CardTitle>No Feedback Sessions</CardTitle>
                        <CardDescription>
                            Create your first feedback session to start collecting student feedback.
                        </CardDescription>
                    </CardHeader>
                </Card>
            ) : (
                <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Class</TableHead>
                                <TableHead>Students</TableHead>
                                <TableHead>Responses</TableHead>
                                <TableHead>Link</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Active</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sessions.map((session) => (
                                <TableRow key={session._id}>
                                    <TableCell className="font-medium">
                                        {session.class.displayName}
                                    </TableCell>
                                    <TableCell>{session.studentCount}</TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={session.responseCount >= session.studentCount ? 'default' : 'secondary'}
                                        >
                                            {session.responseCount} / {session.studentCount}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => copyLink(session.uniqueCode)}
                                        >
                                            Copy Link
                                        </Button>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={session.isActive ? 'default' : 'secondary'}>
                                            {session.isActive ? 'Open' : 'Closed'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Switch
                                            checked={session.isActive}
                                            onCheckedChange={() => toggleStatus(session._id, session.isActive)}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-destructive hover:text-destructive"
                                            onClick={() => deleteSession(session._id)}
                                        >
                                            Delete
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            {sessions.length > 0 && (
                <div className="mt-4 p-4 bg-muted rounded-lg">
                    <h3 className="font-medium mb-2">How it works:</h3>
                    <ul className="text-sm text-muted-foreground space-y-1">
                        <li>1. Create a feedback session for a class</li>
                        <li>2. Copy and share the unique link with students</li>
                        <li>3. Students select their batch and rate all teachers</li>
                        <li>4. Monitor responses and close when complete</li>
                    </ul>
                </div>
            )}
        </div>
    );
}
