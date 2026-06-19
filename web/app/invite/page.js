'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { getInvitationInfo, acceptInvitation } from '@/lib/api';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

function isLoggedIn() {
    if (typeof document === 'undefined') return false;
    return document.cookie.split('; ').some(r => r.startsWith('token='));
}

function InviteInner() {
    const t = useTranslations('Invite');
    const router = useRouter();
    const params = useSearchParams();
    const token = params.get('token') ?? '';

    const [info, setInfo] = useState(null);
    const [error, setError] = useState(null);
    const [status, setStatus] = useState('loading'); // loading | invalid | needAuth | accepting | done | error

    useEffect(() => {
        if (!token) { setStatus('invalid'); return; }
        getInvitationInfo(token)
            .then(async (i) => {
                setInfo(i);
                if (!isLoggedIn()) { setStatus('needAuth'); return; }
                setStatus('accepting');
                try {
                    await acceptInvitation(token);
                    setStatus('done');
                    setTimeout(() => router.push('/dashboard'), 1200);
                } catch (e) {
                    setError(e.message);
                    setStatus('error');
                }
            })
            .catch(() => setStatus('invalid'));
    }, [token, router]);

    const card = (children) => (
        <div className="min-h-screen flex items-center justify-center px-4">
            <div className="w-full max-w-md p-8 border rounded-lg flex flex-col gap-4">{children}</div>
        </div>
    );

    if (status === 'loading' || status === 'accepting') {
        return card(<p className="text-sm text-muted-foreground text-center">{t('checking')}</p>);
    }

    if (status === 'invalid') {
        return card(
            <>
                <Alert variant="destructive">
                    <AlertTitle>{t('invalidTitle')}</AlertTitle>
                    <AlertDescription>{t('invalidDesc')}</AlertDescription>
                </Alert>
                <Link href="/login" className="text-center text-sm text-muted-foreground hover:text-foreground">{t('toLogin')}</Link>
            </>
        );
    }

    if (status === 'done') {
        return card(
            <Alert>
                <AlertTitle>{t('joinedTitle', { team: info?.teamName ?? '' })}</AlertTitle>
                <AlertDescription>{t('joinedDesc')}</AlertDescription>
            </Alert>
        );
    }

    if (status === 'error') {
        return card(
            <>
                <Alert variant="destructive">
                    <AlertTitle>{t('errorTitle')}</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
                <Link href="/dashboard" className="text-center text-sm text-muted-foreground hover:text-foreground">{t('toDashboard')}</Link>
            </>
        );
    }

    // needAuth
    return card(
        <>
            <h1 className="text-lg font-semibold">{t('joinTitle', { team: info?.teamName ?? '' })}</h1>
            <p className="text-sm text-muted-foreground">{t('joinDesc', { email: info?.email ?? '' })}</p>
            <div className="flex flex-col gap-2">
                <Button asChild>
                    <Link href={`/register?invite=${encodeURIComponent(token)}`}>{t('createAccount')}</Link>
                </Button>
                <Button asChild variant="outline">
                    <Link href={`/login?invite=${encodeURIComponent(token)}`}>{t('signIn')}</Link>
                </Button>
            </div>
        </>
    );
}

export default function InvitePage() {
    return (
        <Suspense fallback={null}>
            <InviteInner />
        </Suspense>
    );
}
