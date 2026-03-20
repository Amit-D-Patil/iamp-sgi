'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, CheckCircle, XCircle, FileText, Check } from 'lucide-react';

interface Notification {
    _id: string;
    type: 'new_submission' | 'submission_approved' | 'submission_rejected';
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
    relatedSubmission?: { _id: string; status: string };
}

const typeConfig = {
    new_submission: { icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
    submission_approved: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    submission_rejected: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
};

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);

    const fetchNotifications = async () => {
        const res = await fetch('/api/notifications');
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
        setLoading(false);
    };

    useEffect(() => { fetchNotifications(); }, []);

    const markRead = async (ids: string[]) => {
        await fetch('/api/notifications', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids }),
        });
        setNotifications((prev) =>
            prev.map((n) => ids.includes(n._id) ? { ...n, isRead: true } : n)
        );
        setUnreadCount((c) => Math.max(0, c - ids.length));
    };

    const markAllRead = async () => {
        await fetch('/api/notifications', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ markAll: true }),
        });
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
    };

    const relativeTime = (date: string) => {
        const diff = Date.now() - new Date(date).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        return `${Math.floor(hrs / 24)}d ago`;
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold">Notifications</h1>
                    {unreadCount > 0 && (
                        <Badge className="bg-red-500 text-white">{unreadCount} unread</Badge>
                    )}
                </div>
                {unreadCount > 0 && (
                    <Button variant="outline" size="sm" className="gap-2" onClick={markAllRead}>
                        <Check className="h-4 w-4" />
                        Mark all as read
                    </Button>
                )}
            </div>

            {loading ? (
                <p className="text-muted-foreground">Loading...</p>
            ) : notifications.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                        <Bell className="h-10 w-10 mx-auto mb-3 opacity-30" />
                        <p>No notifications yet.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-2">
                    {notifications.map((n) => {
                        const cfg = typeConfig[n.type];
                        const Icon = cfg.icon;
                        return (
                            <Card
                                key={n._id}
                                className={`transition-colors ${!n.isRead ? 'border-primary/30 bg-primary/5' : ''}`}
                                onClick={() => !n.isRead && markRead([n._id])}
                            >
                                <CardContent className="py-3 px-4 flex items-start gap-3">
                                    <div className={`p-2 rounded-full shrink-0 ${cfg.bg}`}>
                                        <Icon className={`h-4 w-4 ${cfg.color}`} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-start justify-between gap-2">
                                            <p className={`font-medium text-sm ${!n.isRead ? 'text-foreground' : 'text-muted-foreground'}`}>
                                                {n.title}
                                            </p>
                                            <span className="text-xs text-muted-foreground shrink-0">
                                                {relativeTime(n.createdAt)}
                                            </span>
                                        </div>
                                        <p className="text-sm text-muted-foreground">{n.message}</p>
                                    </div>
                                    {!n.isRead && (
                                        <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
