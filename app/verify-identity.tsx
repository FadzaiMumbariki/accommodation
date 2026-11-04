import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Brand } from '../constants/Colors';
import { useAuth } from '../context/AuthContext';
import {
  uploadPropertyImage,
  submitVerificationRequest,
  fetchMyVerificationStatus,
  type DocumentType,
  type VerificationRequestStatus,
} from '../lib/database';

const DOCUMENT_OPTIONS: {
  type: DocumentType;
  label: string;
  desc: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    type: 'national_id',
    label: 'National ID Card',
    desc: 'Zimbabwean National ID card (front and back)',
    icon: 'card-outline',
  },
  {
    type: 'passport',
    label: 'Passport',
    desc: 'Valid photo bio-data page',
    icon: 'book-outline',
  },
  {
    type: 'title_deed',
    label: 'Title Deed / Agreement of Sale',
    desc: 'Proof of legal ownership for your property',
    icon: 'document-text-outline',
  },
  {
    type: 'utility_bill',
    label: 'Council Rates or ZESA Bill',
    desc: 'Recent bill (within 3 months) showing your address',
    icon: 'receipt-outline',
  },
  {
    type: 'management_mandate',
    label: 'Management Mandate',
    desc: 'Signed agreement authorizing you to manage the property',
    icon: 'briefcase-outline',
  },
];

export default function VerifyIdentityScreen() {
  const { user } = useAuth();
  const [selectedType, setSelectedType] = useState<DocumentType>('national_id');
  const [documentUri, setDocumentUri] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(Boolean(user));
  const [verificationStatus, setVerificationStatus] = useState<VerificationRequestStatus>({
    status: 'unverified',
  });

  useEffect(() => {
    if (!user) return;
    let isMounted = true;
    fetchMyVerificationStatus(user.id)
      .then((status) => {
        if (isMounted) setVerificationStatus(status);
      })
      .catch((err) => console.error('[VerifyIdentity] fetch status failed:', err))
      .finally(() => {
        if (isMounted) setLoadingStatus(false);
      });

    return () => {
      isMounted = false;
    };
  }, [user]);

  const handlePickDocument = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please allow photo gallery access to select your verification document.',
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setDocumentUri(result.assets[0].uri);
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please allow camera access to take a photo of your document.',
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setDocumentUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to submit documents for verification.');
      return;
    }

    if (!documentUri) {
      Alert.alert(
        'Document Required',
        'Please select or capture a photo of your document before submitting.',
      );
      return;
    }

    setUploading(true);
    try {
      // 1. Upload photo to secure storage
      const uploadedUrl = await uploadPropertyImage(user.id, documentUri);

      // 2. Insert verification request record
      await submitVerificationRequest(user.id, {
        documentType: selectedType,
        documentUrl: uploadedUrl,
        notes: notes.trim(),
      });

      setVerificationStatus({ status: 'pending', submittedAt: new Date().toISOString() });
      Alert.alert(
        'Submission Received',
        'Thank you! Our trust & safety team will review your verification document within 24 to 48 hours.',
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (error) {
      console.error('[VerifyIdentity] Submission failed:', error);
      Alert.alert(
        'Upload Failed',
        error instanceof Error ? error.message : 'Please check your connection and try again.',
      );
    } finally {
      setUploading(false);
    }
  };

  if (loadingStatus) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Brand.terracotta} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color={Brand.navy} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Landlord Verification</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Status Banner */}
        {verificationStatus.status === 'pending' && (
          <View style={[styles.statusBanner, styles.pendingBanner]}>
            <Ionicons name="time" size={20} color="#D97706" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.pendingBannerTitle}>Verification Under Review</Text>
              <Text style={styles.pendingBannerDesc}>
                We received your document and our team is currently vetting your details.
              </Text>
            </View>
          </View>
        )}

        {verificationStatus.status === 'approved' && (
          <View style={[styles.statusBanner, styles.approvedBanner]}>
            <Ionicons name="checkmark-circle" size={20} color="#059669" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.approvedBannerTitle}>You are a Verified Landlord!</Text>
              <Text style={styles.approvedBannerDesc}>
                Your verified badge is live across all your property listings and profile.
              </Text>
            </View>
          </View>
        )}

        {/* Benefits Card */}
        <View style={styles.benefitsCard}>
          <Text style={styles.benefitsTitle}>Why get verified?</Text>
          <View style={styles.benefitItem}>
            <Ionicons name="shield-checkmark" size={18} color="#059669" />
            <Text style={styles.benefitText}>
              Earn the official green Verified badge on your listings
            </Text>
          </View>
          <View style={styles.benefitItem}>
            <Ionicons name="trending-up" size={18} color="#059669" />
            <Text style={styles.benefitText}>
              Higher ranking in search and explore recommendations
            </Text>
          </View>
          <View style={styles.benefitItem}>
            <Ionicons name="people" size={18} color="#059669" />
            <Text style={styles.benefitText}>
              Build trust with high-intent tenants and get faster bookings
            </Text>
          </View>
        </View>

        {/* Document Type Selection */}
        <Text style={styles.sectionHeading}>Select Document Type</Text>
        <View style={styles.docList}>
          {DOCUMENT_OPTIONS.map((opt) => {
            const isSelected = selectedType === opt.type;
            return (
              <TouchableOpacity
                key={opt.type}
                style={[styles.docOption, isSelected && styles.docOptionActive]}
                onPress={() => setSelectedType(opt.type)}
                activeOpacity={0.85}
              >
                <View style={[styles.docIconCircle, isSelected && styles.docIconCircleActive]}>
                  <Ionicons
                    name={opt.icon}
                    size={20}
                    color={isSelected ? Brand.white : Brand.navy}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.docOptionLabel, isSelected && styles.docOptionLabelActive]}>
                    {opt.label}
                  </Text>
                  <Text style={styles.docOptionDesc}>{opt.desc}</Text>
                </View>
                <Ionicons
                  name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={isSelected ? Brand.terracotta : Brand.gray400}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Document Upload Area */}
        <Text style={[styles.sectionHeading, { marginTop: 20 }]}>Upload Document Photo</Text>
        {documentUri ? (
          <View style={styles.previewContainer}>
            <Image source={{ uri: documentUri }} style={styles.previewImage} contentFit="cover" />
            <View style={styles.previewActions}>
              <TouchableOpacity style={styles.changeDocBtn} onPress={handlePickDocument}>
                <Ionicons name="swap-horizontal" size={16} color={Brand.navy} />
                <Text style={styles.changeDocText}>Change</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.removeDocBtn} onPress={() => setDocumentUri(null)}>
                <Ionicons name="trash-outline" size={16} color={Brand.error} />
                <Text style={styles.removeDocText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.uploadBox}>
            <Ionicons name="cloud-upload-outline" size={38} color={Brand.terracotta} />
            <Text style={styles.uploadPrompt}>Take a clear photo or upload from gallery</Text>
            <Text style={styles.uploadHint}>JPG, PNG up to 10MB • Clear and readable</Text>
            <View style={styles.uploadButtonsRow}>
              <TouchableOpacity
                style={styles.uploadBtn}
                onPress={handleTakePhoto}
                activeOpacity={0.85}
              >
                <Ionicons name="camera-outline" size={18} color={Brand.white} />
                <Text style={styles.uploadBtnText}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.uploadBtn, styles.galleryBtn]}
                onPress={handlePickDocument}
                activeOpacity={0.85}
              >
                <Ionicons name="images-outline" size={18} color={Brand.navy} />
                <Text style={[styles.uploadBtnText, { color: Brand.navy }]}>Gallery</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Additional notes */}
        <Text style={[styles.sectionHeading, { marginTop: 20 }]}>Additional Notes (Optional)</Text>
        <TextInput
          style={styles.notesInput}
          placeholder="E.g. Address matches rates bill, ID number..."
          placeholderTextColor={Brand.gray400}
          multiline
          numberOfLines={3}
          value={notes}
          onChangeText={setNotes}
        />

        {/* Privacy Note */}
        <View style={styles.privacyNote}>
          <Ionicons name="lock-closed" size={14} color={Brand.gray500} />
          <Text style={styles.privacyText}>
            Your documents are encrypted and confidential. They are strictly reviewed by verified
            ImbaFind staff and never shared publicly.
          </Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitBtn, (!documentUri || uploading) && { opacity: 0.6 }]}
          onPress={() => void handleSubmit()}
          disabled={!documentUri || uploading}
          activeOpacity={0.85}
        >
          {uploading ? (
            <ActivityIndicator size="small" color={Brand.white} />
          ) : (
            <Text style={styles.submitBtnText}>Submit for Verification</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Brand.cream,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
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
    fontSize: 18,
    fontWeight: '800',
    color: Brand.navy,
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  statusBanner: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
  },
  pendingBanner: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  pendingBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
  },
  pendingBannerDesc: {
    fontSize: 12,
    color: '#B45309',
    marginTop: 2,
    lineHeight: 16,
  },
  approvedBanner: {
    backgroundColor: '#D1FAE5',
    borderColor: '#A7F3D0',
  },
  approvedBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#065F46',
  },
  approvedBannerDesc: {
    fontSize: 12,
    color: '#047857',
    marginTop: 2,
    lineHeight: 16,
  },
  benefitsCard: {
    backgroundColor: Brand.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Brand.gray200,
  },
  benefitsTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Brand.navy,
    marginBottom: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  benefitText: {
    flex: 1,
    fontSize: 13,
    color: Brand.navy,
    fontWeight: '500',
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: Brand.navy,
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  docList: {
    gap: 10,
  },
  docOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Brand.white,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Brand.gray200,
  },
  docOptionActive: {
    borderColor: Brand.terracotta,
    backgroundColor: Brand.terracotta + '08',
  },
  docIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Brand.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docIconCircleActive: {
    backgroundColor: Brand.terracotta,
  },
  docOptionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Brand.navy,
  },
  docOptionLabelActive: {
    color: Brand.terracotta,
  },
  docOptionDesc: {
    fontSize: 11,
    color: Brand.gray500,
    marginTop: 2,
  },
  uploadBox: {
    backgroundColor: Brand.white,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Brand.gray300,
  },
  uploadPrompt: {
    fontSize: 14,
    fontWeight: '700',
    color: Brand.navy,
    marginTop: 10,
  },
  uploadHint: {
    fontSize: 12,
    color: Brand.gray400,
    marginTop: 4,
    marginBottom: 16,
  },
  uploadButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Brand.terracotta,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  galleryBtn: {
    backgroundColor: Brand.gray100,
    borderWidth: 1,
    borderColor: Brand.gray300,
  },
  uploadBtnText: {
    color: Brand.white,
    fontSize: 13,
    fontWeight: '700',
  },
  previewContainer: {
    backgroundColor: Brand.white,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: Brand.gray200,
  },
  previewImage: {
    width: '100%',
    height: 220,
    borderRadius: 12,
  },
  previewActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 10,
  },
  changeDocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Brand.gray100,
  },
  changeDocText: {
    fontSize: 12,
    fontWeight: '600',
    color: Brand.navy,
  },
  removeDocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
  },
  removeDocText: {
    fontSize: 12,
    fontWeight: '600',
    color: Brand.error,
  },
  notesInput: {
    backgroundColor: Brand.white,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Brand.gray200,
    fontSize: 13,
    color: Brand.navy,
    textAlignVertical: 'top',
    minHeight: 70,
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 14,
    paddingHorizontal: 4,
  },
  privacyText: {
    flex: 1,
    fontSize: 11,
    color: Brand.gray500,
    lineHeight: 16,
  },
  submitBtn: {
    backgroundColor: Brand.terracotta,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    shadowColor: Brand.terracotta,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  submitBtnText: {
    color: Brand.white,
    fontSize: 15,
    fontWeight: '800',
  },
});
