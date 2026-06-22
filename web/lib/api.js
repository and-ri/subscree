'use client';

import { trackEvent, identifyUser, apiEventName, eventDataForBody } from '@/lib/analytics';

function getToken() {
    if (typeof document === 'undefined') return null;
    return document.cookie
        .split('; ')
        .find(row => row.startsWith('token='))
        ?.split('=')[1] ?? null;
}

export async function fetchApi(path, options = {}) {
    const url = `/api${path}`;
    const token = getToken();

    const method = options.method || 'GET';

    const response = await fetch(url, {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        },
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        // Surface failed auth funnel steps; the rest are covered on success below.
        const failed = apiEventName(method, path);
        if (failed === 'login' || failed === 'signup') {
            trackEvent(`${failed}_failed`, { status: response.status });
        }
        throw new Error(errorData.message || `Request failed: ${response.status}`);
    }

    const data = response.status === 204 ? null : await response.json();

    // Emit a semantic analytics event for every recognised mutation, and tie
    // the session to the user the moment they log in.
    const eventName = apiEventName(method, path);
    if (eventName) {
        trackEvent(eventName, eventDataForBody(eventName, options.body));
    }
    if (eventName === 'login' && data?.user) {
        identifyUser(data.user.id, { email: data.user.email, name: data.user.name });
    }

    return data;
}

// User
export const getMe = () => fetchApi('/users/me');
export const updateMe = (data) => fetchApi('/users/me', { method: 'PATCH', body: data });
export const updatePassword = (data) => fetchApi('/users/me/password', { method: 'PATCH', body: data });

// Password reset
export const forgotPassword = (email) => fetchApi('/auth/forgot-password', { method: 'POST', body: { email } });
export const resetPassword = (token, password) => fetchApi('/auth/reset-password', { method: 'POST', body: { token, password } });

// Invitations (public lookup) + auth
export const getInvitationInfo = (token) => fetchApi(`/auth/invitation/${encodeURIComponent(token)}`);
export const register = (data) => fetchApi('/auth/register', { method: 'POST', body: data });

// Teams
export const getTeams = () => fetchApi('/teams');
export const createTeam = (name) => fetchApi('/teams', { method: 'POST', body: { name } });
export const activateTeam = (id) => fetchApi(`/teams/${id}/activate`, { method: 'POST' });
export const renameTeam = (id, name) => fetchApi(`/teams/${id}`, { method: 'PATCH', body: { name } });
export const deleteTeam = (id) => fetchApi(`/teams/${id}`, { method: 'DELETE' });
export const getTeamMembers = (id) => fetchApi(`/teams/${id}/members`);
export const inviteMember = (id, email, role) => fetchApi(`/teams/${id}/invitations`, { method: 'POST', body: { email, ...(role && { role }) } });
export const revokeInvitation = (id, invitationId) => fetchApi(`/teams/${id}/invitations/${invitationId}`, { method: 'DELETE' });
export const removeMember = (id, userId) => fetchApi(`/teams/${id}/members/${userId}`, { method: 'DELETE' });
export const leaveTeam = (id) => fetchApi(`/teams/${id}/leave`, { method: 'POST' });
export const acceptInvitation = (token) => fetchApi('/teams/invitations/accept', { method: 'POST', body: { token } });

// Currencies
export const getCurrencies = () => fetchApi('/currencies');

// Subscriptions
export const getSubscriptions = (params = {}) => {
    const qs = new URLSearchParams(
        Object.fromEntries(Object.entries(params).filter(([, v]) => v != null))
    ).toString();
    return fetchApi(`/subscriptions${qs ? `?${qs}` : ''}`);
};
export const getSubscription = (id) => fetchApi(`/subscriptions/${id}`);
export const createSubscription = (data) => fetchApi('/subscriptions', { method: 'POST', body: data });
export const updateSubscription = (id, data) => fetchApi(`/subscriptions/${id}`, { method: 'PATCH', body: data });
export const deleteSubscription = (id) => fetchApi(`/subscriptions/${id}`, { method: 'DELETE' });
export const getStats = () => fetchApi('/subscriptions/stats');

// Categories
export const getCategories = () => fetchApi('/categories');
export const createCategory = (data) => fetchApi('/categories', { method: 'POST', body: data });
export const updateCategory = (id, data) => fetchApi(`/categories/${id}`, { method: 'PATCH', body: data });
export const deleteCategory = (id) => fetchApi(`/categories/${id}`, { method: 'DELETE' });

// Payment methods
export const getPaymentMethods = () => fetchApi('/payment-methods');
export const createPaymentMethod = (data) => fetchApi('/payment-methods', { method: 'POST', body: data });
export const updatePaymentMethod = (id, data) => fetchApi(`/payment-methods/${id}`, { method: 'PATCH', body: data });
export const deletePaymentMethod = (id) => fetchApi(`/payment-methods/${id}`, { method: 'DELETE' });
