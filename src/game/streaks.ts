import {
  formatReadableDate,
  generateDailyChallenge,
  getLocalDateKey,
  offsetLocalDateKey,
} from './daily';
import { getStorageItem, setStorageItem } from './storage';
import {
  CalendarDayStatus,
  DailySaveState,
  PlayerProfileState,
  StreakCalendarDay,
  StreakMilestoneTier,
  StreakSaveState,
  StreakSource,
} from './types';

export const STREAK_STORAGE_KEY = 'neon_block_streak_v1';
export const STREAK_SCHEMA_VERSION = 1;
const MAX_STORED_DATES = 400;
const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

const STREAK_MILESTONE_DEFS: {
  days: 3 | 7 | 14 | 30;
  label: string;
  subtitle: string;
}[] = [
  { days: 3, label: 'Spark', subtitle: '3 consecutive days' },
  { days: 7, label: 'Blaze', subtitle: '7 consecutive days' },
  { days: 14, label: 'Supernova', subtitle: '14 consecutive days' },
  { days: 30, label: 'Immortal', subtitle: '30 consecutive days' },
];

export function isValidLocalDateKey(val: unknown): val is string {
  if (typeof val !== 'string' || !DATE_KEY_RE.test(val)) return false;
  const [y, m, d] = val.split('-').map((n) => parseInt(n, 10));
  const dt = new Date(y, m - 1, d);
  return (
    dt.getFullYear() === y &&
    dt.getMonth() === m - 1 &&
    dt.getDate() === d
  );
}

export function createDefaultStreakState(): StreakSaveState {
  return {
    version: STREAK_SCHEMA_VERSION,
    completedDates: [],
    dateSources: {},
    bestStreak: 0,
    lastRecordStreak: 0,
    lastRecordDate: null,
  };
}

function mergeSource(
  existing: StreakSource | undefined,
  incoming: StreakSource
): StreakSource {
  if (!existing) return incoming;
  if (existing === incoming) return existing;
  return 'BOTH';
}

function trimDates(
  sortedDates: string[],
  sources: Record<string, StreakSource>
): { completedDates: string[]; dateSources: Record<string, StreakSource> } {
  const deduped = Array.from(new Set(sortedDates)).sort();
  const trimmed =
    deduped.length > MAX_STORED_DATES
      ? deduped.slice(deduped.length - MAX_STORED_DATES)
      : deduped;
  const keptSet = new Set(trimmed);
  const nextSources: Record<string, StreakSource> = {};
  for (const key of trimmed) {
    if (keptSet.has(key) && sources[key]) {
      nextSources[key] = sources[key];
    }
  }
  return { completedDates: trimmed, dateSources: nextSources };
}

/**
 * Computes the longest consecutive local-date run present in completedDates.
 * Safely handles month transitions, leap years, and year boundaries via local Date math.
 */
export function computeLongestStreakFromDates(completedDates: string[]): number {
  if (completedDates.length === 0) return 0;
  const sorted = Array.from(new Set(completedDates.filter(isValidLocalDateKey))).sort();
  if (sorted.length === 0) return 0;

  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prevExpected = offsetLocalDateKey(sorted[i - 1], 1);
    if (sorted[i] === prevExpected) {
      run++;
      if (run > longest) longest = run;
    } else {
      run = 1;
    }
  }
  return longest;
}

/**
 * Computes the active current daily streak as of todayKey (local YYYY-MM-DD).
 * - If todayKey is completed: counts backwards from todayKey.
 * - Else if yesterday is completed: streak remains active until midnight today (never resets on app open).
 * - Otherwise: returns 0 (while bestStreak remains preserved separately).
 */
export function computeCurrentStreak(
  completedDates: string[],
  todayKey: string = getLocalDateKey()
): number {
  if (!isValidLocalDateKey(todayKey) || completedDates.length === 0) return 0;
  const dateSet = new Set(completedDates);

  let cursor: string;
  if (dateSet.has(todayKey)) {
    cursor = todayKey;
  } else {
    const yesterdayKey = offsetLocalDateKey(todayKey, -1);
    if (dateSet.has(yesterdayKey)) {
      cursor = yesterdayKey;
    } else {
      return 0;
    }
  }

  let count = 0;
  while (dateSet.has(cursor) && count < 10000) {
    count++;
    cursor = offsetLocalDateKey(cursor, -1);
  }
  return count;
}

/**
 * Validates raw stored data and safely synchronizes with existing Daily Challenge and Daily Reward records
 * without modifying or resetting streaks when the app opens or closes.
 */
export function validateAndHydrateStreakState(
  raw: unknown,
  dailyState?: DailySaveState,
  profile?: PlayerProfileState
): StreakSaveState {
  const datesSet = new Set<string>();
  const sources: Record<string, StreakSource> = {};
  let storedBest = 0;
  let lastRecordStreak = 0;
  let lastRecordDate: string | null = null;

  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.completedDates)) {
      for (const item of obj.completedDates) {
        if (isValidLocalDateKey(item)) {
          datesSet.add(item);
        }
      }
    }
    if (obj.dateSources && typeof obj.dateSources === 'object') {
      const rawSources = obj.dateSources as Record<string, unknown>;
      for (const [k, v] of Object.entries(rawSources)) {
        if (
          isValidLocalDateKey(k) &&
          (v === 'DAILY_CHALLENGE' || v === 'DAILY_REWARD' || v === 'BOTH')
        ) {
          datesSet.add(k);
          sources[k] = v;
        }
      }
    }
    if (typeof obj.bestStreak === 'number' && Number.isFinite(obj.bestStreak)) {
      storedBest = Math.max(0, Math.min(10000, Math.floor(obj.bestStreak)));
    }
    if (
      typeof obj.lastRecordStreak === 'number' &&
      Number.isFinite(obj.lastRecordStreak)
    ) {
      lastRecordStreak = Math.max(
        0,
        Math.min(10000, Math.floor(obj.lastRecordStreak))
      );
    }
    if (isValidLocalDateKey(obj.lastRecordDate)) {
      lastRecordDate = obj.lastRecordDate;
    }
  }

  // Hydrate qualifying dates from existing Daily Challenge save state
  if (dailyState) {
    for (const [dateKey, rec] of Object.entries(dailyState.records)) {
      if (rec?.completed && isValidLocalDateKey(dateKey)) {
        datesSet.add(dateKey);
        sources[dateKey] = mergeSource(sources[dateKey], 'DAILY_CHALLENGE');
      }
    }
    storedBest = Math.max(storedBest, Math.max(0, Math.floor(dailyState.longestStreak || 0)));
  }

  // Hydrate qualifying dates from existing Daily Reward Milestone state
  if (profile?.milestones) {
    const { lastClaimDate, rewardStreak, longestRewardStreak } = profile.milestones;
    if (isValidLocalDateKey(lastClaimDate)) {
      // Backfill contiguous claimed streak days ending on lastClaimDate if not yet recorded
      const streakDays = Math.max(1, Math.min(365, Math.floor(rewardStreak || 1)));
      for (let i = 0; i < streakDays; i++) {
        const key = offsetLocalDateKey(lastClaimDate, -i);
        datesSet.add(key);
        sources[key] = mergeSource(sources[key], 'DAILY_REWARD');
      }
    }
    storedBest = Math.max(
      storedBest,
      Math.max(0, Math.floor(longestRewardStreak || 0))
    );
  }

  const sorted = Array.from(datesSet).sort();
  const computedLongest = computeLongestStreakFromDates(sorted);
  const bestStreak = Math.max(storedBest, computedLongest);
  const { completedDates, dateSources } = trimDates(sorted, sources);

  return {
    version: STREAK_SCHEMA_VERSION,
    completedDates,
    dateSources,
    bestStreak,
    lastRecordStreak: Math.max(lastRecordStreak, bestStreak),
    lastRecordDate,
  };
}

export function loadStreakState(
  dailyState?: DailySaveState,
  profile?: PlayerProfileState
): StreakSaveState {
  try {
    const rawStr = getStorageItem(STREAK_STORAGE_KEY);
    const parsed = rawStr ? JSON.parse(rawStr) : null;
    const hydrated = validateAndHydrateStreakState(parsed, dailyState, profile);
    if (rawStr === null || !parsed || typeof parsed !== 'object') {
      saveStreakState(hydrated);
    }
    return hydrated;
  } catch {
    // Corrupted JSON: hydrate cleanly from dailyState/profile without erasing storage unless missing
    return validateAndHydrateStreakState(null, dailyState, profile);
  }
}

export function saveStreakState(state: StreakSaveState): void {
  try {
    setStorageItem(STREAK_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota / private mode errors
  }
}

export interface StreakRecordOutcome {
  state: StreakSaveState;
  alreadyCountedToday: boolean;
  currentStreak: number;
  bestStreak: number;
  previousBestStreak: number;
  isNewRecord: boolean;
  milestoneHit: (3 | 7 | 14 | 30) | null;
}

/**
 * Records a qualifying daily activity (Daily Challenge completion OR Daily Reward claim)
 * for local dateKey. Strictly prevents duplicate streak increments on the same calendar day
 * and detects new personal best streak records.
 */
export function recordQualifyingStreakDay(
  state: StreakSaveState,
  dateKey: string,
  source: Exclude<StreakSource, 'BOTH'>,
  todayKey: string = dateKey
): StreakRecordOutcome {
  if (!isValidLocalDateKey(dateKey)) {
    const cur = computeCurrentStreak(state.completedDates, todayKey);
    return {
      state,
      alreadyCountedToday: true,
      currentStreak: cur,
      bestStreak: state.bestStreak,
      previousBestStreak: state.bestStreak,
      isNewRecord: false,
      milestoneHit: null,
    };
  }

  const prevBest = state.bestStreak;
  const alreadyPresent = state.completedDates.includes(dateKey);

  if (alreadyPresent) {
    const nextSources = {
      ...state.dateSources,
      [dateKey]: mergeSource(state.dateSources[dateKey], source),
    };
    const nextState: StreakSaveState = {
      ...state,
      dateSources: nextSources,
    };
    const currentStreak = computeCurrentStreak(nextState.completedDates, todayKey);
    return {
      state: nextState,
      alreadyCountedToday: true,
      currentStreak,
      bestStreak: nextState.bestStreak,
      previousBestStreak: prevBest,
      isNewRecord: false,
      milestoneHit: null,
    };
  }

  const nextSources: Record<string, StreakSource> = {
    ...state.dateSources,
    [dateKey]: source,
  };
  const { completedDates, dateSources } = trimDates(
    [...state.completedDates, dateKey],
    nextSources
  );

  const currentStreak = computeCurrentStreak(completedDates, todayKey);
  const longestFromDates = computeLongestStreakFromDates(completedDates);
  const nextBest = Math.max(prevBest, currentStreak, longestFromDates);
  const isNewRecord =
    currentStreak > prevBest && currentStreak > state.lastRecordStreak;

  const milestoneHit: (3 | 7 | 14 | 30) | null =
    currentStreak === 3 ||
    currentStreak === 7 ||
    currentStreak === 14 ||
    currentStreak === 30
      ? currentStreak
      : null;

  const nextState: StreakSaveState = {
    version: STREAK_SCHEMA_VERSION,
    completedDates,
    dateSources,
    bestStreak: nextBest,
    lastRecordStreak: isNewRecord ? currentStreak : state.lastRecordStreak,
    lastRecordDate: isNewRecord ? dateKey : state.lastRecordDate,
  };

  return {
    state: nextState,
    alreadyCountedToday: false,
    currentStreak,
    bestStreak: nextBest,
    previousBestStreak: prevBest,
    isNewRecord,
    milestoneHit,
  };
}

export function getStreakMilestonesStatus(
  currentStreak: number,
  bestStreak: number
): StreakMilestoneTier[] {
  const safeCur = Math.max(0, Math.floor(currentStreak));
  const safeBest = Math.max(safeCur, Math.floor(bestStreak));

  return STREAK_MILESTONE_DEFS.map((def) => {
    const reachedCurrent = safeCur >= def.days;
    const reachedEver = safeBest >= def.days;
    const progressPct = Math.min(
      100,
      Math.round((safeCur / def.days) * 100)
    );
    return {
      days: def.days,
      label: def.label,
      subtitle: def.subtitle,
      reachedCurrent,
      reachedEver,
      progressPct,
      daysRemaining: Math.max(0, def.days - safeCur),
    };
  });
}

function buildCalendarDay(
  dateKey: string,
  todayKey: string,
  isFirstInWindow: boolean,
  completedSet: Set<string>,
  streakState: StreakSaveState,
  dailyState: DailySaveState,
  projectedMilestone?: 3 | 7 | 14 | 30
): StreakCalendarDay {
  const [y, m, d] = dateKey.split('-').map((n) => parseInt(n, 10));
  const dt = new Date(y, m - 1, d);
  const dayShort = dt.toLocaleDateString(undefined, { weekday: 'short' });
  const monthShort = dt.toLocaleDateString(undefined, { month: 'short' });

  const challenge = generateDailyChallenge(dateKey);
  const rec = dailyState.records[dateKey];
  const challengeCompleted = Boolean(rec?.completed);
  const source = streakState.dateSources[dateKey];
  const rewardClaimed = source === 'DAILY_REWARD' || source === 'BOTH';
  const qualified = completedSet.has(dateKey) || challengeCompleted;
  const challengeAttempted = Boolean(
    rec && (rec.attempts > 0 || rec.bestProgress > 0)
  );

  const isToday = dateKey === todayKey;
  const isFuture = dateKey > todayKey;

  let status: CalendarDayStatus;
  if (isFuture) {
    status = 'UPCOMING';
  } else if (qualified) {
    status = 'COMPLETED';
  } else if (isToday) {
    status = 'TODAY_PENDING';
  } else {
    status = 'MISSED';
  }

  const progressPct = qualified
    ? 100
    : !isFuture && rec && rec.bestProgress > 0
      ? Math.min(
          95,
          Math.max(
            12,
            Math.round((rec.bestProgress / Math.max(1, challenge.targetValue)) * 100)
          )
        )
      : !isFuture && challengeAttempted
        ? 14
        : 0;

  return {
    dateKey,
    dayNum: d,
    dayShort,
    monthShort,
    year: y,
    isMonthStart: d === 1 || isFirstInWindow,
    isToday,
    status,
    source: qualified ? source ?? (challengeCompleted ? 'DAILY_CHALLENGE' : 'DAILY_REWARD') : undefined,
    challengeCompleted,
    rewardClaimed,
    challengeAttempted,
    progressPct,
    bestScore: rec?.bestScore ?? 0,
    challengeTitle: challenge.title,
    readableDate: formatReadableDate(dateKey),
    projectedMilestone,
  };
}

/**
 * Builds the 7-day activity series (oldest -> todayKey) using unified streak qualification.
 */
export function buildSevenDayActivity(
  streakState: StreakSaveState,
  dailyState: DailySaveState,
  todayKey: string = getLocalDateKey()
): {
  days: StreakCalendarDay[];
  completedCount: number;
  consistencyPct: number;
} {
  const completedSet = new Set(streakState.completedDates);
  const days = Array.from({ length: 7 }, (_, i) => {
    const key = offsetLocalDateKey(todayKey, i - 6);
    return buildCalendarDay(
      key,
      todayKey,
      i === 0,
      completedSet,
      streakState,
      dailyState
    );
  });
  const completedCount = days.filter((d) => d.status === 'COMPLETED').length;
  const consistencyPct = Math.round((completedCount / 7) * 100);
  return { days, completedCount, consistencyPct };
}

/**
 * Builds a 30-day rolling activity calendar:
 * 22 past days + Today + 7 upcoming days = 30 local calendar days.
 * Always displays Completed, Missed, Today Pending, and Upcoming states plus month/year boundaries.
 */
export function buildThirtyDayActivityCalendar(
  streakState: StreakSaveState,
  dailyState: DailySaveState,
  todayKey: string = getLocalDateKey()
): {
  days: StreakCalendarDay[];
  completedPastOrToday: number;
  missedCount: number;
  upcomingCount: number;
  todayIndex: number;
} {
  const completedSet = new Set(streakState.completedDates);
  const currentStreak = computeCurrentStreak(streakState.completedDates, todayKey);
  const todayCompleted = completedSet.has(todayKey);
  const todayIndex = 22;
  const milestoneSet = new Set<number>([3, 7, 14, 30]);

  const days = Array.from({ length: 30 }, (_, i) => {
    const delta = i - todayIndex; // -22 .. +7
    const key = offsetLocalDateKey(todayKey, delta);
    let projectedMilestone: (3 | 7 | 14 | 30) | undefined;

    if (delta >= 0) {
      // Projected streak day if player completes today (if pending) and each subsequent upcoming day
      const projectedDay = todayCompleted
        ? currentStreak + delta
        : currentStreak + delta + 1;
      if (delta > 0 && milestoneSet.has(projectedDay)) {
        projectedMilestone = projectedDay as 3 | 7 | 14 | 30;
      } else if (delta === 0 && !todayCompleted && milestoneSet.has(projectedDay)) {
        projectedMilestone = projectedDay as 3 | 7 | 14 | 30;
      }
    }

    return buildCalendarDay(
      key,
      todayKey,
      i === 0,
      completedSet,
      streakState,
      dailyState,
      projectedMilestone
    );
  });

  const completedPastOrToday = days.filter((d) => d.status === 'COMPLETED').length;
  const missedCount = days.filter((d) => d.status === 'MISSED').length;
  const upcomingCount = days.filter((d) => d.status === 'UPCOMING').length;

  return {
    days,
    completedPastOrToday,
    missedCount,
    upcomingCount,
    todayIndex,
  };
}
