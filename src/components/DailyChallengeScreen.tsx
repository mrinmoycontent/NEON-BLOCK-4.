import React, { useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Award,
  Calendar,
  CheckCircle2,
  Flame,
  Play,
  Sparkles,
  Target,
} from 'lucide-react';
import {
  formatReadableDate,
  getEffectiveStreak,
  offsetLocalDateKey,
} from '../game/daily';
import { DailyChallengeConfig, DailySaveState } from '../game/types';

interface DailyChallengeScreenProps {
  challenge: DailyChallengeConfig;
  dailyState: DailySaveState;
  onStartDaily: () => void;
  onOpenMilestones?: () => void;
  onBack: () => void;
}

export const DailyChallengeScreen: React.FC<DailyChallengeScreenProps> = ({
  challenge,
  dailyState,
  onStartDaily,
  onOpenMilestones,
  onBack,
}) => {
  const playBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    playBtnRef.current?.focus();
  }, []);

  const todayRecord = dailyState.records[challenge.dateKey];
  const isCompleted = Boolean(todayRecord?.completed);
  const rewardClaimed = Boolean(todayRecord?.rewardClaimed);
  const bestProgress = todayRecord?.bestProgress ?? 0;
  const pct = Math.min(
    100,
    Math.round((bestProgress / Math.max(1, challenge.targetValue)) * 100)
  );
  const activeStreak = getEffectiveStreak(dailyState, challenge.dateKey);

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const key = offsetLocalDateKey(challenge.dateKey, i - 6);
    const [y, m, d] = key.split('-').map((n) => parseInt(n, 10));
    const dt = new Date(y, m - 1, d);
    const dayShort = dt.toLocaleDateString(undefined, { weekday: 'short' });
    const dayNum = dt.getDate();
    const rec = dailyState.records[key];
    return {
      key,
      dayShort,
      dayNum,
      isToday: key === challenge.dateKey,
      completed: Boolean(rec?.completed),
    };
  });

  const difficultyLabel =
    challenge.difficulty === 'EXPERT'
      ? 'Expert'
      : challenge.difficulty === 'HARD'
        ? 'Hard'
        : 'Standard';

  const difficultyAccent =
    challenge.difficulty === 'EXPERT'
      ? 'text-fuchsia-300'
      : challenge.difficulty === 'HARD'
        ? 'text-purple-300'
        : 'text-cyan-300';

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center p-3 sm:p-6 bg-[#050711]/86 animate-[fadeIn_160ms_ease-out]">
      <div className="w-full max-w-2xl max-h-[94dvh] overflow-y-auto rounded-2xl bg-[#091026]/98 border border-cyan-400/30 shadow-[0_0_55px_rgba(34,211,238,0.16)] p-5 sm:p-7 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onBack}
              aria-label="Back to menu"
              className="neon-focus min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-[#0F1838] border border-indigo-400/25 hover:border-cyan-400/60 text-slate-200 hover:text-cyan-300 transition-colors shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h2 className="font-display text-xl sm:text-2xl font-extrabold tracking-wide text-white truncate">
                Daily Challenge
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Calendar className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>{formatReadableDate(challenge.dateKey)}</span>
              </div>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="text-[11px] text-slate-400">Neon Shards</div>
            <div className="font-mono-nums text-lg font-bold text-cyan-300">
              {dailyState.totalShards.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Streak & 7-Day Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center pb-4 border-b border-slate-800/80">
          <div className="sm:col-span-5 flex items-center gap-5">
            <div className="flex items-center gap-2.5">
              <Flame className="w-6 h-6 text-cyan-300 shrink-0" />
              <div>
                <div className="text-[11px] text-slate-400">Daily Streak</div>
                <div className="font-mono-nums text-xl font-extrabold text-white">
                  {activeStreak} {activeStreak === 1 ? 'day' : 'days'}
                </div>
              </div>
            </div>
            <div className="pl-4 border-l border-slate-800">
              <div className="text-[11px] text-slate-400">Best Streak</div>
              <div className="font-mono-nums text-lg font-bold text-purple-300">
                {dailyState.longestStreak}
              </div>
            </div>
          </div>

          <div className="sm:col-span-7 grid grid-cols-7 gap-1.5">
            {last7Days.map((day) => (
              <div
                key={day.key}
                className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-lg border text-center ${
                  day.completed
                    ? 'bg-cyan-950/50 border-cyan-400/50 text-cyan-200'
                    : day.isToday
                      ? 'bg-indigo-950/60 border-indigo-400/60 text-white'
                      : 'bg-[#070C1E] border-slate-800/80 text-slate-500'
                }`}
              >
                <span className="text-[10px] leading-none">{day.dayShort}</span>
                <span className="font-mono-nums text-xs font-bold mt-1 leading-none">
                  {day.dayNum}
                </span>
                <span className="mt-1 h-3 flex items-center justify-center">
                  {day.completed ? (
                    <CheckCircle2 className="w-3 h-3 text-cyan-300" />
                  ) : (
                    <span className="text-[9px] text-slate-500">
                      {day.isToday ? 'Today' : '—'}
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Today's Challenge Details */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <div className="text-xs text-slate-400">
                Difficulty <span className="mx-1.5" aria-hidden="true">·</span>{' '}
                <span className={`font-semibold ${difficultyAccent}`}>
                  {difficultyLabel}
                </span>
                <span className="mx-1.5" aria-hidden="true">·</span>
                <span>{challenge.starterCells.length} starter tiles</span>
              </div>
              <h3 className="font-display text-2xl font-extrabold text-white mt-0.5">
                {challenge.title}
              </h3>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Award className="w-4 h-4 text-purple-300 shrink-0" />
              <span className="text-slate-400">Reward:</span>
              <span className="font-mono-nums font-bold text-cyan-300">
                +{challenge.rewardShards} Shards
              </span>
            </div>
          </div>

          {/* Objective & Progress Bar */}
          <div className="rounded-xl bg-[#0D1530] border border-indigo-500/25 p-4 space-y-2.5">
            <div className="flex items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-2 text-slate-100 font-medium">
                <Target className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>{challenge.description}</span>
              </div>
              <span className="font-mono-nums text-xs font-bold text-cyan-300 shrink-0">
                {bestProgress.toLocaleString()} / {challenge.targetValue.toLocaleString()}
              </span>
            </div>

            <div className="w-full h-2.5 rounded-full bg-[#060A18] overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 transition-all duration-200"
                style={{ width: `${pct}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>
                {isCompleted
                  ? 'Challenge completed today'
                  : `${pct}% best progress today`}
              </span>
              <span>
                {rewardClaimed ? (
                  <span className="inline-flex items-center gap-1 text-cyan-300 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Reward claimed
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-slate-300">
                    <Sparkles className="w-3.5 h-3.5 text-purple-300" />
                    Ready to claim
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
          <p className="text-xs text-slate-400">
            {rewardClaimed
              ? 'Replaying today lets you push your score higher without duplicate rewards.'
              : 'Complete the objective before running out of moves to extend your streak.'}
          </p>

          <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
            {onOpenMilestones && (
              <button
                type="button"
                onClick={onOpenMilestones}
                className="neon-focus min-h-[46px] px-4 py-2.5 rounded-xl bg-[#0F1838] border border-purple-400/35 hover:border-cyan-400/60 text-slate-100 text-sm font-medium transition-colors whitespace-nowrap"
              >
                30-Day Rewards
              </button>
            )}
            <button
              type="button"
              onClick={onBack}
              className="neon-focus min-h-[46px] px-4 py-2.5 rounded-xl bg-[#0F1838] border border-indigo-400/30 hover:border-cyan-400/60 text-slate-200 text-sm font-medium transition-colors whitespace-nowrap"
            >
              Back
            </button>
            <button
              ref={playBtnRef}
              type="button"
              onClick={onStartDaily}
              className="neon-focus flex-1 sm:flex-none min-h-[48px] px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 hover:from-cyan-400 hover:via-blue-400 hover:to-purple-400 text-white font-display font-bold text-sm tracking-wide shadow-[0_0_24px_rgba(56,189,248,0.4)] flex items-center justify-center gap-2 transition-transform active:scale-[0.98] whitespace-nowrap"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{isCompleted ? 'Replay Daily' : 'Play Daily'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
