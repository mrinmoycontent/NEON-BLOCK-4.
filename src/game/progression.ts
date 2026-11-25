import { getLocalDateKey, loadDailySaveState, offsetLocalDateKey } from './daily';
import { loadBestScore } from './engine';
import { getStorageItem, setStorageItem } from './storage';
import {
  AchievementDef,
  AchievementId,
  ComboEvent,
  DailyMilestoneDef,
  DailySaveState,
  GameMode,
  GameStats,
  ParticleStyleId,
  PlayerProfileState,
  RecentRewardItem,
  ThemeId,
  TurnResolution,
} from './types';

export const PROFILE_STORAGE_KEY = 'neon_block_profile_v2';
export const PROFILE_SCHEMA_VERSION = 2;
export const MAX_COMBO_HISTORY_EVENTS = 20;
export const MAX_RECENT_REWARDS = 12;

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

const VALID_THEMES: ThemeId[] = [
  'NEON_CYBER',
  'EMERALD_FLUX',
  'SOLAR_PULSE',
  'SYNTH_NOVA',
  'ASTRAL_GOLD',
];

const VALID_PARTICLE_STYLES: ParticleStyleId[] = [
  'CLASSIC_NEON',
  'PRISM_BURST',
  'SUPERNOVA_TRAIL',
];

const VALID_ACHIEVEMENTS: AchievementId[] = [
  'FIRST_GAME',
  'COMBO_STARTER',
  'COMBO_MASTER',
  'COMBO_COLLECTOR',
  'TILE_256',
  'TILE_1024',
  'LINE_SWEEPER',
  'DAILY_CHAMPION',
  'STREAK_WEEK',
  'LEVEL_FIVE',
];

export const DAILY_MILESTONES: DailyMilestoneDef[] = [
  {
    day: 1,
    title: 'Welcome Surge',
    subtitle: '+250 Bonus Points · +50 XP',
    kind: 'BONUS_POINTS',
    bonusPoints: 250,
    xpBonus: 50,
  },
  {
    day: 3,
    title: 'Triple Spark',
    subtitle: '+500 Bonus Points · +100 XP',
    kind: 'BONUS_POINTS',
    bonusPoints: 500,
    xpBonus: 100,
  },
  {
    day: 5,
    title: 'Solar Pulse Theme',
    subtitle: 'Cosmetic Board Theme · +150 XP',
    kind: 'THEME',
    bonusPoints: 0,
    xpBonus: 150,
    themeUnlock: 'SOLAR_PULSE',
  },
  {
    day: 7,
    title: 'Prism Shards FX',
    subtitle: 'Particle Effect · +750 Bonus Points',
    kind: 'PARTICLE_FX',
    bonusPoints: 750,
    xpBonus: 200,
    particleUnlock: 'PRISM_BURST',
  },
  {
    day: 14,
    title: 'Synth Nova Theme',
    subtitle: 'Cosmetic Theme · +1,200 Bonus Points',
    kind: 'THEME',
    bonusPoints: 1200,
    xpBonus: 320,
    themeUnlock: 'SYNTH_NOVA',
  },
  {
    day: 30,
    title: 'Astral Mastery Pack',
    subtitle: 'Astral Gold Theme + Supernova FX + 2,500 Pts',
    kind: 'BUNDLE',
    bonusPoints: 2500,
    xpBonus: 650,
    themeUnlock: 'ASTRAL_GOLD',
    particleUnlock: 'SUPERNOVA_TRAIL',
  },
];

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'FIRST_GAME',
    title: 'First Run',
    description: 'Complete your first full game.',
    xpReward: 60,
    target: 1,
    metric: 'gamesCompleted',
  },
  {
    id: 'COMBO_STARTER',
    title: 'Chain Igniter',
    description: 'Trigger a ×2 chain combo.',
    xpReward: 70,
    target: 2,
    metric: 'highestMultiplier',
  },
  {
    id: 'COMBO_MASTER',
    title: 'Cascade Architect',
    description: 'Reach a ×4 or higher combo multiplier.',
    xpReward: 150,
    target: 4,
    metric: 'highestMultiplier',
  },
  {
    id: 'COMBO_COLLECTOR',
    title: 'Combo Striker',
    description: 'Record 15 significant combo events.',
    xpReward: 120,
    target: 15,
    metric: 'totalCombos',
  },
  {
    id: 'TILE_256',
    title: 'Cobalt Core',
    description: 'Forge a 256 tile on the grid.',
    xpReward: 100,
    target: 256,
    metric: 'highestTile',
  },
  {
    id: 'TILE_1024',
    title: 'Ultraviolet Apex',
    description: 'Forge a 1024 tile on the grid.',
    xpReward: 220,
    target: 1024,
    metric: 'highestTile',
  },
  {
    id: 'LINE_SWEEPER',
    title: 'Laser Sweeper',
    description: 'Clear 20 full rows or columns.',
    xpReward: 130,
    target: 20,
    metric: 'totalLinesCleared',
  },
  {
    id: 'DAILY_CHAMPION',
    title: 'Daily Victor',
    description: 'Complete a Daily Challenge objective.',
    xpReward: 110,
    target: 1,
    metric: 'dailyChallengesCompleted',
  },
  {
    id: 'STREAK_WEEK',
    title: '7-Day Pulse',
    description: 'Reach a 7-day daily streak.',
    xpReward: 200,
    target: 7,
    metric: 'bestStreak',
  },
  {
    id: 'LEVEL_FIVE',
    title: 'Neon Veteran',
    description: 'Reach Player Level 5.',
    xpReward: 160,
    target: 5,
    metric: 'level',
  },
];

export function xpRequiredForLevel(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level));
  return 150 + (safeLevel - 1) * 75;
}

export function computeLevelFromTotalXp(totalXp: number): {
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progressPct: number;
} {
  let remaining = Math.max(0, Math.floor(Number.isFinite(totalXp) ? totalXp : 0));
  let level = 1;
  while (level < 200) {
    const needed = xpRequiredForLevel(level);
    if (remaining < needed) {
      return {
        level,
        currentLevelXp: remaining,
        nextLevelXp: needed,
        progressPct: Math.min(100, Math.round((remaining / needed) * 100)),
      };
    }
    remaining -= needed;
    level++;
  }
  const cap = xpRequiredForLevel(level);
  return { level, currentLevelXp: cap, nextLevelXp: cap, progressPct: 100 };
}

export function getPlayerRankTitle(level: number): string {
  if (level >= 15) return 'Astral Luminary';
  if (level >= 10) return 'Prism Overlord';
  if (level >= 7) return 'Cascade Master';
  if (level >= 5) return 'Neon Veteran';
  if (level >= 3) return 'Circuit Weaver';
  return 'Grid Initiate';
}

export function createDefaultProfile(): PlayerProfileState {
  return {
    version: PROFILE_SCHEMA_VERSION,
    xp: 0,
    level: 1,
    selectedTheme: 'NEON_CYBER',
    selectedParticleStyle: 'CLASSIC_NEON',
    unlockedThemes: ['NEON_CYBER'],
    unlockedParticleStyles: ['CLASSIC_NEON'],
    unlockedAchievements: [],
    milestones: {
      rewardStreak: 0,
      longestRewardStreak: 0,
      cycleDay: 0,
      cycleCount: 0,
      lastClaimDate: null,
      claimedMilestoneDays: [],
      pendingBonusPoints: 0,
      totalBonusPointsEarned: 0,
    },
    comboHistory: {
      highestMultiplier: 0,
      totalCombos: 0,
      highestComboScore: 0,
      events: [],
    },
    lifetime: {
      gamesCompleted: 0,
      totalScoreEarned: 0,
      highestTile: 0,
      totalMerges: 0,
      totalLinesCleared: 0,
      dailyChallengesCompleted: 0,
    },
    recentRewards: [],
  };
}

function clampNonNegInt(val: unknown, fallback = 0, max = 1e9): number {
  if (typeof val !== 'number' || !Number.isFinite(val)) return fallback;
  return Math.max(0, Math.min(max, Math.floor(val)));
}

function isValidDateKey(val: unknown): val is string {
  if (typeof val !== 'string' || !DATE_KEY_RE.test(val)) return false;
  const [y, m, d] = val.split('-').map((n) => parseInt(n, 10));
  const dt = new Date(y, m - 1, d);
  return (
    dt.getFullYear() === y &&
    dt.getMonth() === m - 1 &&
    dt.getDate() === d
  );
}

function sanitizeComboEvent(raw: unknown): ComboEvent | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const multiplier = clampNonNegInt(obj.multiplier, 0, 999);
  const score = clampNonNegInt(obj.score, 0, 1e8);
  if (multiplier < 1 || score < 1) return null;

  return {
    id:
      typeof obj.id === 'string' && obj.id.length > 0
        ? obj.id.slice(0, 64)
        : `combo-${Math.random().toString(36).slice(2, 9)}`,
    timestamp:
      typeof obj.timestamp === 'string' && obj.timestamp.length > 0
        ? obj.timestamp.slice(0, 40)
        : new Date().toISOString(),
    dateKey: isValidDateKey(obj.dateKey) ? obj.dateKey : getLocalDateKey(),
    mode: obj.mode === 'DAILY' ? 'DAILY' : 'CLASSIC',
    multiplier,
    score,
    merges: clampNonNegInt(obj.merges, 0, 999),
    linesCleared: clampNonNegInt(obj.linesCleared, 0, 20),
    topTile: clampNonNegInt(obj.topTile, 0, 1e7),
    label:
      typeof obj.label === 'string' && obj.label.trim().length > 0
        ? obj.label.trim().slice(0, 32)
        : `CHAIN ×${multiplier}`,
  };
}

function sanitizeRecentReward(raw: unknown): RecentRewardItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.title !== 'string' || obj.title.trim().length === 0) return null;
  const validKinds: RecentRewardItem['kind'][] = [
    'MILESTONE',
    'ACHIEVEMENT',
    'LEVEL',
    'DAILY_CHALLENGE',
  ];
  const kind = validKinds.includes(obj.kind as RecentRewardItem['kind'])
    ? (obj.kind as RecentRewardItem['kind'])
    : 'MILESTONE';

  return {
    id:
      typeof obj.id === 'string' && obj.id.length > 0
        ? obj.id.slice(0, 64)
        : `rew-${Math.random().toString(36).slice(2, 9)}`,
    title: obj.title.trim().slice(0, 48),
    detail:
      typeof obj.detail === 'string' ? obj.detail.trim().slice(0, 72) : '',
    dateKey: isValidDateKey(obj.dateKey) ? obj.dateKey : getLocalDateKey(),
    kind,
  };
}

/**
 * Validates and migrates any parsed storage payload into a guaranteed safe v2 PlayerProfileState.
 */
export function validateAndMigrateProfile(
  raw: unknown,
  legacyDaily?: DailySaveState,
  legacyBestScore = 0
): PlayerProfileState {
  const base = createDefaultProfile();

  if (!raw || typeof raw !== 'object') {
    // First-time migration from v1 storage if available
    if (legacyDaily) {
      const completedDays = Object.values(legacyDaily.records).filter(
        (r) => r.completed
      ).length;
      base.lifetime.dailyChallengesCompleted = completedDays;
      base.milestones.longestRewardStreak = Math.max(
        base.milestones.longestRewardStreak,
        legacyDaily.longestStreak
      );
      if (completedDays > 0 || legacyBestScore > 0) {
        base.xp = Math.min(2000, completedDays * 100 + Math.floor(legacyBestScore / 30));
        const leveled = applyLevelAndThemeUnlocks(base, getLocalDateKey());
        return leveled.profile;
      }
    }
    return base;
  }

  const obj = raw as Record<string, unknown>;
  const xp = clampNonNegInt(obj.xp, 0, 1e8);
  const { level } = computeLevelFromTotalXp(xp);

  const unlockedThemesSet = new Set<ThemeId>(['NEON_CYBER']);
  if (Array.isArray(obj.unlockedThemes)) {
    for (const t of obj.unlockedThemes) {
      if (VALID_THEMES.includes(t as ThemeId)) {
        unlockedThemesSet.add(t as ThemeId);
      }
    }
  }
  const unlockedThemes = Array.from(unlockedThemesSet);
  const selectedTheme: ThemeId =
    VALID_THEMES.includes(obj.selectedTheme as ThemeId) &&
    unlockedThemesSet.has(obj.selectedTheme as ThemeId)
      ? (obj.selectedTheme as ThemeId)
      : 'NEON_CYBER';

  const unlockedParticlesSet = new Set<ParticleStyleId>(['CLASSIC_NEON']);
  if (Array.isArray(obj.unlockedParticleStyles)) {
    for (const p of obj.unlockedParticleStyles) {
      if (VALID_PARTICLE_STYLES.includes(p as ParticleStyleId)) {
        unlockedParticlesSet.add(p as ParticleStyleId);
      }
    }
  }
  const unlockedParticleStyles = Array.from(unlockedParticlesSet);
  const selectedParticleStyle: ParticleStyleId =
    VALID_PARTICLE_STYLES.includes(obj.selectedParticleStyle as ParticleStyleId) &&
    unlockedParticlesSet.has(obj.selectedParticleStyle as ParticleStyleId)
      ? (obj.selectedParticleStyle as ParticleStyleId)
      : 'CLASSIC_NEON';

  const unlockedAchievementsSet = new Set<AchievementId>();
  if (Array.isArray(obj.unlockedAchievements)) {
    for (const a of obj.unlockedAchievements) {
      if (VALID_ACHIEVEMENTS.includes(a as AchievementId)) {
        unlockedAchievementsSet.add(a as AchievementId);
      }
    }
  }

  const rawMilestones =
    obj.milestones && typeof obj.milestones === 'object'
      ? (obj.milestones as Record<string, unknown>)
      : {};
  const validMilestoneDayNums = new Set<number>(DAILY_MILESTONES.map((m) => m.day));
  const claimedMilestoneDays = Array.isArray(rawMilestones.claimedMilestoneDays)
    ? Array.from(
        new Set(
          rawMilestones.claimedMilestoneDays.filter(
            (d): d is number =>
              typeof d === 'number' && validMilestoneDayNums.has(d)
          )
        )
      ).sort((a, b) => a - b)
    : [];

  const rewardStreak = clampNonNegInt(rawMilestones.rewardStreak, 0, 10000);
  const longestRewardStreak = Math.max(
    rewardStreak,
    clampNonNegInt(rawMilestones.longestRewardStreak, 0, 10000)
  );
  const cycleDay = clampNonNegInt(rawMilestones.cycleDay, 0, 30);

  const rawCombo =
    obj.comboHistory && typeof obj.comboHistory === 'object'
      ? (obj.comboHistory as Record<string, unknown>)
      : {};
  const sanitizedEvents = Array.isArray(rawCombo.events)
    ? rawCombo.events
        .map(sanitizeComboEvent)
        .filter((e): e is ComboEvent => e !== null)
        .slice(0, MAX_COMBO_HISTORY_EVENTS)
    : [];

  const highestEventMult = sanitizedEvents.reduce(
    (m, e) => Math.max(m, e.multiplier),
    0
  );
  const highestEventScore = sanitizedEvents.reduce(
    (m, e) => Math.max(m, e.score),
    0
  );

  const rawLifetime =
    obj.lifetime && typeof obj.lifetime === 'object'
      ? (obj.lifetime as Record<string, unknown>)
      : {};

  const recentRewards = Array.isArray(obj.recentRewards)
    ? obj.recentRewards
        .map(sanitizeRecentReward)
        .filter((r): r is RecentRewardItem => r !== null)
        .slice(0, MAX_RECENT_REWARDS)
    : [];

  return {
    version: PROFILE_SCHEMA_VERSION,
    xp,
    level,
    selectedTheme,
    selectedParticleStyle,
    unlockedThemes,
    unlockedParticleStyles,
    unlockedAchievements: Array.from(unlockedAchievementsSet),
    milestones: {
      rewardStreak,
      longestRewardStreak,
      cycleDay,
      cycleCount: clampNonNegInt(rawMilestones.cycleCount, 0, 1000),
      lastClaimDate: isValidDateKey(rawMilestones.lastClaimDate)
        ? rawMilestones.lastClaimDate
        : null,
      claimedMilestoneDays,
      pendingBonusPoints: clampNonNegInt(
        rawMilestones.pendingBonusPoints,
        0,
        100000
      ),
      totalBonusPointsEarned: clampNonNegInt(
        rawMilestones.totalBonusPointsEarned,
        0,
        1e8
      ),
    },
    comboHistory: {
      highestMultiplier: Math.max(
        highestEventMult,
        clampNonNegInt(rawCombo.highestMultiplier, 0, 999)
      ),
      totalCombos: Math.max(
        sanitizedEvents.length,
        clampNonNegInt(rawCombo.totalCombos, 0, 1e7)
      ),
      highestComboScore: Math.max(
        highestEventScore,
        clampNonNegInt(rawCombo.highestComboScore, 0, 1e8)
      ),
      events: sanitizedEvents,
    },
    lifetime: {
      gamesCompleted: clampNonNegInt(rawLifetime.gamesCompleted, 0, 1e7),
      totalScoreEarned: clampNonNegInt(rawLifetime.totalScoreEarned, 0, 1e9),
      highestTile: clampNonNegInt(rawLifetime.highestTile, 0, 1e7),
      totalMerges: clampNonNegInt(rawLifetime.totalMerges, 0, 1e8),
      totalLinesCleared: clampNonNegInt(rawLifetime.totalLinesCleared, 0, 1e7),
      dailyChallengesCompleted: clampNonNegInt(
        rawLifetime.dailyChallengesCompleted,
        0,
        1e6
      ),
    },
    recentRewards,
  };
}

export function loadPlayerProfile(): PlayerProfileState {
  try {
    const rawStr = getStorageItem(PROFILE_STORAGE_KEY);
    if (!rawStr) {
      const migrated = validateAndMigrateProfile(
        null,
        loadDailySaveState(),
        loadBestScore()
      );
      savePlayerProfile(migrated);
      return migrated;
    }
    const parsed = JSON.parse(rawStr);
    const validated = validateAndMigrateProfile(parsed);
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      (parsed as { version?: number }).version !== PROFILE_SCHEMA_VERSION
    ) {
      savePlayerProfile(validated);
    }
    return validated;
  } catch {
    // Gracefully recover from corrupted JSON without clobbering recoverable legacy data
    const recovered = validateAndMigrateProfile(
      null,
      loadDailySaveState(),
      loadBestScore()
    );
    return recovered;
  }
}

export function savePlayerProfile(profile: PlayerProfileState): void {
  try {
    setStorageItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Ignore storage quota / private mode errors
  }
}

function pushRecentReward(
  list: RecentRewardItem[],
  item: Omit<RecentRewardItem, 'id'>
): RecentRewardItem[] {
  const entry: RecentRewardItem = {
    ...item,
    id: `rew-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  };
  return [entry, ...list].slice(0, MAX_RECENT_REWARDS);
}

/**
 * Computes effective daily reward streak status for a given local YYYY-MM-DD date.
 */
export function getDailyMilestoneStatus(
  profile: PlayerProfileState,
  todayKey: string = getLocalDateKey()
): {
  canClaimToday: boolean;
  alreadyClaimedToday: boolean;
  effectiveStreak: number;
  effectiveCycleDay: number;
  nextClaimDay: number;
  streakBroken: boolean;
  nextMilestone: DailyMilestoneDef | null;
} {
  const { lastClaimDate, rewardStreak, cycleDay } = profile.milestones;

  if (!lastClaimDate) {
    return {
      canClaimToday: true,
      alreadyClaimedToday: false,
      effectiveStreak: 0,
      effectiveCycleDay: 0,
      nextClaimDay: 1,
      streakBroken: false,
      nextMilestone: DAILY_MILESTONES[0],
    };
  }

  if (lastClaimDate === todayKey) {
    const nextMs =
      DAILY_MILESTONES.find((m) => m.day > cycleDay) ?? DAILY_MILESTONES[0];
    return {
      canClaimToday: false,
      alreadyClaimedToday: true,
      effectiveStreak: rewardStreak,
      effectiveCycleDay: cycleDay,
      nextClaimDay: cycleDay >= 30 ? 1 : cycleDay + 1,
      streakBroken: false,
      nextMilestone: nextMs,
    };
  }

  const yesterdayKey = offsetLocalDateKey(todayKey, -1);
  if (lastClaimDate === yesterdayKey) {
    const nextDay = cycleDay >= 30 ? 1 : cycleDay + 1;
    const nextMs =
      DAILY_MILESTONES.find((m) => m.day >= nextDay) ?? DAILY_MILESTONES[0];
    return {
      canClaimToday: true,
      alreadyClaimedToday: false,
      effectiveStreak: rewardStreak,
      effectiveCycleDay: cycleDay >= 30 ? 0 : cycleDay,
      nextClaimDay: nextDay,
      streakBroken: false,
      nextMilestone: nextMs,
    };
  }

  // Clock rollback check: if lastClaimDate is somehow in the future relative to local date,
  // prevent claiming duplicates until local date catches up.
  if (lastClaimDate > todayKey) {
    return {
      canClaimToday: false,
      alreadyClaimedToday: true,
      effectiveStreak: rewardStreak,
      effectiveCycleDay: cycleDay,
      nextClaimDay: cycleDay >= 30 ? 1 : cycleDay + 1,
      streakBroken: false,
      nextMilestone:
        DAILY_MILESTONES.find((m) => m.day > cycleDay) ?? DAILY_MILESTONES[0],
    };
  }

  // Missed at least one calendar day -> streak resets on next claim
  return {
    canClaimToday: true,
    alreadyClaimedToday: false,
    effectiveStreak: 0,
    effectiveCycleDay: 0,
    nextClaimDay: 1,
    streakBroken: rewardStreak > 0,
    nextMilestone: DAILY_MILESTONES[0],
  };
}

export interface ClaimMilestoneResult {
  profile: PlayerProfileState;
  claimed: boolean;
  reason?: 'ALREADY_CLAIMED_TODAY';
  dayNumber: number;
  milestone: DailyMilestoneDef | null;
  bonusPointsAwarded: number;
  xpAwarded: number;
  unlockedTheme?: ThemeId;
  unlockedParticle?: ParticleStyleId;
  leveledUpTo?: number;
  newAchievements: AchievementDef[];
}

export function applyLevelAndThemeUnlocks(
  profile: PlayerProfileState,
  dateKey: string
): { profile: PlayerProfileState; leveledUpTo?: number; unlockedThemes: ThemeId[] } {
  const prevLevel = profile.level;
  const computed = computeLevelFromTotalXp(profile.xp);
  let nextLevel = computed.level;
  const themesSet = new Set<ThemeId>(profile.unlockedThemes);
  const newlyUnlocked: ThemeId[] = [];
  let recent = profile.recentRewards;

  const levelUnlocks: { minLevel: number; theme: ThemeId; name: string }[] = [
    { minLevel: 3, theme: 'EMERALD_FLUX', name: 'Emerald Flux Theme' },
    { minLevel: 5, theme: 'SOLAR_PULSE', name: 'Solar Pulse Theme' },
    { minLevel: 8, theme: 'SYNTH_NOVA', name: 'Synth Nova Theme' },
    { minLevel: 12, theme: 'ASTRAL_GOLD', name: 'Astral Gold Theme' },
  ];

  for (const rule of levelUnlocks) {
    if (nextLevel >= rule.minLevel && !themesSet.has(rule.theme)) {
      themesSet.add(rule.theme);
      newlyUnlocked.push(rule.theme);
      recent = pushRecentReward(recent, {
        title: rule.name,
        detail: `Unlocked at Level ${nextLevel}`,
        dateKey,
        kind: 'LEVEL',
      });
    }
  }

  if (nextLevel > prevLevel) {
    recent = pushRecentReward(recent, {
      title: `Level ${nextLevel} Reached`,
      detail: getPlayerRankTitle(nextLevel),
      dateKey,
      kind: 'LEVEL',
    });
  }

  return {
    profile: {
      ...profile,
      level: nextLevel,
      unlockedThemes: Array.from(themesSet),
      recentRewards: recent,
    },
    leveledUpTo: nextLevel > prevLevel ? nextLevel : undefined,
    unlockedThemes: newlyUnlocked,
  };
}

export function getAchievementMetricValue(
  profile: PlayerProfileState,
  dailyChallengeStreak: number,
  metric: AchievementDef['metric']
): number {
  switch (metric) {
    case 'gamesCompleted':
      return profile.lifetime.gamesCompleted;
    case 'highestMultiplier':
      return profile.comboHistory.highestMultiplier;
    case 'totalCombos':
      return profile.comboHistory.totalCombos;
    case 'highestTile':
      return profile.lifetime.highestTile;
    case 'totalLinesCleared':
      return profile.lifetime.totalLinesCleared;
    case 'dailyChallengesCompleted':
      return profile.lifetime.dailyChallengesCompleted;
    case 'bestStreak':
      return Math.max(
        profile.milestones.longestRewardStreak,
        dailyChallengeStreak
      );
    case 'level':
      return profile.level;
    default:
      return 0;
  }
}

export function evaluateAchievements(
  profile: PlayerProfileState,
  dailyChallengeStreak: number,
  dateKey: string
): {
  profile: PlayerProfileState;
  newAchievements: AchievementDef[];
  leveledUpTo?: number;
} {
  let working = profile;
  const unlockedSet = new Set<AchievementId>(working.unlockedAchievements);
  const newAchievements: AchievementDef[] = [];
  let leveledUpTo: number | undefined;

  // Iterate twice so unlocking an achievement that grants Level 5 also unlocks LEVEL_FIVE
  for (let pass = 0; pass < 2; pass++) {
    let addedXp = 0;
    let recent = working.recentRewards;

    for (const def of ACHIEVEMENTS) {
      if (unlockedSet.has(def.id)) continue;
      const val = getAchievementMetricValue(working, dailyChallengeStreak, def.metric);
      if (val >= def.target) {
        unlockedSet.add(def.id);
        newAchievements.push(def);
        addedXp += def.xpReward;
        recent = pushRecentReward(recent, {
          title: def.title,
          detail: `Achievement · +${def.xpReward} XP`,
          dateKey,
          kind: 'ACHIEVEMENT',
        });
      }
    }

    if (addedXp === 0) break;

    const updatedXp = working.xp + addedXp;
    const withLevels = applyLevelAndThemeUnlocks(
      {
        ...working,
        xp: updatedXp,
        unlockedAchievements: Array.from(unlockedSet),
        recentRewards: recent,
      },
      dateKey
    );
    working = withLevels.profile;
    if (withLevels.leveledUpTo) {
      leveledUpTo = withLevels.leveledUpTo;
    }
  }

  return { profile: working, newAchievements, leveledUpTo };
}

/**
 * Claims today's daily check-in and any matching milestone reward (Day 1, 3, 5, 7, 14, 30).
 * Strictly prevents duplicate claims on the same local calendar date or same cycle milestone.
 */
export function claimDailyMilestoneReward(
  profile: PlayerProfileState,
  todayKey: string = getLocalDateKey(),
  dailyChallengeStreak = 0
): ClaimMilestoneResult {
  const status = getDailyMilestoneStatus(profile, todayKey);
  if (!status.canClaimToday) {
    return {
      profile,
      claimed: false,
      reason: 'ALREADY_CLAIMED_TODAY',
      dayNumber: profile.milestones.cycleDay,
      milestone: null,
      bonusPointsAwarded: 0,
      xpAwarded: 0,
      newAchievements: [],
    };
  }

  const isConsecutive =
    profile.milestones.lastClaimDate === offsetLocalDateKey(todayKey, -1);
  const startingNewCycle =
    !isConsecutive || profile.milestones.cycleDay >= 30;

  const nextStreak = isConsecutive ? profile.milestones.rewardStreak + 1 : 1;
  const nextLongest = Math.max(
    profile.milestones.longestRewardStreak,
    nextStreak
  );
  const nextCycleDay = startingNewCycle ? 1 : profile.milestones.cycleDay + 1;
  const nextCycleCount =
    isConsecutive && profile.milestones.cycleDay >= 30
      ? profile.milestones.cycleCount + 1
      : profile.milestones.cycleCount;

  const baseClaimedDays = startingNewCycle
    ? []
    : [...profile.milestones.claimedMilestoneDays];

  const matchingMilestone =
    DAILY_MILESTONES.find((m) => m.day === nextCycleDay) ?? null;

  let bonusPointsAwarded = 0;
  let xpAwarded = 30; // Daily check-in base XP on non-milestone days
  let unlockedTheme: ThemeId | undefined;
  let unlockedParticle: ParticleStyleId | undefined;

  const themesSet = new Set<ThemeId>(profile.unlockedThemes);
  const particlesSet = new Set<ParticleStyleId>(profile.unlockedParticleStyles);
  let recent = profile.recentRewards;

  if (matchingMilestone && !baseClaimedDays.includes(matchingMilestone.day)) {
    baseClaimedDays.push(matchingMilestone.day);
    bonusPointsAwarded = matchingMilestone.bonusPoints;
    xpAwarded = matchingMilestone.xpBonus;

    if (matchingMilestone.themeUnlock) {
      if (!themesSet.has(matchingMilestone.themeUnlock)) {
        themesSet.add(matchingMilestone.themeUnlock);
        unlockedTheme = matchingMilestone.themeUnlock;
      } else {
        // Already owned from previous 30-day cycle -> grant extra bonus points instead of duplicate unlock
        bonusPointsAwarded += 300;
      }
    }

    if (matchingMilestone.particleUnlock) {
      if (!particlesSet.has(matchingMilestone.particleUnlock)) {
        particlesSet.add(matchingMilestone.particleUnlock);
        unlockedParticle = matchingMilestone.particleUnlock;
      } else {
        bonusPointsAwarded += 300;
      }
    }

    recent = pushRecentReward(recent, {
      title: `Day ${matchingMilestone.day}: ${matchingMilestone.title}`,
      detail: matchingMilestone.subtitle,
      dateKey: todayKey,
      kind: 'MILESTONE',
    });
  } else {
    // Regular daily check-in reward on intermediate days
    bonusPointsAwarded = 100;
    recent = pushRecentReward(recent, {
      title: `Day ${nextCycleDay} Check-In`,
      detail: '+100 Bonus Points · +30 XP',
      dateKey: todayKey,
      kind: 'MILESTONE',
    });
  }

  let nextProfile: PlayerProfileState = {
    ...profile,
    xp: profile.xp + xpAwarded,
    unlockedThemes: Array.from(themesSet),
    unlockedParticleStyles: Array.from(particlesSet),
    milestones: {
      rewardStreak: nextStreak,
      longestRewardStreak: nextLongest,
      cycleDay: nextCycleDay,
      cycleCount: nextCycleCount,
      lastClaimDate: todayKey,
      claimedMilestoneDays: baseClaimedDays.sort((a, b) => a - b),
      pendingBonusPoints:
        profile.milestones.pendingBonusPoints + bonusPointsAwarded,
      totalBonusPointsEarned:
        profile.milestones.totalBonusPointsEarned + bonusPointsAwarded,
    },
    recentRewards: recent,
  };

  const levelRes = applyLevelAndThemeUnlocks(nextProfile, todayKey);
  nextProfile = levelRes.profile;

  const achRes = evaluateAchievements(
    nextProfile,
    Math.max(dailyChallengeStreak, nextLongest),
    todayKey
  );
  nextProfile = achRes.profile;

  return {
    profile: nextProfile,
    claimed: true,
    dayNumber: nextCycleDay,
    milestone: matchingMilestone,
    bonusPointsAwarded,
    xpAwarded,
    unlockedTheme,
    unlockedParticle,
    leveledUpTo: achRes.leveledUpTo ?? levelRes.leveledUpTo,
    newAchievements: achRes.newAchievements,
  };
}

export function consumePendingBonusPoints(
  profile: PlayerProfileState
): { profile: PlayerProfileState; bonusPoints: number } {
  const bonus = profile.milestones.pendingBonusPoints;
  if (bonus <= 0) return { profile, bonusPoints: 0 };
  return {
    bonusPoints: bonus,
    profile: {
      ...profile,
      milestones: {
        ...profile.milestones,
        pendingBonusPoints: 0,
      },
    },
  };
}

export interface TurnProgressionResult {
  profile: PlayerProfileState;
  recordedCombo: ComboEvent | null;
  xpAwarded: number;
  leveledUpTo?: number;
  newAchievements: AchievementDef[];
}

/**
 * Records significant combos, lifetime merge/line stats, combo XP, and checks achievements.
 */
export function recordTurnProgression(
  profile: PlayerProfileState,
  resolution: TurnResolution,
  mode: GameMode,
  dailyChallengeStreak = 0,
  todayKey: string = getLocalDateKey()
): TurnProgressionResult {
  const mergesCount = resolution.mergeSteps.length;
  const linesCount = resolution.lineClearStep
    ? resolution.lineClearStep.rows.length + resolution.lineClearStep.cols.length
    : 0;

  // Significant combo = chain depth >= 2, OR 2+ merges in one turn, OR merge + line clear, OR 2+ lines cleared
  const isSignificantCombo =
    resolution.maxComboDepth >= 2 ||
    mergesCount >= 2 ||
    linesCount >= 2 ||
    (mergesCount >= 1 && linesCount >= 1);

  const multiplier = Math.max(
    resolution.maxComboDepth,
    mergesCount + linesCount
  );

  let recordedCombo: ComboEvent | null = null;
  let xpAwarded = 0;
  let nextComboHistory = profile.comboHistory;

  if (isSignificantCombo) {
    let label = `CHAIN ×${multiplier}`;
    if (linesCount >= 2 && mergesCount >= 1) {
      label = `HYPER CLEAR ×${multiplier}`;
    } else if (linesCount >= 2) {
      label = `MEGA CLEAR ×${linesCount}`;
    } else if (linesCount >= 1 && mergesCount >= 1) {
      label = `FUSION CLEAR ×${multiplier}`;
    } else if (resolution.maxComboDepth >= 2) {
      label = `CHAIN ×${resolution.maxComboDepth}`;
    } else {
      label = `MULTI MERGE ×${mergesCount}`;
    }

    const comboScore =
      resolution.mergeSteps.reduce((acc, m) => acc + m.points, 0) +
      (resolution.lineClearStep ? resolution.lineClearStep.points : 0);

    recordedCombo = {
      id: `cmb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      dateKey: todayKey,
      mode,
      multiplier,
      score: Math.max(resolution.totalPointsGained, comboScore),
      merges: mergesCount,
      linesCleared: linesCount,
      topTile: resolution.newMaxTile,
      label,
    };

    xpAwarded = Math.min(180, 15 * multiplier + linesCount * 10);

    nextComboHistory = {
      highestMultiplier: Math.max(
        profile.comboHistory.highestMultiplier,
        multiplier
      ),
      totalCombos: profile.comboHistory.totalCombos + 1,
      highestComboScore: Math.max(
        profile.comboHistory.highestComboScore,
        recordedCombo.score
      ),
      events: [recordedCombo, ...profile.comboHistory.events].slice(
        0,
        MAX_COMBO_HISTORY_EVENTS
      ),
    };
  }

  let nextProfile: PlayerProfileState = {
    ...profile,
    xp: profile.xp + xpAwarded,
    comboHistory: nextComboHistory,
    lifetime: {
      ...profile.lifetime,
      highestTile: Math.max(profile.lifetime.highestTile, resolution.newMaxTile),
      totalMerges: profile.lifetime.totalMerges + mergesCount,
      totalLinesCleared: profile.lifetime.totalLinesCleared + linesCount,
    },
  };

  const levelRes = applyLevelAndThemeUnlocks(nextProfile, todayKey);
  nextProfile = levelRes.profile;

  const achRes = evaluateAchievements(nextProfile, dailyChallengeStreak, todayKey);
  nextProfile = achRes.profile;

  return {
    profile: nextProfile,
    recordedCombo,
    xpAwarded,
    leveledUpTo: achRes.leveledUpTo ?? levelRes.leveledUpTo,
    newAchievements: achRes.newAchievements,
  };
}

export function recordGameCompletionProgression(
  profile: PlayerProfileState,
  finalStats: GameStats,
  dailyChallengeStreak = 0,
  todayKey: string = getLocalDateKey()
): {
  profile: PlayerProfileState;
  xpAwarded: number;
  leveledUpTo?: number;
  newAchievements: AchievementDef[];
} {
  const xpAwarded = Math.min(350, 25 + Math.floor(finalStats.score / 40));

  let nextProfile: PlayerProfileState = {
    ...profile,
    xp: profile.xp + xpAwarded,
    lifetime: {
      ...profile.lifetime,
      gamesCompleted: profile.lifetime.gamesCompleted + 1,
      totalScoreEarned: profile.lifetime.totalScoreEarned + finalStats.score,
      highestTile: Math.max(profile.lifetime.highestTile, finalStats.maxTile),
    },
  };

  const levelRes = applyLevelAndThemeUnlocks(nextProfile, todayKey);
  nextProfile = levelRes.profile;

  const achRes = evaluateAchievements(nextProfile, dailyChallengeStreak, todayKey);
  nextProfile = achRes.profile;

  return {
    profile: nextProfile,
    xpAwarded,
    leveledUpTo: achRes.leveledUpTo ?? levelRes.leveledUpTo,
    newAchievements: achRes.newAchievements,
  };
}

export function recordDailyChallengeVictoryProgression(
  profile: PlayerProfileState,
  challengeTitle: string,
  shardsAwarded: number,
  dailyChallengeStreak: number,
  todayKey: string = getLocalDateKey()
): {
  profile: PlayerProfileState;
  xpAwarded: number;
  leveledUpTo?: number;
  newAchievements: AchievementDef[];
} {
  const xpAwarded = 120;
  let nextProfile: PlayerProfileState = {
    ...profile,
    xp: profile.xp + xpAwarded,
    lifetime: {
      ...profile.lifetime,
      dailyChallengesCompleted: profile.lifetime.dailyChallengesCompleted + 1,
    },
    recentRewards: pushRecentReward(profile.recentRewards, {
      title: `Daily: ${challengeTitle}`,
      detail: `+${shardsAwarded} Shards · +${xpAwarded} XP`,
      dateKey: todayKey,
      kind: 'DAILY_CHALLENGE',
    }),
  };

  const levelRes = applyLevelAndThemeUnlocks(nextProfile, todayKey);
  nextProfile = levelRes.profile;

  const achRes = evaluateAchievements(nextProfile, dailyChallengeStreak, todayKey);
  nextProfile = achRes.profile;

  return {
    profile: nextProfile,
    xpAwarded,
    leveledUpTo: achRes.leveledUpTo ?? levelRes.leveledUpTo,
    newAchievements: achRes.newAchievements,
  };
}

export function clearComboHistory(
  profile: PlayerProfileState
): PlayerProfileState {
  return {
    ...profile,
    comboHistory: {
      highestMultiplier: 0,
      totalCombos: 0,
      highestComboScore: 0,
      events: [],
    },
  };
}
