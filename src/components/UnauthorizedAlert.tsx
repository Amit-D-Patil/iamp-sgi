'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export function UnauthorizedAlert() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const error = searchParams.get('error');

    useEffect(() => {
        if (error === 'unauthorized') {
            alert('You do not have permission to access that page.');
            // Remove the error param from URL
            const url = new URL(window.location.href);
            url.searchParams.delete('error');
            router.replace(url.pathname);
        }
    }, [error, router]);

    return null;
}
