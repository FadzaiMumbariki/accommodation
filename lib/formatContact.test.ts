import { describe, expect, it, jest } from '@jest/globals';
import { Linking, Alert } from 'react-native';
import {
  cleanZimbabweanPhone,
  buildListingInquiryMessage,
  buildWhatsAppUrls,
  openWhatsAppTarget,
} from './formatContact';

describe('formatContact', () => {
  describe('cleanZimbabweanPhone', () => {
    it('converts local 07... format to international 263...', () => {
      expect(cleanZimbabweanPhone('0771234567')).toBe('263771234567');
      expect(cleanZimbabweanPhone('071 987 6543')).toBe('263719876543');
    });

    it('preserves already international 263 numbers', () => {
      expect(cleanZimbabweanPhone('+263 77 123 4567')).toBe('263771234567');
      expect(cleanZimbabweanPhone('263771234567')).toBe('263771234567');
    });

    it('returns empty string for null or empty input', () => {
      expect(cleanZimbabweanPhone(null)).toBe('');
      expect(cleanZimbabweanPhone('')).toBe('');
      expect(cleanZimbabweanPhone(undefined)).toBe('');
    });
  });

  describe('buildListingInquiryMessage', () => {
    it('formats friendly inquiry with landlord name', () => {
      const msg = buildListingInquiryMessage({
        title: 'Modern Flat',
        suburb: 'Avondale',
        city: 'Harare',
        price: 350,
        landlord: { name: 'John Doe' },
      });
      expect(msg).toContain('Hi John Doe');
      expect(msg).toContain('Modern Flat');
      expect(msg).toContain('$350/month');
    });

    it('falls back gracefully when landlord name is omitted', () => {
      const msg = buildListingInquiryMessage({
        title: 'Cottage',
        suburb: 'Greendale',
        city: 'Harare',
        price: 200,
      });
      expect(msg).toContain('Hi, I saw your listing');
    });
  });

  describe('buildWhatsAppUrls', () => {
    it('generates encoded app and web URLs', () => {
      const { appUrl, webUrl } = buildWhatsAppUrls('0771234567', 'Hello World');
      expect(appUrl).toBe('whatsapp://send?phone=263771234567&text=Hello%20World');
      expect(webUrl).toBe('https://wa.me/263771234567?text=Hello%20World');
    });
  });

  describe('openWhatsAppTarget', () => {
    it('returns false and triggers alert if phone is empty', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      const res = await openWhatsAppTarget({ phone: null, text: 'Hello' });
      expect(res).toBe(false);
      expect(alertSpy).toHaveBeenCalledWith(
        'Phone Unavailable',
        expect.stringContaining('in-app chat instead'),
      );
      alertSpy.mockRestore();
    });

    it('invokes onUnavailable callback if provided and phone is empty', async () => {
      const onUnavailable = jest.fn();
      const res = await openWhatsAppTarget({ phone: '', text: 'Hello', onUnavailable });
      expect(res).toBe(false);
      expect(onUnavailable).toHaveBeenCalled();
    });

    it('opens native appUrl if Linking.canOpenURL returns true', async () => {
      jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true as never);
      const openSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);
      const res = await openWhatsAppTarget({ phone: '0771234567', text: 'Hello' });
      expect(res).toBe(true);
      expect(openSpy).toHaveBeenCalledWith(
        expect.stringContaining('whatsapp://send?phone=263771234567'),
      );
    });

    it('falls back to webUrl if Linking.canOpenURL returns false', async () => {
      jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(false as never);
      const openSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);
      const res = await openWhatsAppTarget({ phone: '0771234567', text: 'Hello' });
      expect(res).toBe(true);
      expect(openSpy).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/263771234567'));
    });

    it('handles error when opening fails', async () => {
      jest.spyOn(Linking, 'canOpenURL').mockRejectedValue(new Error('fail') as never);
      jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('fail') as never);
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      const res = await openWhatsAppTarget({ phone: '0771234567', text: 'Hello' });
      expect(res).toBe(false);
      expect(alertSpy).toHaveBeenCalledWith('Notice', 'Could not open WhatsApp on this device.');
      alertSpy.mockRestore();
    });
  });
});
