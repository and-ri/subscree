import React, { useEffect, useState } from 'react';
import { Platform, ScrollView, Alert as RNAlert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslations } from 'use-intl';
import { Ionicons } from '@expo/vector-icons';

import Screen from '../components/Screen';
import ScreenHeader from '../components/ScreenHeader';
import Field from '../components/Field';
import AppSelect from '../components/AppSelect';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLocaleControl } from '../context/LocaleContext';
import { PUSH_OPT_IN_KEY } from '../components/PushManager';
import { requestPushToken, getPushTokenIfGranted } from '../lib/push';
import { getMe, updateMe, updatePassword, getCurrencies, registerPushToken, unregisterPushToken, deleteAccount, restoreAccount } from '../api';
import { SUPPORTED_LOCALES } from '../i18n';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { Input, InputField } from '@/components/ui/input';
import { Button, ButtonText, ButtonSpinner } from '@/components/ui/button';
import { Pressable } from '@/components/ui/pressable';
import { Alert, AlertText } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';

function SectionCard({ title, description, children }) {
  return (
    <VStack space="md" className="bg-background-50 border border-outline-100 rounded-2xl p-4">
      <VStack space="xs">
        <Heading size="md">{title}</Heading>
        {!!description && <Text className="text-sm text-typography-500">{description}</Text>}
      </VStack>
      {children}
    </VStack>
  );
}

function Success({ message }) {
  if (!message) return null;
  return (
    <Alert action="success" variant="outline">
      <AlertText>{message}</AlertText>
    </Alert>
  );
}

export default function SettingsScreen({ navigation }) {
  const t = useTranslations('Settings');
  const tLang = useTranslations('Language');
  const tNav = useTranslations('Nav');
  const tCommon = useTranslations('Common');
  const { signOut } = useAuth();
  const { mode, setMode } = useTheme();
  const { locale, setLocale } = useLocaleControl();

  const [currencies, setCurrencies] = useState([]);

  // Profile
  const [name, setName] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState(null);
  const [profileErr, setProfileErr] = useState(null);

  // Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState(null);
  const [pwErr, setPwErr] = useState(null);

  // Preferences
  const [currency, setCurrency] = useState('USD');
  const [prefSaving, setPrefSaving] = useState(false);
  const [prefMsg, setPrefMsg] = useState(null);

  // Push notifications (this device)
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushErr, setPushErr] = useState(null);

  // Notifications
  const [notifyEnabled, setNotifyEnabled] = useState(false);
  const [notifyDaysBefore, setNotifyDaysBefore] = useState('3');
  const [remindBefore, setRemindBefore] = useState(true);
  const [remindOnDueDate, setRemindOnDueDate] = useState(false);
  const [weeklySummary, setWeeklySummary] = useState(false);
  const [timezone, setTimezone] = useState(null);
  const [notifySaving, setNotifySaving] = useState(false);
  const [notifyMsg, setNotifyMsg] = useState(null);

  // Account deletion
  const [deletionRequestedAt, setDeletionRequestedAt] = useState(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteErr, setDeleteErr] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [restoreBusy, setRestoreBusy] = useState(false);

  useEffect(() => {
    Promise.all([getMe(), getCurrencies()])
      .then(([userRes, currRes]) => {
        const u = userRes.user || {};
        setName(u.name ?? '');
        setCurrency(u.preferredCurrency ?? 'USD');
        setPushEnabled(u.pushEnabled ?? false);
        setNotifyEnabled(u.notifyEnabled ?? false);
        setNotifyDaysBefore(String(u.notifyDaysBefore ?? 3));
        setRemindBefore(u.remindBefore ?? true);
        setRemindOnDueDate(u.remindOnDueDate ?? false);
        setWeeklySummary(u.weeklySummary ?? false);
        setTimezone(u.timezone ?? null);
        setDeletionRequestedAt(u.deletionRequestedAt ?? null);
        setCurrencies(currRes.currencies || []);
      })
      .catch(() => {});
  }, []);

  const saveProfile = async () => {
    setProfileErr(null);
    setProfileMsg(null);
    setProfileSaving(true);
    try {
      await updateMe({ name });
      setProfileMsg(t('profileSaved'));
    } catch (e) {
      setProfileErr(e.message);
    } finally {
      setProfileSaving(false);
    }
  };

  const savePassword = async () => {
    setPwErr(null);
    setPwMsg(null);
    setPwSaving(true);
    try {
      await updatePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setPwMsg(t('passwordSaved'));
    } catch (e) {
      setPwErr(e.message);
    } finally {
      setPwSaving(false);
    }
  };

  const savePreferences = async () => {
    setPrefMsg(null);
    setPrefSaving(true);
    try {
      await updateMe({ preferredCurrency: currency });
      setPrefMsg(t('preferencesSaved'));
    } catch {
      /* ignore */
    } finally {
      setPrefSaving(false);
    }
  };

  const saveNotifications = async () => {
    setNotifyMsg(null);
    setNotifySaving(true);
    try {
      await updateMe({
        notifyEnabled,
        notifyDaysBefore: Number(notifyDaysBefore) || 3,
        remindBefore,
        remindOnDueDate,
        weeklySummary,
      });
      setNotifyMsg(t('notificationsSaved'));
    } catch {
      /* ignore */
    } finally {
      setNotifySaving(false);
    }
  };

  const confirmDelete = () => {
    RNAlert.alert(
      t('deleteAccountConfirmTitle'),
      t('deleteAccountConfirmBody'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('deleteAccountAction'),
          style: 'destructive',
          onPress: async () => {
            setDeleteErr(null);
            setDeleteBusy(true);
            try {
              await deleteAccount(deletePassword);
              await signOut(); // restorable for 7 days
            } catch (e) {
              setDeleteErr(e.message);
              setDeleteBusy(false);
            }
          },
        },
      ],
    );
  };

  const doRestore = async () => {
    setRestoreBusy(true);
    try {
      const res = await restoreAccount();
      setDeletionRequestedAt(res.user?.deletionRequestedAt ?? null);
    } catch {
      /* ignore */
    } finally {
      setRestoreBusy(false);
    }
  };

  const togglePush = async (next) => {
    setPushErr(null);
    setPushBusy(true);
    try {
      if (next) {
        const token = await requestPushToken();
        await registerPushToken(token, Platform.OS);
        await AsyncStorage.setItem(PUSH_OPT_IN_KEY, '1');
        setPushEnabled(true);
      } else {
        const token = await getPushTokenIfGranted();
        if (token) await unregisterPushToken(token);
        await AsyncStorage.removeItem(PUSH_OPT_IN_KEY);
        setPushEnabled(false);
      }
    } catch (e) {
      if (e.code === 'NOT_A_DEVICE') setPushErr(t('pushNeedsDevice'));
      else if (e.code === 'PERMISSION_DENIED') setPushErr(t('pushDenied'));
      else setPushErr(e.message);
      setPushEnabled(false);
    } finally {
      setPushBusy(false);
    }
  };

  const THEME_OPTIONS = [
    { value: 'light', label: t('themeLight'), icon: 'sunny-outline' },
    { value: 'dark', label: t('themeDark'), icon: 'moon-outline' },
    { value: 'system', label: t('themeSystem'), icon: 'phone-portrait-outline' },
  ];

  const NavRow = ({ icon, label, onPress }) => (
    <Pressable onPress={onPress}>
      <HStack className="items-center justify-between py-3 border-b border-outline-100">
        <HStack space="md" className="items-center">
          <Ionicons name={icon} size={20} color="#737373" />
          <Text className="text-typography-900">{label}</Text>
        </HStack>
        <Ionicons name="chevron-forward" size={18} color="#a3a3a3" />
      </HStack>
    </Pressable>
  );

  return (
    <Screen edges={['top']}>
      <ScreenHeader title={t('title')} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
        <VStack space="lg">
          {/* Quick links */}
          <Box className="bg-background-50 border border-outline-100 rounded-2xl px-4">
            <NavRow icon="people-outline" label={tNav('team')} onPress={() => navigation.navigate('Team')} />
            <NavRow icon="pricetags-outline" label={tNav('categories')} onPress={() => navigation.navigate('Categories')} />
            <NavRow icon="card-outline" label={tNav('paymentMethods')} onPress={() => navigation.navigate('PaymentMethods')} />
          </Box>

          {/* Profile */}
          <SectionCard title={t('profile')} description={t('profileDescription')}>
            {profileErr && (
              <Alert action="error" variant="outline">
                <AlertText>{profileErr}</AlertText>
              </Alert>
            )}
            <Success message={profileMsg} />
            <Field label={t('displayName')}>
              <Input>
                <InputField value={name} onChangeText={setName} />
              </Input>
            </Field>
            <Button onPress={saveProfile} isDisabled={profileSaving}>
              {profileSaving && <ButtonSpinner className="mr-2" />}
              <ButtonText>{profileSaving ? t('savingProfile') : t('saveProfile')}</ButtonText>
            </Button>
          </SectionCard>

          {/* Preferences */}
          <SectionCard title={t('preferences')} description={t('preferencesDescription')}>
            <Success message={prefMsg} />
            <Field label={t('language')}>
              <AppSelect
                value={locale}
                onValueChange={setLocale}
                options={SUPPORTED_LOCALES.map((l) => ({ label: tLang(l), value: l }))}
              />
            </Field>
            <Field label={t('preferredCurrency')}>
              <AppSelect
                value={currency}
                onValueChange={setCurrency}
                options={currencies.map((c) => ({ label: `${c.code} — ${c.name}`, value: c.code }))}
              />
            </Field>
            <Button onPress={savePreferences} isDisabled={prefSaving}>
              {prefSaving && <ButtonSpinner className="mr-2" />}
              <ButtonText>{prefSaving ? t('savingPreferences') : t('savePreferences')}</ButtonText>
            </Button>
          </SectionCard>

          {/* Appearance */}
          <SectionCard title={t('appearance')} description={t('appearanceDescription')}>
            <HStack space="sm">
              {THEME_OPTIONS.map((opt) => {
                const active = mode === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => setMode(opt.value)}
                    className={`flex-1 items-center py-3 rounded-xl border ${
                      active ? 'bg-primary-600 border-primary-600' : 'bg-background-0 border-outline-200'
                    }`}
                  >
                    <Ionicons name={opt.icon} size={20} color={active ? '#fafafa' : '#737373'} />
                    <Text className={`text-xs mt-1 ${active ? 'text-typography-0' : 'text-typography-600'}`}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </HStack>
          </SectionCard>

          {/* Password */}
          <SectionCard title={t('password')} description={t('passwordDescription')}>
            {pwErr && (
              <Alert action="error" variant="outline">
                <AlertText>{pwErr}</AlertText>
              </Alert>
            )}
            <Success message={pwMsg} />
            <Field label={t('currentPassword')}>
              <Input>
                <InputField value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry />
              </Input>
            </Field>
            <Field label={t('newPassword')}>
              <Input>
                <InputField value={newPassword} onChangeText={setNewPassword} secureTextEntry />
              </Input>
            </Field>
            <Button onPress={savePassword} isDisabled={pwSaving || !currentPassword || !newPassword}>
              {pwSaving && <ButtonSpinner className="mr-2" />}
              <ButtonText>{pwSaving ? t('savingPassword') : t('savePassword')}</ButtonText>
            </Button>
          </SectionCard>

          {/* Push notifications (this device) */}
          <SectionCard title={t('pushTitle')} description={t('pushDescription')}>
            {!!pushErr && (
              <Alert action="error" variant="outline">
                <AlertText>{pushErr}</AlertText>
              </Alert>
            )}
            <HStack className="items-center justify-between">
              <Text className="text-typography-900 flex-1 mr-3">{t('pushEnabledLabel')}</Text>
              <Switch value={pushEnabled} onValueChange={togglePush} isDisabled={pushBusy} />
            </HStack>
          </SectionCard>

          {/* Notifications */}
          <SectionCard title={t('notifications')} description={t('notificationsDescription')}>
            <Success message={notifyMsg} />
            <HStack className="items-center justify-between">
              <Text className="text-typography-900 flex-1 mr-3">{t('notifyEnabled')}</Text>
              <Switch value={notifyEnabled} onValueChange={setNotifyEnabled} />
            </HStack>

            <HStack className="items-center justify-between">
              <Text className="text-typography-900 flex-1 mr-3">{t('remindBefore')}</Text>
              <Switch value={remindBefore} onValueChange={setRemindBefore} />
            </HStack>
            {remindBefore && (
              <Field label={t('notifyDaysBefore')}>
                <Input>
                  <InputField
                    value={notifyDaysBefore}
                    onChangeText={setNotifyDaysBefore}
                    keyboardType="number-pad"
                  />
                </Input>
              </Field>
            )}

            <HStack className="items-center justify-between">
              <Text className="text-typography-900 flex-1 mr-3">{t('remindOnDueDate')}</Text>
              <Switch value={remindOnDueDate} onValueChange={setRemindOnDueDate} />
            </HStack>

            <HStack className="items-center justify-between">
              <Text className="text-typography-900 flex-1 mr-3">{t('weeklySummary')}</Text>
              <Switch value={weeklySummary} onValueChange={setWeeklySummary} />
            </HStack>

            <Text className="text-typography-500 text-xs">
              {t('remindersDeliveryNote')}{timezone ? ` (${timezone})` : ''}
            </Text>

            <Button onPress={saveNotifications} isDisabled={notifySaving}>
              {notifySaving && <ButtonSpinner className="mr-2" />}
              <ButtonText>{notifySaving ? t('savingNotifications') : t('saveNotifications')}</ButtonText>
            </Button>
          </SectionCard>

          {/* Danger zone */}
          <SectionCard title={t('dangerZone')} description={t('deleteAccountDesc')}>
            {deletionRequestedAt ? (
              <>
                <Alert action="error" variant="outline">
                  <AlertText>
                    {t('deletionScheduled', {
                      date: new Date(new Date(deletionRequestedAt).getTime() + 7 * 86400000)
                        .toLocaleDateString(locale === 'uk' ? 'uk-UA' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' }),
                    })}
                  </AlertText>
                </Alert>
                <Button variant="outline" onPress={doRestore} isDisabled={restoreBusy}>
                  {restoreBusy && <ButtonSpinner className="mr-2" />}
                  <ButtonText>{restoreBusy ? t('restoring') : t('restoreAccount')}</ButtonText>
                </Button>
              </>
            ) : (
              <>
                <Field label={t('deleteAccountPasswordLabel')}>
                  <Input>
                    <InputField
                      value={deletePassword}
                      onChangeText={setDeletePassword}
                      secureTextEntry
                      autoComplete="current-password"
                      textContentType="password"
                    />
                  </Input>
                </Field>
                {!!deleteErr && (
                  <Alert action="error" variant="outline">
                    <AlertText>{deleteErr}</AlertText>
                  </Alert>
                )}
                <Button action="negative" onPress={confirmDelete} isDisabled={deleteBusy || !deletePassword}>
                  {deleteBusy && <ButtonSpinner className="mr-2" />}
                  <Ionicons name="trash-outline" size={16} color="white" style={{ marginRight: 8 }} />
                  <ButtonText>{deleteBusy ? t('deleting') : t('deleteAccount')}</ButtonText>
                </Button>
              </>
            )}
          </SectionCard>

          <Button action="negative" variant="outline" onPress={signOut}>
            <ButtonText>{tNav('logout')}</ButtonText>
          </Button>
        </VStack>
      </ScrollView>
    </Screen>
  );
}
