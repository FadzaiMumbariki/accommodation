import { Linking, Alert } from 'react-native';

/**
 * Normalises phone numbers into the standard international dialling format for Zimbabwe (263...).
 * e.g. "077 123 4567" -> "263771234567"
 *      "+263 77 123 4567" -> "263771234567"
 */
export function cleanZimbabweanPhone(phone?: string | null): string {
  if (!phone) return '';
  let clean = phone.replace(/[^0-9]/g, '');
  if (clean.startsWith('0') && clean.length === 10) {
    clean = '263' + clean.slice(1);
  }
  return clean;
}

export interface WhatsAppListingTarget {
  title: string;
  suburb: string;
  city: string;
  price: number;
  landlord?: {
    name?: string;
    phone?: string;
  };
}

/**
 * Creates the standard friendly rental inquiry text for a listing.
 */
export function buildListingInquiryMessage(property: WhatsAppListingTarget): string {
  const landlordGreeting = property.landlord?.name ? `Hi ${property.landlord.name}` : 'Hi';
  return `${landlordGreeting}, I saw your listing for "${property.title}" in ${property.suburb}, ${property.city} ($${property.price}/month) on ImbaFind. Is it still available?`;
}

/**
 * Constructs native and web WhatsApp deep links.
 */
export function buildWhatsAppUrls(phone: string, text: string): { appUrl: string; webUrl: string } {
  const cleanPhone = cleanZimbabweanPhone(phone);
  const encodedText = encodeURIComponent(text);
  return {
    appUrl: `whatsapp://send?phone=${cleanPhone}&text=${encodedText}`,
    webUrl: `https://wa.me/${cleanPhone}?text=${encodedText}`,
  };
}

/**
 * Opens WhatsApp native client with fallback to web URL.
 * Returns true if navigation succeeded, false otherwise.
 */
export async function openWhatsAppTarget({
  phone,
  text,
  onUnavailable,
}: {
  phone?: string | null;
  text: string;
  onUnavailable?: () => void;
}): Promise<boolean> {
  const cleanPhone = cleanZimbabweanPhone(phone);
  if (!cleanPhone) {
    if (onUnavailable) {
      onUnavailable();
    } else {
      Alert.alert(
        'Phone Unavailable',
        'The landlord has not provided a phone number. Use in-app chat instead.',
      );
    }
    return false;
  }

  const { appUrl, webUrl } = buildWhatsAppUrls(cleanPhone, text);

  try {
    const canOpen = await Linking.canOpenURL(appUrl);
    if (canOpen) {
      await Linking.openURL(appUrl);
      return true;
    }
    await Linking.openURL(webUrl);
    return true;
  } catch {
    try {
      await Linking.openURL(webUrl);
      return true;
    } catch {
      Alert.alert('Notice', 'Could not open WhatsApp on this device.');
      return false;
    }
  }
}
