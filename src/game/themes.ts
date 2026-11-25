import { ParticleStyleId, ThemeId } from './types';

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  unlockHint: string;
  swatches: [string, string, string];
  bgInner: string;
  bgMid: string;
  bgOuter: string;
  boardFill: string;
  boardFrameStart: string;
  boardFrameMid: string;
  boardFrameEnd: string;
  slotFill: string;
  slotStroke: string;
  rowBeam: string;
  colBeam: string;
  rowWave: string;
  colWave: string;
  moteColors: string[];
  comboColors: string[];
}

export interface ParticleStyleDefinition {
  id: ParticleStyleId;
  name: string;
  description: string;
  unlockHint: string;
  swatches: [string, string, string];
}

export const VISUAL_THEMES: Record<ThemeId, ThemeDefinition> = {
  NEON_CYBER: {
    id: 'NEON_CYBER',
    name: 'Neon Cyber',
    unlockHint: 'Default Theme',
    swatches: ['#22D3EE', '#60A5FA', '#A855F7'],
    bgInner: '#0B122B',
    bgMid: '#070B1A',
    bgOuter: '#04060F',
    boardFill: 'rgba(10, 16, 38, 0.92)',
    boardFrameStart: 'rgba(34, 211, 238, 0.48)',
    boardFrameMid: 'rgba(99, 102, 241, 0.35)',
    boardFrameEnd: 'rgba(168, 85, 247, 0.48)',
    slotFill: 'rgba(17, 25, 56, 0.85)',
    slotStroke: 'rgba(56, 189, 248, 0.12)',
    rowBeam: 'rgba(34, 211, 238, 0.88)',
    colBeam: 'rgba(192, 132, 252, 0.88)',
    rowWave: '#22D3EE',
    colWave: '#C084FC',
    moteColors: ['#22D3EE', '#3B82F6', '#A855F7', '#818CF8', '#67E8F9'],
    comboColors: ['#22D3EE', '#60A5FA', '#A855F7', '#E879F9', '#F0ABFC', '#E0F2FE'],
  },
  EMERALD_FLUX: {
    id: 'EMERALD_FLUX',
    name: 'Emerald Flux',
    unlockHint: 'Reach Player Level 3',
    swatches: ['#34D399', '#2DD4BF', '#22D3EE'],
    bgInner: '#071F1E',
    bgMid: '#051314',
    bgOuter: '#030A0B',
    boardFill: 'rgba(6, 26, 26, 0.93)',
    boardFrameStart: 'rgba(52, 211, 153, 0.52)',
    boardFrameMid: 'rgba(45, 212, 191, 0.36)',
    boardFrameEnd: 'rgba(34, 211, 238, 0.52)',
    slotFill: 'rgba(10, 38, 38, 0.86)',
    slotStroke: 'rgba(52, 211, 153, 0.14)',
    rowBeam: 'rgba(52, 211, 153, 0.88)',
    colBeam: 'rgba(34, 211, 238, 0.88)',
    rowWave: '#34D399',
    colWave: '#22D3EE',
    moteColors: ['#34D399', '#2DD4BF', '#22D3EE', '#6EE7B7', '#5EEAD4'],
    comboColors: ['#34D399', '#2DD4BF', '#22D3EE', '#A7F3D0', '#67E8F9', '#ECFDF5'],
  },
  SOLAR_PULSE: {
    id: 'SOLAR_PULSE',
    name: 'Solar Pulse',
    unlockHint: 'Day 5 Daily Milestone or Level 5',
    swatches: ['#FBBF24', '#FB7185', '#F472B6'],
    bgInner: '#1E1126',
    bgMid: '#120A19',
    bgOuter: '#09050E',
    boardFill: 'rgba(26, 14, 34, 0.93)',
    boardFrameStart: 'rgba(251, 191, 36, 0.5)',
    boardFrameMid: 'rgba(251, 113, 133, 0.38)',
    boardFrameEnd: 'rgba(244, 114, 182, 0.5)',
    slotFill: 'rgba(38, 21, 50, 0.86)',
    slotStroke: 'rgba(251, 191, 36, 0.14)',
    rowBeam: 'rgba(251, 191, 36, 0.88)',
    colBeam: 'rgba(251, 113, 133, 0.88)',
    rowWave: '#FBBF24',
    colWave: '#FB7185',
    moteColors: ['#FBBF24', '#FB7185', '#F472B6', '#FDE047', '#FDA4AF'],
    comboColors: ['#FBBF24', '#FB923C', '#FB7185', '#F472B6', '#FEF08A', '#FFF1F2'],
  },
  SYNTH_NOVA: {
    id: 'SYNTH_NOVA',
    name: 'Synth Nova',
    unlockHint: 'Day 14 Daily Milestone or Level 8',
    swatches: ['#E879F9', '#A855F7', '#38BDF8'],
    bgInner: '#1B0E35',
    bgMid: '#100822',
    bgOuter: '#070412',
    boardFill: 'rgba(22, 12, 46, 0.93)',
    boardFrameStart: 'rgba(232, 121, 249, 0.54)',
    boardFrameMid: 'rgba(139, 92, 246, 0.38)',
    boardFrameEnd: 'rgba(56, 189, 248, 0.54)',
    slotFill: 'rgba(33, 19, 68, 0.86)',
    slotStroke: 'rgba(232, 121, 249, 0.15)',
    rowBeam: 'rgba(232, 121, 249, 0.88)',
    colBeam: 'rgba(56, 189, 248, 0.88)',
    rowWave: '#E879F9',
    colWave: '#38BDF8',
    moteColors: ['#E879F9', '#C084FC', '#38BDF8', '#F472B6', '#818CF8'],
    comboColors: ['#E879F9', '#C084FC', '#38BDF8', '#F472B6', '#67E8F9', '#FDF4FF'],
  },
  ASTRAL_GOLD: {
    id: 'ASTRAL_GOLD',
    name: 'Astral Gold',
    unlockHint: 'Day 30 Daily Milestone or Level 12',
    swatches: ['#FCD34D', '#38BDF8', '#E0F2FE'],
    bgInner: '#111834',
    bgMid: '#0A0F22',
    bgOuter: '#050712',
    boardFill: 'rgba(14, 21, 46, 0.94)',
    boardFrameStart: 'rgba(252, 211, 77, 0.56)',
    boardFrameMid: 'rgba(56, 189, 248, 0.4)',
    boardFrameEnd: 'rgba(224, 242, 254, 0.56)',
    slotFill: 'rgba(22, 31, 64, 0.86)',
    slotStroke: 'rgba(252, 211, 77, 0.15)',
    rowBeam: 'rgba(252, 211, 77, 0.9)',
    colBeam: 'rgba(103, 232, 249, 0.9)',
    rowWave: '#FCD34D',
    colWave: '#67E8F9',
    moteColors: ['#FCD34D', '#38BDF8', '#E0F2FE', '#FBBF24', '#93C5FD'],
    comboColors: ['#FCD34D', '#FBBF24', '#38BDF8', '#67E8F9', '#FEF3C7', '#FFFFFF'],
  },
};

export const THEME_LIST: ThemeDefinition[] = [
  VISUAL_THEMES.NEON_CYBER,
  VISUAL_THEMES.EMERALD_FLUX,
  VISUAL_THEMES.SOLAR_PULSE,
  VISUAL_THEMES.SYNTH_NOVA,
  VISUAL_THEMES.ASTRAL_GOLD,
];

export const PARTICLE_STYLES: Record<ParticleStyleId, ParticleStyleDefinition> = {
  CLASSIC_NEON: {
    id: 'CLASSIC_NEON',
    name: 'Neon Sparks',
    description: 'Crisp directional sparks and balanced shockwaves.',
    unlockHint: 'Default Style',
    swatches: ['#22D3EE', '#60A5FA', '#C084FC'],
  },
  PRISM_BURST: {
    id: 'PRISM_BURST',
    name: 'Prism Shards',
    description: 'Crystalline diamond flares with chromatic combo rings.',
    unlockHint: 'Day 7 Daily Milestone',
    swatches: ['#67E8F9', '#E879F9', '#FDE047'],
  },
  SUPERNOVA_TRAIL: {
    id: 'SUPERNOVA_TRAIL',
    name: 'Supernova Rings',
    description: 'Twin aurora rings and golden-cyan starburst streaks.',
    unlockHint: 'Day 30 Daily Milestone',
    swatches: ['#FCD34D', '#22D3EE', '#F0ABFC'],
  },
};

export const PARTICLE_STYLE_LIST: ParticleStyleDefinition[] = [
  PARTICLE_STYLES.CLASSIC_NEON,
  PARTICLE_STYLES.PRISM_BURST,
  PARTICLE_STYLES.SUPERNOVA_TRAIL,
];

export function getThemeDefinition(themeId: ThemeId): ThemeDefinition {
  return VISUAL_THEMES[themeId] ?? VISUAL_THEMES.NEON_CYBER;
}
