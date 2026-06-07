'use client';

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from 'next-intl';
import { Header } from "@/components/layout/Header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createSubscription, getCurrencies } from "@/lib/api";
import { AlertCircle, ArrowLeft } from "lucide-react";

export default function NewSubscriptionPage() {
    const t = useTranslations('Subscription');
    const tCommon = useTranslations('Common');
    const tCycle = useTranslations('BillingCycle');
    const tStatus = useTranslations('Status');

    const [formData, setFormData] = useState({
        name: '',
        url: '',
        amount: '',
        currency: 'USD',
        billingCycle: 'MONTHLY',
        status: 'ACTIVE',
        notes: '',
    });
    const [currencies, setCurrencies] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const router = useRouter();

    useEffect(() => {
        getCurrencies().then(res => setCurrencies(res.currencies || []));
    }, []);

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
        setLoading(true);
        try {
            const payload = {
                name:         formData.name,
                amount:       Number(formData.amount),
                currency:     formData.currency,
                billingCycle: formData.billingCycle,
                status:       formData.status,
                url:          formData.url || undefined,
                notes:        formData.notes || undefined,
            };
            await createSubscription(payload);
            router.push('/dashboard');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const BILLING_CYCLES = ['MONTHLY', 'YEARLY', 'WEEKLY', 'DAILY'];
    const STATUSES = ['ACTIVE', 'TRIAL', 'PAUSED'];

    return (
        <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1">
                <div className="container mx-auto py-8 max-w-lg flex flex-col gap-6">
                    <Button variant="ghost" size="sm" asChild className="w-fit -ml-2">
                        <Link href="/dashboard">
                            <ArrowLeft data-icon="inline-start" />
                            {t('backToList')}
                        </Link>
                    </Button>

                    <Card>
                        <CardHeader>
                            <CardTitle>{t('new')}</CardTitle>
                            <CardDescription>{t('newDescription')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                                {error && (
                                    <Alert variant="destructive">
                                        <AlertCircle />
                                        <AlertTitle>{t('nameAndAmountRequired')}</AlertTitle>
                                        <AlertDescription>{error}</AlertDescription>
                                    </Alert>
                                )}
                                <FieldGroup>
                                    <Field>
                                        <FieldLabel htmlFor="name">{t('name')} *</FieldLabel>
                                        <Input
                                            id="name" name="name" type="text"
                                            value={formData.name} onChange={handleChange}
                                            placeholder={t('namePlaceholder')} required
                                        />
                                    </Field>
                                    <Field>
                                        <FieldLabel htmlFor="url">{t('url')}</FieldLabel>
                                        <Input
                                            id="url" name="url" type="url"
                                            value={formData.url} onChange={handleChange}
                                            placeholder={t('urlPlaceholder')}
                                        />
                                    </Field>
                                    <Field>
                                        <FieldLabel htmlFor="amount">{t('amount')} *</FieldLabel>
                                        <Input
                                            id="amount" name="amount" type="number"
                                            min="0" step="0.01"
                                            value={formData.amount} onChange={handleChange}
                                            placeholder={t('amountPlaceholder')} required
                                        />
                                    </Field>
                                    <Field>
                                        <FieldLabel>{t('currency')}</FieldLabel>
                                        <Select
                                            name="currency" defaultValue={formData.currency}
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
                                            name="billingCycle" defaultValue={formData.billingCycle}
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
                                            name="status" defaultValue={formData.status}
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
                                            value={formData.notes} onChange={handleChange}
                                            placeholder={t('notesPlaceholder')} rows={3}
                                        />
                                    </Field>
                                </FieldGroup>
                                <div className="flex gap-3">
                                    <Button type="submit" disabled={loading} className="flex-1">
                                        {loading ? t('creating') : t('createButton')}
                                    </Button>
                                    <Button type="button" variant="outline" onClick={() => router.push('/dashboard')} disabled={loading}>
                                        {tCommon('cancel')}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
