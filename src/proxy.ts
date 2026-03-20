import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';

// Define route permissions
const routePermissions: Record<string, string[]> = {
    // Super Admin only
    '/dashboard/users': ['super_admin'],
    '/dashboard/departments': ['super_admin'],
    '/dashboard/semesters': ['super_admin'],
    '/dashboard/iamp-points': ['super_admin'],
    '/dashboard/questions': ['super_admin'],
    '/dashboard/feedback-sessions': ['super_admin'],
    '/dashboard/text-comments': ['super_admin', 'principal'],
    '/dashboard/paper-sessions': ['super_admin'],

    // IAMC related
    '/dashboard/supervision': ['iamp_coordinator'],
    '/dashboard/reports': ['super_admin', 'iamp_coordinator', 'principal', 'hod'],
    '/dashboard/paper-review': ['hod'],
    '/dashboard/paper-report': ['hod'],
    '/dashboard/paper-selection': ['exam_coordinator'],

    // Feedback related
    '/dashboard/feedback-reports': ['super_admin', 'feedback_coordinator', 'principal'],
    '/dashboard/paper-submissions': ['faculty'],
    '/dashboard/notifications': ['super_admin', 'iamp_coordinator', 'feedback_coordinator', 'principal', 'hod', 'faculty', 'exam_coordinator'],

    // Data management
    '/dashboard/classes': ['iamp_coordinator', 'feedback_coordinator'],
    '/dashboard/subjects': ['iamp_coordinator', 'feedback_coordinator', 'faculty'],
    '/dashboard/teachers': ['iamp_coordinator', 'feedback_coordinator'],

    // Dashboard - all authenticated users
    '/dashboard': ['super_admin', 'iamp_coordinator', 'feedback_coordinator', 'principal', 'hod', 'faculty', 'exam_coordinator'],
};

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Skip for public routes
    if (
        pathname.startsWith('/login') ||
        pathname.startsWith('/api/auth') ||
        pathname.startsWith('/feedback/') ||
        pathname.startsWith('/api/feedback/') ||
        pathname.startsWith('/_next') ||
        pathname.startsWith('/favicon') ||
        pathname === '/'
    ) {
        return NextResponse.next();
    }

    // Get session
    const session = await auth();

    // If no session and trying to access protected routes, redirect to login
    if (!session) {
        if (pathname.startsWith('/dashboard') || pathname.startsWith('/api/')) {
            const loginUrl = new URL('/login', request.url);
            loginUrl.searchParams.set('callbackUrl', pathname);
            return NextResponse.redirect(loginUrl);
        }
        return NextResponse.next();
    }

    const userRole = session.user?.role;

    // Check dashboard routes
    if (pathname.startsWith('/dashboard')) {
        // Find matching route permission
        let allowedRoles: string[] | undefined;

        // Check exact match first
        if (routePermissions[pathname]) {
            allowedRoles = routePermissions[pathname];
        } else {
            // Check for parent route match
            const matchingRoute = Object.keys(routePermissions)
                .filter(route => route !== '/dashboard')
                .sort((a, b) => b.length - a.length)
                .find(route => pathname.startsWith(route));

            if (matchingRoute) {
                allowedRoles = routePermissions[matchingRoute];
            } else {
                // Default to dashboard permissions
                allowedRoles = routePermissions['/dashboard'];
            }
        }

        if (allowedRoles && !allowedRoles.includes(userRole)) {
            // Redirect to dashboard with error
            const dashboardUrl = new URL('/dashboard', request.url);
            dashboardUrl.searchParams.set('error', 'unauthorized');
            return NextResponse.redirect(dashboardUrl);
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
