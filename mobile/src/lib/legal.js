import { Linking } from 'react-native';

const SITE_URL = process.env.EXPO_PUBLIC_SITE_URL ?? 'https://subscree.app';

export const PRIVACY_URL = `${SITE_URL}/privacy`;
export const TERMS_URL = `${SITE_URL}/terms`;

export function openUrl(url) {
  Linking.openURL(url).catch(() => {});
}
