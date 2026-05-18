/**
 * MercyWatcher — the binding layer between creep lifecycle and
 * ConsecrationManager for Mercy-mode ruins.
 *
 * Responsibilities:
 *
 *   1. Track which creeps are "Watchers" — the bound creature of a
 *      Mercy-mode ruin (the crow-priest at M4, the bride at M7, the
 *      Child at M8, the Heron at M10's Mercy nave).
 *
 *   2. Detect damage to a Watcher and route notifyWatcherDamaged into
 *      ConsecrationManager. Called from the creep takeDamage path
 *      (integration arrives when GreenwardController is wired).
 *
 *   3. Expose an AoE-warning predicate: given a hypothetical splash
 *      tower placement, will its blast radius overlap any live
 *      Watcher's cell? The HUD uses this to red-tint the tower's
 *      range preview when it would fail the mercy condition.
 *
 * Lives separately from ConsecrationManager so the consecration data
 * layer stays focused on claim state. Creep-side hooks + UI predicate
 * cluster here.
 */

import type { ConsecrationManager } from './ConsecrationManager';

/** Where a Watcher sits on the grid + which creep represents her.
 *  The cell coords are needed for the AoE-warning predicate; the
 *  creep id is what the consecration system tracks. */
export interface WatcherBinding {
  creepId: number;
  col: number;
  row: number;
  /** Owning ruin's id — for diagnostics + future per-ruin overlays. */
  ruinId: string;
}

export class MercyWatcherTracker {
  private readonly bindings: Map<number, WatcherBinding> = new Map();
  private readonly liveCreeps: Map<number, { hp: number }> = new Map();
  private readonly consecration: ConsecrationManager;

  constructor(consecration: ConsecrationManager) {
    this.consecration = consecration;
  }

  // ─── Binding ────────────────────────────────────────────────────

  /** Register a creep as a Watcher. Idempotent on the same creepId
   *  (re-binding overwrites). Also forwards to ConsecrationManager
   *  so the manager knows which creep owns the Mercy slot. */
  attach(binding: WatcherBinding, initialHp: number): void {
    this.bindings.set(binding.creepId, binding);
    this.liveCreeps.set(binding.creepId, { hp: initialHp });
    this.consecration.bindWatcher(binding.ruinId, binding.creepId);
  }

  /** Drop a Watcher binding — typically called only on mission end
   *  / scene teardown. Mercy state in ConsecrationManager persists
   *  (the mercyWatcherTouched flag survives the binding's removal). */
  detach(creepId: number): void {
    this.bindings.delete(creepId);
    this.liveCreeps.delete(creepId);
  }

  // ─── Queries ────────────────────────────────────────────────────

  isWatcher(creepId: number): boolean {
    return this.bindings.has(creepId);
  }

  getBinding(creepId: number): WatcherBinding | null {
    return this.bindings.get(creepId) ?? null;
  }

  /** All currently-bound Watchers. Read-only iteration shape. */
  getBindings(): readonly WatcherBinding[] {
    return Array.from(this.bindings.values());
  }

  // ─── Damage hook ────────────────────────────────────────────────

  /** Called from the creep damage path. Compares the new hp against
   *  the last-known hp; if any decrease, marks the watcher damaged.
   *  Returns true if this call flipped the watcher's mercyTouched
   *  state (useful for emitting a one-shot "Mercy lost" event). */
  notifyHpChanged(creepId: number, newHp: number): boolean {
    const binding = this.bindings.get(creepId);
    if (!binding) return false;
    const tracked = this.liveCreeps.get(creepId);
    if (!tracked) return false;
    if (newHp < tracked.hp) {
      // Damage taken. Was the consecration-side flag already set?
      // If so, this is a subsequent hit on an already-failed Mercy
      // — don't return true (we only return true on the FIRST flip).
      const ruin = this.consecration.getRuin(binding.ruinId);
      const wasAlreadyTouched = ruin?.mercyWatcherTouched ?? false;
      this.consecration.notifyWatcherDamaged(creepId);
      tracked.hp = newHp;
      return !wasAlreadyTouched;
    }
    // hp can rise (heal) — track but no flag change.
    tracked.hp = newHp;
    return false;
  }

  // ─── AoE-warning predicate ──────────────────────────────────────

  /** True if a hypothetical tower placement at (centerCol, centerRow)
   *  with splash radius `radiusCells` would cover any currently-bound
   *  Watcher's cell. HUD calls this when the player is hovering a
   *  splash tower over a buildable cell.
   *
   *  `radiusCells` is measured in grid-cell distance (Chebyshev — the
   *  visual splash circle is roughly square at small radii and the
   *  warning should err on the safe side). */
  aoeWouldHitWatcher(centerCol: number, centerRow: number, radiusCells: number): boolean {
    if (radiusCells <= 0) return false;
    for (const b of this.bindings.values()) {
      const dc = Math.abs(b.col - centerCol);
      const dr = Math.abs(b.row - centerRow);
      if (Math.max(dc, dr) <= radiusCells) return true;
    }
    return false;
  }

  /** Closest Watcher to the given cell. Returns null when no
   *  bindings are active. Used by HUD code that wants to surface
   *  "this tower endangers the Watcher at <name>" beyond the
   *  binary aoeWouldHitWatcher predicate. */
  closestWatcher(centerCol: number, centerRow: number): WatcherBinding | null {
    let best: WatcherBinding | null = null;
    let bestDist = Infinity;
    for (const b of this.bindings.values()) {
      const dc = b.col - centerCol;
      const dr = b.row - centerRow;
      const d = dc * dc + dr * dr;
      if (d < bestDist) { bestDist = d; best = b; }
    }
    return best;
  }
}
