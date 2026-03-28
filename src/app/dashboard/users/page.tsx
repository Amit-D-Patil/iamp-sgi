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
import { Edit2, Trash2, X } from 'lucide-react';

interface Department {
    _id: string;
    name: string;
    shortName: string;
}

interface User {
    _id: string;
    name: string;
    phone: string;
    role: string;
    department?: Department;
    isActive: boolean;
    createdAt: string;
}

const roleLabels: Record<string, string> = {
    super_admin: 'Super Admin',
    iamp_coordinator: 'IAMC Coordinator',
    feedback_coordinator: 'Feedback Coordinator',
    principal: 'Director',
    hod: 'HOD',
    exam_coordinator: 'Exam Coordinator',
    faculty: 'Faculty',
};

const roleColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    super_admin: 'destructive',
    iamp_coordinator: 'default',
    feedback_coordinator: 'default',
    principal: 'secondary',
    hod: 'outline',
    exam_coordinator: 'default',
    faculty: 'secondary',
};

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [filterRole, setFilterRole] = useState<string>('all');
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        password: '',
        role: 'iamp_coordinator',
        department: '',
    });
    const [editData, setEditData] = useState<{
        id: string;
        name: string;
        phone: string;
        role: string;
        department: string;
    } | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [usersRes, deptRes] = await Promise.all([
                fetch('/api/users'),
                fetch('/api/departments'),
            ]);
            const usersData = await usersRes.json();
            const deptData = await deptRes.json();
            setUsers(usersData.users || []);
            setDepartments(deptData.departments || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            if (res.ok) {
                setIsOpen(false);
                setFormData({
                    name: '',
                    phone: '',
                    password: '',
                    role: 'iamp_coordinator',
                    department: '',
                });
                fetchData();
            }
        } catch (error) {
            console.error('Error creating user:', error);
        }
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editData) return;

        try {
            const res = await fetch(`/api/users/${editData.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: editData.name,
                    phone: editData.phone,
                    role: editData.role,
                    department: editData.department || undefined,
                }),
            });
            if (res.ok) {
                setIsEditOpen(false);
                setEditData(null);
                fetchData();
            }
        } catch (error) {
            console.error('Error updating user:', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this user?')) return;

        try {
            const res = await fetch(`/api/users/${id}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                fetchData();
            }
        } catch (error) {
            console.error('Error deleting user:', error);
        }
    };

    const toggleStatus = async (id: string, currentStatus: boolean) => {
        try {
            await fetch(`/api/users/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !currentStatus }),
            });
            fetchData();
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const openEdit = (user: User) => {
        setEditData({
            id: user._id,
            name: user.name,
            phone: user.phone,
            role: user.role,
            department: user.department?._id || '',
        });
        setIsEditOpen(true);
    };

    const filteredUsers = filterRole === 'all'
        ? users.filter((u) => u.role !== 'super_admin')
        : users.filter((u) => u.role === filterRole);

    const needsDepartment = (role: string) => ['iamp_coordinator', 'feedback_coordinator', 'hod'].includes(role);

    if (isLoading) {
        return <div className="p-8 text-center text-muted-foreground">Loading users...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold">Users</h1>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <Select value={filterRole} onValueChange={setFilterRole}>
                        <SelectTrigger className="w-full sm:w-48 bg-white">
                            <SelectValue placeholder="Filter by Role" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Users</SelectItem>
                            <SelectItem value="iamp_coordinator">IAMC Coordinators</SelectItem>
                            <SelectItem value="feedback_coordinator">Feedback Coordinators</SelectItem>
                            <SelectItem value="principal">Directors</SelectItem>
                            <SelectItem value="hod">HODs</SelectItem>
                            <SelectItem value="exam_coordinator">Exam Coordinators</SelectItem>
                            <SelectItem value="faculty">Faculty</SelectItem>
                        </SelectContent>
                    </Select>
                    
                    <Dialog open={isOpen} onOpenChange={setIsOpen}>
                        <DialogTrigger asChild>
                            <Button className="shrink-0">Add User</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add New User</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                                <div className="space-y-2">
                                    <Label htmlFor="role">Role</Label>
                                    <Select
                                        value={formData.role}
                                        onValueChange={(value: string) =>
                                            setFormData({ ...formData, role: value, department: '' })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select role" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="iamp_coordinator">IAMC Coordinator</SelectItem>
                                            <SelectItem value="feedback_coordinator">Feedback Coordinator</SelectItem>
                                            <SelectItem value="principal">Director</SelectItem>
                                            <SelectItem value="hod">HOD</SelectItem>
                                            <SelectItem value="exam_coordinator">Exam Coordinator</SelectItem>
                                            <SelectItem value="faculty">Faculty</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="name">Full Name</Label>
                                    <Input
                                        id="name"
                                        value={formData.name}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                            setFormData({ ...formData, name: e.target.value })
                                        }
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Phone / Username</Label>
                                    <Input
                                        id="phone"
                                        value={formData.phone}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                            setFormData({ ...formData, phone: e.target.value })
                                        }
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password">Password</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        value={formData.password}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                            setFormData({ ...formData, password: e.target.value })
                                        }
                                        required
                                    />
                                </div>
                                {needsDepartment(formData.role) && (
                                    <div className="space-y-2">
                                        <Label htmlFor="department">Department</Label>
                                        <Select
                                            value={formData.department}
                                            onValueChange={(value: string) =>
                                                setFormData({ ...formData, department: value })
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
                                )}
                                <Button type="submit" className="w-full">
                                    Create User
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead className="font-semibold">Name</TableHead>
                            <TableHead className="font-semibold">Phone / Username</TableHead>
                            <TableHead className="font-semibold">Role</TableHead>
                            <TableHead className="font-semibold">Department</TableHead>
                            <TableHead className="font-semibold">Active</TableHead>
                            <TableHead className="font-semibold text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredUsers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                    No users found Matching your criteria.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredUsers.map((user) => (
                                <TableRow key={user._id} className="hover:bg-slate-50/50">
                                    <TableCell className="font-medium text-slate-900">{user.name}</TableCell>
                                    <TableCell className="font-mono text-sm">{user.phone}</TableCell>
                                    <TableCell>
                                        <Badge variant={roleColors[user.role] || 'default'} className="font-medium">
                                            {roleLabels[user.role] || user.role}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {user.department ? (
                                            <span className="text-sm font-medium">{user.department.name}</span>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">N/A</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Switch
                                                checked={user.isActive}
                                                onCheckedChange={() => toggleStatus(user._id, user.isActive)}
                                            />
                                            <Badge variant={user.isActive ? 'default' : 'outline'} className="text-[10px] py-0">
                                                {user.isActive ? 'ON' : 'OFF'}
                                            </Badge>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-8 w-8 text-slate-500 hover:text-primary"
                                                onClick={() => openEdit(user)}
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50"
                                                onClick={() => handleDelete(user._id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Edit User Dialog */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit User Details</DialogTitle>
                    </DialogHeader>
                    {editData && (
                        <form onSubmit={handleEditSubmit} className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-role">Role Access</Label>
                                <Select
                                    value={editData.role}
                                    onValueChange={(value: string) =>
                                        setEditData({ ...editData, role: value, department: '' })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="iamp_coordinator">IAMC Coordinator</SelectItem>
                                        <SelectItem value="feedback_coordinator">Feedback Coordinator</SelectItem>
                                        <SelectItem value="principal">Director</SelectItem>
                                        <SelectItem value="hod">HOD</SelectItem>
                                        <SelectItem value="exam_coordinator">Exam Coordinator</SelectItem>
                                        <SelectItem value="faculty">Faculty</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-name">Full Name</Label>
                                <Input
                                    id="edit-name"
                                    value={editData.name}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                        setEditData({ ...editData, name: e.target.value })
                                    }
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-phone">Phone / Username</Label>
                                <Input
                                    id="edit-phone"
                                    value={editData.phone}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                        setEditData({ ...editData, phone: e.target.value })
                                    }
                                    required
                                />
                            </div>
                            {needsDepartment(editData.role) && (
                                <div className="space-y-2">
                                    <Label htmlFor="edit-department">Assigned Department</Label>
                                    <Select
                                        value={editData.department}
                                        onValueChange={(value: string) =>
                                            setEditData({ ...editData, department: value })
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
                            )}
                            <div className="flex gap-3 pt-4">
                                <Button type="button" variant="outline" className="flex-1" onClick={() => setIsEditOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" className="flex-1">
                                    Save Changes
                                </Button>
                            </div>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
