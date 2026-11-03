import { describe, expect, it } from '@jest/globals';
import {
  cleanZimbabweanPhone,
  buildListingInquiryMessage,
  buildWhatsAppUrls,
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
});
