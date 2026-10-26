import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  StatusBar,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Brand } from '../constants/Colors';
import { useAuth } from '../context/AuthContext';
import { updateProfile, uploadPropertyImage } from '../lib/database';
import { supabase } from '../lib/supabase';

export default function ProfileEditScreen() {
  const { user } = useAuth();

  const [fullName, setFullName] = useState(
    user?.user_metadata?.full_name ?? '',
  );
  const [phone, setPhone] = useState(
    user?.user_metadata?.phone ?? '',
  );
  const [avatarUri, setAvatarUri] = useState<string | null>(
    user?.user_metadata?.avatar_url ?? null,
  );
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Allow photo library access to change your profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    if (!user) {
      // Offline/demo: just preview
      setAvatarUri(result.assets[0].uri);
      return;
    }

    setUploading(true);
    try {
      const url = await uploadPropertyImage(user.id, result.assets[0].uri);
      setAvatarUri(url);
    } catch (error) {
      Alert.alert('Upload failed', 'Could not upload photo. Please try again.');
      console.error('[ProfileEdit] Avatar upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    const trimmedName = fullName.trim();
    if (!trimmedName) {
      Alert.alert('Name required', 'Please enter your display name.');
      return;
    }

    setSaving(true);
    try {
      const updates: Record<string, string> = { full_name: trimmedName };
      if (phone.trim()) updates.phone = phone.trim();
      if (avatarUri) updates.avatar_url = avatarUri;

      // Update Supabase auth user_metadata
      if (supabase) {
        const { error } = await supabase.auth.updateUser({ data: updates });
        if (error) throw error;
      }

      // Also persist to profiles table
      if (user) {
        await updateProfile(user.id, {
          fullName: trimmedName,
          phone: phone.trim() || null,
          avatarUrl: avatarUri,
        });
      }

      Alert.alert('Profile updated', 'Your changes have been saved.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('[ProfileEdit] Save failed:', error);
      Alert.alert(
        'Could not save',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Brand.white} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color={Brand.navy} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity
          onPress={save}
          disabled={saving || uploading}
          style={[styles.saveBtn, (saving || uploading) && styles.saveBtnDisabled]}
          accessibilityRole="button"
          accessibilityLabel="Save profile changes"
        >
          {saving
            ? <ActivityIndicator size="small" color={Brand.white} />
            : <Text style={styles.saveBtnText}>Save</Text>}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarWrapper}>
              <Image
                source={{
                  uri: avatarUri
                    ?? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300',
                }}
                style={styles.avatar}
                contentFit="cover"
                transition={200}
                cachePolicy="memory-disk"
              />
              {uploading && (
                <View style={styles.avatarOverlay}>
                  <ActivityIndicator size="large" color={Brand.white} />
                </View>
              )}
            </View>
            <TouchableOpacity
              style={styles.changePhotoBtn}
              onPress={pickAvatar}
              disabled={uploading}
              accessibilityRole="button"
              accessibilityLabel="Change profile photo"
            >
              <Ionicons name="camera-outline" size={16} color={Brand.terracotta} />
              <Text style={styles.changePhotoText}>Change Photo</Text>
            </TouchableOpacity>
          </View>

          {/* Fields */}
          <View style={styles.card}>
            <Text style={styles.label}>Display Name</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Your full name"
              placeholderTextColor={Brand.gray400}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="next"
              maxLength={60}
              accessibilityLabel="Display name"
            />

            <View style={styles.divider} />

            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="+263 77 123 4567"
              placeholderTextColor={Brand.gray400}
              keyboardType="phone-pad"
              returnKeyType="done"
              maxLength={20}
              accessibilityLabel="Phone number"
            />
          </View>

          {/* Email (read-only) */}
          <View style={styles.card}>
            <Text style={styles.label}>Email Address</Text>
            <View style={styles.readOnlyRow}>
              <Text style={styles.readOnlyText} numberOfLines={1}>
                {user?.email ?? '—'}
              </Text>
              <View style={styles.lockedBadge}>
                <Ionicons name="lock-closed-outline" size={12} color={Brand.gray500} />
                <Text style={styles.lockedText}>Cannot change</Text>
              </View>
            </View>
          </View>

          <Text style={styles.hint}>
            Your display name and photo are visible to landlords and tenants you interact with.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.cream },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Brand.white,
    borderBottomWidth: 1,
    borderBottomColor: Brand.gray200,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Brand.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Brand.navy,
  },
  saveBtn: {
    backgroundColor: Brand.terracotta,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 60,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: Brand.white, fontWeight: '700', fontSize: 14 },
  scroll: { padding: 20, paddingBottom: 60 },
  avatarSection: { alignItems: 'center', marginBottom: 28 },
  avatarWrapper: { position: 'relative' },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: Brand.terracotta,
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFill,
    borderRadius: 45,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  changePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Brand.terracotta,
    backgroundColor: Brand.white,
  },
  changePhotoText: { color: Brand.terracotta, fontSize: 13, fontWeight: '600' },
  card: {
    backgroundColor: Brand.white,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Brand.gray200,
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: Brand.gray500,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  input: {
    fontSize: 15,
    color: Brand.navy,
    paddingVertical: 6,
  },
  divider: { height: 1, backgroundColor: Brand.gray100, marginVertical: 10 },
  readOnlyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  readOnlyText: { fontSize: 15, color: Brand.gray600, flex: 1 },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Brand.gray100,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  lockedText: { fontSize: 11, color: Brand.gray500 },
  hint: {
    fontSize: 12,
    color: Brand.gray500,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 10,
  },
});
