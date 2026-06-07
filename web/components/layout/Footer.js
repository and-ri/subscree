'use client';

import { useTranslations } from 'next-intl';
import { Separator } from "@/components/ui/separator";

export function Footer() {
    const t = useTranslations('Footer');
    const year = new Date().getFullYear();

    return (
        <footer className="mt-auto">
            <Separator />
            <div className="container mx-auto flex items-center justify-between h-14">
                <p className="text-sm text-muted-foreground">
                    © {year} Subscription Manager
                </p>
                <p className="text-sm text-muted-foreground">
                    {t('tagline')}
                </p>
            </div>
        </footer>
    );
}
