/**
 * PatchEngine — mutation + revert for balance-testing patches.
 *
 * Balance changes are described as a sequence of targeted mutations
 * (tower field, trait field, difficulty field, upgrade stat). The
 * engine records each mutation + a revert thunk, applies them in
 * order, and reverts them in reverse order when `revert()` is called.
 *
 * This is process-local: mutations hit live module state, so every
 * harness worker needs its own process to avoid cross-contamination.
 * The parallel runner uses `worker_threads` where each worker has
 * its own V8 heap + fresh module imports — safe by construction.
 */
import { TOWER_TYPES, TowerUpgrade } from '../../data/TowerTypes';
import { DIFFICULTIES, DifficultyLevel } from '../../data/Difficulty';
import { Trait } from '../../systems/traits/Trait';

type Reverter = () => void;

export class PatchEngine {
  private reverters: Reverter[] = [];

  /** Override a top-level field on a TowerType definition (cost,
   *  damage, range, fireRate, etc). Missing tower ids throw —
   *  catches typos at patch-apply time rather than producing silent
   *  no-ops in the sweep results. */
  patchTower(towerId: string, field: keyof typeof TOWER_TYPES[string], newValue: any): void {
    const t = TOWER_TYPES[towerId];
    if (!t) throw new Error(`patchTower: unknown towerId "${towerId}"`);
    const prev = (t as any)[field];
    (t as any)[field] = newValue;
    this.reverters.push(() => { (t as any)[field] = prev; });
  }

  /** Override a field on a specific level's upgrade stats. The
   *  `level` targets `upgrades[i].level === level`. Throws if the
   *  tower has no matching upgrade entry. */
  patchUpgrade(towerId: string, level: number, field: keyof TowerUpgrade, newValue: any): void {
    const t = TOWER_TYPES[towerId];
    if (!t) throw new Error(`patchUpgrade: unknown towerId "${towerId}"`);
    const upgrade = t.upgrades.find(u => u.level === level);
    if (!upgrade) throw new Error(`patchUpgrade: ${towerId} has no L${level}`);
    const prev = (upgrade as any)[field];
    (upgrade as any)[field] = newValue;
    this.reverters.push(() => { (upgrade as any)[field] = prev; });
  }

  /** Override a field on a specific trait (e.g. `slow_on_hit.factor`).
   *  Mutates the trait object in place. If multiple matching traits
   *  exist only the first is patched — matches our current data shape
   *  where each trait id is unique per tower. */
  patchTrait(towerId: string, traitId: string, field: string, newValue: any): void {
    const t = TOWER_TYPES[towerId];
    if (!t) throw new Error(`patchTrait: unknown towerId "${towerId}"`);
    const trait = (t.traits as Trait[]).find(tr => tr.id === traitId);
    if (!trait) throw new Error(`patchTrait: ${towerId} has no trait "${traitId}"`);
    const prev = (trait as any)[field];
    (trait as any)[field] = newValue;
    this.reverters.push(() => { (trait as any)[field] = prev; });
  }

  /** Override a field on a DifficultyHints entry. Used for global
   *  changes (ramp rate, kill-gold mult, etc). */
  patchDifficulty(level: DifficultyLevel, field: keyof typeof DIFFICULTIES[DifficultyLevel], newValue: any): void {
    const d = DIFFICULTIES[level];
    const prev = (d as any)[field];
    (d as any)[field] = newValue;
    this.reverters.push(() => { (d as any)[field] = prev; });
  }

  /** Replace the upgrades array on a tower wholesale. Used by big
   *  structural changes (e.g. re-introducing a removed tower would
   *  also involve inserting a new TowerType — that's outside this
   *  engine's scope; use a dedicated patch function instead). */
  patchUpgrades(towerId: string, newUpgrades: TowerUpgrade[]): void {
    const t = TOWER_TYPES[towerId];
    if (!t) throw new Error(`patchUpgrades: unknown towerId "${towerId}"`);
    const prev = t.upgrades;
    (t as any).upgrades = newUpgrades;
    this.reverters.push(() => { (t as any).upgrades = prev; });
  }

  /** Roll every applied mutation back to its original value. Safe to
   *  call multiple times; second call is a no-op. */
  revert(): void {
    // Reverse order so layered mutations (patch A then patch A's
    // upgrade) roll back cleanly.
    while (this.reverters.length > 0) {
      const r = this.reverters.pop()!;
      r();
    }
  }
}
