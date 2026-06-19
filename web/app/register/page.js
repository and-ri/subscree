'use client';

import { register as registerUser, getInvitationInfo } from "@/lib/api";
import { useEffect, useState } from "react";
import { useTranslations } from 'next-intl';
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldSet, FieldLegend } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
    const t = useTranslations('Auth');

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [inviteToken, setInviteToken] = useState(null);
    const [emailLocked, setEmailLocked] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const token = new URLSearchParams(window.location.search).get('invite');
        if (!token) return;
        setInviteToken(token);
        getInvitationInfo(token)
            .then(info => { setEmail(info.email); setEmailLocked(true); })
            .catch(() => {});
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name || !email || !password || !confirmPassword) {
            setError(t('fillAllFields'));
            return;
        }
        if (password !== confirmPassword) {
            setError(t('passwordsDoNotMatch'));
            return;
        }
        setLoading(true);
        setError(null);
        try {
            await registerUser({ name, email, password, ...(inviteToken && { inviteToken }) });
            router.push(inviteToken ? `/login?invite=${encodeURIComponent(inviteToken)}` : '/login');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <div className="w-full max-w-md p-8 border rounded-lg">
                <form onSubmit={handleSubmit}>
                    <FieldGroup>
                        <FieldSet>
                            <FieldLegend>{t('registerTitle')}</FieldLegend>
                            <FieldDescription>{t('registerDescription')}</FieldDescription>
                            {error && (
                                <Alert variant="destructive">
                                    <AlertTitle>{t('registerFailed')}</AlertTitle>
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}
                            <FieldGroup>
                                <Field>
                                    <FieldLabel htmlFor="input-name">{t('name')}</FieldLabel>
                                    <Input
                                        id="input-name" type="text"
                                        value={name} onChange={e => setName(e.target.value)}
                                    />
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor="input-email">{t('email')}</FieldLabel>
                                    <Input
                                        id="input-email" type="email"
                                        value={email} onChange={e => setEmail(e.target.value)}
                                        disabled={emailLocked}
                                    />
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor="input-password">{t('password')}</FieldLabel>
                                    <Input
                                        id="input-password" type="password"
                                        value={password} onChange={e => setPassword(e.target.value)}
                                    />
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor="input-confirm">{t('confirmPassword')}</FieldLabel>
                                    <Input
                                        id="input-confirm" type="password"
                                        value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                                    />
                                </Field>
                            </FieldGroup>
                        </FieldSet>
                    </FieldGroup>
                    <Button type="submit" disabled={loading} className="mt-4 w-full">
                        {loading ? t('registering') : t('register')}
                    </Button>
                    <Link href="/login" className="block text-center mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors">
                        {t('haveAccount')}
                    </Link>
                </form>
            </div>
        </div>
    );
}
