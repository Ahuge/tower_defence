/**
 * ChangeCatalog — balance-testing patch definitions.
 *
 * Each entry is one candidate tweak. The harness applies each,
 * runs a tournament sweep, measures per-cell delta vs. baseline,
 * reverts, and moves on. Pure A/B — no combinatorial explosion.
 *
 * Structure by faction:
 *   ~20 changes each × 11 factions = 220 faction-scoped changes
 *   ~10 global changes (difficulty ramp, kill gold, starting gold)
 *
 * Tag conventions:
 *   [big]  — structural change; worth extra caution when reviewing
 *   [buff] — intended to help the faction (marker for under-performers)
 *   [nerf] — intended to pull win rate down (marker for over-performers)
 *   [tune] — direction-neutral — could go either way
 */
import { FactionId } from '../../data/Factions';
import { PatchEngine } from './PatchEngine';

export interface BalanceChange {
  id: string;
  faction: FactionId | 'global';
  description: string;
  apply: (patch: PatchEngine) => void;
}

// ============================================================
// ARCANE — over-performing; 20 nerf candidates
// ============================================================
const ARCANE: BalanceChange[] = [
  { id: 'arcane.1',  faction: 'arcane', description: '[nerf] Bolt damage 12→10',
    apply: p => p.patchTower('arcane_bolt', 'damage', 10) },
  { id: 'arcane.2',  faction: 'arcane', description: '[nerf] Bolt cost 25→30',
    apply: p => p.patchTower('arcane_bolt', 'cost', 30) },
  { id: 'arcane.3',  faction: 'arcane', description: '[nerf] Bolt fireRate 700→900',
    apply: p => p.patchTower('arcane_bolt', 'fireRate', 900) },
  { id: 'arcane.4',  faction: 'arcane', description: '[nerf] Bolt range 3.5→3',
    apply: p => p.patchTower('arcane_bolt', 'range', 3) },
  { id: 'arcane.5',  faction: 'arcane', description: '[nerf] Frost slow factor 0.35→0.5 (weaker)',
    apply: p => p.patchTrait('arcane_frost', 'slow_on_hit', 'factor', 0.5) },
  { id: 'arcane.6',  faction: 'arcane', description: '[nerf] Frost slow duration 2500→1800ms',
    apply: p => p.patchTrait('arcane_frost', 'slow_on_hit', 'duration', 1800) },
  { id: 'arcane.7',  faction: 'arcane', description: '[nerf] Storm damage 22→18',
    apply: p => p.patchTower('arcane_storm', 'damage', 18) },
  { id: 'arcane.8',  faction: 'arcane', description: '[nerf] Storm splash radius 72→56',
    apply: p => p.patchTrait('arcane_storm', 'splash_damage', 'radius', 56) },
  { id: 'arcane.9',  faction: 'arcane', description: '[nerf] Focus damage 55→45',
    apply: p => p.patchTower('arcane_focus', 'damage', 45) },
  { id: 'arcane.10', faction: 'arcane', description: '[nerf] Focus crit chance 0.25→0.15',
    apply: p => p.patchTrait('arcane_focus', 'crit_chance', 'chance', 0.15) },
  { id: 'arcane.11', faction: 'arcane', description: '[nerf] Focus range 7→6',
    apply: p => p.patchTower('arcane_focus', 'range', 6) },
  { id: 'arcane.12', faction: 'arcane', description: '[nerf] Focus cost 90→110',
    apply: p => p.patchTower('arcane_focus', 'cost', 110) },
  { id: 'arcane.13', faction: 'arcane', description: '[nerf] Drain cost 120→150',
    apply: p => p.patchTower('arcane_drain', 'cost', 150) },
  { id: 'arcane.14', faction: 'arcane', description: '[nerf] Meteor cost 200→250',
    apply: p => p.patchTower('arcane_meteor', 'cost', 250) },
  { id: 'arcane.15', faction: 'arcane', description: '[nerf] Meteor splash 96→72',
    apply: p => p.patchTrait('arcane_meteor', 'splash_damage', 'radius', 72) },
  { id: 'arcane.16', faction: 'arcane', description: '[nerf] Meteor damage 100→80',
    apply: p => p.patchTower('arcane_meteor', 'damage', 80) },
  { id: 'arcane.17', faction: 'arcane', description: '[big][nerf] Nova cost 700→900',
    apply: p => p.patchTower('arcane_nova', 'cost', 900) },
  { id: 'arcane.18', faction: 'arcane', description: '[nerf] Nova damage 200→150',
    apply: p => p.patchTower('arcane_nova', 'damage', 150) },
  { id: 'arcane.19', faction: 'arcane', description: '[nerf] Storm cost 55→75',
    apply: p => p.patchTower('arcane_storm', 'cost', 75) },
  { id: 'arcane.20', faction: 'arcane', description: '[nerf] Bolt fireRate 700→800 (mild)',
    apply: p => p.patchTower('arcane_bolt', 'fireRate', 800) },
];

// ============================================================
// MECHANICAL — over-performing easy, mid normal; 20 mixed
// ============================================================
const MECHANICAL: BalanceChange[] = [
  { id: 'mech.1',  faction: 'mechanical', description: '[nerf] Wall cost 10→15',
    apply: p => p.patchTower('mech_wall', 'cost', 15) },
  { id: 'mech.2',  faction: 'mechanical', description: '[tune] Turret damage 10→12',
    apply: p => p.patchTower('mech_turret', 'damage', 12) },
  { id: 'mech.3',  faction: 'mechanical', description: '[nerf] Turret fireRate 800→1000 (slower)',
    apply: p => p.patchTower('mech_turret', 'fireRate', 1000) },
  { id: 'mech.4',  faction: 'mechanical', description: '[nerf] Turret ramp reduction 0.08→0.05',
    apply: p => p.patchTrait('mech_turret', 'ramp_up', 'reductionPerStack', 0.05) },
  { id: 'mech.5',  faction: 'mechanical', description: '[nerf] Flamethrower burn dps 8→5',
    apply: p => p.patchTrait('mech_flamethrower', 'burn_dot', 'dps', 5) },
  { id: 'mech.6',  faction: 'mechanical', description: '[nerf] Flamethrower splash 32→24',
    apply: p => p.patchTrait('mech_flamethrower', 'splash_damage', 'radius', 24) },
  { id: 'mech.7',  faction: 'mechanical', description: '[nerf] Tesla damage 18→14',
    apply: p => p.patchTower('mech_tesla', 'damage', 14) },
  { id: 'mech.8',  faction: 'mechanical', description: '[nerf] Tesla chain count 2→1 base',
    apply: p => p.patchTrait('mech_tesla', 'chain_damage', 'chainCount', 1) },
  { id: 'mech.9',  faction: 'mechanical', description: '[nerf] Mortar cost 120→150',
    apply: p => p.patchTower('mech_mortar', 'cost', 150) },
  { id: 'mech.10', faction: 'mechanical', description: '[nerf] Mortar splash 64→48',
    apply: p => p.patchTrait('mech_mortar', 'splash_damage', 'radius', 48) },
  { id: 'mech.11', faction: 'mechanical', description: '[nerf] Mortar damage 50→40',
    apply: p => p.patchTower('mech_mortar', 'damage', 40) },
  { id: 'mech.12', faction: 'mechanical', description: '[nerf] Shredder shred 1→0 (no shred)',
    apply: p => p.patchTrait('mech_shredder', 'armor_shred_on_hit', 'shredAmount', 0) },
  { id: 'mech.13', faction: 'mechanical', description: '[nerf] Railgun cost 300→400',
    apply: p => p.patchTower('mech_railgun', 'cost', 400) },
  { id: 'mech.14', faction: 'mechanical', description: '[nerf] Railgun damage 120→90',
    apply: p => p.patchTower('mech_railgun', 'damage', 90) },
  { id: 'mech.15', faction: 'mechanical', description: '[big][nerf] Titan cost 800→1100',
    apply: p => p.patchTower('mech_titan', 'cost', 1100) },
  { id: 'mech.16', faction: 'mechanical', description: '[nerf] Titan damage 500→400',
    apply: p => p.patchTower('mech_titan', 'damage', 400) },
  { id: 'mech.17', faction: 'mechanical', description: '[nerf] Flamethrower cost 40→55',
    apply: p => p.patchTower('mech_flamethrower', 'cost', 55) },
  { id: 'mech.18', faction: 'mechanical', description: '[nerf] Tesla cost 80→100',
    apply: p => p.patchTower('mech_tesla', 'cost', 100) },
  { id: 'mech.19', faction: 'mechanical', description: '[buff] Tesla range 3→3.5',
    apply: p => p.patchTower('mech_tesla', 'range', 3.5) },
  { id: 'mech.20', faction: 'mechanical', description: '[nerf] Shredder fireRate 350→450',
    apply: p => p.patchTower('mech_shredder', 'fireRate', 450) },
];

// ============================================================
// NATURE — under-performing; 20 buff candidates
// ============================================================
const NATURE: BalanceChange[] = [
  { id: 'nature.1',  faction: 'nature', description: '[buff] Bramble L1 damage 3→4',
    apply: p => p.patchTower('nature_bramble', 'damage', 4) },
  { id: 'nature.2',  faction: 'nature', description: '[buff] Razor branch cost 15→10',
    apply: p => p.patchTower('nature_razor_bramble', 'cost', 10) },
  { id: 'nature.3',  faction: 'nature', description: '[buff] Razor L3 damage 9→12',
    apply: p => p.patchUpgrade('nature_razor_bramble', 3, 'damage', 12) },
  { id: 'nature.4',  faction: 'nature', description: '[buff] Viper damage 8→12',
    apply: p => p.patchTower('nature_viper', 'damage', 12) },
  { id: 'nature.5',  faction: 'nature', description: '[buff] Viper cost 40→30',
    apply: p => p.patchTower('nature_viper', 'cost', 30) },
  { id: 'nature.6',  faction: 'nature', description: '[buff] Blossom 25/15 → 30/18 %',
    apply: p => {
      p.patchTrait('nature_blossom', 'adjacency_buff', 'damagePercent', 0.30);
      p.patchTrait('nature_blossom', 'adjacency_buff', 'ratePercent', 0.18);
    }},
  { id: 'nature.7',  faction: 'nature', description: '[buff] Root cost 35→25',
    apply: p => p.patchTower('nature_root', 'cost', 25) },
  { id: 'nature.8',  faction: 'nature', description: '[buff] Root slow duration 3000→4000ms',
    apply: p => p.patchTrait('nature_root', 'slow_on_hit', 'duration', 4000) },
  { id: 'nature.9',  faction: 'nature', description: '[buff] Spore cost 100→75',
    apply: p => p.patchTower('nature_spore', 'cost', 75) },
  { id: 'nature.10', faction: 'nature', description: '[buff] Vine root chance 0.2→0.30',
    apply: p => p.patchTrait('nature_vine', 'root_on_hit', 'chance', 0.30) },
  { id: 'nature.11', faction: 'nature', description: '[buff] Elder cost 450→350',
    apply: p => p.patchTower('nature_elder', 'cost', 350) },
  { id: 'nature.12', faction: 'nature', description: '[big][buff] Sunroot range 3→4 + splash 56→72',
    apply: p => {
      p.patchTower('nature_sunroot', 'range', 4);
      p.patchTrait('nature_sunroot', 'splash_damage', 'radius', 72);
    }},
  { id: 'nature.13', faction: 'nature', description: '[buff] Bramble fireRate 400→300 (faster)',
    apply: p => p.patchTower('nature_bramble', 'fireRate', 300) },
  { id: 'nature.14', faction: 'nature', description: '[buff] Bramble range 1.2→1.5',
    apply: p => p.patchTower('nature_bramble', 'range', 1.5) },
  { id: 'nature.15', faction: 'nature', description: '[buff] Root damage 3→5',
    apply: p => p.patchTower('nature_root', 'damage', 5) },
  { id: 'nature.16', faction: 'nature', description: '[buff] Viper range 2.5→3',
    apply: p => p.patchTower('nature_viper', 'range', 3) },
  { id: 'nature.17', faction: 'nature', description: '[buff] Blossom range 1.5→2.5 (bigger aura)',
    apply: p => p.patchTower('nature_blossom', 'range', 2.5) },
  { id: 'nature.18', faction: 'nature', description: '[buff] Spore poison 2%/s → 3%/s',
    apply: p => p.patchTrait('nature_spore', 'poison_dot', 'percentPerSec', 0.03) },
  { id: 'nature.19', faction: 'nature', description: '[buff] Spore aura radius 96→120',
    apply: p => p.patchTrait('nature_spore', 'tower_aura_damage', 'radius', 120) },
  { id: 'nature.20', faction: 'nature', description: '[buff] Vine damage 14→18',
    apply: p => p.patchTower('nature_vine', 'damage', 18) },
];

// ============================================================
// VOID — hard winner; 20 nerf candidates
// ============================================================
const VOID: BalanceChange[] = [
  { id: 'void.1',  faction: 'void', description: '[nerf] Siphon gold chance 0.4→0.25',
    apply: p => p.patchTrait('void_siphon', 'gold_on_hit', 'chance', 0.25) },
  { id: 'void.2',  faction: 'void', description: '[nerf] Siphon damage 5→4',
    apply: p => p.patchTower('void_siphon', 'damage', 4) },
  { id: 'void.3',  faction: 'void', description: '[nerf] Siphon cost 50→70',
    apply: p => p.patchTower('void_siphon', 'cost', 70) },
  { id: 'void.4',  faction: 'void', description: '[nerf] Siphon amount 2→1 (halve EV)',
    apply: p => p.patchTrait('void_siphon', 'gold_on_hit', 'amount', 1) },
  { id: 'void.5',  faction: 'void', description: '[nerf] Gambler cost 15→20',
    apply: p => p.patchTower('void_gambler', 'cost', 20) },
  { id: 'void.6',  faction: 'void', description: '[nerf] Gambler kill chance 0.04→0.03',
    apply: p => p.patchTrait('void_gambler', 'jackpot', 'killChance', 0.03) },
  { id: 'void.7',  faction: 'void', description: '[nerf] Gambler miss chance 0.25→0.35',
    apply: p => p.patchTrait('void_gambler', 'jackpot', 'missChance', 0.35) },
  { id: 'void.8',  faction: 'void', description: '[nerf] Gambler fireRate 1000→1500',
    apply: p => p.patchTower('void_gambler', 'fireRate', 1500) },
  { id: 'void.9',  faction: 'void', description: '[nerf] Spike cost 30→40',
    apply: p => p.patchTower('void_spike', 'cost', 40) },
  { id: 'void.10', faction: 'void', description: '[nerf] Spike damage 22→18',
    apply: p => p.patchTower('void_spike', 'damage', 18) },
  { id: 'void.11', faction: 'void', description: '[nerf] Spike variance 0.5-1.5 → 0.3-1.3',
    apply: p => {
      p.patchTrait('void_spike', 'damage_variance', 'min', 0.3);
      p.patchTrait('void_spike', 'damage_variance', 'max', 1.3);
    }},
  { id: 'void.12', faction: 'void', description: '[nerf] Rift cost 120→160',
    apply: p => p.patchTower('void_rift', 'cost', 160) },
  { id: 'void.13', faction: 'void', description: '[nerf] Rift teleport steps 4→2 (base)',
    apply: p => p.patchTrait('void_rift', 'teleport_delivery', 'stepsBase', 2) },
  { id: 'void.14', faction: 'void', description: '[nerf] Rift fireRate 3500→4500',
    apply: p => p.patchTower('void_rift', 'fireRate', 4500) },
  { id: 'void.15', faction: 'void', description: '[nerf] Oblivion gold chance 0.3→0.2',
    apply: p => p.patchTrait('void_oblivion', 'gold_on_hit', 'chance', 0.2) },
  { id: 'void.16', faction: 'void', description: '[big][nerf] Oblivion cost 900→1200',
    apply: p => p.patchTower('void_oblivion', 'cost', 1200) },
  { id: 'void.17', faction: 'void', description: '[nerf] Oblivion damage 80→60',
    apply: p => p.patchTower('void_oblivion', 'damage', 60) },
  { id: 'void.18', faction: 'void', description: '[nerf] Oblivion kill chance 0.15→0.10',
    apply: p => p.patchTrait('void_oblivion', 'jackpot', 'killChance', 0.10) },
  { id: 'void.19', faction: 'void', description: '[nerf] Oblivion variance 0.5-2.5 → 0.5-2.0',
    apply: p => p.patchTrait('void_oblivion', 'damage_variance', 'max', 2.0) },
  { id: 'void.20', faction: 'void', description: '[nerf] Gambler damage 25→20',
    apply: p => p.patchTower('void_gambler', 'damage', 20) },
];

// ============================================================
// MILITARY — stuck at 0% hard; 20 mixed
// ============================================================
const MILITARY: BalanceChange[] = [
  { id: 'mil.1',  faction: 'military', description: '[nerf] Sandbag cost 8→12',
    apply: p => p.patchTower('mil_sandbag', 'cost', 12) },
  { id: 'mil.2',  faction: 'military', description: '[buff] Wire slow factor 0.6→0.5 (stronger slow)',
    apply: p => p.patchTrait('mil_wire', 'barbed_wire', 'factor', 0.5) },
  { id: 'mil.3',  faction: 'military', description: '[nerf] Wire cost 25→35',
    apply: p => p.patchTower('mil_wire', 'cost', 35) },
  { id: 'mil.4',  faction: 'military', description: '[nerf] Rifleman damage via mobile cooldown 700→900',
    apply: p => {
      p.patchTower('mil_rifleman', 'fireRate', 900);
      p.patchTrait('mil_rifleman', 'mobile_unit', 'attackCooldown', 900);
    }},
  { id: 'mil.5',  faction: 'military', description: '[buff] Rifleman damage 14→18 via cost unchanged',
    apply: p => p.patchTower('mil_rifleman', 'damage', 18) },
  { id: 'mil.6',  faction: 'military', description: '[nerf] Brawler damage 22→18',
    apply: p => p.patchTower('mil_brawler', 'damage', 18) },
  { id: 'mil.7',  faction: 'military', description: '[buff] Brawler moveSpeed 140→180',
    apply: p => p.patchTrait('mil_brawler', 'mobile_unit', 'moveSpeed', 180) },
  { id: 'mil.8',  faction: 'military', description: '[nerf] Tank cost 120→150',
    apply: p => p.patchTower('mil_heavy', 'cost', 150) },
  { id: 'mil.9',  faction: 'military', description: '[nerf] Tank damage 30→22',
    apply: p => p.patchTower('mil_heavy', 'damage', 22) },
  { id: 'mil.10', faction: 'military', description: '[nerf] Tank splash 48→36',
    apply: p => p.patchTrait('mil_heavy', 'splash_damage', 'radius', 36) },
  { id: 'mil.11', faction: 'military', description: '[nerf] Tank fireRate 2000→2500',
    apply: p => p.patchTower('mil_heavy', 'fireRate', 2500) },
  { id: 'mil.12', faction: 'military', description: '[big][nerf] Commander cost 750→1000',
    apply: p => p.patchTower('mil_commander', 'cost', 1000) },
  { id: 'mil.13', faction: 'military', description: '[nerf] Commander damage 40→32',
    apply: p => p.patchTower('mil_commander', 'damage', 32) },
  { id: 'mil.14', faction: 'military', description: '[nerf] Rifleman engageRange 2.5→2',
    apply: p => p.patchTrait('mil_rifleman', 'mobile_unit', 'engageRange', 2) },
  { id: 'mil.15', faction: 'military', description: '[buff] Rifleman range 3→3.5',
    apply: p => p.patchTower('mil_rifleman', 'range', 3.5) },
  { id: 'mil.16', faction: 'military', description: '[buff] Brawler damage 22→28',
    apply: p => p.patchTower('mil_brawler', 'damage', 28) },
  { id: 'mil.17', faction: 'military', description: '[buff] Tank damage 30→38',
    apply: p => p.patchTower('mil_heavy', 'damage', 38) },
  { id: 'mil.18', faction: 'military', description: '[buff] Commander damage 40→55',
    apply: p => p.patchTower('mil_commander', 'damage', 55) },
  { id: 'mil.19', faction: 'military', description: '[buff] Wire range 1.5→2',
    apply: p => p.patchTower('mil_wire', 'range', 2) },
  { id: 'mil.20', faction: 'military', description: '[buff] Rifleman cost 40→30',
    apply: p => p.patchTower('mil_rifleman', 'cost', 30) },
];

// ============================================================
// ALIENS — over-performing; 20 nerf candidates
// ============================================================
const ALIENS: BalanceChange[] = [
  { id: 'alien.1',  faction: 'aliens', description: '[nerf] Spitter cost 12→18',
    apply: p => p.patchTower('alien_spitter', 'cost', 18) },
  { id: 'alien.2',  faction: 'aliens', description: '[nerf] Spitter damage 3→2',
    apply: p => p.patchTower('alien_spitter', 'damage', 2) },
  { id: 'alien.3',  faction: 'aliens', description: '[nerf] Spitter fireRate 250→400',
    apply: p => p.patchTower('alien_spitter', 'fireRate', 400) },
  { id: 'alien.4',  faction: 'aliens', description: '[nerf] Stinger cost 25→35',
    apply: p => p.patchTower('alien_stinger', 'cost', 35) },
  { id: 'alien.5',  faction: 'aliens', description: '[nerf] Stinger damage 4→3',
    apply: p => p.patchTower('alien_stinger', 'damage', 3) },
  { id: 'alien.6',  faction: 'aliens', description: '[nerf] Stinger poison 1%→0.5%/s',
    apply: p => p.patchTrait('alien_stinger', 'poison_dot', 'percentPerSec', 0.005) },
  { id: 'alien.7',  faction: 'aliens', description: '[nerf] Swarm Node cost 60→90',
    apply: p => p.patchTower('alien_swarm_node', 'cost', 90) },
  { id: 'alien.8',  faction: 'aliens', description: '[nerf] Swarm Node aura 20%→10%',
    apply: p => p.patchTrait('alien_swarm_node', 'faction_speed_aura', 'ratePercent', 0.10) },
  { id: 'alien.9',  faction: 'aliens', description: '[nerf] Acid cost 100→140',
    apply: p => p.patchTower('alien_acid', 'cost', 140) },
  { id: 'alien.10', faction: 'aliens', description: '[nerf] Acid damage 8→6',
    apply: p => p.patchTower('alien_acid', 'damage', 6) },
  { id: 'alien.11', faction: 'aliens', description: '[nerf] Acid splash 40→28',
    apply: p => p.patchTrait('alien_acid', 'splash_damage', 'radius', 28) },
  { id: 'alien.12', faction: 'aliens', description: '[nerf] Hive Spire damage 12→9',
    apply: p => p.patchTower('alien_hive_spire', 'damage', 9) },
  { id: 'alien.13', faction: 'aliens', description: '[nerf] Hive Spire cost 180→240',
    apply: p => p.patchTower('alien_hive_spire', 'cost', 240) },
  { id: 'alien.14', faction: 'aliens', description: '[nerf] Hive Spire chain count 4→2',
    apply: p => p.patchTrait('alien_hive_spire', 'chain_damage', 'chainCount', 2) },
  { id: 'alien.15', faction: 'aliens', description: '[nerf] Swarmling cost 15→25',
    apply: p => p.patchTower('alien_swarmling', 'cost', 25) },
  { id: 'alien.16', faction: 'aliens', description: '[nerf] Swarmling damage 6→4',
    apply: p => p.patchTower('alien_swarmling', 'damage', 4) },
  { id: 'alien.17', faction: 'aliens', description: '[nerf] Brood Mother cost 80→110',
    apply: p => p.patchTower('alien_brood_mother', 'cost', 110) },
  { id: 'alien.18', faction: 'aliens', description: '[nerf] Brood commander buff 20/15 → 12/10 %',
    apply: p => {
      p.patchTrait('alien_brood_mother', 'commander_aura', 'damagePercent', 0.12);
      p.patchTrait('alien_brood_mother', 'commander_aura', 'ratePercent', 0.10);
    }},
  { id: 'alien.19', faction: 'aliens', description: '[big][nerf] Overmind cost 700→1000',
    apply: p => p.patchTower('alien_overmind', 'cost', 1000) },
  { id: 'alien.20', faction: 'aliens', description: '[nerf] Overmind faction-speed aura 30%→15%',
    apply: p => p.patchTrait('alien_overmind', 'faction_speed_aura', 'ratePercent', 0.15) },
];

// ============================================================
// CYPHERPUNK — stuck normal; 20 mixed
// ============================================================
const CYPHERPUNK: BalanceChange[] = [
  { id: 'cyber.1',  faction: 'cypherpunk', description: '[buff] Ping damage 5→7',
    apply: p => p.patchTower('cyber_ping', 'damage', 7) },
  { id: 'cyber.2',  faction: 'cypherpunk', description: '[buff] Ping fireRate 900→700',
    apply: p => p.patchTower('cyber_ping', 'fireRate', 700) },
  { id: 'cyber.3',  faction: 'cypherpunk', description: '[nerf] Ping cost 15→25',
    apply: p => p.patchTower('cyber_ping', 'cost', 25) },
  { id: 'cyber.4',  faction: 'cypherpunk', description: '[nerf] Ping range 8→6',
    apply: p => p.patchTower('cyber_ping', 'range', 6) },
  { id: 'cyber.5',  faction: 'cypherpunk', description: '[buff] Firewall link range 8→10',
    apply: p => p.patchTrait('cyber_firewall', 'firewall_link', 'linkRange', 10) },
  { id: 'cyber.6',  faction: 'cypherpunk', description: '[buff] Firewall dps 35→50',
    apply: p => p.patchTrait('cyber_firewall', 'firewall_link', 'dps', 50) },
  { id: 'cyber.7',  faction: 'cypherpunk', description: '[nerf] Firewall cost 35→50',
    apply: p => p.patchTower('cyber_firewall', 'cost', 50) },
  { id: 'cyber.8',  faction: 'cypherpunk', description: '[buff] Virus spread range 2→3',
    apply: p => p.patchTrait('cyber_virus', 'virus_spread', 'spreadRange', 3) },
  { id: 'cyber.9',  faction: 'cypherpunk', description: '[buff] Virus dps 10→15',
    apply: p => p.patchTrait('cyber_virus', 'virus_spread', 'dps', 15) },
  { id: 'cyber.10', faction: 'cypherpunk', description: '[buff] Virus duration 4000→6000ms',
    apply: p => p.patchTrait('cyber_virus', 'virus_spread', 'duration', 6000) },
  { id: 'cyber.11', faction: 'cypherpunk', description: '[buff] Backdoor duration 1500→2500',
    apply: p => p.patchTrait('cyber_backdoor', 'hack_reverse', 'duration', 2500) },
  { id: 'cyber.12', faction: 'cypherpunk', description: '[buff] Backdoor cost 90→70',
    apply: p => p.patchTower('cyber_backdoor', 'cost', 70) },
  { id: 'cyber.13', faction: 'cypherpunk', description: '[buff] DDoS root duration 500→1000',
    apply: p => p.patchTrait('cyber_ddos', 'root_on_hit', 'duration', 1000) },
  { id: 'cyber.14', faction: 'cypherpunk', description: '[nerf] DDoS cost 150→200',
    apply: p => p.patchTower('cyber_ddos', 'cost', 200) },
  { id: 'cyber.15', faction: 'cypherpunk', description: '[buff] Rootkit armor shred 2→3',
    apply: p => p.patchTrait('cyber_rootkit', 'armor_shred_on_hit', 'shredAmount', 3) },
  { id: 'cyber.16', faction: 'cypherpunk', description: '[buff] Rootkit shred duration 6000→9000',
    apply: p => p.patchTrait('cyber_rootkit', 'armor_shred_on_hit', 'duration', 9000) },
  { id: 'cyber.17', faction: 'cypherpunk', description: '[buff] Zero Day damage 30→45',
    apply: p => p.patchTower('cyber_zeroday', 'damage', 45) },
  { id: 'cyber.18', faction: 'cypherpunk', description: '[big][buff] Zero Day cost 800→600',
    apply: p => p.patchTower('cyber_zeroday', 'cost', 600) },
  { id: 'cyber.19', faction: 'cypherpunk', description: '[buff] Firewall beam slow 0.35→0.5 (weaker)',
    apply: p => p.patchTrait('cyber_firewall', 'firewall_link', 'slowFactor', 0.5) },
  { id: 'cyber.20', faction: 'cypherpunk', description: '[buff] Virus cost 55→40',
    apply: p => p.patchTower('cyber_virus', 'cost', 40) },
];

// ============================================================
// INFERNAL — over-performing easy/normal; 20 nerf candidates
// ============================================================
const INFERNAL: BalanceChange[] = [
  { id: 'infernal.1',  faction: 'infernal', description: '[nerf] Imp cost 12→15',
    apply: p => p.patchTower('infernal_imp', 'cost', 15) },
  { id: 'infernal.2',  faction: 'infernal', description: '[nerf] Imp damage 12→10',
    apply: p => p.patchTower('infernal_imp', 'damage', 10) },
  { id: 'infernal.3',  faction: 'infernal', description: '[nerf] Imp fireRate 700→900',
    apply: p => p.patchTower('infernal_imp', 'fireRate', 900) },
  { id: 'infernal.4',  faction: 'infernal', description: '[nerf] Imp expires 4→3 waves',
    apply: p => p.patchTrait('infernal_imp', 'expires_after_waves', 'waves', 3) },
  { id: 'infernal.5',  faction: 'infernal', description: '[nerf] Imp range 3→2.5',
    apply: p => p.patchTower('infernal_imp', 'range', 2.5) },
  { id: 'infernal.6',  faction: 'infernal', description: '[nerf] Hellfire damage 35→28',
    apply: p => p.patchTower('infernal_hellfire', 'damage', 28) },
  { id: 'infernal.7',  faction: 'infernal', description: '[nerf] Hellfire decay 0.15→0.20/wave',
    apply: p => p.patchTrait('infernal_hellfire', 'decay_per_wave', 'decayPercent', 0.20) },
  { id: 'infernal.8',  faction: 'infernal', description: '[nerf] Hellfire cost 45→60',
    apply: p => p.patchTower('infernal_hellfire', 'cost', 60) },
  { id: 'infernal.9',  faction: 'infernal', description: '[nerf] Hellfire burn dps 12→8',
    apply: p => p.patchTrait('infernal_hellfire', 'burn_dot', 'dps', 8) },
  { id: 'infernal.10', faction: 'infernal', description: '[nerf] Hellfire splash 48→36',
    apply: p => p.patchTrait('infernal_hellfire', 'splash_damage', 'radius', 36) },
  { id: 'infernal.11', faction: 'infernal', description: '[nerf] Soul Drain cost 70→90',
    apply: p => p.patchTower('infernal_soul_drain', 'cost', 90) },
  { id: 'infernal.12', faction: 'infernal', description: '[nerf] Soul Drain gold/kill 2→1',
    apply: p => p.patchTrait('infernal_soul_drain', 'gold_per_kill_range', 'goldPerKill', 1) },
  { id: 'infernal.13', faction: 'infernal', description: '[nerf] Soul Drain damage 18→14',
    apply: p => p.patchTower('infernal_soul_drain', 'damage', 14) },
  { id: 'infernal.14', faction: 'infernal', description: '[nerf] Fiend damage 60→45',
    apply: p => p.patchTower('infernal_bomber', 'damage', 45) },
  { id: 'infernal.15', faction: 'infernal', description: '[nerf] Fiend cost 20→30',
    apply: p => p.patchTower('infernal_bomber', 'cost', 30) },
  { id: 'infernal.16', faction: 'infernal', description: '[nerf] Immolate cost 200→250',
    apply: p => p.patchTower('infernal_immolate', 'cost', 250) },
  { id: 'infernal.17', faction: 'infernal', description: '[nerf] Immolate damage 40→30',
    apply: p => p.patchTower('infernal_immolate', 'damage', 30) },
  { id: 'infernal.18', faction: 'infernal', description: '[nerf] Immolate burn dps 15→10',
    apply: p => p.patchTrait('infernal_immolate', 'burn_dot', 'dps', 10) },
  { id: 'infernal.19', faction: 'infernal', description: '[big][nerf] Apocalypse cost 900→1200',
    apply: p => p.patchTower('infernal_apocalypse', 'cost', 1200) },
  { id: 'infernal.20', faction: 'infernal', description: '[nerf] Apocalypse damage 80→60',
    apply: p => p.patchTower('infernal_apocalypse', 'damage', 60) },
];

// ============================================================
// CELESTIAL — stuck; 20 buff candidates
// ============================================================
const CELESTIAL: BalanceChange[] = [
  { id: 'celest.1',  faction: 'celestial', description: '[buff] Acolyte damage 10→14',
    apply: p => p.patchTower('celestial_acolyte', 'damage', 14) },
  { id: 'celest.2',  faction: 'celestial', description: '[buff] Acolyte life chance 5%→10%',
    apply: p => p.patchTrait('celestial_acolyte', 'life_on_kill', 'chance', 0.10) },
  { id: 'celest.3',  faction: 'celestial', description: '[buff] Acolyte cost 25→20',
    apply: p => p.patchTower('celestial_acolyte', 'cost', 20) },
  { id: 'celest.4',  faction: 'celestial', description: '[buff] Acolyte fireRate 800→600',
    apply: p => p.patchTower('celestial_acolyte', 'fireRate', 600) },
  { id: 'celest.5',  faction: 'celestial', description: '[buff] Ward range 4→6',
    apply: p => p.patchTower('celestial_ward', 'range', 6) },
  { id: 'celest.6',  faction: 'celestial', description: '[buff] Ward cost 40→25',
    apply: p => p.patchTower('celestial_ward', 'cost', 25) },
  { id: 'celest.7',  faction: 'celestial', description: '[buff] Smite damage 45→60',
    apply: p => p.patchTower('celestial_smite', 'damage', 60) },
  { id: 'celest.8',  faction: 'celestial', description: '[buff] Smite boss bonus 50%→100%',
    apply: p => p.patchTrait('celestial_smite', 'bonus_vs_boss', 'bonus', 1.0) },
  { id: 'celest.9',  faction: 'celestial', description: '[buff] Smite fireRate 1800→1400',
    apply: p => p.patchTower('celestial_smite', 'fireRate', 1400) },
  { id: 'celest.10', faction: 'celestial', description: '[buff] Smite cost 80→65',
    apply: p => p.patchTower('celestial_smite', 'cost', 65) },
  { id: 'celest.11', faction: 'celestial', description: '[buff] Smite range 4→5.5',
    apply: p => p.patchTower('celestial_smite', 'range', 5.5) },
  { id: 'celest.12', faction: 'celestial', description: '[buff] Sanctuary charges 1→2',
    apply: p => p.patchTrait('celestial_sanctuary', 'leak_absorb', 'maxCharges', 2) },
  { id: 'celest.13', faction: 'celestial', description: '[buff] Sanctuary recharge 10→7 waves',
    apply: p => p.patchTrait('celestial_sanctuary', 'leak_absorb', 'rechargeWaves', 7) },
  { id: 'celest.14', faction: 'celestial', description: '[buff] Sanctuary cost 150→100',
    apply: p => p.patchTower('celestial_sanctuary', 'cost', 100) },
  { id: 'celest.15', faction: 'celestial', description: '[buff] Sanctuary damage 15→25',
    apply: p => p.patchTower('celestial_sanctuary', 'damage', 25) },
  { id: 'celest.16', faction: 'celestial', description: '[big][buff] Absolution cost 600→450',
    apply: p => p.patchTower('celestial_absolution', 'cost', 450) },
  { id: 'celest.17', faction: 'celestial', description: '[buff] Absolution damage 60→90',
    apply: p => p.patchTower('celestial_absolution', 'damage', 90) },
  { id: 'celest.18', faction: 'celestial', description: '[buff] Absolution life chance 10%→20%',
    apply: p => p.patchTrait('celestial_absolution', 'life_on_kill', 'chance', 0.20) },
  { id: 'celest.19', faction: 'celestial', description: '[buff] Acolyte range 3.5→4.5',
    apply: p => p.patchTower('celestial_acolyte', 'range', 4.5) },
  { id: 'celest.20', faction: 'celestial', description: '[buff] Ward fireRate (already 99999 — skip)',
    apply: p => p.patchTower('celestial_ward', 'fireRate', 99999) },
];

// ============================================================
// PSIONIC — stuck; 20 buff candidates (true-damage identity)
// ============================================================
const PSIONIC: BalanceChange[] = [
  { id: 'psi.1',  faction: 'psionic', description: '[buff] Probe damage 8→12',
    apply: p => p.patchTower('psi_probe', 'damage', 12) },
  { id: 'psi.2',  faction: 'psionic', description: '[buff] Probe range 3→4',
    apply: p => p.patchTower('psi_probe', 'range', 4) },
  { id: 'psi.3',  faction: 'psionic', description: '[buff] Probe cost 20→15',
    apply: p => p.patchTower('psi_probe', 'cost', 15) },
  { id: 'psi.4',  faction: 'psionic', description: '[buff] Probe fireRate 700→500',
    apply: p => p.patchTower('psi_probe', 'fireRate', 500) },
  { id: 'psi.5',  faction: 'psionic', description: '[buff] Mesmer damage 6→10',
    apply: p => p.patchTower('psi_mesmer', 'damage', 10) },
  { id: 'psi.6',  faction: 'psionic', description: '[buff] Mesmer confuse duration 1200→2000ms',
    apply: p => p.patchTrait('psi_mesmer', 'confuse_on_hit', 'duration', 2000) },
  { id: 'psi.7',  faction: 'psionic', description: '[buff] Mesmer cost 45→35',
    apply: p => p.patchTower('psi_mesmer', 'cost', 35) },
  { id: 'psi.8',  faction: 'psionic', description: '[buff] Mesmer fireRate 2500→1800',
    apply: p => p.patchTower('psi_mesmer', 'fireRate', 1800) },
  { id: 'psi.9',  faction: 'psionic', description: '[buff] Terror damage 12→18',
    apply: p => p.patchTower('psi_terror', 'damage', 18) },
  { id: 'psi.10', faction: 'psionic', description: '[buff] Terror slow 0.5→0.4 (stronger slow)',
    apply: p => p.patchTrait('psi_terror', 'slow_aura', 'factor', 0.4) },
  { id: 'psi.11', faction: 'psionic', description: '[buff] Terror range 3.5→4.5',
    apply: p => p.patchTower('psi_terror', 'range', 4.5) },
  { id: 'psi.12', faction: 'psionic', description: '[buff] Terror cost 80→65',
    apply: p => p.patchTower('psi_terror', 'cost', 65) },
  { id: 'psi.13', faction: 'psionic', description: '[buff] Mind Spike damage 55→75',
    apply: p => p.patchTower('psi_mind_spike', 'damage', 75) },
  { id: 'psi.14', faction: 'psionic', description: '[buff] Mind Spike mage bonus 50%→100%',
    apply: p => p.patchTrait('psi_mind_spike', 'bonus_vs_mage', 'bonus', 1.0) },
  { id: 'psi.15', faction: 'psionic', description: '[buff] Mind Spike range 7→8',
    apply: p => p.patchTower('psi_mind_spike', 'range', 8) },
  { id: 'psi.16', faction: 'psionic', description: '[buff] Mind Spike cost 150→120',
    apply: p => p.patchTower('psi_mind_spike', 'cost', 120) },
  { id: 'psi.17', faction: 'psionic', description: '[buff] Mind Spike fireRate 2500→1800',
    apply: p => p.patchTower('psi_mind_spike', 'fireRate', 1800) },
  { id: 'psi.18', faction: 'psionic', description: '[big][buff] Overmind cost 750→550',
    apply: p => p.patchTower('psi_overmind', 'cost', 550) },
  { id: 'psi.19', faction: 'psionic', description: '[buff] Overmind damage 100→140',
    apply: p => p.patchTower('psi_overmind', 'damage', 140) },
  { id: 'psi.20', faction: 'psionic', description: '[buff] Overmind fireRate 2000→1400',
    apply: p => p.patchTower('psi_overmind', 'fireRate', 1400) },
];

// ============================================================
// HARMONIC — middling; 20 mixed (buff synergy, tune individually)
// ============================================================
const HARMONIC: BalanceChange[] = [
  { id: 'harm.1',  faction: 'harmonic', description: '[buff] Resonator damage 8→12',
    apply: p => p.patchTower('harmonic_resonator', 'damage', 12) },
  { id: 'harm.2',  faction: 'harmonic', description: '[buff] Resonator cost 20→15',
    apply: p => p.patchTower('harmonic_resonator', 'cost', 15) },
  { id: 'harm.3',  faction: 'harmonic', description: '[buff] Resonator fireRate 700→500',
    apply: p => p.patchTower('harmonic_resonator', 'fireRate', 500) },
  { id: 'harm.4',  faction: 'harmonic', description: '[buff] Amplifier 20%→30%',
    apply: p => p.patchTrait('harmonic_amplifier', 'damage_aura', 'percent', 0.30) },
  { id: 'harm.5',  faction: 'harmonic', description: '[buff] Amplifier cost 30→20',
    apply: p => p.patchTower('harmonic_amplifier', 'cost', 20) },
  { id: 'harm.6',  faction: 'harmonic', description: '[buff] Quickener 15%→25%',
    apply: p => p.patchTrait('harmonic_quickener', 'rate_aura', 'percent', 0.25) },
  { id: 'harm.7',  faction: 'harmonic', description: '[buff] Quickener cost 40→30',
    apply: p => p.patchTower('harmonic_quickener', 'cost', 30) },
  { id: 'harm.8',  faction: 'harmonic', description: '[buff] Reach tiles 1.5→2.5',
    apply: p => p.patchTrait('harmonic_reach', 'range_aura', 'tiles', 2.5) },
  { id: 'harm.9',  faction: 'harmonic', description: '[buff] Reach cost 50→35',
    apply: p => p.patchTower('harmonic_reach', 'cost', 35) },
  { id: 'harm.10', faction: 'harmonic', description: '[buff] Critical Mass chance 15%→25%',
    apply: p => p.patchTrait('harmonic_critical_mass', 'crit_aura', 'chance', 0.25) },
  { id: 'harm.11', faction: 'harmonic', description: '[buff] Critical Mass multiplier 2→3',
    apply: p => p.patchTrait('harmonic_critical_mass', 'crit_aura', 'multiplier', 3) },
  { id: 'harm.12', faction: 'harmonic', description: '[buff] Critical Mass cost 80→60',
    apply: p => p.patchTower('harmonic_critical_mass', 'cost', 60) },
  { id: 'harm.13', faction: 'harmonic', description: '[buff] Conduit links 2→4',
    apply: p => p.patchTrait('harmonic_conduit', 'conduit_link', 'maxLinks', 4) },
  { id: 'harm.14', faction: 'harmonic', description: '[buff] Conduit link range 6→8',
    apply: p => p.patchTrait('harmonic_conduit', 'conduit_link', 'linkRange', 8) },
  { id: 'harm.15', faction: 'harmonic', description: '[buff] Conduit cost 100→75',
    apply: p => p.patchTower('harmonic_conduit', 'cost', 75) },
  { id: 'harm.16', faction: 'harmonic', description: '[big][buff] Crescendo cost 650→450',
    apply: p => p.patchTower('harmonic_crescendo', 'cost', 450) },
  { id: 'harm.17', faction: 'harmonic', description: '[buff] Crescendo damage 30→45',
    apply: p => p.patchTower('harmonic_crescendo', 'damage', 45) },
  { id: 'harm.18', faction: 'harmonic', description: '[buff] Crescendo range 5→6',
    apply: p => p.patchTower('harmonic_crescendo', 'range', 6) },
  { id: 'harm.19', faction: 'harmonic', description: '[buff] Resonator range 3.5→4',
    apply: p => p.patchTower('harmonic_resonator', 'range', 4) },
  { id: 'harm.20', faction: 'harmonic', description: '[buff] Amplifier range 4→5 (aura reach)',
    apply: p => p.patchTower('harmonic_amplifier', 'range', 5) },
];

// ============================================================
// GLOBAL — difficulty ramp, kill gold, starting gold
// Each touches all 11 factions so it gets the full tournament matrix.
// ============================================================
const GLOBAL: BalanceChange[] = [
  { id: 'global.1',  faction: 'global', description: '[nerf] Normal ramp 0.005 → 0.010/wave',
    apply: p => p.patchDifficulty('normal', 'toughnessPerWave', 0.010) },
  { id: 'global.2',  faction: 'global', description: '[buff] Normal ramp 0.005 → 0.003/wave (easier normal)',
    apply: p => p.patchDifficulty('normal', 'toughnessPerWave', 0.003) },
  { id: 'global.3',  faction: 'global', description: '[buff] Hard ramp 0.015 → 0.010/wave (restore hard winnability)',
    apply: p => p.patchDifficulty('hard', 'toughnessPerWave', 0.010) },
  { id: 'global.4',  faction: 'global', description: '[buff] Insane ramp 0.025 → 0.018/wave',
    apply: p => p.patchDifficulty('insane', 'toughnessPerWave', 0.018) },
  { id: 'global.5',  faction: 'global', description: '[nerf] Hard ramp 0.015 → 0.020/wave (harder)',
    apply: p => p.patchDifficulty('hard', 'toughnessPerWave', 0.020) },
  { id: 'global.6',  faction: 'global', description: '[nerf] Normal toughness 1.0 → 1.2',
    apply: p => p.patchDifficulty('normal', 'toughness', 1.2) },
  { id: 'global.7',  faction: 'global', description: '[buff] Normal count 1.0 → 0.8 (fewer creeps)',
    apply: p => p.patchDifficulty('normal', 'count', 0.8) },
  { id: 'global.8',  faction: 'global', description: '[nerf] Insane toughness 3.5 → 4.5',
    apply: p => p.patchDifficulty('insane', 'toughness', 4.5) },
  { id: 'global.9',  faction: 'global', description: '[nerf] Hard goldMult 0.6 → 0.4 (less kill gold)',
    apply: p => p.patchDifficulty('hard', 'goldMult', 0.4) },
  { id: 'global.10', faction: 'global', description: '[buff] Hard goldMult 0.6 → 0.8',
    apply: p => p.patchDifficulty('hard', 'goldMult', 0.8) },
  { id: 'global.11', faction: 'global', description: '[buff] Normal count 1.0 → 0.7 + toughness 1.0 → 1.2',
    apply: p => {
      p.patchDifficulty('normal', 'count', 0.7);
      p.patchDifficulty('normal', 'toughness', 1.2);
    }},
  { id: 'global.12', faction: 'global', description: '[big] Insane speed 1.35 → 1.2 (calmer pace)',
    apply: p => p.patchDifficulty('insane', 'speed', 1.2) },
  // Compound re-shapes: start closer to the lower tier, ramp harder.
  // Harness run 2026-04-24T16-55-42 showed hard/insane die at wave
  // ~2-3 — the per-wave ramp never engages. Pull base toughness/speed
  // down; keep count close to current so spatial pressure survives;
  // keep gold penalty so the tier still feels economy-starved.
  { id: 'global.13', faction: 'global', description: '[big][buff] Hard re-shape: soft start, steep ramp (tough 2.0→1.0, count 1.6→1.5, speed 1.2→1.1, gold unchanged, ramp 0.015→0.13 — anchors wave 10 to old hard wave 10)',
    apply: p => {
      p.patchDifficulty('hard', 'toughness', 1.0);
      p.patchDifficulty('hard', 'count', 1.5);
      p.patchDifficulty('hard', 'speed', 1.1);
      p.patchDifficulty('hard', 'toughnessPerWave', 0.13);
    }},
  { id: 'global.14', faction: 'global', description: '[big][buff] Insane re-shape: soft start, steep ramp (tough 3.5→1.3, count 2.0→1.8, speed 1.35→1.2, gold unchanged, ramp 0.025→0.24 — anchors wave 10 to old insane wave 10)',
    apply: p => {
      p.patchDifficulty('insane', 'toughness', 1.3);
      p.patchDifficulty('insane', 'count', 1.8);
      p.patchDifficulty('insane', 'speed', 1.2);
      p.patchDifficulty('insane', 'toughnessPerWave', 0.24);
    }},
];

export const CATALOG: BalanceChange[] = [
  ...ARCANE,
  ...MECHANICAL,
  ...NATURE,
  ...VOID,
  ...MILITARY,
  ...ALIENS,
  ...CYPHERPUNK,
  ...INFERNAL,
  ...CELESTIAL,
  ...PSIONIC,
  ...HARMONIC,
  ...GLOBAL,
];

/** Convenience — find a change by id. */
export function findChange(id: string): BalanceChange | null {
  return CATALOG.find(c => c.id === id) ?? null;
}
