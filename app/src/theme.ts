// Design tokens ported from the Claude Design canvas (Expense Tracker.dc.html),
// specifically the [data-om-starter="android-frame"] override block — this is
// Nibash's actual dark-theme palette (matches PRD Section 48b/48c), not the
// surrounding Nocturne design-canvas chrome.

export const colors = {
  bg: '#121211',
  surface: '#1c1c1a',
  text: '#f0ede8',
  divider: '#34332f',

  accent: '#d9a441',
  accent100: '#4a3c22',
  accent200: '#6b551f',
  accent300: '#e6bc6a',
  accent400: '#d9a441',
  accent500: '#c2903a',
  accent600: '#a97a30',
  accent700: '#8a6327',
  accent800: '#4a3c1e',
  accent900: '#2c2513',

  neutral500: '#7a7873',
  neutral600: '#5c5a55',
  neutral700: '#46443f',
  neutral800: '#2a2926',

  primary: '#16443c',
  income: '#5fae63',
  expense: '#e2685c',
  warning: '#d9a441',
  info: '#6f93c4',

  onAccent: '#1a1608',
  onExpense: '#1a0e0c',
} as const;

/** color-mix(in srgb, var(--color-text) a%, transparent) equivalent */
export function textAlpha(a: number) {
  return `rgba(240, 237, 232, ${a})`;
}

export function blackAlpha(a: number) {
  return `rgba(0, 0, 0, ${a})`;
}

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
};

export const spacing = {
  1: 3,
  2: 6,
  3: 9,
  4: 12,
  6: 18,
  8: 24,
};

export const shadow = {
  sm: {
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 1,
    shadowOffset: { width: 0, height: 0 },
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  lg: {
    shadowColor: '#000',
    shadowOpacity: 0.55,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 16 },
    elevation: 16,
  },
} as const;

export const fonts = {
  heading: 'Inter_500Medium',
  headingSemibold: 'Inter_600SemiBold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
};
