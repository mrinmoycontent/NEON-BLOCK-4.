import React, { useEffect, useImperativeHandle, useRef } from 'react';
import { neonAudio } from '../game/audio';
import { createSeededRng } from '../game/daily';
import {
  applyPiecePlacement,
  computePlacementPreview,
  createDailyStarterGrid,
  createEmptyGrid,
  createShowcaseGrid,
  findAllValidPlacements,
  generateTray,
  getMaxTileOnGrid,
} from '../game/engine';
import { getTilePalette } from '../game/palette';
import {
  AmbientMote,
  CanvasLayout,
  CursorVisualState,
  DragVisualState,
  computeCanvasLayout,
  createAmbientMotes,
  getCellRect,
  hitTestTraySlot,
  renderNeonCanvas,
  screenToGridAnchor,
  screenToSingleCell,
} from '../game/renderer';
import { getThemeDefinition } from '../game/themes';
import {
  BlockPiece,
  DailyChallengeConfig,
  FireworkRocket,
  FloatingText,
  GRID_SIZE,
  GameStats,
  GameStatus,
  GridMatrix,
  LineBeam,
  MergeGhostTile,
  Particle,
  ParticleIntensity,
  ParticleShape,
  ParticleStyleId,
  PlacementPreview,
  ShockwaveRing,
  TRAY_SIZE,
  ThemeId,
  TurnResolution,
} from '../game/types';

export interface StartGameOptions {
  dailyChallenge?: DailyChallengeConfig;
  startingBonusPoints?: number;
}

export interface NeonCanvasHandle {
  startNewGame: (options?: StartGameOptions) => void;
  focusBoard: () => void;
  triggerFireworks: (count?: number) => void;
}

interface NeonCanvasProps {
  status: GameStatus;
  bestScore: number;
  reducedMotion: boolean;
  particleIntensity: ParticleIntensity;
  themeId: ThemeId;
  particleStyle: ParticleStyleId;
  onStatsChange: (stats: GameStats) => void;
  onTurnResolved?: (resolution: TurnResolution) => void;
  onComboEvent: (label: string) => void;
  onGameOver: (finalStats: GameStats) => void;
  onRequestPause: () => void;
  onRequestToggleMute: () => void;
  onRequestHudFocus: () => void;
}

interface SimState {
  grid: GridMatrix;
  tray: (BlockPiece | null)[];
  selectedSlot: number;
  stats: GameStats;
  preview: PlacementPreview | null;
  drag: DragVisualState | null;
  pointerDownPos: { x: number; y: number; slot: number; pointerType: string } | null;
  cursor: CursorVisualState;
  particles: Particle[];
  fireworks: FireworkRocket[];
  shockwaves: ShockwaveRing[];
  beams: LineBeam[];
  floatingTexts: FloatingText[];
  mergeGhosts: MergeGhostTile[];
  motes: AmbientMote[];
  shakeTimer: number;
  shakeIntensity: number;
  time: number;
  rng: () => number;
}

export const NeonCanvas = React.forwardRef<NeonCanvasHandle, NeonCanvasProps>(
  (
    {
      status,
      bestScore,
      reducedMotion,
      particleIntensity,
      themeId,
      particleStyle,
      onStatsChange,
      onTurnResolved,
      onComboEvent,
      onGameOver,
      onRequestPause,
      onRequestToggleMute,
      onRequestHudFocus,
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const layoutRef = useRef<CanvasLayout>(computeCanvasLayout(800, 600));

    const statusRef = useRef(status);
    statusRef.current = status;

    const bestScoreRef = useRef(bestScore);
    bestScoreRef.current = bestScore;

    const reducedMotionRef = useRef(reducedMotion);
    reducedMotionRef.current = reducedMotion;

    const intensityRef = useRef<ParticleIntensity>(particleIntensity);
    intensityRef.current = particleIntensity;

    const themeIdRef = useRef<ThemeId>(themeId);
    themeIdRef.current = themeId;

    const particleStyleRef = useRef<ParticleStyleId>(particleStyle);
    particleStyleRef.current = particleStyle;

    const onTurnResolvedRef = useRef(onTurnResolved);
    onTurnResolvedRef.current = onTurnResolved;

    const simRef = useRef<SimState>({
      grid: createShowcaseGrid(),
      tray: [null, null, null],
      selectedSlot: -1,
      stats: {
        score: 0,
        bestScore,
        maxTile: 512,
        mergesCount: 0,
        linesCleared: 0,
        bestCombo: 0,
        turnsPlayed: 0,
        isNewBest: false,
      },
      preview: null,
      drag: null,
      pointerDownPos: null,
      cursor: {
        visible: false,
        zone: 'GRID',
        gridRow: 2,
        gridCol: 2,
        traySlot: 0,
      },
      particles: [],
      fireworks: [],
      shockwaves: [],
      beams: [],
      floatingTexts: [],
      mergeGhosts: [],
      motes: createAmbientMotes(26, 900, 600),
      shakeTimer: 0,
      shakeIntensity: 0,
      time: 0,
      rng: Math.random,
    });

    const selectNextAvailableSlot = (tray: (BlockPiece | null)[], preferred = 0): number => {
      if (tray[preferred]) return preferred;
      for (let i = 0; i < TRAY_SIZE; i++) {
        if (tray[i]) return i;
      }
      return -1;
    };

    const updateCursorPreview = () => {
      const sim = simRef.current;
      if (
        statusRef.current !== 'PLAYING' ||
        !sim.cursor.visible ||
        sim.cursor.zone !== 'GRID' ||
        sim.selectedSlot < 0
      ) {
        if (!sim.drag?.active) {
          sim.preview = null;
        }
        return;
      }
      const piece = sim.tray[sim.selectedSlot];
      if (!piece) {
        sim.preview = null;
        return;
      }
      const clampedR = Math.max(0, Math.min(GRID_SIZE - piece.height, sim.cursor.gridRow));
      const clampedC = Math.max(0, Math.min(GRID_SIZE - piece.width, sim.cursor.gridCol));
      sim.preview = computePlacementPreview(sim.grid, piece, clampedR, clampedC);
    };

    const getIntensityScale = (): number => {
      if (reducedMotionRef.current) return 0;
      switch (intensityRef.current) {
        case 'LOW':
          return 0.42;
        case 'MEDIUM':
          return 0.72;
        case 'HIGH':
        default:
          return 1.0;
      }
    };

    const getMaxParticleBudget = (): number => {
      if (reducedMotionRef.current) return 0;
      switch (intensityRef.current) {
        case 'LOW':
          return 90;
        case 'MEDIUM':
          return 185;
        case 'HIGH':
        default:
          return 360;
      }
    };

    const pushParticle = (p: Particle): void => {
      const budget = getMaxParticleBudget();
      if (budget <= 0) return;
      const particles = simRef.current.particles;
      if (particles.length >= budget) {
        particles.shift();
      }
      particles.push(p);
    };

    const launchFireworks = (count = 4): void => {
      if (reducedMotionRef.current) return;
      const sim = simRef.current;
      const layout = layoutRef.current;
      const colors = ['#22D3EE', '#60A5FA', '#C084FC', '#E879F9', '#67E8F9'];
      const actualCount = Math.max(2, Math.round(count * getIntensityScale()));

      for (let i = 0; i < actualCount; i++) {
        const delayMs = i * 150;
        window.setTimeout(() => {
          const w = layoutRef.current.width;
          const h = layoutRef.current.height;
          const startX = w * (0.18 + Math.random() * 0.64);
          const targetY = h * (0.14 + Math.random() * 0.28);
          sim.fireworks.push({
            x: startX,
            y: h + 12,
            vx: (Math.random() - 0.5) * 65,
            vy: -(480 + Math.random() * 140),
            targetY,
            color: colors[i % colors.length],
            trailTimer: 0,
          });
        }, delayMs);
      }
    };

    const detonateFirework = (fw: FireworkRocket): void => {
      const sim = simRef.current;
      const scale = getIntensityScale();
      if (scale <= 0) return;

      neonAudio.playFireworkBurst();

      const palette = [fw.color, '#E0F2FE', '#A855F7', '#38BDF8'];
      const count = Math.max(14, Math.round(34 * scale));
      const shapes: ParticleShape[] = ['spark', 'diamond', 'circle'];

      sim.shockwaves.push({
        x: fw.x,
        y: fw.y,
        radius: 6,
        maxRadius: 95,
        color: fw.color,
        alpha: 0.85,
        life: 0.36,
        maxLife: 0.36,
        lineWidth: 2.5,
      });

      for (let i = 0; i < count; i++) {
        const ang = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.18;
        const spd = 95 + Math.random() * 210;
        const life = 0.65 + Math.random() * 0.45;
        pushParticle({
          x: fw.x,
          y: fw.y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - 20,
          size: 2.2 + Math.random() * 2.2,
          color: palette[i % palette.length],
          alpha: 1,
          life,
          maxLife: life,
          shape: shapes[i % shapes.length],
          gravity: 165,
          drag: 0.96,
        });
      }
    };

    const startNewGame = (options?: StartGameOptions) => {
      const sim = simRef.current;
      const daily = options?.dailyChallenge;
      const startingBonus = Math.max(0, Math.floor(options?.startingBonusPoints ?? 0));
      const rng = daily ? createSeededRng(daily.seed + 101) : Math.random;
      const freshGrid = daily
        ? createDailyStarterGrid(daily.starterCells)
        : createEmptyGrid();
      const freshTray = generateTray(freshGrid, rng);

      sim.rng = rng;
      sim.grid = freshGrid;
      sim.tray = freshTray;
      sim.selectedSlot = 0;
      sim.preview = null;
      sim.drag = null;
      sim.pointerDownPos = null;
      sim.particles = [];
      sim.fireworks = [];
      sim.shockwaves = [];
      sim.beams = [];
      sim.floatingTexts = [];
      sim.mergeGhosts = [];
      sim.shakeTimer = 0;
      sim.shakeIntensity = 0;
      sim.cursor = {
        visible: false,
        zone: 'GRID',
        gridRow: 2,
        gridCol: 2,
        traySlot: 0,
      };
      sim.stats = {
        score: startingBonus,
        bestScore: Math.max(bestScoreRef.current, startingBonus),
        maxTile: getMaxTileOnGrid(freshGrid),
        mergesCount: 0,
        linesCleared: 0,
        bestCombo: 0,
        turnsPlayed: 0,
        isNewBest: false,
      };

      if (startingBonus > 0) {
        const { boardRect } = layoutRef.current;
        sim.floatingTexts.push({
          x: boardRect.x + boardRect.w / 2,
          y: boardRect.y + boardRect.h * 0.45,
          vy: -32,
          text: `+${startingBonus.toLocaleString()}`,
          subtext: 'MILESTONE BONUS',
          color: '#67E8F9',
          life: 1.35,
          maxLife: 1.35,
          scale: 1.15,
        });
      }

      onStatsChange({ ...sim.stats });
      onComboEvent(startingBonus > 0 ? `BONUS +${startingBonus}` : '');
    };

    useImperativeHandle(ref, () => ({
      startNewGame,
      focusBoard: () => {
        canvasRef.current?.focus();
        const sim = simRef.current;
        sim.cursor.visible = true;
        sim.cursor.zone = 'GRID';
        updateCursorPreview();
      },
      triggerFireworks: (count = 5) => {
        launchFireworks(count);
      },
    }));

    // Keep ambient floating motes responsive to ParticleIntensity and active Theme
    useEffect(() => {
      const targetMotes = reducedMotion
        ? 6
        : particleIntensity === 'LOW'
          ? 10
          : particleIntensity === 'MEDIUM'
            ? 20
            : 34;
      const layout = layoutRef.current;
      simRef.current.motes = createAmbientMotes(
        targetMotes,
        layout.width,
        layout.height,
        themeId
      );
    }, [particleIntensity, reducedMotion, themeId]);

    const spawnVfxForResolution = (res: TurnResolution) => {
      const sim = simRef.current;
      const layout = layoutRef.current;
      const rm = reducedMotionRef.current;
      const pScale = getIntensityScale();
      const activeThemeId = themeIdRef.current;
      const themeDef = getThemeDefinition(activeThemeId);
      const pStyle = particleStyleRef.current;

      // Placement subtle sparks
      if (!rm && pScale > 0) {
        const sparksPerCell = Math.max(2, Math.round(5 * pScale));
        for (const pt of res.placedCells) {
          const rect = getCellRect(layout, pt.r, pt.c);
          const cx = rect.x + rect.w / 2;
          const cy = rect.y + rect.h / 2;
          for (let i = 0; i < sparksPerCell; i++) {
            const ang = (Math.PI * 2 * i) / sparksPerCell + Math.random() * 0.5;
            const spd = 45 + Math.random() * 80;
            pushParticle({
              x: cx,
              y: cy,
              vx: Math.cos(ang) * spd,
              vy: Math.sin(ang) * spd,
              size: 1.8 + Math.random() * 1.4,
              color: themeDef.swatches[0],
              alpha: 0.9,
              life: 0.32,
              maxLife: 0.32,
              shape: pStyle === 'PRISM_BURST' ? 'diamond' : 'spark',
              gravity: 0,
              drag: 0.92,
            });
          }
        }
      }

      // Merge VFX & Colorful Combo Explosions
      const comboColors =
        pStyle === 'PRISM_BURST'
          ? ['#67E8F9', '#E879F9', '#FDE047', '#34D399', '#60A5FA', '#FFFFFF']
          : pStyle === 'SUPERNOVA_TRAIL'
            ? ['#FCD34D', '#22D3EE', '#F0ABFC', '#FFFFFF', '#60A5FA', '#FDE68A']
            : themeDef.comboColors;

      for (const merge of res.mergeSteps) {
        const targetRect = getCellRect(layout, merge.targetCell.r, merge.targetCell.c);
        const tx = targetRect.x + targetRect.w / 2;
        const ty = targetRect.y + targetRect.h / 2;
        const pal = getTilePalette(merge.newValue, activeThemeId);
        const isCombo = merge.comboDepth >= 2;

        if (!rm) {
          for (const fc of merge.fromCells) {
            const fromRect = getCellRect(layout, fc.r, fc.c);
            sim.mergeGhosts.push({
              fromX: fromRect.x,
              fromY: fromRect.y,
              toX: targetRect.x,
              toY: targetRect.y,
              size: targetRect.w,
              value: merge.oldValue,
              progress: 0,
              duration: 0.14,
            });
          }

          sim.shockwaves.push({
            x: tx,
            y: ty,
            radius: targetRect.w * 0.25,
            maxRadius: targetRect.w * (1.3 + merge.comboDepth * 0.25),
            color: pal.border,
            alpha: 0.92,
            life: 0.36,
            maxLife: 0.36,
            lineWidth: isCombo ? 3.5 : 2.5,
          });

          if (isCombo || pStyle === 'SUPERNOVA_TRAIL') {
            sim.shockwaves.push({
              x: tx,
              y: ty,
              radius: targetRect.w * 0.15,
              maxRadius: targetRect.w * (1.85 + merge.comboDepth * 0.35),
              color:
                pStyle === 'SUPERNOVA_TRAIL'
                  ? '#FCD34D'
                  : pStyle === 'PRISM_BURST'
                    ? '#67E8F9'
                    : themeDef.colWave,
              alpha: 0.85,
              life: 0.44,
              maxLife: 0.44,
              lineWidth: 2,
            });
          }

          if (pScale > 0) {
            const baseBurst = isCombo ? 24 + merge.comboDepth * 8 : 14;
            const burstCount = Math.max(5, Math.round(baseBurst * pScale));
            for (let i = 0; i < burstCount; i++) {
              const ang = Math.random() * Math.PI * 2;
              const spd = (isCombo ? 105 : 75) + Math.random() * (isCombo ? 220 : 165);
              const life = 0.44 + Math.random() * 0.28;
              const color =
                isCombo || pStyle !== 'CLASSIC_NEON'
                  ? comboColors[i % comboColors.length]
                  : i % 3 === 0
                    ? '#E0F2FE'
                    : pal.border;
              const shape: ParticleShape =
                pStyle === 'PRISM_BURST'
                  ? i % 3 === 0
                    ? 'spark'
                    : 'diamond'
                  : pStyle === 'SUPERNOVA_TRAIL'
                    ? i % 2 === 0
                      ? 'spark'
                      : 'diamond'
                    : i % 3 === 0
                      ? 'diamond'
                      : i % 2 === 0
                        ? 'spark'
                        : 'circle';

              pushParticle({
                x: tx,
                y: ty,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd,
                size: 2.2 + Math.random() * (isCombo ? 2.8 : 2.1),
                color,
                alpha: 1,
                life,
                maxLife: life,
                shape,
                gravity: isCombo ? 85 : 0,
                drag: 0.93,
              });
            }
          }
        }

        sim.floatingTexts.push({
          x: tx,
          y: ty - 8,
          vy: -44,
          text: `+${merge.points}`,
          subtext: merge.comboDepth > 1 ? `CHAIN ×${merge.comboDepth}` : `MERGE ${merge.newValue}`,
          color: pal.border,
          life: 0.98,
          maxLife: 0.98,
          scale: merge.comboDepth > 1 ? 1.18 : 1,
        });
      }

      // Line Clear VFX (Glowing Shockwaves + Plasma Beams + Sparks)
      if (res.lineClearStep) {
        const { rows, cols, points } = res.lineClearStep;
        const { boardRect, cellSize } = layout;

        for (const r of rows) {
          const first = getCellRect(layout, r, 0);
          sim.beams.push({
            x: boardRect.x + 6,
            y: first.y + cellSize * 0.18,
            w: boardRect.w - 12,
            h: cellSize * 0.64,
            color: themeDef.rowBeam,
            life: 0.38,
            maxLife: 0.38,
          });
          if (!rm) {
            sim.shockwaves.push({
              x: boardRect.x + boardRect.w / 2,
              y: first.y + cellSize / 2,
              radius: cellSize * 0.5,
              maxRadius: boardRect.w * 0.68,
              color: themeDef.rowWave,
              alpha: 0.8,
              life: 0.42,
              maxLife: 0.42,
              lineWidth: 2.5,
            });
          }
        }
        for (const c of cols) {
          const first = getCellRect(layout, 0, c);
          sim.beams.push({
            x: first.x + cellSize * 0.18,
            y: boardRect.y + 6,
            w: cellSize * 0.64,
            h: boardRect.h - 12,
            color: themeDef.colBeam,
            life: 0.38,
            maxLife: 0.38,
          });
          if (!rm) {
            sim.shockwaves.push({
              x: first.x + cellSize / 2,
              y: boardRect.y + boardRect.h / 2,
              radius: cellSize * 0.5,
              maxRadius: boardRect.h * 0.68,
              color: themeDef.colWave,
              alpha: 0.8,
              life: 0.42,
              maxLife: 0.42,
              lineWidth: 2.5,
            });
          }
        }

        if (!rm && pScale > 0) {
          const perCell = Math.max(2, Math.round(7 * pScale));
          for (const cell of res.lineClearStep.clearedCells) {
            const rect = getCellRect(layout, cell.r, cell.c);
            const cx = rect.x + rect.w / 2;
            const cy = rect.y + rect.h / 2;
            const pal = getTilePalette(cell.value, activeThemeId);
            for (let i = 0; i < perCell; i++) {
              const ang = Math.random() * Math.PI * 2;
              const spd = 90 + Math.random() * 195;
              const life = 0.48 + Math.random() * 0.22;
              pushParticle({
                x: cx,
                y: cy,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd,
                size: 2.3 + Math.random() * 2.1,
                color: i % 2 === 0 ? pal.border : themeDef.rowWave,
                alpha: 1,
                life,
                maxLife: life,
                shape: i % 2 === 0 ? 'spark' : 'diamond',
                gravity: 40,
                drag: 0.93,
              });
            }
          }
        }

        const totalLines = rows.length + cols.length;
        sim.floatingTexts.push({
          x: boardRect.x + boardRect.w / 2,
          y: boardRect.y + boardRect.h / 2,
          vy: -38,
          text: `+${points}`,
          subtext: totalLines > 1 ? `MEGA CLEAR ×${totalLines}` : 'LINE CLEAR',
          color: '#67E8F9',
          life: 1.08,
          maxLife: 1.08,
          scale: 1.22,
        });
      }

      // Subtle screen shake for major combos or multi-line clears
      if (!rm && (res.maxComboDepth >= 2 || res.lineClearStep)) {
        sim.shakeTimer = 0.22;
        sim.shakeIntensity = Math.min(
          10,
          3 + res.maxComboDepth * 2.1 + (res.lineClearStep ? 2.5 : 0)
        );
      }
    };

    const executePlacement = (slotIndex: number, anchorRow: number, anchorCol: number): boolean => {
      const sim = simRef.current;
      const piece = sim.tray[slotIndex];
      if (!piece) return false;

      const clampedR = Math.max(0, Math.min(GRID_SIZE - piece.height, anchorRow));
      const clampedC = Math.max(0, Math.min(GRID_SIZE - piece.width, anchorCol));

      const res = applyPiecePlacement(
        sim.grid,
        sim.tray,
        slotIndex,
        clampedR,
        clampedC,
        sim.rng
      );
      if (!res) {
        neonAudio.playInvalid();
        return false;
      }

      neonAudio.playPlace();

      if (res.mergeSteps.length > 0) {
        const lastMerge = res.mergeSteps[res.mergeSteps.length - 1];
        setTimeout(() => {
          neonAudio.playMerge(res.maxComboDepth, lastMerge.newValue);
        }, 55);
      }

      if (res.lineClearStep) {
        const totalLines = res.lineClearStep.rows.length + res.lineClearStep.cols.length;
        setTimeout(() => {
          neonAudio.playLineClear(totalLines);
        }, 85);
      }

      if (res.refilledTray && !res.isGameOver) {
        setTimeout(() => {
          neonAudio.playNewTray();
        }, 150);
      }

      spawnVfxForResolution(res);

      // Update stats & High-Score Fireworks Celebration
      const prevBest = sim.stats.bestScore;
      const newScore = sim.stats.score + res.totalPointsGained;
      const newBestScore = Math.max(prevBest, newScore);
      const brokeRecord = newScore > prevBest && prevBest > 0;

      if (brokeRecord && !sim.stats.isNewBest) {
        neonAudio.playNewBest();
        launchFireworks(5);
        onComboEvent('NEW BEST SCORE');
      }

      sim.stats = {
        score: newScore,
        bestScore: newBestScore,
        maxTile: Math.max(sim.stats.maxTile, getMaxTileOnGrid(sim.grid)),
        mergesCount: sim.stats.mergesCount + res.mergeSteps.length,
        linesCleared:
          sim.stats.linesCleared +
          (res.lineClearStep
            ? res.lineClearStep.rows.length + res.lineClearStep.cols.length
            : 0),
        bestCombo: Math.max(sim.stats.bestCombo, res.maxComboDepth),
        turnsPlayed: sim.stats.turnsPlayed + 1,
        isNewBest: sim.stats.isNewBest || newScore > prevBest,
      };

      if (res.maxComboDepth >= 2) {
        onComboEvent(`CHAIN ×${res.maxComboDepth}`);
      } else if (res.lineClearStep) {
        const lines = res.lineClearStep.rows.length + res.lineClearStep.cols.length;
        onComboEvent(lines > 1 ? `MULTI CLEAR ×${lines}` : 'LINE CLEAR');
      } else if (res.mergeSteps.length > 0) {
        const topVal = Math.max(...res.mergeSteps.map((m) => m.newValue));
        onComboEvent(`MERGED ${topVal}`);
      }

      sim.selectedSlot = selectNextAvailableSlot(sim.tray, slotIndex);
      if (sim.selectedSlot >= 0) {
        sim.cursor.traySlot = sim.selectedSlot;
      }
      sim.preview = null;
      updateCursorPreview();

      onStatsChange({ ...sim.stats });
      onTurnResolvedRef.current?.(res);

      if (res.isGameOver) {
        setTimeout(() => {
          neonAudio.playGameOver();
          onGameOver({ ...sim.stats });
        }, 380);
      }

      return true;
    };

    // Canvas resize & 60fps animation loop
    useEffect(() => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;

      const updateSize = () => {
        const rect = container.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = Math.max(320, Math.floor(rect.width));
        const h = Math.max(260, Math.floor(rect.height));

        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        layoutRef.current = computeCanvasLayout(w, h);
        if (simRef.current.motes.length === 0) {
          simRef.current.motes = createAmbientMotes(26, w, h);
        }
      };

      updateSize();
      const ro = new ResizeObserver(updateSize);
      ro.observe(container);

      let rafId = 0;
      let lastTime = performance.now();

      const tick = (now: number) => {
        const rawDt = (now - lastTime) / 1000;
        lastTime = now;
        const dt = Math.min(rawDt, 0.05);

        const sim = simRef.current;
        const layout = layoutRef.current;
        sim.time += dt;

        // Ambient motes drift
        if (!reducedMotionRef.current) {
          for (const mote of sim.motes) {
            mote.x += mote.vx * dt;
            mote.y += mote.vy * dt;
            if (mote.y < -10) {
              mote.y = layout.height + 10;
              mote.x = Math.random() * layout.width;
            }
            if (mote.x < -10) mote.x = layout.width + 10;
            if (mote.x > layout.width + 10) mote.x = -10;
          }
        }

        // Tile spring scale & flash decay
        const springLerp = 1 - Math.exp(-18 * dt);
        const flashDecay = 1 - Math.exp(-10 * dt);
        for (let r = 0; r < GRID_SIZE; r++) {
          for (let c = 0; c < GRID_SIZE; c++) {
            const tile = sim.grid[r][c];
            if (!tile) continue;
            tile.scale += (tile.targetScale - tile.scale) * springLerp;
            if (Math.abs(tile.scale - tile.targetScale) < 0.002) {
              tile.scale = tile.targetScale;
            }
            tile.flash *= 1 - flashDecay;
            if (tile.flash < 0.01) tile.flash = 0;
          }
        }

        // Merge Ghosts
        for (let i = sim.mergeGhosts.length - 1; i >= 0; i--) {
          const g = sim.mergeGhosts[i];
          g.progress += dt;
          if (g.progress >= g.duration) {
            sim.mergeGhosts.splice(i, 1);
          }
        }

        // Firework Rockets
        for (let i = sim.fireworks.length - 1; i >= 0; i--) {
          const fw = sim.fireworks[i];
          fw.x += fw.vx * dt;
          fw.y += fw.vy * dt;
          fw.vy += 240 * dt;
          fw.trailTimer += dt;
          if (fw.trailTimer >= 0.025) {
            fw.trailTimer = 0;
            pushParticle({
              x: fw.x,
              y: fw.y,
              vx: (Math.random() - 0.5) * 20,
              vy: 30 + Math.random() * 25,
              size: 1.6,
              color: fw.color,
              alpha: 0.75,
              life: 0.22,
              maxLife: 0.22,
              shape: 'circle',
              gravity: 0,
              drag: 0.94,
            });
          }
          if (fw.y <= fw.targetY || fw.vy >= -40) {
            sim.fireworks.splice(i, 1);
            detonateFirework(fw);
          }
        }

        // Particles with physics & smooth fade-out
        for (let i = sim.particles.length - 1; i >= 0; i--) {
          const p = sim.particles[i];
          p.life -= dt;
          if (p.life <= 0) {
            sim.particles.splice(i, 1);
            continue;
          }
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vy += p.gravity * dt;
          const damp = Math.pow(p.drag, dt * 60);
          p.vx *= damp;
          p.vy *= damp;
          const t = p.life / p.maxLife;
          p.alpha = t * t;
        }

        // Shockwaves
        for (let i = sim.shockwaves.length - 1; i >= 0; i--) {
          const s = sim.shockwaves[i];
          s.life -= dt;
          if (s.life <= 0) {
            sim.shockwaves.splice(i, 1);
            continue;
          }
          const t = 1 - s.life / s.maxLife;
          s.radius = s.maxRadius * (0.25 + 0.75 * (1 - Math.pow(1 - t, 2)));
          s.alpha = s.life / s.maxLife;
        }

        // Beams
        for (let i = sim.beams.length - 1; i >= 0; i--) {
          sim.beams[i].life -= dt;
          if (sim.beams[i].life <= 0) {
            sim.beams.splice(i, 1);
          }
        }

        // Floating Texts
        for (let i = sim.floatingTexts.length - 1; i >= 0; i--) {
          const ft = sim.floatingTexts[i];
          ft.life -= dt;
          if (ft.life <= 0) {
            sim.floatingTexts.splice(i, 1);
            continue;
          }
          ft.y += ft.vy * dt;
          ft.vy *= 0.95;
        }

        // Shake
        let shakeX = 0;
        let shakeY = 0;
        if (sim.shakeTimer > 0 && !reducedMotionRef.current) {
          sim.shakeTimer = Math.max(0, sim.shakeTimer - dt);
          const mag = sim.shakeIntensity * (sim.shakeTimer / 0.22);
          shakeX = (Math.random() - 0.5) * 2 * mag;
          shakeY = (Math.random() - 0.5) * 2 * mag;
        }

        const ctx = canvas.getContext('2d');
        if (ctx) {
          renderNeonCanvas(ctx, layout, {
            time: sim.time,
            grid: sim.grid,
            tray: sim.tray,
            selectedSlot: statusRef.current === 'PLAYING' ? sim.selectedSlot : -1,
            preview: statusRef.current === 'PLAYING' ? sim.preview : null,
            drag: statusRef.current === 'PLAYING' ? sim.drag : null,
            cursor:
              statusRef.current === 'PLAYING'
                ? sim.cursor
                : { ...sim.cursor, visible: false },
            particles: sim.particles,
            fireworks: sim.fireworks,
            shockwaves: sim.shockwaves,
            beams: sim.beams,
            floatingTexts: sim.floatingTexts,
            mergeGhosts: sim.mergeGhosts,
            motes: sim.motes,
            shakeX,
            shakeY,
            isDimmed: statusRef.current !== 'PLAYING',
            themeId: themeIdRef.current,
          });
        }

        rafId = requestAnimationFrame(tick);
      };

      rafId = requestAnimationFrame(tick);

      return () => {
        cancelAnimationFrame(rafId);
        ro.disconnect();
      };
    }, []);

    // Pointer Events (Touch Drag, Mouse Drag, & Tap-to-Place)
    const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (statusRef.current !== 'PLAYING') return;
      neonAudio.unlock();
      canvasRef.current?.focus();

      const sim = simRef.current;
      sim.cursor.visible = false;
      const { x, y } = getCanvasCoords(e);
      const layout = layoutRef.current;

      const slotIdx = hitTestTraySlot(layout, x, y);
      if (slotIdx >= 0 && sim.tray[slotIdx]) {
        const piece = sim.tray[slotIdx]!;
        const liftY = e.pointerType === 'touch' ? 52 : 0;
        sim.selectedSlot = slotIdx;
        sim.cursor.traySlot = slotIdx;
        sim.pointerDownPos = { x, y, slot: slotIdx, pointerType: e.pointerType };
        sim.drag = {
          active: true,
          slotIndex: slotIdx,
          piece,
          pointerX: x,
          pointerY: y,
          liftY,
        };
        neonAudio.playSelect();
        e.currentTarget.setPointerCapture(e.pointerId);
        return;
      }

      // Direct tap/click on Grid when a tray piece is selected
      if (sim.selectedSlot >= 0 && sim.tray[sim.selectedSlot]) {
        const piece = sim.tray[sim.selectedSlot]!;
        const anchor = screenToGridAnchor(layout, x, y, piece);
        if (anchor) {
          executePlacement(sim.selectedSlot, anchor.r, anchor.c);
        }
      }
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (statusRef.current !== 'PLAYING') return;
      const sim = simRef.current;
      const layout = layoutRef.current;
      const { x, y } = getCanvasCoords(e);

      if (sim.drag?.active) {
        sim.drag.pointerX = x;
        sim.drag.pointerY = y;
        const anchor = screenToGridAnchor(
          layout,
          x,
          y - sim.drag.liftY,
          sim.drag.piece
        );
        if (anchor) {
          sim.preview = computePlacementPreview(
            sim.grid,
            sim.drag.piece,
            anchor.r,
            anchor.c
          );
        } else {
          sim.preview = null;
        }
        return;
      }

      // Mouse hover preview over grid
      if (e.pointerType === 'mouse' && sim.selectedSlot >= 0) {
        const piece = sim.tray[sim.selectedSlot];
        if (!piece) {
          sim.preview = null;
          return;
        }
        const cell = screenToSingleCell(layout, x, y);
        if (cell) {
          const anchor = screenToGridAnchor(layout, x, y, piece);
          if (anchor) {
            sim.preview = computePlacementPreview(sim.grid, piece, anchor.r, anchor.c);
          } else {
            sim.preview = null;
          }
        } else if (!sim.cursor.visible) {
          sim.preview = null;
        }
      }
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
      const sim = simRef.current;
      if (!sim.drag?.active) return;

      const { x, y } = getCanvasCoords(e);
      const layout = layoutRef.current;
      const down = sim.pointerDownPos;
      const dist = down ? Math.hypot(x - down.x, y - down.y) : 999;

      const dragState = sim.drag;
      sim.drag = null;
      sim.pointerDownPos = null;

      if (dist < 12) {
        // Clean tap on a tray slot -> keep it selected for tap-to-place
        sim.selectedSlot = dragState.slotIndex;
        sim.preview = null;
        return;
      }

      const anchor = screenToGridAnchor(
        layout,
        x,
        y - dragState.liftY,
        dragState.piece
      );

      if (anchor) {
        executePlacement(dragState.slotIndex, anchor.r, anchor.c);
      } else {
        sim.preview = null;
      }
    };

    const handlePointerCancel = () => {
      const sim = simRef.current;
      sim.drag = null;
      sim.pointerDownPos = null;
      sim.preview = null;
    };

    // Keyboard & Amazon Fire TV D-Pad Support
    const handleCanvasKeyDown = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
      if (statusRef.current !== 'PLAYING') return;
      neonAudio.unlock();

      const sim = simRef.current;
      const layout = layoutRef.current;
      const key = e.key;

      // Global shortcuts (H, Escape, P, M) are handled centrally by App.tsx across all views.
      if (key === '1' || key === '2' || key === '3') {
        e.preventDefault();
        const idx = parseInt(key, 10) - 1;
        if (sim.tray[idx]) {
          sim.selectedSlot = idx;
          sim.cursor.visible = true;
          sim.cursor.traySlot = idx;
          neonAudio.playSelect();
          updateCursorPreview();
        }
        return;
      }
      if (key === 'Tab') {
        e.preventDefault();
        for (let offset = 1; offset <= TRAY_SIZE; offset++) {
          const next = (Math.max(0, sim.selectedSlot) + offset) % TRAY_SIZE;
          if (sim.tray[next]) {
            sim.selectedSlot = next;
            sim.cursor.visible = true;
            sim.cursor.traySlot = next;
            neonAudio.playSelect();
            updateCursorPreview();
            break;
          }
        }
        return;
      }

      const isUp = key === 'ArrowUp' || key === 'w' || key === 'W';
      const isDown = key === 'ArrowDown' || key === 's' || key === 'S';
      const isLeft = key === 'ArrowLeft' || key === 'a' || key === 'A';
      const isRight = key === 'ArrowRight' || key === 'd' || key === 'D';
      const isConfirm = key === 'Enter' || key === ' ' || key === 'Select' || key === 'DPadCenter';

      if (isUp || isDown || isLeft || isRight) {
        e.preventDefault();
        sim.cursor.visible = true;

        if (sim.cursor.zone === 'GRID') {
          const activePiece =
            sim.selectedSlot >= 0 ? sim.tray[sim.selectedSlot] : null;
          const maxRow = activePiece ? GRID_SIZE - activePiece.height : GRID_SIZE - 1;
          const maxCol = activePiece ? GRID_SIZE - activePiece.width : GRID_SIZE - 1;

          if (isUp) {
            if (sim.cursor.gridRow > 0) {
              sim.cursor.gridRow--;
              neonAudio.playMove();
            } else {
              // Top row -> allow D-pad to reach HUD controls
              sim.cursor.visible = false;
              sim.preview = null;
              onRequestHudFocus();
              return;
            }
          } else if (isDown) {
            if (sim.cursor.gridRow < maxRow) {
              sim.cursor.gridRow++;
              neonAudio.playMove();
            } else if (!layout.isLandscape) {
              // Portrait: jump down into Tray
              sim.cursor.zone = 'TRAY';
              sim.cursor.traySlot = selectNextAvailableSlot(
                sim.tray,
                Math.max(0, sim.selectedSlot)
              );
              neonAudio.playMove();
            }
          } else if (isLeft) {
            if (sim.cursor.gridCol > 0) {
              sim.cursor.gridCol--;
              neonAudio.playMove();
            }
          } else if (isRight) {
            if (sim.cursor.gridCol < maxCol) {
              sim.cursor.gridCol++;
              neonAudio.playMove();
            } else if (layout.isLandscape) {
              // Landscape: jump right into Tray
              sim.cursor.zone = 'TRAY';
              sim.cursor.traySlot = selectNextAvailableSlot(
                sim.tray,
                Math.max(0, sim.selectedSlot)
              );
              neonAudio.playMove();
            }
          }
        } else {
          // Focus inside TRAY
          if (layout.isLandscape) {
            if (isUp) {
              sim.cursor.traySlot = (sim.cursor.traySlot + TRAY_SIZE - 1) % TRAY_SIZE;
              neonAudio.playMove();
            } else if (isDown) {
              sim.cursor.traySlot = (sim.cursor.traySlot + 1) % TRAY_SIZE;
              neonAudio.playMove();
            } else if (isLeft) {
              sim.cursor.zone = 'GRID';
              neonAudio.playMove();
            }
          } else {
            if (isLeft) {
              sim.cursor.traySlot = (sim.cursor.traySlot + TRAY_SIZE - 1) % TRAY_SIZE;
              neonAudio.playMove();
            } else if (isRight) {
              sim.cursor.traySlot = (sim.cursor.traySlot + 1) % TRAY_SIZE;
              neonAudio.playMove();
            } else if (isUp) {
              sim.cursor.zone = 'GRID';
              neonAudio.playMove();
            }
          }
        }

        updateCursorPreview();
        return;
      }

      if (isConfirm) {
        e.preventDefault();
        sim.cursor.visible = true;

        if (sim.cursor.zone === 'TRAY') {
          const slot = sim.cursor.traySlot;
          if (sim.tray[slot]) {
            sim.selectedSlot = slot;
            sim.cursor.zone = 'GRID';
            const piece = sim.tray[slot]!;
            // Keep cursor in bounds for new piece; if invalid, snap to nearest valid
            sim.cursor.gridRow = Math.min(sim.cursor.gridRow, GRID_SIZE - piece.height);
            sim.cursor.gridCol = Math.min(sim.cursor.gridCol, GRID_SIZE - piece.width);
            const valids = findAllValidPlacements(sim.grid, piece);
            if (
              valids.length > 0 &&
              !valids.some(
                (v) => v.r === sim.cursor.gridRow && v.c === sim.cursor.gridCol
              )
            ) {
              sim.cursor.gridRow = valids[0].r;
              sim.cursor.gridCol = valids[0].c;
            }
            neonAudio.playSelect();
            updateCursorPreview();
          } else {
            neonAudio.playInvalid();
          }
          return;
        }

        // Confirm placement on GRID
        if (sim.selectedSlot >= 0 && sim.tray[sim.selectedSlot]) {
          const placed = executePlacement(
            sim.selectedSlot,
            sim.cursor.gridRow,
            sim.cursor.gridCol
          );
          if (placed && sim.selectedSlot >= 0) {
            const nextPiece = sim.tray[sim.selectedSlot];
            if (nextPiece) {
              sim.cursor.gridRow = Math.min(sim.cursor.gridRow, GRID_SIZE - nextPiece.height);
              sim.cursor.gridCol = Math.min(sim.cursor.gridCol, GRID_SIZE - nextPiece.width);
            }
            updateCursorPreview();
          }
        }
      }
    };

    // Clear drag state on window blur
    useEffect(() => {
      const onBlur = () => {
        const sim = simRef.current;
        sim.drag = null;
        sim.pointerDownPos = null;
      };
      window.addEventListener('blur', onBlur);
      return () => window.removeEventListener('blur', onBlur);
    }, []);

    return (
      <div
        ref={containerRef}
        className="relative flex-1 w-full h-full min-w-0 min-h-0 overflow-hidden"
      >
        <canvas
          ref={canvasRef}
          tabIndex={0}
          aria-label="Neon Block 6 by 6 puzzle board and piece tray"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onKeyDown={handleCanvasKeyDown}
          className="block w-full h-full touch-none outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 focus-visible:ring-inset cursor-pointer"
        />
      </div>
    );
  }
);

NeonCanvas.displayName = 'NeonCanvas';
