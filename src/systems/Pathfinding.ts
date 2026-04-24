/**
 * BFS pathfinding on a 4-directional unit-cost grid.
 *
 * Previous implementation was textbook-slow A* — an `open` array
 * linearly scanned for min-f on every iteration, a `Set<string>`
 * closed set keyed on `"col,row"`, and `open.find(...)` per neighbour
 * lookup making the inner loop ~O(N²). On a 36×26 grid that adds
 * up to hundreds of thousands of ops per call, and `recalcPaths`
 * runs on every tower placement.
 *
 * On a unit-cost 4-directional grid, BFS and A*-with-Manhattan-
 * heuristic both find shortest paths. They can differ in the
 * *shape* of the path when multiple equal-length routes exist —
 * we mitigate that with a **goal-biased neighbour order**: each
 * call computes a per-query `dirs` array that tries the direction
 * pointing toward the goal first, then perpendicular, then away.
 * Paths look A*-like (goal-directed staircase) but the inner loop
 * is a typed-array BFS — no heap, no heuristic, no string keys.
 *
 * Implementation notes:
 *   - Visited tracking: `Uint8Array(cols*rows)` flipped to 1 on
 *     enqueue. Integer key = `row * cols + col`.
 *   - Parent tracking: `Int32Array(cols*rows)` storing the parent
 *     index of each cell. `-1` = no parent (start cell).
 *   - Queue: `Int32Array` with head/tail pointers. Worst-case size
 *     is `cols * rows` since we never enqueue the same cell twice.
 *   - Path reconstruction: walk parents from goal back to start,
 *     then reverse (push + reverse, not unshift — avoids O(N²)).
 */
import { Grid } from './Grid';

export interface PathPoint {
  col: number;
  row: number;
}

/**
 * Stitch a path that visits an ordered list of waypoints between
 * `start` and `end`. Runs BFS independently for each segment and
 * concatenates results, de-duplicating the joining point.
 *
 * Returns null if ANY segment can't route.
 */
export function findPathWithWaypoints(grid: Grid, start: PathPoint, waypoints: PathPoint[], end: PathPoint): PathPoint[] | null {
  const stops: PathPoint[] = [start, ...waypoints, end];
  const full: PathPoint[] = [];
  for (let i = 0; i < stops.length - 1; i++) {
    const segment = findPath(grid, stops[i], stops[i + 1]);
    if (!segment) return null;
    if (i === 0) {
      full.push(...segment);
    } else {
      // Segment starts at stops[i] which is also the last element of
      // `full` — skip the duplicate.
      full.push(...segment.slice(1));
    }
  }
  return full;
}

export function findPath(grid: Grid, start?: PathPoint, end?: PathPoint): PathPoint[] | null {
  const s = start ?? grid.entry;
  const e = end ?? grid.exit;

  const cols = grid.cols;
  const rows = grid.rows;
  const n = cols * rows;

  const sIdx = s.row * cols + s.col;
  const eIdx = e.row * cols + e.col;

  if (sIdx === eIdx) {
    return [{ col: s.col, row: s.row }];
  }

  // Goal-biased neighbour order: try the toward-goal directions
  // first so that when multiple shortest paths exist, BFS picks
  // the one that makes progress early (staircase shape). On a tie
  // (sdx === 0 or sdy === 0) the remaining perpendicular still
  // gets visited — order just matters for which gets visited first.
  const sdc = Math.sign(e.col - s.col);
  const sdr = Math.sign(e.row - s.row);
  // Primary goal dir, secondary goal dir, then away-from-goal.
  // If sdc or sdr is 0 (aligned on that axis), fall back to a
  // canonical order so the neighbour array always has 4 entries.
  const primaryCol = sdc !== 0 ? sdc : 1;
  const primaryRow = sdr !== 0 ? sdr : 1;
  const dirs: [number, number][] = [
    [primaryCol, 0],      // toward goal, col axis
    [0, primaryRow],      // toward goal, row axis
    [-primaryCol, 0],     // away, col axis
    [0, -primaryRow],     // away, row axis
  ];

  // Fixed-capacity typed-array queue. `queue[head..tail)` holds
  // packed cell indices. Capacity = n because we never enqueue a
  // cell twice (visited flag prevents it).
  const queue = new Int32Array(n);
  const visited = new Uint8Array(n);
  const parent = new Int32Array(n);
  // -1 sentinel = "no parent" (start cell) or "unvisited" (anything
  // else). We distinguish by checking the visited flag.
  for (let i = 0; i < n; i++) parent[i] = -1;

  let head = 0;
  let tail = 0;

  queue[tail++] = sIdx;
  visited[sIdx] = 1;

  while (head < tail) {
    const cur = queue[head++];
    const cr = (cur / cols) | 0;
    const cc = cur - cr * cols;

    if (cur === eIdx) {
      // Walk parent chain back to start. Max length = n; push then
      // reverse (in-place) for O(N) reconstruction.
      const reverse: PathPoint[] = [];
      let node = cur;
      while (node !== -1) {
        const r = (node / cols) | 0;
        const c = node - r * cols;
        reverse.push({ col: c, row: r });
        node = parent[node];
      }
      reverse.reverse();
      return reverse;
    }

    for (let d = 0; d < 4; d++) {
      const dc = dirs[d][0];
      const dr = dirs[d][1];
      const nc = cc + dc;
      const nr = cr + dr;

      if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue;
      const nIdx = nr * cols + nc;
      if (visited[nIdx]) continue;
      if (!grid.isWalkable(nc, nr)) continue;

      visited[nIdx] = 1;
      parent[nIdx] = cur;
      queue[tail++] = nIdx;
    }
  }

  return null;
}
