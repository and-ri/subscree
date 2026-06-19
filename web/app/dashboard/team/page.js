'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
    getTeams, getTeamMembers, inviteMember, revokeInvitation,
    removeMember, leaveTeam, createTeam, renameTeam, deleteTeam, activateTeam,
} from '@/lib/api';
import { Users, Mail, Trash2, LogOut, Check } from 'lucide-react';

export default function TeamPage() {
    const t = useTranslations('Team');

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [notice, setNotice] = useState(null);

    const [teams, setTeams] = useState([]);
    const [activeTeamId, setActiveTeamId] = useState(null);
    const [role, setRole] = useState('MEMBER');
    const [members, setMembers] = useState([]);
    const [invitations, setInvitations] = useState([]);

    const [teamName, setTeamName] = useState('');
    const [inviteEmail, setInviteEmail] = useState('');
    const [newTeamName, setNewTeamName] = useState('');
    const [busy, setBusy] = useState(false);

    const isOwner = role === 'OWNER';
    const activeTeam = teams.find(x => x.id === activeTeamId) || null;

    const load = async () => {
        setError(null);
        try {
            const t1 = await getTeams();
            setTeams(t1.teams || []);
            setActiveTeamId(t1.activeTeamId ?? null);
            const active = (t1.teams || []).find(x => x.id === t1.activeTeamId) || (t1.teams || [])[0];
            if (active) {
                setTeamName(active.name);
                const m = await getTeamMembers(active.id);
                setRole(m.role);
                setMembers(m.members || []);
                setInvitations(m.invitations || []);
            }
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const run = async (fn, successMsg) => {
        setError(null); setNotice(null); setBusy(true);
        try {
            await fn();
            if (successMsg) setNotice(successMsg);
            await load();
        } catch (e) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    };

    const handleInvite = (e) => {
        e.preventDefault();
        if (!inviteEmail) return;
        run(async () => {
            const res = await inviteMember(activeTeamId, inviteEmail);
            setInviteEmail('');
            return res;
        }, t('inviteSent'));
    };

    const handleSwitch = (id) => run(async () => {
        await activateTeam(id);
        window.location.reload();
    });

    if (loading) {
        return (
            <div className="container mx-auto py-8 max-w-3xl flex flex-col gap-6">
                <Skeleton className="h-8 w-40" />
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-40 w-full" />
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8 max-w-3xl flex flex-col gap-6">
            <div className="flex items-center gap-2">
                <Users className="h-6 w-6" />
                <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
            </div>
            <p className="text-muted-foreground text-sm -mt-4">{t('description')}</p>

            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
            {notice && (
                <Alert className="border-green-500 text-green-700 bg-green-50 dark:bg-green-950 dark:text-green-400">
                    <Check className="h-4 w-4 !text-green-600" />
                    <AlertDescription>{notice}</AlertDescription>
                </Alert>
            )}

            {/* Current team */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        {activeTeam?.name}
                        <Badge variant={isOwner ? 'default' : 'outline'}>{t(`role.${role}`)}</Badge>
                    </CardTitle>
                    <CardDescription>{t('currentTeamDesc')}</CardDescription>
                </CardHeader>
                {isOwner && (
                    <CardContent>
                        <form
                            onSubmit={(e) => { e.preventDefault(); run(() => renameTeam(activeTeamId, teamName), t('renamed')); }}
                            className="flex items-end gap-2"
                        >
                            <Field className="flex-1">
                                <FieldLabel htmlFor="teamName">{t('teamName')}</FieldLabel>
                                <Input id="teamName" value={teamName} onChange={e => setTeamName(e.target.value)} />
                            </Field>
                            <Button type="submit" disabled={busy} variant="outline">{t('rename')}</Button>
                        </form>
                    </CardContent>
                )}
            </Card>

            {/* Members */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">{t('members')}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                    {members.map(m => (
                        <div key={m.userId} className="flex items-center justify-between border-b last:border-0 py-2">
                            <div className="flex flex-col">
                                <span className="font-medium text-sm">{m.name}</span>
                                <span className="text-xs text-muted-foreground">{m.email}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant={m.role === 'OWNER' ? 'default' : 'outline'} className="text-xs">{t(`role.${m.role}`)}</Badge>
                                {isOwner && (
                                    <Button
                                        size="sm" variant="ghost" disabled={busy}
                                        onClick={() => { if (confirm(t('removeConfirm', { name: m.name }))) run(() => removeMember(activeTeamId, m.userId), t('memberRemoved')); }}
                                    >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* Invite + pending (owner only) */}
            {isOwner && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t('invite')}</CardTitle>
                        <CardDescription>{t('inviteDesc')}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                        <form onSubmit={handleInvite} className="flex items-end gap-2">
                            <Field className="flex-1">
                                <FieldLabel htmlFor="inviteEmail">{t('email')}</FieldLabel>
                                <Input id="inviteEmail" type="email" placeholder="name@example.com"
                                       value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
                            </Field>
                            <Button type="submit" disabled={busy}>
                                <Mail className="h-4 w-4" /> {t('inviteButton')}
                            </Button>
                        </form>

                        {invitations.length > 0 && (
                            <div className="flex flex-col gap-1">
                                <p className="text-xs font-medium text-muted-foreground">{t('pendingInvites')}</p>
                                {invitations.map(inv => (
                                    <div key={inv.id} className="flex items-center justify-between border-b last:border-0 py-2 text-sm">
                                        <span>{inv.email}</span>
                                        <Button size="sm" variant="ghost" disabled={busy}
                                                onClick={() => run(() => revokeInvitation(activeTeamId, inv.id), t('inviteRevoked'))}>
                                            {t('revoke')}
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Your teams / switch / create */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">{t('yourTeams')}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                    {teams.map(tm => (
                        <div key={tm.id} className="flex items-center justify-between border-b last:border-0 py-2">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{tm.name}</span>
                                {tm.isActive && <Badge variant="secondary" className="text-xs">{t('active')}</Badge>}
                                <span className="text-xs text-muted-foreground">{t('memberCount', { count: tm.memberCount })}</span>
                            </div>
                            {!tm.isActive && (
                                <Button size="sm" variant="outline" disabled={busy} onClick={() => handleSwitch(tm.id)}>
                                    {t('switchTo')}
                                </Button>
                            )}
                        </div>
                    ))}

                    <form
                        onSubmit={(e) => { e.preventDefault(); if (!newTeamName) return; run(async () => { await createTeam(newTeamName); setNewTeamName(''); window.location.reload(); }); }}
                        className="flex items-end gap-2 pt-2"
                    >
                        <Field className="flex-1">
                            <FieldLabel htmlFor="newTeam">{t('createTeam')}</FieldLabel>
                            <Input id="newTeam" placeholder={t('createPlaceholder')} value={newTeamName} onChange={e => setNewTeamName(e.target.value)} />
                        </Field>
                        <Button type="submit" disabled={busy} variant="outline">{t('create')}</Button>
                    </form>
                </CardContent>
            </Card>

            {/* Danger zone */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">{t('dangerZone')}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-3">
                    <Button
                        variant="outline" disabled={busy}
                        onClick={() => { if (confirm(t('leaveConfirm'))) run(async () => { await leaveTeam(activeTeamId); window.location.reload(); }); }}
                    >
                        <LogOut className="h-4 w-4" /> {t('leave')}
                    </Button>
                    {isOwner && (
                        <Button
                            variant="destructive" disabled={busy}
                            onClick={() => { if (confirm(t('deleteConfirm'))) run(async () => { await deleteTeam(activeTeamId); window.location.reload(); }); }}
                        >
                            <Trash2 className="h-4 w-4" /> {t('deleteTeam')}
                        </Button>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
