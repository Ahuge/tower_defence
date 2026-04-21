import { Grid } from './Grid';
import { GRID_COLS } from '../config';

interface Node {
  col: number;
  row: number;
  g: number;
  h: number;
  f: number;
  parent: Node | null;
}

export interface PathPoint {
  col: number;
  row: number;
}

/**
 * Stitch a path that visits an ordered list of waypoints between
 * `start` and `end`. Runs A* independently for each segment and
 * concatenates results, de-duplicating the joining point (so the
 * final path doesn't list the same cell twice where two segments
 * meet).
 *
 * Used by circle co-op maps where each spawner declares an
 * `entry`, ordered `waypoints[]`, and `exit` so creeps must
 * physically traverse the full circuit rather than A*-shortcut
 * directly from entry to exit.
 *
 * Returns null if ANY segment can't route — the whole chain fails
 * because a creep can't skip a blocked waypoint. Callers can fall
 * back to a plain `findPath(start, end)` in that case if they want
 * a best-effort route.
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
      // The segment starts at stops[i] which is also the last
      // element of `full` — skip the duplicate.
      full.push(...segment.slice(1));
    }
  }
  return full;
}

export function findPath(grid: Grid, start?: PathPoint, end?: PathPoint): PathPoint[] | null {
  const s = start ?? grid.entry;
  const e = end ?? grid.exit;

  const open: Node[] = [];
  const closed = new Set<string>();

  const key = (col: number, row: number) => `${col},${row}`;
  const heuristic = (col: number, row: number) =>
    Math.abs(col - e.col) + Math.abs(row - e.row);

  const startNode: Node = {
    col: s.col,
    row: s.row,
    g: 0,
    h: heuristic(s.col, s.row),
    f: heuristic(s.col, s.row),
    parent: null,
  };

  open.push(startNode);

  // 4-directional movement
  const dirs = [
    [0, -1], [0, 1], [-1, 0], [1, 0],
  ];

  while (open.length > 0) {
    // Find lowest f
    let bestIdx = 0;
    for (let i = 1; i < open.length; i++) {
      if (open[i].f < open[bestIdx].f) bestIdx = i;
    }
    const current = open.splice(bestIdx, 1)[0];

    if (current.col === e.col && current.row === e.row) {
      // Reconstruct path
      const path: PathPoint[] = [];
      let node: Node | null = current;
      while (node) {
        path.unshift({ col: node.col, row: node.row });
        node = node.parent;
      }
      return path;
    }

    closed.add(key(current.col, current.row));

    for (const [dc, dr] of dirs) {
      const nc = current.col + dc;
      const nr = current.row + dr;

      if (nc < 0 || nc >= grid.cols || nr < 0 || nr >= grid.rows) continue;
      if (!grid.isWalkable(nc, nr)) continue;
      if (closed.has(key(nc, nr))) continue;

      const g = current.g + 1;
      const h = heuristic(nc, nr);
      const f = g + h;

      const existing = open.find(n => n.col === nc && n.row === nr);
      if (existing) {
        if (g < existing.g) {
          existing.g = g;
          existing.f = f;
          existing.parent = current;
        }
        continue;
      }

      open.push({ col: nc, row: nr, g, h, f, parent: current });
    }
  }

  return null; // No path found
}
