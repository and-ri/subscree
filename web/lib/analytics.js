'use client';

// Thin wrapper around the Umami tracker (window.umami), injected by the
// <Script> tag in app/layout.js when UMAMI_SCRIPT_URL / UMAMI_WEBSITE_ID are
// configured. Every helper is a no-op when the script is absent (analytics
// disabled, SSR, or not yet loaded) and never throws — analytics must never
// break the app.

function umami() {
    return typeof window !== 'undefined' ? window.umami : null;
}

// Fire a custom event. `data` is an optional flat object of properties.
export function trackEvent(name, data) {
    const u = umami();
    if (!u || !name) return;
    try {
        data ? u.track(name, data) : u.track(name);
    } catch { /* ignore */ }
}

// Associate the current session with a known user. Sent on login and on every
// authenticated page load (see AnalyticsUser).
export function identifyUser(id, properties = {}) {
    const u = umami();
    if (!u || !id) return;
    try {
        u.identify(String(id), properties);
    } catch { /* ignore */ }
}

// Resource path segments we recognise. Anything else (uuids, ids) is collapsed
// to ":id" so a request path maps to a stable, semantic event name.
const VOCAB = new Set([
    'subscriptions', 'categories', 'payment-methods', 'currencies', 'stats',
    'teams', 'invitations', 'members', 'leave', 'activate', 'accept',
    'auth', 'login', 'register', 'forgot-password', 'reset-password', 'invitation',
    'users', 'me', 'password',
]);

function normalizePath(path) {
    return (
        '/' +
        path
            .split('?')[0]
            .split('/')
            .filter(Boolean)
            .map(seg => (VOCAB.has(seg) ? seg : ':id'))
            .join('/')
    );
}

// Maps `${METHOD} ${normalizedPath}` to a human-friendly event name. Reads
// (GET) and unknown endpoints return null and emit no custom event — Umami's
// automatic pageview tracking covers navigation already.
const EVENTS = {
    'POST /subscriptions': 'subscription_created',
    'PATCH /subscriptions/:id': 'subscription_updated',
    'DELETE /subscriptions/:id': 'subscription_deleted',

    'POST /categories': 'category_created',
    'PATCH /categories/:id': 'category_updated',
    'DELETE /categories/:id': 'category_deleted',

    'POST /payment-methods': 'payment_method_created',
    'PATCH /payment-methods/:id': 'payment_method_updated',
    'DELETE /payment-methods/:id': 'payment_method_deleted',

    'POST /teams': 'team_created',
    'PATCH /teams/:id': 'team_renamed',
    'DELETE /teams/:id': 'team_deleted',
    'POST /teams/:id/activate': 'team_switched',
    'POST /teams/:id/leave': 'team_left',
    'POST /teams/:id/invitations': 'team_member_invited',
    'DELETE /teams/:id/invitations/:id': 'team_invitation_revoked',
    'DELETE /teams/:id/members/:id': 'team_member_removed',
    'POST /teams/invitations/accept': 'team_invitation_accepted',

    'POST /auth/login': 'login',
    'POST /auth/register': 'signup',
    'POST /auth/forgot-password': 'password_forgot_requested',
    'POST /auth/reset-password': 'password_reset',

    'PATCH /users/me': 'profile_updated',
    'PATCH /users/me/password': 'password_changed',
};

export function apiEventName(method, path) {
    return EVENTS[`${method} ${normalizePath(path)}`] ?? null;
}

// Events for which it is safe and useful to attach the set of changed field
// NAMES (never values). Excludes auth/password endpoints whose bodies hold
// credentials.
const FIELD_EVENTS = new Set([
    'subscription_created', 'subscription_updated',
    'category_created', 'category_updated',
    'payment_method_created', 'payment_method_updated',
    'team_created', 'team_renamed', 'team_member_invited',
    'profile_updated',
]);

export function eventDataForBody(eventName, body) {
    if (!FIELD_EVENTS.has(eventName) || !body || typeof body !== 'object') return undefined;
    const fields = Object.keys(body);
    return fields.length ? { fields: fields.join(',') } : undefined;
}
