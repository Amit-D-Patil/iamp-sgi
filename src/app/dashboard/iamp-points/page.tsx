'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';

interface ApplicableTypes {
    theory: boolean;
    practical: boolean;
    sla: boolean;
}

interface IAMPPoint {
    _id: string;
    name: string;
    description?: string;
    applicableTypes?: ApplicableTypes;
    isActive: boolean;
    createdAt: string;
}

export default function IAMPPointsPage() {
    const [points, setPoints] = useState<IAMPPoint[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        applicableTypes: {
            theory: true,
            practical: true,
            sla: true,
        },
    });

    useEffect(() => {
        fetchPoints();
    }, []);

    const fetchPoints = async () => {
        try {
            const res = await fetch('/api/iamp-points');
            const data = await res.json();
            setPoints(data.points || []);
        } catch (error) {
            console.error('Error fetching IAMP points:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate at least one type is selected
        if (!formData.applicableTypes.theory && !formData.applicableTypes.practical && !formData.applicableTypes.sla) {
            alert('Please select at least one applicable type');
            return;
        }

        try {
            const res = await fetch('/api/iamp-points', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            if (res.ok) {
                setIsOpen(false);
                setFormData({
                    name: '',
                    description: '',
                    applicableTypes: { theory: true, practical: true, sla: true },
                });
                fetchPoints();
            }
        } catch (error) {
            console.error('Error creating IAMP point:', error);
        }
    };

    const toggleStatus = async (id: string, currentStatus: boolean) => {
        try {
            await fetch(`/api/iamp-points/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !currentStatus }),
            });
            fetchPoints();
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this IAMP point?')) return;
        try {
            await fetch(`/api/iamp-points/${id}`, { method: 'DELETE' });
            fetchPoints();
        } catch (error) {
            console.error('Error deleting IAMP point:', error);
        }
    };

    const getTypesBadges = (types?: ApplicableTypes) => {
        if (!types) return ['TH', 'PR', 'SLA']; // Default all
        const badges = [];
        if (types.theory) badges.push('TH');
        if (types.practical) badges.push('PR');
        if (types.sla) badges.push('SLA');
        return badges;
    };

    if (isLoading) {
        return <div>Loading...</div>;
    }

    return (
        <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <h1 className="text-2xl font-bold">IAMP Points</h1>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button>Add IAMP Point</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add New IAMP Point</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) =>
                                        setFormData({ ...formData, name: e.target.value })
                                    }
                                    placeholder="e.g. Course Plan"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Description (Optional)</Label>
                                <Textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) =>
                                        setFormData({ ...formData, description: e.target.value })
                                    }
                                    placeholder="Brief description of this IAMP point"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Applicable For</Label>
                                <div className="flex flex-wrap gap-4 p-3 border rounded-md">
                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            id="type-theory"
                                            checked={formData.applicableTypes.theory}
                                            onCheckedChange={(checked: boolean) =>
                                                setFormData({
                                                    ...formData,
                                                    applicableTypes: {
                                                        ...formData.applicableTypes,
                                                        theory: checked,
                                                    },
                                                })
                                            }
                                        />
                                        <Label htmlFor="type-theory" className="cursor-pointer font-normal">
                                            Theory (TH)
                                        </Label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            id="type-practical"
                                            checked={formData.applicableTypes.practical}
                                            onCheckedChange={(checked: boolean) =>
                                                setFormData({
                                                    ...formData,
                                                    applicableTypes: {
                                                        ...formData.applicableTypes,
                                                        practical: checked,
                                                    },
                                                })
                                            }
                                        />
                                        <Label htmlFor="type-practical" className="cursor-pointer font-normal">
                                            Practical (PR)
                                        </Label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            id="type-sla"
                                            checked={formData.applicableTypes.sla}
                                            onCheckedChange={(checked: boolean) =>
                                                setFormData({
                                                    ...formData,
                                                    applicableTypes: {
                                                        ...formData.applicableTypes,
                                                        sla: checked,
                                                    },
                                                })
                                            }
                                        />
                                        <Label htmlFor="type-sla" className="cursor-pointer font-normal">
                                            SLA
                                        </Label>
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Select which teaching types this IAMP point applies to
                                </p>
                            </div>
                            <Button type="submit" className="w-full">
                                Create IAMP Point
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="border rounded-lg overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Applies To</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Active</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {points.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center text-muted-foreground">
                                    No IAMP points found
                                </TableCell>
                            </TableRow>
                        ) : (
                            points.map((point) => (
                                <TableRow key={point._id}>
                                    <TableCell className="font-medium">{point.name}</TableCell>
                                    <TableCell className="max-w-xs truncate">
                                        {point.description || '-'}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-1">
                                            {getTypesBadges(point.applicableTypes).map((type) => (
                                                <Badge key={type} variant="outline" className="text-xs">
                                                    {type}
                                                </Badge>
                                            ))}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={point.isActive ? 'default' : 'secondary'}>
                                            {point.isActive ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Switch
                                            checked={point.isActive}
                                            onCheckedChange={() => toggleStatus(point._id, point.isActive)}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => handleDelete(point._id)}
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
        </div>
    );
}
