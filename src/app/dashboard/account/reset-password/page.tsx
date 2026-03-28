'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { LockKeyhole, ShieldCheck, UserCog, AlertCircle, CheckCircle2 } from 'lucide-react';

const roleLabels: Record<string, string> = {
    super_admin: 'Super Admin',
    iamp_coordinator: 'IAMC Coordinator',
    feedback_coordinator: 'Feedback Coordinator',
    principal: 'Director',
    hod: 'Head of Department',
    faculty: 'Faculty',
    exam_coordinator: 'Exam Coordinator'
};

export default function SettingsPage() {
    const { data: session } = useSession();
    const [isLoading, setIsLoading] = useState(false);
    const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [formData, setFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMsg(null);

        if (formData.newPassword !== formData.confirmPassword) {
            setMsg({ type: 'error', text: 'New passwords do not match' });
            return;
        }

        if (formData.newPassword.length < 6) {
            setMsg({ type: 'error', text: 'Password must be at least 6 characters' });
            return;
        }

        setIsLoading(true);
        try {
            const resp = await fetch('/api/account/change-password', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currentPassword: formData.currentPassword,
                    newPassword: formData.newPassword
                })
            });

            const data = await resp.json();
            if (!resp.ok) throw new Error(data.error || 'Failed to change password');

            setMsg({ type: 'success', text: 'Password changed successfully!' });
            setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error: any) {
            setMsg({ type: 'error', text: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    const role = session?.user?.role || '';

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold">Reset Password</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Update your login credentials below.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Profile Info - Simplified to match Dashboard stats style */}
                <Card className="md:col-span-1 border rounded-lg h-fit">
                    <CardHeader className="pb-3 border-b">
                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                             Profile Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                        <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Full Name</p>
                            <p className="font-semibold">{session?.user?.name}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Login Phone / Username</p>
                            <p className="font-mono text-sm">{session?.user?.phone}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Role Access</p>
                            <div className="mt-1">
                                <Badge variant={role === 'super_admin' ? 'destructive' : role === 'faculty' ? 'outline' : 'secondary'}>
                                    {roleLabels[role] || role}
                                </Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Password Form - Standard Form Style */}
                <Card className="md:col-span-2 border rounded-lg">
                    <CardHeader className="pb-3 border-b">
                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                            Security Credentials
                        </CardTitle>
                        <CardDescription>
                            Verify your current identity to update your password.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
                            <div className="space-y-2">
                                <Label htmlFor="currentPassword">Current Password</Label>
                                <Input 
                                    id="currentPassword"
                                    type="password"
                                    value={formData.currentPassword}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, currentPassword: e.target.value})}
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="newPassword">New Password</Label>
                                    <Input 
                                        id="newPassword"
                                        type="password"
                                        value={formData.newPassword}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, newPassword: e.target.value})}
                                        required
                                        minLength={6}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                                    <Input 
                                        id="confirmPassword"
                                        type="password"
                                        value={formData.confirmPassword}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, confirmPassword: e.target.value})}
                                        required
                                    />
                                </div>
                            </div>

                            {msg && (
                                <div className={`p-3 rounded-md text-sm font-medium border flex items-center gap-2 ${
                                    msg.type === 'success' 
                                        ? 'bg-green-50 text-green-700 border-green-200' 
                                        : 'bg-red-50 text-red-700 border-red-200'
                                }`}>
                                    {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                    {msg.text}
                                </div>
                            )}

                            <div className="flex justify-end pt-2">
                                <Button 
                                    type="submit" 
                                    disabled={isLoading}
                                    className="w-full sm:w-auto"
                                >
                                    {isLoading ? 'Updating...' : 'Update Password'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
