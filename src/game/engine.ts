import {
  BlockPiece,
  BoardTile,
  CellOffset,
  GRID_SIZE,
  GridCoord,
  GridMatrix,
  LineClearStep,
  MergeStep,
  PlacementPreview,
  TRAY_SIZE,
  TurnResolution,
} from './types';

let nextTileId = 1;
let nextPieceId = 1;

export function allocateTileId(): number {
  return nextTileId++;
}

export function createEmptyGrid(): GridMatrix {
  return Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => null)
  );
}

export function cloneGrid(grid: GridMatrix): GridMatrix {
  return grid.map((row) =>
    row.map((cell) => (cell ? { ...cell } : null))
  );
}

export function getMaxTileOnGrid(grid: GridMatrix): number {
  let max = 0;
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const tile = grid[r][c];
      if (tile && tile.value > max) {
        max = tile.value;
      }
    }
  }
  return max;
}

interface ShapeBlueprint {
  name: string;
  weight: number;
  coords: [number, number][];
}

const SHAPE_BLUEPRINTS: ShapeBlueprint[] = [
  { name: 'SINGLE', weight: 16, coords: [[0, 0]] },
  { name: 'DOMINO_H', weight: 16, coords: [[0, 0], [0, 1]] },
  { name: 'DOMINO_V', weight: 16, coords: [[0, 0], [1, 0]] },
  { name: 'LINE_H3', weight: 10, coords: [[0, 0], [0, 1], [0, 2]] },
  { name: 'LINE_V3', weight: 10, coords: [[0, 0], [1, 0], [2, 0]] },
  { name: 'L_TL', weight: 8, coords: [[0, 0], [0, 1], [1, 0]] },
  { name: 'L_TR', weight: 8, coords: [[0, 0], [0, 1], [1, 1]] },
  { name: 'L_BL', weight: 8, coords: [[0, 0], [1, 0], [1, 1]] },
  { name: 'L_BR', weight: 8, coords: [[0, 1], [1, 0], [1, 1]] },
  { name: 'SQUARE_2X2', weight: 9, coords: [[0, 0], [0, 1], [1, 0], [1, 1]] },
  { name: 'T_UP', weight: 5, coords: [[0, 1], [1, 0], [1, 1], [1, 2]] },
  { name: 'T_DOWN', weight: 5, coords: [[0, 0], [0, 1], [0, 2], [1, 1]] },
];

function pickBaseValue(maxTile: number, rng: () => number): number {
  const r = rng();
  if (maxTile >= 512) {
    if (r < 0.34) return 2;
    if (r < 0.66) return 4;
    if (r < 0.86) return 8;
    if (r < 0.96) return 16;
    return 32;
  }
  if (maxTile >= 128) {
    if (r < 0.40) return 2;
    if (r < 0.75) return 4;
    if (r < 0.93) return 8;
    return 16;
  }
  if (maxTile >= 32) {
    if (r < 0.48) return 2;
    if (r < 0.84) return 4;
    return 8;
  }
  return r < 0.62 ? 2 : 4;
}

function assignValuesToShape(
  shapeName: string,
  coords: [number, number][],
  base: number,
  rng: () => number
): CellOffset[] {
  const high = base * 2;

  if (coords.length === 1) {
    return [{ dr: coords[0][0], dc: coords[0][1], value: base }];
  }

  if (coords.length === 2) {
    const uniform = rng() < 0.52;
    return coords.map(([dr, dc], idx) => ({
      dr,
      dc,
      value: uniform ? base : idx === 0 ? base : high,
    }));
  }

  if (shapeName === 'SQUARE_2X2') {
    const flip = rng() < 0.5;
    return coords.map(([dr, dc]) => {
      const parity = (dr + dc) % 2 === 0;
      const useBase = flip ? !parity : parity;
      return { dr, dc, value: useBase ? base : high };
    });
  }

  if (shapeName === 'T_UP' || shapeName === 'T_DOWN') {
    // Center junction gets high value, 3 outer arms get base -> never 3 connected identical cells
    return coords.map(([dr, dc]) => {
      const isCenter =
        (shapeName === 'T_UP' && dr === 1 && dc === 1) ||
        (shapeName === 'T_DOWN' && dr === 0 && dc === 1);
      return { dr, dc, value: isCenter ? high : base };
    });
  }

  // 3-cell lines & L-trominoes: middle cell (index 1 in line, corner in L) differs from ends
  if (shapeName === 'LINE_H3' || shapeName === 'LINE_V3') {
    const invert = rng() < 0.35;
    return coords.map(([dr, dc], idx) => {
      const isMid = idx === 1;
      const val = invert ? (isMid ? base : high) : isMid ? high : base;
      return { dr, dc, value: val };
    });
  }

  // L-trominoes: find the corner cell (degree 2) and give it `high`, or alternate
  const degrees = coords.map(([r1, c1]) =>
    coords.filter(([r2, c2]) => Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1).length
  );
  const invert = rng() < 0.35;
  return coords.map(([dr, dc], idx) => {
    const isCorner = degrees[idx] === 2;
    const val = invert ? (isCorner ? base : high) : isCorner ? high : base;
    return { dr, dc, value: val };
  });
}

export function buildPieceFromBlueprint(
  blueprint: ShapeBlueprint,
  maxTile: number,
  rng: () => number = Math.random
): BlockPiece {
  const base = pickBaseValue(maxTile, rng);
  const cells = assignValuesToShape(blueprint.name, blueprint.coords, base, rng);
  let maxR = 0;
  let maxC = 0;
  for (const cell of cells) {
    if (cell.dr > maxR) maxR = cell.dr;
    if (cell.dc > maxC) maxC = cell.dc;
  }
  return {
    id: `piece-${nextPieceId++}`,
    shapeName: blueprint.name,
    cells,
    width: maxC + 1,
    height: maxR + 1,
  };
}

function pickWeightedBlueprint(rng: () => number): ShapeBlueprint {
  const totalWeight = SHAPE_BLUEPRINTS.reduce((acc, s) => acc + s.weight, 0);
  let roll = rng() * totalWeight;
  for (const bp of SHAPE_BLUEPRINTS) {
    roll -= bp.weight;
    if (roll <= 0) return bp;
  }
  return SHAPE_BLUEPRINTS[0];
}

export function generateTray(
  grid: GridMatrix,
  rng: () => number = Math.random
): (BlockPiece | null)[] {
  const maxTile = Math.max(2, getMaxTileOnGrid(grid));
  const tray: (BlockPiece | null)[] = [];
  for (let i = 0; i < TRAY_SIZE; i++) {
    const bp = pickWeightedBlueprint(rng);
    tray.push(buildPieceFromBlueprint(bp, maxTile, rng));
  }

  // Guarantee at least one playable piece if the board has valid spots for smaller shapes
  if (!hasAnyValidMove(grid, tray)) {
    const fallbackOrder = ['DOMINO_H', 'DOMINO_V', 'SINGLE'];
    for (const name of fallbackOrder) {
      const bp = SHAPE_BLUEPRINTS.find((s) => s.name === name);
      if (!bp) continue;
      const candidate = buildPieceFromBlueprint(bp, maxTile, rng);
      if (findAllValidPlacements(grid, candidate).length > 0) {
        tray[0] = candidate;
        break;
      }
    }
  }

  return tray;
}

export function canPlacePiece(
  grid: GridMatrix,
  piece: BlockPiece,
  anchorRow: number,
  anchorCol: number
): boolean {
  for (const cell of piece.cells) {
    const r = anchorRow + cell.dr;
    const c = anchorCol + cell.dc;
    if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) {
      return false;
    }
    if (grid[r][c] !== null) {
      return false;
    }
  }
  return true;
}

export function findAllValidPlacements(
  grid: GridMatrix,
  piece: BlockPiece
): GridCoord[] {
  const valid: GridCoord[] = [];
  for (let r = 0; r <= GRID_SIZE - piece.height; r++) {
    for (let c = 0; c <= GRID_SIZE - piece.width; c++) {
      if (canPlacePiece(grid, piece, r, c)) {
        valid.push({ r, c });
      }
    }
  }
  return valid;
}

export function hasAnyValidMove(
  grid: GridMatrix,
  tray: (BlockPiece | null)[]
): boolean {
  for (const piece of tray) {
    if (!piece) continue;
    if (findAllValidPlacements(grid, piece).length > 0) {
      return true;
    }
  }
  return false;
}

function findConnectedClusters(grid: GridMatrix): GridCoord[][] {
  const visited: boolean[][] = Array.from({ length: GRID_SIZE }, () =>
    Array(GRID_SIZE).fill(false)
  );
  const clusters: GridCoord[][] = [];
  const dirs = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const startTile = grid[r][c];
      if (!startTile || visited[r][c]) continue;

      const value = startTile.value;
      const queue: GridCoord[] = [{ r, c }];
      const component: GridCoord[] = [];
      visited[r][c] = true;

      while (queue.length > 0) {
        const curr = queue.shift()!;
        component.push(curr);

        for (const [dr, dc] of dirs) {
          const nr = curr.r + dr;
          const nc = curr.c + dc;
          if (
            nr >= 0 &&
            nr < GRID_SIZE &&
            nc >= 0 &&
            nc < GRID_SIZE &&
            !visited[nr][nc]
          ) {
            const neighbor = grid[nr][nc];
            if (neighbor && neighbor.value === value) {
              visited[nr][nc] = true;
              queue.push({ r: nr, c: nc });
            }
          }
        }
      }

      if (component.length >= 3) {
        clusters.push(component);
      }
    }
  }

  return clusters;
}

function chooseMergeTarget(
  cluster: GridCoord[],
  prioritySet: Set<string>,
  centroidR: number,
  centroidC: number
): GridCoord {
  const priorityMatches = cluster.filter((pt) =>
    prioritySet.has(`${pt.r},${pt.c}`)
  );
  const pool = priorityMatches.length > 0 ? priorityMatches : cluster;

  let best = pool[0];
  let bestDist = Infinity;
  for (const pt of pool) {
    const dist =
      Math.abs(pt.r - centroidR) + Math.abs(pt.c - centroidC);
    if (dist < bestDist) {
      bestDist = dist;
      best = pt;
    }
  }
  return best;
}

function resolveMergesAndLines(
  grid: GridMatrix,
  placedCells: GridCoord[]
): {
  placementPoints: number;
  mergeSteps: MergeStep[];
  lineClearStep: LineClearStep | null;
} {
  let placementPoints = 0;
  for (const pt of placedCells) {
    const tile = grid[pt.r][pt.c];
    if (tile) placementPoints += tile.value;
  }

  const centroidR =
    placedCells.reduce((sum, p) => sum + p.r, 0) / Math.max(1, placedCells.length);
  const centroidC =
    placedCells.reduce((sum, p) => sum + p.c, 0) / Math.max(1, placedCells.length);

  let prioritySet = new Set<string>(
    placedCells.map((p) => `${p.r},${p.c}`)
  );

  const mergeSteps: MergeStep[] = [];
  let comboDepth = 1;

  while (true) {
    const clusters = findConnectedClusters(grid);
    if (clusters.length === 0) break;

    const nextPriority = new Set<string>();

    for (const cluster of clusters) {
      const sampleTile = grid[cluster[0].r][cluster[0].c];
      if (!sampleTile) continue;

      const oldValue = sampleTile.value;
      const newValue = oldValue * 2;
      const targetCell = chooseMergeTarget(
        cluster,
        prioritySet,
        centroidR,
        centroidC
      );
      const fromCells = cluster.filter(
        (pt) => pt.r !== targetCell.r || pt.c !== targetCell.c
      );

      for (const fc of fromCells) {
        grid[fc.r][fc.c] = null;
      }

      const targetTile = grid[targetCell.r][targetCell.c];
      if (targetTile) {
        targetTile.value = newValue;
        targetTile.scale = 1.28;
        targetTile.targetScale = 1;
        targetTile.flash = 1;
      }

      const points = newValue * cluster.length * comboDepth;
      mergeSteps.push({
        fromCells,
        targetCell,
        oldValue,
        newValue,
        comboDepth,
        points,
      });

      nextPriority.add(`${targetCell.r},${targetCell.c}`);
    }

    prioritySet = nextPriority;
    comboDepth++;
  }

  // Check full rows and columns
  const fullRows: number[] = [];
  const fullCols: number[] = [];

  for (let r = 0; r < GRID_SIZE; r++) {
    let full = true;
    for (let c = 0; c < GRID_SIZE; c++) {
      if (!grid[r][c]) {
        full = false;
        break;
      }
    }
    if (full) fullRows.push(r);
  }

  for (let c = 0; c < GRID_SIZE; c++) {
    let full = true;
    for (let r = 0; r < GRID_SIZE; r++) {
      if (!grid[r][c]) {
        full = false;
        break;
      }
    }
    if (full) fullCols.push(c);
  }

  let lineClearStep: LineClearStep | null = null;
  if (fullRows.length > 0 || fullCols.length > 0) {
    const clearedMap = new Map<string, { r: number; c: number; value: number }>();

    for (const r of fullRows) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const t = grid[r][c];
        if (t) clearedMap.set(`${r},${c}`, { r, c, value: t.value });
      }
    }
    for (const c of fullCols) {
      for (let r = 0; r < GRID_SIZE; r++) {
        const t = grid[r][c];
        if (t) clearedMap.set(`${r},${c}`, { r, c, value: t.value });
      }
    }

    const clearedCells = Array.from(clearedMap.values());
    let lineSum = 0;
    for (const cell of clearedCells) {
      lineSum += cell.value;
      grid[cell.r][cell.c] = null;
    }

    const totalLines = fullRows.length + fullCols.length;
    const points = lineSum * (1 + totalLines);

    lineClearStep = {
      rows: fullRows,
      cols: fullCols,
      clearedCells,
      points,
    };
  }

  return { placementPoints, mergeSteps, lineClearStep };
}

export function computePlacementPreview(
  grid: GridMatrix,
  piece: BlockPiece,
  anchorRow: number,
  anchorCol: number
): PlacementPreview {
  const targetCells: GridCoord[] = piece.cells.map((cell) => ({
    r: anchorRow + cell.dr,
    c: anchorCol + cell.dc,
  }));

  const valid = canPlacePiece(grid, piece, anchorRow, anchorCol);
  if (!valid) {
    return {
      valid: false,
      anchorRow,
      anchorCol,
      targetCells,
      willMergeCells: [],
      willClearRows: [],
      willClearCols: [],
    };
  }

  const simGrid = cloneGrid(grid);
  for (const cell of piece.cells) {
    const r = anchorRow + cell.dr;
    const c = anchorCol + cell.dc;
    simGrid[r][c] = {
      id: -1,
      value: cell.value,
      scale: 1,
      targetScale: 1,
      offsetX: 0,
      offsetY: 0,
      flash: 0,
    };
  }

  const firstClusters = findConnectedClusters(simGrid);
  const willMergeCells: GridCoord[] = [];
  for (const cluster of firstClusters) {
    for (const pt of cluster) {
      willMergeCells.push(pt);
    }
  }

  const { lineClearStep } = resolveMergesAndLines(simGrid, targetCells);

  return {
    valid: true,
    anchorRow,
    anchorCol,
    targetCells,
    willMergeCells,
    willClearRows: lineClearStep ? lineClearStep.rows : [],
    willClearCols: lineClearStep ? lineClearStep.cols : [],
  };
}

export function applyPiecePlacement(
  grid: GridMatrix,
  tray: (BlockPiece | null)[],
  slotIndex: number,
  anchorRow: number,
  anchorCol: number,
  rng: () => number = Math.random
): TurnResolution | null {
  const piece = tray[slotIndex];
  if (!piece) return null;
  if (!canPlacePiece(grid, piece, anchorRow, anchorCol)) return null;

  const placedCells: GridCoord[] = [];
  for (const cell of piece.cells) {
    const r = anchorRow + cell.dr;
    const c = anchorCol + cell.dc;
    grid[r][c] = {
      id: allocateTileId(),
      value: cell.value,
      scale: 0.65,
      targetScale: 1,
      offsetX: 0,
      offsetY: 0,
      flash: 0.45,
    };
    placedCells.push({ r, c });
  }

  const { placementPoints, mergeSteps, lineClearStep } = resolveMergesAndLines(
    grid,
    placedCells
  );

  const mergePoints = mergeSteps.reduce((acc, s) => acc + s.points, 0);
  const linePoints = lineClearStep ? lineClearStep.points : 0;
  const totalPointsGained = placementPoints + mergePoints + linePoints;
  const maxComboDepth = mergeSteps.reduce(
    (max, s) => Math.max(max, s.comboDepth),
    0
  );

  tray[slotIndex] = null;
  let refilledTray = false;
  const isTrayEmpty = tray.every((item) => item === null);
  if (isTrayEmpty) {
    const fresh = generateTray(grid, rng);
    const mutableTray: (BlockPiece | null)[] = tray;
    for (let i = 0; i < TRAY_SIZE; i++) {
      mutableTray[i] = fresh[i];
    }
    refilledTray = true;
  }

  const newMaxTile = getMaxTileOnGrid(grid);
  const isGameOver = !hasAnyValidMove(grid, tray);

  return {
    placedCells,
    placementPoints,
    mergeSteps,
    lineClearStep,
    totalPointsGained,
    maxComboDepth,
    newMaxTile,
    refilledTray,
    isGameOver,
  };
}

export function createShowcaseGrid(): GridMatrix {
  const grid = createEmptyGrid();
  const preset: [number, number, number][] = [
    [0, 1, 8],
    [0, 4, 16],
    [1, 1, 32],
    [1, 2, 64],
    [1, 4, 4],
    [2, 0, 4],
    [2, 2, 256],
    [2, 3, 128],
    [2, 5, 2],
    [3, 1, 16],
    [3, 2, 512],
    [3, 3, 64],
    [3, 4, 32],
    [4, 1, 8],
    [4, 3, 16],
    [4, 4, 4],
    [5, 2, 2],
    [5, 4, 8],
  ];
  for (const [r, c, value] of preset) {
    grid[r][c] = {
      id: allocateTileId(),
      value,
      scale: 1,
      targetScale: 1,
      offsetX: 0,
      offsetY: 0,
      flash: 0,
    };
  }
  return grid;
}

export function createDailyStarterGrid(
  starterCells: { r: number; c: number; value: number }[]
): GridMatrix {
  const grid = createEmptyGrid();
  for (const cell of starterCells) {
    if (
      cell.r >= 0 &&
      cell.r < GRID_SIZE &&
      cell.c >= 0 &&
      cell.c < GRID_SIZE
    ) {
      grid[cell.r][cell.c] = {
        id: allocateTileId(),
        value: cell.value,
        scale: 0.72,
        targetScale: 1,
        offsetX: 0,
        offsetY: 0,
        flash: 0.4,
      };
    }
  }
  return grid;
}

const BEST_SCORE_KEY = 'neon_block_best_score_v1';
const MUTE_KEY = 'neon_block_muted_v1';

export function loadBestScore(): number {
  try {
    const raw = window.localStorage.getItem(BEST_SCORE_KEY);
    const parsed = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

export function saveBestScore(score: number): void {
  try {
    window.localStorage.setItem(BEST_SCORE_KEY, String(Math.floor(score)));
  } catch {
    // Ignore storage quota or private mode errors
  }
}

export function loadMutedPref(): boolean {
  try {
    return window.localStorage.getItem(MUTE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function saveMutedPref(muted: boolean): void {
  try {
    window.localStorage.setItem(MUTE_KEY, muted ? 'true' : 'false');
  } catch {
    // Ignore storage errors
  }
}
