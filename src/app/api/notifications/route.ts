import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { auth } from '@/lib/auth';
import Notification from '@/models/Notification';

// GET - get current user's notifications
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await connectDB();

        const { searchParams } = new URL(request.url);
        const unreadOnly = searchParams.get('unreadOnly') === 'true';

        const filter: Record<string, unknown> = { user: session.user.id };
        if (unreadOnly) filter.isRead = false;

        const notifications = await Notification.find(filter)
            .populate('relatedSubmission', 'status subject')
            .sort({ createdAt: -1 })
            .limit(50);

        const unreadCount = await Notification.countDocuments({
            user: session.user.id,
            isRead: false,
        });

        return NextResponse.json({ notifications, unreadCount });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PATCH - mark notification(s) as read
export async function PATCH(request: NextRequest) {
    try {
        const session = await auth();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await connectDB();
        const { ids, markAll } = await request.json();

        if (markAll) {
            await Notification.updateMany(
                { user: session.user.id, isRead: false },
                { $set: { isRead: true } }
            );
        } else if (ids?.length) {
            await Notification.updateMany(
                { _id: { $in: ids }, user: session.user.id },
                { $set: { isRead: true } }
            );
        }

        return NextResponse.json({ message: 'Updated' });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
