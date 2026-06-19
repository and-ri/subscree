import { Sidebar } from '@/components/layout/Sidebar';

export default function DashboardLayout({ children }) {
    return (
        <div className="flex h-dvh overflow-hidden">
            <Sidebar />
            {/* offset for mobile top bar */}
            <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
                {children}
            </main>
        </div>
    );
}
