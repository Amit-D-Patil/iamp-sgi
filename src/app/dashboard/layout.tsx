'use client';

import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { ReactNode, useState, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UnauthorizedAlert } from '@/components/UnauthorizedAlert';
import { NotificationBell } from '@/components/NotificationBell';
import logo from '@/assets/logo.png';
import { Bell } from 'lucide-react';

interface DashboardLayoutProps {
    children: ReactNode;
}

interface NavItem {
    href: string;
    label: string;
    roles: string[];
}

interface NavGroup {
    label: string;
    items: NavItem[];
    roles: string[];
}

// Grouped navigation structure
const navGroups: NavGroup[] = [
    {
        label: 'Settings',
        roles: ['super_admin'],
        items: [
            { href: '/dashboard/users', label: 'Users', roles: ['super_admin'] },
            { href: '/dashboard/departments', label: 'Departments', roles: ['super_admin'] },
            { href: '/dashboard/semesters', label: 'Semesters', roles: ['super_admin'] },
        ],
    },
    {
        label: 'IAMC',
        roles: ['super_admin', 'iamp_coordinator', 'principal', 'hod'],
        items: [
            { href: '/dashboard/iamp-points', label: 'IAMC Points', roles: ['super_admin'] },
            { href: '/dashboard/supervision', label: 'Supervision', roles: ['iamp_coordinator'] },
            { href: '/dashboard/reports', label: 'Reports', roles: ['super_admin', 'iamp_coordinator', 'principal', 'hod'] },
        ],
    },
    {
        label: 'Feedback',
        roles: ['super_admin', 'feedback_coordinator', 'principal'],
        items: [
            { href: '/dashboard/questions', label: 'Questions', roles: ['super_admin'] },
            { href: '/dashboard/feedback-sessions', label: 'Sessions', roles: ['super_admin'] },
            { href: '/dashboard/feedback-reports', label: 'Reports', roles: ['super_admin', 'feedback_coordinator', 'principal'] },
            { href: '/dashboard/text-comments', label: 'Text Comments', roles: ['super_admin', 'principal'] },
        ],
    },
    {
        label: 'Data',
        roles: ['iamp_coordinator', 'feedback_coordinator', 'faculty', 'hod'],
        items: [
            { href: '/dashboard/classes', label: 'Classes', roles: ['iamp_coordinator', 'feedback_coordinator'] },
            { href: '/dashboard/subjects', label: 'Subjects', roles: ['iamp_coordinator', 'feedback_coordinator', 'faculty'] },
            { href: '/dashboard/teachers', label: 'Teachers', roles: ['iamp_coordinator', 'feedback_coordinator', 'hod'] },
        ],
    },
    {
        label: 'Paper Submission',
        roles: ['super_admin', 'faculty', 'hod', 'exam_coordinator'],
        items: [
            { href: '/dashboard/paper-sessions', label: 'Sessions', roles: ['super_admin'] },
            { href: '/dashboard/paper-submissions', label: 'Submit Papers', roles: ['faculty'] },
            { href: '/dashboard/paper-review', label: 'Review Papers', roles: ['hod'] },
            { href: '/dashboard/paper-report', label: 'Submission Report', roles: ['hod'] },
            { href: '/dashboard/paper-selection', label: 'Paper Selection', roles: ['exam_coordinator'] },
        ],
    },
    {
        label: 'Account',
        roles: ['super_admin', 'iamp_coordinator', 'feedback_coordinator', 'principal', 'hod', 'faculty'],
        items: [
            { href: '/dashboard/notifications', label: 'Notifications', roles: ['super_admin', 'iamp_coordinator', 'feedback_coordinator', 'principal', 'hod', 'faculty'] },
        ],
    },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
    const { data: session } = useSession();
    const pathname = usePathname();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const role = session?.user?.role || '';

    // Filter groups and items based on role
    const filteredGroups = navGroups
        .filter(group => group.roles.includes(role))
        .map(group => ({
            ...group,
            items: group.items.filter(item => item.roles.includes(role))
        }))
        .filter(group => group.items.length > 0);

    // Check if current path is within a group
    const isInGroup = (group: NavGroup) => {
        return group.items.some(item => pathname.startsWith(item.href));
    };

    // Flatten all items for mobile menu
    const allItems = filteredGroups.flatMap(group => group.items);

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b sticky top-0 bg-background z-50 print:hidden border-primary/20">
                <div className="max-w-7xl mx-auto flex h-14 items-center px-4 md:px-6 gap-4 md:gap-6">
                    {/* Mobile Menu Button */}
                    <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                        <SheetTrigger asChild className="md:hidden">
                            <Button variant="ghost" size="sm" className="p-2">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <line x1="3" y1="12" x2="21" y2="12" />
                                    <line x1="3" y1="6" x2="21" y2="6" />
                                    <line x1="3" y1="18" x2="21" y2="18" />
                                </svg>
                                <span className="sr-only">Open menu</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-72" aria-describedby={undefined}>
                            <SheetHeader>
                                <SheetTitle>
                                    <Link
                                        href="/dashboard"
                                        className="flex items-center gap-2"
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        <Image
                                            src={logo}
                                            alt="SGI Logo"
                                            width={32}
                                            height={32}
                                            className="rounded"
                                        />
                                        <span className="font-semibold text-lg text-primary">IAMC SGI</span>
                                    </Link>
                                </SheetTitle>
                            </SheetHeader>
                            <div className="flex flex-col gap-4 mt-4 px-2">
                                {/* Dashboard link */}
                                <Link
                                    href="/dashboard"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-primary/10 ${pathname === '/dashboard'
                                        ? 'bg-primary/10 text-primary'
                                        : 'text-muted-foreground'
                                        }`}
                                >
                                    Dashboard
                                </Link>

                                {/* Groups */}
                                {filteredGroups.map((group) => (
                                    <div key={group.label} className="space-y-1">
                                        <p className="px-3 text-xs font-semibold text-foreground uppercase tracking-wider">
                                            {group.label}
                                        </p>
                                        {group.items.map((item) => (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                onClick={() => setMobileMenuOpen(false)}
                                                className={`block px-3 py-2 rounded-md text-sm transition-colors hover:bg-primary/10 ${pathname === item.href
                                                    ? 'bg-primary/10 font-medium text-primary'
                                                    : 'text-muted-foreground'
                                                    }`}
                                            >
                                                {item.label}
                                            </Link>
                                        ))}
                                    </div>
                                ))}

                                <div className="mt-auto pt-4 border-t flex flex-col gap-3">
                                    <div className="flex items-center justify-between px-3">
                                        <div className="flex flex-col">
                                            <p className="text-sm font-medium text-foreground">
                                                {session?.user?.name}
                                            </p>
                                            <p className="text-xs text-muted-foreground uppercase">
                                                {role.replace('_', ' ')}
                                            </p>
                                        </div>
                                        <NotificationBell />
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full border-primary/30 hover:bg-primary/10"
                                        onClick={() => signOut({ callbackUrl: '/login' })}
                                    >
                                        Logout
                                    </Button>
                                </div>
                            </div>
                        </SheetContent>
                    </Sheet>

                    {/* Logo */}
                    <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
                        <Image
                            src={logo}
                            alt="SGI Logo"
                            width={32}
                            height={32}
                            className="rounded"
                        />
                        <span className="font-semibold text-primary hidden sm:inline">IAMC SGI</span>
                    </Link>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center gap-1 flex-1">
                        {/* Dashboard link */}
                        <Link
                            href="/dashboard"
                            className={`px-3 py-2 text-sm rounded-md transition-colors hover:bg-primary/10 ${pathname === '/dashboard'
                                ? 'text-primary font-medium bg-primary/5'
                                : 'text-muted-foreground'
                                }`}
                        >
                            Dashboard
                        </Link>

                        {/* Dropdown menus for each group */}
                        {filteredGroups.map((group) => (
                            <DropdownMenu key={group.label}>
                                <DropdownMenuTrigger asChild>
                                    <button
                                        className={`flex items-center gap-1 px-3 py-2 text-sm rounded-md transition-colors hover:bg-primary/10 ${isInGroup(group)
                                            ? 'text-primary font-medium bg-primary/5'
                                            : 'text-muted-foreground'
                                            }`}
                                    >
                                        {group.label}
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            width="12"
                                            height="12"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        >
                                            <path d="m6 9 6 6 6-6" />
                                        </svg>
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-48">
                                    {group.items.map((item) => (
                                        <DropdownMenuItem key={item.href} asChild>
                                            <Link
                                                href={item.href}
                                                className={pathname === item.href ? 'text-primary font-medium' : ''}
                                            >
                                                {item.label}
                                            </Link>
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ))}
                    </nav>

                    {/* Desktop User Info */}
                    <div className="hidden md:flex items-center gap-4">
                        <NotificationBell />
                        <span className="text-sm font-medium text-foreground">
                            {session?.user?.name}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            className="border-primary/30 hover:bg-primary/10 hover:text-primary"
                            onClick={() => signOut({ callbackUrl: '/login' })}
                        >
                            Logout
                        </Button>
                    </div>
                </div>
            </header>

            {/* Unauthorized alert */}
            <Suspense fallback={null}>
                <UnauthorizedAlert />
            </Suspense>

            {/* Main content */}
            <main className="max-w-7xl mx-auto p-4 md:p-6">{children}</main>
        </div>
    );
}
