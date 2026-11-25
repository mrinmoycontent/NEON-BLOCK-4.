import {
  DailyChallengeConfig,
  DailyDayRecord,
  DailyDifficulty,
  DailyObjectiveType,
  DailySaveState,
  GRID_SIZE,
  GameStats,
  ParticleIntensity,
} from './types';

const DAILY_STORAGE_KEY = 'neon_block_daily_v1';
const PARTICLE_INTENSITY_KEY = 'neon_block_particle_intensity_v1';

/**
 * Returns local calendar date formatted as YYYY-MM-DD (never UTC shifted).
 */
export function getLocalDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function offsetLocalDateKey(dateKey: string, deltaDays: number): string {
  const [y, m, d] = dateKey.split('-').map((n) => parseInt(n, 10));
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + deltaDays);
  return getLocalDateKey(dt);
}

export function formatReadableDate(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map((n) => parseInt(n, 10));
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function hashDateSeed(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function createSeededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CHALLENGE_TITLES: Record<DailyObjectiveType, string[]> = {
  SCORE: ['Neon Surge', 'Plasma Sprint', 'Prism Overload'],
  MAX_TILE: ['Core Ascension', 'Cobalt Synthesis', 'Ultraviolet Forge'],
  LINES: ['Laser Sweep', 'Grid Lockdown', 'Vector Purge'],
  MERGES: ['Chain Reactor', 'Quantum Fusion', 'Harmonic Cascade'],
};

export function generateDailyChallenge(
  dateKey: string = getLocalDateKey()
): DailyChallengeConfig {
  const seed = hashDateSeed(`NEON_BLOCK_DAILY_${dateKey}`);
  const rng = createSeededRng(seed);

  // Rotate difficulty deterministically by day index + seeded variation
  const difficulties: DailyDifficulty[] = ['STANDARD', 'HARD', 'EXPERT'];
  const [y, m, d] = dateKey.split('-').map((n) => parseInt(n, 10));
  const dayObj = new Date(y, m - 1, d);
  const diffIdx = (dayObj.getDay() + Math.floor(rng() * 2)) % 3;
  const difficulty = difficulties[diffIdx];

  const objectives: DailyObjectiveType[] = ['SCORE', 'MAX_TILE', 'LINES', 'MERGES'];
  const objectiveType = objectives[Math.floor(rng() * objectives.length)];

  let targetValue = 1200;
  let description = '';
  let rewardShards = 150;

  if (difficulty === 'STANDARD') {
    rewardShards = 150;
    if (objectiveType === 'SCORE') {
      targetValue = 1200;
      description = 'Reach 1,200 points in a single run';
    } else if (objectiveType === 'MAX_TILE') {
      targetValue = 128;
      description = 'Forge a 128 tile on the board';
    } else if (objectiveType === 'LINES') {
      targetValue = 4;
      description = 'Clear 4 full rows or columns';
    } else {
      targetValue = 8;
      description = 'Trigger 8 tile merges';
    }
  } else if (difficulty === 'HARD') {
    rewardShards = 300;
    if (objectiveType === 'SCORE') {
      targetValue = 2200;
      description = 'Reach 2,200 points in a single run';
    } else if (objectiveType === 'MAX_TILE') {
      targetValue = 256;
      description = 'Forge a 256 tile on the board';
    } else if (objectiveType === 'LINES') {
      targetValue = 6;
      description = 'Clear 6 full rows or columns';
    } else {
      targetValue = 14;
      description = 'Trigger 14 tile merges';
    }
  } else {
    rewardShards = 500;
    if (objectiveType === 'SCORE') {
      targetValue = 3500;
      description = 'Reach 3,500 points in a single run';
    } else if (objectiveType === 'MAX_TILE') {
      targetValue = 512;
      description = 'Forge a 512 tile on the board';
    } else if (objectiveType === 'LINES') {
      targetValue = 9;
      description = 'Clear 9 full rows or columns';
    } else {
      targetValue = 20;
      description = 'Trigger 20 tile merges';
    }
  }

  // Generate deterministic sparse starter cells (checkerboard-safe so no pre-merge triggers on spawn)
  const starterCount =
    difficulty === 'STANDARD' ? 4 : difficulty === 'HARD' ? 6 : 8;
  const starterCells: { r: number; c: number; value: number }[] = [];
  const used = new Set<string>();
  const starterValues =
    difficulty === 'EXPERT' ? [4, 8, 16] : difficulty === 'HARD' ? [2, 4, 8] : [2, 4];

  let guard = 0;
  while (starterCells.length < starterCount && guard < 120) {
    guard++;
    const r = Math.floor(rng() * GRID_SIZE);
    const c = Math.floor(rng() * GRID_SIZE);
    const key = `${r},${c}`;
    if (used.has(key)) continue;

    // Ensure no two orthogonally adjacent starter cells share a value (prevents auto-merge on frame 0)
    const val = starterValues[Math.floor(rng() * starterValues.length)];
    const hasSameNeighbor = starterCells.some(
      (cell) =>
        Math.abs(cell.r - r) + Math.abs(cell.c - c) === 1 && cell.value === val
    );
    if (hasSameNeighbor) continue;

    used.add(key);
    starterCells.push({ r, c, value: val });
  }

  const titlePool = CHALLENGE_TITLES[objectiveType];
  const title = titlePool[Math.floor(rng() * titlePool.length)];

  return {
    dateKey,
    seed,
    title,
    difficulty,
    objectiveType,
    targetValue,
    description,
    rewardShards,
    starterCells,
  };
}

export function evaluateDailyProgress(
  challenge: DailyChallengeConfig,
  stats: GameStats
): { current: number; target: number; pct: number; isComplete: boolean } {
  let current = 0;
  if (challenge.objectiveType === 'SCORE') {
    current = stats.score;
  } else if (challenge.objectiveType === 'MAX_TILE') {
    current = stats.maxTile;
  } else if (challenge.objectiveType === 'LINES') {
    current = stats.linesCleared;
  } else {
    current = stats.mergesCount;
  }

  const target = challenge.targetValue;
  const pct = Math.min(100, Math.round((current / Math.max(1, target)) * 100));
  return {
    current,
    target,
    pct,
    isComplete: current >= target,
  };
}

export function loadDailySaveState(): DailySaveState {
  const empty: DailySaveState = {
    currentStreak: 0,
    longestStreak: 0,
    lastCompletedDate: null,
    totalShards: 0,
    records: {},
  };

  try {
    const raw = window.localStorage.getItem(DAILY_STORAGE_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<DailySaveState>;
    return {
      currentStreak:
        typeof parsed.currentStreak === 'number' ? parsed.currentStreak : 0,
      longestStreak:
        typeof parsed.longestStreak === 'number' ? parsed.longestStreak : 0,
      lastCompletedDate:
        typeof parsed.lastCompletedDate === 'string'
          ? parsed.lastCompletedDate
          : null,
      totalShards:
        typeof parsed.totalShards === 'number' ? parsed.totalShards : 0,
      records:
        parsed.records && typeof parsed.records === 'object'
          ? parsed.records
          : {},
    };
  } catch {
    return empty;
  }
}

export function saveDailySaveState(state: DailySaveState): void {
  try {
    window.localStorage.setItem(DAILY_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Returns active display streak for todayKey (resets to 0 if player missed yesterday).
 */
export function getEffectiveStreak(
  state: DailySaveState,
  todayKey: string = getLocalDateKey()
): number {
  if (!state.lastCompletedDate) return 0;
  const yesterdayKey = offsetLocalDateKey(todayKey, -1);
  if (
    state.lastCompletedDate === todayKey ||
    state.lastCompletedDate === yesterdayKey
  ) {
    return state.currentStreak;
  }
  return 0;
}

export function recordDailyAttempt(
  state: DailySaveState,
  dateKey: string
): DailySaveState {
  const existing: DailyDayRecord = state.records[dateKey] ?? {
    dateKey,
    completed: false,
    rewardClaimed: false,
    bestProgress: 0,
    bestScore: 0,
    attempts: 0,
  };

  const next: DailySaveState = {
    ...state,
    records: {
      ...state.records,
      [dateKey]: {
        ...existing,
        attempts: existing.attempts + 1,
      },
    },
  };
  saveDailySaveState(next);
  return next;
}

export interface DailyUpdateResult {
  nextState: DailySaveState;
  newlyCompleted: boolean;
  shardsAwarded: number;
}

/**
 * Updates daily progress and guarantees duplicate rewards/streaks are NEVER granted twice for the same dateKey.
 */
export function updateDailyProgressAndReward(
  state: DailySaveState,
  challenge: DailyChallengeConfig,
  stats: GameStats
): DailyUpdateResult {
  const { dateKey, rewardShards } = challenge;
  const evalRes = evaluateDailyProgress(challenge, stats);

  const existing: DailyDayRecord = state.records[dateKey] ?? {
    dateKey,
    completed: false,
    rewardClaimed: false,
    bestProgress: 0,
    bestScore: 0,
    attempts: 1,
  };

  const nextBestProgress = Math.max(existing.bestProgress, evalRes.current);
  const nextBestScore = Math.max(existing.bestScore, stats.score);

  let newlyCompleted = false;
  let shardsAwarded = 0;
  let nextStreak = state.currentStreak;
  let nextLongest = state.longestStreak;
  let nextLastCompleted = state.lastCompletedDate;
  let nextTotalShards = state.totalShards;

  const shouldAward =
    evalRes.isComplete && !existing.completed && !existing.rewardClaimed;

  if (shouldAward) {
    newlyCompleted = true;
    shardsAwarded = rewardShards;
    nextTotalShards += rewardShards;

    const yesterdayKey = offsetLocalDateKey(dateKey, -1);
    if (state.lastCompletedDate === dateKey) {
      // Already counted today; keep streak unchanged
      nextStreak = state.currentStreak;
    } else if (state.lastCompletedDate === yesterdayKey) {
      nextStreak = state.currentStreak + 1;
    } else {
      nextStreak = 1;
    }
    nextLongest = Math.max(nextLongest, nextStreak);
    nextLastCompleted = dateKey;
  }

  const nextRecord: DailyDayRecord = {
    ...existing,
    completed: existing.completed || evalRes.isComplete,
    rewardClaimed: existing.rewardClaimed || shouldAward,
    bestProgress: nextBestProgress,
    bestScore: nextBestScore,
    completedAt:
      existing.completedAt ?? (shouldAward ? new Date().toISOString() : undefined),
  };

  const nextState: DailySaveState = {
    currentStreak: nextStreak,
    longestStreak: nextLongest,
    lastCompletedDate: nextLastCompleted,
    totalShards: nextTotalShards,
    records: {
      ...state.records,
      [dateKey]: nextRecord,
    },
  };

  saveDailySaveState(nextState);
  return {
    nextState,
    newlyCompleted,
    shardsAwarded,
  };
}

export function loadParticleIntensity(): ParticleIntensity {
  try {
    const raw = window.localStorage.getItem(PARTICLE_INTENSITY_KEY);
    if (raw === 'LOW' || raw === 'MEDIUM' || raw === 'HIGH') {
      return raw;
    }
  } catch {
    // Ignore storage errors
  }
  return 'HIGH';
}

export function saveParticleIntensity(intensity: ParticleIntensity): void {
  try {
    window.localStorage.setItem(PARTICLE_INTENSITY_KEY, intensity);
  } catch {
    // Ignore storage errors
  }
}

export interface SevenDayStreakPoint {
  dateKey: string;
  dayShort: string;
  dayNum: number;
  readableDate: string;
  isToday: boolean;
  completed: boolean;
  attempted: boolean;
  progressPct: number; // 0..100
  bestScore: number;
  challengeTitle: string;
}

/**
 * Builds an ordered 7-day history ending on todayKey (oldest -> today)
 * showing Daily Challenge completion and progress consistency.
 */
export function buildSevenDayStreakHistory(
  state: DailySaveState,
  todayKey: string = getLocalDateKey()
): {
  days: SevenDayStreakPoint[];
  completedCount: number;
  consistencyPct: number;
} {
  const days: SevenDayStreakPoint[] = Array.from({ length: 7 }, (_, i) => {
    const key = offsetLocalDateKey(todayKey, i - 6);
    const [y, m, d] = key.split('-').map((n) => parseInt(n, 10));
    const dt = new Date(y, m - 1, d);
    const dayShort = dt.toLocaleDateString(undefined, { weekday: 'short' });
    const challenge = generateDailyChallenge(key);
    const rec = state.records[key];
    const completed = Boolean(rec?.completed);
    const attempted = Boolean(rec && (rec.attempts > 0 || rec.bestProgress > 0));
    const progressPct = completed
      ? 100
      : rec && rec.bestProgress > 0
        ? Math.min(
            95,
            Math.max(
              10,
              Math.round((rec.bestProgress / Math.max(1, challenge.targetValue)) * 100)
            )
          )
        : attempted
          ? 12
          : 0;

    return {
      dateKey: key,
      dayShort,
      dayNum: dt.getDate(),
      readableDate: formatReadableDate(key),
      isToday: key === todayKey,
      completed,
      attempted,
      progressPct,
      bestScore: rec?.bestScore ?? 0,
      challengeTitle: challenge.title,
    };
  });

  const completedCount = days.filter((d) => d.completed).length;
  const consistencyPct = Math.round((completedCount / 7) * 100);

  return { days, completedCount, consistencyPct };
}

