/**
 * ComboGenerator — synthesise multi-change catalog entries.
 *
 * The single-change catalog can't answer "what if both mil.1 and
 * mil.2 are applied?" — every patch applied independently means
 * combined effects (e.g. cost↑ + dmg↓ together producing a usable
 * tower) are invisible. This module composes existing changes into
 * subsets of size 2 and 3 (with single-change pass-through), keeps
 * only the subsets whose members touch DISJOINT data fields, and
 * emits them as new BalanceChange entries with composite ids and
 * descriptions.
 *
 * Triples support an "empty third slot" implicitly — a triple is
 * generated when three disjoint members exist, but pairs and
 * singles are emitted alongside, so any subset of size 1, 2, or 3
 * gets a catalog entry. The user spec phrased this as "support the
 * third being empty"; we just include all subset sizes ≤ N.
 *
 * Conflict rule: two changes conflict if they touch the same
 * (entity.field) key. e.g. `mech_turret.damage = 12` and
 * `mech_turret.damage = 14` would be redundant if combined; the
 * second overwrites the first. We derive the touched keys by
 * running each change's `apply()` against a TrackingPatch shim.
 *
 * The combinatorial volume can be large (per faction with ~20
 * changes: ~150 disjoint pairs, ~600 disjoint triples). Callers
 * should pair this with `seedsPerCell ≤ 100` and a tight brain
 * matrix to keep run time bounded — see HARNESS docs.
 */
import { BalanceChange } from './ChangeCatalog';
import { PatchEngine } from './PatchEngine';

/** Run a change's apply() against a tracking shim that captures
 *  every (entity.field) key it touches without mutating real state.
 *  Two changes are "disjoint" iff their key sets don't intersect. */
export function getTargetKeys(change: BalanceChange): string[] {
  const tracker = new TrackingPatch();
  try {
    change.apply(tracker as unknown as PatchEngine);
  } catch {
    // A change whose apply() does something unexpected (e.g. checks
    // a state field) is treated as "no known keys" — it'll combine
    // with anything but contributes no conflict. Better than dropping
    // it from combos entirely.
    return [];
  }
  return tracker.keys;
}

class TrackingPatch {
  keys: string[] = [];
  patchTower(towerId: string, field: string, _v: unknown): void {
    this.keys.push(`tower.${towerId}.${field}`);
  }
  patchUpgrade(towerId: string, level: number, field: string, _v: unknown): void {
    this.keys.push(`upgrade.${towerId}.L${level}.${field}`);
  }
  patchTrait(towerId: string, traitId: string, field: string, _v: unknown): void {
    this.keys.push(`trait.${towerId}.${traitId}.${field}`);
  }
  patchDifficulty(level: string, field: string, _v: unknown): void {
    this.keys.push(`difficulty.${level}.${field}`);
  }
  patchUpgrades(towerId: string, _u: unknown): void {
    this.keys.push(`upgrades.${towerId}.*`);
  }
}

/** Generate every disjoint subset of size 1..maxSize from `pool`,
 *  grouping by faction (combos only span members of the same
 *  faction — cross-faction combos are explicitly out of scope, since
 *  they'd inflate volume by an order of magnitude with little
 *  signal). Singles are passed through unchanged so the caller can
 *  use the result as a drop-in replacement for CATALOG.
 *
 *  Limits cap the per-faction triple count so a 20-change faction
 *  doesn't generate ~1000 triples. The cap takes the highest-
 *  variance triples first — for now, alphabetic by id, since variance
 *  isn't known until after the first sweep. Future: pre-rank by
 *  baseline single-change abs(netDelta) and combine top-K. */
export interface ComboOptions {
  maxSize: 1 | 2 | 3;
  /** Per-faction cap on triples emitted. Pairs uncapped (volume is
   *  manageable). Default: 100 triples per faction. */
  triplesPerFaction?: number;
}

export function expandCombos(pool: BalanceChange[], opts: ComboOptions): BalanceChange[] {
  const tripleCap = opts.triplesPerFaction ?? 100;
  const out: BalanceChange[] = [];

  // Always include singles — pairs and triples layer on top, they
  // don't replace.
  out.push(...pool);
  if (opts.maxSize === 1) return out;

  // Group by faction. Combos don't span factions.
  const byFaction = new Map<string, BalanceChange[]>();
  for (const c of pool) {
    const arr = byFaction.get(c.faction);
    if (arr) arr.push(c); else byFaction.set(c.faction, [c]);
  }

  // Pre-compute target keys once per change. Cheap (one apply() per
  // change) but worth caching since pair generation calls it O(n²)
  // times in the naive form.
  const keysByChange = new Map<string, Set<string>>();
  for (const c of pool) keysByChange.set(c.id, new Set(getTargetKeys(c)));

  for (const [faction, members] of byFaction) {
    // Stable sort by id so subset enumeration is deterministic.
    members.sort((a, b) => a.id.localeCompare(b.id));

    // Pairs.
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        if (!disjoint(keysByChange.get(members[i].id)!, keysByChange.get(members[j].id)!)) continue;
        out.push(combine([members[i], members[j]], faction));
      }
    }

    if (opts.maxSize < 3) continue;

    // Triples. Cap per faction to keep run volume bounded.
    let triplesEmitted = 0;
    outer:
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        const ki = keysByChange.get(members[i].id)!;
        const kj = keysByChange.get(members[j].id)!;
        if (!disjoint(ki, kj)) continue;
        const kij = new Set([...ki, ...kj]);
        for (let k = j + 1; k < members.length; k++) {
          if (!disjoint(kij, keysByChange.get(members[k].id)!)) continue;
          out.push(combine([members[i], members[j], members[k]], faction));
          if (++triplesEmitted >= tripleCap) break outer;
        }
      }
    }
  }
  return out;
}

function disjoint<T>(a: Set<T>, b: Set<T>): boolean {
  for (const x of a) if (b.has(x)) return false;
  return true;
}

/** Compose N changes into one BalanceChange whose apply() runs each
 *  member's apply() in order. Id is `combo.<faction>.<sorted member ids>`,
 *  description prepends `[combo:N]` so the report ranking shows it. */
function combine(members: BalanceChange[], faction: string): BalanceChange {
  const ids = members.map(m => m.id).sort();
  const id = `combo.${faction}.${ids.join('+')}`;
  const description = `[combo:${members.length}] ` + members.map(m => m.description).join(' · ');
  return {
    id,
    faction: members[0].faction,
    description,
    apply: (patch) => { for (const m of members) m.apply(patch); },
  };
}
