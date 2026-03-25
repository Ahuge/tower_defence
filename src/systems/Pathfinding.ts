import { Grid } from './Grid';

export interface PathPoint {
  col: number;
  row: number;
}

/**
 * A* pathfinding with binary heap open list and flat array closed/g tracking.
 * Optimized for large grids (120×96+).
 */
export function findPath(grid: Grid, start?: PathPoint, end?: PathPoint): PathPoint[] | null {
  const s = start ?? grid.entry;
  const e = end ?? grid.exit;
  const cols = grid.cols;
  const rows = grid.rows;

  if (s.col === e.col && s.row === e.row) return [{ col: s.col, row: s.row }];

  // Flat index for O(1) lookups
  const idx = (col: number, row: number) => row * cols + col;
  const totalCells = cols * rows;

  // g-scores and parent tracking (flat arrays — no string keys)
  const gScore = new Float32Array(totalCells).fill(Infinity);
  const parentIdx = new Int32Array(totalCells).fill(-1);
  const inClosed = new Uint8Array(totalCells);

  // Binary min-heap on f-score
  const heap: number[] = []; // stores flat indices
  const fScore = new Float32Array(totalCells).fill(Infinity);

  const heuristic = (col: number, row: number) =>
    Math.abs(col - e.col) + Math.abs(row - e.row);

  const startIdx = idx(s.col, s.row);
  const endIdx = idx(e.col, e.row);
  gScore[startIdx] = 0;
  fScore[startIdx] = heuristic(s.col, s.row);
  heap.push(startIdx);

  // Heap operations
  const heapSwap = (i: number, j: number) => {
    const tmp = heap[i]; heap[i] = heap[j]; heap[j] = tmp;
  };
  const heapUp = (i: number) => {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (fScore[heap[i]] < fScore[heap[p]]) { heapSwap(i, p); i = p; }
      else break;
    }
  };
  const heapDown = (i: number) => {
    const len = heap.length;
    while (true) {
      let smallest = i;
      const l = 2 * i + 1;
      const r = 2 * i + 2;
      if (l < len && fScore[heap[l]] < fScore[heap[smallest]]) smallest = l;
      if (r < len && fScore[heap[r]] < fScore[heap[smallest]]) smallest = r;
      if (smallest !== i) { heapSwap(i, smallest); i = smallest; }
      else break;
    }
  };
  const heapPop = (): number => {
    const top = heap[0];
    const last = heap.pop()!;
    if (heap.length > 0) { heap[0] = last; heapDown(0); }
    return top;
  };
  const heapPush = (val: number) => {
    heap.push(val);
    heapUp(heap.length - 1);
  };

  const dirs = [0, -1, 0, 1, -1, 0, 1, 0]; // pairs: dc, dr

  while (heap.length > 0) {
    const currentIdx = heapPop();
    if (currentIdx === endIdx) {
      // Reconstruct path
      const path: PathPoint[] = [];
      let ci = currentIdx;
      while (ci !== -1) {
        path.push({ col: ci % cols, row: (ci / cols) | 0 });
        ci = parentIdx[ci];
      }
      path.reverse();
      return path;
    }

    if (inClosed[currentIdx]) continue;
    inClosed[currentIdx] = 1;

    const cc = currentIdx % cols;
    const cr = (currentIdx / cols) | 0;
    const cg = gScore[currentIdx];

    for (let d = 0; d < 8; d += 2) {
      const nc = cc + dirs[d];
      const nr = cr + dirs[d + 1];
      if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue;

      const ni = idx(nc, nr);
      if (inClosed[ni]) continue;
      if (!grid.isWalkable(nc, nr)) continue;

      const ng = cg + 1;
      if (ng < gScore[ni]) {
        gScore[ni] = ng;
        fScore[ni] = ng + heuristic(nc, nr);
        parentIdx[ni] = currentIdx;
        heapPush(ni);
      }
    }
  }

  return null;
}
