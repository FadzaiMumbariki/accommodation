import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Brand } from '../constants/Colors';
import { supabase } from '../lib/supabase';

type Stage = 'verifying' | 'ready' | 'invalid';

const MIN_PASSWORD_LENGTH = 8;

/**
 * Opened from the password-reset email (imbafind://reset-password?code=…).
 * Exchanges the one-time PKCE code for a recovery session, then lets the user
 * choose a new password.
 */
export default function ResetPasswordScreen() {
  const { code, error_description: errorDescription } = useLocalSearchParams<{
    code?: string;
    error_description?: string;
  }>();

  const [stage, setStage] = useState<Stage>('verifying');
  const [invalidReason, setInvalidReason] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    const fail = (reason: string) => {
      if (!active) return;
      setInvalidReason(reason);
      setStage('invalid');
    };

    const verify = async () => {
      if (!supabase) {
        fail('Password reset requires a connected ImbaFind account.');
        return;
      }
      if (errorDescription) {
        fail(errorDescription);
        return;
      }
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          if (active) setStage('ready');
          return;
        }
        // On web the Supabase client may already have exchanged the code from the URL,
        // so fall through and check for an existing recovery session.
        console.warn('[ResetPassword] Code exchange failed:', error.message);
      }
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        if (active) setStage('ready');
      } else {
        fail('This reset link is invalid or has expired. Request a new one from the sign-in screen.');
      }
    };

    void verify().catch(error => {
      console.error('[ResetPassword] Could not verify reset link:', error);
      fail('We could not verify this reset link. Please try again.');
    });

    return () => {
      active = false;
    };
  }, [code, errorDescription]);

  const handleSave = async () => {
    if (!supabase) return;
    if (password.length < MIN_PASSWORD_LENGTH) {
      Alert.alert('Password too short', `Your password must be at least ${MIN_PASSWORD_LENGTH} characters long.`);
      return;
    }
    if (password !== confirm) {
      Alert.alert('Passwords do not match', 'Please enter the same password in both fields.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      Alert.alert('Password updated', 'Your new password has been saved.', [
        { text: 'Continue', onPress: () => router.replace('/(tabs)') },
      ]);
    } catch (error) {
      console.error('[ResetPassword] Could not update password:', error);
      Alert.alert(
        'Could not update password',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.iconWrap}>
            <Ionicons
              name={stage === 'invalid' ? 'alert-circle' : 'key'}
              size={30}
              color={stage === 'invalid' ? Brand.error : Brand.terracotta}
            />
          </View>
          <Text style={styles.title}>
            {stage === 'invalid' ? 'Link not valid' : 'Set a new password'}
          </Text>

          {stage === 'verifying' && (
            <View style={styles.centerRow}>
              <ActivityIndicator color={Brand.terracotta} />
              <Text style={styles.subtitle}>Verifying your reset link…</Text>
            </View>
          )}

          {stage === 'invalid' && (
            <>
              <Text style={styles.subtitle}>{invalidReason}</Text>
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={() => router.replace('/login')}
                activeOpacity={0.85}
              >
                <Text style={styles.submitBtnText}>Back to Sign In</Text>
              </TouchableOpacity>
            </>
          )}

          {stage === 'ready' && (
            <>
              <Text style={styles.subtitle}>Choose a password with at least {MIN_PASSWORD_LENGTH} characters.</Text>
              <View style={styles.formCard}>
                <Text style={styles.fieldLabel}>New password</Text>
                <View style={styles.inputBox}>
                  <Ionicons name="lock-closed-outline" size={18} color={Brand.gray400} />
                  <TextInput
                    style={styles.input}
                    placeholder="Min. 8 characters"
                    placeholderTextColor={Brand.gray400}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoComplete="new-password"
                    textContentType="newPassword"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(v => !v)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={18} color={Brand.gray400} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.fieldLabel}>Confirm password</Text>
                <View style={styles.inputBox}>
                  <Ionicons name="lock-closed-outline" size={18} color={Brand.gray400} />
                  <TextInput
                    style={styles.input}
                    placeholder="Re-enter password"
                    placeholderTextColor={Brand.gray400}
                    value={confirm}
                    onChangeText={setConfirm}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoComplete="new-password"
                    textContentType="newPassword"
                  />
                </View>

                <TouchableOpacity
                  style={[styles.submitBtn, saving && { opacity: 0.7 }]}
                  onPress={handleSave}
                  disabled={saving}
                  activeOpacity={0.85}
                >
                  {saving ? (
                    <ActivityIndicator color={Brand.white} />
                  ) : (
                    <Text style={styles.submitBtnText}>Save new password</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Brand.cream },
  scroll: { paddingHorizontal: 20, paddingTop: 48, paddingBottom: 40 },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Brand.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Brand.gray200,
  },
  title: { fontSize: 26, fontWeight: '800', color: Brand.navy, letterSpacing: -0.5, marginBottom: 8 },
  subtitle: { fontSize: 14, color: Brand.gray500, lineHeight: 20, marginBottom: 16 },
  centerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  formCard: {
    backgroundColor: Brand.white,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Brand.gray200,
  },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: Brand.navy, marginBottom: 6, marginTop: 8 },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: Brand.gray200,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    backgroundColor: Brand.cream,
    marginBottom: 8,
  },
  input: { flex: 1, fontSize: 15, color: Brand.navy },
  submitBtn: {
    backgroundColor: Brand.terracotta,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  submitBtnText: { color: Brand.white, fontSize: 15, fontWeight: '700' },
});
