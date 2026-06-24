'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { getMe, updateMe, updatePassword, getCurrencies, deleteAccount, restoreAccount } from "@/lib/api";
import { ArrowLeft, CheckCircle2, Sun, Moon, Monitor, Trash2, AlertTriangle } from "lucide-react";

function signOut() {
    document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    window.location.href = '/login';
}

function SuccessAlert({ message }) {
    return (
        <Alert className="border-green-500 text-green-700 bg-green-50 dark:bg-green-950 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4 !text-green-600" />
            <AlertDescription>{message}</AlertDescription>
        </Alert>
    );
}

const THEME_OPTIONS = [
    { value: 'light', icon: Sun },
    { value: 'dark', icon: Moon },
    { value: 'system', icon: Monitor },
];

export default function SettingsPage() {
    const t = useTranslations('Settings');
    const tLang = useTranslations('Language');
    const { theme, setTheme } = useTheme();

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

    // Notifications
    const [notifyEnabled, setNotifyEnabled] = useState(false);
    const [notifyDaysBefore, setNotifyDaysBefore] = useState(3);
    const [remindBefore, setRemindBefore] = useState(true);
    const [remindOnDueDate, setRemindOnDueDate] = useState(false);
    const [weeklySummary, setWeeklySummary] = useState(false);
    const [notifyLoading, setNotifyLoading] = useState(false);
    const [notifyError, setNotifyError] = useState(null);
    const [notifySuccess, setNotifySuccess] = useState(false);

    // Account deletion
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');
    const [deleteError, setDeleteError] = useState(null);
    const [deleteBusy, setDeleteBusy] = useState(false);
    const [restoreBusy, setRestoreBusy] = useState(false);

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
                setNotifyEnabled(userRes.user.notifyEnabled ?? false);
                setNotifyDaysBefore(userRes.user.notifyDaysBefore ?? 3);
                setRemindBefore(userRes.user.remindBefore ?? true);
                setRemindOnDueDate(userRes.user.remindOnDueDate ?? false);
                setWeeklySummary(userRes.user.weeklySummary ?? false);
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
            document.cookie = `locale=${prefLocale}; path=/; max-age=31536000`;
            setPrefSuccess(true);
            setTimeout(() => window.location.reload(), 800);
        } catch (err) {
            setPrefError(err.message);
        } finally {
            setPrefLoading(false);
        }
    };

    const handleNotificationsSave = async (e) => {
        e.preventDefault();
        setNotifyError(null);
        setNotifySuccess(false);
        setNotifyLoading(true);
        try {
            const res = await updateMe({
                notifyEnabled,
                notifyDaysBefore: Number(notifyDaysBefore),
                remindBefore,
                remindOnDueDate,
                weeklySummary,
            });
            setUser(res.user);
            setNotifySuccess(true);
        } catch (err) {
            setNotifyError(err.message);
        } finally {
            setNotifyLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        setDeleteError(null);
        setDeleteBusy(true);
        try {
            await deleteAccount(deletePassword);
            signOut(); // navigates away; account is restorable for 7 days
        } catch (err) {
            setDeleteError(err.message);
            setDeleteBusy(false);
        }
    };

    const handleRestore = async () => {
        setRestoreBusy(true);
        try {
            const res = await restoreAccount();
            setUser(res.user);
        } catch { /* ignore */ } finally {
            setRestoreBusy(false);
        }
    };

    // Locale-formatted purge date (request + 7 days) for the restore banner.
    const purgeDate = user?.deletionRequestedAt
        ? new Date(new Date(user.deletionRequestedAt).getTime() + 7 * 86400000)
            .toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
        : null;

    return (
        <div className="container mx-auto py-8 max-w-2xl flex flex-col gap-6">
            <Button variant="ghost" size="sm" asChild className="w-fit -ml-2">
                <Link href="/dashboard">
                    <ArrowLeft data-icon="inline-start" />
                    {t('backToDashboard')}
                </Link>
            </Button>

            <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>

            {user?.deletionRequestedAt && (
                <Alert variant="destructive" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <AlertDescription>
                        {t('deletionScheduled', { date: purgeDate })}
                    </AlertDescription>
                    <Button size="sm" variant="outline" onClick={handleRestore} disabled={restoreBusy} className="w-fit shrink-0">
                        {restoreBusy ? t('restoring') : t('restoreAccount')}
                    </Button>
                </Alert>
            )}

            {loading ? (
                <div className="flex flex-col gap-4">
                    {[1, 2, 3, 4].map(i => (
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
                    {/* Appearance */}
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('appearance')}</CardTitle>
                            <CardDescription>{t('appearanceDescription')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex gap-3">
                                {THEME_OPTIONS.map(({ value, icon: Icon }) => (
                                    <Button
                                        key={value}
                                        variant={theme === value ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setTheme(value)}
                                        className="flex-1 gap-2"
                                    >
                                        <Icon className="h-4 w-4" />
                                        {t(`theme${value.charAt(0).toUpperCase()}${value.slice(1)}`)}
                                    </Button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

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

                    {/* Notifications */}
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('notifications')}</CardTitle>
                            <CardDescription>{t('notificationsDescription')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleNotificationsSave} className="flex flex-col gap-4">
                                {notifyError && (
                                    <Alert variant="destructive">
                                        <AlertDescription>{notifyError}</AlertDescription>
                                    </Alert>
                                )}
                                {notifySuccess && <SuccessAlert message={t('notificationsSaved')} />}
                                <FieldGroup>
                                    <Field>
                                        <FieldLabel>{t('notifyEnabled')}</FieldLabel>
                                        <Select value={notifyEnabled ? 'on' : 'off'} onValueChange={v => setNotifyEnabled(v === 'on')}>
                                            <SelectTrigger className="w-full">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectGroup>
                                                    <SelectItem value="on">{t('notifyOn')}</SelectItem>
                                                    <SelectItem value="off">{t('notifyOff')}</SelectItem>
                                                </SelectGroup>
                                            </SelectContent>
                                        </Select>
                                    </Field>

                                    <Field>
                                        <FieldLabel>{t('remindBefore')}</FieldLabel>
                                        <Select value={remindBefore ? 'on' : 'off'} onValueChange={v => setRemindBefore(v === 'on')}>
                                            <SelectTrigger className="w-full">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectGroup>
                                                    <SelectItem value="on">{t('notifyOn')}</SelectItem>
                                                    <SelectItem value="off">{t('notifyOff')}</SelectItem>
                                                </SelectGroup>
                                            </SelectContent>
                                        </Select>
                                    </Field>
                                    {remindBefore && (
                                        <Field>
                                            <FieldLabel htmlFor="notifyDaysBefore">{t('notifyDaysBefore')}</FieldLabel>
                                            <Input
                                                id="notifyDaysBefore"
                                                type="number"
                                                min={1}
                                                max={60}
                                                value={notifyDaysBefore}
                                                onChange={e => setNotifyDaysBefore(e.target.value)}
                                            />
                                        </Field>
                                    )}

                                    <Field>
                                        <FieldLabel>{t('remindOnDueDate')}</FieldLabel>
                                        <Select value={remindOnDueDate ? 'on' : 'off'} onValueChange={v => setRemindOnDueDate(v === 'on')}>
                                            <SelectTrigger className="w-full">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectGroup>
                                                    <SelectItem value="on">{t('notifyOn')}</SelectItem>
                                                    <SelectItem value="off">{t('notifyOff')}</SelectItem>
                                                </SelectGroup>
                                            </SelectContent>
                                        </Select>
                                    </Field>

                                    <Field>
                                        <FieldLabel>{t('weeklySummary')}</FieldLabel>
                                        <Select value={weeklySummary ? 'on' : 'off'} onValueChange={v => setWeeklySummary(v === 'on')}>
                                            <SelectTrigger className="w-full">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectGroup>
                                                    <SelectItem value="on">{t('notifyOn')}</SelectItem>
                                                    <SelectItem value="off">{t('notifyOff')}</SelectItem>
                                                </SelectGroup>
                                            </SelectContent>
                                        </Select>
                                    </Field>

                                    <p className="text-xs text-muted-foreground">
                                        {t('remindersDeliveryNote')}
                                        {user?.timezone ? ` (${user.timezone})` : ''}
                                    </p>
                                </FieldGroup>
                                <Button type="submit" disabled={notifyLoading} className="w-fit">
                                    {notifyLoading ? t('savingNotifications') : t('saveNotifications')}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Danger zone */}
                    <Card className="border-destructive/40">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-destructive">
                                <AlertTriangle className="h-4 w-4" />
                                {t('dangerZone')}
                            </CardTitle>
                            <CardDescription>{t('deleteAccountDesc')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <AlertDialog
                                open={deleteOpen}
                                onOpenChange={(o) => {
                                    setDeleteOpen(o);
                                    if (!o) { setDeletePassword(''); setDeleteError(null); }
                                }}
                            >
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" disabled={!!user?.deletionRequestedAt}>
                                        <Trash2 data-icon="inline-start" />
                                        {t('deleteAccount')}
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>{t('deleteAccountConfirmTitle')}</AlertDialogTitle>
                                        <AlertDialogDescription>{t('deleteAccountConfirmBody')}</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <Field>
                                        <FieldLabel htmlFor="deletePassword">{t('deleteAccountPasswordLabel')}</FieldLabel>
                                        <Input
                                            id="deletePassword"
                                            type="password"
                                            autoComplete="current-password"
                                            value={deletePassword}
                                            onChange={e => setDeletePassword(e.target.value)}
                                        />
                                        {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
                                    </Field>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={(e) => { e.preventDefault(); handleDeleteAccount(); }}
                                            disabled={deleteBusy || !deletePassword}
                                            className="bg-destructive text-white hover:bg-destructive/90"
                                        >
                                            {deleteBusy ? t('deleting') : t('deleteAccountAction')}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}
