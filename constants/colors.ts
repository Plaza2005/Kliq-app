export const Colors = {
  background:        '#000000',
  surface:           '#000000',
  surfaceAlt:        '#121212',
  surfaceElevated:   '#1C1C1C',
  primary:           '#0095F6',
  primaryDark:       '#0070C0',
  primaryGlow:       'rgba(0,149,246,0.10)',
  primaryGlowStrong: 'rgba(0,149,246,0.25)',
  secondary:         '#0095F6',
  secondaryGlow:     'rgba(0,149,246,0.10)',
  accent:            '#ED4956',
  accentGlow:        'rgba(237,73,86,0.10)',
  success:           '#78CF7C',
  successGlow:       'rgba(120,207,124,0.10)',
  warning:           '#FFC107',
  warningGlow:       'rgba(255,193,7,0.10)',
  danger:            '#ED4956',
  text:              '#FFFFFF',
  textMuted:         '#8E8E8E',
  textDim:           '#3A3A3A',
  border:            '#262626',
  borderLight:       'rgba(255,255,255,0.06)',
  borderGlow:        '#262626',
  overlay:           'rgba(0,0,0,0.72)',
  NGN: '#78CF7C', KES: '#CBAA5C', GHS: '#CBAA5C',
} as const;

export type AppColors = {
  background: string;
  surface: string;
  surfaceAlt: string;
  surfaceElevated: string;
  primary: string;
  primaryDark: string;
  primaryGlow: string;
  primaryGlowStrong: string;
  secondary: string;
  secondaryGlow: string;
  accent: string;
  accentGlow: string;
  success: string;
  successGlow: string;
  warning: string;
  warningGlow: string;
  danger: string;
  text: string;
  textMuted: string;
  textDim: string;
  border: string;
  borderLight: string;
  borderGlow: string;
  overlay: string;
  NGN: string;
  KES: string;
  GHS: string;
};

export function getColors(theme: 'dark' | 'dim'): AppColors {
  if (theme === 'dim') {
    return {
      ...Colors,
      background:      '#1A1A1A',
      surface:         '#1A1A1A',
      surfaceAlt:      '#252525',
      surfaceElevated: '#2E2E2E',
      border:          '#333333',
    };
  }
  return { ...Colors };
}
