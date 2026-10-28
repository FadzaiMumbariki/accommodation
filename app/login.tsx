import React, { useState } from 'react';
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
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Brand } from '../constants/Colors';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { classifyAuthError } from '../lib/authErrors';
import type { UserRole } from '../types';

export default function AuthScreen({ defaultTab = 'login' }: { defaultTab?: 'login' | 'signup' }) {
  const { initialTab, returnTo } = useLocalSearchParams<{ initialTab?: string; returnTo?: string }>();
  const { signIn, signUp, resetPassword, signInAsDemo, signInWithGoogle, isSupabaseEnabled } = useAuth();
  const { setUserRole, userRole } = useApp();

  const [tab, setTab] = useState<'login' | 'signup'>(
    initialTab === 'signup' || defaultTab === 'signup' ? 'signup' : 'login'
  );

  // Common fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Sign up specific fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>(userRole);

  // Focus states for clean borders
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);
  const [phoneFocused, setPhoneFocused] = useState(false);

  const handleDemoLogin = async (demoRole: UserRole) => {
    setLoading(true);
    await setUserRole(demoRole);
    await signInAsDemo(demoRole);
    setLoading(false);
    router.replace(returnTo?.startsWith('/') ? (returnTo as Href) : '/(tabs)');
  };

  const handleLogin = async () => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();
    if (!cleanEmail || !cleanPassword) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    const error = await signIn(cleanEmail, cleanPassword);
    setLoading(false);

    if (error) {
      const lower = error.toLowerCase();
      if (lower.includes('invalid login credentials') || lower.includes('invalid credentials') || lower.includes('rate limit')) {
        Alert.alert(
          'Sign In Issue',
          `Could not verify "${cleanEmail}".\n\nWould you like to sign in as a Demo User to test the app right now, or create a new account?`,
          [
            {
              text: 'Login as Demo Tenant',
              onPress: () => handleDemoLogin('tenant'),
            },
            {
              text: 'Login as Demo Landlord',
              onPress: () => handleDemoLogin('landlord'),
            },
            {
              text: 'Create Account',
              onPress: () => setTab('signup'),
            },
            {
              text: 'Cancel',
              style: 'cancel',
            },
          ],
        );
      } else {
        const friendly = classifyAuthError(error);
        Alert.alert(friendly.title, friendly.message);
      }
      return;
    }

    router.replace(returnTo?.startsWith('/') ? returnTo as Href : '/(tabs)');
  };

  const handleSignUp = async () => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();
    if (!fullName.trim()) {
      Alert.alert('Missing name', 'Please enter your full name.');
      return;
    }
    if (!cleanEmail) {
      Alert.alert('Missing email', 'Please enter your email address.');
      return;
    }
    if (cleanPassword.length < 6) {
      Alert.alert('Password too short', 'Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    await setUserRole(role);
    const result = await signUp(cleanEmail, cleanPassword, fullName.trim(), phone.trim() || undefined, role);
    setLoading(false);

    if (result.error) {
      const friendly = classifyAuthError(result.error);
      Alert.alert(friendly.title, friendly.message);
      return;
    }

    if (result.requiresEmailConfirmation) {
      Alert.alert(
        'Account Created!',
        'A confirmation email has been sent to your inbox. Please tap the link in it to activate your account, then sign in.\n\nTip: check your spam folder if you don\u2019t see it.',
        [
          {
            text: 'OK',
            onPress: () => setTab('login'),
          },
        ],
      );
      return;
    }

    router.replace(returnTo?.startsWith('/') ? returnTo as Href : '/(tabs)');
  };

  const handleForgotPassword = () => {
    if (!email.trim()) {
      Alert.alert('Enter your email', 'Please enter your email address above, then tap "Forgot password?".');
      return;
    }
    Alert.alert('Reset Password', `Send a password reset link to ${email.trim()}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Send Link',
        onPress: async () => {
          const error = await resetPassword(email.trim());
          if (error) Alert.alert('Error', error);
          else Alert.alert('Email Sent', 'Check your inbox for password reset instructions.');
        },
      },
    ]);
  };

  const handleGuestAccess = (targetRole: UserRole = 'tenant') => {
    void setUserRole(targetRole);
    router.replace('/(tabs)');
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      router.replace(returnTo?.startsWith('/') ? (returnTo as Href) : '/(tabs)');
    } catch (err) {
      const friendly = classifyAuthError(err instanceof Error ? err.message : String(err));
      Alert.alert(friendly.title, friendly.message);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top Bar with Brand and Guest button */}
          <View style={styles.topBar}>
            <View style={styles.brandRow}>
              <View style={styles.logoBadge}>
                <Ionicons name="home" size={20} color={Brand.white} />
              </View>
              <Text style={styles.brandText}>
                <Text style={{ color: Brand.navy }}>Imba</Text>
                <Text style={{ color: Brand.terracotta }}>Find</Text>
              </Text>
            </View>

            <TouchableOpacity style={styles.guestBtnTop} onPress={() => handleGuestAccess('tenant')}>
              <Text style={styles.guestBtnTopText}>Browse as Guest</Text>
              <Ionicons name="chevron-forward" size={14} color={Brand.gray500} />
            </TouchableOpacity>
          </View>

          {/* Heading */}
          <View style={styles.headerWrap}>
            <Text style={styles.title}>
              {tab === 'login' ? 'Welcome back' : 'Create an account'}
            </Text>
            <Text style={styles.subtitle}>
              {tab === 'login'
                ? 'Sign in to access your saved homes, viewings, and landlord chats.'
                : 'Join Zimbabwe’s trusted accommodation marketplace.'}
            </Text>
          </View>

          {/* Tab Switcher */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabBtn, tab === 'login' && styles.tabBtnActive]}
              onPress={() => setTab('login')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="log-in-outline"
                size={16}
                color={tab === 'login' ? Brand.white : Brand.gray500}
              />
              <Text style={[styles.tabText, tab === 'login' && styles.tabTextActive]}>
                Sign In
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, tab === 'signup' && styles.tabBtnActive]}
              onPress={() => setTab('signup')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="person-add-outline"
                size={16}
                color={tab === 'signup' ? Brand.white : Brand.gray500}
              />
              <Text style={[styles.tabText, tab === 'signup' && styles.tabTextActive]}>
                Create Account
              </Text>
            </TouchableOpacity>
          </View>

          {/* Quick 1-Tap Demo Logins */}
          <View style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  backgroundColor: Brand.white,
                  paddingVertical: 12,
                  paddingHorizontal: 8,
                  borderRadius: 12,
                  borderWidth: 1.5,
                  borderColor: Brand.terracotta,
                  shadowColor: Brand.navy,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 4,
                  elevation: 2,
                }}
                onPress={() => handleDemoLogin('tenant')}
                activeOpacity={0.8}
              >
                <Ionicons name="flash" size={16} color={Brand.terracotta} />
                <Text style={{ fontSize: 13, fontWeight: '700', color: Brand.terracotta }}>
                  Demo Tenant
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  backgroundColor: Brand.white,
                  paddingVertical: 12,
                  paddingHorizontal: 8,
                  borderRadius: 12,
                  borderWidth: 1.5,
                  borderColor: Brand.navy,
                  shadowColor: Brand.navy,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 4,
                  elevation: 2,
                }}
                onPress={() => handleDemoLogin('landlord')}
                activeOpacity={0.8}
              >
                <Ionicons name="business" size={16} color={Brand.navy} />
                <Text style={{ fontSize: 13, fontWeight: '700', color: Brand.navy }}>
                  Demo Landlord
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Form Section ── */}
          <View style={styles.formCard}>
            {tab === 'signup' && (
              <>
                {/* Account Type Selector */}
                <Text style={styles.fieldLabel}>I want to:</Text>
                <View style={styles.rolePicker}>
                  <TouchableOpacity
                    style={[styles.roleOption, role === 'tenant' && styles.roleOptionActive]}
                    onPress={() => setRole('tenant')}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="home"
                      size={18}
                      color={role === 'tenant' ? Brand.terracotta : Brand.gray400}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.roleTitle, role === 'tenant' && styles.roleTitleActive]}>
                        Find a Home
                      </Text>
                      <Text style={styles.roleSubtitle}>Tenant account</Text>
                    </View>
                    {role === 'tenant' && (
                      <Ionicons name="checkmark-circle" size={18} color={Brand.terracotta} />
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.roleOption, role === 'landlord' && styles.roleOptionActive]}
                    onPress={() => setRole('landlord')}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="key"
                      size={18}
                      color={role === 'landlord' ? Brand.terracotta : Brand.gray400}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.roleTitle, role === 'landlord' && styles.roleTitleActive]}>
                        List Properties
                      </Text>
                      <Text style={styles.roleSubtitle}>Landlord account</Text>
                    </View>
                    {role === 'landlord' && (
                      <Ionicons name="checkmark-circle" size={18} color={Brand.terracotta} />
                    )}
                  </TouchableOpacity>
                </View>

                {/* Full Name */}
                <Text style={styles.fieldLabel}>Full Name</Text>
                <View style={[styles.inputBox, nameFocused && styles.inputBoxFocused]}>
                  <Ionicons
                    name="person-outline"
                    size={18}
                    color={nameFocused ? Brand.terracotta : Brand.gray400}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Tendai Moyo"
                    placeholderTextColor={Brand.gray400}
                    value={fullName}
                    onChangeText={setFullName}
                    autoCapitalize="words"
                    onFocus={() => setNameFocused(true)}
                    onBlur={() => setNameFocused(false)}
                  />
                </View>
              </>
            )}

            {/* Email */}
            <Text style={styles.fieldLabel}>Email Address</Text>
            <View style={[styles.inputBox, emailFocused && styles.inputBoxFocused]}>
              <Ionicons
                name="mail-outline"
                size={18}
                color={emailFocused ? Brand.terracotta : Brand.gray400}
              />
              <TextInput
                style={styles.input}
                placeholder="name@example.com"
                placeholderTextColor={Brand.gray400}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
              />
            </View>

            {tab === 'signup' && (
              <>
                {/* Phone */}
                <Text style={styles.fieldLabel}>Phone Number (Optional)</Text>
                <View style={[styles.inputBox, phoneFocused && styles.inputBoxFocused]}>
                  <Ionicons
                    name="call-outline"
                    size={18}
                    color={phoneFocused ? Brand.terracotta : Brand.gray400}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. +263 77 123 4567"
                    placeholderTextColor={Brand.gray400}
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    onFocus={() => setPhoneFocused(true)}
                    onBlur={() => setPhoneFocused(false)}
                  />
                </View>
              </>
            )}

            {/* Password */}
            <View style={styles.passwordHeaderRow}>
              <Text style={styles.fieldLabel}>Password</Text>
              {tab === 'login' && (
                <TouchableOpacity onPress={handleForgotPassword} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                  <Text style={styles.forgotPassText}>Forgot password?</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={[styles.inputBox, passwordFocused && styles.inputBoxFocused]}>
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={passwordFocused ? Brand.terracotta : Brand.gray400}
              />
              <TextInput
                style={styles.input}
                placeholder={tab === 'signup' ? 'Min. 8 characters' : 'Enter your password'}
                placeholderTextColor={Brand.gray400}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(v => !v)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              >
                <Ionicons
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={18}
                  color={Brand.gray400}
                />
              </TouchableOpacity>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitBtn, loading && { opacity: 0.7 }]}
              onPress={tab === 'login' ? handleLogin : handleSignUp}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={Brand.white} />
              ) : (
                <>
                  <Text style={styles.submitBtnText}>
                    {tab === 'login' ? 'Sign In to ImbaFind' : 'Create My Account'}
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color={Brand.white} />
                </>
              )}
            </TouchableOpacity>

            {tab === 'signup' && (
              <Text style={styles.termsNote}>
                By signing up, you agree to ImbaFind’s Terms of Service and Privacy Policy.
              </Text>
            )}
          </View>

          {/* Social / Guest Section */}
          <View style={styles.footerWrap}>
            {isSupabaseEnabled && (
              <>
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or continue with</Text>
                  <View style={styles.dividerLine} />
                </View>

                <TouchableOpacity
                  style={[styles.googleBtn, googleLoading && { opacity: 0.7 }]}
                  onPress={handleGoogleLogin}
                  disabled={googleLoading || loading}
                  activeOpacity={0.85}
                >
                  {googleLoading ? (
                    <ActivityIndicator color={Brand.navy} />
                  ) : (
                    <>
                      <Ionicons name="logo-google" size={18} color={"#DB4437"} />
                      <Text style={styles.googleBtnText}>Continue with Google</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue without account</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={[styles.guestActionBtn, { flex: 1 }]}
                onPress={() => handleGuestAccess('tenant')}
                activeOpacity={0.8}
              >
                <Ionicons name="compass-outline" size={18} color={Brand.navy} />
                <Text style={styles.guestActionBtnText}>Browse as Tenant</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.guestActionBtn, { flex: 1 }]}
                onPress={() => handleGuestAccess('landlord')}
                activeOpacity={0.8}
              >
                <Ionicons name="business-outline" size={18} color={Brand.terracotta} />
                <Text style={styles.guestActionBtnText}>Try as Landlord</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Brand.cream,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Brand.terracotta,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Brand.terracotta,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  brandText: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  guestBtnTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Brand.white,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Brand.gray200,
  },
  guestBtnTopText: {
    fontSize: 12,
    fontWeight: '600',
    color: Brand.gray600,
  },
  headerWrap: {
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: Brand.navy,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: Brand.gray500,
    lineHeight: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Brand.gray200,
    padding: 4,
    borderRadius: 14,
    marginBottom: 20,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabBtnActive: {
    backgroundColor: Brand.terracotta,
    shadowColor: Brand.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
    color: Brand.gray600,
  },
  tabTextActive: {
    color: Brand.white,
  },
  formCard: {
    backgroundColor: Brand.white,
    borderRadius: 20,
    padding: 20,
    shadowColor: Brand.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: Brand.gray200,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Brand.navy,
    marginBottom: 6,
    marginTop: 8,
  },
  passwordHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  forgotPassText: {
    fontSize: 12,
    fontWeight: '600',
    color: Brand.terracotta,
  },
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
  inputBoxFocused: {
    borderColor: Brand.terracotta,
    backgroundColor: Brand.white,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Brand.navy,
  },
  rolePicker: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  roleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Brand.gray200,
    backgroundColor: Brand.cream,
  },
  roleOptionActive: {
    borderColor: Brand.terracotta,
    backgroundColor: '#FFF7ED',
  },
  roleTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Brand.navy,
  },
  roleTitleActive: {
    color: Brand.terracottaDark,
  },
  roleSubtitle: {
    fontSize: 11,
    color: Brand.gray500,
  },
  submitBtn: {
    backgroundColor: Brand.terracotta,
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    shadowColor: Brand.terracotta,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  submitBtnText: {
    color: Brand.white,
    fontSize: 15,
    fontWeight: '700',
  },
  termsNote: {
    fontSize: 11,
    color: Brand.gray400,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 16,
  },
  footerWrap: {
    marginTop: 24,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Brand.gray300,
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '500',
    color: Brand.gray400,
  },
  guestActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Brand.white,
    borderWidth: 1.5,
    borderColor: Brand.gray300,
    paddingVertical: 14,
    borderRadius: 14,
  },
  guestActionBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Brand.navy,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Brand.white,
    borderWidth: 1.5,
    borderColor: Brand.gray300,
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 4,
  },
  googleBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: Brand.navy,
  },
});
