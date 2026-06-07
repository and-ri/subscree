'use client';

function getToken() {
    if (typeof document === 'undefined') return null;
    return document.cookie
        .split('; ')
        .find(row => row.startsWith('token='))
        ?.split('=')[1] ?? null;
}

export async function fetchApi(path, options = {}) {
    const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}${path}`;
    const token = getToken();

    const response = await fetch(url, {
        method: options.method || 'GET',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        },
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Request failed: ${response.status}`);
    }

    if (response.status === 204) return null;

    return response.json();
}

// User
export const getMe = () => fetchApi('/users/me');
export const updateMe = (data) => fetchApi('/users/me', { method: 'PATCH', body: data });
export const updatePassword = (data) => fetchApi('/users/me/password', { method: 'PATCH', body: data });

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
