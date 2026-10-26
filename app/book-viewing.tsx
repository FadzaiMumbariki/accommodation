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
  StatusBar,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useApp } from '../context/AppContext';
import { Brand } from '../constants/Colors';
import { useRequireAuth } from '../hooks/useRequireAuth';

const TIME_SLOTS = ['09:00 AM', '10:30 AM', '02:00 PM', '04:30 PM'];
const ATTENDEE_OPTIONS = [
  { label: '1 person', count: 1 },
  { label: '2 people', count: 2 },
  { label: '3 people', count: 3 },
  { label: '4+ people', count: 4 },
];

export default function BookViewingScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { properties, selectedPropertyId, addViewing } = useApp();
  const requireAuth = useRequireAuth();
  const property = properties.find((p) => p.id === (id ?? selectedPropertyId)) || properties[0];

  // Default to tomorrow at 10:00 AM
  const getInitialDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    return d;
  };

  const [selectedDate, setSelectedDate] = useState<Date>(getInitialDate);
  const [selectedTime, setSelectedTime] = useState<string>('10:30 AM');
  const [attendeesCount, setAttendeesCount] = useState<number>(2);
  const [message, setMessage] = useState<string>(
    'I would like to view this property. Is it still available?'
  );

  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [showTimePicker, setShowTimePicker] = useState<boolean>(false);
  const [saving, setSaving] = useState(false);

  const formatDateDisplay = (d: Date): string => {
    return d.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTimeDisplay = (d: Date): string => {
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const onDateChange = (_event: DateTimePickerEvent, date?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) {
      setSelectedDate(date);
      Haptics.selectionAsync();
    }
  };

  const onTimeChange = (_event: DateTimePickerEvent, time?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (time) {
      setSelectedTime(formatTimeDisplay(time));
      Haptics.selectionAsync();
    }
  };

  const selectQuickDate = (offsetDays: number) => {
    Haptics.selectionAsync();
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    setSelectedDate(d);
  };

  const selectSaturday = () => {
    Haptics.selectionAsync();
    const d = new Date();
    const day = d.getDay();
    const diff = (6 - day + 7) % 7 || 7;
    d.setDate(d.getDate() + diff);
    setSelectedDate(d);
  };

  const openWhatsAppConfirmation = (dateStr: string, timeStr: string) => {
    const rawPhone = property.landlord?.phone ?? '+263771234567';
    let cleanPhone = rawPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0') && cleanPhone.length === 10) {
      cleanPhone = '263' + cleanPhone.slice(1);
    }
    const defaultMsg = encodeURIComponent(
      `Hi ${property.landlord?.name || 'Landlord'}, I have just booked a viewing for "${property.title}" in ${property.suburb}, ${property.city} for ${dateStr} at ${timeStr} via ImbaFind. Please let me know if this time is confirmed!`
    );
    const waUrl = `https://wa.me/${cleanPhone}?text=${defaultMsg}`;
    Linking.openURL(waUrl).catch(() => {
      Alert.alert('Notice', 'Could not open WhatsApp directly.');
    });
  };

  const handleSubmit = async () => {
    if (!requireAuth(`/book-viewing?id=${property.id}`)) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (message.length > 500) {
      Alert.alert('Message Too Long', `Your message is ${message.length} characters. Please limit it to 500 characters.`);
      return;
    }

    const dateLabel = formatDateDisplay(selectedDate);
    const dateStr = [
      selectedDate.getFullYear(),
      String(selectedDate.getMonth() + 1).padStart(2, '0'),
      String(selectedDate.getDate()).padStart(2, '0'),
    ].join('-');
    const timeParts = selectedTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!timeParts) {
      Alert.alert('Invalid time', 'Please choose one of the available viewing times.');
      return;
    }
    let hour = Number(timeParts[1]);
    if (timeParts[3].toUpperCase() === 'AM' && hour === 12) hour = 0;
    if (timeParts[3].toUpperCase() === 'PM' && hour !== 12) hour += 12;
    const scheduledAt = new Date(selectedDate);
    scheduledAt.setHours(hour, Number(timeParts[2]), 0, 0);
    if (scheduledAt <= new Date()) {
      Alert.alert('Choose a future time', 'Viewing requests must be scheduled for a future date and time.');
      return;
    }

    setSaving(true);
    try {
      await addViewing({
        propertyId: property.id,
        propertyTitle: property.title,
        propertyImage: property.images[0] ?? '',
        propertyLocation: `${property.suburb}, ${property.city}`,
        propertyPrice: property.price,
        date: dateStr,
        time: selectedTime,
        numberOfPeople: attendeesCount,
        attendees: attendeesCount,
        message,
        status: 'pending',
      });
      Alert.alert(
        'Viewing requested',
        `Your viewing request for ${property.title} on ${dateLabel} at ${selectedTime} has been submitted.`,
        [
          {
            text: 'Notify on WhatsApp',
            onPress: () => {
              openWhatsAppConfirmation(dateLabel, selectedTime);
              router.replace('/my-activity');
            },
          },
          { text: 'View Activity', onPress: () => router.replace('/my-activity') },
          { text: 'Done', style: 'cancel', onPress: () => router.back() },
        ],
      );
    } catch (error) {
      console.error('[BookViewing] Viewing request failed:', error);
      Alert.alert(
        'Could not request viewing',
        error instanceof Error ? error.message : 'Please check your connection and try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={Brand.white} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color={Brand.navy} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book a Viewing</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* Selected Property Preview */}
        <View style={styles.propertyPreview}>
          <Image
            source={{ uri: property.images[0] }}
            style={styles.propImg}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
          />
          <View style={styles.propInfo}>
            <Text style={styles.propTitle} numberOfLines={1}>
              {property.title}
            </Text>
            <Text style={styles.propLocation}>
              {property.suburb}, {property.city}
            </Text>
            <Text style={styles.propPrice}>${property.price}/month</Text>
          </View>
        </View>

        {/* Select Date Section */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Viewing Date</Text>
          
          <TouchableOpacity
            style={styles.inputBoxRow}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.8}
          >
            <View style={styles.dateDisplayRow}>
              <Ionicons name="calendar" size={18} color={Brand.terracotta} />
              <Text style={styles.inputTextBold}>{formatDateDisplay(selectedDate)}</Text>
            </View>
            <Text style={styles.changeLink}>Change</Text>
          </TouchableOpacity>

          {/* Quick Date Chips */}
          <View style={styles.chipsRow}>
            <TouchableOpacity
              style={styles.chip}
              onPress={() => selectQuickDate(1)}
              activeOpacity={0.8}
            >
              <Text style={styles.chipText}>Tomorrow</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.chip}
              onPress={() => selectQuickDate(2)}
              activeOpacity={0.8}
            >
              <Text style={styles.chipText}>In 2 Days</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.chip}
              onPress={selectSaturday}
              activeOpacity={0.8}
            >
              <Text style={styles.chipText}>Saturday</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.chip, styles.chipAccent]}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="calendar-outline" size={13} color={Brand.navy} />
              <Text style={[styles.chipText, { color: Brand.navy }]}>Calendar</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Date Picker Modal/Component */}
        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            minimumDate={new Date()}
            onChange={onDateChange}
          />
        )}

        {/* Select Time Section */}
        <View style={styles.fieldGroup}>
          <View style={styles.labelWithAction}>
            <Text style={styles.fieldLabel}>Select Time</Text>
            <TouchableOpacity onPress={() => setShowTimePicker(true)}>
              <Text style={styles.changeLink}>Custom time</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.timeSlotsGrid}>
            {TIME_SLOTS.map((slot) => {
              const isSelected = selectedTime === slot;
              return (
                <TouchableOpacity
                  key={slot}
                  style={[styles.timeSlotChip, isSelected && styles.timeSlotChipActive]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSelectedTime(slot);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="time-outline"
                    size={14}
                    color={isSelected ? Brand.white : Brand.navy}
                  />
                  <Text style={[styles.timeSlotText, isSelected && styles.timeSlotTextActive]}>
                    {slot}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Time Picker Modal/Component */}
          {showTimePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="time"
              is24Hour={false}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onTimeChange}
            />
          )}
        </View>

        {/* Number of People Section */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Attendees</Text>
          <View style={styles.attendeesRow}>
            {ATTENDEE_OPTIONS.map((opt) => {
              const isSelected = attendeesCount === opt.count;
              return (
                <TouchableOpacity
                  key={opt.label}
                  style={[styles.attendeeChip, isSelected && styles.attendeeChipActive]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setAttendeesCount(opt.count);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="person"
                    size={13}
                    color={isSelected ? Brand.white : Brand.gray500}
                  />
                  <Text style={[styles.attendeeText, isSelected && styles.attendeeTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Optional Message */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Message for Landlord (Optional)</Text>
          <View style={[styles.inputBox, styles.textAreaBox]}>
            <TextInput
              style={[styles.inputText, styles.textAreaInput]}
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={3}
              placeholder="Add any specific questions or preferred move-in date..."
              placeholderTextColor={Brand.gray400}
            />
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={styles.submitBtn}
          onPress={handleSubmit}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color={Brand.white} />
          ) : (
            <>
              <Ionicons name="calendar-outline" size={20} color={Brand.white} />
              <Text style={styles.submitBtnText}>Request Viewing</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Brand.cream },
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
    fontSize: 17,
    fontWeight: '800',
    color: Brand.navy,
  },
  body: {
    padding: 20,
    paddingBottom: 48,
  },
  propertyPreview: {
    flexDirection: 'row',
    gap: 14,
    backgroundColor: Brand.white,
    borderRadius: 14,
    padding: 12,
    marginBottom: 20,
    shadowColor: Brand.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: Brand.gray200,
  },
  propImg: {
    width: 68,
    height: 68,
    borderRadius: 10,
  },
  propInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  propTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Brand.navy,
  },
  propLocation: {
    fontSize: 12,
    color: Brand.gray500,
    marginTop: 2,
  },
  propPrice: {
    fontSize: 14,
    fontWeight: '900',
    color: Brand.terracotta,
    marginTop: 4,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Brand.navy,
    marginBottom: 8,
  },
  labelWithAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  inputBox: {
    backgroundColor: Brand.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Brand.gray300,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputBoxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Brand.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Brand.gray300,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  dateDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inputTextBold: {
    fontSize: 15,
    color: Brand.navy,
    fontWeight: '700',
  },
  changeLink: {
    fontSize: 13,
    fontWeight: '700',
    color: Brand.terracotta,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    flexWrap: 'wrap',
  },
  chip: {
    backgroundColor: Brand.white,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Brand.gray300,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chipAccent: {
    backgroundColor: Brand.cream,
    borderColor: Brand.gray300,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Brand.navy,
  },
  timeSlotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeSlotChip: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Brand.white,
    borderWidth: 1.5,
    borderColor: Brand.gray300,
    borderRadius: 10,
    paddingVertical: 11,
  },
  timeSlotChipActive: {
    backgroundColor: Brand.navy,
    borderColor: Brand.navy,
  },
  timeSlotText: {
    fontSize: 13,
    fontWeight: '700',
    color: Brand.navy,
  },
  timeSlotTextActive: {
    color: Brand.white,
  },
  attendeesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  attendeeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: Brand.white,
    borderWidth: 1.5,
    borderColor: Brand.gray300,
    borderRadius: 10,
    paddingVertical: 10,
  },
  attendeeChipActive: {
    backgroundColor: Brand.terracotta,
    borderColor: Brand.terracotta,
  },
  attendeeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Brand.navy,
  },
  attendeeTextActive: {
    color: Brand.white,
  },
  inputText: {
    fontSize: 14,
    color: Brand.navy,
    fontWeight: '500',
  },
  textAreaBox: {
    height: 90,
  },
  textAreaInput: {
    textAlignVertical: 'top',
    height: 66,
  },
  submitBtn: {
    backgroundColor: Brand.terracotta,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
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
});
