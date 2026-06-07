'use client';

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from 'next-intl';
import { Header } from "@/components/layout/Header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { getSubscription, updateSubscription, getCurrencies } from "@/lib/api";
import { AlertCircle, ArrowLeft } from "lucide-react";

export default function SubscriptionEditPage({ params }) {
    const { id } = use(params);
    const t = useTranslations('Subscription');
    const tCommon = useTranslations('Common');
    const tCycle = useTranslations('BillingCycle');
    const tStatus = useTranslations('Status');

    const [formData, setFormData] = useState(null);
    const [currencies, setCurrencies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const router = useRouter();

    useEffect(() => {
        Promise.all([getSubscription(id), getCurrencies()])
            .then(([subRes, currRes]) => {
                setFormData(subRes.subscription);
                setCurrencies(currRes.currencies || []);
            })
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, [id]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        if (!formData.name || !formData.amount) {
            setError(t('nameAndAmountRequired'));
            return;
        }
        setSubmitting(true);
        try {
            const payload = {
                name:            formData.name,
                amount:          Number(formData.amount),
                currency:        formData.currency,
                billingCycle:    formData.billingCycle,
                status:          formData.status,
                url:             formData.url || undefined,
                notes:           formData.notes || undefined,
                startDate:       formData.startDate || undefined,
                nextBillingDate: formData.nextBillingDate || undefined,
                cancelledAt:     formData.cancelledAt || undefined,
                categories:      formData.categories?.map(c => (typeof c === 'string' ? c : c.id)),
            };
            await updateSubscription(id, payload);
            router.push(`/dashboard/${id}`);
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const BILLING_CYCLES = ['MONTHLY', 'YEARLY', 'WEEKLY', 'DAILY'];
    const STATUSES = ['ACTIVE', 'TRIAL', 'PAUSED', 'CANCELLED'];

    return (
        <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1">
                <div className="container mx-auto py-8 max-w-lg flex flex-col gap-6">
                    <Button variant="ghost" size="sm" asChild className="w-fit -ml-2">
                        <Link href={`/dashboard/${id}`}>
                            <ArrowLeft data-icon="inline-start" />
                            {t('backToDetails')}
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
                                <Skeleton className="h-6 w-1/3" />
                                <Skeleton className="h-4 w-1/2" />
                            </CardHeader>
                            <CardContent className="flex flex-col gap-4">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <Skeleton key={i} className="h-10 w-full" />
                                ))}
                            </CardContent>
                        </Card>
                    ) : formData ? (
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('edit')}</CardTitle>
                                <CardDescription>{t('editDescription', { name: formData.name })}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                                    <FieldGroup>
                                        <Field>
                                            <FieldLabel htmlFor="name">{t('name')} *</FieldLabel>
                                            <Input
                                                id="name" name="name" type="text"
                                                value={formData.name || ''} onChange={handleChange} required
                                            />
                                        </Field>
                                        <Field>
                                            <FieldLabel htmlFor="url">{t('url')}</FieldLabel>
                                            <Input
                                                id="url" name="url" type="url"
                                                value={formData.url || ''} onChange={handleChange}
                                                placeholder={t('urlPlaceholder')}
                                            />
                                        </Field>
                                        <Field>
                                            <FieldLabel htmlFor="amount">{t('amount')} *</FieldLabel>
                                            <Input
                                                id="amount" name="amount" type="number"
                                                min="0" step="0.01"
                                                value={formData.amount || ''} onChange={handleChange} required
                                            />
                                        </Field>
                                        <Field>
                                            <FieldLabel>{t('currency')}</FieldLabel>
                                            <Select
                                                name="currency" value={formData.currency}
                                                onValueChange={v => setFormData(p => ({ ...p, currency: v }))}
                                            >
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder={t('selectCurrency')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectGroup>
                                                        {currencies.map(c => (
                                                            <SelectItem key={c.code} value={c.code}>
                                                                {c.code} — {c.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectGroup>
                                                </SelectContent>
                                            </Select>
                                        </Field>
                                        <Field>
                                            <FieldLabel>{t('billingCycle')}</FieldLabel>
                                            <Select
                                                name="billingCycle" value={formData.billingCycle}
                                                onValueChange={v => setFormData(p => ({ ...p, billingCycle: v }))}
                                            >
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder={t('selectBillingCycle')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectGroup>
                                                        {BILLING_CYCLES.map(c => (
                                                            <SelectItem key={c} value={c}>{tCycle(c)}</SelectItem>
                                                        ))}
                                                    </SelectGroup>
                                                </SelectContent>
                                            </Select>
                                        </Field>
                                        <Field>
                                            <FieldLabel>{t('status')}</FieldLabel>
                                            <Select
                                                name="status" value={formData.status}
                                                onValueChange={v => setFormData(p => ({ ...p, status: v }))}
                                            >
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder={t('selectStatus')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectGroup>
                                                        {STATUSES.map(s => (
                                                            <SelectItem key={s} value={s}>{tStatus(s)}</SelectItem>
                                                        ))}
                                                    </SelectGroup>
                                                </SelectContent>
                                            </Select>
                                        </Field>
                                        <Field>
                                            <FieldLabel htmlFor="notes">{t('notes')}</FieldLabel>
                                            <Textarea
                                                id="notes" name="notes"
                                                value={formData.notes || ''} onChange={handleChange}
                                                placeholder={t('notesPlaceholder')} rows={3}
                                            />
                                        </Field>
                                    </FieldGroup>
                                    <div className="flex gap-3">
                                        <Button type="submit" disabled={submitting} className="flex-1">
                                            {submitting ? t('saving') : t('saveButton')}
                                        </Button>
                                        <Button
                                            type="button" variant="outline"
                                            onClick={() => router.push(`/dashboard/${id}`)}
                                            disabled={submitting}
                                        >
                                            {tCommon('cancel')}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    ) : (
                        !error && <p className="text-muted-foreground">Subscription not found.</p>
                    )}
                </div>
            </main>
        </div>
    );
}
