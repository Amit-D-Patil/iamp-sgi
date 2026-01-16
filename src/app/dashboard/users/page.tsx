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
};

const roleColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    super_admin: 'destructive',
    iamp_coordinator: 'default',
    feedback_coordinator: 'default',
    principal: 'secondary',
    hod: 'outline',
};

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const [filterRole, setFilterRole] = useState<string>('all');
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        password: '',
        role: 'iamp_coordinator',
        department: '',
    });

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

    const filteredUsers = filterRole === 'all'
        ? users.filter((u) => u.role !== 'super_admin')
        : users.filter((u) => u.role === filterRole);

    const needsDepartment = ['iamp_coordinator', 'feedback_coordinator', 'hod'].includes(formData.role);

    if (isLoading) {
        return <div>Loading...</div>;
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">Users</h1>
                <div className="flex items-center gap-4">
                    <Select value={filterRole} onValueChange={setFilterRole}>
                        <SelectTrigger className="w-40">
                            <SelectValue placeholder="Filter by role" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Users</SelectItem>
                            <SelectItem value="iamp_coordinator">IAMC Coordinators</SelectItem>
                            <SelectItem value="feedback_coordinator">Feedback Coordinators</SelectItem>
                            <SelectItem value="principal">Director</SelectItem>
                            <SelectItem value="hod">HODs</SelectItem>
                        </SelectContent>
                    </Select>
                    <Dialog open={isOpen} onOpenChange={setIsOpen}>
                        <DialogTrigger asChild>
                            <Button>Add User</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add New User</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="role">Role</Label>
                                    <Select
                                        value={formData.role}
                                        onValueChange={(value) =>
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
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="name">Name</Label>
                                    <Input
                                        id="name"
                                        value={formData.name}
                                        onChange={(e) =>
                                            setFormData({ ...formData, name: e.target.value })
                                        }
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Phone</Label>
                                    <Input
                                        id="phone"
                                        value={formData.phone}
                                        onChange={(e) =>
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
                                        onChange={(e) =>
                                            setFormData({ ...formData, password: e.target.value })
                                        }
                                        required
                                    />
                                </div>
                                {needsDepartment && (
                                    <div className="space-y-2">
                                        <Label htmlFor="department">Department</Label>
                                        <Select
                                            value={formData.department}
                                            onValueChange={(value) =>
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

            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Department</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Active</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredUsers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center text-muted-foreground">
                                    No users found
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredUsers.map((user) => (
                                <TableRow key={user._id}>
                                    <TableCell className="font-medium">{user.name}</TableCell>
                                    <TableCell>{user.phone}</TableCell>
                                    <TableCell>
                                        <Badge variant={roleColors[user.role] || 'default'}>
                                            {roleLabels[user.role] || user.role}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {user.department ? (
                                            <span>{user.department.name}</span>
                                        ) : (
                                            <span className="text-muted-foreground">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={user.isActive ? 'default' : 'secondary'}>
                                            {user.isActive ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Switch
                                            checked={user.isActive}
                                            onCheckedChange={() => toggleStatus(user._id, user.isActive)}
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
