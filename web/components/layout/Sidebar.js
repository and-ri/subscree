'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import {
    LayoutDashboard, BarChart2, Tag, Wallet, Settings,
    LogOut, Menu, X, Sun, Moon, Monitor, Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/Logo';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getTeams, activateTeam } from '@/lib/api';

function useNavItems() {
    const t = useTranslations('Nav');
    return [
        { href: '/dashboard',                 icon: LayoutDashboard, label: t('dashboard') },
        { href: '/dashboard/reports',         icon: BarChart2,       label: t('reports') },
        { href: '/dashboard/categories',      icon: Tag,             label: t('categories') },
        { href: '/dashboard/payment-methods', icon: Wallet,          label: t('paymentMethods') },
        { href: '/dashboard/team',            icon: Users,           label: t('team') },
        { href: '/dashboard/settings',        icon: Settings,        label: t('settings') },
    ];
}

function TeamSwitcher() {
    const t = useTranslations('Team');
    const [teams, setTeams] = useState([]);
    const [activeId, setActiveId] = useState(null);

    useEffect(() => {
        getTeams()
            .then(r => { setTeams(r.teams || []); setActiveId(r.activeTeamId ?? null); })
            .catch(() => {});
    }, []);

    if (teams.length === 0) return null;

    const handleChange = async (id) => {
        if (id === activeId) return;
        try { await activateTeam(id); window.location.reload(); } catch { /* ignore */ }
    };

    return (
        <div className="px-3 py-2 border-b">
            <Select value={activeId ?? undefined} onValueChange={handleChange}>
                <SelectTrigger className="w-full h-9">
                    <SelectValue placeholder={t('selectTeam')} />
                </SelectTrigger>
                <SelectContent>
                    <SelectGroup>
                        {teams.map(tm => (
                            <SelectItem key={tm.id} value={tm.id}>{tm.name}</SelectItem>
                        ))}
                    </SelectGroup>
                </SelectContent>
            </Select>
        </div>
    );
}

function ThemeCycleButton() {
    const { theme, setTheme } = useTheme();
    const cycle = { light: 'dark', dark: 'system', system: 'light' };
    const icons = { light: Sun, dark: Moon, system: Monitor };
    const Icon = icons[theme] ?? Monitor;

    return (
        <button
            onClick={() => setTheme(cycle[theme] ?? 'system')}
            className="flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            aria-label="Toggle theme"
        >
            <Icon className="h-4 w-4" />
        </button>
    );
}

function NavLink({ item, onClick }) {
    const pathname = usePathname();
    const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
    const Icon = item.icon;

    return (
        <Link
            href={item.href}
            onClick={onClick}
            className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            )}
        >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
        </Link>
    );
}

function SidebarContent({ onLinkClick }) {
    const t = useTranslations('Nav');
    const navItems = useNavItems();

    const handleLogout = () => {
        document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        window.location.href = '/login';
    };

    return (
        <div className="flex flex-col h-full">
            {/* Brand */}
            <div className="px-3 py-4 border-b">
                <Link href="/dashboard" onClick={onLinkClick} className="flex items-center gap-2">
                    <Logo className="h-6 w-6" />
                    <span className="font-bold text-sm">Nook</span>
                </Link>
            </div>

            {/* Team switcher */}
            <TeamSwitcher />

            {/* Nav */}
            <nav className="flex-1 px-2 py-4 flex flex-col gap-1 overflow-y-auto">
                {navItems.map(item => (
                    <NavLink key={item.href} item={item} onClick={onLinkClick} />
                ))}
            </nav>

            {/* Footer */}
            <div className="px-3 py-3 border-t flex items-center justify-between">
                <ThemeCycleButton />
                <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground">
                    <LogOut className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('logout')}</span>
                </Button>
            </div>
        </div>
    );
}

export function Sidebar() {
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <>
            {/* Desktop sidebar */}
            <aside className="hidden md:flex w-56 shrink-0 border-r flex-col h-full bg-background">
                <SidebarContent />
            </aside>

            {/* Mobile: top bar */}
            <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-14 border-b bg-background">
                <Link href="/dashboard" className="flex items-center gap-2 font-bold text-sm">
                    <Logo className="h-6 w-6" />
                    Nook
                </Link>
                <button
                    onClick={() => setMobileOpen(true)}
                    className="p-1.5 rounded-md hover:bg-accent"
                    aria-label="Open menu"
                >
                    <Menu className="h-5 w-5" />
                </button>
            </div>

            {/* Mobile: overlay */}
            {mobileOpen && (
                <div className="md:hidden fixed inset-0 z-50 flex">
                    <div
                        className="absolute inset-0 bg-black/40"
                        onClick={() => setMobileOpen(false)}
                    />
                    <aside className="relative w-64 bg-background h-full shadow-xl flex flex-col">
                        <div className="flex items-center justify-between px-4 h-14 border-b">
                            <span className="font-bold text-sm">Menu</span>
                            <button onClick={() => setMobileOpen(false)} className="p-1 rounded hover:bg-accent">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            <SidebarContent onLinkClick={() => setMobileOpen(false)} />
                        </div>
                    </aside>
                </div>
            )}
        </>
    );
}
