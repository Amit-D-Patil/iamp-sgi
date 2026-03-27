'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
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
import { Checkbox } from '@/components/ui/checkbox';

interface SubjectTypes {
    hasTheory: boolean;
    hasPractical: boolean;
    practicalType?: {
        saPr?: { enabled: boolean; type?: string };
        faPr?: boolean;
    };
    hasSLA: boolean;
}

interface Subject {
    _id: string;
    name: string;
    code?: string;
    types?: SubjectTypes;
}

interface ClassItem {
    _id: string;
    displayName: string;
    year: string;
    division?: string;
}

interface BatchItem {
    _id: string;
    name: string;
    class: string | { _id: string };
}

interface Mapping {
    _id: string;
    subject: { _id: string; name: string; code?: string };
    class: { _id: string; displayName: string };
    teachingType: 'theory' | 'practical' | 'sla';
    batches?: { _id: string; name: string }[];
}

interface Teacher {
    _id: string;
    name: string;
    shortName: string;
    phone?: string;
    email?: string;
    isActive: boolean;
    hasLogin?: boolean;
    createdAt: string;
}

export default function TeachersPage() {
    const { data: session, status } = useSession();
    const role = status === 'authenticated' ? (session?.user?.role ?? '') : '';
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <TeachersContent userRole={role} />
        </Suspense>
    );
}

function TeachersContent({ userRole }: { userRole: string }) {
    const searchParams = useSearchParams();
    const canDelete = searchParams.get('delete') === 'true';

    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [classes, setClasses] = useState<ClassItem[]>([]);
    const [batches, setBatches] = useState<Record<string, BatchItem[]>>({});
    const [mappings, setMappings] = useState<Mapping[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Create teacher dialog
    const [isOpen, setIsOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        shortName: '',
        phone: '',
        email: '',
    });

    // Edit teacher dialog
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
    const [editFormData, setEditFormData] = useState({
        name: '',
        shortName: '',
        phone: '',
        email: '',
    });

    // Create / Reset login dialogs
    const canManageLogins = ['iamp_coordinator', 'hod'].includes(userRole);
    const [isCreateLoginOpen, setIsCreateLoginOpen] = useState(false);
    const [isResetPwOpen, setIsResetPwOpen] = useState(false);
    const [loginTeacher, setLoginTeacher] = useState<Teacher | null>(null);
    const [loginFormData, setLoginFormData] = useState({ phone: '', password: '', confirmPassword: '' });
    const [resetPassword, setResetPassword] = useState({ newPassword: '', confirmPassword: '' });
    const [loginMsg, setLoginMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Mappings dialog
    const [isMappingOpen, setIsMappingOpen] = useState(false);
    const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
    const [mappingForm, setMappingForm] = useState({
        subject: '',
        classId: '',
        types: {
            theory: false,
            practical: false,
            sla: false,
        },
        selectedBatches: [] as string[], // Selected batch IDs for practical
    });

    const selectedSubjectData = subjects.find((s) => s._id === mappingForm.subject);
    const selectedClassBatches = mappingForm.classId ? (batches[mappingForm.classId] || []) : [];

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [teachersRes, subjectsRes, classesRes, batchesRes] = await Promise.all([
                fetch('/api/teachers'),
                fetch('/api/subjects'),
                fetch('/api/classes'),
                fetch('/api/batches'),
            ]);
            const teachersData = await teachersRes.json();
            const subjectsData = await subjectsRes.json();
            const classesData = await classesRes.json();
            const batchesData = await batchesRes.json();

            setTeachers(teachersData.teachers || []);
            setSubjects(subjectsData.subjects?.filter((s: Subject & { isActive: boolean }) => s.isActive) || []);
            setClasses(classesData.classes?.filter((c: ClassItem & { isActive: boolean }) => c.isActive) || []);

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

    const fetchTeacherMappings = async (teacherId: string) => {
        try {
            const res = await fetch(`/api/teacher-mappings?teacher=${teacherId}`);
            const data = await res.json();
            setMappings(data.mappings || []);
        } catch (error) {
            console.error('Error fetching mappings:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/teachers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            if (res.ok) {
                setIsOpen(false);
                setFormData({ name: '', shortName: '', phone: '', email: '' });
                fetchData();
            }
        } catch (error) {
            console.error('Error creating teacher:', error);
        }
    };

    const handleMappingSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTeacher) return;

        const typesToAdd: ('theory' | 'practical' | 'sla')[] = [];
        if (mappingForm.types.theory) typesToAdd.push('theory');
        if (mappingForm.types.practical) typesToAdd.push('practical');
        if (mappingForm.types.sla) typesToAdd.push('sla');

        if (typesToAdd.length === 0) {
            alert('Please select at least one type');
            return;
        }

        setIsSubmitting(true);
        try {
            // Create mappings for each selected type
            const results = await Promise.all(
                typesToAdd.map((type) => {
                    const body: Record<string, unknown> = {
                        teacher: selectedTeacher._id,
                        subject: mappingForm.subject,
                        classId: mappingForm.classId,
                        teachingType: type,
                    };

                    // Add batches only for practical type
                    if (type === 'practical' && mappingForm.selectedBatches.length > 0) {
                        body.batches = mappingForm.selectedBatches;
                    }

                    return fetch('/api/teacher-mappings', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(body),
                    });
                })
            );

            const hasError = results.some((r) => !r.ok);
            if (hasError) {
                const errorRes = results.find((r) => !r.ok);
                if (errorRes) {
                    const data = await errorRes.json();
                    alert(data.error || 'Some mappings could not be added');
                }
            }

            setMappingForm({
                subject: '',
                classId: '',
                types: { theory: false, practical: false, sla: false },
                selectedBatches: [],
            });
            fetchTeacherMappings(selectedTeacher._id);
        } catch (error) {
            console.error('Error creating mappings:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const deleteMapping = async (mappingId: string) => {
        if (!selectedTeacher) return;
        try {
            await fetch(`/api/teacher-mappings/${mappingId}`, { method: 'DELETE' });
            fetchTeacherMappings(selectedTeacher._id);
        } catch (error) {
            console.error('Error deleting mapping:', error);
        }
    };

    const openMappingsDialog = async (teacher: Teacher) => {
        setSelectedTeacher(teacher);
        setMappingForm({
            subject: '',
            classId: '',
            types: { theory: false, practical: false, sla: false },
            selectedBatches: [],
        });
        await fetchTeacherMappings(teacher._id);
        setIsMappingOpen(true);
    };

    const toggleStatus = async (id: string, currentStatus: boolean) => {
        try {
            await fetch(`/api/teachers/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !currentStatus }),
            });
            fetchData();
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this teacher?')) return;
        try {
            await fetch(`/api/teachers/${id}`, { method: 'DELETE' });
            fetchData();
        } catch (error) {
            console.error('Error deleting teacher:', error);
        }
    };

    const openEditDialog = (teacher: Teacher) => {
        setEditingTeacher(teacher);
        setEditFormData({
            name: teacher.name,
            shortName: teacher.shortName,
            phone: teacher.phone || '',
            email: teacher.email || '',
        });
        setIsEditOpen(true);
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTeacher) return;
        try {
            const res = await fetch(`/api/teachers/${editingTeacher._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editFormData),
            });
            if (res.ok) {
                setIsEditOpen(false);
                setEditingTeacher(null);
                fetchData();
            }
        } catch (error) {
            console.error('Error updating teacher:', error);
        }
    };

    const openCreateLogin = (teacher: Teacher) => {
        setLoginTeacher(teacher);
        setLoginFormData({ phone: teacher.phone || '', password: '', confirmPassword: '' });
        setLoginMsg(null);
        setIsCreateLoginOpen(true);
    };

    const openResetPw = (teacher: Teacher) => {
        setLoginTeacher(teacher);
        setResetPassword({ newPassword: '', confirmPassword: '' });
        setLoginMsg(null);
        setIsResetPwOpen(true);
    };

    const handleCreateLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loginFormData.password !== loginFormData.confirmPassword) {
            setLoginMsg({ type: 'error', text: 'Passwords do not match' });
            return;
        }
        try {
            const res = await fetch(`/api/teachers/${loginTeacher?._id}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: loginFormData.phone, password: loginFormData.password }),
            });
            const data = await res.json();
            if (res.ok) {
                setLoginMsg({ type: 'success', text: 'Login created successfully! Teacher can now log in using their phone number.' });
                setLoginFormData({ phone: '', password: '', confirmPassword: '' });
                fetchData();
            } else {
                setLoginMsg({ type: 'error', text: data.error || 'Failed to create login' });
            }
        } catch {
            setLoginMsg({ type: 'error', text: 'Something went wrong. Please try again.' });
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (resetPassword.newPassword !== resetPassword.confirmPassword) {
            setLoginMsg({ type: 'error', text: 'Passwords do not match' });
            return;
        }
        try {
            const res = await fetch(`/api/teachers/${loginTeacher?._id}/login`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: loginTeacher?.phone, newPassword: resetPassword.newPassword }),
            });
            const data = await res.json();
            if (res.ok) {
                setLoginMsg({ type: 'success', text: 'Password reset successfully!' });
                setResetPassword({ newPassword: '', confirmPassword: '' });
            } else {
                setLoginMsg({ type: 'error', text: data.error || 'Failed to reset password' });
            }
        } catch {
            setLoginMsg({ type: 'error', text: 'Something went wrong. Please try again.' });
        }
    };

    const getTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            theory: 'TH',
            practical: 'PR',
            sla: 'SLA',
        };
        return labels[type] || type;
    };

    // Get available types for selected subject
    const getAvailableTypes = () => {
        if (!selectedSubjectData?.types) {
            return { theory: true, practical: false, sla: false }; // Default to theory only
        }
        return {
            theory: selectedSubjectData.types.hasTheory,
            practical: selectedSubjectData.types.hasPractical,
            sla: selectedSubjectData.types.hasSLA,
        };
    };

    const availableTypes = getAvailableTypes();

    // Reset type selections when subject changes
    const handleSubjectChange = (subjectId: string) => {
        const subject = subjects.find((s) => s._id === subjectId);
        const types = subject?.types || { hasTheory: true, hasPractical: false, hasSLA: false };

        setMappingForm({
            ...mappingForm,
            subject: subjectId,
            types: {
                theory: types.hasTheory,
                practical: types.hasPractical,
                sla: types.hasSLA,
            },
            selectedBatches: [],
        });
    };

    // Handle class change - auto-select all batches if practical is selected
    const handleClassChange = (classId: string) => {
        const classBatches = batches[classId] || [];
        setMappingForm({
            ...mappingForm,
            classId,
            selectedBatches: classBatches.map(b => b._id), // Select all batches by default
        });
    };

    // Toggle a single batch selection
    const toggleBatchSelection = (batchId: string) => {
        setMappingForm(prev => ({
            ...prev,
            selectedBatches: prev.selectedBatches.includes(batchId)
                ? prev.selectedBatches.filter(id => id !== batchId)
                : [...prev.selectedBatches, batchId],
        }));
    };

    if (isLoading) {
        return <div>Loading...</div>;
    }

    return (
        <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <h1 className="text-2xl font-bold">Teachers</h1>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button>Add Teacher</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add New Teacher</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Full Name</Label>
                                    <Input
                                        id="name"
                                        value={formData.name}
                                        onChange={(e) =>
                                            setFormData({ ...formData, name: e.target.value })
                                        }
                                        placeholder="e.g. Dr. John Smith"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="shortName">Short Name</Label>
                                    <Input
                                        id="shortName"
                                        value={formData.shortName}
                                        onChange={(e) =>
                                            setFormData({ ...formData, shortName: e.target.value })
                                        }
                                        placeholder="e.g. J. Smith"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Phone (Optional)</Label>
                                    <Input
                                        id="phone"
                                        value={formData.phone}
                                        onChange={(e) =>
                                            setFormData({ ...formData, phone: e.target.value })
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email (Optional)</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) =>
                                            setFormData({ ...formData, email: e.target.value })
                                        }
                                    />
                                </div>
                            </div>
                            <Button type="submit" className="w-full">
                                Create Teacher
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Short Name</TableHead>
                            <TableHead>Contact</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Active</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {teachers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center text-muted-foreground">
                                    No teachers found
                                </TableCell>
                            </TableRow>
                        ) : (
                            teachers.map((teacher) => (
                                <TableRow key={teacher._id}>
                                    <TableCell className="font-medium">{teacher.name}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{teacher.shortName}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-sm">
                                            {teacher.phone && <div>{teacher.phone}</div>}
                                            {teacher.email && <div className="text-muted-foreground">{teacher.email}</div>}
                                            {!teacher.phone && !teacher.email && <span className="text-muted-foreground">-</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={teacher.isActive ? 'default' : 'secondary'}>
                                            {teacher.isActive ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Switch
                                            checked={teacher.isActive}
                                            onCheckedChange={() => toggleStatus(teacher._id, teacher.isActive)}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center flex-wrap gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => openEditDialog(teacher)}
                                            >
                                                Edit
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => openMappingsDialog(teacher)}
                                            >
                                                Mappings
                                            </Button>
                                            {canManageLogins && (
                                                <>
                                                    {!teacher.hasLogin ? (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="text-blue-600 border-blue-300 hover:bg-blue-50"
                                                            onClick={() => openCreateLogin(teacher)}
                                                        >
                                                            Create Login
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="text-orange-600 border-orange-300 hover:bg-orange-50"
                                                            onClick={() => openResetPw(teacher)}
                                                        >
                                                            Reset Password
                                                        </Button>
                                                    )}
                                                </>
                                            )}
                                            {canDelete && (
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => handleDelete(teacher._id)}
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

            {/* Edit Teacher Dialog */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Teacher</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleEditSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-name">Full Name</Label>
                                <Input
                                    id="edit-name"
                                    value={editFormData.name}
                                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                                    placeholder="e.g. Dr. John Smith"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-shortName">Short Name</Label>
                                <Input
                                    id="edit-shortName"
                                    value={editFormData.shortName}
                                    onChange={(e) => setEditFormData({ ...editFormData, shortName: e.target.value })}
                                    placeholder="e.g. J. Smith"
                                    required
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-phone">Phone (Optional)</Label>
                                <Input
                                    id="edit-phone"
                                    value={editFormData.phone}
                                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-email">Email (Optional)</Label>
                                <Input
                                    id="edit-email"
                                    type="email"
                                    value={editFormData.email}
                                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                                />
                            </div>
                        </div>
                        <Button type="submit" className="w-full">
                            Save Changes
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Mappings Dialog */}
            <Dialog open={isMappingOpen} onOpenChange={setIsMappingOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            Manage Mappings - {selectedTeacher?.name}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-6">
                        {/* Add Mapping Form */}
                        <form onSubmit={handleMappingSubmit} className="space-y-4 p-4 border rounded-lg bg-muted/50">
                            <h3 className="font-medium">Add New Mapping</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="subject">Subject</Label>
                                    <Select
                                        value={mappingForm.subject}
                                        onValueChange={handleSubjectChange}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select subject" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {subjects.map((subject) => (
                                                <SelectItem key={subject._id} value={subject._id}>
                                                    {subject.name} {subject.code && `(${subject.code})`}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="class">Class</Label>
                                    <Select
                                        value={mappingForm.classId}
                                        onValueChange={handleClassChange}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select class" />
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
                            </div>

                            {mappingForm.subject && (
                                <div className="space-y-2">
                                    <Label>Teaching Types (select all that apply)</Label>
                                    <div className="flex flex-wrap gap-4 p-3 border rounded-md bg-background">
                                        {availableTypes.theory && (
                                            <div className="flex items-center gap-2">
                                                <Checkbox
                                                    id="type-theory"
                                                    checked={mappingForm.types.theory}
                                                    onCheckedChange={(checked: boolean) =>
                                                        setMappingForm({
                                                            ...mappingForm,
                                                            types: { ...mappingForm.types, theory: checked },
                                                        })
                                                    }
                                                />
                                                <Label htmlFor="type-theory" className="cursor-pointer font-normal">
                                                    Theory (TH)
                                                </Label>
                                            </div>
                                        )}
                                        {availableTypes.practical && (
                                            <div className="flex items-center gap-2">
                                                <Checkbox
                                                    id="type-practical"
                                                    checked={mappingForm.types.practical}
                                                    onCheckedChange={(checked: boolean) =>
                                                        setMappingForm({
                                                            ...mappingForm,
                                                            types: { ...mappingForm.types, practical: checked },
                                                        })
                                                    }
                                                />
                                                <Label htmlFor="type-practical" className="cursor-pointer font-normal">
                                                    Practical (PR)
                                                </Label>
                                            </div>
                                        )}
                                        {availableTypes.sla && (
                                            <div className="flex items-center gap-2">
                                                <Checkbox
                                                    id="type-sla"
                                                    checked={mappingForm.types.sla}
                                                    onCheckedChange={(checked: boolean) =>
                                                        setMappingForm({
                                                            ...mappingForm,
                                                            types: { ...mappingForm.types, sla: checked },
                                                        })
                                                    }
                                                />
                                                <Label htmlFor="type-sla" className="cursor-pointer font-normal">
                                                    Self Learning (SLA)
                                                </Label>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Only types enabled for this subject are shown
                                    </p>
                                </div>
                            )}

                            {/* Batch Selection - show when practical is selected and class has batches */}
                            {mappingForm.types.practical && mappingForm.classId && selectedClassBatches.length > 0 && (
                                <div className="space-y-2">
                                    <Label>Select Batches for Practical</Label>
                                    <div className="p-3 border rounded-md bg-background space-y-2">
                                        {selectedClassBatches.map((batch) => (
                                            <div key={batch._id} className="flex items-center gap-2">
                                                <Checkbox
                                                    id={`batch-${batch._id}`}
                                                    checked={mappingForm.selectedBatches.includes(batch._id)}
                                                    onCheckedChange={() => toggleBatchSelection(batch._id)}
                                                />
                                                <Label htmlFor={`batch-${batch._id}`} className="cursor-pointer font-normal">
                                                    {batch.name}
                                                </Label>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        By default all batches are selected. Deselect if another teacher handles those batches.
                                    </p>
                                </div>
                            )}

                            <Button
                                type="submit"
                                disabled={
                                    !mappingForm.subject ||
                                    !mappingForm.classId ||
                                    (!mappingForm.types.theory && !mappingForm.types.practical && !mappingForm.types.sla) ||
                                    isSubmitting
                                }
                            >
                                {isSubmitting ? 'Adding...' : 'Add Mapping'}
                            </Button>
                        </form>

                        {/* Current Mappings */}
                        <div>
                            <h3 className="font-medium mb-3">Current Mappings</h3>
                            {mappings.length === 0 ? (
                                <p className="text-muted-foreground text-center py-4">
                                    No mappings found. Add a mapping above.
                                </p>
                            ) : (
                                <div className="border rounded-lg">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Subject</TableHead>
                                                <TableHead>Class</TableHead>
                                                <TableHead>Type</TableHead>
                                                <TableHead>Batches</TableHead>
                                                <TableHead>Action</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {mappings.map((mapping) => (
                                                <TableRow key={mapping._id}>
                                                    <TableCell>
                                                        {mapping.subject.name}
                                                        {mapping.subject.code && (
                                                            <Badge variant="outline" className="ml-2">
                                                                {mapping.subject.code}
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="secondary">
                                                            {mapping.class.displayName}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge>{getTypeLabel(mapping.teachingType)}</Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        {mapping.teachingType === 'practical' && mapping.batches && mapping.batches.length > 0 ? (
                                                            <div className="flex flex-wrap gap-1">
                                                                {mapping.batches.map((batch) => (
                                                                    <Badge key={batch._id} variant="outline" className="text-xs">
                                                                        {batch.name}
                                                                    </Badge>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <span className="text-muted-foreground text-sm">-</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-destructive hover:text-destructive"
                                                            onClick={() => deleteMapping(mapping._id)}
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

            {/* Create Faculty Login Dialog */}
            <Dialog open={isCreateLoginOpen} onOpenChange={(open) => { setIsCreateLoginOpen(open); setLoginMsg(null); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create Login — {loginTeacher?.name}</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        This will create a <strong>faculty</strong> login so this teacher can sign in to the portal. The phone number is used as the username.
                    </p>
                    <form onSubmit={handleCreateLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="login-phone">Phone Number (username)</Label>
                            <Input
                                id="login-phone"
                                type="tel"
                                placeholder="e.g. 9876543210"
                                value={loginFormData.phone}
                                onChange={(e) => setLoginFormData({ ...loginFormData, phone: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="login-password">Password</Label>
                            <Input
                                id="login-password"
                                type="password"
                                placeholder="Min. 6 characters"
                                value={loginFormData.password}
                                onChange={(e) => setLoginFormData({ ...loginFormData, password: e.target.value })}
                                required
                                minLength={6}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="login-confirm">Confirm Password</Label>
                            <Input
                                id="login-confirm"
                                type="password"
                                placeholder="Re-enter password"
                                value={loginFormData.confirmPassword}
                                onChange={(e) => setLoginFormData({ ...loginFormData, confirmPassword: e.target.value })}
                                required
                            />
                        </div>
                        {loginMsg && (
                            <p className={`text-sm font-medium rounded-md px-3 py-2 ${loginMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                {loginMsg.text}
                            </p>
                        )}
                        <Button type="submit" className="w-full">
                            Create Login
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Reset Password Dialog */}
            <Dialog open={isResetPwOpen} onOpenChange={(open) => { setIsResetPwOpen(open); setLoginMsg(null); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reset Password — {loginTeacher?.name}</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        Enter a new password for this faculty member. Their phone number ({loginTeacher?.phone || 'not set'}) will remain as the username.
                    </p>
                    <form onSubmit={handleResetPassword} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="reset-new">New Password</Label>
                            <Input
                                id="reset-new"
                                type="password"
                                placeholder="Min. 6 characters"
                                value={resetPassword.newPassword}
                                onChange={(e) => setResetPassword({ ...resetPassword, newPassword: e.target.value })}
                                required
                                minLength={6}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="reset-confirm">Confirm New Password</Label>
                            <Input
                                id="reset-confirm"
                                type="password"
                                placeholder="Re-enter new password"
                                value={resetPassword.confirmPassword}
                                onChange={(e) => setResetPassword({ ...resetPassword, confirmPassword: e.target.value })}
                                required
                            />
                        </div>
                        {loginMsg && (
                            <p className={`text-sm font-medium rounded-md px-3 py-2 ${loginMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                {loginMsg.text}
                            </p>
                        )}
                        <Button type="submit" className="w-full">
                            Reset Password
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
