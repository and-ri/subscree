'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from 'next-intl';
import { Header } from "@/components/layout/Header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { getMe, updateMe, updatePassword, getCurrencies } from "@/lib/api";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

function SuccessAlert({ message }) {
    return (
        <Alert className="border-green-500 text-green-700 bg-green-50 dark:bg-green-950 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4 !text-green-600" />
            <AlertDescription>{message}</AlertDescription>
        </Alert>
    );
}

export default function SettingsPage() {
    const t = useTranslations('Settings');
    const tLang = useTranslations('Language');

    const [user, setUser] = useState(null);
    const [currencies, setCurrencies] = useState([]);
    const [loading, setLoading] = useState(true);

    // Profile
    const [profileName, setProfileName] = useState('');
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileError, setProfileError] = useState(null);
    const [profileSuccess, setProfileSuccess] = useState(false);

    // Password
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordError, setPasswordError] = useState(null);
    const [passwordSuccess, setPasswordSuccess] = useState(false);

    // Preferences
    const [prefCurrency, setPrefCurrency] = useState('');
    const [prefLocale, setPrefLocale] = useState('en');
    const [prefLoading, setPrefLoading] = useState(false);
    const [prefError, setPrefError] = useState(null);
    const [prefSuccess, setPrefSuccess] = useState(false);

    useEffect(() => {
        const currentLocale = document.cookie
            .split('; ')
            .find(r => r.startsWith('locale='))
            ?.split('=')[1] ?? 'en';
        setPrefLocale(currentLocale);

        Promise.all([getMe(), getCurrencies()])
            .then(([userRes, currRes]) => {
                setUser(userRes.user);
                setProfileName(userRes.user.name);
                setPrefCurrency(userRes.user.preferredCurrency);
                setCurrencies(currRes.currencies || []);
            })
            .finally(() => setLoading(false));
    }, []);

    const handleProfileSave = async (e) => {
        e.preventDefault();
        setProfileError(null);
        setProfileSuccess(false);
        setProfileLoading(true);
        try {
            const res = await updateMe({ name: profileName });
            setUser(res.user);
            setProfileSuccess(true);
        } catch (err) {
            setProfileError(err.message);
        } finally {
            setProfileLoading(false);
        }
    };

    const handlePasswordSave = async (e) => {
        e.preventDefault();
        setPasswordError(null);
        setPasswordSuccess(false);
        setPasswordLoading(true);
        try {
            await updatePassword({ currentPassword, newPassword });
            setCurrentPassword('');
            setNewPassword('');
            setPasswordSuccess(true);
        } catch (err) {
            setPasswordError(err.message);
        } finally {
            setPasswordLoading(false);
        }
    };

    const handlePrefSave = async (e) => {
        e.preventDefault();
        setPrefError(null);
        setPrefSuccess(false);
        setPrefLoading(true);
        try {
            const res = await updateMe({ preferredCurrency: prefCurrency });
            setUser(res.user);

            // Persist locale in cookie and reload so next-intl picks it up
            document.cookie = `locale=${prefLocale}; path=/; max-age=31536000`;
            setPrefSuccess(true);

            // Reload page so server-side locale changes take effect
            setTimeout(() => window.location.reload(), 800);
        } catch (err) {
            setPrefError(err.message);
        } finally {
            setPrefLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1">
                <div className="container mx-auto py-8 max-w-2xl flex flex-col gap-6">
                    <Button variant="ghost" size="sm" asChild className="w-fit -ml-2">
                        <Link href="/dashboard">
                            <ArrowLeft data-icon="inline-start" />
                            {t('backToDashboard')}
                        </Link>
                    </Button>

                    <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>

                    {loading ? (
                        <div className="flex flex-col gap-4">
                            {[1, 2, 3].map(i => (
                                <Card key={i}>
                                    <CardHeader>
                                        <Skeleton className="h-5 w-1/4" />
                                        <Skeleton className="h-4 w-1/2" />
                                    </CardHeader>
                                    <CardContent className="flex flex-col gap-4">
                                        <Skeleton className="h-10 w-full" />
                                        <Skeleton className="h-9 w-32" />
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <>
                            {/* Profile */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>{t('profile')}</CardTitle>
                                    <CardDescription>{t('profileDescription')}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <form onSubmit={handleProfileSave} className="flex flex-col gap-4">
                                        {profileError && (
                                            <Alert variant="destructive">
                                                <AlertDescription>{profileError}</AlertDescription>
                                            </Alert>
                                        )}
                                        {profileSuccess && <SuccessAlert message={t('profileSaved')} />}
                                        <FieldGroup>
                                            <Field>
                                                <FieldLabel htmlFor="displayName">{t('displayName')}</FieldLabel>
                                                <Input
                                                    id="displayName"
                                                    value={profileName}
                                                    onChange={e => setProfileName(e.target.value)}
                                                    required
                                                />
                                            </Field>
                                            <Field>
                                                <FieldLabel>Email</FieldLabel>
                                                <Input value={user?.email ?? ''} disabled />
                                            </Field>
                                        </FieldGroup>
                                        <Button type="submit" disabled={profileLoading} className="w-fit">
                                            {profileLoading ? t('savingProfile') : t('saveProfile')}
                                        </Button>
                                    </form>
                                </CardContent>
                            </Card>

                            {/* Password */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>{t('password')}</CardTitle>
                                    <CardDescription>{t('passwordDescription')}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <form onSubmit={handlePasswordSave} className="flex flex-col gap-4">
                                        {passwordError && (
                                            <Alert variant="destructive">
                                                <AlertDescription>{passwordError}</AlertDescription>
                                            </Alert>
                                        )}
                                        {passwordSuccess && <SuccessAlert message={t('passwordSaved')} />}
                                        <FieldGroup>
                                            <Field>
                                                <FieldLabel htmlFor="currentPassword">{t('currentPassword')}</FieldLabel>
                                                <Input
                                                    id="currentPassword"
                                                    type="password"
                                                    value={currentPassword}
                                                    onChange={e => setCurrentPassword(e.target.value)}
                                                    required
                                                />
                                            </Field>
                                            <Field>
                                                <FieldLabel htmlFor="newPassword">{t('newPassword')}</FieldLabel>
                                                <Input
                                                    id="newPassword"
                                                    type="password"
                                                    value={newPassword}
                                                    onChange={e => setNewPassword(e.target.value)}
                                                    required
                                                    minLength={8}
                                                />
                                            </Field>
                                        </FieldGroup>
                                        <Button type="submit" disabled={passwordLoading} className="w-fit">
                                            {passwordLoading ? t('savingPassword') : t('savePassword')}
                                        </Button>
                                    </form>
                                </CardContent>
                            </Card>

                            {/* Preferences */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>{t('preferences')}</CardTitle>
                                    <CardDescription>{t('preferencesDescription')}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <form onSubmit={handlePrefSave} className="flex flex-col gap-4">
                                        {prefError && (
                                            <Alert variant="destructive">
                                                <AlertDescription>{prefError}</AlertDescription>
                                            </Alert>
                                        )}
                                        {prefSuccess && <SuccessAlert message={t('preferencesSaved')} />}
                                        <FieldGroup>
                                            <Field>
                                                <FieldLabel>{t('language')}</FieldLabel>
                                                <Select value={prefLocale} onValueChange={setPrefLocale}>
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectGroup>
                                                            <SelectItem value="en">{tLang('en')}</SelectItem>
                                                            <SelectItem value="uk">{tLang('uk')}</SelectItem>
                                                        </SelectGroup>
                                                    </SelectContent>
                                                </Select>
                                            </Field>
                                            <Field>
                                                <FieldLabel>{t('preferredCurrency')}</FieldLabel>
                                                <Select value={prefCurrency} onValueChange={setPrefCurrency}>
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue />
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
                                        </FieldGroup>
                                        <Button type="submit" disabled={prefLoading} className="w-fit">
                                            {prefLoading ? t('savingPreferences') : t('savePreferences')}
                                        </Button>
                                    </form>
                                </CardContent>
                            </Card>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
