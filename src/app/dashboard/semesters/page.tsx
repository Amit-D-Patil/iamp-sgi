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

interface Semester {
    _id: string;
    name: string;
    academicYear: string;
    type: 'odd' | 'even';
    startDate: string;
    endDate: string;
    isActive: boolean;
    createdAt: string;
}

export default function SemestersPage() {
    const [semesters, setSemesters] = useState<Semester[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const [formData, setFormData] = useState({
        academicYear: '',
        type: 'odd' as 'odd' | 'even',
        startDate: '',
        endDate: '',
    });

    useEffect(() => {
        fetchSemesters();
    }, []);

    const fetchSemesters = async () => {
        try {
            const res = await fetch('/api/semesters');
            const data = await res.json();
            setSemesters(data.semesters || []);
        } catch (error) {
            console.error('Error fetching semesters:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/semesters', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            if (res.ok) {
                setIsOpen(false);
                setFormData({
                    academicYear: '',
                    type: 'odd',
                    startDate: '',
                    endDate: '',
                });
                fetchSemesters();
            } else {
                const data = await res.json();
                alert(data.error || 'Error creating semester');
            }
        } catch (error) {
            console.error('Error creating semester:', error);
        }
    };

    const toggleStatus = async (id: string, currentStatus: boolean) => {
        try {
            await fetch(`/api/semesters/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !currentStatus }),
            });
            fetchSemesters();
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-IN');
    };

    // Generate academic year options (current year and next 2 years)
    const currentYear = new Date().getFullYear();
    const academicYearOptions = Array.from({ length: 3 }, (_, i) => {
        const year = currentYear + i;
        return `${year}-${(year + 1).toString().slice(-2)}`;
    });

    if (isLoading) {
        return <div>Loading...</div>;
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">Semesters</h1>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button>Add Semester</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add New Semester</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="academicYear">Academic Year</Label>
                                <Select
                                    value={formData.academicYear}
                                    onValueChange={(value) =>
                                        setFormData({ ...formData, academicYear: value })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select academic year" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {academicYearOptions.map((year) => (
                                            <SelectItem key={year} value={year}>
                                                {year}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="type">Semester Type</Label>
                                <Select
                                    value={formData.type}
                                    onValueChange={(value: 'odd' | 'even') =>
                                        setFormData({ ...formData, type: value })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="odd">Odd Semester</SelectItem>
                                        <SelectItem value="even">Even Semester</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="startDate">Start Date</Label>
                                <Input
                                    id="startDate"
                                    type="date"
                                    value={formData.startDate}
                                    onChange={(e) =>
                                        setFormData({ ...formData, startDate: e.target.value })
                                    }
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="endDate">End Date</Label>
                                <Input
                                    id="endDate"
                                    type="date"
                                    value={formData.endDate}
                                    onChange={(e) =>
                                        setFormData({ ...formData, endDate: e.target.value })
                                    }
                                    required
                                />
                            </div>
                            <Button type="submit" className="w-full">
                                Create Semester
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Semester</TableHead>
                            <TableHead>Academic Year</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Start Date</TableHead>
                            <TableHead>End Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Active</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {semesters.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center text-muted-foreground">
                                    No semesters found. Create your first semester.
                                </TableCell>
                            </TableRow>
                        ) : (
                            semesters.map((sem) => (
                                <TableRow key={sem._id}>
                                    <TableCell className="font-medium">{sem.name}</TableCell>
                                    <TableCell>{sem.academicYear}</TableCell>
                                    <TableCell>
                                        <Badge variant={sem.type === 'odd' ? 'default' : 'secondary'}>
                                            {sem.type === 'odd' ? 'Odd' : 'Even'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{formatDate(sem.startDate)}</TableCell>
                                    <TableCell>{formatDate(sem.endDate)}</TableCell>
                                    <TableCell>
                                        <Badge variant={sem.isActive ? 'default' : 'secondary'}>
                                            {sem.isActive ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Switch
                                            checked={sem.isActive}
                                            onCheckedChange={() => toggleStatus(sem._id, sem.isActive)}
                                        />
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
