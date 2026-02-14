'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ReportType {
    title: string;
    description: string;
    href: string;
    icon: string;
}

const reportTypes: ReportType[] = [
    {
        title: 'Formative Feedback Report',
        description: 'View detailed feedback scores for each teacher by class, subject, and question.',
        href: '/dashboard/feedback-reports/formative',
        icon: '📊',
    },
    {
        title: 'Appreciation Letter',
        description: 'Generate and download appreciation letters for faculty based on their feedback scores.',
        href: '/dashboard/feedback-reports/appreciation',
        icon: '📜',
    },
];

export default function FeedbackReportsPage() {
    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-bold">Feedback Reports</h1>
                <p className="text-muted-foreground text-sm">
                    Select a report type to view or generate
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {reportTypes.map((report) => (
                    <Link key={report.href} href={report.href}>
                        <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer hover:border-primary">
                            <CardHeader>
                                <div className="text-4xl mb-2">{report.icon}</div>
                                <CardTitle className="text-lg">{report.title}</CardTitle>
                                <CardDescription>{report.description}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <span className="text-primary text-sm font-medium">
                                    Open Report →
                                </span>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    );
}
