'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function NotificationBell() {
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchUnreadCount = async () => {
        try {
            const res = await fetch('/api/notifications?unreadOnly=true');
            if (res.ok) {
                const data = await res.json();
                setUnreadCount(data.unreadCount || 0);
            }
        } catch (error) {
            console.error('Failed to fetch notifications unread count:', error);
        }
    };

    useEffect(() => {
        fetchUnreadCount();
        // Poll every 1 minute for new notifications
        const interval = setInterval(fetchUnreadCount, 60000);
        return () => clearInterval(interval);
    }, []);

    return (
        <Link href="/dashboard/notifications" className="relative">
            <Button variant="ghost" size="icon" className="relative p-2 rounded-full hover:bg-primary/10 transition-colors">
                <Bell className="h-5 w-5 text-primary" />
                {unreadCount > 0 && (
                    <Badge
                        variant="destructive"
                        className="absolute -top-1 -right-1 px-1.5 py-0.5 text-[10px] min-w-[18px] h-[18px] flex items-center justify-center border-2 border-background animate-in zoom-in"
                    >
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </Badge>
                )}
                <span className="sr-only">Notifications</span>
            </Button>
        </Link>
    );
}
