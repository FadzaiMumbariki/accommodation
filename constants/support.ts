export const SUPPORT_CONTACT = {
  phone: process.env.EXPO_PUBLIC_SUPPORT_PHONE ?? '+263242000000',
  whatsapp: process.env.EXPO_PUBLIC_SUPPORT_WHATSAPP ?? '+263772000000',
  email: 'support@imbafind.co.zw',
  businessHours: '8am - 6pm CAT',
} as const;
