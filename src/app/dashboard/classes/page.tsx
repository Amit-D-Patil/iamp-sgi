'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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
import { Checkbox } from '@/components/ui/checkbox';

interface ClassItem {
    _id: string;
    name: string;
    year: string;
    division?: string;
    displayName: string;
    isActive: boolean;
    createdAt: string;
}

const yearOptions = ['FY', 'SY', 'TY', 'BTech'];

export default function ClassesPage() {
    const [classes, setClasses] = useState<ClassItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const [hasDivision, setHasDivision] = useState(false);
    const [formData, setFormData] = useState({
        year: '',
        division: '',
    });

    useEffect(() => {
        fetchClasses();
    }, []);

    const fetchClasses = async () => {
        try {
            const res = await fetch('/api/classes');
            const data = await res.json();
            setClasses(data.classes || []);
        } catch (error) {
            console.error('Error fetching classes:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/classes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    year: formData.year,
                    division: hasDivision ? formData.division : undefined,
                }),
            });
            if (res.ok) {
                setIsOpen(false);
                setFormData({ year: '', division: '' });
                setHasDivision(false);
                fetchClasses();
            } else {
                const data = await res.json();
                alert(data.error || 'Error creating class');
            }
        } catch (error) {
            console.error('Error creating class:', error);
        }
    };

    const toggleStatus = async (id: string, currentStatus: boolean) => {
        try {
            await fetch(`/api/classes/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !currentStatus }),
            });
            fetchClasses();
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const deleteClass = async (id: string) => {
        if (!confirm('Are you sure you want to delete this class?')) return;
        try {
            await fetch(`/api/classes/${id}`, { method: 'DELETE' });
            fetchClasses();
        } catch (error) {
            console.error('Error deleting class:', error);
        }
    };

    if (isLoading) {
        return <div>Loading...</div>;
    }

    return (
        <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold">Classes</h1>
                    <p className="text-muted-foreground text-sm">
                        Manage years and divisions for your department
                    </p>
                </div>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button>Add Class</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add New Class</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="year">Year</Label>
                                <Select
                                    value={formData.year}
                                    onValueChange={(value) =>
                                        setFormData({ ...formData, year: value })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select year" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {yearOptions.map((year) => (
                                            <SelectItem key={year} value={year}>
                                                {year}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="hasDivision"
                                    checked={hasDivision}
                                    onCheckedChange={(checked) => setHasDivision(checked as boolean)}
                                />
                                <Label htmlFor="hasDivision" className="text-sm font-normal cursor-pointer">
                                    This year has multiple divisions (e.g., A, B, C)
                                </Label>
                            </div>

                            {hasDivision && (
                                <div className="space-y-2">
                                    <Label htmlFor="division">Division</Label>
                                    <Input
                                        id="division"
                                        placeholder="e.g., A, B, C"
                                        value={formData.division}
                                        onChange={(e) =>
                                            setFormData({ ...formData, division: e.target.value.toUpperCase() })
                                        }
                                        maxLength={5}
                                        required={hasDivision}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Enter the division name (e.g., A, B). You can add more divisions later.
                                    </p>
                                </div>
                            )}

                            <Button type="submit" className="w-full" disabled={!formData.year}>
                                Create Class
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Class</TableHead>
                            <TableHead>Year</TableHead>
                            <TableHead>Division</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Active</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {classes.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center text-muted-foreground">
                                    No classes found. Add your first class (year/division).
                                </TableCell>
                            </TableRow>
                        ) : (
                            classes.map((cls) => (
                                <TableRow key={cls._id}>
                                    <TableCell className="font-medium">{cls.displayName}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{cls.year}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        {cls.division ? (
                                            <Badge variant="secondary">{cls.division}</Badge>
                                        ) : (
                                            <span className="text-muted-foreground">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={cls.isActive ? 'default' : 'secondary'}>
                                            {cls.isActive ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Switch
                                            checked={cls.isActive}
                                            onCheckedChange={() => toggleStatus(cls._id, cls.isActive)}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-destructive hover:text-destructive"
                                            onClick={() => deleteClass(cls._id)}
                                        >
                                            Delete
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {classes.length > 0 && (
                <div className="mt-4 p-4 bg-muted rounded-lg">
                    <h3 className="font-medium mb-2">Quick Tips:</h3>
                    <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• If your department has only one section per year, just add FY, SY, TY etc.</li>
                        <li>• For multiple sections, enable division and add FY-A, FY-B, etc. separately</li>
                        <li>• You can assign teachers to specific classes when creating/editing teachers</li>
                    </ul>
                </div>
            )}
        </div>
    );
}
