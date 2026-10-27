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
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Brand } from '../constants/Colors';
import { useApp } from '../context/AppContext';
import { useRequireAuth } from '../hooks/useRequireAuth';
import type { PropertyType } from '../types';
import { matchRequestToListings, type SmartMatchResult } from '../lib/smartMatching';

const AMENITY_TAGS = ['Water', 'Electricity', 'Parking', 'Solar', 'Security', 'Wi-Fi', 'Borehole', 'Garden'];
const PROPERTY_TYPES: PropertyType[] = ['house', 'apartment', 'flat', 'room', 'cottage', 'bedsitter'];

function getDefaultMoveInDate(): string {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

export default function PostAccommodationRequestScreen() {
  const { addRequest, properties } = useApp();
  const requireAuth = useRequireAuth();

  const [location, setLocation] = useState('Bulawayo');
  const [propertyType, setPropertyType] = useState('House');
  const [people, setPeople] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [budget, setBudget] = useState('');
  const [moveInDate, setMoveInDate] = useState(getDefaultMoveInDate);
  const [furnished, setFurnished] = useState('Any');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [additionalRequirements, setAdditionalRequirements] = useState('');
  const [saving, setSaving] = useState(false);
  const [matchedListings, setMatchedListings] = useState<SmartMatchResult[]>([]);
  const [matchingLoading, setMatchingLoading] = useState(false);
  const [hasSearchedMatches, setHasSearchedMatches] = useState(false);

  const handleFindMatches = async () => {
    const { min: minBudget, max: maxBudget } = parseBudget(budget);
    if (!Number.isFinite(maxBudget) || maxBudget <= 0) {
      Alert.alert(
        'Enter budget first',
        'Please enter your monthly budget (e.g. 300) so we can find matching places.'
      );
      return;
    }
    setMatchingLoading(true);
    setHasSearchedMatches(true);
    try {
      const bedroomCount = Number.parseInt(bedrooms, 10);
      const matches = await matchRequestToListings(
        {
          city: location,
          propertyType: propertyType.toLowerCase(),
          bedrooms: Number.isFinite(bedroomCount) ? bedroomCount : 'any',
          minBudget: minBudget || 0,
          maxBudget,
          moveInDate,
          amenities: selectedAmenities,
        },
        properties
      );
      setMatchedListings(matches);
      if (matches.length === 0) {
        Alert.alert(
          'No Immediate Matches',
          `We didn't find active listings strictly matching your criteria in ${location} right now, but posting your request will notify matching landlords immediately!`
        );
      }
    } catch (err) {
      console.error('[PostRequest] Match error:', err);
    } finally {
      setMatchingLoading(false);
    }
  };

  const toggleAmenity = (item: string) => {
    if (selectedAmenities.includes(item)) {
      setSelectedAmenities(selectedAmenities.filter((a) => a !== item));
    } else {
      setSelectedAmenities([...selectedAmenities, item]);
    }
  };

  const handlePickLocation = () => {
    Alert.alert('Select Location', 'Choose city in Zimbabwe', [
      { text: 'Bulawayo', onPress: () => setLocation('Bulawayo') },
      { text: 'Harare', onPress: () => setLocation('Harare') },
      { text: 'Gweru', onPress: () => setLocation('Gweru') },
      { text: 'Mutare', onPress: () => setLocation('Mutare') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handlePickType = () => {
    Alert.alert('Property Type', 'Choose property type', [
      { text: 'House', onPress: () => setPropertyType('House') },
      { text: 'Apartment', onPress: () => setPropertyType('Apartment') },
      { text: 'Flat', onPress: () => setPropertyType('Flat') },
      { text: 'Room', onPress: () => setPropertyType('Room') },
      { text: 'Cottage', onPress: () => setPropertyType('Cottage') },
      { text: 'Bedsitter', onPress: () => setPropertyType('Bedsitter') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handlePickFurnished = () => {
    Alert.alert('Furnished Preference', 'Select furnished status', [
      { text: 'Furnished', onPress: () => setFurnished('Furnished') },
      { text: 'Semi-furnished', onPress: () => setFurnished('Semi-furnished') },
      { text: 'Unfurnished', onPress: () => setFurnished('Unfurnished') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const parseBudget = (raw: string): { min: number; max: number } => {
    const matches = raw.match(/\d+/g);
    if (!matches || matches.length === 0) return { min: 0, max: 0 };
    const nums = matches.map(Number).sort((a, b) => a - b);
    return nums.length >= 2
      ? { min: nums[0], max: nums[nums.length - 1] }
      : { min: nums[0], max: nums[0] };
  };

  const handleSubmit = async () => {
    if (!requireAuth('/post-request')) return;
    const { min: minBudget, max: maxBudget } = parseBudget(budget);
    const propertyTypeValue = PROPERTY_TYPES.find(
      type => type === propertyType.toLowerCase(),
    ) ?? 'any';
    const numberOfPeople = Number.parseInt(people, 10);
    const bedroomCount = Number.parseInt(bedrooms, 10);
    if (!/\d+/.test(budget) || !Number.isFinite(minBudget) || !Number.isFinite(maxBudget) || minBudget < 0 || maxBudget < minBudget) {
      Alert.alert('Invalid budget', 'Enter a minimum and maximum monthly budget.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(moveInDate)) {
      Alert.alert('Invalid move-in date', 'Enter the date using YYYY-MM-DD.');
      return;
    }
    const today = new Date();
    const todayIso = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0'),
    ].join('-');
    if (moveInDate < todayIso) {
      Alert.alert('Invalid move-in date', 'Choose today or a future move-in date.');
      return;
    }
    if (!Number.isFinite(numberOfPeople) || numberOfPeople < 1) {
      Alert.alert('Number of people required', 'Enter how many people need accommodation.');
      return;
    }

    setSaving(true);
    try {
      await addRequest({
        province: `${location} Province`,
        city: location,
        suburb: location,
        propertyType: propertyTypeValue,
        bedrooms: Number.isFinite(bedroomCount) && bedroomCount > 0 ? bedroomCount : 'any',
        numberOfPeople,
        minBudget,
        maxBudget,
        moveInDate,
        furnished: furnished === 'Any' ? 'any' : furnished.toLowerCase() as 'furnished' | 'semi-furnished' | 'unfurnished',
        amenities: selectedAmenities,
        additionalNotes: additionalRequirements.trim() || undefined,
        status: 'active',
      });

      Alert.alert(
        'Request Posted',
        'Your accommodation request has been posted successfully. Matching landlords can now contact you.',
        [{ text: 'View Activity', onPress: () => router.replace('/my-activity') }],
      );
    } catch (error) {
      console.error('[PostRequest] Could not post request:', error);
      Alert.alert(
        'Could not post request',
        error instanceof Error ? error.message : 'Please check your connection and try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

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
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Tell us what you&apos;re looking for</Text>
          <Text style={styles.headerSubtitle}>
            Help landlords find you by sharing your requirements.
          </Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Location */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Location</Text>
          <TouchableOpacity
            style={styles.inputBoxRow}
            onPress={handlePickLocation}
            activeOpacity={0.8}
          >
            <View style={styles.inputInner}>
              <Ionicons name="location-outline" size={16} color={Brand.terracotta} />
              <Text style={styles.inputText}>{location}</Text>
            </View>
            <Ionicons name="chevron-down" size={16} color={Brand.gray400} />
          </TouchableOpacity>
        </View>

        {/* Property Type */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Property type</Text>
          <TouchableOpacity
            style={styles.inputBoxRow}
            onPress={handlePickType}
            activeOpacity={0.8}
          >
            <Text style={styles.inputText}>{propertyType}</Text>
            <Ionicons name="chevron-down" size={16} color={Brand.gray400} />
          </TouchableOpacity>
        </View>

        {/* Number of People */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Number of people</Text>
          <View style={styles.inputBox}>
            <TextInput
              style={styles.inputText}
              value={people}
              onChangeText={setPeople}
              placeholder="e.g. 4 people"
              placeholderTextColor={Brand.gray400}
            />
          </View>
        </View>

        {/* Bedrooms */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Bedrooms</Text>
          <View style={styles.inputBox}>
            <TextInput
              style={styles.inputText}
              value={bedrooms}
              onChangeText={setBedrooms}
              placeholder="e.g. 2 bedrooms"
              placeholderTextColor={Brand.gray400}
            />
          </View>
        </View>

        {/* Budget (monthly) */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Budget (monthly)</Text>
          <View style={styles.inputBox}>
            <TextInput
              style={styles.inputText}
              value={budget}
              onChangeText={setBudget}
              placeholder="e.g. $250 - $350"
              placeholderTextColor={Brand.gray400}
            />
          </View>
        </View>

        {/* Move-in date */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Move-in date</Text>
          <View style={styles.inputBoxRow}>
            <TextInput
              style={[styles.inputText, { flex: 1 }]}
              value={moveInDate}
              onChangeText={setMoveInDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={Brand.gray400}
            />
            <Ionicons name="calendar-outline" size={18} color={Brand.gray500} />
          </View>
        </View>

        {/* Furnished */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Furnished</Text>
          <TouchableOpacity
            style={styles.inputBoxRow}
            onPress={handlePickFurnished}
            activeOpacity={0.8}
          >
            <Text style={styles.inputText}>{furnished}</Text>
            <Ionicons name="chevron-down" size={16} color={Brand.gray400} />
          </TouchableOpacity>
        </View>

        {/* Amenities (optional) */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Amenities (optional)</Text>
          <View style={styles.amenitiesWrap}>
            {AMENITY_TAGS.slice(0, 3).map((item) => {
              const active = selectedAmenities.includes(item);
              return (
                <TouchableOpacity
                  key={item}
                  style={[styles.amenityChip, active && styles.amenityChipActive]}
                  onPress={() => toggleAmenity(item)}
                >
                  <Ionicons
                    name={active ? 'checkmark-circle' : 'add-circle-outline'}
                    size={14}
                    color={active ? Brand.terracotta : Brand.gray400}
                  />
                  <Text style={[styles.amenityChipText, active && styles.amenityChipTextActive]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={styles.amenityChipMore}
              onPress={() => {
                Alert.alert(
                  'More Amenities',
                  AMENITY_TAGS.slice(3).join(', '),
                  [{ text: 'OK' }]
                );
              }}
            >
              <Text style={styles.amenityChipMoreText}>+{AMENITY_TAGS.slice(3).length}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Additional requirements */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Additional requirements</Text>
          <View style={[styles.inputBox, styles.textAreaBox]}>
            <TextInput
              style={[styles.inputText, styles.textAreaInput]}
              value={additionalRequirements}
              onChangeText={setAdditionalRequirements}
              multiline
              numberOfLines={3}
              placeholder="e.g. Near public transport, quiet neighborhood..."
              placeholderTextColor={Brand.gray400}
            />
          </View>
        </View>

        {/* AI Smart Request Matching (Compares request against listings with AI reasons) */}
        <View style={styles.aiMatchSection}>
          <TouchableOpacity
            style={styles.aiMatchBtn}
            onPress={handleFindMatches}
            disabled={matchingLoading}
            activeOpacity={0.85}
          >
            {matchingLoading ? (
              <ActivityIndicator color={Brand.white} size="small" />
            ) : (
              <>
                <Ionicons name="sparkles" size={18} color={Brand.white} />
                <Text style={styles.aiMatchBtnText}>
                  Find Matching Listings with AI
                </Text>
              </>
            )}
          </TouchableOpacity>

          {hasSearchedMatches && matchedListings.length > 0 && (
            <View style={styles.matchesContainer}>
              <View style={styles.matchesHeader}>
                <Ionicons name="sparkles" size={16} color={Brand.terracotta} />
                <Text style={styles.matchesTitle}>
                  Top Suggested Matches ({matchedListings.length})
                </Text>
              </View>
              <Text style={styles.matchesSubtitle}>
                AI compared your budget, location & amenities with active listings:
              </Text>

              {matchedListings.map((match, idx) => (
                <View key={match.property.id || idx} style={styles.matchCard}>
                  <View style={styles.matchCardTop}>
                    {match.property.images?.[0] ? (
                      <Image
                        source={{ uri: match.property.images[0] }}
                        style={styles.matchThumb}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={[styles.matchThumb, styles.matchThumbEmpty]}>
                        <Ionicons name="home" size={20} color={Brand.gray400} />
                      </View>
                    )}
                    <View style={styles.matchInfo}>
                      <View style={styles.matchTitleRow}>
                        <Text style={styles.matchPropertyTitle} numberOfLines={1}>
                          {match.property.title}
                        </Text>
                        <View style={styles.matchScorePill}>
                          <Text style={styles.matchScoreText}>{match.score}% Match</Text>
                        </View>
                      </View>
                      <Text style={styles.matchLocation}>
                        {match.property.suburb}, {match.property.city}
                      </Text>
                      <Text style={styles.matchPrice}>
                        ${match.property.price}
                        <Text style={styles.matchPricePeriod}>/mo • {match.property.bedrooms} bed</Text>
                      </Text>
                    </View>
                  </View>

                  {/* AI Reason */}
                  <View style={styles.matchReasonBox}>
                    <Ionicons name="bulb-outline" size={14} color="#B45309" />
                    <Text style={styles.matchReasonText}>{match.summaryReason}</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.viewMatchBtn}
                    onPress={() => router.push(`/property-details?id=${match.property.id}`)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.viewMatchBtnText}>View Property Details</Text>
                    <Ionicons name="arrow-forward" size={14} color={Brand.white} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Post Request Button */}
        <TouchableOpacity
          style={styles.submitBtn}
          onPress={handleSubmit}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving
            ? <ActivityIndicator color={Brand.white} />
            : <Text style={styles.submitBtnText}>Post Request</Text>}
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
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
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
    marginTop: 2,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Brand.navy,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Brand.gray500,
    marginTop: 3,
    lineHeight: 16,
  },
  scroll: {
    padding: 20,
    paddingBottom: 48,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Brand.navy,
    marginBottom: 6,
  },
  inputBox: {
    backgroundColor: Brand.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Brand.gray300,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  inputBoxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Brand.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Brand.gray300,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  inputInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inputText: {
    fontSize: 14,
    color: Brand.navy,
    fontWeight: '500',
  },
  amenitiesWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  amenityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Brand.white,
    borderWidth: 1,
    borderColor: Brand.gray300,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  amenityChipActive: {
    borderColor: Brand.terracotta,
    backgroundColor: Brand.terracotta + '10',
  },
  amenityChipText: {
    fontSize: 12,
    color: Brand.gray600,
    fontWeight: '600',
  },
  amenityChipTextActive: {
    color: Brand.terracotta,
  },
  amenityChipMore: {
    backgroundColor: Brand.gray100,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
  },
  amenityChipMoreText: {
    fontSize: 12,
    color: Brand.gray600,
    fontWeight: '700',
  },
  textAreaBox: {
    height: 80,
  },
  textAreaInput: {
    textAlignVertical: 'top',
    height: 60,
  },
  submitBtn: {
    backgroundColor: Brand.terracotta,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 10,
    shadowColor: Brand.terracotta,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  submitBtnText: {
    color: Brand.white,
    fontSize: 16,
    fontWeight: '700',
  },
  aiMatchSection: {
    marginTop: 16,
    marginBottom: 8,
  },
  aiMatchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Brand.navy,
    borderRadius: 12,
    paddingVertical: 14,
    shadowColor: Brand.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  aiMatchBtnText: {
    color: Brand.white,
    fontSize: 15,
    fontWeight: '700',
  },
  matchesContainer: {
    backgroundColor: Brand.white,
    borderRadius: 16,
    padding: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  matchesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  matchesTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Brand.navy,
  },
  matchesSubtitle: {
    fontSize: 12,
    color: Brand.gray600,
    marginTop: 2,
    marginBottom: 12,
  },
  matchCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  matchCardTop: {
    flexDirection: 'row',
    gap: 10,
  },
  matchThumb: {
    width: 64,
    height: 64,
    borderRadius: 8,
  },
  matchThumbEmpty: {
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  matchTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  matchPropertyTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: Brand.navy,
  },
  matchScorePill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  matchScoreText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
  },
  matchLocation: {
    fontSize: 11,
    color: Brand.gray600,
    marginTop: 2,
  },
  matchPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: Brand.terracotta,
    marginTop: 2,
  },
  matchPricePeriod: {
    fontSize: 11,
    fontWeight: '500',
    color: Brand.gray600,
  },
  matchReasonBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF3C7',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
    gap: 6,
  },
  matchReasonText: {
    flex: 1,
    fontSize: 11,
    color: '#92400E',
    fontWeight: '600',
    lineHeight: 15,
  },
  viewMatchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Brand.terracotta,
    borderRadius: 8,
    paddingVertical: 8,
    marginTop: 8,
  },
  viewMatchBtnText: {
    color: Brand.white,
    fontSize: 12,
    fontWeight: '700',
  },
});
