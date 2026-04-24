/**
 * ChangeCatalog — balance-testing patch definitions.
 *
 * Each entry is one candidate tweak. The harness applies each,
 * runs a tournament sweep, measures per-cell delta vs. baseline,
 * reverts, and moves on. No combinatorial explosion — pure A/B.
 *
 * Size + size-ideas are flagged in the description. Start with
 * Nature (buff), Void (nerf), Infernal (nerf) since those are
 * the biggest levers in the current balance signal.
 *
 * Changes reference tower ids by string; `apply(patch)` calls
 * into `PatchEngine` which handles the tower-field-update + revert
 * bookkeeping. IDs are stable (e.g. `nature.1`) so sweep results
 * can be correlated across runs / re-analyzed after the fact.
 */
import { FactionId } from '../../data/Factions';
import { PatchEngine } from './PatchEngine';

export interface BalanceChange {
  /** Stable identifier — used as the result key. `<faction>.<n>` or
   *  `global.<n>`. Never reuse after publishing a dataset. */
  id: string;
  /** Faction this change primarily targets. `global` for
   *  difficulty / kill-gold tweaks that touch every cell. */
  faction: FactionId | 'global';
  /** One-line summary — shown in the report table. Keep it short
   *  so the 150-row output stays scan-friendly. */
  description: string;
  /** Apply the mutation. Called by the harness before each sweep;
   *  must be purely about mutating state via PatchEngine so revert
   *  is automatic. */
  apply: (patch: PatchEngine) => void;
}

// ============================================================
// NATURE — 12 buff candidates
// Nature currently 25-50% easy / 0% normal+. Target band 75-100%
// easy, ~50% normal. All twelve are buff directions.
// ============================================================
const NATURE: BalanceChange[] = [
  { id: 'nature.1', faction: 'nature', description: 'Bramble L1 damage 3→4',
    apply: p => p.patchTower('nature_bramble', 'damage', 4) },
  { id: 'nature.2', faction: 'nature', description: 'Razor branch switch cost 15→10',
    apply: p => p.patchTower('nature_razor_bramble', 'cost', 10) },
  { id: 'nature.3', faction: 'nature', description: 'Razor L3 damage 9→12',
    apply: p => p.patchUpgrade('nature_razor_bramble', 3, 'damage', 12) },
  { id: 'nature.4', faction: 'nature', description: 'Viper damage 8→12',
    apply: p => p.patchTower('nature_viper', 'damage', 12) },
  { id: 'nature.5', faction: 'nature', description: 'Viper cost 40→30',
    apply: p => p.patchTower('nature_viper', 'cost', 30) },
  { id: 'nature.6', faction: 'nature', description: 'Blossom buff 25/15 → 30/18 %',
    apply: p => {
      p.patchTrait('nature_blossom', 'adjacency_buff', 'damagePercent', 0.30);
      p.patchTrait('nature_blossom', 'adjacency_buff', 'ratePercent', 0.18);
    }},
  { id: 'nature.7', faction: 'nature', description: 'Root cost 35→25',
    apply: p => p.patchTower('nature_root', 'cost', 25) },
  { id: 'nature.8', faction: 'nature', description: 'Root slow duration 3000→4000ms',
    apply: p => p.patchTrait('nature_root', 'slow_on_hit', 'duration', 4000) },
  { id: 'nature.9', faction: 'nature', description: 'Spore cost 100→75',
    apply: p => p.patchTower('nature_spore', 'cost', 75) },
  { id: 'nature.10', faction: 'nature', description: 'Vine root chance 0.2→0.30',
    apply: p => p.patchTrait('nature_vine', 'root_on_hit', 'chance', 0.30) },
  { id: 'nature.11', faction: 'nature', description: 'Elder Treant cost 450→350',
    apply: p => p.patchTower('nature_elder', 'cost', 350) },
  // [big] — Sunroot range bump. Bigger splash reach = more per-shot
  // value for Nature's main splash DPS; tests whether the faction's
  // late-game damage wall is about coverage rather than raw damage.
  { id: 'nature.12', faction: 'nature', description: '[big] Sunroot range 3→4 + splash radius 56→72',
    apply: p => {
      p.patchTower('nature_sunroot', 'range', 4);
      p.patchTrait('nature_sunroot', 'splash_damage', 'radius', 72);
    }},
];

// ============================================================
// VOID — 10 nerf candidates
// Void wins 100% on easy/normal/hard and 10% insane with Rush.
// Trim the gold-on-hit + DPS curve to pull hard/insane down.
// ============================================================
const VOID: BalanceChange[] = [
  { id: 'void.1', faction: 'void', description: 'Siphon gold chance 0.4→0.25',
    apply: p => p.patchTrait('void_siphon', 'gold_on_hit', 'chance', 0.25) },
  { id: 'void.2', faction: 'void', description: 'Siphon damage 5→4',
    apply: p => p.patchTower('void_siphon', 'damage', 4) },
  { id: 'void.3', faction: 'void', description: 'Gambler cost 15→20',
    apply: p => p.patchTower('void_gambler', 'cost', 20) },
  { id: 'void.4', faction: 'void', description: 'Spike cost 30→40',
    apply: p => p.patchTower('void_spike', 'cost', 40) },
  { id: 'void.5', faction: 'void', description: 'Spike damage 22→18',
    apply: p => p.patchTower('void_spike', 'damage', 18) },
  { id: 'void.6', faction: 'void', description: 'Rift cost 120→150',
    apply: p => p.patchTower('void_rift', 'cost', 150) },
  { id: 'void.7', faction: 'void', description: 'Oblivion gold chance 0.3→0.2',
    apply: p => p.patchTrait('void_oblivion', 'gold_on_hit', 'chance', 0.2) },
  // [big] — Oblivion cost pushed high enough that it's a real
  // late-game reach, not a mid-game auto-buy once your Siphon
  // stack compounds.
  { id: 'void.8', faction: 'void', description: '[big] Oblivion cost 900→1200',
    apply: p => p.patchTower('void_oblivion', 'cost', 1200) },
  { id: 'void.9', faction: 'void', description: 'Gambler instant-kill chance 0.04→0.03',
    apply: p => p.patchTrait('void_gambler', 'jackpot', 'killChance', 0.03) },
  { id: 'void.10', faction: 'void', description: 'Siphon amount 2→1 (revert EV to 0.4 from 0.8)',
    apply: p => p.patchTrait('void_siphon', 'gold_on_hit', 'amount', 1) },
];

// ============================================================
// INFERNAL — 10 nerf candidates
// Infernal wins 100% on easy/normal. Hard 0% after the last round
// of Imp tweaks — these nerfs aim for 75% easy / 50% normal and
// target Imp + Hellfire + Apocalypse specifically.
// ============================================================
const INFERNAL: BalanceChange[] = [
  { id: 'infernal.1', faction: 'infernal', description: 'Imp cost 12→15',
    apply: p => p.patchTower('infernal_imp', 'cost', 15) },
  { id: 'infernal.2', faction: 'infernal', description: 'Imp damage 12→10',
    apply: p => p.patchTower('infernal_imp', 'damage', 10) },
  { id: 'infernal.3', faction: 'infernal', description: 'Imp expires 4→3 waves',
    apply: p => p.patchTrait('infernal_imp', 'expires_after_waves', 'waves', 3) },
  { id: 'infernal.4', faction: 'infernal', description: 'Hellfire damage 35→28',
    apply: p => p.patchTower('infernal_hellfire', 'damage', 28) },
  { id: 'infernal.5', faction: 'infernal', description: 'Hellfire decay 0.15→0.20 per wave',
    apply: p => p.patchTrait('infernal_hellfire', 'decay_per_wave', 'decayPercent', 0.20) },
  { id: 'infernal.6', faction: 'infernal', description: 'Soul Drain cost 70→90',
    apply: p => p.patchTower('infernal_soul_drain', 'cost', 90) },
  { id: 'infernal.7', faction: 'infernal', description: 'Soul Drain gold/kill 2→1',
    apply: p => p.patchTrait('infernal_soul_drain', 'gold_per_kill_range', 'goldPerKill', 1) },
  { id: 'infernal.8', faction: 'infernal', description: 'Immolate cost 200→250',
    apply: p => p.patchTower('infernal_immolate', 'cost', 250) },
  // [big] — push Apocalypse out of easy reach so greedy Rush
  // games can't auto-win with a mid-game ult drop.
  { id: 'infernal.9', faction: 'infernal', description: '[big] Apocalypse cost 900→1100',
    apply: p => p.patchTower('infernal_apocalypse', 'cost', 1100) },
  { id: 'infernal.10', faction: 'infernal', description: 'Fiend damage 60→50',
    apply: p => p.patchTower('infernal_bomber', 'damage', 50) },
];

export const CATALOG: BalanceChange[] = [
  ...NATURE,
  ...VOID,
  ...INFERNAL,
];

/** Convenience — find a change by id. */
export function findChange(id: string): BalanceChange | null {
  return CATALOG.find(c => c.id === id) ?? null;
}
