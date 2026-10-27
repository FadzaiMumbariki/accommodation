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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Brand } from '../constants/Colors';
import { useApp } from '../context/AppContext';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { useAuth } from '../context/AuthContext';
import { uploadPropertyImage } from '../lib/database';
import { generateListingDescription } from '../lib/ai';
import { getMarketBenchmark } from '../lib/trustCheck';
import type { PropertyType } from '../types';

const PROPERTY_TYPES: { label: string; value: PropertyType }[] = [
  { label: 'House', value: 'house' },
  { label: 'Apartment', value: 'apartment' },
  { label: 'Room', value: 'room' },
  { label: 'Cottage', value: 'cottage' },
  { label: 'Flat', value: 'flat' },
  { label: 'Bedsitter', value: 'bedsitter' },
];

const AMENITIES_LIST = [
  'Water',
  'Electricity',
  'Solar',
  'Security',
  'Durawall',
  'Parking',
  'Garden',
  'Borehole',
  'Wi-Fi',
  'Kitchen',
  'Aircon',
  'Washing Machine',
  'Furnished',
];

const getProvinceForCity = (city: string): string => {
  const lower = city.toLowerCase().trim();
  const provinceMap: Record<string, string> = {
    bulawayo: 'Bulawayo Province',
    harare: 'Harare Province',
    chitungwiza: 'Harare Province',
    gweru: 'Midlands',
    kwekwe: 'Midlands',
    zvishavane: 'Midlands',
    shurugwi: 'Midlands',
    mutare: 'Manicaland',
    chimanimani: 'Manicaland',
    nyanga: 'Manicaland',
    rusape: 'Manicaland',
    masvingo: 'Masvingo',
    chiredzi: 'Masvingo',
    zaka: 'Masvingo',
    chinhoyi: 'Mashonaland West',
    kadoma: 'Mashonaland West',
    kariba: 'Mashonaland West',
    chegutu: 'Mashonaland West',
    bindura: 'Mashonaland Central',
    'mount darwin': 'Mashonaland Central',
    mazowe: 'Mashonaland Central',
    marondera: 'Mashonaland East',
    wedza: 'Mashonaland East',
    chivhu: 'Mashonaland East',
    hwange: 'Matabeleland North',
    'victoria falls': 'Matabeleland North',
    bulilima: 'Matabeleland South',
    gwanda: 'Matabeleland South',
    kezi: 'Matabeleland South',
  };
  return provinceMap[lower] || '';
};

export default function AddPropertyScreen() {
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const { addProperty, updateProperty, properties } = useApp();
  const requireAuth = useRequireAuth();
  const { user, isSupabaseEnabled } = useAuth();
  const editingProperty = properties.find(property => property.id === editId);

  const [title, setTitle] = useState(editingProperty?.title ?? '');
  const [city, setCity] = useState(editingProperty?.city ?? 'Bulawayo');
  const [suburb, setSuburb] = useState(editingProperty?.suburb ?? '');
  const [price, setPrice] = useState(String(editingProperty?.price ?? 300));
  const [deposit, setDeposit] = useState(String(editingProperty?.deposit ?? 300));
  const [propertyType, setPropertyType] = useState<PropertyType>(editingProperty?.propertyType ?? 'house');
  const [bedrooms, setBedrooms] = useState(editingProperty?.bedrooms ?? 2);
  const [bathrooms, setBathrooms] = useState(editingProperty?.bathrooms ?? 1);
  const [maxOccupants, setMaxOccupants] = useState(editingProperty?.maxOccupants ?? 4);
  const [description, setDescription] = useState(editingProperty?.description ?? '');
  const [pickedImages, setPickedImages] = useState<string[]>(editingProperty?.images ?? []);
  const [uploadedUrls, setUploadedUrls] = useState<Record<string, string>>({});
  const [uploadStates, setUploadStates] = useState<Record<string, 'uploading' | 'uploaded' | 'failed'>>({});
  const [pickingImage, setPickingImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [writingDescription, setWritingDescription] = useState(false);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([
    'Water',
    'Electricity',
    'Security',
    'Parking',
    ...(editingProperty?.amenities ?? []),
  ]);

  const currentPriceNum = Number(price) || 0;
  const currentBenchmark = getMarketBenchmark(city, propertyType, bedrooms);
  const isCurrentPriceLow = currentPriceNum > 0 && currentPriceNum < currentBenchmark.min * 0.55;
  const isCurrentPriceHigh = currentPriceNum > currentBenchmark.max * 1.7;

  /** Open the device photo library and append the chosen image URI. */
  const handlePickImage = async () => {
    setPickingImage(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permission required',
          'Please allow access to your photo library to add property photos.',
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 1,
        orderedSelection: true,
      });
      if (!result.canceled) {
        const remaining = Math.max(0, 8 - pickedImages.length);
        const uris = result.assets.slice(0, remaining).map(asset => asset.uri);
        setPickedImages(prev => [...prev, ...uris]);
        if (result.assets.length > remaining) {
          Alert.alert('Photo limit reached', 'A listing can have up to 8 photos.');
        }
      }
    } catch (error) {
      console.error('[AddProperty] Photo picker failed:', error);
      Alert.alert('Photo picker error', 'Could not open your photo library. Please try again.');
    } finally {
      setPickingImage(false);
    }
  };

  const removeImage = (uri: string) => {
    setPickedImages(prev => prev.filter(u => u !== uri));
    setUploadedUrls(prev => {
      const next = { ...prev };
      delete next[uri];
      return next;
    });
    setUploadStates(prev => {
      const next = { ...prev };
      delete next[uri];
      return next;
    });
  };

  const uploadImage = async (uri: string): Promise<string | null> => {
    if (!user?.id) {
      Alert.alert('Sign in required', 'Please sign in to upload property photos.');
      return null;
    }
    setUploadStates(prev => ({ ...prev, [uri]: 'uploading' }));
    try {
      const publicUrl = await uploadPropertyImage(user.id, uri);
      setUploadedUrls(prev => ({ ...prev, [uri]: publicUrl }));
      setUploadStates(prev => ({ ...prev, [uri]: 'uploaded' }));
      return publicUrl;
    } catch (error) {
      console.error('[AddProperty] Photo upload failed:', error);
      setUploadStates(prev => ({ ...prev, [uri]: 'failed' }));
      return null;
    }
  };

  const toggleAmenity = (item: string) => {
    if (selectedAmenities.includes(item)) {
      setSelectedAmenities(selectedAmenities.filter((a) => a !== item));
    } else {
      setSelectedAmenities([...selectedAmenities, item]);
    }
  };

  const adjustCounter = (
    value: number,
    setter: (v: number) => void,
    delta: number,
    min = 0,
    max = 20
  ) => {
    const next = Math.max(min, Math.min(max, value + delta));
    setter(next);
  };

  const handleWriteDescription = async () => {
    if (!title.trim() && !suburb.trim()) {
      Alert.alert('Add details first', 'Enter a title and suburb so the AI has facts to work from.');
      return;
    }
    setWritingDescription(true);
    try {
      const numericPrice = Number(price) || 0;
      const benchmark = getMarketBenchmark(city, propertyType, bedrooms);

      const draft = await generateListingDescription({
        title: title.trim(),
        propertyType,
        city,
        suburb: suburb.trim(),
        bedrooms,
        bathrooms,
        price: numericPrice,
        amenities: selectedAmenities,
      });
      setDescription(draft);

      let priceNotice = '';
      if (numericPrice > 0 && numericPrice < benchmark.min * 0.55) {
        priceNotice = `\n\n⚠️ Unusual Price Warning: $${numericPrice} is far below the typical range ($${benchmark.min} - $${benchmark.max}) for a ${bedrooms}-bed ${propertyType} in ${city}. Please verify your price so tenants don't mistake it for a scam listing.`;
      } else if (numericPrice > benchmark.max * 1.7) {
        priceNotice = `\n\nℹ️ Price Notice: $${numericPrice} is higher than typical rates in ${city} ($${benchmark.min} - $${benchmark.max}). Highlight unique backup utilities to justify the premium.`;
      }

      Alert.alert(
        'Draft Ready & Price Evaluated',
        `This description was written by the AI Writing Assistant from your property facts.${priceNotice}\n\nPlease check it for accuracy and edit before publishing.`
      );
    } catch (error) {
      Alert.alert('AI unavailable', error instanceof Error ? error.message : 'Please write the description yourself.');
    } finally {
      setWritingDescription(false);
    }
  };

  const handlePublish = async () => {
    if (!requireAuth('/add-property')) return;
    if (!title.trim() || !suburb.trim()) {
      Alert.alert('Required Fields', 'Please enter a property title and suburb.');
      return;
    }
    if (pickedImages.length < 1) {
      Alert.alert('Photo required', 'Please add at least one property photo.');
      return;
    }
    if (pickedImages.length > 8) {
      Alert.alert('Photo limit reached', 'A listing can have up to 8 photos.');
      return;
    }

    setSaving(true);
    try {
      const imageUrls: string[] = [];
      for (const uri of pickedImages) {
        if (!isSupabaseEnabled || (!uri.startsWith('file://') && !uri.startsWith('content://'))) {
          imageUrls.push(uri);
          continue;
        }
        const publicUrl = uploadedUrls[uri] ?? await uploadImage(uri);
        if (!publicUrl) {
          Alert.alert('Photo upload failed', 'Retry each failed photo before publishing your listing.');
          return;
        }
        imageUrls.push(publicUrl);
      }

      const payload = {
        title: title.trim(),
        description: description || 'Beautiful, secure property available in ' + suburb + ', ' + city + '.',
        price: parseFloat(price) || 300,
        deposit: parseFloat(deposit) || 300,
        propertyType,
        province: getProvinceForCity(city),
        city: city.trim(),
        suburb: suburb.trim(),
        bedrooms,
        bathrooms,
        maxOccupants,
        available: editingProperty?.available ?? true,
        availabilityStatus: editingProperty?.availabilityStatus ?? 'available_now' as const,
        availableFromDate: editingProperty?.availableFromDate,
        coordinates: editingProperty?.coordinates,
        verified: editingProperty?.verified ?? false,
        amenities: [...new Set(selectedAmenities)],
        images: imageUrls,
      };
      if (editingProperty) {
        await updateProperty(editingProperty.id, payload);
      } else {
        await addProperty(payload);
      }

      Alert.alert(
        editingProperty ? 'Listing Updated' : 'Property Listed!',
        editingProperty
          ? 'Your property listing has been updated.'
          : 'Your property has been successfully listed and is now visible to tenants across Zimbabwe.',
        [{ text: 'View Dashboard', onPress: () => router.replace('/landlord-dashboard') }],
      );
    } catch (error) {
      console.error('[AddProperty] Listing save failed:', error);
      Alert.alert(
        'Could not save listing',
        error instanceof Error ? error.message : 'Please check your connection and try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Brand.cream} />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={Brand.navy} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{editingProperty ? 'Edit Property' : 'Add Property'}</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>

          <Text style={styles.inputLabel}>Property Title *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Modern 2-Bedroom Cottage with Solar"
            placeholderTextColor={Brand.gray400}
          />

          <View style={styles.rowInputs}>
            <View style={[styles.inputWrap, { flex: 1 }]}>
              <Text style={styles.inputLabel}>City *</Text>
              <TextInput
                style={styles.input}
                value={city}
                onChangeText={setCity}
                placeholder="e.g. Bulawayo"
                placeholderTextColor={Brand.gray400}
              />
            </View>
            <View style={[styles.inputWrap, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Suburb *</Text>
              <TextInput
                style={styles.input}
                value={suburb}
                onChangeText={setSuburb}
                placeholder="e.g. Nkulumane"
                placeholderTextColor={Brand.gray400}
              />
            </View>
          </View>

          <Text style={styles.inputLabel}>Property Type</Text>
          <View style={styles.chipsWrap}>
            {PROPERTY_TYPES.map((type) => (
              <TouchableOpacity
                key={type.value}
                style={[styles.chip, propertyType === type.value && styles.chipActive]}
                onPress={() => setPropertyType(type.value)}
              >
                <Text
                  style={[styles.chipText, propertyType === type.value && styles.chipTextActive]}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rental Price & Deposit</Text>
          <View style={styles.rowInputs}>
            <View style={[styles.inputWrap, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Monthly Rent (USD $) *</Text>
              <TextInput
                style={styles.input}
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
                placeholder="300"
                placeholderTextColor={Brand.gray400}
              />
            </View>
            <View style={[styles.inputWrap, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Security Deposit ($)</Text>
              <TextInput
                style={styles.input}
                value={deposit}
                onChangeText={setDeposit}
                keyboardType="numeric"
                placeholder="300"
                placeholderTextColor={Brand.gray400}
              />
            </View>
          </View>

          {/* AI Price Benchmark Guidance (Warns if price is unusual for the area) */}
          {currentPriceNum > 0 && (
            <View
              style={[
                styles.priceBenchmarkBox,
                isCurrentPriceLow && styles.priceBenchmarkBoxWarn,
                isCurrentPriceHigh && styles.priceBenchmarkBoxInfo,
              ]}
            >
              <Ionicons
                name={
                  isCurrentPriceLow
                    ? 'alert-circle'
                    : isCurrentPriceHigh
                    ? 'information-circle'
                    : 'checkmark-circle'
                }
                size={16}
                color={
                  isCurrentPriceLow
                    ? '#EF4444'
                    : isCurrentPriceHigh
                    ? '#3B82F6'
                    : '#10B981'
                }
              />
              <Text
                style={[
                  styles.priceBenchmarkText,
                  isCurrentPriceLow && styles.priceBenchmarkTextWarn,
                ]}
              >
                {isCurrentPriceLow
                  ? `Warning: $${currentPriceNum} is unusually low for a ${bedrooms}-bed ${propertyType} in ${city} (typical: $${currentBenchmark.min} - $${currentBenchmark.max}). AI Trust Check may flag unusually low prices.`
                  : isCurrentPriceHigh
                  ? `Notice: $${currentPriceNum} is above average for ${city} ($${currentBenchmark.min} - $${currentBenchmark.max}). Ensure premium backup utilities are highlighted.`
                  : `Price ($${currentPriceNum}/mo) matches standard market rates for ${city} ($${currentBenchmark.min} - $${currentBenchmark.max}).`}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Capacity & Rooms</Text>
          <View style={styles.countersRow}>
            <View style={styles.counterItem}>
              <Text style={styles.counterLabel}>Bedrooms</Text>
              <View style={styles.counterControl}>
                <TouchableOpacity
                  style={styles.counterBtn}
                  onPress={() => adjustCounter(bedrooms, setBedrooms, -1, 0)}
                  accessibilityRole="button"
                  accessibilityLabel="Decrease bedrooms"
                >
                  <Ionicons name="remove" size={16} color={Brand.navy} />
                </TouchableOpacity>
                <Text style={styles.counterValue}>{bedrooms}</Text>
                <TouchableOpacity
                  style={styles.counterBtn}
                  onPress={() => adjustCounter(bedrooms, setBedrooms, 1, 0, 10)}
                  accessibilityRole="button"
                  accessibilityLabel="Increase bedrooms"
                >
                  <Ionicons name="add" size={16} color={Brand.navy} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.counterItem}>
              <Text style={styles.counterLabel}>Bathrooms</Text>
              <View style={styles.counterControl}>
                <TouchableOpacity
                  style={styles.counterBtn}
                  onPress={() => adjustCounter(bathrooms, setBathrooms, -1, 0)}
                  accessibilityRole="button"
                  accessibilityLabel="Decrease bathrooms"
                >
                  <Ionicons name="remove" size={16} color={Brand.navy} />
                </TouchableOpacity>
                <Text style={styles.counterValue}>{bathrooms}</Text>
                <TouchableOpacity
                  style={styles.counterBtn}
                  onPress={() => adjustCounter(bathrooms, setBathrooms, 1, 0, 8)}
                  accessibilityRole="button"
                  accessibilityLabel="Increase bathrooms"
                >
                  <Ionicons name="add" size={16} color={Brand.navy} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.counterItem}>
              <Text style={styles.counterLabel}>Max Occupants</Text>
              <View style={styles.counterControl}>
                <TouchableOpacity
                  style={styles.counterBtn}
                  onPress={() => adjustCounter(maxOccupants, setMaxOccupants, -1, 1)}
                  accessibilityRole="button"
                  accessibilityLabel="Decrease maximum occupants"
                >
                  <Ionicons name="remove" size={16} color={Brand.navy} />
                </TouchableOpacity>
                <Text style={styles.counterValue}>{maxOccupants}</Text>
                <TouchableOpacity
                  style={styles.counterBtn}
                  onPress={() => adjustCounter(maxOccupants, setMaxOccupants, 1, 1, 20)}
                  accessibilityRole="button"
                  accessibilityLabel="Increase maximum occupants"
                >
                  <Ionicons name="add" size={16} color={Brand.navy} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Property Photos</Text>
          <Text style={styles.photoHint}>Add up to 8 photos from your gallery</Text>
          <View style={styles.photoGrid}>
            {pickedImages.map((img, i) => (
              <View
                key={img + i}
                style={styles.photoTile}
              >
                <Image
                  source={{ uri: img }}
                  style={styles.photoTileImage}
                  contentFit="cover"
                  transition={150}
                  cachePolicy="memory-disk"
                />
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => removeImage(img)}
                  accessibilityLabel={`Remove photo ${i + 1}`}
                  accessibilityRole="button"
                >
                  <Ionicons name="close" size={12} color={Brand.white} />
                </TouchableOpacity>
                {uploadStates[img] === 'uploading' && (
                  <View style={styles.photoStatus}>
                    <ActivityIndicator size="small" color={Brand.white} />
                    <Text style={styles.photoStatusText}>Uploading</Text>
                  </View>
                )}
                {uploadStates[img] === 'uploaded' && (
                  <View style={styles.photoStatus}>
                    <Ionicons name="checkmark-circle" size={14} color={Brand.white} />
                    <Text style={styles.photoStatusText}>Uploaded</Text>
                  </View>
                )}
                {uploadStates[img] === 'failed' && (
                  <View style={styles.photoStatus}>
                    <Text style={styles.photoStatusText}>Failed</Text>
                    <TouchableOpacity
                      onPress={() => void uploadImage(img)}
                      accessibilityLabel={`Retry uploading photo ${i + 1}`}
                      accessibilityRole="button"
                    >
                      <Text style={styles.photoRetry}>Retry</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
            {/* Add photo button */}
            {pickedImages.length < 8 && (
              <TouchableOpacity
                style={[styles.photoTile, styles.photoTileAdd]}
                onPress={handlePickImage}
                disabled={pickingImage}
                accessibilityRole="button"
                accessibilityLabel="Choose property photos"
              >
                {pickingImage ? (
                  <ActivityIndicator color={Brand.terracotta} />
                ) : (
                  <>
                    <Ionicons name="camera" size={28} color={Brand.gray400} />
                    <Text style={styles.photoAddText}>Add Photo</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Amenities</Text>
          <View style={styles.chipsWrap}>
            {AMENITIES_LIST.map((item) => {
              const active = selectedAmenities.includes(item);
              return (
                <TouchableOpacity
                  key={item}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => toggleAmenity(item)}
                >
                  <Ionicons
                    name={active ? 'checkmark-circle' : 'add-circle-outline'}
                    size={16}
                    color={active ? Brand.white : Brand.gray600}
                  />
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <TouchableOpacity
            onPress={handleWriteDescription}
            disabled={writingDescription}
            style={styles.aiAssistantBtn}
            accessibilityRole="button"
            accessibilityLabel="Listing writing assistant: draft description and check price"
          >
            {writingDescription ? (
              <ActivityIndicator size="small" color={Brand.white} />
            ) : (
              <Ionicons name="sparkles" size={15} color={Brand.white} />
            )}
            <Text style={styles.aiAssistantBtnText}>
              {writingDescription ? 'Writing with AI…' : 'AI Writing Assistant (Draft & Price Check)'}
            </Text>
          </TouchableOpacity>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            placeholder="Describe the condition, proximity to public transport, schools, borehole water availability, lease terms..."
            placeholderTextColor={Brand.gray400}
          />
        </View>

        <TouchableOpacity
          style={styles.publishBtn}
          onPress={handlePublish}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color={Brand.white} />
          ) : (
            <>
              <Text style={styles.publishBtnText}>
                {editingProperty ? 'Save Listing Changes' : 'Publish Property Listing'}
              </Text>
              <Ionicons name="checkmark-done" size={20} color={Brand.white} />
            </>
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
    width: 40,
    height: 40,
    borderRadius: 20,
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
  section: {
    backgroundColor: Brand.white,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    shadowColor: Brand.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Brand.navy,
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Brand.gray700,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Brand.gray50,
    borderWidth: 1,
    borderColor: Brand.gray200,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: Brand.navy,
    marginBottom: 12,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    marginBottom: 0,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 10,
  },
  inputWrap: {
    marginBottom: 4,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: Brand.gray100,
    borderWidth: 1,
    borderColor: Brand.gray200,
  },
  chipActive: {
    backgroundColor: Brand.terracotta,
    borderColor: Brand.terracotta,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
    color: Brand.gray700,
  },
  chipTextActive: {
    color: Brand.white,
  },
  countersRow: {
    flexDirection: 'row',
    gap: 10,
  },
  counterItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Brand.gray50,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: Brand.gray200,
  },
  counterLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Brand.gray600,
    marginBottom: 10,
  },
  counterControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  counterBtn: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: Brand.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Brand.gray200,
  },
  counterValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Brand.navy,
    minWidth: 20,
    textAlign: 'center',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  photoTile: {
    width: '23%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  photoTileActive: {
    borderColor: Brand.terracotta,
    shadowColor: Brand.terracotta,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 2,
  },
  photoTileImage: {
    width: '100%',
    height: '100%',
  },
  removeBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoStatus: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 24,
    backgroundColor: 'rgba(0,0,0,0.65)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 3,
  },
  photoStatusText: { color: Brand.white, fontSize: 9, fontWeight: '700' },
  photoRetry: { color: Brand.white, fontSize: 10, fontWeight: '800', textDecorationLine: 'underline' },
  photoTileAdd: {
    backgroundColor: Brand.gray100,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Brand.gray300,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  photoAddText: {
    fontSize: 9,
    fontWeight: '600',
    color: Brand.gray500,
    textAlign: 'center',
  },
  photoHint: {
    fontSize: 12,
    color: Brand.gray500,
    marginBottom: 12,
    marginTop: -8,
  },
  publishBtn: {
    backgroundColor: Brand.terracotta,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    marginTop: 10,
    shadowColor: Brand.terracotta,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  publishBtnText: {
    color: Brand.white,
    fontSize: 16,
    fontWeight: '800',
  },
  priceBenchmarkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    gap: 8,
  },
  priceBenchmarkBoxWarn: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  priceBenchmarkBoxInfo: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  priceBenchmarkText: {
    flex: 1,
    fontSize: 12,
    color: '#166534',
    lineHeight: 16,
    fontWeight: '500',
  },
  priceBenchmarkTextWarn: {
    color: '#991B1B',
    fontWeight: '600',
  },
  aiAssistantBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: Brand.navy,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  aiAssistantBtnText: {
    color: Brand.white,
    fontWeight: '700',
    fontSize: 13,
  },
});
