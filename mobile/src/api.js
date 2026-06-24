import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { resolveErrorMessage } from './lib/errors';
import { trackEvent, apiEventName, eventDataForBody } from './lib/analytics';

const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  Platform.select({ android: 'http://10.0.2.2:3001', default: 'http://localhost:3001' });

async function fetchApi(path, { method = 'GET', body } = {}) {
  const token = await AsyncStorage.getItem('auth_token');
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body != null ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(resolveErrorMessage(data, res.status));

  // Emit a semantic analytics event for recognised mutations (mirrors web).
  const eventName = apiEventName(method, path);
  if (eventName) trackEvent(eventName, eventDataForBody(eventName, body));

  return data;
}

// Auth
export const login = (email, password) =>
  fetchApi('/auth/login', { method: 'POST', body: { email, password } });

export const register = (name, email, password, inviteToken) =>
  fetchApi('/auth/register', {
    method: 'POST',
    body: { name, email, password, ...(inviteToken ? { inviteToken } : {}) },
  });

export const forgotPassword = (email) =>
  fetchApi('/auth/forgot-password', { method: 'POST', body: { email } });
export const resetPassword = (token, password) =>
  fetchApi('/auth/reset-password', { method: 'POST', body: { token, password } });
export const getInvitationInfo = (token) =>
  fetchApi(`/auth/invitation/${encodeURIComponent(token)}`);

// User / profile
export const getMe = () => fetchApi('/users/me');
export const updateMe = (data) => fetchApi('/users/me', { method: 'PATCH', body: data });
export const updatePassword = (data) =>
  fetchApi('/users/me/password', { method: 'PATCH', body: data });
export const deleteAccount = (password) => fetchApi('/users/me', { method: 'DELETE', body: { password } });
export const restoreAccount = () => fetchApi('/users/me/restore', { method: 'POST' });

// Push notifications
export const registerPushToken = (token, platform) =>
  fetchApi('/users/me/push-tokens', { method: 'POST', body: { token, platform } });
export const unregisterPushToken = (token) =>
  fetchApi('/users/me/push-tokens', { method: 'DELETE', body: { token } });
export const getNotifications = () => fetchApi('/users/me/notifications');
export const markNotificationsRead = (ids) =>
  fetchApi('/users/me/notifications/read', { method: 'POST', body: ids ? { ids } : {} });

// Teams
export const getTeams = () => fetchApi('/teams');
export const createTeam = (name) => fetchApi('/teams', { method: 'POST', body: { name } });
export const activateTeam = (id) => fetchApi(`/teams/${id}/activate`, { method: 'POST' });
export const renameTeam = (id, name) =>
  fetchApi(`/teams/${id}`, { method: 'PATCH', body: { name } });
export const deleteTeam = (id) => fetchApi(`/teams/${id}`, { method: 'DELETE' });
export const getTeamMembers = (id) => fetchApi(`/teams/${id}/members`);
export const inviteMember = (id, email, role) =>
  fetchApi(`/teams/${id}/invitations`, { method: 'POST', body: { email, ...(role ? { role } : {}) } });
export const revokeInvitation = (id, invitationId) =>
  fetchApi(`/teams/${id}/invitations/${invitationId}`, { method: 'DELETE' });
export const removeMember = (id, userId) =>
  fetchApi(`/teams/${id}/members/${userId}`, { method: 'DELETE' });
export const leaveTeam = (id) => fetchApi(`/teams/${id}/leave`, { method: 'POST' });
export const acceptInvitation = (token) =>
  fetchApi('/teams/invitations/accept', { method: 'POST', body: { token } });

// Subscriptions
export const getSubscriptions = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return fetchApi(`/subscriptions${qs ? `?${qs}` : ''}`);
};
export const getSubscription = (id) => fetchApi(`/subscriptions/${id}`);
export const getStats = () => fetchApi('/subscriptions/stats');
export const createSubscription = (data) =>
  fetchApi('/subscriptions', { method: 'POST', body: data });
export const updateSubscription = (id, data) =>
  fetchApi(`/subscriptions/${id}`, { method: 'PATCH', body: data });
export const deleteSubscription = (id) =>
  fetchApi(`/subscriptions/${id}`, { method: 'DELETE' });

// Categories
export const getCategories = () => fetchApi('/categories');
export const createCategory = (data) =>
  fetchApi('/categories', { method: 'POST', body: data });
export const updateCategory = (id, data) =>
  fetchApi(`/categories/${id}`, { method: 'PATCH', body: data });
export const deleteCategory = (id) =>
  fetchApi(`/categories/${id}`, { method: 'DELETE' });

// Payment Methods
export const getPaymentMethods = () => fetchApi('/payment-methods');
export const createPaymentMethod = (data) =>
  fetchApi('/payment-methods', { method: 'POST', body: data });
export const updatePaymentMethod = (id, data) =>
  fetchApi(`/payment-methods/${id}`, { method: 'PATCH', body: data });
export const deletePaymentMethod = (id) =>
  fetchApi(`/payment-methods/${id}`, { method: 'DELETE' });

// Currencies
export const getCurrencies = () => fetchApi('/currencies');
