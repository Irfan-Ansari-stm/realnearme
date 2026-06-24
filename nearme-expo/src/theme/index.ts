import { Dimensions, Platform } from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ── Palette ────────────────────────────────────────────────────────────────────
export const Colors = {
  // Brand orange
  brand: {
    50:  '#FFF7ED',
    100: '#FFEDD5',
    200: '#FED7AA',
    300: '#FDBA74',
    400: '#FB923C',
    500: '#F97316',
    600: '#EA580C',
    700: '#C2410C',
    800: '#9A3412',
    900: '#7C2D12',
  },
  // Dark surfaces
  surface: {
    0:   '#080808',
    50:  '#111111',
    100: '#181818',
    150: '#1F1F1F',
    200: '#272727',
    300: '#323232',
    400: '#3E3E3E',
    500: '#525252',
    600: '#737373',
    700: '#A3A3A3',
    800: '#D4D4D4',
    900: '#F5F5F5',
  },
  // Semantic
  success: '#22C55E',
  warning: '#F59E0B',
  error:   '#EF4444',
  info:    '#3B82F6',
  // Category colours
  cafe:       '#F97316',
  pub:        '#8B5CF6',
  park:       '#22C55E',
  restaurant: '#EF4444',
  art:        '#EC4899',
  hidden_gem: '#F59E0B',
  beach:      '#06B6D4',
  other:      '#737373',
} as const;

// ── Typography ─────────────────────────────────────────────────────────────────
export const Typography = {
  // Font families — loaded via expo-google-fonts
  families: {
    display: 'Syne_700Bold',
    displayMedium: 'Syne_600SemiBold',
    displayRegular: 'Syne_400Regular',
    body: 'DMSans_400Regular',
    bodyMedium: 'DMSans_500Medium',
    bodySemiBold: 'DMSans_600SemiBold',
    mono: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  // Scale (sp)
  sizes: {
    xs:   11,
    sm:   13,
    base: 15,
    md:   17,
    lg:   20,
    xl:   24,
    '2xl': 28,
    '3xl': 34,
    '4xl': 42,
  },
  // Line heights
  leading: {
    tight:  1.15,
    normal: 1.4,
    relaxed: 1.6,
  },
} as const;

// ── Spacing ────────────────────────────────────────────────────────────────────
export const Spacing = {
  1:  4,
  2:  8,
  3:  12,
  4:  16,
  5:  20,
  6:  24,
  7:  28,
  8:  32,
  10: 40,
  12: 48,
  16: 64,
} as const;

// ── Border Radius ──────────────────────────────────────────────────────────────
export const Radius = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  '2xl': 24,
  '3xl': 32,
  full: 9999,
} as const;

// ── Shadows ────────────────────────────────────────────────────────────────────
export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 10,
  },
  brand: {
    shadowColor: Colors.brand[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
} as const;

// ── Screen dimensions ──────────────────────────────────────────────────────────
export const Screen = {
  width:  SCREEN_W,
  height: SCREEN_H,
  isSmall: SCREEN_W < 380,
} as const;

// ── Animation durations ────────────────────────────────────────────────────────
export const Duration = {
  fast:   150,
  normal: 250,
  slow:   400,
} as const;

// ── Category helpers ───────────────────────────────────────────────────────────
export const CATEGORY_COLOR: Record<string, string> = {
  cafe:       Colors.cafe,
  pub:        Colors.pub,
  park:       Colors.park,
  restaurant: Colors.restaurant,
  art:        Colors.art,
  hidden_gem: Colors.hidden_gem,
  beach:      Colors.beach,
  other:      Colors.other,
};

export const CATEGORY_EMOJI: Record<string, string> = {
  cafe: '☕', pub: '🍺', park: '🌳', restaurant: '🍽️',
  art: '🎨', hidden_gem: '💎', beach: '🏖️', other: '📍',
};

export const VIBE_EMOJI: Record<string, string> = {
  chill: '😌', party: '🎉', date_night: '🌙', family: '👨‍👩‍👧',
  cosy: '🛋️', hidden_gem: '💎', lively: '⚡', scenic: '🌄',
};

export const PRICE_LABELS: Record<string, string> = {
  '0': 'Free', '1': '£', '2': '££', '3': '£££', '4': '££££',
};

export const VIBES = ['chill','party','date_night','family','cosy','hidden_gem','lively','scenic'];
export const CATEGORIES = ['cafe','pub','park','restaurant','art','hidden_gem','beach','other'];
export const REPORT_REASONS = ['inappropriate','spam','violence','copyright','other'];
