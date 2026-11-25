import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Award,
  Calendar,
  Check,
  CheckCircle2,
  Flame,
  Gift,
  History,
  Lock,
  Palette,
  Sparkles,
  Trash2,
  Trophy,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { formatReadableDate } from '../game/daily';
import {
  ACHIEVEMENTS,
  ClaimMilestoneResult,
  DAILY_MILESTONES,
  computeLevelFromTotalXp,
  getAchievementMetricValue,
  getDailyMilestoneStatus,
  getPlayerRankTitle,
} from '../game/progression';
import {
  buildSevenDayActivity,
  buildThirtyDayActivityCalendar,
  computeCurrentStreak,
  getStreakMilestonesStatus,
} from '../game/streaks';
import { PARTICLE_STYLE_LIST, THEME_LIST } from '../game/themes';
import {
  DailySaveState,
  DashboardTab,
  ParticleStyleId,
  PlayerProfileState,
  StreakSaveState,
  ThemeId,
} from '../game/types';
import { NeonFlame, getFlameTierLabel } from './NeonFlame';

interface DashboardScreenProps {
  profile: PlayerProfileState;
  dailyState: DailySaveState;
  streakState: StreakSaveState;
  todayKey: string;
  initialTab?: DashboardTab;
  reducedMotion: boolean;
  sfxVolume: number;
  muted: boolean;
  onClaimDailyMilestone: () => ClaimMilestoneResult;
  onClearComboHistory: () => void;
  onSelectTheme: (theme: ThemeId) => void;
  onSelectParticleStyle: (style: ParticleStyleId) => void;
  onOpenDailyChallenge: () => void;
  onOpenAudioSettings: () => void;
  onBack: () => void;
  isHelpOpen?: boolean;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  profile,
  dailyState,
  streakState,
  todayKey,
  initialTab = 'OVERVIEW',
  reducedMotion,
  sfxVolume,
  muted,
  onClaimDailyMilestone,
  onClearComboHistory,
  onSelectTheme,
  onSelectParticleStyle,
  onOpenDailyChallenge,
  onOpenAudioSettings,
  onBack,
  isHelpOpen = false,
}) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>(initialTab);
  const [confirmClear, setConfirmClear] = useState(false);
  const [selectedStreakDayIdx, setSelectedStreakDayIdx] = useState<number>(6);
  const [selectedCalDayIdx, setSelectedCalDayIdx] = useState<number>(22);
  const [claimCelebration, setClaimCelebration] =
    useState<ClaimMilestoneResult | null>(null);
  const backBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    setSelectedStreakDayIdx(6);
    setSelectedCalDayIdx(22);
  }, [todayKey]);

  useEffect(() => {
    backBtnRef.current?.focus();
  }, []);

  // Dismiss reward celebration dialog on Escape before returning from Dashboard
  useEffect(() => {
    if (!claimCelebration || isHelpOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'GoBack' || e.key === 'Backspace') {
        e.preventDefault();
        e.stopImmediatePropagation();
        setClaimCelebration(null);
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [claimCelebration, isHelpOpen]);

  const levelInfo = computeLevelFromTotalXp(profile.xp);
  const rankTitle = getPlayerRankTitle(levelInfo.level);
  const milestoneStatus = getDailyMilestoneStatus(profile, todayKey);
  const unifiedCurrentStreak = useMemo(
    () => computeCurrentStreak(streakState.completedDates, todayKey),
    [streakState.completedDates, todayKey]
  );
  const unifiedBestStreak = Math.max(
    streakState.bestStreak,
    profile.milestones.longestRewardStreak,
    dailyState.longestStreak,
    unifiedCurrentStreak
  );
  const displayStreak = unifiedCurrentStreak;
  const streakMilestones = useMemo(
    () => getStreakMilestonesStatus(unifiedCurrentStreak, unifiedBestStreak),
    [unifiedCurrentStreak, unifiedBestStreak]
  );
  const milestoneProgressPct = Math.min(
    100,
    Math.round((milestoneStatus.effectiveCycleDay / 30) * 100)
  );

  const sevenDayHistory = useMemo(
    () => buildSevenDayActivity(streakState, dailyState, todayKey),
    [streakState, dailyState, todayKey]
  );

  const thirtyDayCalendar = useMemo(
    () => buildThirtyDayActivityCalendar(streakState, dailyState, todayKey),
    [streakState, dailyState, todayKey]
  );

  const sparklineGeometry = useMemo(() => {
    const pts = sevenDayHistory.days.map((day, idx) => {
      const x = (idx + 0.5) * 100;
      const y = 88 - day.progressPct * 0.76;
      return { x, y };
    });
    const linePoints = pts.map((p) => `${p.x},${p.y}`).join(' ');
    const areaPoints = `50,88 ${linePoints} 650,88`;
    return { linePoints, areaPoints };
  }, [sevenDayHistory]);

  const inspectedStreakDay =
    sevenDayHistory.days[selectedStreakDayIdx] ?? sevenDayHistory.days[6];
  const inspectedCalDay =
    thirtyDayCalendar.days[selectedCalDayIdx] ??
    thirtyDayCalendar.days[thirtyDayCalendar.todayIndex];
  const todayQualified = sevenDayHistory.days[6]?.status === 'COMPLETED';
  const isNewRecordToday =
    streakState.lastRecordDate === todayKey &&
    unifiedCurrentStreak > 0 &&
    unifiedCurrentStreak >= unifiedBestStreak;

  const describeStreakSource = (source?: 'DAILY_CHALLENGE' | 'DAILY_REWARD' | 'BOTH') => {
    if (source === 'BOTH') return 'Daily Challenge + Daily Reward';
    if (source === 'DAILY_REWARD') return 'Daily Reward';
    return 'Daily Challenge';
  };

  const handleClaimClick = () => {
    const res = onClaimDailyMilestone();
    if (res.claimed) {
      setClaimCelebration(res);
    }
  };

  const formatTimestamp = (iso: string, dateKey: string): string => {
    try {
      const dt = new Date(iso);
      if (Number.isNaN(dt.getTime())) return dateKey;
      return dt.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateKey;
    }
  };

  const tabs: { id: DashboardTab; label: string; badge?: string }[] = [
    { id: 'OVERVIEW', label: 'Overview' },
    {
      id: 'STREAKS',
      label: 'Streaks',
      badge: unifiedCurrentStreak > 0 ? `${unifiedCurrentStreak}d` : undefined,
    },
    {
      id: 'MILESTONES',
      label: '30-Day Rewards',
      badge: milestoneStatus.canClaimToday ? 'Ready' : undefined,
    },
    { id: 'COMBOS', label: 'Combo History' },
    { id: 'ACHIEVEMENTS', label: 'Badges & Themes' },
  ];

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center p-2.5 sm:p-5 bg-[#050711]/88 animate-[fadeIn_160ms_ease-out]">
      <div className="relative w-full max-w-4xl max-h-[94dvh] flex flex-col rounded-2xl bg-[#091026]/98 border border-cyan-400/30 shadow-[0_0_60px_rgba(34,211,238,0.16)] overflow-hidden">
        {/* Top Bar */}
        <div className="shrink-0 px-4 sm:px-6 py-4 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              ref={backBtnRef}
              type="button"
              onClick={onBack}
              aria-label="Close dashboard"
              className="neon-focus min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-[#0F1838] border border-indigo-400/25 hover:border-cyan-400/60 text-slate-200 hover:text-cyan-300 transition-colors shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h2 className="font-display text-xl sm:text-2xl font-extrabold tracking-wide text-white truncate">
                Player Dashboard
              </h2>
              <div className="text-xs text-slate-400 flex items-center gap-2">
                <span className="text-cyan-300 font-semibold">
                  Level {levelInfo.level}
                </span>
                <span aria-hidden="true">·</span>
                <span>{rankTitle}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono-nums">
                  {profile.xp.toLocaleString()} XP
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onOpenAudioSettings}
              aria-label={`Audio settings, sound effects ${muted ? 'muted' : `${sfxVolume} percent`}`}
              className="neon-focus min-h-[44px] px-3 py-2 rounded-xl bg-[#0F1838] border border-indigo-400/25 hover:border-cyan-400/60 text-xs sm:text-sm font-medium text-slate-200 hover:text-cyan-200 flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              {muted || sfxVolume === 0 ? (
                <VolumeX className="w-4 h-4 text-slate-400 shrink-0" />
              ) : (
                <Volume2 className="w-4 h-4 text-cyan-300 shrink-0" />
              )}
              <span className="font-mono-nums">
                {muted ? 'Muted' : `${sfxVolume}%`}
              </span>
            </button>
            <button
              type="button"
              onClick={onOpenDailyChallenge}
              className="neon-focus min-h-[44px] px-4 py-2 rounded-xl bg-[#0F1838] border border-purple-400/30 hover:border-cyan-400/60 text-xs sm:text-sm font-medium text-slate-100 transition-colors whitespace-nowrap"
            >
              Daily Challenge
            </button>
            {milestoneStatus.canClaimToday && (
              <button
                type="button"
                onClick={handleClaimClick}
                className="neon-focus min-h-[44px] px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 hover:from-cyan-400 hover:via-blue-400 hover:to-purple-400 text-xs sm:text-sm font-display font-bold text-white shadow-[0_0_20px_rgba(56,189,248,0.4)] transition-transform active:scale-[0.98] whitespace-nowrap"
              >
                Claim Day {milestoneStatus.nextClaimDay}
              </button>
            )}
          </div>
        </div>

        {/* Segmented Navigation Tabs */}
        <div className="shrink-0 px-4 sm:px-6 py-2.5 bg-[#070C1D] border-b border-slate-800/80 overflow-x-auto">
          <div
            role="tablist"
            aria-label="Dashboard sections"
            className="inline-flex items-center gap-1.5 min-w-full sm:min-w-0"
          >
            {tabs.map((tab) => {
              const selected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={selected}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    setConfirmClear(false);
                  }}
                  className={`neon-focus min-h-[40px] px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 ${
                    selected
                      ? 'bg-[#121D42] text-cyan-200 border border-cyan-400/50'
                      : 'text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className="text-[11px] font-bold text-cyan-300">
                      · {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable Tab Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* OVERVIEW TAB */}
          {activeTab === 'OVERVIEW' && (
            <div className="space-y-6">
              {/* Level & XP Bar */}
              <section className="rounded-xl bg-[#0D1530] border border-indigo-500/25 p-4 sm:p-5 space-y-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <div className="text-xs text-slate-400">
                      Player Progression
                    </div>
                    <div className="font-display text-2xl font-extrabold text-white">
                      Level {levelInfo.level}{' '}
                      <span className="text-base font-semibold text-cyan-300 ml-1">
                        {rankTitle}
                      </span>
                    </div>
                  </div>
                  <div className="font-mono-nums text-xs sm:text-sm text-slate-300">
                    {levelInfo.currentLevelXp.toLocaleString()} /{' '}
                    {levelInfo.nextLevelXp.toLocaleString()} XP to Level{' '}
                    {levelInfo.level + 1}
                  </div>
                </div>

                <div className="w-full h-3 rounded-full bg-[#060A18] overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 transition-all duration-200"
                    style={{ width: `${levelInfo.progressPct}%` }}
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                  <span>
                    Games Completed:{' '}
                    <strong className="font-mono-nums text-slate-200">
                      {profile.lifetime.gamesCompleted}
                    </strong>
                    <span className="mx-2" aria-hidden="true">
                      ·
                    </span>
                    Highest Tile:{' '}
                    <strong className="font-mono-nums text-purple-300">
                      {profile.lifetime.highestTile > 0
                        ? profile.lifetime.highestTile
                        : '—'}
                    </strong>
                  </span>
                  <span>
                    Achievements:{' '}
                    <strong className="font-mono-nums text-cyan-300">
                      {profile.unlockedAchievements.length} /{' '}
                      {ACHIEVEMENTS.length}
                    </strong>
                  </span>
                </div>
              </section>

              {/* 4-Column KPI Strip */}
              <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="rounded-xl bg-[#0D1530] border border-indigo-500/20 p-4 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Flame className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>Daily Streak</span>
                  </div>
                  <div className="font-mono-nums text-2xl font-extrabold text-white">
                    {displayStreak}{' '}
                    <span className="text-xs font-medium text-slate-400">
                      {displayStreak === 1 ? 'day' : 'days'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono-nums">
                    Best: {unifiedBestStreak}d
                  </div>
                </div>

                <div className="rounded-xl bg-[#0D1530] border border-indigo-500/20 p-4 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Zap className="w-3.5 h-3.5 text-purple-300 shrink-0" />
                    <span>Best Combo</span>
                  </div>
                  <div className="font-mono-nums text-2xl font-extrabold text-purple-300">
                    {profile.comboHistory.highestMultiplier > 0
                      ? `×${profile.comboHistory.highestMultiplier}`
                      : '—'}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Peak multiplier
                  </div>
                </div>

                <div className="rounded-xl bg-[#0D1530] border border-indigo-500/20 p-4 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <History className="w-3.5 h-3.5 text-blue-300 shrink-0" />
                    <span>Total Combos</span>
                  </div>
                  <div className="font-mono-nums text-2xl font-extrabold text-white">
                    {profile.comboHistory.totalCombos.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono-nums">
                    Best score: {profile.comboHistory.highestComboScore.toLocaleString()}
                  </div>
                </div>

                <div className="rounded-xl bg-[#0D1530] border border-indigo-500/20 p-4 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Gift className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
                    <span>Milestone Day</span>
                  </div>
                  <div className="font-mono-nums text-2xl font-extrabold text-cyan-300">
                    {milestoneStatus.effectiveCycleDay}{' '}
                    <span className="text-xs font-medium text-slate-400">
                      / 30
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {profile.milestones.pendingBonusPoints > 0
                      ? `+${profile.milestones.pendingBonusPoints} bonus ready`
                      : milestoneStatus.canClaimToday
                        ? 'Reward available'
                        : 'Claimed today'}
                  </div>
                </div>
              </section>

              {/* 7-Day Streak Activity Preview (Mini-Bar Chart + Sparkline) */}
              <section
                aria-label="7-day streak activity"
                className="rounded-xl bg-[#0D1530] border border-indigo-500/25 p-4 sm:p-5 space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <NeonFlame
                      streak={unifiedCurrentStreak}
                      size="sm"
                      reducedMotion={reducedMotion}
                    />
                    <div className="space-y-0.5 min-w-0">
                      <h3 className="font-display text-base font-bold text-white">
                        7-Day Streak Activity
                      </h3>
                      <p className="text-xs text-slate-400">
                        Daily Challenge &amp; Daily Reward consistency
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <div className="font-mono-nums text-slate-300">
                      <strong className="text-cyan-300 font-bold">
                        {sevenDayHistory.completedCount}/7
                      </strong>{' '}
                      Completed
                      <span className="mx-1.5 text-slate-600" aria-hidden="true">
                        ·
                      </span>
                      <strong className="text-purple-300 font-bold">
                        {sevenDayHistory.consistencyPct}%
                      </strong>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('STREAKS')}
                      className="neon-focus text-xs font-semibold text-cyan-300 hover:text-cyan-200 px-2.5 py-1.5 rounded-md border border-cyan-400/35 hover:border-cyan-300/70 transition-colors whitespace-nowrap"
                    >
                      30-Day Calendar
                    </button>
                  </div>
                </div>

                {/* Plot Container: Mini-Bars + Overlaid Trend Sparkline */}
                <div className="rounded-xl bg-[#070C1E] border border-slate-800/90 pt-3 pb-2.5 px-2 sm:px-3 space-y-2">
                  <div className="relative h-24 sm:h-28 w-full">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-1 top-[12%] border-t border-dashed border-cyan-500/15"
                    />
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-1 top-[50%] border-t border-dashed border-slate-700/40"
                    />
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-1 bottom-[12%] border-t border-slate-800"
                    />

                    <svg
                      aria-hidden="true"
                      viewBox="0 0 700 100"
                      preserveAspectRatio="none"
                      className="pointer-events-none absolute inset-0 w-full h-full"
                    >
                      <defs>
                        <linearGradient
                          id="neonStreakAreaGrad"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#22D3EE"
                            stopOpacity="0.22"
                          />
                          <stop
                            offset="100%"
                            stopColor="#6366F1"
                            stopOpacity="0.01"
                          />
                        </linearGradient>
                        <linearGradient
                          id="neonStreakLineGrad"
                          x1="0"
                          y1="0"
                          x2="1"
                          y2="0"
                        >
                          <stop offset="0%" stopColor="#60A5FA" />
                          <stop offset="55%" stopColor="#22D3EE" />
                          <stop offset="100%" stopColor="#A855F7" />
                        </linearGradient>
                      </defs>
                      <polygon
                        points={sparklineGeometry.areaPoints}
                        fill="url(#neonStreakAreaGrad)"
                      />
                      <polyline
                        points={sparklineGeometry.linePoints}
                        fill="none"
                        stroke="url(#neonStreakLineGrad)"
                        strokeWidth="2.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                      />
                    </svg>

                    <div className="relative z-10 grid grid-cols-7 h-full w-full">
                      {sevenDayHistory.days.map((day, idx) => {
                        const isSelected = idx === selectedStreakDayIdx;
                        const isCompleted = day.status === 'COMPLETED';
                        const barHeightPct = isCompleted
                          ? 76
                          : day.progressPct > 0
                            ? Math.max(10, day.progressPct * 0.76)
                            : 0;
                        const dotBottomPct = 12 + day.progressPct * 0.76;

                        return (
                          <button
                            key={day.dateKey}
                            type="button"
                            onClick={() => setSelectedStreakDayIdx(idx)}
                            onMouseEnter={() => setSelectedStreakDayIdx(idx)}
                            onFocus={() => setSelectedStreakDayIdx(idx)}
                            aria-label={`${day.readableDate}: ${
                              isCompleted
                                ? `Completed via ${describeStreakSource(day.source)}`
                                : day.challengeAttempted
                                  ? `Attempted, ${day.progressPct}% progress`
                                  : day.isToday
                                    ? 'Pending today'
                                    : 'Missed'
                            }`}
                            aria-pressed={isSelected}
                            className={`neon-focus group relative h-full w-full rounded-lg transition-colors ${
                              isSelected ? 'bg-cyan-400/[0.06]' : 'hover:bg-white/[0.03]'
                            }`}
                          >
                            <div className="pointer-events-none absolute inset-x-2 sm:inset-x-3.5 bottom-[12%] top-[12%] flex items-end justify-center">
                              {barHeightPct > 0 ? (
                                <div
                                  className={`w-full max-w-[26px] rounded-t-md ${
                                    reducedMotion ? '' : 'transition-all duration-200'
                                  } ${
                                    isCompleted
                                      ? 'bg-gradient-to-t from-blue-600/80 via-cyan-400/85 to-purple-400/90 shadow-[0_0_12px_rgba(34,211,238,0.38)] border-t border-cyan-200/80'
                                      : 'bg-gradient-to-t from-indigo-900/80 to-indigo-400/75 border-t border-indigo-300/60'
                                  }`}
                                  style={{ height: `${(barHeightPct / 76) * 100}%` }}
                                />
                              ) : (
                                <div className="w-full max-w-[26px] h-[4px] rounded-full bg-slate-800/90" />
                              )}
                            </div>

                            <span
                              aria-hidden="true"
                              className={`pointer-events-none absolute left-1/2 -translate-x-1/2 translate-y-1/2 rounded-full border ${
                                reducedMotion ? '' : 'transition-transform duration-150'
                              } ${
                                isSelected ? 'scale-125' : ''
                              } ${
                                isCompleted
                                  ? 'w-2.5 h-2.5 bg-cyan-300 border-white shadow-[0_0_8px_rgba(34,211,238,0.9)]'
                                  : day.challengeAttempted
                                    ? 'w-2 h-2 bg-indigo-400 border-indigo-200'
                                    : 'w-2 h-2 bg-slate-700 border-slate-500'
                              }`}
                              style={{ bottom: `${dotBottomPct}%` }}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-7 text-center">
                    {sevenDayHistory.days.map((day, idx) => {
                      const isSelected = idx === selectedStreakDayIdx;
                      const isCompleted = day.status === 'COMPLETED';
                      return (
                        <button
                          key={day.dateKey}
                          type="button"
                          onClick={() => setSelectedStreakDayIdx(idx)}
                          className={`neon-focus py-1 rounded-md flex flex-col items-center gap-0.5 transition-colors ${
                            isSelected ? 'bg-[#101A3B]' : 'hover:bg-white/[0.03]'
                          }`}
                        >
                          <span
                            className={`text-[11px] leading-none ${
                              day.isToday
                                ? 'text-cyan-300 font-bold'
                                : isSelected
                                  ? 'text-slate-100 font-semibold'
                                  : 'text-slate-400'
                            }`}
                          >
                            {day.isToday ? 'Today' : day.dayShort}
                          </span>
                          <span className="font-mono-nums text-[10px] text-slate-500 leading-none">
                            {day.dayNum}
                          </span>
                          <span
                            aria-hidden="true"
                            className={`text-[10px] leading-none font-bold ${
                              isCompleted
                                ? 'text-cyan-300'
                                : day.challengeAttempted
                                  ? 'text-indigo-400'
                                  : 'text-slate-700'
                            }`}
                          >
                            {isCompleted ? '✓' : day.challengeAttempted ? '•' : '—'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="text-slate-300 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="font-semibold text-white">
                      {inspectedStreakDay.readableDate}
                    </span>
                    <span className="text-slate-600" aria-hidden="true">
                      ·
                    </span>
                    {inspectedStreakDay.status === 'COMPLETED' ? (
                      <span className="text-cyan-300 font-semibold">
                        Completed · {describeStreakSource(inspectedStreakDay.source)}
                      </span>
                    ) : inspectedStreakDay.challengeAttempted ? (
                      <span className="text-indigo-300 font-mono-nums">
                        {inspectedStreakDay.progressPct}% daily challenge goal
                      </span>
                    ) : inspectedStreakDay.isToday ? (
                      <span className="text-slate-300">Pending today</span>
                    ) : (
                      <span className="text-slate-500">Missed</span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2 h-2 rounded-sm bg-cyan-400 inline-block" />
                      Completed
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2 h-2 rounded-sm bg-indigo-400 inline-block" />
                      Attempted
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2 h-2 rounded-sm bg-slate-700 inline-block" />
                      Missed
                    </span>
                  </div>
                </div>
              </section>

              {/* Milestone Preview & Recent Rewards Split */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* 30-Day Milestone Quick Card */}
                <section className="rounded-xl bg-[#0D1530] border border-indigo-500/20 p-4 sm:p-5 flex flex-col justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-display text-base font-bold text-white">
                        30-Day Reward Milestones
                      </h3>
                      <button
                        type="button"
                        onClick={() => setActiveTab('MILESTONES')}
                        className="neon-focus text-xs font-medium text-cyan-300 hover:text-cyan-200 px-2 py-1 rounded-md"
                      >
                        View All
                      </button>
                    </div>

                    <div className="w-full h-2.5 rounded-full bg-[#060A18] overflow-hidden border border-slate-800">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 transition-all duration-200"
                        style={{ width: `${milestoneProgressPct}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-6 gap-1.5 text-center text-[11px] font-mono-nums">
                      {DAILY_MILESTONES.map((ms) => {
                        const done = profile.milestones.claimedMilestoneDays.includes(
                          ms.day
                        );
                        return (
                          <div
                            key={ms.day}
                            className={`py-1.5 rounded-lg border ${
                              done
                                ? 'bg-cyan-950/50 border-cyan-400/50 text-cyan-200 font-bold'
                                : 'bg-[#070C1E] border-slate-800 text-slate-400'
                            }`}
                          >
                            D{ms.day}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
                    <div className="text-xs text-slate-400">
                      {milestoneStatus.nextMilestone
                        ? `Next: Day ${milestoneStatus.nextMilestone.day} · ${milestoneStatus.nextMilestone.title}`
                        : '30-Day cycle complete'}
                    </div>
                    <button
                      type="button"
                      disabled={!milestoneStatus.canClaimToday}
                      onClick={handleClaimClick}
                      className="neon-focus min-h-[40px] px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 text-xs font-semibold text-white whitespace-nowrap shrink-0"
                    >
                      {milestoneStatus.canClaimToday
                        ? `Claim Day ${milestoneStatus.nextClaimDay}`
                        : 'Claimed Today'}
                    </button>
                  </div>
                </section>

                {/* Recently Unlocked Rewards */}
                <section className="rounded-xl bg-[#0D1530] border border-indigo-500/20 p-4 sm:p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-base font-bold text-white">
                      Recently Unlocked Rewards
                    </h3>
                    <span className="text-xs text-slate-400 font-mono-nums">
                      {profile.recentRewards.length} logged
                    </span>
                  </div>

                  {profile.recentRewards.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400 space-y-1">
                      <p>No rewards claimed yet.</p>
                      <p className="text-slate-500">
                        Claim your Day 1 milestone or trigger combos to earn XP and unlocks.
                      </p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-slate-800/70 max-h-48 overflow-y-auto pr-1">
                      {profile.recentRewards.slice(0, 6).map((item) => (
                        <li
                          key={item.id}
                          className="py-2 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-100 truncate">
                              {item.title}
                            </div>
                            <div className="text-slate-400 truncate">
                              {item.detail}
                            </div>
                          </div>
                          <span className="font-mono-nums text-[11px] text-slate-500 shrink-0">
                            {item.dateKey}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            </div>
          )}

          {/* PREMIUM STREAK VISUALIZATION TAB */}
          {activeTab === 'STREAKS' && (
            <div className="space-y-6">
              {/* Hero Flame + Current & Best-Ever Streak */}
              <section className="rounded-xl bg-[#0D1530] border border-cyan-400/30 p-5 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                  <div className="flex items-center gap-4 sm:gap-5">
                    <NeonFlame
                      streak={unifiedCurrentStreak}
                      size="lg"
                      reducedMotion={reducedMotion}
                    />

                    <div className="space-y-1">
                      <div className="text-xs text-slate-400 flex flex-wrap items-center gap-2">
                        <span className="text-cyan-300 font-semibold">
                          {getFlameTierLabel(unifiedCurrentStreak)}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{formatReadableDate(todayKey)}</span>
                        {isNewRecordToday && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-purple-300 font-bold">
                              New Personal Record
                            </span>
                          </>
                        )}
                      </div>

                      <div className="flex items-baseline gap-3 flex-wrap">
                        <div className="font-mono-nums text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
                          {unifiedCurrentStreak}
                        </div>
                        <span className="font-display text-lg font-bold text-cyan-200">
                          {unifiedCurrentStreak === 1 ? 'Day Streak' : 'Day Streak'}
                        </span>
                      </div>

                      <div className="text-xs text-slate-400">
                        {todayQualified ? (
                          <span className="inline-flex items-center gap-1.5 text-cyan-300 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            Today secured · {describeStreakSource(sevenDayHistory.days[6]?.source)}
                          </span>
                        ) : (
                          <span>
                            Complete today&apos;s Daily Challenge or claim your Daily Reward to extend your streak.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Best-Ever Record + Quick Actions */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-800/80 shrink-0">
                    <div className="sm:text-right">
                      <div className="text-xs text-slate-400 flex items-center sm:justify-end gap-1.5">
                        <Trophy className="w-3.5 h-3.5 text-purple-300 shrink-0" />
                        <span>Best-Ever Streak</span>
                      </div>
                      <div className="font-mono-nums text-2xl sm:text-3xl font-extrabold text-purple-300">
                        {unifiedBestStreak}{' '}
                        <span className="text-xs font-medium text-slate-400">
                          {unifiedBestStreak === 1 ? 'day' : 'days'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {milestoneStatus.canClaimToday && (
                        <button
                          type="button"
                          onClick={handleClaimClick}
                          className="neon-focus min-h-[44px] px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 hover:from-cyan-400 hover:via-blue-400 hover:to-purple-400 text-xs sm:text-sm font-display font-bold text-white shadow-[0_0_20px_rgba(34,211,238,0.35)] whitespace-nowrap"
                        >
                          Claim Reward
                        </button>
                      )}
                      {!sevenDayHistory.days[6]?.challengeCompleted && (
                        <button
                          type="button"
                          onClick={onOpenDailyChallenge}
                          className="neon-focus min-h-[44px] px-4 py-2 rounded-xl bg-[#111C42] border border-cyan-400/40 hover:border-cyan-300/80 text-xs sm:text-sm font-semibold text-cyan-100 whitespace-nowrap"
                        >
                          Play Daily
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {/* Streak Milestones (3, 7, 14, 30 Consecutive Days) */}
              <section className="space-y-3">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-display text-base font-bold text-white">
                    Consecutive Streak Milestones
                  </h3>
                  <span className="text-xs text-slate-400 font-mono-nums">
                    {streakMilestones.filter((m) => m.reachedEver).length} / 4 Achieved
                  </span>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {streakMilestones.map((tier) => (
                    <div
                      key={tier.days}
                      className={`rounded-xl border p-4 space-y-2.5 transition-colors ${
                        tier.reachedCurrent
                          ? 'bg-gradient-to-b from-cyan-950/45 to-[#0D1530] border-cyan-400/55 shadow-[0_0_20px_rgba(34,211,238,0.12)]'
                          : tier.reachedEver
                            ? 'bg-[#0D1530] border-purple-400/35'
                            : 'bg-[#0A1024] border-slate-800/90'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono-nums text-lg font-extrabold text-white">
                          {tier.days}d
                        </span>
                        {tier.reachedCurrent ? (
                          <CheckCircle2 className="w-4 h-4 text-cyan-300 shrink-0" />
                        ) : tier.reachedEver ? (
                          <Trophy className="w-4 h-4 text-purple-300 shrink-0" />
                        ) : (
                          <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        )}
                      </div>

                      <div>
                        <div className="font-display text-sm font-bold text-white">
                          {tier.label}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {tier.subtitle}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="w-full h-1.5 rounded-full bg-[#060A18] overflow-hidden">
                          <div
                            className={`h-full ${
                              tier.reachedCurrent
                                ? 'bg-gradient-to-r from-cyan-400 to-purple-400'
                                : 'bg-blue-500/80'
                            }`}
                            style={{ width: `${tier.progressPct}%` }}
                          />
                        </div>
                        <div className="text-[11px] font-mono-nums flex items-center justify-between">
                          <span
                            className={
                              tier.reachedCurrent
                                ? 'text-cyan-300 font-semibold'
                                : tier.reachedEver
                                  ? 'text-purple-300'
                                  : 'text-slate-400'
                            }
                          >
                            {tier.reachedCurrent
                              ? 'Active'
                              : tier.reachedEver
                                ? `${tier.daysRemaining}d to match`
                                : `${tier.daysRemaining}d left`}
                          </span>
                          <span className="text-slate-500">
                            {tier.progressPct}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* 7-Day Activity Visualization */}
              <section className="rounded-xl bg-[#0D1530] border border-indigo-500/20 p-4 sm:p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-display text-base font-bold text-white">
                      7-Day Activity Window
                    </h3>
                    <p className="text-xs text-slate-400">
                      Recent daily streak activity and goal consistency
                    </p>
                  </div>
                  <div className="font-mono-nums text-xs text-slate-300">
                    <strong className="text-cyan-300">
                      {sevenDayHistory.completedCount}/7
                    </strong>{' '}
                    active days ·{' '}
                    <strong className="text-purple-300">
                      {sevenDayHistory.consistencyPct}%
                    </strong>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {sevenDayHistory.days.map((day, idx) => {
                    const isCompleted = day.status === 'COMPLETED';
                    const isPending = day.status === 'TODAY_PENDING';
                    const isSelected = idx === selectedStreakDayIdx;

                    return (
                      <button
                        key={day.dateKey}
                        type="button"
                        onClick={() => setSelectedStreakDayIdx(idx)}
                        className={`neon-focus min-h-[76px] rounded-xl border p-2 flex flex-col items-center justify-between transition-colors ${
                          isCompleted
                            ? 'bg-gradient-to-b from-cyan-950/60 to-[#0B1430] border-cyan-400/60 text-cyan-200'
                            : isPending
                              ? 'bg-[#101A3B] border-blue-400/60 text-white'
                              : 'bg-[#070C1E] border-slate-800 text-slate-500'
                        } ${isSelected ? 'ring-2 ring-cyan-400/50' : ''}`}
                      >
                        <span className="text-[11px] font-medium">
                          {day.isToday ? 'Today' : day.dayShort}
                        </span>
                        <span className="font-mono-nums text-sm font-bold">
                          {day.dayNum}
                        </span>
                        <span className="text-[11px] font-semibold">
                          {isCompleted ? (
                            <Check className="w-4 h-4 text-cyan-300" />
                          ) : isPending ? (
                            <span className="text-blue-300">Due</span>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="text-xs text-slate-400 flex flex-wrap items-center justify-between gap-2 pt-1">
                  <span>
                    <strong className="text-white">
                      {inspectedStreakDay.readableDate}
                    </strong>{' '}
                    ·{' '}
                    {inspectedStreakDay.status === 'COMPLETED'
                      ? `Completed via ${describeStreakSource(inspectedStreakDay.source)}`
                      : inspectedStreakDay.status === 'TODAY_PENDING'
                        ? 'Today — complete Daily Challenge or claim Daily Reward'
                        : inspectedStreakDay.challengeAttempted
                          ? `Attempted (${inspectedStreakDay.progressPct}% daily goal)`
                          : 'Missed day'}
                  </span>
                  {inspectedStreakDay.bestScore > 0 && (
                    <span className="font-mono-nums text-cyan-300">
                      Best Daily Score: {inspectedStreakDay.bestScore.toLocaleString()}
                    </span>
                  )}
                </div>
              </section>

              {/* 30-Day Activity Calendar (Completed / Missed / Upcoming) */}
              <section className="rounded-xl bg-[#0D1530] border border-indigo-500/25 p-4 sm:p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-cyan-300 shrink-0" />
                    <div>
                      <h3 className="font-display text-base font-bold text-white">
                        30-Day Activity Calendar
                      </h3>
                      <p className="text-xs text-slate-400">
                        Past 22 days, today, and next 7 upcoming days across month and year boundaries
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono-nums text-slate-400">
                    <span>
                      <strong className="text-cyan-300">
                        {thirtyDayCalendar.completedPastOrToday}
                      </strong>{' '}
                      Done
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      <strong className="text-slate-300">
                        {thirtyDayCalendar.missedCount}
                      </strong>{' '}
                      Missed
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      <strong className="text-purple-300">
                        {thirtyDayCalendar.upcomingCount}
                      </strong>{' '}
                      Upcoming
                    </span>
                  </div>
                </div>

                {/* 30-Day Calendar Grid (5 cols on phone, 6 cols on small tablet, 10 cols on landscape tablet/desktop) */}
                <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-10 gap-2">
                  {thirtyDayCalendar.days.map((day, idx) => {
                    const isSelected = idx === selectedCalDayIdx;
                    const isCompleted = day.status === 'COMPLETED';
                    const isPending = day.status === 'TODAY_PENDING';
                    const isUpcoming = day.status === 'UPCOMING';

                    return (
                      <button
                        key={day.dateKey}
                        type="button"
                        onClick={() => setSelectedCalDayIdx(idx)}
                        aria-label={`${day.readableDate}: ${
                          isCompleted
                            ? `Completed via ${describeStreakSource(day.source)}`
                            : isPending
                              ? 'Today pending'
                              : isUpcoming
                                ? day.projectedMilestone
                                  ? `Upcoming, projected ${day.projectedMilestone}-day milestone`
                                  : 'Upcoming day'
                                : 'Missed day'
                        }`}
                        aria-pressed={isSelected}
                        className={`neon-focus relative min-h-[64px] rounded-xl border p-2 flex flex-col justify-between text-left transition-colors ${
                          isCompleted
                            ? 'bg-gradient-to-b from-cyan-950/65 to-[#0B1636] border-cyan-400/60 shadow-[0_0_12px_rgba(34,211,238,0.16)]'
                            : isPending
                              ? 'bg-[#101C42] border-cyan-300/80 shadow-[0_0_14px_rgba(34,211,238,0.22)]'
                              : isUpcoming
                                ? 'bg-[#080E24] border-dashed border-indigo-400/35 hover:border-purple-400/60'
                                : 'bg-[#060A19] border-slate-800/85 hover:border-slate-700'
                        } ${isSelected ? 'ring-2 ring-cyan-300/75' : ''}`}
                      >
                        <div className="flex items-center justify-between gap-1 w-full">
                          <span
                            className={`text-[10px] font-semibold leading-none ${
                              day.isMonthStart
                                ? 'text-purple-300'
                                : day.isToday
                                  ? 'text-cyan-300'
                                  : 'text-slate-500'
                            }`}
                          >
                            {day.isMonthStart
                              ? day.dateKey.endsWith('-01-01')
                                ? `${day.monthShort} ${String(day.year).slice(-2)}`
                                : `${day.monthShort}`
                              : day.isToday
                                ? 'Now'
                                : day.dayShort.slice(0, 2)}
                          </span>
                          {day.projectedMilestone && (
                            <span className="font-mono-nums text-[10px] font-bold text-purple-300 leading-none">
                              {day.projectedMilestone}d
                            </span>
                          )}
                        </div>

                        <div className="flex items-end justify-between w-full">
                          <span
                            className={`font-mono-nums text-sm font-bold leading-none ${
                              isCompleted
                                ? 'text-white'
                                : isPending
                                  ? 'text-cyan-200'
                                  : isUpcoming
                                    ? 'text-indigo-200/80'
                                    : 'text-slate-500'
                            }`}
                          >
                            {day.dayNum}
                          </span>
                          <span
                            aria-hidden="true"
                            className="text-[11px] font-bold leading-none"
                          >
                            {isCompleted ? (
                              <Check className="w-3.5 h-3.5 text-cyan-300" />
                            ) : isPending ? (
                              <span className="text-cyan-300">•</span>
                            ) : isUpcoming ? (
                              <span className="text-indigo-400/70">›</span>
                            ) : (
                              <span className="text-slate-700">—</span>
                            )}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Selected 30-Day Cell Inspector + State Legend */}
                <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="text-slate-300 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="font-semibold text-white">
                      {inspectedCalDay.readableDate}
                    </span>
                    <span className="text-slate-600" aria-hidden="true">
                      ·
                    </span>
                    {inspectedCalDay.status === 'COMPLETED' ? (
                      <span className="text-cyan-300 font-semibold">
                        Completed ({describeStreakSource(inspectedCalDay.source)})
                      </span>
                    ) : inspectedCalDay.status === 'TODAY_PENDING' ? (
                      <span className="text-cyan-200 font-medium">
                        Today · Waiting for Daily Challenge or Daily Reward
                      </span>
                    ) : inspectedCalDay.status === 'UPCOMING' ? (
                      <span className="text-purple-300">
                        Upcoming
                        {inspectedCalDay.projectedMilestone
                          ? ` · Projected ${inspectedCalDay.projectedMilestone}-day milestone`
                          : ''}
                      </span>
                    ) : (
                      <span className="text-slate-500">
                        Missed day
                        {inspectedCalDay.challengeAttempted
                          ? ` (${inspectedCalDay.progressPct}% challenge progress)`
                          : ''}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400 inline-block" />
                      Completed
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-slate-800 border border-slate-600 inline-block" />
                      Missed
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm border border-dashed border-indigo-400 inline-block" />
                      Upcoming
                    </span>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* 30-DAY DAILY REWARD MILESTONES TAB */}
          {activeTab === 'MILESTONES' && (
            <div className="space-y-5">
              {/* Streak & Claim Header */}
              <section className="rounded-xl bg-[#0D1530] border border-cyan-400/25 p-4 sm:p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Flame className="w-4 h-4 text-cyan-300" />
                      <span>
                        Check-In Streak:{' '}
                        <strong className="font-mono-nums text-white">
                          {milestoneStatus.effectiveStreak} days
                        </strong>
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        Longest:{' '}
                        <strong className="font-mono-nums text-purple-300">
                          {profile.milestones.longestRewardStreak} days
                        </strong>
                      </span>
                    </div>
                    <h3 className="font-display text-xl font-extrabold text-white">
                      Day {milestoneStatus.effectiveCycleDay} of 30 Milestone Track
                    </h3>
                    <p className="text-xs text-slate-400">
                      {milestoneStatus.streakBroken
                        ? 'A calendar day was missed — claiming today starts a fresh Day 1 streak while keeping all unlocked themes and effects.'
                        : milestoneStatus.canClaimToday
                          ? `Today (${formatReadableDate(todayKey)}) is ready to claim for Day ${milestoneStatus.nextClaimDay}.`
                          : `Today's reward (${formatReadableDate(todayKey)}) is claimed. Come back tomorrow to advance to Day ${milestoneStatus.nextClaimDay}.`}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={!milestoneStatus.canClaimToday}
                    onClick={handleClaimClick}
                    className="neon-focus min-h-[48px] px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 hover:from-cyan-400 hover:via-blue-400 hover:to-purple-400 disabled:opacity-40 text-sm font-display font-bold text-white shadow-[0_0_24px_rgba(56,189,248,0.4)] transition-transform active:scale-[0.98] whitespace-nowrap shrink-0"
                  >
                    {milestoneStatus.canClaimToday
                      ? `Claim Day ${milestoneStatus.nextClaimDay} Reward`
                      : 'Already Claimed Today'}
                  </button>
                </div>

                {/* 30-Day Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>30-Day Cycle Progress</span>
                    <span className="font-mono-nums text-cyan-300 font-semibold">
                      {milestoneStatus.effectiveCycleDay} / 30 days ({milestoneProgressPct}%)
                    </span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-[#060A18] overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 transition-all duration-200"
                      style={{ width: `${milestoneProgressPct}%` }}
                    />
                  </div>
                  {profile.milestones.pendingBonusPoints > 0 && (
                    <div className="text-xs text-cyan-300 pt-1">
                      Pending Starting Bonus:{' '}
                      <strong className="font-mono-nums">
                        +{profile.milestones.pendingBonusPoints.toLocaleString()} pts
                      </strong>{' '}
                      (automatically applied on your next Classic game)
                    </div>
                  )}
                </div>
              </section>

              {/* 6 Milestone Cards (Days 1, 3, 5, 7, 14, 30) */}
              <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {DAILY_MILESTONES.map((ms) => {
                  const isClaimed =
                    profile.milestones.claimedMilestoneDays.includes(ms.day);
                  const isNextTarget =
                    milestoneStatus.canClaimToday &&
                    milestoneStatus.nextClaimDay === ms.day;
                  const daysRemaining = Math.max(
                    0,
                    ms.day - milestoneStatus.effectiveCycleDay
                  );

                  return (
                    <div
                      key={ms.day}
                      className={`rounded-xl p-4 border flex flex-col justify-between gap-3 transition-colors ${
                        isClaimed
                          ? 'bg-cyan-950/25 border-cyan-400/45'
                          : isNextTarget
                            ? 'bg-[#121D42] border-cyan-300/75 shadow-[0_0_24px_rgba(34,211,238,0.2)]'
                            : 'bg-[#0D1530] border-indigo-500/20'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono-nums font-bold text-cyan-300">
                            Day {ms.day}
                          </span>
                          <span className="text-slate-400">
                            {isClaimed ? (
                              <span className="inline-flex items-center gap-1 text-cyan-300 font-semibold">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Claimed
                              </span>
                            ) : isNextTarget ? (
                              <span className="text-cyan-200 font-semibold">
                                Ready Today
                              </span>
                            ) : (
                              <span>
                                {daysRemaining}{' '}
                                {daysRemaining === 1 ? 'day' : 'days'} left
                              </span>
                            )}
                          </span>
                        </div>

                        <h4 className="font-display text-base font-bold text-white">
                          {ms.title}
                        </h4>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {ms.subtitle}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-800/70 flex items-center justify-between text-[11px] text-slate-400">
                        <span>
                          {ms.kind === 'THEME'
                            ? 'Cosmetic Theme'
                            : ms.kind === 'PARTICLE_FX'
                              ? 'Particle Effect'
                              : ms.kind === 'BUNDLE'
                                ? 'Theme + FX + Bonus'
                                : 'Bonus Points'}
                        </span>
                        <span className="font-mono-nums text-purple-300">
                          +{ms.xpBonus} XP
                        </span>
                      </div>
                    </div>
                  );
                })}
              </section>
            </div>
          )}

          {/* COMBO HISTORY TAB */}
          {activeTab === 'COMBOS' && (
            <div className="space-y-5">
              {/* Combo Personal Records */}
              <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl bg-[#0D1530] border border-indigo-500/25 p-4">
                  <div className="text-xs text-slate-400">
                    Highest Multiplier
                  </div>
                  <div className="font-mono-nums text-2xl font-extrabold text-cyan-300 mt-1">
                    {profile.comboHistory.highestMultiplier > 0
                      ? `×${profile.comboHistory.highestMultiplier}`
                      : '—'}
                  </div>
                </div>
                <div className="rounded-xl bg-[#0D1530] border border-indigo-500/25 p-4">
                  <div className="text-xs text-slate-400">Total Combos</div>
                  <div className="font-mono-nums text-2xl font-extrabold text-white mt-1">
                    {profile.comboHistory.totalCombos.toLocaleString()}
                  </div>
                </div>
                <div className="rounded-xl bg-[#0D1530] border border-indigo-500/25 p-4">
                  <div className="text-xs text-slate-400">
                    Highest Single-Combo Score
                  </div>
                  <div className="font-mono-nums text-2xl font-extrabold text-purple-300 mt-1">
                    {profile.comboHistory.highestComboScore.toLocaleString()}
                  </div>
                </div>
              </section>

              {/* History List Header + Clear Confirmation */}
              <section className="rounded-xl bg-[#0D1530] border border-indigo-500/20 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-display text-base font-bold text-white">
                      Latest 20 Combo Events
                    </h3>
                    <p className="text-xs text-slate-400">
                      Chain merges (×2+), multi-merges, and fusion line clears
                    </p>
                  </div>

                  {profile.comboHistory.totalCombos > 0 && !confirmClear && (
                    <button
                      type="button"
                      onClick={() => setConfirmClear(true)}
                      className="neon-focus min-h-[40px] px-3.5 py-2 rounded-lg bg-[#151D3D] border border-rose-400/30 hover:border-rose-400/70 text-xs font-medium text-rose-200 inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear History</span>
                    </button>
                  )}

                  {confirmClear && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-rose-200">
                        Clear combo history & records?
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          onClearComboHistory();
                          setConfirmClear(false);
                        }}
                        className="neon-focus min-h-[40px] px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white whitespace-nowrap"
                      >
                        Confirm Clear
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmClear(false)}
                        className="neon-focus min-h-[40px] px-3 py-1.5 rounded-lg bg-[#0F1838] border border-slate-700 text-xs font-medium text-slate-200 whitespace-nowrap"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                {profile.comboHistory.events.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-400 space-y-1">
                    <p>No combo events recorded yet.</p>
                    <p className="text-xs text-slate-500">
                      Trigger chain merges or clear multiple lines in a single turn to log combos here.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800/70">
                    {profile.comboHistory.events.map((ev, index) => (
                      <div
                        key={ev.id}
                        className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="font-mono-nums text-xs text-slate-500 w-5 shrink-0">
                            {index + 1}.
                          </span>
                          <div className="min-w-0">
                            <div className="font-display font-bold text-white flex items-center gap-2">
                              <span className="text-cyan-300">{ev.label}</span>
                              <span className="text-xs font-sans font-normal text-slate-400">
                                {ev.mode === 'DAILY' ? 'Daily' : 'Classic'}
                              </span>
                            </div>
                            <div className="text-xs text-slate-400 font-mono-nums">
                              {ev.merges} merges · {ev.linesCleared} lines · Top{' '}
                              {ev.topTile}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-mono-nums font-bold text-white">
                            +{ev.score.toLocaleString()} pts
                          </div>
                          <div className="font-mono-nums text-[11px] text-slate-500">
                            {ev.dateKey} · {formatTimestamp(ev.timestamp, ev.dateKey)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {/* ACHIEVEMENTS & VISUAL THEMES TAB */}
          {activeTab === 'ACHIEVEMENTS' && (
            <div className="space-y-6">
              {/* Unlockable Visual Themes */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4 text-cyan-400" />
                    <h3 className="font-display text-base font-bold text-white">
                      Visual Board Themes
                    </h3>
                  </div>
                  <span className="text-xs text-slate-400 font-mono-nums">
                    {profile.unlockedThemes.length} / {THEME_LIST.length} unlocked
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {THEME_LIST.map((theme) => {
                    const unlocked = profile.unlockedThemes.includes(theme.id);
                    const equipped = profile.selectedTheme === theme.id;
                    return (
                      <div
                        key={theme.id}
                        className={`rounded-xl p-4 border flex flex-col justify-between gap-3 ${
                          equipped
                            ? 'bg-[#121E44] border-cyan-400/70'
                            : unlocked
                              ? 'bg-[#0D1530] border-indigo-500/25'
                              : 'bg-[#0A1024] border-slate-800/80 opacity-80'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-display font-bold text-sm text-white">
                              {theme.name}
                            </span>
                            <div className="flex items-center gap-1">
                              {theme.swatches.map((hex) => (
                                <span
                                  key={hex}
                                  className="w-3.5 h-3.5 rounded-sm border border-white/20"
                                  style={{ backgroundColor: hex }}
                                />
                              ))}
                            </div>
                          </div>
                          <p className="text-xs text-slate-400">
                            {theme.unlockHint}
                          </p>
                        </div>

                        <button
                          type="button"
                          disabled={!unlocked || equipped}
                          onClick={() => onSelectTheme(theme.id)}
                          className={`neon-focus min-h-[40px] w-full px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                            equipped
                              ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/45'
                              : unlocked
                                ? 'bg-[#14204A] hover:bg-[#1A295E] text-white border border-indigo-400/35'
                                : 'bg-[#080D1D] text-slate-500 border border-slate-800 cursor-not-allowed'
                          }`}
                        >
                          {equipped ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Equipped</span>
                            </>
                          ) : unlocked ? (
                            <span>Equip Theme</span>
                          ) : (
                            <>
                              <Lock className="w-3.5 h-3.5" />
                              <span>Locked</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Unlockable Particle Effects */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-300" />
                    <h3 className="font-display text-base font-bold text-white">
                      Particle FX Styles
                    </h3>
                  </div>
                  <span className="text-xs text-slate-400 font-mono-nums">
                    {profile.unlockedParticleStyles.length} /{' '}
                    {PARTICLE_STYLE_LIST.length} unlocked
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {PARTICLE_STYLE_LIST.map((fx) => {
                    const unlocked = profile.unlockedParticleStyles.includes(
                      fx.id
                    );
                    const equipped = profile.selectedParticleStyle === fx.id;
                    return (
                      <div
                        key={fx.id}
                        className={`rounded-xl p-4 border flex flex-col justify-between gap-3 ${
                          equipped
                            ? 'bg-[#121E44] border-cyan-400/70'
                            : unlocked
                              ? 'bg-[#0D1530] border-indigo-500/25'
                              : 'bg-[#0A1024] border-slate-800/80 opacity-80'
                        }`}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-display font-bold text-sm text-white">
                              {fx.name}
                            </span>
                            <div className="flex items-center gap-1">
                              {fx.swatches.map((hex) => (
                                <span
                                  key={hex}
                                  className="w-3 h-3 rounded-sm border border-white/20"
                                  style={{ backgroundColor: hex }}
                                />
                              ))}
                            </div>
                          </div>
                          <p className="text-xs text-slate-400">
                            {fx.description}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {fx.unlockHint}
                          </p>
                        </div>

                        <button
                          type="button"
                          disabled={!unlocked || equipped}
                          onClick={() => onSelectParticleStyle(fx.id)}
                          className={`neon-focus min-h-[40px] w-full px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                            equipped
                              ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/45'
                              : unlocked
                                ? 'bg-[#14204A] hover:bg-[#1A295E] text-white border border-indigo-400/35'
                                : 'bg-[#080D1D] text-slate-500 border border-slate-800 cursor-not-allowed'
                          }`}
                        >
                          {equipped ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Active</span>
                            </>
                          ) : unlocked ? (
                            <span>Equip FX</span>
                          ) : (
                            <>
                              <Lock className="w-3.5 h-3.5" />
                              <span>Locked</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Achievement Collection */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-cyan-300" />
                    <h3 className="font-display text-base font-bold text-white">
                      Achievement Badges
                    </h3>
                  </div>
                  <span className="text-xs text-slate-400 font-mono-nums">
                    {profile.unlockedAchievements.length} / {ACHIEVEMENTS.length}{' '}
                    earned
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {ACHIEVEMENTS.map((ach) => {
                    const unlocked = profile.unlockedAchievements.includes(
                      ach.id
                    );
                    const currentVal = getAchievementMetricValue(
                      profile,
                      Math.max(dailyState.longestStreak, unifiedBestStreak),
                      ach.metric
                    );
                    const pct = Math.min(
                      100,
                      Math.round((currentVal / Math.max(1, ach.target)) * 100)
                    );

                    return (
                      <div
                        key={ach.id}
                        className={`rounded-xl p-4 border space-y-2 ${
                          unlocked
                            ? 'bg-cyan-950/20 border-cyan-400/45'
                            : 'bg-[#0D1530] border-indigo-500/20'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2.5 min-w-0">
                            <Award
                              className={`w-4 h-4 mt-0.5 shrink-0 ${
                                unlocked ? 'text-cyan-300' : 'text-slate-500'
                              }`}
                            />
                            <div className="min-w-0">
                              <div className="font-display font-bold text-sm text-white">
                                {ach.title}
                              </div>
                              <div className="text-xs text-slate-400">
                                {ach.description}
                              </div>
                            </div>
                          </div>
                          <span className="font-mono-nums text-xs text-purple-300 shrink-0">
                            +{ach.xpReward} XP
                          </span>
                        </div>

                        <div className="space-y-1">
                          <div className="w-full h-1.5 rounded-full bg-[#060A18] overflow-hidden">
                            <div
                              className={`h-full transition-all duration-200 ${
                                unlocked
                                  ? 'bg-cyan-400'
                                  : 'bg-indigo-500/70'
                              }`}
                              style={{ width: `${unlocked ? 100 : pct}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[11px] font-mono-nums text-slate-400">
                            <span>
                              {unlocked
                                ? 'Unlocked'
                                : `${Math.min(currentVal, ach.target)} / ${ach.target}`}
                            </span>
                            <span>{unlocked ? '100%' : `${pct}%`}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          )}
        </div>

        {/* Reward Claim Celebration Overlay */}
        {claimCelebration && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Daily Reward Claimed"
            className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-[#050711]/86 animate-[fadeIn_160ms_ease-out]"
          >
            <div
              className={`w-full max-w-sm rounded-2xl bg-[#0B1430] border border-cyan-400/60 shadow-[0_0_65px_rgba(34,211,238,0.32)] p-6 text-center space-y-4 ${
                reducedMotion ? '' : 'animate-[rewardPop_280ms_cubic-bezier(0.16,1,0.3,1)]'
              }`}
            >
              <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/30 to-purple-500/30 border border-cyan-400/60 flex items-center justify-center">
                <Gift className="w-7 h-7 text-cyan-300" />
              </div>

              <div className="space-y-1">
                <div className="text-xs font-mono-nums font-semibold text-cyan-300">
                  Day {claimCelebration.dayNumber} Reward Claimed
                </div>
                <h3 className="font-display text-2xl font-extrabold text-white">
                  {claimCelebration.milestone
                    ? claimCelebration.milestone.title
                    : `Day ${claimCelebration.dayNumber} Check-In`}
                </h3>
              </div>

              <div className="rounded-xl bg-[#070D22] border border-indigo-500/25 p-3.5 space-y-1.5 text-sm">
                {claimCelebration.bonusPointsAwarded > 0 && (
                  <div className="font-mono-nums font-bold text-cyan-300">
                    +{claimCelebration.bonusPointsAwarded.toLocaleString()} Bonus Points
                  </div>
                )}
                {claimCelebration.xpAwarded > 0 && (
                  <div className="font-mono-nums font-semibold text-purple-300">
                    +{claimCelebration.xpAwarded} Player XP
                  </div>
                )}
                {claimCelebration.unlockedTheme && (
                  <div className="text-cyan-200 font-semibold">
                    Unlocked Theme:{' '}
                    {THEME_LIST.find((t) => t.id === claimCelebration.unlockedTheme)
                      ?.name ?? claimCelebration.unlockedTheme}
                  </div>
                )}
                {claimCelebration.unlockedParticle && (
                  <div className="text-purple-200 font-semibold">
                    Unlocked FX:{' '}
                    {PARTICLE_STYLE_LIST.find(
                      (p) => p.id === claimCelebration.unlockedParticle
                    )?.name ?? claimCelebration.unlockedParticle}
                  </div>
                )}
                {claimCelebration.leveledUpTo && (
                  <div className="text-white font-display font-bold pt-1">
                    Level Up! Reached Level {claimCelebration.leveledUpTo}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setClaimCelebration(null)}
                className="neon-focus w-full min-h-[46px] px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 text-white font-display font-bold text-sm"
              >
                Continue
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
