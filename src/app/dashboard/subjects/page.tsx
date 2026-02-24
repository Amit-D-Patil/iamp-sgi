'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
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
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface SubjectTypes {
    hasTheory: boolean;
    hasPractical: boolean;
    practicalType?: {
        saPr?: {
            enabled: boolean;
            type?: 'internal' | 'external';
        };
        faPr?: boolean;
    };
    hasSLA: boolean;
}

interface Subject {
    _id: string;
    name: string;
    code?: string;
    types: SubjectTypes;
    department: { name: string; shortName: string };
    isActive: boolean;
    createdAt: string;
}

const defaultTypes: SubjectTypes = {
    hasTheory: true,
    hasPractical: false,
    practicalType: {
        saPr: { enabled: false, type: undefined },
        faPr: false,
    },
    hasSLA: false,
};

export default function SubjectsPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <SubjectsContent />
        </Suspense>
    );
}

function SubjectsContent() {
    const searchParams = useSearchParams();
    const canDelete = searchParams.get('delete') === 'true';

    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        types: { ...defaultTypes },
    });

    // Edit dialog
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
    const [editFormData, setEditFormData] = useState({
        name: '',
        code: '',
        types: { ...defaultTypes },
    });

    useEffect(() => {
        fetchSubjects();
    }, []);

    const fetchSubjects = async () => {
        try {
            const res = await fetch('/api/subjects');
            const data = await res.json();
            setSubjects(data.subjects || []);
        } catch (error) {
            console.error('Error fetching subjects:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/subjects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            if (res.ok) {
                setIsOpen(false);
                setFormData({ name: '', code: '', types: { ...defaultTypes } });
                fetchSubjects();
            }
        } catch (error) {
            console.error('Error creating subject:', error);
        }
    };

    const toggleStatus = async (id: string, currentStatus: boolean) => {
        try {
            await fetch(`/api/subjects/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !currentStatus }),
            });
            fetchSubjects();
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this subject?')) return;
        try {
            await fetch(`/api/subjects/${id}`, { method: 'DELETE' });
            fetchSubjects();
        } catch (error) {
            console.error('Error deleting subject:', error);
        }
    };

    const updateTypes = (updates: Partial<SubjectTypes>) => {
        setFormData((prev) => ({
            ...prev,
            types: { ...prev.types, ...updates },
        }));
    };

    const updateEditTypes = (updates: Partial<SubjectTypes>) => {
        setEditFormData((prev) => ({
            ...prev,
            types: { ...prev.types, ...updates },
        }));
    };

    const openEditDialog = (subject: Subject) => {
        setEditingSubject(subject);
        setEditFormData({
            name: subject.name,
            code: subject.code || '',
            types: subject.types ? { ...subject.types } : { ...defaultTypes },
        });
        setIsEditOpen(true);
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingSubject) return;
        try {
            const res = await fetch(`/api/subjects/${editingSubject._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editFormData),
            });
            if (res.ok) {
                setIsEditOpen(false);
                setEditingSubject(null);
                fetchSubjects();
            }
        } catch (error) {
            console.error('Error updating subject:', error);
        }
    };

    const getTypesBadges = (types: SubjectTypes) => {
        const badges = [];
        if (types?.hasTheory) badges.push('TH');
        if (types?.hasPractical) {
            if (types.practicalType?.saPr?.enabled) {
                badges.push(`SA PR (${types.practicalType.saPr.type || '-'})`);
            }
            if (types.practicalType?.faPr) {
                badges.push('FA PR');
            }
        }
        if (types?.hasSLA) badges.push('SLA');
        return badges;
    };

    if (isLoading) {
        return <div>Loading...</div>;
    }

    return (
        <>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <h1 className="text-2xl font-bold">Subjects</h1>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button>Add Subject</Button>
                    </DialogTrigger>
                    <DialogContent className="max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Add New Subject</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Subject Name</Label>
                                    <Input
                                        id="name"
                                        value={formData.name}
                                        onChange={(e) =>
                                            setFormData({ ...formData, name: e.target.value })
                                        }
                                        placeholder="e.g. Mathematics"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="code">Subject Code (Optional)</Label>
                                    <Input
                                        id="code"
                                        value={formData.code}
                                        onChange={(e) =>
                                            setFormData({ ...formData, code: e.target.value })
                                        }
                                        placeholder="e.g. MATH101"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <Label>Subject Types</Label>
                                <div className="border rounded-lg p-4 space-y-4">
                                    {/* Theory */}
                                    <div className="flex items-center gap-3">
                                        <Checkbox
                                            id="hasTheory"
                                            checked={formData.types.hasTheory}
                                            onCheckedChange={(checked: boolean) =>
                                                updateTypes({ hasTheory: checked })
                                            }
                                        />
                                        <Label htmlFor="hasTheory" className="font-medium cursor-pointer">
                                            TH - Theory
                                        </Label>
                                    </div>

                                    {/* Practical */}
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3">
                                            <Checkbox
                                                id="hasPractical"
                                                checked={formData.types.hasPractical}
                                                onCheckedChange={(checked: boolean) =>
                                                    updateTypes({
                                                        hasPractical: checked,
                                                        practicalType: checked
                                                            ? formData.types.practicalType
                                                            : { saPr: { enabled: false }, faPr: false },
                                                    })
                                                }
                                            />
                                            <Label htmlFor="hasPractical" className="font-medium cursor-pointer">
                                                PR - Practical
                                            </Label>
                                        </div>

                                        {/* Nested Practical Options */}
                                        {formData.types.hasPractical && (
                                            <div className="ml-6 pl-4 border-l-2 space-y-3">
                                                {/* SA PR */}
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-3">
                                                        <Checkbox
                                                            id="saPr"
                                                            checked={formData.types.practicalType?.saPr?.enabled || false}
                                                            onCheckedChange={(checked: boolean) =>
                                                                updateTypes({
                                                                    practicalType: {
                                                                        ...formData.types.practicalType,
                                                                        saPr: {
                                                                            enabled: checked,
                                                                            type: checked
                                                                                ? formData.types.practicalType?.saPr?.type
                                                                                : undefined,
                                                                        },
                                                                    },
                                                                })
                                                            }
                                                        />
                                                        <Label htmlFor="saPr" className="cursor-pointer">
                                                            SA PR - Skill Assessment Practical
                                                        </Label>
                                                    </div>

                                                    {formData.types.practicalType?.saPr?.enabled && (
                                                        <div className="ml-6">
                                                            <Select
                                                                value={formData.types.practicalType?.saPr?.type || 'none'}
                                                                onValueChange={(value) =>
                                                                    updateTypes({
                                                                        practicalType: {
                                                                            ...formData.types.practicalType,
                                                                            saPr: {
                                                                                enabled: true,
                                                                                type: value === 'none' ? undefined : (value as 'internal' | 'external'),
                                                                            },
                                                                        },
                                                                    })
                                                                }
                                                            >
                                                                <SelectTrigger className="w-40">
                                                                    <SelectValue placeholder="Select type" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="none">Select type</SelectItem>
                                                                    <SelectItem value="internal">Internal</SelectItem>
                                                                    <SelectItem value="external">External</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* FA PR */}
                                                <div className="flex items-center gap-3">
                                                    <Checkbox
                                                        id="faPr"
                                                        checked={formData.types.practicalType?.faPr || false}
                                                        onCheckedChange={(checked: boolean) =>
                                                            updateTypes({
                                                                practicalType: {
                                                                    ...formData.types.practicalType,
                                                                    faPr: checked,
                                                                },
                                                            })
                                                        }
                                                    />
                                                    <Label htmlFor="faPr" className="cursor-pointer">
                                                        FA PR - Final Assessment Practical
                                                    </Label>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* SLA */}
                                    <div className="flex items-center gap-3">
                                        <Checkbox
                                            id="hasSLA"
                                            checked={formData.types.hasSLA}
                                            onCheckedChange={(checked: boolean) =>
                                                updateTypes({ hasSLA: checked })
                                            }
                                        />
                                        <Label htmlFor="hasSLA" className="font-medium cursor-pointer">
                                            SLA - Self Learning Assessment
                                        </Label>
                                    </div>
                                </div>
                            </div>

                            <Button type="submit" className="w-full">
                                Create Subject
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
                            <TableHead>Code</TableHead>
                            <TableHead>Types</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Active</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {subjects.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center text-muted-foreground">
                                    No subjects found
                                </TableCell>
                            </TableRow>
                        ) : (
                            subjects.map((subject) => (
                                <TableRow key={subject._id}>
                                    <TableCell className="font-medium">{subject.name}</TableCell>
                                    <TableCell>
                                        {subject.code ? (
                                            <Badge variant="outline">{subject.code}</Badge>
                                        ) : (
                                            '-'
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {getTypesBadges(subject.types).map((type, idx) => (
                                                <Badge key={idx} variant="secondary" className="text-xs">
                                                    {type}
                                                </Badge>
                                            ))}
                                            {getTypesBadges(subject.types).length === 0 && (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={subject.isActive ? 'default' : 'secondary'}>
                                            {subject.isActive ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Switch
                                            checked={subject.isActive}
                                            onCheckedChange={() => toggleStatus(subject._id, subject.isActive)}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => openEditDialog(subject)}
                                            >
                                                Edit
                                            </Button>
                                            {canDelete && (
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => handleDelete(subject._id)}
                                                >
                                                    Delete
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Edit Subject Dialog */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Subject</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleEditSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-name">Subject Name</Label>
                                <Input
                                    id="edit-name"
                                    value={editFormData.name}
                                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                                    placeholder="e.g. Mathematics"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-code">Subject Code (Optional)</Label>
                                <Input
                                    id="edit-code"
                                    value={editFormData.code}
                                    onChange={(e) => setEditFormData({ ...editFormData, code: e.target.value })}
                                    placeholder="e.g. MATH101"
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label>Subject Types</Label>
                            <div className="border rounded-lg p-4 space-y-4">
                                {/* Theory */}
                                <div className="flex items-center gap-3">
                                    <Checkbox
                                        id="edit-hasTheory"
                                        checked={editFormData.types.hasTheory}
                                        onCheckedChange={(checked: boolean) =>
                                            updateEditTypes({ hasTheory: checked })
                                        }
                                    />
                                    <Label htmlFor="edit-hasTheory" className="font-medium cursor-pointer">
                                        TH - Theory
                                    </Label>
                                </div>

                                {/* Practical */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <Checkbox
                                            id="edit-hasPractical"
                                            checked={editFormData.types.hasPractical}
                                            onCheckedChange={(checked: boolean) =>
                                                updateEditTypes({
                                                    hasPractical: checked,
                                                    practicalType: checked
                                                        ? editFormData.types.practicalType
                                                        : { saPr: { enabled: false }, faPr: false },
                                                })
                                            }
                                        />
                                        <Label htmlFor="edit-hasPractical" className="font-medium cursor-pointer">
                                            PR - Practical
                                        </Label>
                                    </div>

                                    {editFormData.types.hasPractical && (
                                        <div className="ml-6 pl-4 border-l-2 space-y-3">
                                            {/* SA PR */}
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-3">
                                                    <Checkbox
                                                        id="edit-saPr"
                                                        checked={editFormData.types.practicalType?.saPr?.enabled || false}
                                                        onCheckedChange={(checked: boolean) =>
                                                            updateEditTypes({
                                                                practicalType: {
                                                                    ...editFormData.types.practicalType,
                                                                    saPr: {
                                                                        enabled: checked,
                                                                        type: checked
                                                                            ? editFormData.types.practicalType?.saPr?.type
                                                                            : undefined,
                                                                    },
                                                                },
                                                            })
                                                        }
                                                    />
                                                    <Label htmlFor="edit-saPr" className="cursor-pointer">
                                                        SA PR - Skill Assessment Practical
                                                    </Label>
                                                </div>
                                                {editFormData.types.practicalType?.saPr?.enabled && (
                                                    <div className="ml-6">
                                                        <Select
                                                            value={editFormData.types.practicalType?.saPr?.type || 'none'}
                                                            onValueChange={(value) =>
                                                                updateEditTypes({
                                                                    practicalType: {
                                                                        ...editFormData.types.practicalType,
                                                                        saPr: {
                                                                            enabled: true,
                                                                            type: value === 'none' ? undefined : (value as 'internal' | 'external'),
                                                                        },
                                                                    },
                                                                })
                                                            }
                                                        >
                                                            <SelectTrigger className="w-40">
                                                                <SelectValue placeholder="Select type" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="none">Select type</SelectItem>
                                                                <SelectItem value="internal">Internal</SelectItem>
                                                                <SelectItem value="external">External</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                )}
                                            </div>

                                            {/* FA PR */}
                                            <div className="flex items-center gap-3">
                                                <Checkbox
                                                    id="edit-faPr"
                                                    checked={editFormData.types.practicalType?.faPr || false}
                                                    onCheckedChange={(checked: boolean) =>
                                                        updateEditTypes({
                                                            practicalType: {
                                                                ...editFormData.types.practicalType,
                                                                faPr: checked,
                                                            },
                                                        })
                                                    }
                                                />
                                                <Label htmlFor="edit-faPr" className="cursor-pointer">
                                                    FA PR - Final Assessment Practical
                                                </Label>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* SLA */}
                                <div className="flex items-center gap-3">
                                    <Checkbox
                                        id="edit-hasSLA"
                                        checked={editFormData.types.hasSLA}
                                        onCheckedChange={(checked: boolean) =>
                                            updateEditTypes({ hasSLA: checked })
                                        }
                                    />
                                    <Label htmlFor="edit-hasSLA" className="font-medium cursor-pointer">
                                        SLA - Self Learning Assessment
                                    </Label>
                                </div>
                            </div>
                        </div>

                        <Button type="submit" className="w-full">
                            Save Changes
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
