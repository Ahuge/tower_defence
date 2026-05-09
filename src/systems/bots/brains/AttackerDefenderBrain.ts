/**
 * AttackerDefenderBrain — BalancedBrain tuned for attacker-mode CPU
 * defenders (Plan 12 v3).
 *
 * The plain BalancedBrain treats coverage and ultimate-saving as if
 * the bot were defending its own match. In attacker mode the bot:
 *   - Never panics (its `lives` is 999 — the player's leak counter,
 *     not the bot's HP).
 *   - Has no walls in the Arcane / Coalition kit, so the maze phase
 *     no-ops fast.
 *   - Faces aggressive bursting waves; "coverage is high enough,
 *     just upgrade" leaves the field too thin against player
 *     swarm-bursts.
 *   - Has no sends / frontier wired, so the meta-economy phase is
 *     dead code.
 *
 * Custom params bias the brain toward CONTINUOUS placement: bump
 * `highCoverageRatio` so it rarely feels "covered", floor wall
 * placements (arcane has none anyway), skip ultimate-save, neutralise
 * the panic threshold.
 */
import { BalancedBrain } from './BalancedBrain';
import { registerBrain } from '../BotBrain';

registerBrain('attacker_defender', () => new BalancedBrain({
  // Never feel "covered enough" — keep placing as long as cells +
  // budget allow. Default is 1.5; 5.0 means the bot would need 5×
  // the path-cells worth of coverage before favouring upgrades.
  highCoverageRatio: 5.0,
  // Arcane has no wall tower anyway; explicitly zero so the brain
  // doesn't waste a phase trying.
  maxWallPlacements: 0,
  // Attacker mode bot has 999 fake lives. Disable panic so it
  // doesn't try to spam slow-towers in a fake emergency.
  panicLives: 0,
  // Don't save for the ultimate (Nova at 700g) — better to keep
  // the corridor full of medium towers than hoard for one tower.
  // Field is `number` used as a bool: 1 = skip, 0 = save normally.
  skipUltimateSave: 1,
  // No frontier / no sends in attacker mode — eliminate the meta
  // pass entirely so the brain spends its decision budget on
  // place / upgrade.
  frontierBuyChance: 0,
  sendBuyChance: 0,
}));
