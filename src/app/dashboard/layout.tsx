'use client';

import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';

interface DashboardLayoutProps {
    children: ReactNode;
}

interface NavLink {
    href: string;
    label: string;
    roles: string[];
}

const allLinks: NavLink[] = [
    { href: '/dashboard', label: 'Dashboard', roles: ['super_admin', 'iamp_coordinator', 'feedback_coordinator', 'principal', 'hod'] },
    { href: '/dashboard/users', label: 'Users', roles: ['super_admin'] },
    { href: '/dashboard/departments', label: 'Departments', roles: ['super_admin'] },
    { href: '/dashboard/semesters', label: 'Semesters', roles: ['super_admin'] },
    { href: '/dashboard/iamp-points', label: 'IAMP Points', roles: ['super_admin'] },
    { href: '/dashboard/questions', label: 'Feedback Questions', roles: ['super_admin'] },
    { href: '/dashboard/classes', label: 'Classes', roles: ['iamp_coordinator', 'feedback_coordinator'] },
    { href: '/dashboard/subjects', label: 'Subjects', roles: ['iamp_coordinator', 'feedback_coordinator'] },
    { href: '/dashboard/teachers', label: 'Teachers', roles: ['iamp_coordinator', 'feedback_coordinator'] },
    { href: '/dashboard/feedback-sessions', label: 'Feedback Sessions', roles: ['feedback_coordinator'] },
    { href: '/dashboard/feedback-reports', label: 'Feedback Reports', roles: ['feedback_coordinator', 'principal', 'hod'] },
    { href: '/dashboard/text-comments', label: 'Text Comments', roles: ['super_admin', 'principal'] },
    { href: '/dashboard/supervision', label: 'Supervision', roles: ['iamp_coordinator'] },
    { href: '/dashboard/reports', label: 'Reports', roles: ['super_admin', 'iamp_coordinator', 'principal', 'hod'] },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
    const { data: session } = useSession();
    const pathname = usePathname();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const role = session?.user?.role || '';

    const links = allLinks.filter((link) => link.roles.includes(role));

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b sticky top-0 bg-background z-50 print:hidden">
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
                        <SheetContent side="left" className="w-64" aria-describedby={undefined}>
                            <SheetHeader>
                                <SheetTitle>
                                    <Link
                                        href="/dashboard"
                                        className="font-semibold text-lg"
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        IAMP SGI
                                    </Link>
                                </SheetTitle>
                            </SheetHeader>
                            <div className="flex flex-col gap-4 mt-4 px-4">
                                <nav className="flex flex-col gap-2">
                                    {links.map((link) => (
                                        <Link
                                            key={link.href}
                                            href={link.href}
                                            onClick={() => setMobileMenuOpen(false)}
                                            className={`px-3 py-2 rounded-md text-sm transition-colors hover:bg-muted ${pathname === link.href
                                                ? 'bg-muted font-medium'
                                                : 'text-muted-foreground'
                                                }`}
                                        >
                                            {link.label}
                                        </Link>
                                    ))}
                                </nav>
                                <div className="mt-auto pt-4 border-t">
                                    <p className="text-sm text-muted-foreground mb-2">
                                        {session?.user?.name}
                                    </p>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full"
                                        onClick={() => signOut({ callbackUrl: '/login' })}
                                    >
                                        Logout
                                    </Button>
                                </div>
                            </div>
                        </SheetContent>
                    </Sheet>

                    {/* Logo */}
                    <Link href="/dashboard" className="font-semibold shrink-0">
                        IAMP SGI
                    </Link>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center gap-4 flex-1 overflow-x-auto">
                        {links.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`text-sm transition-colors hover:text-foreground whitespace-nowrap ${pathname === link.href
                                    ? 'text-foreground font-medium'
                                    : 'text-muted-foreground'
                                    }`}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </nav>

                    {/* Desktop User Info */}
                    <div className="hidden md:flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">
                            {session?.user?.name}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => signOut({ callbackUrl: '/login' })}
                        >
                            Logout
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main content */}
            <main className="max-w-7xl mx-auto p-4 md:p-6">{children}</main>
        </div>
    );
}
