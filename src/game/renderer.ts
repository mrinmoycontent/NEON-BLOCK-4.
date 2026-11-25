import { getTilePalette } from './palette';
import { getThemeDefinition } from './themes';
import {
  BlockPiece,
  FireworkRocket,
  FloatingText,
  FocusZone,
  GRID_SIZE,
  GridMatrix,
  LineBeam,
  MergeGhostTile,
  Particle,
  PlacementPreview,
  ShockwaveRing,
  TRAY_SIZE,
  ThemeId,
} from './types';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CanvasLayout {
  width: number;
  height: number;
  isLandscape: boolean;
  boardRect: Rect;
  cellSize: number;
  cellGap: number;
  boardInnerPad: number;
  traySlots: Rect[];
}

export interface AmbientMote {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  alpha: number;
  color: string;
  phase: number;
  twinkleSpeed: number;
}

export interface DragVisualState {
  active: boolean;
  slotIndex: number;
  piece: BlockPiece;
  pointerX: number;
  pointerY: number;
  liftY: number;
}

export interface CursorVisualState {
  visible: boolean;
  zone: FocusZone;
  gridRow: number;
  gridCol: number;
  traySlot: number;
}

export interface RenderFrameState {
  time: number;
  grid: GridMatrix;
  tray: (BlockPiece | null)[];
  selectedSlot: number;
  preview: PlacementPreview | null;
  drag: DragVisualState | null;
  cursor: CursorVisualState;
  particles: Particle[];
  fireworks: FireworkRocket[];
  shockwaves: ShockwaveRing[];
  beams: LineBeam[];
  floatingTexts: FloatingText[];
  mergeGhosts: MergeGhostTile[];
  motes: AmbientMote[];
  shakeX: number;
  shakeY: number;
  isDimmed: boolean;
  themeId: ThemeId;
}

export function computeCanvasLayout(width: number, height: number): CanvasLayout {
  const safeW = Math.max(320, width);
  const safeH = Math.max(260, height);
  const isLandscape = safeW >= safeH * 1.05;

  const boardInnerPad = 10;
  const cellGap = Math.max(5, Math.min(10, Math.round(Math.min(safeW, safeH) * 0.012)));

  if (isLandscape) {
    const padX = Math.max(16, Math.round(safeW * 0.03));
    const padY = Math.max(16, Math.round(safeH * 0.04));
    const gap = Math.max(18, Math.round(safeW * 0.03));
    const trayWidth = Math.min(250, Math.max(148, Math.round(safeW * 0.25)));

    const maxBoardW = safeW - padX * 2 - trayWidth - gap;
    const maxBoardH = safeH - padY * 2;
    const boardSize = Math.max(200, Math.floor(Math.min(maxBoardW, maxBoardH)));

    const totalW = boardSize + gap + trayWidth;
    const startX = Math.round((safeW - totalW) / 2);
    const boardY = Math.round((safeH - boardSize) / 2);

    const boardRect: Rect = {
      x: startX,
      y: boardY,
      w: boardSize,
      h: boardSize,
    };

    const innerSize = boardSize - boardInnerPad * 2;
    const cellSize = (innerSize - cellGap * (GRID_SIZE - 1)) / GRID_SIZE;

    const trayX = startX + boardSize + gap;
    const trayH = boardSize;
    const slotGap = Math.max(10, Math.round(trayH * 0.032));
    const slotH = Math.floor((trayH - slotGap * (TRAY_SIZE - 1)) / TRAY_SIZE);

    const traySlots: Rect[] = [];
    for (let i = 0; i < TRAY_SIZE; i++) {
      traySlots.push({
        x: trayX,
        y: boardY + i * (slotH + slotGap),
        w: trayWidth,
        h: slotH,
      });
    }

    return {
      width: safeW,
      height: safeH,
      isLandscape,
      boardRect,
      cellSize,
      cellGap,
      boardInnerPad,
      traySlots,
    };
  }

  // Portrait / Compact Square
  const padX = Math.max(12, Math.round(safeW * 0.035));
  const padY = Math.max(12, Math.round(safeH * 0.025));
  const gap = Math.max(12, Math.round(safeH * 0.025));
  const trayHeight = Math.min(156, Math.max(100, Math.round(safeH * 0.23)));

  const maxBoardW = safeW - padX * 2;
  const maxBoardH = safeH - padY * 2 - trayHeight - gap;
  const boardSize = Math.max(180, Math.floor(Math.min(maxBoardW, maxBoardH)));

  const totalH = boardSize + gap + trayHeight;
  const startY = Math.round((safeH - totalH) / 2);
  const boardX = Math.round((safeW - boardSize) / 2);

  const boardRect: Rect = {
    x: boardX,
    y: startY,
    w: boardSize,
    h: boardSize,
  };

  const innerSize = boardSize - boardInnerPad * 2;
  const cellSize = (innerSize - cellGap * (GRID_SIZE - 1)) / GRID_SIZE;

  const trayY = startY + boardSize + gap;
  const trayW = Math.min(safeW - padX * 2, Math.max(boardSize, 300));
  const trayStartX = Math.round((safeW - trayW) / 2);
  const slotGap = Math.max(8, Math.round(trayW * 0.025));
  const slotW = Math.floor((trayW - slotGap * (TRAY_SIZE - 1)) / TRAY_SIZE);

  const traySlots: Rect[] = [];
  for (let i = 0; i < TRAY_SIZE; i++) {
    traySlots.push({
      x: trayStartX + i * (slotW + slotGap),
      y: trayY,
      w: slotW,
      h: trayHeight,
    });
  }

  return {
    width: safeW,
    height: safeH,
    isLandscape,
    boardRect,
    cellSize,
    cellGap,
    boardInnerPad,
    traySlots,
  };
}

export function getCellRect(layout: CanvasLayout, r: number, c: number): Rect {
  const x =
    layout.boardRect.x +
    layout.boardInnerPad +
    c * (layout.cellSize + layout.cellGap);
  const y =
    layout.boardRect.y +
    layout.boardInnerPad +
    r * (layout.cellSize + layout.cellGap);
  return { x, y, w: layout.cellSize, h: layout.cellSize };
}

export function hitTestTraySlot(
  layout: CanvasLayout,
  x: number,
  y: number
): number {
  for (let i = 0; i < layout.traySlots.length; i++) {
    const s = layout.traySlots[i];
    if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) {
      return i;
    }
  }
  return -1;
}

export function screenToGridAnchor(
  layout: CanvasLayout,
  centerX: number,
  centerY: number,
  piece: BlockPiece
): { r: number; c: number } | null {
  const step = layout.cellSize + layout.cellGap;
  const piecePixelW = piece.width * layout.cellSize + (piece.width - 1) * layout.cellGap;
  const piecePixelH = piece.height * layout.cellSize + (piece.height - 1) * layout.cellGap;

  const topLeftX = centerX - piecePixelW / 2;
  const topLeftY = centerY - piecePixelH / 2;

  const originX = layout.boardRect.x + layout.boardInnerPad;
  const originY = layout.boardRect.y + layout.boardInnerPad;

  const col = Math.round((topLeftX - originX) / step);
  const row = Math.round((topLeftY - originY) / step);

  if (
    row < -1 ||
    col < -1 ||
    row > GRID_SIZE ||
    col > GRID_SIZE
  ) {
    return null;
  }

  return { r: row, c: col };
}

export function screenToSingleCell(
  layout: CanvasLayout,
  x: number,
  y: number
): { r: number; c: number } | null {
  const originX = layout.boardRect.x + layout.boardInnerPad;
  const originY = layout.boardRect.y + layout.boardInnerPad;
  const step = layout.cellSize + layout.cellGap;

  if (
    x < layout.boardRect.x ||
    x > layout.boardRect.x + layout.boardRect.w ||
    y < layout.boardRect.y ||
    y > layout.boardRect.y + layout.boardRect.h
  ) {
    return null;
  }

  const col = Math.floor((x - originX + layout.cellGap * 0.5) / step);
  const row = Math.floor((y - originY + layout.cellGap * 0.5) / step);
  if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) {
    return null;
  }
  return { r: row, c: col };
}

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

export function drawNeonTile(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  value: number,
  opts?: {
    alpha?: number;
    scale?: number;
    flash?: number;
    mergeHighlight?: boolean;
    glowBoost?: number;
    themeId?: ThemeId;
  }
): void {
  const alpha = opts?.alpha ?? 1;
  const scale = opts?.scale ?? 1;
  const flash = opts?.flash ?? 0;
  const mergeHighlight = opts?.mergeHighlight ?? false;
  const glowBoost = opts?.glowBoost ?? 1;

  const pal = getTilePalette(value, opts?.themeId ?? 'NEON_CYBER');
  const cx = x + size / 2;
  const cy = y + size / 2;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  const half = size / 2;
  const corner = Math.max(6, size * 0.18);

  // Outer neon glow
  ctx.shadowColor = pal.glow;
  ctx.shadowBlur = Math.max(8, size * 0.22) * glowBoost;

  // Body fill gradient
  const grad = ctx.createLinearGradient(0, -half, 0, half);
  grad.addColorStop(0, pal.bgTop);
  grad.addColorStop(1, pal.bgBottom);

  drawRoundedRectPath(ctx, -half, -half, size, size, corner);
  ctx.fillStyle = grad;
  ctx.fill();

  // Crisp glowing border
  ctx.shadowBlur = 0;
  ctx.lineWidth = Math.max(1.5, size * 0.045);
  ctx.strokeStyle = pal.border;
  ctx.stroke();

  // Subtle top bevel sheen
  drawRoundedRectPath(
    ctx,
    -half + 2.5,
    -half + 2.5,
    size - 5,
    size * 0.42,
    Math.max(4, corner - 2)
  );
  const sheen = ctx.createLinearGradient(0, -half, 0, 0);
  sheen.addColorStop(0, pal.innerAccent);
  sheen.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sheen;
  ctx.fill();

  // Flash overlay on newly placed/merged tile
  if (flash > 0.01) {
    drawRoundedRectPath(ctx, -half, -half, size, size, corner);
    ctx.fillStyle = `rgba(224, 242, 254, ${Math.min(0.65, flash * 0.65)})`;
    ctx.fill();
  }

  // Merge prediction pulse ring
  if (mergeHighlight) {
    drawRoundedRectPath(ctx, -half - 2, -half - 2, size + 4, size + 4, corner + 2);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#67E8F9';
    ctx.stroke();
  }

  // Crisp tabular numeral
  const label = String(value);
  const fontScale =
    label.length <= 2
      ? 0.42
      : label.length === 3
        ? 0.34
        : 0.27;
  const fontSize = Math.max(11, Math.round(size * fontScale));
  ctx.font = `800 ${fontSize}px 'Bahnschrift', 'DIN Alternate', 'SF Pro Display', system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.shadowColor = pal.glow;
  ctx.shadowBlur = 8;
  ctx.fillStyle = pal.text;
  ctx.fillText(label, 0, size * 0.02);

  ctx.restore();
}

export function drawBlockPiece(
  ctx: CanvasRenderingContext2D,
  piece: BlockPiece,
  centerX: number,
  centerY: number,
  cellSize: number,
  cellGap: number,
  alpha = 1,
  glowBoost = 1,
  themeId: ThemeId = 'NEON_CYBER'
): void {
  const totalW = piece.width * cellSize + (piece.width - 1) * cellGap;
  const totalH = piece.height * cellSize + (piece.height - 1) * cellGap;
  const startX = centerX - totalW / 2;
  const startY = centerY - totalH / 2;

  for (const cell of piece.cells) {
    const tx = startX + cell.dc * (cellSize + cellGap);
    const ty = startY + cell.dr * (cellSize + cellGap);
    drawNeonTile(ctx, tx, ty, cellSize, cell.value, { alpha, glowBoost, themeId });
  }
}

export function createAmbientMotes(
  count: number,
  width: number,
  height: number,
  themeId: ThemeId = 'NEON_CYBER'
): AmbientMote[] {
  const colors = getThemeDefinition(themeId).moteColors;
  const motes: AmbientMote[] = [];
  for (let i = 0; i < count; i++) {
    motes.push({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 1 + Math.random() * 2.1,
      vx: (Math.random() - 0.5) * 14,
      vy: -8 - Math.random() * 20,
      alpha: 0.16 + Math.random() * 0.34,
      color: colors[i % colors.length],
      phase: Math.random() * Math.PI * 2,
      twinkleSpeed: 1.5 + Math.random() * 2.5,
    });
  }
  return motes;
}

export function renderNeonCanvas(
  ctx: CanvasRenderingContext2D,
  layout: CanvasLayout,
  state: RenderFrameState
): void {
  const { width, height, boardRect, cellSize, cellGap, traySlots } = layout;
  const themeId = state.themeId ?? 'NEON_CYBER';
  const theme = getThemeDefinition(themeId);

  ctx.save();
  ctx.clearRect(0, 0, width, height);

  // Subtle deep obsidian radial backdrop matching active visual theme
  const bgGrad = ctx.createRadialGradient(
    width * 0.45,
    height * 0.42,
    Math.min(width, height) * 0.08,
    width * 0.5,
    height * 0.5,
    Math.max(width, height) * 0.8
  );
  bgGrad.addColorStop(0, theme.bgInner);
  bgGrad.addColorStop(0.55, theme.bgMid);
  bgGrad.addColorStop(1, theme.bgOuter);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Ambient floating background particles with gentle twinkle
  for (const mote of state.motes) {
    const twinkle = 0.65 + 0.35 * Math.sin(state.time * mote.twinkleSpeed + mote.phase);
    ctx.save();
    ctx.globalAlpha = mote.alpha * twinkle;
    ctx.fillStyle = mote.color;
    ctx.beginPath();
    ctx.arc(mote.x, mote.y, mote.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Apply screen shake for heavy combos / line clears
  ctx.translate(state.shakeX, state.shakeY);

  // Board outer housing
  const boardCorner = 18;
  ctx.save();
  ctx.shadowColor = theme.boardFrameStart;
  ctx.shadowBlur = 26;
  drawRoundedRectPath(ctx, boardRect.x, boardRect.y, boardRect.w, boardRect.h, boardCorner);
  ctx.fillStyle = theme.boardFill;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = 1.5;
  const frameGrad = ctx.createLinearGradient(
    boardRect.x,
    boardRect.y,
    boardRect.x + boardRect.w,
    boardRect.y + boardRect.h
  );
  frameGrad.addColorStop(0, theme.boardFrameStart);
  frameGrad.addColorStop(0.5, theme.boardFrameMid);
  frameGrad.addColorStop(1, theme.boardFrameEnd);
  ctx.strokeStyle = frameGrad;
  ctx.stroke();
  ctx.restore();

  // Line clear prediction rails
  if (state.preview && state.preview.valid) {
    const pulse = 0.45 + 0.25 * Math.sin(state.time * 8);
    for (const r of state.preview.willClearRows) {
      const firstCell = getCellRect(layout, r, 0);
      drawRoundedRectPath(
        ctx,
        boardRect.x + 6,
        firstCell.y - 2,
        boardRect.w - 12,
        cellSize + 4,
        10
      );
      ctx.fillStyle = `rgba(34, 211, 238, ${pulse * 0.16})`;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = theme.rowWave;
      ctx.stroke();
    }
    for (const c of state.preview.willClearCols) {
      const firstCell = getCellRect(layout, 0, c);
      drawRoundedRectPath(
        ctx,
        firstCell.x - 2,
        boardRect.y + 6,
        cellSize + 4,
        boardRect.h - 12,
        10
      );
      ctx.fillStyle = `rgba(168, 85, 247, ${pulse * 0.16})`;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = theme.colWave;
      ctx.stroke();
    }
  }

  // Empty Grid Slots
  const cellCorner = Math.max(6, cellSize * 0.18);
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const rect = getCellRect(layout, r, c);
      drawRoundedRectPath(ctx, rect.x, rect.y, rect.w, rect.h, cellCorner);
      ctx.fillStyle = theme.slotFill;
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = theme.slotStroke;
      ctx.stroke();
    }
  }

  // Occupied Board Tiles
  const mergeHighlightSet = new Set<string>(
    state.preview?.valid
      ? state.preview.willMergeCells.map((p) => `${p.r},${p.c}`)
      : []
  );

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const tile = state.grid[r][c];
      if (!tile) continue;
      const rect = getCellRect(layout, r, c);
      const isWillMerge = mergeHighlightSet.has(`${r},${c}`);
      drawNeonTile(ctx, rect.x, rect.y, rect.w, tile.value, {
        scale: tile.scale,
        flash: tile.flash,
        mergeHighlight: isWillMerge,
        themeId,
      });
    }
  }

  // Merge Sliding Ghosts
  for (const ghost of state.mergeGhosts) {
    const t = Math.min(1, ghost.progress / ghost.duration);
    const ease = 1 - Math.pow(1 - t, 3);
    const gx = ghost.fromX + (ghost.toX - ghost.fromX) * ease;
    const gy = ghost.fromY + (ghost.toY - ghost.fromY) * ease;
    drawNeonTile(ctx, gx, gy, ghost.size, ghost.value, {
      alpha: 1 - t * 0.35,
      scale: 1 - t * 0.22,
      glowBoost: 1.4,
      themeId,
    });
  }

  // Placement Ghost Preview on Grid
  if (state.preview && state.selectedSlot >= 0) {
    const activePiece = state.tray[state.selectedSlot];
    if (activePiece) {
      for (let i = 0; i < state.preview.targetCells.length; i++) {
        const pt = state.preview.targetCells[i];
        if (pt.r < 0 || pt.r >= GRID_SIZE || pt.c < 0 || pt.c >= GRID_SIZE) {
          continue;
        }
        const rect = getCellRect(layout, pt.r, pt.c);
        const cellVal = activePiece.cells[i]?.value ?? 2;

        if (state.preview.valid) {
          drawNeonTile(ctx, rect.x, rect.y, rect.w, cellVal, {
            alpha: 0.45,
            scale: 0.96,
            mergeHighlight: mergeHighlightSet.has(`${pt.r},${pt.c}`),
            themeId,
          });
        } else {
          ctx.save();
          drawRoundedRectPath(ctx, rect.x + 2, rect.y + 2, rect.w - 4, rect.h - 4, cellCorner);
          ctx.fillStyle = 'rgba(244, 63, 94, 0.22)';
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 4]);
          ctx.strokeStyle = 'rgba(251, 113, 133, 0.85)';
          ctx.stroke();
          ctx.restore();
        }
      }
    }
  }

  // Line Clear Plasma Beams
  for (const beam of state.beams) {
    const t = beam.life / beam.maxLife;
    ctx.save();
    ctx.globalAlpha = Math.max(0, t);
    ctx.shadowColor = beam.color;
    ctx.shadowBlur = 24;
    drawRoundedRectPath(ctx, beam.x, beam.y, beam.w, beam.h, 10);
    ctx.fillStyle = beam.color;
    ctx.fill();
    ctx.restore();
  }

  // Shockwave Rings
  for (const ring of state.shockwaves) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.max(0, ring.alpha);
    ctx.strokeStyle = ring.color;
    ctx.lineWidth = ring.lineWidth;
    ctx.shadowColor = ring.color;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Rising Firework Rockets
  for (const fw of state.fireworks) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = fw.color;
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(fw.x, fw.y, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Advanced Multi-Shape Particles (circle, spark streak, diamond shard)
  if (state.particles.length > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of state.particles) {
      const a = Math.max(0, p.alpha);
      if (a <= 0.01) continue;
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;

      if (p.shape === 'spark') {
        const angle = Math.atan2(p.vy, p.vx);
        const speed = Math.hypot(p.vx, p.vy);
        const len = Math.max(p.size * 2.2, Math.min(18, speed * 0.048));
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.ellipse(0, 0, len, p.size * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (p.shape === 'diamond') {
        const s = p.size * 1.45;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - s);
        ctx.lineTo(p.x + s * 0.72, p.y);
        ctx.lineTo(p.x, p.y + s);
        ctx.lineTo(p.x - s * 0.72, p.y);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // Tray Slots
  for (let i = 0; i < TRAY_SIZE; i++) {
    const slotRect = traySlots[i];
    const piece = state.tray[i];
    const isSelected = i === state.selectedSlot && piece !== null;
    const isBeingDragged =
      state.drag?.active && state.drag.slotIndex === i;
    const isCursorFocused =
      state.cursor.visible &&
      state.cursor.zone === 'TRAY' &&
      state.cursor.traySlot === i;

    ctx.save();
    drawRoundedRectPath(ctx, slotRect.x, slotRect.y, slotRect.w, slotRect.h, 14);
    ctx.fillStyle = isSelected
      ? 'rgba(14, 30, 68, 0.94)'
      : 'rgba(10, 16, 38, 0.82)';
    ctx.fill();

    ctx.lineWidth = isCursorFocused ? 2.5 : isSelected ? 2 : 1.25;
    if (isCursorFocused) {
      ctx.shadowColor = 'rgba(34, 211, 238, 0.7)';
      ctx.shadowBlur = 14;
      ctx.strokeStyle = '#67E8F9';
    } else if (isSelected) {
      ctx.shadowColor = 'rgba(56, 189, 248, 0.4)';
      ctx.shadowBlur = 12;
      ctx.strokeStyle = '#38BDF8';
    } else {
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.25)';
    }
    ctx.stroke();
    ctx.restore();

    // Subtle slot number index for keyboard clarity
    ctx.save();
    ctx.font = '700 11px ui-monospace, SFMono-Regular, monospace';
    ctx.fillStyle = isSelected ? 'rgba(103, 232, 249, 0.85)' : 'rgba(148, 163, 184, 0.45)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(String(i + 1), slotRect.x + 10, slotRect.y + 8);
    ctx.restore();

    if (piece && !isBeingDragged) {
      const maxCellByW = (slotRect.w - 34) / Math.max(2.2, piece.width);
      const maxCellByH = (slotRect.h - 28) / Math.max(2.2, piece.height);
      const previewCell = Math.min(cellSize * 0.74, maxCellByW, maxCellByH);
      const previewGap = Math.max(3, previewCell * 0.11);

      drawBlockPiece(
        ctx,
        piece,
        slotRect.x + slotRect.w / 2,
        slotRect.y + slotRect.h / 2 + 2,
        previewCell,
        previewGap,
        isSelected ? 1 : 0.88,
        isSelected ? 1.15 : 0.75,
        themeId
      );
    }
  }

  // D-Pad / Keyboard Grid Cursor Bracket
  if (state.cursor.visible && state.cursor.zone === 'GRID') {
    const r = Math.max(0, Math.min(GRID_SIZE - 1, state.cursor.gridRow));
    const c = Math.max(0, Math.min(GRID_SIZE - 1, state.cursor.gridCol));
    const rect = getCellRect(layout, r, c);
    const pulse = 0.75 + 0.25 * Math.sin(state.time * 6.5);
    const pad = 3;
    const x = rect.x - pad;
    const y = rect.y - pad;
    const w = rect.w + pad * 2;
    const h = rect.h + pad * 2;
    const arm = Math.max(8, w * 0.26);

    ctx.save();
    ctx.strokeStyle = `rgba(224, 242, 254, ${pulse})`;
    ctx.shadowColor = 'rgba(34, 211, 238, 0.9)';
    ctx.shadowBlur = 12;
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';

    // 4 crisp corner brackets
    ctx.beginPath();
    // Top-left
    ctx.moveTo(x, y + arm);
    ctx.lineTo(x, y);
    ctx.lineTo(x + arm, y);
    // Top-right
    ctx.moveTo(x + w - arm, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + arm);
    // Bottom-right
    ctx.moveTo(x + w, y + h - arm);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x + w - arm, y + h);
    // Bottom-left
    ctx.moveTo(x + arm, y + h);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x, y + h - arm);
    ctx.stroke();
    ctx.restore();
  }

  // Dragged Floating Piece
  if (state.drag?.active) {
    drawBlockPiece(
      ctx,
      state.drag.piece,
      state.drag.pointerX,
      state.drag.pointerY - state.drag.liftY,
      cellSize * 0.96,
      cellGap,
      0.96,
      1.35,
      themeId
    );
  }

  // Floating Score / Combo Popups
  for (const ft of state.floatingTexts) {
    const alpha = Math.min(1, (ft.life / ft.maxLife) * 1.4);
    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.translate(ft.x, ft.y);
    ctx.scale(ft.scale, ft.scale);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = `800 20px 'Bahnschrift', 'DIN Alternate', system-ui, sans-serif`;
    ctx.shadowColor = ft.color;
    ctx.shadowBlur = 14;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(ft.text, 0, 0);

    if (ft.subtext) {
      ctx.font = `700 12px 'Bahnschrift', 'DIN Alternate', system-ui, sans-serif`;
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.subtext, 0, 18);
    }
    ctx.restore();
  }

  // Subtle dimming veil when paused or on title screen
  if (state.isDimmed) {
    ctx.fillStyle = 'rgba(4, 6, 15, 0.42)';
    ctx.fillRect(-20, -20, width + 40, height + 40);
  }

  ctx.restore();
}
