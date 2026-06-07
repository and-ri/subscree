import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import "./globals.css";
import { Footer } from "@/components/layout/Footer";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata = {
    title: "Subscription Manager",
    description: "Track and manage all your subscriptions in one place",
};

export default async function RootLayout({ children }) {
    const locale = await getLocale();
    const messages = await getMessages();

    return (
        <html
            lang={locale}
            className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
        >
            <body className="min-h-full flex flex-col" suppressHydrationWarning>
                <NextIntlClientProvider locale={locale} messages={messages}>
                    {children}
                    <Footer />
                </NextIntlClientProvider>
            </body>
        </html>
    );
}
