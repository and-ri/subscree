import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useTranslations } from 'use-intl';

import Screen from '../components/Screen';
import Field from '../components/Field';
import { useAuth } from '../context/AuthContext';
import { openUrl, PRIVACY_URL, TERMS_URL } from '../lib/legal';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Input, InputField } from '@/components/ui/input';
import { Button, ButtonText, ButtonSpinner } from '@/components/ui/button';
import { Alert, AlertText } from '@/components/ui/alert';
import { Pressable } from '@/components/ui/pressable';

export default function RegisterScreen({ navigation }) {
  const t = useTranslations('Auth');
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password) {
      setError(t('fillAllFields'));
      return;
    }
    setError('');
    setLoading(true);
    try {
      await signUp(name.trim(), email.trim().toLowerCase(), password);
    } catch (err) {
      setError(err.message || t('registerFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <VStack space="2xl">
            <VStack space="xs">
              <Heading size="2xl">{t('registerTitle')}</Heading>
              <Text className="text-typography-500">{t('registerDescription')}</Text>
            </VStack>

            {!!error && (
              <Alert action="error" variant="outline">
                <AlertText>{error}</AlertText>
              </Alert>
            )}

            <VStack space="lg">
              <Field label={t('name')}>
                <Input>
                  <InputField
                    placeholder="John Doe"
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    returnKeyType="next"
                  />
                </Input>
              </Field>

              <Field label={t('email')}>
                <Input>
                  <InputField
                    placeholder="you@example.com"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoComplete="email"
                    returnKeyType="next"
                  />
                </Input>
              </Field>

              <Field label={t('password')}>
                <Input>
                  <InputField
                    placeholder="••••••••"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    returnKeyType="done"
                    onSubmitEditing={handleRegister}
                  />
                </Input>
              </Field>
            </VStack>

            <Button onPress={handleRegister} isDisabled={loading}>
              {loading && <ButtonSpinner className="mr-2" />}
              <ButtonText>{loading ? t('registering') : t('register')}</ButtonText>
            </Button>

            <VStack space="xs" className="items-center">
              <Text className="text-typography-500 text-xs text-center">{t('legalAgree')}</Text>
              <HStack space="sm" className="items-center justify-center">
                <Pressable onPress={() => openUrl(TERMS_URL)}>
                  <Text className="text-primary-600 text-xs">{t('termsOfUse')}</Text>
                </Pressable>
                <Text className="text-typography-400 text-xs">·</Text>
                <Pressable onPress={() => openUrl(PRIVACY_URL)}>
                  <Text className="text-primary-600 text-xs">{t('privacyPolicy')}</Text>
                </Pressable>
              </HStack>
            </VStack>

            <HStack space="xs" className="justify-center">
              <Pressable onPress={() => navigation.navigate('Login')}>
                <Text className="text-primary-600 font-medium">{t('haveAccount')}</Text>
              </Pressable>
            </HStack>
          </VStack>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
