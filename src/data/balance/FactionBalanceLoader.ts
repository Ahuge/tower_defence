/**
 * v5.2 — FactionBalanceLoader
 *
 * Reads `FACTION_BALANCE_<FACTION>_PARAMS` env var (set by brain-search-
 * worker per task) and patches `TOWER_TYPES` for that faction's towers
 * before a match runs. Returns a restore function the caller invokes at
 * match end so concurrent match runs don't see each other's state.
 *
 * Safety invariants:
 *   - Only the named faction's towers are touched. Setting
 *     `FACTION_BALANCE_VOID_PARAMS` cannot mutate Aliens / Infernal / etc.
 *   - Snapshots taken before patching; `restore()` returns each touched
 *     field to its original value.
 *   - Within one node process, matches run sequentially in the brain-
 *     search worker's drain loop, so apply→run→restore is atomic.
 *
 * Knob shape (mirrors FactionBalanceSchema's dot-paths):
 *   `<towerId>.<field>` — patch tower.field
 *   `<towerId>.traits.<traitId>.<param>` — patch the named trait's param
 *
 * Unknown towers / unknown traits / wrong-faction towers are silently
 * skipped (they shouldn't be in the env in the first place; this is
 * defence-in-depth so a stale env var doesn't crash the match).
 */
import { TOWER_TYPES, TowerType } from '../TowerTypes';
import { FACTIONS, FactionId } from '../Factions';

/** Restore handle returned by `applyFactionBalance`. Call at match end. */
export type RestoreFn = () => void;

/** Snapshot of a single tower field's pre-patch value. */
interface FieldSnapshot {
  towerId: string;
  /** 'core' for tower-level fields, 'trait' for trait params. */
  kind: 'core' | 'trait';
  /** For 'trait', the trait id whose param is being patched. */
  traitId?: string;
  /** Field name (`cost`, `damage`, `killChance`, etc.). */
  field: string;
  /** Pre-patch value to restore to. */
  original: unknown;
}

/** Apply the patched params for one faction. Returns a restore fn that
 *  reverts every snapshotted field. Idempotent in the sense that a
 *  second call without restoring first will snapshot already-patched
 *  values (caller's responsibility to pair apply/restore correctly). */
export function applyFactionBalance(faction: FactionId): RestoreFn {
  const envVar = `FACTION_BALANCE_${faction.toUpperCase()}_PARAMS`;
  const raw = (typeof process !== 'undefined' && process.env)
    ? process.env[envVar] : undefined;
  if (!raw) return () => {};

  let params: Record<string, number>;
  try {
    params = JSON.parse(raw) as Record<string, number>;
  } catch {
    return () => {};
  }

  const factionDef = FACTIONS[faction];
  if (!factionDef) return () => {};
  const factionTowerIds = new Set(factionDef.towerIds);

  const snapshots: FieldSnapshot[] = [];

  for (const [key, value] of Object.entries(params)) {
    const parts = key.split('.');
    if (parts.length < 2) continue;
    const towerId = parts[0];
    // Reject knobs that target a tower outside this faction. Defence
    // against stale env vars or misconfigured runs.
    if (!factionTowerIds.has(towerId)) continue;
    const tower = TOWER_TYPES[towerId];
    if (!tower) continue;

    if (parts.length === 2) {
      // Core-stat patch: <towerId>.<field>
      const field = parts[1];
      patchCore(tower, towerId, field, value, snapshots);
    } else if (parts.length === 4 && parts[1] === 'traits') {
      // Trait-param patch: <towerId>.traits.<traitId>.<param>
      const traitId = parts[2];
      const param = parts[3];
      patchTrait(tower, towerId, traitId, param, value, snapshots);
    }
    // Other shapes (upgrade.cost paths etc.) reserved for v5.x; ignored
    // here so the loader stays forward-compatible with future schema
    // extensions.
  }

  return () => {
    // Restore in reverse so layered patches unwind correctly.
    for (let i = snapshots.length - 1; i >= 0; i--) {
      const s = snapshots[i];
      const tower = TOWER_TYPES[s.towerId];
      if (!tower) continue;
      if (s.kind === 'core') {
        (tower as unknown as Record<string, unknown>)[s.field] = s.original;
      } else if (s.kind === 'trait' && s.traitId) {
        const trait = tower.traits.find(t => t.id === s.traitId);
        if (!trait) continue;
        (trait as unknown as Record<string, unknown>)[s.field] = s.original;
      }
    }
  };
}

function patchCore(
  tower: TowerType, towerId: string, field: string,
  value: number, snapshots: FieldSnapshot[],
): void {
  const obj = tower as unknown as Record<string, unknown>;
  if (!(field in obj)) return;
  const original = obj[field];
  // Type guard — only patch numeric fields. Strings (id, name) and
  // booleans (ultimate) are off-limits to v5.
  if (typeof original !== 'number') return;
  snapshots.push({ towerId, kind: 'core', field, original });
  obj[field] = value;
}

function patchTrait(
  tower: TowerType, towerId: string, traitId: string, param: string,
  value: number, snapshots: FieldSnapshot[],
): void {
  const trait = tower.traits.find(t => t.id === traitId);
  if (!trait) return;
  const traitObj = trait as unknown as Record<string, unknown>;
  if (!(param in traitObj)) return;
  const original = traitObj[param];
  if (typeof original !== 'number') return;
  snapshots.push({ towerId, kind: 'trait', traitId, field: param, original });
  traitObj[param] = value;
}
