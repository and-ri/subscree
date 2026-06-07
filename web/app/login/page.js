'use client';

import { fetchApi } from "@/lib/api";
import { useState } from "react";
import { useTranslations } from 'next-intl';
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldSet, FieldLegend } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
    const t = useTranslations('Auth');

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email || !password) {
            setError('Please enter both email and password');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const response = await fetchApi('/auth/login', {
                method: 'POST',
                body: { email, password },
            });
            document.cookie = `token=${response.token}; path=/; max-age=604800`;
            router.push('/dashboard');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="w-full max-w-md p-8 border rounded-lg">
                <form onSubmit={handleSubmit}>
                    <FieldGroup>
                        <FieldSet>
                            <FieldLegend>{t('loginTitle')}</FieldLegend>
                            <FieldDescription>{t('loginDescription')}</FieldDescription>
                            {error && (
                                <Alert variant="destructive">
                                    <AlertTitle>{t('loginFailed')}</AlertTitle>
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}
                            <FieldGroup>
                                <Field>
                                    <FieldLabel htmlFor="input-email">{t('email')}</FieldLabel>
                                    <Input
                                        id="input-email" type="email"
                                        value={email} onChange={e => setEmail(e.target.value)}
                                    />
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor="input-password">{t('password')}</FieldLabel>
                                    <Input
                                        id="input-password" type="password"
                                        value={password} onChange={e => setPassword(e.target.value)}
                                    />
                                </Field>
                            </FieldGroup>
                        </FieldSet>
                    </FieldGroup>
                    <Button type="submit" disabled={loading} className="mt-4 w-full">
                        {loading ? t('loggingIn') : t('login')}
                    </Button>
                    <Link href="/register" className="block text-center mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors">
                        {t('noAccount')}
                    </Link>
                </form>
            </div>
        </div>
    );
}
