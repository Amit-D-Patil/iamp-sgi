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

interface BatchItem {
    _id: string;
    name: string;
    isActive: boolean;
    class: string | { _id: string };
}

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
    const [batches, setBatches] = useState<Record<string, BatchItem[]>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const [hasDivision, setHasDivision] = useState(false);
    const [formData, setFormData] = useState({ year: '', division: '' });

    // Batch management state
    const [batchDialogOpen, setBatchDialogOpen] = useState(false);
    const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);
    const [classBatches, setClassBatches] = useState<BatchItem[]>([]);
    const [batchName, setBatchName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [classesRes, batchesRes] = await Promise.all([
                fetch('/api/classes'),
                fetch('/api/batches'),
            ]);
            const classesData = await classesRes.json();
            const batchesData = await batchesRes.json();

            setClasses(classesData.classes || []);

            // Group batches by class
            const batchesByClass: Record<string, BatchItem[]> = {};
            (batchesData.batches || []).forEach((b: BatchItem) => {
                const classId = typeof b.class === 'string' ? b.class : b.class?._id;
                if (classId) {
                    if (!batchesByClass[classId]) {
                        batchesByClass[classId] = [];
                    }
                    batchesByClass[classId].push(b);
                }
            });
            setBatches(batchesByClass);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchBatchesForClass = async (classId: string) => {
        try {
            const res = await fetch(`/api/batches?class=${classId}`);
            const data = await res.json();
            setClassBatches(data.batches || []);
        } catch (error) {
            console.error('Error fetching batches:', error);
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
                fetchData();
            } else {
                const data = await res.json();
                alert(data.error || 'Error creating class');
            }
        } catch (error) {
            console.error('Error creating class:', error);
        }
    };

    const openBatchDialog = (cls: ClassItem) => {
        setSelectedClass(cls);
        setBatchName('');
        setBatchDialogOpen(true);
        fetchBatchesForClass(cls._id);
    };

    const handleAddBatch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedClass || !batchName.trim()) return;

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/batches', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: batchName.trim(),
                    classId: selectedClass._id,
                }),
            });
            if (res.ok) {
                setBatchName('');
                fetchBatchesForClass(selectedClass._id);
                fetchData(); // Refresh to update batch counts
            } else {
                const data = await res.json();
                alert(data.error || 'Error creating batch');
            }
        } catch (error) {
            console.error('Error creating batch:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const deleteBatch = async (batchId: string) => {
        if (!confirm('Are you sure you want to delete this batch?')) return;
        try {
            await fetch(`/api/batches/${batchId}`, { method: 'DELETE' });
            if (selectedClass) {
                fetchBatchesForClass(selectedClass._id);
            }
            fetchData(); // Refresh to update batch counts
        } catch (error) {
            console.error('Error deleting batch:', error);
        }
    };

    const toggleStatus = async (id: string, currentStatus: boolean) => {
        try {
            await fetch(`/api/classes/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !currentStatus }),
            });
            fetchData();
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const deleteClass = async (id: string) => {
        if (!confirm('Are you sure you want to delete this class?')) return;
        try {
            await fetch(`/api/classes/${id}`, { method: 'DELETE' });
            fetchData();
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
                        Manage years, divisions, and batches for your department
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
                            <TableHead>Batches</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Active</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {classes.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center text-muted-foreground">
                                    No classes found. Add your first class (year/division).
                                </TableCell>
                            </TableRow>
                        ) : (
                            classes.map((cls) => {
                                const classBatchList = batches[cls._id] || [];
                                return (
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
                                            {classBatchList.length > 0 ? (
                                                <div className="flex flex-wrap gap-1">
                                                    {classBatchList.map((batch) => (
                                                        <Badge key={batch._id} variant="outline" className="text-xs">
                                                            {batch.name}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground text-sm">No batches</span>
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
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => openBatchDialog(cls)}
                                                >
                                                    Batches
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => deleteClass(cls._id)}
                                                >
                                                    Delete
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Batches Dialog */}
            <Dialog open={batchDialogOpen} onOpenChange={setBatchDialogOpen}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            Manage Batches - {selectedClass?.displayName}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-6">
                        {/* Add Batch Form */}
                        <form onSubmit={handleAddBatch} className="space-y-4 p-4 border rounded-lg bg-muted/50">
                            <h3 className="font-medium">Add New Batch</h3>
                            <div className="space-y-2">
                                <Label htmlFor="batchName">Batch Name</Label>
                                <Input
                                    id="batchName"
                                    placeholder="e.g., Batch 1, Morning, A1"
                                    value={batchName}
                                    onChange={(e) => setBatchName(e.target.value)}
                                    required
                                />
                                <p className="text-xs text-muted-foreground">
                                    Batches are sub-groups within a class (e.g., for lab sessions)
                                </p>
                            </div>
                            <Button
                                type="submit"
                                disabled={!batchName.trim() || isSubmitting}
                            >
                                {isSubmitting ? 'Adding...' : 'Add Batch'}
                            </Button>
                        </form>

                        {/* Current Batches */}
                        <div>
                            <h3 className="font-medium mb-3">Current Batches</h3>
                            {classBatches.length === 0 ? (
                                <p className="text-muted-foreground text-center py-4">
                                    No batches found. Add a batch above.
                                </p>
                            ) : (
                                <div className="border rounded-lg">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Batch Name</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Action</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {classBatches.map((batch) => (
                                                <TableRow key={batch._id}>
                                                    <TableCell className="font-medium">{batch.name}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={batch.isActive ? 'default' : 'secondary'}>
                                                            {batch.isActive ? 'Active' : 'Inactive'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-destructive hover:text-destructive"
                                                            onClick={() => deleteBatch(batch._id)}
                                                        >
                                                            Remove
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {classes.length > 0 && (
                <div className="mt-4 p-4 bg-muted rounded-lg">
                    <h3 className="font-medium mb-2">Quick Tips:</h3>
                    <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• If your department has only one section per year, just add FY, SY, TY etc.</li>
                        <li>• For multiple sections, enable division and add FY-A, FY-B, etc. separately</li>
                        <li>• Click &quot;Batches&quot; to add sub-groups within a class (e.g., lab batches)</li>
                    </ul>
                </div>
            )}
        </div>
    );
}
