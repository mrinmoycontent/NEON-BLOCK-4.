import { ThemeId } from './types';

export interface TilePaletteEntry {
  bgTop: string;
  bgBottom: string;
  border: string;
  glow: string;
  text: string;
  innerAccent: string;
}

export const TILE_PALETTE: Record<number, TilePaletteEntry> = {
  2: {
    bgTop: '#083344',
    bgBottom: '#062030',
    border: '#22D3EE',
    glow: 'rgba(34, 211, 238, 0.55)',
    text: '#ECFEFF',
    innerAccent: 'rgba(34, 211, 238, 0.22)',
  },
  4: {
    bgTop: '#0C4A6E',
    bgBottom: '#082F49',
    border: '#38BDF8',
    glow: 'rgba(56, 189, 248, 0.6)',
    text: '#F0F9FF',
    innerAccent: 'rgba(56, 189, 248, 0.24)',
  },
  8: {
    bgTop: '#1E3A8A',
    bgBottom: '#172554',
    border: '#60A5FA',
    glow: 'rgba(96, 165, 250, 0.65)',
    text: '#EFF6FF',
    innerAccent: 'rgba(96, 165, 250, 0.26)',
  },
  16: {
    bgTop: '#312E81',
    bgBottom: '#1E1B4B',
    border: '#818CF8',
    glow: 'rgba(129, 140, 248, 0.68)',
    text: '#EEF2FF',
    innerAccent: 'rgba(129, 140, 248, 0.28)',
  },
  32: {
    bgTop: '#4C1D95',
    bgBottom: '#2E1065',
    border: '#A78BFA',
    glow: 'rgba(167, 139, 250, 0.72)',
    text: '#F5F3FF',
    innerAccent: 'rgba(167, 139, 250, 0.30)',
  },
  64: {
    bgTop: '#581C87',
    bgBottom: '#3B0764',
    border: '#C084FC',
    glow: 'rgba(192, 132, 252, 0.76)',
    text: '#FAF5FF',
    innerAccent: 'rgba(192, 132, 252, 0.32)',
  },
  128: {
    bgTop: '#701A75',
    bgBottom: '#4A044E',
    border: '#E879F9',
    glow: 'rgba(232, 121, 249, 0.78)',
    text: '#FDF4FF',
    innerAccent: 'rgba(232, 121, 249, 0.32)',
  },
  256: {
    bgTop: '#0E7490',
    bgBottom: '#164E63',
    border: '#00F0FF',
    glow: 'rgba(0, 240, 255, 0.85)',
    text: '#FFFFFF',
    innerAccent: 'rgba(0, 240, 255, 0.36)',
  },
  512: {
    bgTop: '#4338CA',
    bgBottom: '#1E1B4B',
    border: '#67E8F9',
    glow: 'rgba(103, 232, 249, 0.88)',
    text: '#FFFFFF',
    innerAccent: 'rgba(168, 85, 247, 0.40)',
  },
  1024: {
    bgTop: '#6D28D9',
    bgBottom: '#3B0764',
    border: '#F0ABFC',
    glow: 'rgba(240, 171, 252, 0.92)',
    text: '#FFFFFF',
    innerAccent: 'rgba(34, 211, 238, 0.42)',
  },
  2048: {
    bgTop: '#0284C7',
    bgBottom: '#581C87',
    border: '#E0F2FE',
    glow: 'rgba(224, 242, 254, 0.95)',
    text: '#FFFFFF',
    innerAccent: 'rgba(255, 255, 255, 0.45)',
  },
};

const EMERALD_PALETTE: Record<number, TilePaletteEntry> = {
  2: { bgTop: '#064E3B', bgBottom: '#022C22', border: '#34D399', glow: 'rgba(52, 211, 153, 0.55)', text: '#ECFDF5', innerAccent: 'rgba(52, 211, 153, 0.22)' },
  4: { bgTop: '#115E59', bgBottom: '#042F2E', border: '#2DD4BF', glow: 'rgba(45, 212, 191, 0.6)', text: '#F0FDFA', innerAccent: 'rgba(45, 212, 191, 0.24)' },
  8: { bgTop: '#155E75', bgBottom: '#083344', border: '#22D3EE', glow: 'rgba(34, 211, 238, 0.65)', text: '#ECFEFF', innerAccent: 'rgba(34, 211, 238, 0.26)' },
  16: { bgTop: '#075985', bgBottom: '#0C4A6E', border: '#38BDF8', glow: 'rgba(56, 189, 248, 0.68)', text: '#F0F9FF', innerAccent: 'rgba(56, 189, 248, 0.28)' },
  32: { bgTop: '#065F46', bgBottom: '#064E3B', border: '#6EE7B7', glow: 'rgba(110, 231, 183, 0.72)', text: '#ECFDF5', innerAccent: 'rgba(110, 231, 183, 0.30)' },
  64: { bgTop: '#0F766E', bgBottom: '#134E4A', border: '#5EEAD4', glow: 'rgba(94, 234, 212, 0.76)', text: '#FFFFFF', innerAccent: 'rgba(94, 234, 212, 0.32)' },
  128: { bgTop: '#0E7490', bgBottom: '#164E63', border: '#67E8F9', glow: 'rgba(103, 232, 249, 0.8)', text: '#FFFFFF', innerAccent: 'rgba(103, 232, 249, 0.35)' },
  256: { bgTop: '#047857', bgBottom: '#064E3B', border: '#A7F3D0', glow: 'rgba(167, 243, 208, 0.86)', text: '#FFFFFF', innerAccent: 'rgba(167, 243, 208, 0.38)' },
  512: { bgTop: '#0D9488', bgBottom: '#115E59', border: '#CCFBF1', glow: 'rgba(204, 251, 241, 0.9)', text: '#FFFFFF', innerAccent: 'rgba(204, 251, 241, 0.42)' },
  1024: { bgTop: '#0284C7', bgBottom: '#0F766E', border: '#E0F2FE', glow: 'rgba(224, 242, 254, 0.94)', text: '#FFFFFF', innerAccent: 'rgba(255, 255, 255, 0.44)' },
  2048: { bgTop: '#059669', bgBottom: '#0E7490', border: '#FFFFFF', glow: 'rgba(167, 243, 208, 0.96)', text: '#FFFFFF', innerAccent: 'rgba(255, 255, 255, 0.5)' },
};

const SOLAR_PALETTE: Record<number, TilePaletteEntry> = {
  2: { bgTop: '#451A03', bgBottom: '#291002', border: '#FBBF24', glow: 'rgba(251, 191, 36, 0.55)', text: '#FFFBEB', innerAccent: 'rgba(251, 191, 36, 0.24)' },
  4: { bgTop: '#7C2D12', bgBottom: '#431407', border: '#FB923C', glow: 'rgba(251, 146, 60, 0.6)', text: '#FFF7ED', innerAccent: 'rgba(251, 146, 60, 0.26)' },
  8: { bgTop: '#881337', bgBottom: '#4C0519', border: '#FB7185', glow: 'rgba(251, 113, 133, 0.66)', text: '#FFF1F2', innerAccent: 'rgba(251, 113, 133, 0.28)' },
  16: { bgTop: '#831843', bgBottom: '#500724', border: '#F472B6', glow: 'rgba(244, 114, 182, 0.7)', text: '#FDF2F8', innerAccent: 'rgba(244, 114, 182, 0.3)' },
  32: { bgTop: '#701A75', bgBottom: '#4A044E', border: '#E879F9', glow: 'rgba(232, 121, 249, 0.74)', text: '#FDF4FF', innerAccent: 'rgba(232, 121, 249, 0.32)' },
  64: { bgTop: '#92400E', bgBottom: '#451A03', border: '#FDE047', glow: 'rgba(253, 224, 71, 0.78)', text: '#FFFFFF', innerAccent: 'rgba(253, 224, 71, 0.34)' },
  128: { bgTop: '#9F1239', bgBottom: '#4C0519', border: '#FDA4AF', glow: 'rgba(253, 164, 175, 0.82)', text: '#FFFFFF', innerAccent: 'rgba(253, 164, 175, 0.36)' },
  256: { bgTop: '#B45309', bgBottom: '#7C2D12', border: '#FEF08A', glow: 'rgba(254, 240, 138, 0.88)', text: '#FFFFFF', innerAccent: 'rgba(254, 240, 138, 0.4)' },
  512: { bgTop: '#BE185D', bgBottom: '#701A75', border: '#FBCFE8', glow: 'rgba(251, 207, 232, 0.9)', text: '#FFFFFF', innerAccent: 'rgba(251, 207, 232, 0.42)' },
  1024: { bgTop: '#C2410C', bgBottom: '#881337', border: '#FEF3C7', glow: 'rgba(254, 243, 199, 0.94)', text: '#FFFFFF', innerAccent: 'rgba(255, 255, 255, 0.45)' },
  2048: { bgTop: '#D97706', bgBottom: '#9D174D', border: '#FFFFFF', glow: 'rgba(253, 224, 71, 0.98)', text: '#FFFFFF', innerAccent: 'rgba(255, 255, 255, 0.5)' },
};

const SYNTH_PALETTE: Record<number, TilePaletteEntry> = {
  2: { bgTop: '#3B0764', bgBottom: '#22043B', border: '#E879F9', glow: 'rgba(232, 121, 249, 0.58)', text: '#FDF4FF', innerAccent: 'rgba(232, 121, 249, 0.24)' },
  4: { bgTop: '#4C1D95', bgBottom: '#2E1065', border: '#C084FC', glow: 'rgba(192, 132, 252, 0.62)', text: '#FAF5FF', innerAccent: 'rgba(192, 132, 252, 0.26)' },
  8: { bgTop: '#3730A3', bgBottom: '#1E1B4B', border: '#818CF8', glow: 'rgba(129, 140, 248, 0.66)', text: '#EEF2FF', innerAccent: 'rgba(129, 140, 248, 0.28)' },
  16: { bgTop: '#0369A1', bgBottom: '#0C4A6E', border: '#38BDF8', glow: 'rgba(56, 189, 248, 0.7)', text: '#F0F9FF', innerAccent: 'rgba(56, 189, 248, 0.3)' },
  32: { bgTop: '#86198F', bgBottom: '#4A044E', border: '#F472B6', glow: 'rgba(244, 114, 182, 0.74)', text: '#FDF2F8', innerAccent: 'rgba(244, 114, 182, 0.32)' },
  64: { bgTop: '#0E7490', bgBottom: '#164E63', border: '#22D3EE', glow: 'rgba(34, 211, 238, 0.78)', text: '#ECFEFF', innerAccent: 'rgba(34, 211, 238, 0.34)' },
  128: { bgTop: '#6D28D9', bgBottom: '#3B0764', border: '#F0ABFC', glow: 'rgba(240, 171, 252, 0.84)', text: '#FFFFFF', innerAccent: 'rgba(240, 171, 252, 0.38)' },
  256: { bgTop: '#9D174D', bgBottom: '#500724', border: '#F9A8D4', glow: 'rgba(249, 168, 212, 0.88)', text: '#FFFFFF', innerAccent: 'rgba(249, 168, 212, 0.4)' },
  512: { bgTop: '#0284C7', bgBottom: '#312E81', border: '#67E8F9', glow: 'rgba(103, 232, 249, 0.92)', text: '#FFFFFF', innerAccent: 'rgba(103, 232, 249, 0.44)' },
  1024: { bgTop: '#A21CAF', bgBottom: '#4C1D95', border: '#FAE8FF', glow: 'rgba(250, 232, 255, 0.95)', text: '#FFFFFF', innerAccent: 'rgba(255, 255, 255, 0.46)' },
  2048: { bgTop: '#7E22CE', bgBottom: '#0369A1', border: '#FFFFFF', glow: 'rgba(232, 121, 249, 0.98)', text: '#FFFFFF', innerAccent: 'rgba(255, 255, 255, 0.5)' },
};

const ASTRAL_PALETTE: Record<number, TilePaletteEntry> = {
  2: { bgTop: '#172554', bgBottom: '#0F172A', border: '#38BDF8', glow: 'rgba(56, 189, 248, 0.56)', text: '#F0F9FF', innerAccent: 'rgba(56, 189, 248, 0.24)' },
  4: { bgTop: '#422006', bgBottom: '#271203', border: '#FCD34D', glow: 'rgba(252, 211, 77, 0.62)', text: '#FFFBEB', innerAccent: 'rgba(252, 211, 77, 0.26)' },
  8: { bgTop: '#1E3A8A', bgBottom: '#172554', border: '#60A5FA', glow: 'rgba(96, 165, 250, 0.66)', text: '#EFF6FF', innerAccent: 'rgba(96, 165, 250, 0.28)' },
  16: { bgTop: '#713F12', bgBottom: '#422006', border: '#FDE047', glow: 'rgba(253, 224, 71, 0.72)', text: '#FEFCE8', innerAccent: 'rgba(253, 224, 71, 0.3)' },
  32: { bgTop: '#0E7490', bgBottom: '#083344', border: '#67E8F9', glow: 'rgba(103, 232, 249, 0.76)', text: '#ECFEFF', innerAccent: 'rgba(103, 232, 249, 0.32)' },
  64: { bgTop: '#854D0E', bgBottom: '#451A03', border: '#FEF08A', glow: 'rgba(254, 240, 138, 0.8)', text: '#FFFFFF', innerAccent: 'rgba(254, 240, 138, 0.36)' },
  128: { bgTop: '#1D4ED8', bgBottom: '#1E3A8A', border: '#93C5FD', glow: 'rgba(147, 197, 253, 0.84)', text: '#FFFFFF', innerAccent: 'rgba(147, 197, 253, 0.38)' },
  256: { bgTop: '#A16207', bgBottom: '#713F12', border: '#FEF3C7', glow: 'rgba(254, 243, 199, 0.9)', text: '#FFFFFF', innerAccent: 'rgba(254, 243, 199, 0.42)' },
  512: { bgTop: '#0284C7', bgBottom: '#1E3A8A', border: '#E0F2FE', glow: 'rgba(224, 242, 254, 0.92)', text: '#FFFFFF', innerAccent: 'rgba(224, 242, 254, 0.45)' },
  1024: { bgTop: '#B45309', bgBottom: '#1E3A8A', border: '#FFFBEB', glow: 'rgba(252, 211, 77, 0.96)', text: '#FFFFFF', innerAccent: 'rgba(255, 255, 255, 0.48)' },
  2048: { bgTop: '#CA8A04', bgBottom: '#0369A1', border: '#FFFFFF', glow: 'rgba(254, 240, 138, 0.98)', text: '#FFFFFF', innerAccent: 'rgba(255, 255, 255, 0.52)' },
};

const PALETTE_BY_THEME: Record<ThemeId, Record<number, TilePaletteEntry>> = {
  NEON_CYBER: TILE_PALETTE,
  EMERALD_FLUX: EMERALD_PALETTE,
  SOLAR_PULSE: SOLAR_PALETTE,
  SYNTH_NOVA: SYNTH_PALETTE,
  ASTRAL_GOLD: ASTRAL_PALETTE,
};

export function getTilePalette(
  value: number,
  themeId: ThemeId = 'NEON_CYBER'
): TilePaletteEntry {
  const map = PALETTE_BY_THEME[themeId] ?? TILE_PALETTE;
  if (map[value]) {
    return map[value];
  }
  if (value > 2048) {
    return {
      bgTop: map[2048].bgTop,
      bgBottom: map[2048].bgBottom,
      border: '#FFFFFF',
      glow: map[2048].glow,
      text: '#FFFFFF',
      innerAccent: 'rgba(255, 255, 255, 0.52)',
    };
  }
  return map[2];
}
