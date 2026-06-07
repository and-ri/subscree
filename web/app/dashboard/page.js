'use client';

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslations } from 'next-intl';
import { Header } from "@/components/layout/Header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getSubscriptions, getStats } from "@/lib/api";
import { AlertCircle, Plus, TrendingUp, Calendar, CreditCard } from "lucide-react";

const STATUS_VARIANTS = { ACTIVE: 'default', TRIAL: 'secondary', PAUSED: 'outline', CANCELLED: 'destructive' };

function formatAmount(amount, currency, billingCycleSuffix) {
    return new Intl.NumberFormat('en', { style: 'currency', currency, minimumFractionDigits: 2 })
        .format(amount) + billingCycleSuffix;
}

export default function DashboardPage() {
    const t = useTranslations('Dashboard');
    const tStats = useTranslations('Stats');
    const tStatus = useTranslations('Status');
    const tCycle = useTranslations('BillingCycle');

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [subscriptions, setSubscriptions] = useState([]);
    const [stats, setStats] = useState(null);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const [subsRes, statsRes] = await Promise.all([
                    getSubscriptions(),
                    getStats(),
                ]);
                setSubscriptions(subsRes.subscriptions || []);
                setStats(statsRes);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const statCards = stats ? [
        {
            icon: TrendingUp,
            label: tStats('monthlySpend'),
            value: new Intl.NumberFormat('en', { style: 'currency', currency: stats.currency, minimumFractionDigits: 2 }).format(stats.totalMonthlySpend),
        },
        {
            icon: CreditCard,
            label: tStats('activeSubscriptions'),
            value: stats.totalSubscriptions,
        },
        {
            icon: Calendar,
            label: tStats('upcomingRenewals'),
            value: stats.upcomingRenewals?.length ?? 0,
        },
    ] : [];

    return (
        <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1">
                <div className="container mx-auto py-8 flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-1">
                            <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
                            {!loading && !error && (
                                <p className="text-sm text-muted-foreground">
                                    {t('subscriptionCount', { count: subscriptions.length })}
                                </p>
                            )}
                        </div>
                        <Button asChild>
                            <Link href="/dashboard/new">
                                <Plus data-icon="inline-start" />
                                {t('addSubscription')}
                            </Link>
                        </Button>
                    </div>

                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle />
                            <AlertTitle>{t('failedToLoad')}</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {/* Stats */}
                    {!loading && !error && stats && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {statCards.map(({ icon: Icon, label, value }) => (
                                <Card key={label}>
                                    <CardHeader className="pb-2">
                                        <CardDescription className="flex items-center gap-2">
                                            <Icon className="h-4 w-4" />
                                            {label}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-2xl font-bold">{value}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}

                    {loading ? (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <Card key={i}>
                                        <CardHeader><Skeleton className="h-4 w-2/3" /></CardHeader>
                                        <CardContent><Skeleton className="h-7 w-1/2" /></CardContent>
                                    </Card>
                                ))}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {Array.from({ length: 6 }).map((_, i) => (
                                    <Card key={i}>
                                        <CardHeader>
                                            <Skeleton className="h-5 w-2/3" />
                                            <Skeleton className="h-4 w-1/3" />
                                        </CardHeader>
                                        <CardContent><Skeleton className="h-7 w-1/2" /></CardContent>
                                        <CardFooter><Skeleton className="h-9 w-28" /></CardFooter>
                                    </Card>
                                ))}
                            </div>
                        </>
                    ) : subscriptions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
                            <p className="text-lg font-medium">{t('noSubscriptions')}</p>
                            <p className="text-sm text-muted-foreground">{t('noSubscriptionsDesc')}</p>
                            <Button asChild className="mt-2">
                                <Link href="/dashboard/new">
                                    <Plus data-icon="inline-start" />
                                    {t('addSubscription')}
                                </Link>
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {subscriptions.map((sub) => (
                                <Card key={sub.id}>
                                    <CardHeader>
                                        <CardTitle>{sub.name}</CardTitle>
                                        {sub.notes && (
                                            <CardDescription className="truncate">{sub.notes}</CardDescription>
                                        )}
                                        <CardAction>
                                            <Badge variant={STATUS_VARIANTS[sub.status] || 'outline'}>
                                                {tStatus(sub.status)}
                                            </Badge>
                                        </CardAction>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-2xl font-bold">
                                            {formatAmount(sub.amount, sub.currency, tCycle(`suffix.${sub.billingCycle}`))}
                                        </p>
                                    </CardContent>
                                    <CardFooter>
                                        <Button variant="outline" size="sm" asChild>
                                            <Link href={`/dashboard/${sub.id}`}>{t('viewDetails')}</Link>
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
