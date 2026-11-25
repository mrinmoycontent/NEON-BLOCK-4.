export const GRID_SIZE = 6;
export const TRAY_SIZE = 3;

export type GameMode = 'CLASSIC' | 'DAILY';

export type GameStatus =
  | 'TITLE_MENU'
  | 'DAILY_SCREEN'
  | 'DASHBOARD'
  | 'PLAYING'
  | 'PAUSED'
  | 'GAME_OVER';

export type DashboardTab =
  | 'OVERVIEW'
  | 'STREAKS'
  | 'MILESTONES'
  | 'COMBOS'
  | 'ACHIEVEMENTS';

export interface AudioSettingsState {
  version: number;
  sfxVolume: number; // 0..100 integer percentage, default 70
  muted: boolean;
}

export type StreakSource = 'DAILY_CHALLENGE' | 'DAILY_REWARD' | 'BOTH';

export interface StreakSaveState {
  version: number;
  completedDates: string[]; // deduplicated sorted local YYYY-MM-DD dates
  dateSources: Record<string, StreakSource>;
  bestStreak: number;
  lastRecordStreak: number;
  lastRecordDate: string | null;
}

export type CalendarDayStatus =
  | 'COMPLETED'
  | 'MISSED'
  | 'TODAY_PENDING'
  | 'UPCOMING';

export interface StreakCalendarDay {
  dateKey: string;
  dayNum: number;
  dayShort: string;
  monthShort: string;
  year: number;
  isMonthStart: boolean;
  isToday: boolean;
  status: CalendarDayStatus;
  source?: StreakSource;
  challengeCompleted: boolean;
  rewardClaimed: boolean;
  challengeAttempted: boolean;
  progressPct: number;
  bestScore: number;
  challengeTitle: string;
  readableDate: string;
  projectedMilestone?: 3 | 7 | 14 | 30;
}

export interface StreakMilestoneTier {
  days: 3 | 7 | 14 | 30;
  label: string;
  subtitle: string;
  reachedCurrent: boolean;
  reachedEver: boolean;
  progressPct: number;
  daysRemaining: number;
}

export type FocusZone = 'GRID' | 'TRAY';

export type ParticleIntensity = 'LOW' | 'MEDIUM' | 'HIGH';

export type ThemeId =
  | 'NEON_CYBER'
  | 'EMERALD_FLUX'
  | 'SOLAR_PULSE'
  | 'SYNTH_NOVA'
  | 'ASTRAL_GOLD';

export type ParticleStyleId =
  | 'CLASSIC_NEON'
  | 'PRISM_BURST'
  | 'SUPERNOVA_TRAIL';

export type DailyDifficulty = 'STANDARD' | 'HARD' | 'EXPERT';

export type DailyObjectiveType = 'SCORE' | 'MAX_TILE' | 'LINES' | 'MERGES';

export interface DailyChallengeConfig {
  dateKey: string; // Local YYYY-MM-DD
  seed: number;
  title: string;
  difficulty: DailyDifficulty;
  objectiveType: DailyObjectiveType;
  targetValue: number;
  description: string;
  rewardShards: number;
  starterCells: { r: number; c: number; value: number }[];
}

export interface DailyDayRecord {
  dateKey: string;
  completed: boolean;
  rewardClaimed: boolean;
  bestProgress: number;
  bestScore: number;
  attempts: number;
  completedAt?: string;
}

export interface DailySaveState {
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate: string | null;
  totalShards: number;
  records: Record<string, DailyDayRecord>;
}

export interface ComboEvent {
  id: string;
  timestamp: string;
  dateKey: string;
  mode: GameMode;
  multiplier: number;
  score: number;
  merges: number;
  linesCleared: number;
  topTile: number;
  label: string;
}

export interface ComboHistoryState {
  highestMultiplier: number;
  totalCombos: number;
  highestComboScore: number;
  events: ComboEvent[];
}

export type RewardKind = 'BONUS_POINTS' | 'THEME' | 'PARTICLE_FX' | 'BUNDLE';

export interface DailyMilestoneDef {
  day: 1 | 3 | 5 | 7 | 14 | 30;
  title: string;
  subtitle: string;
  kind: RewardKind;
  bonusPoints: number;
  xpBonus: number;
  themeUnlock?: ThemeId;
  particleUnlock?: ParticleStyleId;
}

export interface RecentRewardItem {
  id: string;
  title: string;
  detail: string;
  dateKey: string;
  kind: 'MILESTONE' | 'ACHIEVEMENT' | 'LEVEL' | 'DAILY_CHALLENGE';
}

export interface DailyRewardMilestoneState {
  rewardStreak: number;
  longestRewardStreak: number;
  cycleDay: number; // 0..30 (current day reached in the 30-day cycle)
  cycleCount: number; // number of completed 30-day cycles
  lastClaimDate: string | null;
  claimedMilestoneDays: number[]; // milestone days claimed in current cycle
  pendingBonusPoints: number;
  totalBonusPointsEarned: number;
}

export type AchievementId =
  | 'FIRST_GAME'
  | 'COMBO_STARTER'
  | 'COMBO_MASTER'
  | 'COMBO_COLLECTOR'
  | 'TILE_256'
  | 'TILE_1024'
  | 'LINE_SWEEPER'
  | 'DAILY_CHAMPION'
  | 'STREAK_WEEK'
  | 'LEVEL_FIVE';

export interface AchievementDef {
  id: AchievementId;
  title: string;
  description: string;
  xpReward: number;
  target: number;
  metric:
    | 'gamesCompleted'
    | 'highestMultiplier'
    | 'totalCombos'
    | 'highestTile'
    | 'totalLinesCleared'
    | 'dailyChallengesCompleted'
    | 'bestStreak'
    | 'level';
}

export interface PlayerLifetimeStats {
  gamesCompleted: number;
  totalScoreEarned: number;
  highestTile: number;
  totalMerges: number;
  totalLinesCleared: number;
  dailyChallengesCompleted: number;
}

export interface PlayerProfileState {
  version: number;
  xp: number;
  level: number;
  selectedTheme: ThemeId;
  selectedParticleStyle: ParticleStyleId;
  unlockedThemes: ThemeId[];
  unlockedParticleStyles: ParticleStyleId[];
  unlockedAchievements: AchievementId[];
  milestones: DailyRewardMilestoneState;
  comboHistory: ComboHistoryState;
  lifetime: PlayerLifetimeStats;
  recentRewards: RecentRewardItem[];
}

export interface GridCoord {
  r: number;
  c: number;
}

export interface CellOffset {
  dr: number;
  dc: number;
  value: number;
}

export interface BlockPiece {
  id: string;
  shapeName: string;
  cells: CellOffset[];
  width: number;
  height: number;
}

export interface BoardTile {
  id: number;
  value: number;
  scale: number;
  targetScale: number;
  offsetX: number;
  offsetY: number;
  flash: number;
}

export type GridMatrix = (BoardTile | null)[][];

export interface MergeStep {
  fromCells: GridCoord[];
  targetCell: GridCoord;
  oldValue: number;
  newValue: number;
  comboDepth: number;
  points: number;
}

export interface LineClearStep {
  rows: number[];
  cols: number[];
  clearedCells: { r: number; c: number; value: number }[];
  points: number;
}

export interface PlacementPreview {
  valid: boolean;
  anchorRow: number;
  anchorCol: number;
  targetCells: GridCoord[];
  willMergeCells: GridCoord[];
  willClearRows: number[];
  willClearCols: number[];
}

export interface TurnResolution {
  placedCells: GridCoord[];
  placementPoints: number;
  mergeSteps: MergeStep[];
  lineClearStep: LineClearStep | null;
  totalPointsGained: number;
  maxComboDepth: number;
  newMaxTile: number;
  refilledTray: boolean;
  isGameOver: boolean;
}

export interface GameStats {
  score: number;
  bestScore: number;
  maxTile: number;
  mergesCount: number;
  linesCleared: number;
  bestCombo: number;
  turnsPlayed: number;
  isNewBest: boolean;
}

export type ParticleShape = 'circle' | 'spark' | 'diamond';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  shape: ParticleShape;
  gravity: number;
  drag: number;
}

export interface FireworkRocket {
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetY: number;
  color: string;
  trailTimer: number;
}

export interface ShockwaveRing {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  lineWidth: number;
}

export interface LineBeam {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  life: number;
  maxLife: number;
}

export interface FloatingText {
  x: number;
  y: number;
  vy: number;
  text: string;
  subtext?: string;
  color: string;
  life: number;
  maxLife: number;
  scale: number;
}

export interface MergeGhostTile {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  size: number;
  value: number;
  progress: number;
  duration: number;
}
