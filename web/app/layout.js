import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata = {
    title: "Nook",
    description: "Track and manage all your subscriptions in one place",
};

export default async function RootLayout({ children }) {
    const locale   = await getLocale();
    const messages = await getMessages();

    // Read at request time (this layout renders dynamically via next-intl), so
    // the same standalone build/image works in any environment — see the /api
    // proxy for the same runtime-config approach.
    const umamiSrc       = process.env.UMAMI_SCRIPT_URL;
    const umamiWebsiteId = process.env.UMAMI_WEBSITE_ID;

    return (
        <html
            lang={locale}
            className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
            suppressHydrationWarning
        >
            <body className="h-full bg-background text-foreground" suppressHydrationWarning>
                <ThemeProvider>
                    <NextIntlClientProvider locale={locale} messages={messages}>
                        {children}
                    </NextIntlClientProvider>
                </ThemeProvider>
                {umamiSrc && umamiWebsiteId && (
                    <Script
                        src={umamiSrc}
                        data-website-id={umamiWebsiteId}
                        strategy="afterInteractive"
                    />
                )}
            </body>
        </html>
    );
}
