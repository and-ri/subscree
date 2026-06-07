'use client';

import Link from "next/link";
import { useTranslations } from 'next-intl';
import { Button } from "../ui/button";
import { Settings } from "lucide-react";

export const Header = () => {
    const t = useTranslations('Header');
    const tCommon = useTranslations('Common');

    const handleLogout = () => {
        document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        window.location.href = "/login";
    };

    return (
        <header className="bg-background border-b sticky top-0 z-10">
            <div className="container mx-auto flex items-center justify-between h-16">
                <Link href="/dashboard" className="text-xl font-bold tracking-tight">
                    {t('brand')}
                </Link>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" asChild>
                        <Link href="/dashboard/settings">
                            <Settings className="h-4 w-4" />
                            <span className="hidden sm:inline">{tCommon('settings')}</span>
                        </Link>
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleLogout}>
                        {tCommon('logout')}
                    </Button>
                </div>
            </div>
        </header>
    );
};
