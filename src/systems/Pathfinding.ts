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
 * we mitigate that with a **per-cell goal-biased neighbour order**:
 * on each dequeue we rebuild the direction order from the current
 * cell's vector to the goal, preferring the axis with more
 * remaining distance first. This reproduces A*-with-Manhattan
 * tie-breaking (paths hug walls on bending mazes) while the inner
 * loop remains a typed-array BFS — no heap, no heuristic, no
 * string keys.
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

  // Scratch arrays for per-cell goal-biased neighbour ordering. We
  // rebuild the dir order on every dequeue using the *current* cell's
  // vector to the goal, not the start→goal vector — this matters on
  // bending mazes where "toward goal" rotates as you walk. With a
  // fixed start→goal bias, long vertical mazes produced loose, stair-
  // stepping paths because the frozen dir order didn't match the
  // local progress direction. Recomputing per-cell reproduces the
  // A*-with-Manhattan tie-breaking that makes paths hug walls.
  const dcs = [0, 0, 0, 0];
  const drs = [0, 0, 0, 0];

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

    // Goal-biased neighbour order from CURRENT cell. Prefer the axis
    // with more remaining distance first (so long-axis progress wins
    // ties before short-axis), then the other toward-goal axis, then
    // the two away-from-goal dirs. When a signed distance is 0, fall
    // back to +1 so we still emit 4 unique directions.
    const ddc = e.col - cc;
    const ddr = e.row - cr;
    const sdc = ddc > 0 ? 1 : ddc < 0 ? -1 : 1;
    const sdr = ddr > 0 ? 1 : ddr < 0 ? -1 : 1;
    const colFirst = Math.abs(ddc) >= Math.abs(ddr);
    if (colFirst) {
      dcs[0] = sdc; drs[0] = 0;    // primary toward-goal: col axis
      dcs[1] = 0;   drs[1] = sdr;  // secondary toward-goal: row axis
      dcs[2] = 0;   drs[2] = -sdr; // away: row
      dcs[3] = -sdc; drs[3] = 0;   // away: col
    } else {
      dcs[0] = 0;   drs[0] = sdr;
      dcs[1] = sdc; drs[1] = 0;
      dcs[2] = -sdc; drs[2] = 0;
      dcs[3] = 0;   drs[3] = -sdr;
    }

    for (let d = 0; d < 4; d++) {
      const nc = cc + dcs[d];
      const nr = cr + drs[d];

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
