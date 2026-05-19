/**
 * PlacementGateController — the "place and approve" accessibility
 * gate for tower placement.
 *
 * Problem: on mobile especially, a stray tap commits a tower
 * placement instantly. There's no "wait, I meant THAT cell" affordance
 * once gold has been deducted. Even on desktop, mis-clicks cost
 * gold + a wasted demolish.
 *
 * Solution: when enabled, the first tap on an empty cell stages
 * a GHOST placement instead of committing. Tick / X buttons appear
 * (via the DOM overlay component) to confirm or cancel; drag or
 * re-tap repositions before commit.
 *
 * This module is the state machine. Pure logic, no Phaser. The
 * scene-side integration:
 *
 *   - `placeGhost(col, row, typeId)` — call when the player taps
 *     an empty cell + placement is otherwise valid (validity gate
 *     stays on the scene side). Replaces any prior pending ghost.
 *   - `moveGhost(col, row)` — call during drag / re-tap to reposition.
 *     No-op if no ghost is pending.
 *   - `startDrag` / `endDrag` — explicit drag-state markers for the
 *     overlay to hide buttons while the player is mid-drag.
 *   - `consumeForCommit()` — call when the tick is pressed. Returns
 *     the pending placement spec + clears state. Scene then runs
 *     its existing place-tower path with the returned spec.
 *   - `cancel()` — call when X is pressed. Clears state silently.
 *   - `getGhost()` — read for rendering.
 *
 * Lifecycle: GameScene constructs ONE instance per scene. Cleared
 * on scene-shutdown via the existing cleanup path (caller invokes
 * `cancel()` if a ghost is pending at teardown).
 *
 * The validity check at placement time (is this cell buildable?
 * is the player past restrictions? is there gold?) stays in
 * `tryBuildTower` — the controller only knows "the player picked
 * this cell." Gold deduction also stays scene-side and happens at
 * commit time, NOT at placeGhost time. Critical: a ghost that
 * never gets committed costs zero gold.
 *
 * Drag mode is a separate flag from the ghost itself so the overlay
 * can hide / fade tick + X while the player is mid-drag (cleaner
 * touch UX — no accidental button presses).
 */

/** What a pending placement carries. The scene's existing place-tower
 *  path needs col/row + the typed tower id; everything else (paths,
 *  gold, traits) is resolved scene-side at commit. */
export interface PendingPlacement {
  col: number;
  row: number;
  towerTypeId: string;
}

export class PlacementGateController {
  private _pending: PendingPlacement | null = null;
  private _dragging: boolean = false;

  /** Stage a ghost placement. Replaces any prior pending ghost
   *  (which is expected — if the player taps a new cell with the
   *  same tower type selected, the ghost moves; if a different type
   *  is selected, the ghost rebuilds). */
  placeGhost(col: number, row: number, towerTypeId: string): void {
    this._pending = { col, row, towerTypeId };
    // Re-staging cancels any in-flight drag.
    this._dragging = false;
  }

  /** Move the ghost to a new cell. No-op if no ghost is pending or
   *  the new cell is the same as the current one (avoids redundant
   *  re-renders during drag). Returns true if state changed. */
  moveGhost(col: number, row: number): boolean {
    if (this._pending === null) return false;
    if (this._pending.col === col && this._pending.row === row) return false;
    this._pending = { ...this._pending, col, row };
    return true;
  }

  startDrag(): void {
    if (this._pending === null) return;
    this._dragging = true;
  }

  endDrag(): void {
    this._dragging = false;
  }

  isDragging(): boolean { return this._dragging; }

  /** Consume the pending placement for commit. Clears state +
   *  returns the spec the caller should execute (or null if no
   *  ghost was pending). */
  consumeForCommit(): PendingPlacement | null {
    const spec = this._pending;
    this._pending = null;
    this._dragging = false;
    return spec;
  }

  /** Cancel the pending placement. Clears state. No-op if nothing
   *  pending. */
  cancel(): void {
    this._pending = null;
    this._dragging = false;
  }

  /** Read the pending ghost. Null when no ghost is staged. */
  getGhost(): Readonly<PendingPlacement> | null {
    return this._pending;
  }

  /** Convenience predicate. */
  isPending(): boolean { return this._pending !== null; }
}
