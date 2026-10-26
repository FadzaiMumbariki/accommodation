// ─────────────────────────────────────────────────────────────────────────────
// ImbaFind – Color Tokens
// Design System: Navy (#1B2A4A) + Terracotta (#C4622D) + Cream (#F9F5F0)
// ─────────────────────────────────────────────────────────────────────────────

const tintColorLight = '#C4622D';
const tintColorDark = '#E8845A';

export const Colors = {
  light: {
    text: '#1B2A4A',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',
    background: '#F9F5F0',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    tint: tintColorLight,
    tabIconDefault: '#9CA3AF',
    tabIconSelected: tintColorLight,
    border: '#E5E7EB',
    borderLight: '#F3F4F6',
    card: '#FFFFFF',
    shadow: 'rgba(0,0,0,0.08)',
  },
  dark: {
    text: '#F9F5F0',
    textSecondary: '#D1D5DB',
    textMuted: '#6B7280',
    background: '#0F1A2E',
    surface: '#1B2A4A',
    surfaceElevated: '#243557',
    tint: tintColorDark,
    tabIconDefault: '#6B7280',
    tabIconSelected: tintColorDark,
    border: '#2D3F5C',
    borderLight: '#1E3050',
    card: '#1B2A4A',
    shadow: 'rgba(0,0,0,0.3)',
  },
};

// ─── Brand Palette (use directly in StyleSheet) ───────────────────────────────
export const Brand = {
  navy: '#1B2A4A',
  navyLight: '#243557',
  navyDark: '#0F1A2E',
  terracotta: '#C4622D',
  terracottaLight: '#E8845A',
  terracottaDark: '#A04E21',
  cream: '#F9F5F0',
  creamDark: '#F0EBE3',
  white: '#FFFFFF',
  black: '#000000',

  // Functional
  success: '#16A34A',
  successLight: '#DCFCE7',
  warning: '#D97706',
  warningLight: '#FEF3C7',
  error: '#DC2626',
  errorLight: '#FEE2E2',
  info: '#2563EB',
  infoLight: '#DBEAFE',

  // Grays
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',
};
