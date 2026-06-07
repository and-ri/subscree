'use client';

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from 'next-intl';
import { Header } from "@/components/layout/Header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { getSubscription, deleteSubscription } from "@/lib/api";
import { AlertCircle, ArrowLeft } from "lucide-react";

const STATUS_VARIANTS = { ACTIVE: 'default', TRIAL: 'secondary', PAUSED: 'outline', CANCELLED: 'destructive' };

function formatDate(dateStr, locale) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString(locale === 'uk' ? 'uk-UA' : 'en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
    });
}

function DetailRow({ label, value }) {
    return (
        <div className="flex items-center justify-between py-3">
            <span className="text-sm text-muted-foreground">{label}</span>
            <span className="text-sm font-medium">{value}</span>
        </div>
    );
}

export default function SubscriptionDetailsPage({ params }) {
    const { id } = use(params);
    const t = useTranslations('Subscription');
    const tCommon = useTranslations('Common');
    const tStatus = useTranslations('Status');
    const tCycle = useTranslations('BillingCycle');

    const [subscription, setSubscription] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const router = useRouter();

    useEffect(() => {
        setLoading(true);
        getSubscription(id)
            .then(res => setSubscription(res.subscription))
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, [id]);

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await deleteSubscription(id);
            router.push('/dashboard');
        } catch (err) {
            setError(err.message);
            setDeleting(false);
        }
    };

    const sub = subscription;

    return (
        <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1">
                <div className="container mx-auto py-8 max-w-2xl flex flex-col gap-6">
                    <Button variant="ghost" size="sm" asChild className="w-fit -ml-2">
                        <Link href="/dashboard">
                            <ArrowLeft data-icon="inline-start" />
                            {t('backToList')}
                        </Link>
                    </Button>

                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {loading ? (
                        <Card>
                            <CardHeader>
                                <Skeleton className="h-6 w-1/2" />
                                <Skeleton className="h-4 w-1/3" />
                            </CardHeader>
                            <CardContent className="flex flex-col gap-4">
                                {Array.from({ length: 4 }).map((_, i) => (
                                    <Skeleton key={i} className="h-5 w-full" />
                                ))}
                            </CardContent>
                        </Card>
                    ) : sub ? (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-xl">{sub.name}</CardTitle>
                                {sub.notes && <CardDescription>{sub.notes}</CardDescription>}
                                <CardAction>
                                    <Badge variant={STATUS_VARIANTS[sub.status] || 'outline'}>
                                        {tStatus(sub.status)}
                                    </Badge>
                                </CardAction>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-col">
                                    <DetailRow
                                        label={t('amount')}
                                        value={new Intl.NumberFormat('en', {
                                            style: 'currency',
                                            currency: sub.currency,
                                            minimumFractionDigits: 2,
                                        }).format(sub.amount)}
                                    />
                                    <Separator />
                                    <DetailRow label={t('billingCycle')} value={tCycle(sub.billingCycle)} />
                                    <Separator />
                                    <DetailRow label={t('nextBillingDate')} value={formatDate(sub.nextBillingDate)} />
                                    <Separator />
                                    <DetailRow label={t('startDate')} value={formatDate(sub.startDate)} />
                                    {sub.cancelledAt && (
                                        <>
                                            <Separator />
                                            <DetailRow label={t('cancelledAt')} value={formatDate(sub.cancelledAt)} />
                                        </>
                                    )}
                                    {sub.url && (
                                        <>
                                            <Separator />
                                            <div className="flex items-center justify-between py-3">
                                                <span className="text-sm text-muted-foreground">{t('website')}</span>
                                                <a
                                                    href={sub.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-sm text-primary underline-offset-4 hover:underline truncate max-w-xs"
                                                >
                                                    {sub.url}
                                                </a>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </CardContent>
                            <CardFooter>
                                <div className="flex gap-2">
                                    <Button variant="outline" asChild>
                                        <Link href={`/dashboard/${id}/edit`}>{tCommon('edit')}</Link>
                                    </Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive" disabled={deleting}>
                                                {deleting ? t('deleting') : tCommon('delete')}
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>{t('deleteTitle')}</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    {t('deleteDesc', { name: sub.name })}
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
                                                <AlertDialogAction variant="destructive" onClick={handleDelete}>
                                                    {tCommon('delete')}
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </CardFooter>
                        </Card>
                    ) : (
                        !error && <p className="text-muted-foreground">Subscription not found.</p>
                    )}
                </div>
            </main>
        </div>
    );
}
