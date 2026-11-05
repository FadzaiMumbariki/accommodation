/**
 * usePropertyContact — encapsulates all contact & action handlers for a property.
 *
 * Extracted from property-details.tsx to keep that screen focused on rendering.
 * Handles: share, in-app message, call, WhatsApp, directions, book viewing, save.
 */
import { useState, useCallback } from 'react';
import { Alert, Linking, Platform, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useChat } from '../context/ChatContext';
import { useSaved } from '../context/SavedContext';
import { useRequireAuth } from './useRequireAuth';
import { openWhatsAppTarget, buildListingInquiryMessage } from '../lib/formatContact';
import { Routes, RouteHelpers } from '../constants/routes';
import type { Property } from '../types';

export interface UsePropertyContactReturn {
  chatStarting: boolean;
  handleShare: () => Promise<void>;
  handleMessage: () => Promise<void>;
  handleCallLandlord: () => void;
  handleWhatsAppLandlord: () => Promise<void>;
  handleGetDirections: () => Promise<void>;
  handleBookViewing: () => void;
  handleToggleSaved: () => void;
}

export function usePropertyContact(property: Property): UsePropertyContactReturn {
  const { startConversation, openConversation, setSelectedConversationId } = useChat();
  const { toggleSaved } = useSaved();
  const requireAuth = useRequireAuth();
  const [chatStarting, setChatStarting] = useState(false);

  const handleShare = useCallback(async () => {
    const url = `https://imbafind.co.zw/property/${property.id}`;
    const message = `${property.title} - $${property.price}/month in ${property.suburb}, ${property.city}`;
    try {
      await Share.share({
        message: `${message}\n${url}`,
        url,
        title: `Share ${property.title}`,
      });
    } catch {
      try {
        await Clipboard.setStringAsync(`${message}\n${url}`);
        Alert.alert('Copied', 'Property link copied to clipboard!');
      } catch {
        Alert.alert('Copied', 'Property link copied to clipboard!');
      }
    }
  }, [property]);

  const handleMessage = useCallback(async () => {
    if (!requireAuth(RouteHelpers.propertyDetails(property.id))) return;
    if (chatStarting) return;
    setChatStarting(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const convId = await startConversation(property);
      setSelectedConversationId(convId);
      await openConversation(convId);
      router.push(Routes.chat);
    } catch (error) {
      console.error('[usePropertyContact] Could not start conversation:', error);
      Alert.alert(
        'Could not start chat',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setChatStarting(false);
    }
  }, [
    property,
    requireAuth,
    chatStarting,
    startConversation,
    setSelectedConversationId,
    openConversation,
  ]);

  const handleCallLandlord = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const phone = property.landlord?.phone;
    if (!phone) {
      Alert.alert(
        'Phone number unavailable',
        'Use the in-app message option to contact the landlord.',
      );
      return;
    }
    const cleanPhone = phone.replace(/\s/g, '');
    void Linking.openURL(`tel:${cleanPhone}`).catch((error) => {
      console.error('[usePropertyContact] Could not open phone link:', error);
      Alert.alert('Could not place call', 'Please try again.');
    });
  }, [property.landlord?.phone]);

  const handleWhatsAppLandlord = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await openWhatsAppTarget({
      phone: property.landlord?.phone,
      text: buildListingInquiryMessage(property),
      onUnavailable: () => {
        Alert.alert(
          'Phone number unavailable',
          'Use the in-app message option to contact the landlord.',
        );
      },
    });
  }, [property]);

  const handleGetDirections = useCallback(async () => {
    const destination = property.coordinates
      ? `${property.coordinates.lat},${property.coordinates.lng}`
      : [property.address, property.suburb, property.city, property.province]
          .filter(Boolean)
          .join(', ');
    const encodedDestination = encodeURIComponent(destination);
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedDestination}&travelmode=driving`;
    const nativeMapsUrl =
      Platform.OS === 'ios'
        ? `maps://?daddr=${encodedDestination}&dirflg=d`
        : Platform.OS === 'android'
          ? `google.navigation:q=${encodedDestination}&mode=d`
          : googleMapsUrl;

    try {
      await Linking.openURL(nativeMapsUrl);
    } catch {
      if (nativeMapsUrl === googleMapsUrl) {
        Alert.alert('Maps Error', 'Could not open directions for this property.');
        return;
      }
      try {
        await Linking.openURL(googleMapsUrl);
      } catch {
        Alert.alert('Maps Error', 'Could not open directions for this property.');
      }
    }
  }, [property]);

  const handleBookViewing = useCallback(() => {
    if (!requireAuth(RouteHelpers.propertyDetails(property.id))) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(RouteHelpers.bookViewing(property.id));
  }, [property.id, requireAuth]);

  const handleToggleSaved = useCallback(() => {
    if (!requireAuth(RouteHelpers.propertyDetails(property.id))) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void toggleSaved(property.id);
  }, [property.id, requireAuth, toggleSaved]);

  return {
    chatStarting,
    handleShare,
    handleMessage,
    handleCallLandlord,
    handleWhatsAppLandlord,
    handleGetDirections,
    handleBookViewing,
    handleToggleSaved,
  };
}
