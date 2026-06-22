'use client';

import { useEffect } from 'react';
import { getMe } from '@/lib/api';
import { identifyUser } from '@/lib/analytics';

// Re-associates the Umami session with the logged-in user on every
// authenticated page load (identity from login alone doesn't survive new
// sessions/devices). Mounted inside the dashboard layout where a token exists.
export function AnalyticsUser() {
    useEffect(() => {
        getMe()
            .then(({ user }) => {
                if (user) identifyUser(user.id, { email: user.email, name: user.name });
            })
            .catch(() => { /* unauthenticated or analytics off — ignore */ });
    }, []);

    return null;
}
