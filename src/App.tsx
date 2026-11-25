import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  Calendar,
  CheckCircle2,
  Flame,
  HelpCircle,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Trophy,
  Volume1,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { AudioSettingsPanel } from './components/AudioSettingsPanel';
import { DailyChallengeScreen } from './components/DailyChallengeScreen';
import { DashboardScreen } from './components/DashboardScreen';
import { NeonCanvas, NeonCanvasHandle } from './components/NeonCanvas';
import { NeonFlame, getFlameTierLabel } from './components/NeonFlame';
import { NeonLogo } from './components/NeonLogo';
import {
  clampSfxVolume,
  loadAudioSettings,
  neonAudio,
  saveAudioSettings,
} from './game/audio';
import { registerAppLifecycleBridge } from './game/capacitorBridge';
import {
  evaluateDailyProgress,
  generateDailyChallenge,
  getEffectiveStreak,
  getLocalDateKey,
  loadDailySaveState,
  loadParticleIntensity,
  recordDailyAttempt,
  saveParticleIntensity,
  updateDailyProgressAndReward,
} from './game/daily';
import { loadBestScore, saveBestScore } from './game/engine';
import {
  INITIAL_NAV_STATE,
  NavigationState,
  enterGameOverView,
  navigateBack,
  navigateToView,
  startGameView,
  togglePauseView,
} from './game/navigation';
import {
  ClaimMilestoneResult,
  claimDailyMilestoneReward,
  clearComboHistory,
  computeLevelFromTotalXp,
  consumePendingBonusPoints,
  getDailyMilestoneStatus,
  getPlayerRankTitle,
  loadPlayerProfile,
  recordDailyChallengeVictoryProgression,
  recordGameCompletionProgression,
  recordTurnProgression,
  savePlayerProfile,
} from './game/progression';
import {
  StreakRecordOutcome,
  computeCurrentStreak,
  loadStreakState,
  recordQualifyingStreakDay,
  saveStreakState,
} from './game/streaks';
import {
  AudioSettingsState,
  DailySaveState,
  DashboardTab,
  GameMode,
  GameStats,
  ParticleIntensity,
  ParticleStyleId,
  PlayerProfileState,
  StreakSaveState,
  ThemeId,
  TurnResolution,
} from './game/types';

export default function App() {
  const canvasHandleRef = useRef<NeonCanvasHandle>(null);
  const hudFirstBtnRef = useRef<HTMLButtonElement>(null);
  const hudButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const startBtnRef = useRef<HTMLButtonElement>(null);
  const playAgainBtnRef = useRef<HTMLButtonElement>(null);
  const resumeBtnRef = useRef<HTMLButtonElement>(null);
  const closeHelpBtnRef = useRef<HTMLButtonElement>(null);
  const closeAudioBtnRef = useRef<HTMLButtonElement>(null);
  const closeStreakBtnRef = useRef<HTMLButtonElement>(null);

  const [navState, setNavState] = useState<NavigationState>(INITIAL_NAV_STATE);
  const status = navState.status;
  const navStateRef = useRef<NavigationState>(navState);
  navStateRef.current = navState;
  const [dashboardTab, setDashboardTab] = useState<DashboardTab>('OVERVIEW');
  const [gameMode, setGameMode] = useState<GameMode>('CLASSIC');
  const [showHelp, setShowHelp] = useState(false);
  const [showAudioSettings, setShowAudioSettings] = useState(false);
  const [isAppBackgrounded, setIsAppBackgrounded] = useState(false);
  const [streakCelebration, setStreakCelebration] =
    useState<StreakRecordOutcome | null>(null);
  const showHelpRef = useRef(showHelp);
  showHelpRef.current = showHelp;
  const showAudioSettingsRef = useRef(showAudioSettings);
  showAudioSettingsRef.current = showAudioSettings;
  const streakCelebrationRef = useRef(streakCelebration);
  streakCelebrationRef.current = streakCelebration;

  const [audioSettings, setAudioSettings] = useState<AudioSettingsState>(() => {
    const loaded = loadAudioSettings();
    neonAudio.configure(loaded);
    return loaded;
  });
  const audioSettingsRef = useRef<AudioSettingsState>(audioSettings);
  audioSettingsRef.current = audioSettings;
  const muted = audioSettings.muted;
  const sfxVolume = audioSettings.sfxVolume;

  const [particleIntensity, setParticleIntensity] = useState<ParticleIntensity>(
    () => loadParticleIntensity()
  );

  const [bestScore, setBestScore] = useState<number>(() => loadBestScore());
  const [comboLabel, setComboLabel] = useState<string>('');
  const comboTimerRef = useRef<number | null>(null);

  const [todayKey, setTodayKey] = useState<string>(() => getLocalDateKey());
  const dailyChallenge = useMemo(
    () => generateDailyChallenge(todayKey),
    [todayKey]
  );
  const [dailyState, setDailyState] = useState<DailySaveState>(() =>
    loadDailySaveState()
  );
  const [profile, setProfile] = useState<PlayerProfileState>(() =>
    loadPlayerProfile()
  );
  const [streakState, setStreakState] = useState<StreakSaveState>(() =>
    loadStreakState(dailyState, profile)
  );

  const [toastBanner, setToastBanner] = useState<string>('');
  const toastTimerRef = useRef<number | null>(null);
  const [dailyRunCompleted, setDailyRunCompleted] = useState(false);
  const [dailyRunShards, setDailyRunShards] = useState(0);
  const [lastRunXp, setLastRunXp] = useState(0);

  const dailyStateRef = useRef(dailyState);
  dailyStateRef.current = dailyState;
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const streakStateRef = useRef(streakState);
  streakStateRef.current = streakState;
  const gameModeRef = useRef(gameMode);
  gameModeRef.current = gameMode;
  const dailyChallengeRef = useRef(dailyChallenge);
  dailyChallengeRef.current = dailyChallenge;
  const todayKeyRef = useRef(todayKey);
  todayKeyRef.current = todayKey;

  const [reducedMotion, setReducedMotion] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  const [stats, setStats] = useState<GameStats>(() => ({
    score: 0,
    bestScore: loadBestScore(),
    maxTile: 0,
    mergesCount: 0,
    linesCleared: 0,
    bestCombo: 0,
    turnsPlayed: 0,
    isNewBest: false,
  }));

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Keep local calendar date fresh if session spans midnight
  useEffect(() => {
    const id = window.setInterval(() => {
      const current = getLocalDateKey();
      if (current !== todayKeyRef.current) {
        setTodayKey(current);
      }
    }, 30000);
    return () => window.clearInterval(id);
  }, []);

  const commitProfile = useCallback((next: PlayerProfileState) => {
    profileRef.current = next;
    setProfile(next);
    savePlayerProfile(next);
  }, []);

  const recordStreakQualification = useCallback(
    (dateKey: string, source: 'DAILY_CHALLENGE' | 'DAILY_REWARD') => {
      const outcome = recordQualifyingStreakDay(
        streakStateRef.current,
        dateKey,
        source,
        dateKey
      );
      streakStateRef.current = outcome.state;
      setStreakState(outcome.state);
      saveStreakState(outcome.state);

      if (outcome.isNewRecord) {
        window.setTimeout(() => neonAudio.playStreakRecord(), 160);
        canvasHandleRef.current?.triggerFireworks(7);
        setStreakCelebration(outcome);
      }
      return outcome;
    },
    []
  );

  const showToast = useCallback((msg: string) => {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    setToastBanner(msg);
    toastTimerRef.current = window.setTimeout(() => {
      setToastBanner('');
    }, 3400);
  }, []);

  const handleParticleIntensityChange = useCallback(
    (level: ParticleIntensity) => {
      neonAudio.unlock();
      neonAudio.playSelect();
      setParticleIntensity(level);
      saveParticleIntensity(level);
    },
    []
  );

  const handleStatsChange = useCallback(
    (nextStats: GameStats) => {
      setStats(nextStats);
      if (nextStats.bestScore > bestScore) {
        setBestScore(nextStats.bestScore);
        saveBestScore(nextStats.bestScore);
      }

      if (gameModeRef.current === 'DAILY') {
        const challenge = dailyChallengeRef.current;
        const result = updateDailyProgressAndReward(
          dailyStateRef.current,
          challenge,
          nextStats
        );
        dailyStateRef.current = result.nextState;
        setDailyState(result.nextState);

        if (result.newlyCompleted) {
          setDailyRunCompleted(true);
          setDailyRunShards(result.shardsAwarded);
          neonAudio.playDailyComplete();
          canvasHandleRef.current?.triggerFireworks(6);

          const streakOutcome = recordStreakQualification(
            challenge.dateKey,
            'DAILY_CHALLENGE'
          );

          const progRes = recordDailyChallengeVictoryProgression(
            profileRef.current,
            challenge.title,
            result.shardsAwarded,
            Math.max(result.nextState.longestStreak, streakOutcome.bestStreak),
            todayKeyRef.current
          );
          commitProfile(progRes.profile);
          if (progRes.leveledUpTo) {
            neonAudio.playLevelUp();
          }

          showToast(
            `Daily Complete · +${result.shardsAwarded} Shards · +${progRes.xpAwarded} XP`
          );
        } else {
          const evalRes = evaluateDailyProgress(challenge, nextStats);
          if (evalRes.isComplete) {
            setDailyRunCompleted(true);
          }
        }
      }
    },
    [bestScore, commitProfile, recordStreakQualification, showToast]
  );

  const handleTurnResolved = useCallback(
    (resolution: TurnResolution) => {
      const res = recordTurnProgression(
        profileRef.current,
        resolution,
        gameModeRef.current,
        Math.max(
          dailyStateRef.current.longestStreak,
          streakStateRef.current.bestStreak
        ),
        todayKeyRef.current
      );
      commitProfile(res.profile);

      if (res.leveledUpTo) {
        neonAudio.playLevelUp();
        showToast(
          `Level ${res.leveledUpTo} Reached · ${getPlayerRankTitle(res.leveledUpTo)}`
        );
      } else if (res.newAchievements.length > 0) {
        neonAudio.playRewardClaim();
        showToast(`Achievement Unlocked · ${res.newAchievements[0].title}`);
      }
    },
    [commitProfile, showToast]
  );

  const handleComboEvent = useCallback((label: string) => {
    if (comboTimerRef.current) {
      window.clearTimeout(comboTimerRef.current);
    }
    setComboLabel(label);
    if (label) {
      comboTimerRef.current = window.setTimeout(() => {
        setComboLabel('');
      }, 1500);
    }
  }, []);

  const startClassicGame = useCallback(() => {
    neonAudio.unlock();
    neonAudio.playSelect();
    setShowHelp(false);
    setGameMode('CLASSIC');
    setDailyRunCompleted(false);
    setDailyRunShards(0);
    setLastRunXp(0);
    setToastBanner('');

    const { profile: updatedProfile, bonusPoints } = consumePendingBonusPoints(
      profileRef.current
    );
    if (bonusPoints > 0) {
      commitProfile(updatedProfile);
    }

    setNavState((prev) => startGameView(prev));
    canvasHandleRef.current?.startNewGame({
      startingBonusPoints: bonusPoints,
    });
    window.setTimeout(() => {
      canvasHandleRef.current?.focusBoard();
    }, 30);
  }, [commitProfile]);

  const startDailyGame = useCallback(() => {
    const currentKey = getLocalDateKey();
    if (currentKey !== todayKeyRef.current) {
      setTodayKey(currentKey);
    }
    const freshChallenge = generateDailyChallenge(currentKey);
    neonAudio.unlock();
    neonAudio.playSelect();
    setShowHelp(false);
    setGameMode('DAILY');
    setDailyRunCompleted(false);
    setDailyRunShards(0);
    setLastRunXp(0);
    setToastBanner('');

    const updated = recordDailyAttempt(
      dailyStateRef.current,
      freshChallenge.dateKey
    );
    dailyStateRef.current = updated;
    setDailyState(updated);

    setNavState((prev) => startGameView(prev));
    canvasHandleRef.current?.startNewGame({ dailyChallenge: freshChallenge });
    window.setTimeout(() => {
      canvasHandleRef.current?.focusBoard();
    }, 30);
  }, []);

  const restartCurrentMode = useCallback(() => {
    if (gameModeRef.current === 'DAILY') {
      startDailyGame();
    } else {
      startClassicGame();
    }
  }, [startClassicGame, startDailyGame]);

  const openDailyScreen = useCallback(() => {
    const currentKey = getLocalDateKey();
    if (currentKey !== todayKeyRef.current) {
      setTodayKey(currentKey);
    }
    neonAudio.unlock();
    neonAudio.playSelect();
    setShowHelp(false);
    setNavState((prev) => navigateToView(prev, 'DAILY_SCREEN'));
  }, []);

  const openDashboard = useCallback((tab: DashboardTab = 'OVERVIEW') => {
    const currentKey = getLocalDateKey();
    if (currentKey !== todayKeyRef.current) {
      setTodayKey(currentKey);
    }
    neonAudio.unlock();
    neonAudio.playSelect();
    setShowHelp(false);
    setDashboardTab(tab);
    setNavState((prev) => navigateToView(prev, 'DASHBOARD'));
  }, []);

  const goBackToPreviousView = useCallback(() => {
    const current = navStateRef.current;
    const next = navigateBack(current);
    if (next.status === current.status && next.history.length === current.history.length) {
      return;
    }
    neonAudio.unlock();
    neonAudio.playSelect();
    setNavState(next);
    if (next.status === 'PLAYING') {
      window.setTimeout(() => {
        canvasHandleRef.current?.focusBoard();
      }, 30);
    }
  }, []);

  const openHelp = useCallback(() => {
    neonAudio.unlock();
    neonAudio.playSelect();
    setShowHelp(true);
  }, []);

  const closeHelp = useCallback(() => {
    neonAudio.playSelect();
    setShowHelp(false);
    if (navStateRef.current.status === 'PLAYING') {
      window.setTimeout(() => {
        canvasHandleRef.current?.focusBoard();
      }, 30);
    }
  }, []);

  const toggleHelp = useCallback(() => {
    if (showHelp) {
      closeHelp();
    } else {
      openHelp();
    }
  }, [showHelp, openHelp, closeHelp]);

  const openAudioSettings = useCallback(() => {
    neonAudio.unlock();
    neonAudio.playSelect();
    setShowAudioSettings(true);
  }, []);

  const closeAudioSettings = useCallback(() => {
    neonAudio.playSelect();
    setShowAudioSettings(false);
    if (navStateRef.current.status === 'PLAYING' && !showHelp) {
      window.setTimeout(() => {
        canvasHandleRef.current?.focusBoard();
      }, 30);
    }
  }, [showHelp]);

  const closeStreakCelebration = useCallback(() => {
    neonAudio.playSelect();
    setStreakCelebration(null);
    if (
      navStateRef.current.status === 'PLAYING' &&
      !showHelp &&
      !showAudioSettings
    ) {
      window.setTimeout(() => {
        canvasHandleRef.current?.focusBoard();
      }, 30);
    }
  }, [showHelp, showAudioSettings]);

  const handleClaimDailyMilestone = useCallback((): ClaimMilestoneResult => {
    const currentKey = getLocalDateKey();
    if (currentKey !== todayKeyRef.current) {
      setTodayKey(currentKey);
    }
    neonAudio.unlock();
    const res = claimDailyMilestoneReward(
      profileRef.current,
      currentKey,
      Math.max(
        dailyStateRef.current.longestStreak,
        streakStateRef.current.bestStreak
      )
    );
    if (res.claimed) {
      commitProfile(res.profile);
      neonAudio.playRewardClaim();
      if (res.leveledUpTo) {
        window.setTimeout(() => neonAudio.playLevelUp(), 240);
      }
      canvasHandleRef.current?.triggerFireworks(5);
      recordStreakQualification(currentKey, 'DAILY_REWARD');
    }
    return res;
  }, [commitProfile, recordStreakQualification]);

  const handleClearComboHistory = useCallback(() => {
    neonAudio.playSelect();
    const cleared = clearComboHistory(profileRef.current);
    commitProfile(cleared);
    showToast('Combo history cleared');
  }, [commitProfile, showToast]);

  const handleSelectTheme = useCallback(
    (themeId: ThemeId) => {
      if (!profileRef.current.unlockedThemes.includes(themeId)) return;
      neonAudio.unlock();
      neonAudio.playSelect();
      commitProfile({
        ...profileRef.current,
        selectedTheme: themeId,
      });
    },
    [commitProfile]
  );

  const handleSelectParticleStyle = useCallback(
    (styleId: ParticleStyleId) => {
      if (!profileRef.current.unlockedParticleStyles.includes(styleId)) return;
      neonAudio.unlock();
      neonAudio.playSelect();
      commitProfile({
        ...profileRef.current,
        selectedParticleStyle: styleId,
      });
    },
    [commitProfile]
  );

  const handleSfxVolumeChange = useCallback(
    (nextVolume: number, playPreview = false) => {
      const clamped = clampSfxVolume(nextVolume);
      const prev = audioSettingsRef.current;
      const next: AudioSettingsState = {
        ...prev,
        sfxVolume: clamped,
        muted: clamped > 0 ? false : prev.muted,
      };
      audioSettingsRef.current = next;
      setAudioSettings(next);
      neonAudio.configure(next);
      saveAudioSettings(next);
      if (playPreview && !next.muted && next.sfxVolume > 0) {
        neonAudio.unlock();
        neonAudio.playVolumePreview();
      }
    },
    []
  );

  const handlePreviewSound = useCallback(() => {
    const current = audioSettingsRef.current;
    if (current.muted || current.sfxVolume <= 0) return;
    neonAudio.unlock();
    neonAudio.playVolumePreview(true);
  }, []);

  const toggleMute = useCallback(() => {
    const prev = audioSettingsRef.current;
    const next: AudioSettingsState = {
      ...prev,
      muted: !prev.muted,
    };
    audioSettingsRef.current = next;
    setAudioSettings(next);
    neonAudio.configure(next);
    saveAudioSettings(next);
    if (!next.muted && next.sfxVolume > 0) {
      neonAudio.unlock();
      neonAudio.playSelect();
    }
  }, []);

  const pauseGame = useCallback(() => {
    const current = navStateRef.current;
    if (current.status !== 'PLAYING' && current.status !== 'PAUSED') return;
    neonAudio.unlock();
    neonAudio.playSelect();
    const next = togglePauseView(current);
    setNavState(next);
    if (next.status === 'PLAYING') {
      window.setTimeout(() => {
        canvasHandleRef.current?.focusBoard();
      }, 30);
    }
  }, []);

  const handleGameOver = useCallback(
    (finalStats: GameStats) => {
      setStats(finalStats);
      if (finalStats.bestScore > bestScore) {
        setBestScore(finalStats.bestScore);
        saveBestScore(finalStats.bestScore);
      }
      if (finalStats.isNewBest) {
        canvasHandleRef.current?.triggerFireworks(5);
      }

      const progRes = recordGameCompletionProgression(
        profileRef.current,
        finalStats,
        Math.max(
          dailyStateRef.current.longestStreak,
          streakStateRef.current.bestStreak
        ),
        todayKeyRef.current
      );
      commitProfile(progRes.profile);
      setLastRunXp(progRes.xpAwarded);
      if (progRes.leveledUpTo) {
        window.setTimeout(() => neonAudio.playLevelUp(), 260);
      }

      setNavState((prev) => enterGameOverView(prev));
    },
    [bestScore, commitProfile]
  );

  const returnToTitle = useCallback(() => {
    neonAudio.playSelect();
    setShowHelp(false);
    setShowAudioSettings(false);
    setToastBanner('');
    setNavState(INITIAL_NAV_STATE);
  }, []);

  // Auto-focus primary CTA when modal states transition for seamless D-pad/Keyboard UX
  useEffect(() => {
    if (streakCelebration) {
      closeStreakBtnRef.current?.focus();
    } else if (showAudioSettings) {
      closeAudioBtnRef.current?.focus();
    } else if (showHelp) {
      closeHelpBtnRef.current?.focus();
    } else if (status === 'TITLE_MENU') {
      startBtnRef.current?.focus();
    } else if (status === 'PAUSED') {
      resumeBtnRef.current?.focus();
    } else if (status === 'GAME_OVER') {
      playAgainBtnRef.current?.focus();
    }
  }, [status, showHelp, showAudioSettings, streakCelebration]);

  // Global keyboard shortcuts for How to Play ('H'), Escape back-navigation, Pause, Sound & Menus
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const key = e.key;
      const target = e.target as HTMLElement | null;
      const isRangeInput =
        target instanceof HTMLInputElement && target.type === 'range';
      const isTextInput =
        target &&
        ((target.tagName === 'INPUT' && !isRangeInput) ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if (isTextInput) {
        return;
      }

      // Highest-priority modal: New Streak Record Celebration
      if (streakCelebration) {
        if (key === 'Escape' || key === 'GoBack' || key === 'Backspace') {
          e.preventDefault();
          closeStreakCelebration();
        }
        return;
      }

      // Mute toggle available across all views (including when range slider is focused)
      if (key === 'm' || key === 'M') {
        e.preventDefault();
        toggleMute();
        return;
      }

      // Audio Settings Modal overlay
      if (showAudioSettings) {
        if (key === 'Escape' || key === 'GoBack' || key === 'Backspace') {
          e.preventDefault();
          closeAudioSettings();
        } else if (key === 'h' || key === 'H' || key === '?') {
          e.preventDefault();
          setShowAudioSettings(false);
          openHelp();
        }
        return;
      }

      // Dedicated 'H' key trigger to toggle the 'How to Play' help menu modal overlay from any view
      if (key === 'h' || key === 'H' || key === '?') {
        e.preventDefault();
        toggleHelp();
        return;
      }

      // When How to Play modal is open, Escape returns cleanly to the underlying view
      if (showHelp) {
        if (key === 'Escape' || key === 'GoBack' || key === 'Backspace') {
          e.preventDefault();
          closeHelp();
        }
        return;
      }

      // Escape returns to the previous menu state across all views (and pauses active gameplay)
      if (
        key === 'Escape' ||
        key === 'GoBack' ||
        (key === 'Backspace' && status !== 'PLAYING')
      ) {
        if (status !== 'TITLE_MENU') {
          e.preventDefault();
          goBackToPreviousView();
        }
        return;
      }

      // Pause / Resume shortcuts
      if (key === 'p' || key === 'P' || key === 'MediaPlayPause') {
        if (status === 'PLAYING' || status === 'PAUSED') {
          e.preventDefault();
          pauseGame();
        }
        return;
      }

      if (status === 'TITLE_MENU') {
        const activeAction = document.activeElement?.getAttribute('data-action');
        if (
          (key === 'Enter' ||
            key === ' ' ||
            key === 'Select' ||
            key === 'DPadCenter') &&
          activeAction !== 'help' &&
          activeAction !== 'daily' &&
          activeAction !== 'dashboard' &&
          activeAction !== 'audio' &&
          activeAction !== 'streaks'
        ) {
          e.preventDefault();
          startClassicGame();
        }
        return;
      }

      if (status === 'GAME_OVER') {
        const activeAction = document.activeElement?.getAttribute('data-action');
        if (
          (key === 'Enter' ||
            key === ' ' ||
            key === 'Select' ||
            key === 'DPadCenter') &&
          activeAction !== 'menu' &&
          activeAction !== 'daily' &&
          activeAction !== 'dashboard'
        ) {
          e.preventDefault();
          restartCurrentMode();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    status,
    showHelp,
    showAudioSettings,
    streakCelebration,
    openHelp,
    toggleHelp,
    closeHelp,
    closeAudioSettings,
    closeStreakCelebration,
    goBackToPreviousView,
    startClassicGame,
    restartCurrentMode,
    pauseGame,
    toggleMute,
  ]);

  // Unified Web + Capacitor Android background/foreground lifecycle & hardware Back button
  useEffect(() => {
    return registerAppLifecycleBridge({
      onEnterBackground: () => {
        setIsAppBackgrounded(true);
        neonAudio.suspendForBackground();
        setNavState((prev) =>
          prev.status === 'PLAYING' ? togglePauseView(prev) : prev
        );
      },
      onEnterForeground: () => {
        setIsAppBackgrounded(false);
        neonAudio.markForegroundReturned();
        const current = getLocalDateKey();
        if (current !== todayKeyRef.current) {
          setTodayKey(current);
        }
      },
      onHardwareBackButton: () => {
        if (streakCelebrationRef.current) {
          closeStreakCelebration();
          return true;
        }
        if (showAudioSettingsRef.current) {
          closeAudioSettings();
          return true;
        }
        if (showHelpRef.current) {
          closeHelp();
          return true;
        }
        const subModalEvent = new CustomEvent('neonblock:backbutton', {
          cancelable: true,
        });
        window.dispatchEvent(subModalEvent);
        if (subModalEvent.defaultPrevented) {
          return true;
        }
        if (navStateRef.current.status !== 'TITLE_MENU') {
          goBackToPreviousView();
          return true;
        }
        return false;
      },
    });
  }, [
    closeAudioSettings,
    closeHelp,
    closeStreakCelebration,
    goBackToPreviousView,
  ]);

  // Allow D-pad navigation across HUD buttons and back to Canvas
  const handleHudButtonKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    idx: number
  ) => {
    const key = e.key;
    if (key === 'ArrowDown' || key === 'ArrowRight') {
      e.preventDefault();
      if (idx < hudButtonRefs.current.length - 1) {
        hudButtonRefs.current[idx + 1]?.focus();
      } else if (status === 'PLAYING') {
        canvasHandleRef.current?.focusBoard();
      }
    } else if (key === 'ArrowUp' || key === 'ArrowLeft') {
      e.preventDefault();
      if (idx > 0) {
        hudButtonRefs.current[idx - 1]?.focus();
      } else if (status === 'PLAYING') {
        canvasHandleRef.current?.focusBoard();
      }
    }
  };

  const levelInfo = computeLevelFromTotalXp(profile.xp);
  const milestoneStatus = getDailyMilestoneStatus(profile, todayKey);
  const activeChallengeStreak = getEffectiveStreak(dailyState, todayKey);
  const unifiedCurrentStreak = useMemo(
    () => computeCurrentStreak(streakState.completedDates, todayKey),
    [streakState.completedDates, todayKey]
  );
  const displayStreak = unifiedCurrentStreak;
  const todayRecord = dailyState.records[dailyChallenge.dateKey];
  const dailyEval = evaluateDailyProgress(dailyChallenge, stats);
  const isPlayDisabled =
    status === 'TITLE_MENU' ||
    status === 'DAILY_SCREEN' ||
    status === 'DASHBOARD' ||
    status === 'GAME_OVER';
  const isAnyOverlayOpen =
    showHelp || showAudioSettings || Boolean(streakCelebration);
  const VolumeButtonIcon =
    muted || sfxVolume === 0 ? VolumeX : sfxVolume < 50 ? Volume1 : Volume2;

  return (
    <div className="h-dvh w-screen overflow-hidden bg-[#050711] text-slate-100 flex flex-col md:flex-row">
      {/* Portrait / Narrow Top HUD Bar */}
      <header className="md:hidden shrink-0 px-3 py-2 bg-[#070B1A] border-b border-indigo-500/20 flex items-center justify-between gap-2 z-10">
        <div className="flex items-center gap-2.5 min-w-0">
          <NeonLogo compact />
          <div className="flex items-baseline gap-2.5 text-xs pl-2 border-l border-slate-800">
            <div>
              <span className="text-slate-400 mr-1">Score</span>
              <span className="font-mono-nums font-bold text-sm text-white">
                {stats.score.toLocaleString()}
              </span>
            </div>
            {gameMode === 'DAILY' ? (
              <div>
                <span className="text-purple-300 mr-1">Goal</span>
                <span className="font-mono-nums font-bold text-xs text-cyan-300">
                  {dailyEval.current}/{dailyEval.target}
                </span>
              </div>
            ) : (
              <div>
                <span className="text-slate-400 mr-1">Lv</span>
                <span className="font-mono-nums font-bold text-sm text-cyan-300">
                  {levelInfo.level}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() =>
              openDashboard(
                milestoneStatus.canClaimToday ? 'MILESTONES' : 'OVERVIEW'
              )
            }
            aria-label="Player Dashboard"
            className="neon-focus min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-[#0D142D] border border-cyan-400/35 text-cyan-300 hover:border-cyan-400/70 transition-colors"
          >
            <BarChart3 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={openDailyScreen}
            aria-label="Daily Challenge"
            className="neon-focus min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-[#0D142D] border border-indigo-500/25 text-purple-300 hover:text-cyan-300 hover:border-cyan-400/50 transition-colors"
          >
            <Calendar className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={pauseGame}
            disabled={isPlayDisabled}
            aria-label={status === 'PAUSED' ? 'Resume game' : 'Pause game'}
            className="neon-focus min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-[#0D142D] border border-indigo-500/25 text-slate-200 hover:text-cyan-300 hover:border-cyan-400/50 disabled:opacity-35 transition-colors"
          >
            {status === 'PAUSED' ? (
              <Play className="w-4 h-4" />
            ) : (
              <Pause className="w-4 h-4" />
            )}
          </button>
          <button
            type="button"
            onClick={restartCurrentMode}
            aria-label="Restart game"
            className="neon-focus min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-[#0D142D] border border-indigo-500/25 text-slate-200 hover:text-cyan-300 hover:border-cyan-400/50 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={openAudioSettings}
            aria-label={`Audio settings, sound effects ${muted ? 'muted' : `${sfxVolume} percent`}`}
            className="neon-focus min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-[#0D142D] border border-indigo-500/25 text-slate-200 hover:text-cyan-300 hover:border-cyan-400/50 transition-colors"
          >
            <VolumeButtonIcon
              className={`w-4 h-4 ${
                muted || sfxVolume === 0 ? 'text-slate-400' : 'text-cyan-300'
              }`}
            />
          </button>
        </div>
      </header>

      {/* Landscape Tablet & Desktop Left Control Sidebar */}
      <aside className="hidden md:flex md:w-60 lg:w-68 xl:w-72 shrink-0 flex-col justify-between bg-[#070B1A] border-r border-indigo-500/20 p-4 lg:p-5 z-10 overflow-y-auto">
        <div className="space-y-4">
          <NeonLogo compact />

          {/* Compact Level & XP Bar */}
          <div className="pt-2.5 border-t border-slate-800/80 space-y-1.5">
            <div className="flex items-baseline justify-between text-xs">
              <span className="font-semibold text-cyan-300 font-mono-nums">
                Level {levelInfo.level}
              </span>
              <span className="text-[11px] text-slate-400 font-mono-nums">
                {levelInfo.currentLevelXp}/{levelInfo.nextLevelXp} XP
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 transition-all duration-200"
                style={{ width: `${levelInfo.progressPct}%` }}
              />
            </div>
          </div>

          {/* Primary Score Telemetry */}
          <div className="pt-2.5 border-t border-slate-800/80 space-y-2">
            <div>
              <div className="flex items-center justify-between text-xs font-medium text-slate-400">
                <span>{gameMode === 'DAILY' ? 'Daily Score' : 'Score'}</span>
                <button
                  type="button"
                  onClick={() => openDashboard('STREAKS')}
                  aria-label={`Open Streak Dashboard, current streak ${displayStreak} days`}
                  className="neon-focus inline-flex items-center gap-1 text-cyan-300 hover:text-cyan-200 font-mono-nums rounded px-1 -mr-1 transition-colors"
                >
                  <Flame
                    className={`w-3.5 h-3.5 ${
                      displayStreak > 0 ? 'text-cyan-300' : 'text-slate-500'
                    }`}
                  />
                  <span>{displayStreak}d</span>
                </button>
              </div>
              <div className="font-mono-nums text-3xl lg:text-4xl font-bold text-white tracking-tight">
                {stats.score.toLocaleString()}
              </div>
            </div>

            {gameMode === 'DAILY' && (
              <div className="pt-2 border-t border-slate-800/60 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-purple-300 font-medium">
                    {dailyChallenge.title}
                  </span>
                  <span className="font-mono-nums font-bold text-cyan-300">
                    {dailyEval.current.toLocaleString()} /{' '}
                    {dailyEval.target.toLocaleString()}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 to-purple-500 transition-all duration-150"
                    style={{ width: `${dailyEval.pct}%` }}
                  />
                </div>
                <div className="text-[11px] text-slate-400">
                  {dailyEval.isComplete ? (
                    <span className="inline-flex items-center gap-1 text-cyan-300 font-medium">
                      <CheckCircle2 className="w-3 h-3" />
                      Objective complete
                    </span>
                  ) : (
                    <span>{dailyChallenge.description}</span>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-baseline justify-between pt-2 border-t border-slate-800/60">
              <span className="text-xs font-medium text-slate-400">
                Best Score
              </span>
              <span className="font-mono-nums text-lg font-bold text-cyan-300">
                {bestScore.toLocaleString()}
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <span className="text-xs font-medium text-slate-400">
                Max Tile
              </span>
              <span className="font-mono-nums text-base font-semibold text-purple-300">
                {stats.maxTile > 0 ? stats.maxTile : '—'}
              </span>
            </div>

            <div className="flex items-baseline justify-between text-xs text-slate-400">
              <span>Merges / Lines</span>
              <span className="font-mono-nums text-slate-200">
                {stats.mergesCount} / {stats.linesCleared}
              </span>
            </div>
          </div>

          {/* Ephemeral Event Callout */}
          <div className="h-5 flex items-center">
            {comboLabel && (
              <span className="font-display text-sm font-bold tracking-wider text-cyan-300">
                {comboLabel}
              </span>
            )}
          </div>
        </div>

        {/* Action Controls + Particle Intensity Setting */}
        <div className="space-y-2 pt-3 border-t border-slate-800/80">
          {/* Particle Intensity Selector */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="inline-flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                Particles
              </span>
              {reducedMotion && (
                <span className="text-slate-500">Reduced Motion</span>
              )}
            </div>
            <div
              role="group"
              aria-label="Particle intensity"
              className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-[#0B1228] border border-indigo-500/20"
            >
              {(['LOW', 'MEDIUM', 'HIGH'] as ParticleIntensity[]).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => handleParticleIntensityChange(lvl)}
                  className={`neon-focus min-h-[32px] rounded-md text-[11px] font-semibold transition-colors ${
                    particleIntensity === lvl
                      ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/50'
                      : 'text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  {lvl === 'LOW' ? 'Low' : lvl === 'MEDIUM' ? 'Med' : 'High'}
                </button>
              ))}
            </div>
          </div>

          <button
            ref={(el) => {
              hudFirstBtnRef.current = el;
              hudButtonRefs.current[0] = el;
            }}
            type="button"
            onClick={() =>
              openDashboard(
                milestoneStatus.canClaimToday ? 'MILESTONES' : 'OVERVIEW'
              )
            }
            onKeyDown={(e) => handleHudButtonKeyDown(e, 0)}
            className="neon-focus w-full min-h-[44px] px-3 py-2 rounded-lg bg-[#0D1530] border border-cyan-400/35 hover:border-cyan-300/70 text-sm font-medium text-slate-100 flex items-center justify-between gap-2 transition-colors whitespace-nowrap"
          >
            <span className="inline-flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-cyan-300 shrink-0" />
              <span>Dashboard</span>
            </span>
            <span className="text-xs font-mono-nums text-cyan-300">
              {milestoneStatus.canClaimToday
                ? 'Claim'
                : `Lv ${levelInfo.level}`}
            </span>
          </button>

          <button
            ref={(el) => {
              hudButtonRefs.current[1] = el;
            }}
            type="button"
            onClick={openDailyScreen}
            onKeyDown={(e) => handleHudButtonKeyDown(e, 1)}
            className="neon-focus w-full min-h-[44px] px-3 py-2 rounded-lg bg-[#0D1530] border border-purple-400/30 hover:border-cyan-400/60 text-sm font-medium text-slate-100 flex items-center justify-between gap-2 transition-colors whitespace-nowrap"
          >
            <span className="inline-flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-300 shrink-0" />
              <span>Daily Challenge</span>
            </span>
            <span className="text-xs font-mono-nums text-cyan-300">
              {todayRecord?.completed
                ? 'Done'
                : activeChallengeStreak > 0
                  ? `${activeChallengeStreak}d`
                  : 'Play'}
            </span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              ref={(el) => {
                hudButtonRefs.current[2] = el;
              }}
              type="button"
              onClick={pauseGame}
              onKeyDown={(e) => handleHudButtonKeyDown(e, 2)}
              disabled={isPlayDisabled}
              className="neon-focus min-h-[44px] px-3 py-2 rounded-lg bg-[#0D1530] border border-indigo-500/25 hover:border-cyan-400/50 text-sm font-medium text-slate-100 flex items-center justify-center gap-2 disabled:opacity-35 transition-colors whitespace-nowrap"
            >
              {status === 'PAUSED' ? (
                <>
                  <Play className="w-4 h-4 text-cyan-300 shrink-0" />
                  <span>Resume</span>
                </>
              ) : (
                <>
                  <Pause className="w-4 h-4 text-cyan-300 shrink-0" />
                  <span>Pause</span>
                </>
              )}
            </button>

            <button
              ref={(el) => {
                hudButtonRefs.current[3] = el;
              }}
              type="button"
              onClick={restartCurrentMode}
              onKeyDown={(e) => handleHudButtonKeyDown(e, 3)}
              className="neon-focus min-h-[44px] px-3 py-2 rounded-lg bg-[#0D1530] border border-indigo-500/25 hover:border-cyan-400/50 text-sm font-medium text-slate-100 flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
            >
              <RotateCcw className="w-4 h-4 text-purple-300 shrink-0" />
              <span>Restart</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              ref={(el) => {
                hudButtonRefs.current[4] = el;
              }}
              type="button"
              onClick={openAudioSettings}
              onKeyDown={(e) => handleHudButtonKeyDown(e, 4)}
              aria-label={`Audio settings, sound effects ${muted ? 'muted' : `${sfxVolume} percent`}`}
              className="neon-focus min-h-[44px] px-3 py-2 rounded-lg bg-[#0D1530] border border-indigo-500/25 hover:border-cyan-400/50 text-sm font-medium text-slate-100 flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <VolumeButtonIcon
                className={`w-4 h-4 shrink-0 ${
                  muted || sfxVolume === 0 ? 'text-slate-400' : 'text-cyan-300'
                }`}
              />
              <span className="font-mono-nums text-xs">
                {muted ? 'Muted' : `${sfxVolume}%`}
              </span>
            </button>

            <button
              ref={(el) => {
                hudButtonRefs.current[5] = el;
              }}
              type="button"
              onClick={openHelp}
              onKeyDown={(e) => handleHudButtonKeyDown(e, 5)}
              className="neon-focus min-h-[44px] px-3 py-2 rounded-lg bg-[#0D1530] border border-indigo-500/25 hover:border-cyan-400/50 text-sm font-medium text-slate-100 flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
            >
              <HelpCircle className="w-4 h-4 text-blue-300 shrink-0" />
              <span>Help</span>
            </button>
          </div>

          <p className="text-[11px] leading-relaxed text-slate-400 pt-0.5">
            Arrows + Enter · H Help · Esc Back
          </p>
        </div>
      </aside>

      {/* Main Playfield Stage */}
      <main className="relative flex-1 min-w-0 min-h-0 flex flex-col">
        <NeonCanvas
          ref={canvasHandleRef}
          status={isAnyOverlayOpen && status === 'PLAYING' ? 'PAUSED' : status}
          isBackgrounded={isAppBackgrounded}
          bestScore={bestScore}
          reducedMotion={reducedMotion}
          particleIntensity={particleIntensity}
          themeId={profile.selectedTheme}
          particleStyle={profile.selectedParticleStyle}
          onStatsChange={handleStatsChange}
          onTurnResolved={handleTurnResolved}
          onComboEvent={handleComboEvent}
          onGameOver={handleGameOver}
          onRequestPause={pauseGame}
          onRequestToggleMute={toggleMute}
          onRequestHudFocus={() => hudFirstBtnRef.current?.focus()}
        />

        {/* Non-blocking Progression / Daily Toast Banner */}
        {toastBanner && status === 'PLAYING' && (
          <div className="pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 z-10 px-5 py-2.5 rounded-xl bg-[#09122E]/95 border border-cyan-400/60 shadow-[0_0_28px_rgba(34,211,238,0.4)] animate-[fadeIn_160ms_ease-out]">
            <div className="flex items-center gap-2 text-sm font-display font-bold tracking-wide text-cyan-200 whitespace-nowrap">
              <CheckCircle2 className="w-4 h-4 text-cyan-300 shrink-0" />
              <span>{toastBanner}</span>
            </div>
          </div>
        )}

        {/* TITLE SCREEN OVERLAY */}
        {status === 'TITLE_MENU' && (
          <div className="absolute inset-0 z-20 flex items-center justify-center p-4 bg-[#050711]/75 animate-[fadeIn_160ms_ease-out]">
            <div className="w-full max-w-md rounded-2xl bg-[#091026]/95 border border-cyan-400/30 shadow-[0_0_50px_rgba(34,211,238,0.16)] p-6 sm:p-7 text-center space-y-5">
              <NeonLogo />

              <div className="space-y-1.5 text-sm text-slate-300 leading-relaxed">
                <p>Place polyomino blocks onto the 6×6 neon grid.</p>
                <p className="text-slate-400">
                  Connect 3 or more matching numbers to merge and upgrade tiles,
                  or fill full rows and columns to clear the board.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-slate-400">
                <span>
                  Level{' '}
                  <strong className="font-mono-nums text-cyan-300">
                    {levelInfo.level}
                  </strong>
                </span>
                {bestScore > 0 && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>
                      Best{' '}
                      <strong className="font-mono-nums text-white">
                        {bestScore.toLocaleString()}
                      </strong>
                    </span>
                  </>
                )}
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  data-action="streaks"
                  onClick={() => openDashboard('STREAKS')}
                  className="neon-focus inline-flex items-center gap-1 text-purple-300 hover:text-cyan-200 font-medium rounded px-1 py-0.5 transition-colors"
                >
                  <Flame className="w-3.5 h-3.5 text-cyan-300" />
                  <span className="font-mono-nums font-bold">
                    {displayStreak}d
                  </span>{' '}
                  Streak
                </button>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  data-action="audio"
                  onClick={openAudioSettings}
                  className="neon-focus inline-flex items-center gap-1 text-slate-300 hover:text-cyan-200 font-medium rounded px-1 py-0.5 transition-colors"
                >
                  <VolumeButtonIcon className="w-3.5 h-3.5 text-cyan-300" />
                  <span className="font-mono-nums">
                    {muted ? 'Muted' : `SFX ${sfxVolume}%`}
                  </span>
                </button>
              </div>

              {profile.milestones.pendingBonusPoints > 0 && (
                <div className="text-xs text-cyan-300 font-mono-nums">
                  +{profile.milestones.pendingBonusPoints.toLocaleString()}{' '}
                  Milestone Bonus active on next Classic game
                </div>
              )}

              <div className="flex flex-col gap-2.5 pt-1">
                <button
                  ref={startBtnRef}
                  type="button"
                  onClick={startClassicGame}
                  className="neon-focus w-full min-h-[48px] px-7 py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 hover:from-cyan-400 hover:via-blue-400 hover:to-purple-400 text-white font-display font-bold text-base tracking-wide shadow-[0_0_24px_rgba(56,189,248,0.45)] transition-transform active:scale-[0.98] whitespace-nowrap"
                >
                  Start Game
                </button>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    data-action="daily"
                    onClick={openDailyScreen}
                    className="neon-focus min-h-[46px] px-2 sm:px-3 py-2.5 rounded-xl bg-[#0F1838] border border-purple-400/35 hover:border-cyan-400/60 text-slate-100 font-medium text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
                  >
                    <Calendar className="w-4 h-4 text-purple-300 shrink-0" />
                    <span>Daily</span>
                  </button>
                  <button
                    type="button"
                    data-action="dashboard"
                    onClick={() =>
                      openDashboard(
                        milestoneStatus.canClaimToday ? 'MILESTONES' : 'OVERVIEW'
                      )
                    }
                    className="neon-focus min-h-[46px] px-2 sm:px-3 py-2.5 rounded-xl bg-[#0F1838] border border-cyan-400/40 hover:border-cyan-300/75 text-cyan-100 font-medium text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
                  >
                    <BarChart3 className="w-4 h-4 text-cyan-300 shrink-0" />
                    <span>
                      {milestoneStatus.canClaimToday ? 'Rewards' : 'Dashboard'}
                    </span>
                  </button>
                  <button
                    type="button"
                    data-action="help"
                    onClick={openHelp}
                    className="neon-focus min-h-[46px] px-2 sm:px-3 py-2.5 rounded-xl bg-[#0F1838] border border-indigo-400/30 hover:border-cyan-400/60 text-slate-200 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap"
                  >
                    How to Play
                  </button>
                </div>
              </div>

              <div className="text-xs text-slate-400 pt-0.5">
                Drag or Tap · Arrows + Enter · H Help · Esc Back
              </div>
            </div>
          </div>
        )}

        {/* DEDICATED DAILY CHALLENGE SCREEN */}
        {status === 'DAILY_SCREEN' && (
          <DailyChallengeScreen
            challenge={dailyChallenge}
            dailyState={dailyState}
            onStartDaily={startDailyGame}
            onOpenMilestones={() => openDashboard('MILESTONES')}
            onBack={goBackToPreviousView}
          />
        )}

        {/* DEDICATED PLAYER DASHBOARD SCREEN */}
        {status === 'DASHBOARD' && (
          <DashboardScreen
            profile={profile}
            dailyState={dailyState}
            streakState={streakState}
            todayKey={todayKey}
            initialTab={dashboardTab}
            reducedMotion={reducedMotion}
            sfxVolume={sfxVolume}
            muted={muted}
            isHelpOpen={isAnyOverlayOpen}
            onClaimDailyMilestone={handleClaimDailyMilestone}
            onClearComboHistory={handleClearComboHistory}
            onSelectTheme={handleSelectTheme}
            onSelectParticleStyle={handleSelectParticleStyle}
            onOpenDailyChallenge={openDailyScreen}
            onOpenAudioSettings={openAudioSettings}
            onBack={goBackToPreviousView}
          />
        )}

        {/* PAUSE MODAL */}
        {status === 'PAUSED' && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Game Paused"
            className="absolute inset-0 z-20 flex items-center justify-center p-4 bg-[#050711]/80 animate-[fadeIn_160ms_ease-out]"
          >
            <div className="w-full max-w-sm max-h-[92dvh] overflow-y-auto rounded-2xl bg-[#091026] border border-indigo-400/30 shadow-[0_0_40px_rgba(99,102,241,0.2)] p-5 sm:p-6 space-y-4 text-center">
              <div className="space-y-1">
                <h2 className="font-display text-2xl font-extrabold tracking-wide text-white">
                  Game Paused
                </h2>
                <p className="text-xs text-slate-400 font-mono-nums">
                  {gameMode === 'DAILY' ? 'Daily Challenge · ' : ''}
                  Score {stats.score.toLocaleString()} · Best{' '}
                  {bestScore.toLocaleString()}
                </p>
              </div>

              {/* Sound Effects Volume Control */}
              <div className="rounded-xl bg-[#0B1228] border border-indigo-500/20 p-3">
                <AudioSettingsPanel
                  compact
                  sfxVolume={sfxVolume}
                  muted={muted}
                  onVolumeChange={handleSfxVolumeChange}
                  onToggleMute={toggleMute}
                  onPreviewSound={handlePreviewSound}
                />
              </div>

              {/* Particle Intensity Setting */}
              <div className="space-y-1.5 text-left">
                <div className="text-xs text-slate-400 flex items-center justify-between">
                  <span>Particle Intensity</span>
                  {reducedMotion && (
                    <span className="text-[11px] text-slate-500">
                      Reduced Motion Active
                    </span>
                  )}
                </div>
                <div
                  role="group"
                  aria-label="Particle intensity"
                  className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[#0B1228] border border-indigo-500/20"
                >
                  {(['LOW', 'MEDIUM', 'HIGH'] as ParticleIntensity[]).map(
                    (lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => handleParticleIntensityChange(lvl)}
                        className={`neon-focus min-h-[38px] rounded-lg text-xs font-semibold transition-colors ${
                          particleIntensity === lvl
                            ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/50'
                            : 'text-slate-400 hover:text-slate-200 border border-transparent'
                        }`}
                      >
                        {lvl === 'LOW'
                          ? 'Low'
                          : lvl === 'MEDIUM'
                            ? 'Medium'
                            : 'High'}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  ref={resumeBtnRef}
                  type="button"
                  onClick={pauseGame}
                  className="neon-focus min-h-[46px] px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm transition-colors"
                >
                  Resume Game
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => openDashboard('STREAKS')}
                    className="neon-focus min-h-[44px] px-3 py-2 rounded-xl bg-[#0F1838] border border-cyan-400/30 hover:border-cyan-400/60 text-cyan-100 font-medium text-sm transition-colors whitespace-nowrap"
                  >
                    Dashboard
                  </button>
                  <button
                    type="button"
                    onClick={restartCurrentMode}
                    className="neon-focus min-h-[44px] px-3 py-2 rounded-xl bg-[#0F1838] border border-indigo-400/30 hover:border-cyan-400/60 text-slate-100 font-medium text-sm transition-colors whitespace-nowrap"
                  >
                    Restart
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={openHelp}
                    className="neon-focus min-h-[44px] px-3 py-2 rounded-xl bg-[#0F1838] border border-indigo-400/30 hover:border-cyan-400/60 text-slate-100 font-medium text-sm transition-colors whitespace-nowrap"
                  >
                    How to Play
                  </button>
                  <button
                    type="button"
                    onClick={returnToTitle}
                    className="neon-focus min-h-[44px] px-3 py-2 rounded-xl bg-transparent border border-slate-700/80 hover:border-slate-500 text-slate-300 font-medium text-sm transition-colors whitespace-nowrap"
                  >
                    Main Menu
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* GAME OVER MODAL */}
        {status === 'GAME_OVER' && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Game Over"
            className="absolute inset-0 z-20 flex items-center justify-center p-4 bg-[#050711]/82 animate-[fadeIn_160ms_ease-out]"
          >
            <div className="w-full max-w-md rounded-2xl bg-[#091026] border border-purple-400/35 shadow-[0_0_50px_rgba(168,85,247,0.22)] p-6 sm:p-7 space-y-4 text-center">
              <div className="space-y-1">
                <h2 className="font-display text-3xl font-extrabold tracking-wide text-white">
                  {gameMode === 'DAILY' && dailyRunCompleted
                    ? 'Daily Complete'
                    : 'Game Over'}
                </h2>
                <p className="text-sm text-slate-400">
                  No valid moves remaining
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
                {stats.isNewBest && (
                  <span className="font-semibold tracking-wider text-cyan-300">
                    New Best Score
                  </span>
                )}
                {lastRunXp > 0 && (
                  <span className="font-mono-nums text-purple-300 font-semibold">
                    +{lastRunXp} XP · Level {levelInfo.level}
                  </span>
                )}
              </div>

              {gameMode === 'DAILY' && (
                <div className="rounded-xl bg-[#0D1530] border border-cyan-400/25 px-4 py-2.5 text-xs flex items-center justify-between">
                  <span className="text-slate-300">
                    {dailyRunCompleted
                      ? dailyRunShards > 0
                        ? `Reward Claimed: +${dailyRunShards} Shards`
                        : 'Objective Complete'
                      : `Daily Goal: ${dailyEval.current}/${dailyEval.target}`}
                  </span>
                  <span className="font-mono-nums font-bold text-cyan-300">
                    {displayStreak}d Streak
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 py-3 border-y border-slate-800/80 text-left">
                <div className="px-2">
                  <div className="text-xs text-slate-400">Final Score</div>
                  <div className="font-mono-nums text-2xl font-bold text-white">
                    {stats.score.toLocaleString()}
                  </div>
                </div>
                <div className="px-2">
                  <div className="text-xs text-slate-400">Best Score</div>
                  <div className="font-mono-nums text-2xl font-bold text-cyan-300">
                    {bestScore.toLocaleString()}
                  </div>
                </div>
                <div className="px-2">
                  <div className="text-xs text-slate-400">Max Tile</div>
                  <div className="font-mono-nums text-lg font-semibold text-purple-300">
                    {stats.maxTile > 0 ? stats.maxTile : '—'}
                  </div>
                </div>
                <div className="px-2">
                  <div className="text-xs text-slate-400">Merges / Lines</div>
                  <div className="font-mono-nums text-lg font-semibold text-blue-300">
                    {stats.mergesCount} / {stats.linesCleared}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  ref={playAgainBtnRef}
                  type="button"
                  onClick={restartCurrentMode}
                  className="neon-focus flex-1 min-h-[48px] px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 hover:from-cyan-400 hover:via-blue-400 hover:to-purple-400 text-white font-display font-bold text-base tracking-wide shadow-[0_0_24px_rgba(56,189,248,0.4)] transition-transform active:scale-[0.98] whitespace-nowrap"
                >
                  Play Again
                </button>
                <button
                  type="button"
                  data-action="dashboard"
                  onClick={() => openDashboard('OVERVIEW')}
                  className="neon-focus min-h-[48px] px-4 py-3 rounded-xl bg-[#0F1838] border border-cyan-400/35 hover:border-cyan-300/70 text-cyan-100 font-medium text-sm transition-colors whitespace-nowrap"
                >
                  Dashboard
                </button>
                <button
                  type="button"
                  data-action="menu"
                  onClick={returnToTitle}
                  className="neon-focus min-h-[48px] px-4 py-3 rounded-xl bg-[#0F1838] border border-indigo-400/30 hover:border-cyan-400/60 text-slate-200 font-medium text-sm transition-colors whitespace-nowrap"
                >
                  Menu
                </button>
              </div>
            </div>
          </div>
        )}

        {/* HOW TO PLAY MODAL */}
        {showHelp && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="How to Play"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                closeHelp();
              }
            }}
            className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-[#050711]/86 animate-[fadeIn_160ms_ease-out]"
          >
            <div className="w-full max-w-lg max-h-[90dvh] overflow-y-auto rounded-2xl bg-[#091026] border border-cyan-400/30 shadow-[0_0_45px_rgba(34,211,238,0.18)] p-6 space-y-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-extrabold tracking-wide text-white">
                    How to Play NEON BLOCK
                  </h2>
                  <p className="text-xs text-slate-400">
                    Press H or Esc to close and return
                  </p>
                </div>
                <button
                  ref={closeHelpBtnRef}
                  type="button"
                  onClick={closeHelp}
                  aria-label="Close instructions"
                  className="neon-focus min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-[#0F1838] border border-indigo-400/25 text-slate-200 hover:text-cyan-300 shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 text-sm text-slate-300">
                <div className="space-y-1">
                  <h3 className="font-semibold text-cyan-300">
                    1. Place Polyomino Blocks
                  </h3>
                  <p className="text-slate-400 leading-relaxed">
                    Drag any of the 3 blocks from the tray onto empty spaces on
                    the 6×6 grid, or tap a block then tap the grid. Placing all
                    3 blocks deals a fresh tray.
                  </p>
                </div>

                <div className="space-y-1">
                  <h3 className="font-semibold text-blue-300">
                    2. Connect 3+ Tiles to Merge
                  </h3>
                  <p className="text-slate-400 leading-relaxed">
                    When 3 or more orthogonally connected tiles share the same
                    number, they fuse into one doubled tile (
                    <span className="font-mono-nums text-slate-200">
                      2 → 4 → 8 → 16 → 32...
                    </span>
                    ). Cascading chain merges multiply your score and are logged
                    in your Combo History!
                  </p>
                </div>

                <div className="space-y-1">
                  <h3 className="font-semibold text-purple-300">
                    3. Fill Rows or Columns to Clear
                  </h3>
                  <p className="text-slate-400 leading-relaxed">
                    Complete any full 6-tile row or column to trigger a plasma
                    beam clear, awarding bonus points and freeing space on the
                    board.
                  </p>
                </div>

                <div className="space-y-1">
                  <h3 className="font-semibold text-cyan-200">
                    4. Daily Challenges, 30-Day Rewards & Progression
                  </h3>
                  <p className="text-slate-400 leading-relaxed">
                    Play the daily seeded board, claim 30-Day Milestone rewards
                    (Days 1, 3, 5, 7, 14, and 30), earn Player XP to level up,
                    collect achievement badges, and equip unlocked visual themes
                    and particle effects in the Dashboard.
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800 space-y-1.5">
                  <h3 className="font-semibold text-slate-200">
                    Keyboard & Fire TV D-Pad Controls
                  </h3>
                  <ul className="text-xs text-slate-400 space-y-1 leading-relaxed">
                    <li>
                      <span className="text-slate-200 font-medium">
                        Arrow Keys / D-Pad:
                      </span>{' '}
                      Move cursor across the grid. Move past the board edge into
                      the tray to pick another block.
                    </li>
                    <li>
                      <span className="text-slate-200 font-medium">
                        Enter / Space / Select:
                      </span>{' '}
                      Place active block or select focused tray piece.
                    </li>
                    <li>
                      <span className="text-slate-200 font-medium">
                        1–3 / Tab:
                      </span>{' '}
                      Quickly switch active tray piece.
                    </li>
                    <li>
                      <span className="text-slate-200 font-medium">H / ?:</span>{' '}
                      Open or close this How to Play help menu from any screen.
                    </li>
                    <li>
                      <span className="text-slate-200 font-medium">
                        Esc / Back:
                      </span>{' '}
                      Return to the previous menu state, close overlays, or
                      pause and resume gameplay.
                    </li>
                    <li>
                      <span className="text-slate-200 font-medium">
                        P / M:
                      </span>{' '}
                      Pause game or toggle sound.
                    </li>
                  </ul>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={closeHelp}
                  className="neon-focus min-h-[44px] px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-sm"
                >
                  Got It
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DEDICATED AUDIO SETTINGS PANEL MODAL */}
        {showAudioSettings && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Audio Settings"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                closeAudioSettings();
              }
            }}
            className="absolute inset-0 z-[45] flex items-center justify-center p-4 bg-[#050711]/86 animate-[fadeIn_160ms_ease-out]"
          >
            <div className="w-full max-w-md rounded-2xl bg-[#091026] border border-cyan-400/35 shadow-[0_0_55px_rgba(34,211,238,0.22)] p-6 space-y-5">
              <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                <div>
                  <h2 className="font-display text-xl font-extrabold tracking-wide text-white">
                    Audio Settings
                  </h2>
                  <p className="text-xs text-slate-400">
                    Web Audio SFX master volume · Saved automatically
                  </p>
                </div>
                <button
                  ref={closeAudioBtnRef}
                  type="button"
                  onClick={closeAudioSettings}
                  aria-label="Close audio settings"
                  className="neon-focus min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-[#0F1838] border border-indigo-400/25 hover:border-cyan-400/60 text-slate-200 hover:text-cyan-300 shrink-0 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <AudioSettingsPanel
                sfxVolume={sfxVolume}
                muted={muted}
                onVolumeChange={handleSfxVolumeChange}
                onToggleMute={toggleMute}
                onPreviewSound={handlePreviewSound}
              />

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-3">
                <span className="text-xs text-slate-400">
                  Press M to quick-mute · Esc to close
                </span>
                <button
                  type="button"
                  onClick={closeAudioSettings}
                  className="neon-focus min-h-[44px] px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm whitespace-nowrap"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* NEW PERSONAL STREAK RECORD CELEBRATION MODAL */}
        {streakCelebration && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="New Personal Streak Record"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                closeStreakCelebration();
              }
            }}
            className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-[#050711]/88 animate-[fadeIn_160ms_ease-out]"
          >
            <div
              className={`relative w-full max-w-sm rounded-2xl bg-[#0B1430] border border-cyan-400/65 shadow-[0_0_75px_rgba(34,211,238,0.34)] p-6 text-center space-y-5 overflow-hidden ${
                reducedMotion
                  ? ''
                  : 'animate-[rewardPop_300ms_cubic-bezier(0.16,1,0.3,1)]'
              }`}
            >
              {/* Subtle Neon Burst Backdrop */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-gradient-to-b from-cyan-400/20 via-purple-500/15 to-transparent blur-2xl"
              />

              <div className="relative z-10 flex flex-col items-center gap-2">
                <NeonFlame
                  streak={streakCelebration.currentStreak}
                  size="lg"
                  reducedMotion={reducedMotion}
                />
                <div className="text-xs font-mono-nums font-bold tracking-wider text-cyan-300">
                  New Personal Streak Record
                </div>
                <h2 className="font-display text-3xl font-extrabold text-white">
                  {streakCelebration.currentStreak}{' '}
                  {streakCelebration.currentStreak === 1 ? 'Day' : 'Days'}
                </h2>
                <p className="text-xs text-purple-300 font-semibold">
                  {getFlameTierLabel(streakCelebration.currentStreak)}
                  {streakCelebration.milestoneHit
                    ? ` · ${streakCelebration.milestoneHit}-Day Milestone Reached`
                    : ''}
                </p>
              </div>

              <div className="relative z-10 rounded-xl bg-[#070D22] border border-indigo-500/30 p-3.5 flex items-center justify-around text-xs">
                <div>
                  <div className="text-slate-400">Previous Best</div>
                  <div className="font-mono-nums text-base font-bold text-slate-200 mt-0.5">
                    {streakCelebration.previousBestStreak}d
                  </div>
                </div>
                <div className="h-8 w-px bg-slate-800" aria-hidden="true" />
                <div>
                  <div className="text-slate-400 flex items-center justify-center gap-1">
                    <Trophy className="w-3.5 h-3.5 text-purple-300" />
                    <span>New Best</span>
                  </div>
                  <div className="font-mono-nums text-base font-extrabold text-cyan-300 mt-0.5">
                    {streakCelebration.bestStreak}d
                  </div>
                </div>
              </div>

              <div className="relative z-10 flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setStreakCelebration(null);
                    openDashboard('STREAKS');
                  }}
                  className="neon-focus flex-1 min-h-[46px] px-4 py-2.5 rounded-xl bg-[#0F1838] border border-cyan-400/40 hover:border-cyan-300/75 text-cyan-100 font-semibold text-sm whitespace-nowrap"
                >
                  View Calendar
                </button>
                <button
                  ref={closeStreakBtnRef}
                  type="button"
                  onClick={closeStreakCelebration}
                  className="neon-focus flex-1 min-h-[46px] px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 hover:from-cyan-400 hover:via-blue-400 hover:to-purple-400 text-white font-display font-bold text-sm shadow-[0_0_24px_rgba(34,211,238,0.4)] whitespace-nowrap"
                >
                  Awesome
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
