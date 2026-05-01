import * as Phaser from 'phaser';
import { GameStats } from '../systems/StatsTracker';
import { ShardWallet, BattlePass, PlayerInventory } from '../systems/monetization';
import { UIBridge } from '../ui/UIBridge';
import { FactionId } from '../data/Factions';
import { firstWinAchievementKey, unlockAchievement } from '../data/Achievements';

export interface GameOverData {
  won: boolean;
  wave: number;
  totalWaves: number;
  gold: number;
  towersBuilt: number;
  creepsKilled: number;
  matchMode: string;
  faction: string | null;
  difficulty: string;
  stats?: GameStats;
  isVersus?: boolean;
  lives?: number;
  sendsSent?: number;
  sendsReceived?: number;
  opponentStats?: { stats: GameStats; wave: number; lives: number; sendsSent: number; sendsReceived: number } | null;
  opponentLives?: number;
  heroStats?: { kills: number; deaths: number; damageDealt: number; abilitiesUsed: number; heroName: string } | null;
  /** True if a rewarded continue-ad already played in this match.
   *  GameOverScreen suppresses its post-match interstitial when true
   *  so the player never sees two ads in a row. */
  continueAdShown?: boolean;
  /** Circle Co-op per-player performance rows. Surfaced on the
   *  victory/defeat screen so each player (human or CPU) gets
   *  credit for their contribution. Undefined outside co-op. */
  coopPlayers?: CoopPlayerStats[];
  /** True when the local player is the bot-host in Circle Co-op.
   *  Used to tag the self-row in the roster. */
  coopLocalIndex?: number;
  /** Plan 14: campaign mission summary. Populated only for runs
   *  launched via `MissionRunner.start`. Drives the post-mission
   *  star reveal + Next Mission CTA on GameOverScreen. */
  missionResult?: MissionResultSummary;
}

export interface MissionResultSummary {
  campaignFactionId: string;
  missionIdx: number;
  missionName: string;
  archetypeId: string;
  stars: 0 | 1 | 2 | 3;
  won: boolean;
  /** Each star objective with its evaluated state. The first row is
   *  always "Win the mission"; rows 2 + 3 are the per-mission star2
   *  / star3 labels (omitted if the mission only declared one). */
  objectives: Array<{ label: string; met: boolean }>;
  /** Idx of the next mission to play, or null if this was the last
   *  (or the run was a loss — losing doesn't unlock the next one). */
  nextMissionIdx: number | null;
}

/** One row on the Circle Co-op end screen: identity + what they did
 *  during the match. Built on GameScene shutdown from whatever state
 *  we have locally (bot economies, death handler kills, tower owner
 *  map). Remote humans show their slot faction + kill count; we
 *  don't synthesize their per-tower breakdown. */
export interface CoopPlayerStats {
  playerIndex: number;
  faction: string;
  isBot: boolean;
  isLocal: boolean;
  kills: number;
  towersBuilt: number;
  goldRemaining: number;
}

export class GameOverScene extends Phaser.Scene {
  constructor() { super('GameOverScene'); }

  create(data: GameOverData): void {
    // Earn shards + battle pass XP
    let shardsEarned = 15;
    if (data.won) shardsEarned += 10;
    if (data.matchMode === 'gauntlet') shardsEarned += Math.min(data.wave, 10) * 5;
    ShardWallet.earn(shardsEarned, `Game complete: ${data.matchMode} (wave ${data.wave})`);
    // Pass the faction so first-win-per-faction gets tracked.
    // recordGamePlayed returns true exactly once per faction's
    // inaugural win — use that as the edge trigger for the
    // FIRST_WIN_<FACTION> achievement unlock. Tutorial match is
    // excluded upstream (its matchMode === 'tutorial' short-circuits
    // GameOverScene dispatch).
    const factionId = (data.faction ?? null) as FactionId | null;
    const isFirstFactionWin = PlayerInventory.recordGamePlayed(data.won, factionId);
    if (isFirstFactionWin && factionId) {
      const key = firstWinAchievementKey(factionId);
      if (key) void unlockAchievement(key);
    }
    BattlePass.recordGameComplete(data.wave, data.won);

    // Record challenge events
    BattlePass.recordChallengeEvent('game_completed', 1);
    if (data.won) BattlePass.recordChallengeEvent('game_won', 1);
    if (data.creepsKilled > 0) BattlePass.recordChallengeEvent('creep_killed', data.creepsKilled);
    if (data.wave > 0) BattlePass.recordChallengeEvent('wave_survived', data.wave);
    if (data.matchMode === 'gauntlet' && data.won) BattlePass.recordChallengeEvent('gauntlet_complete', 1);
    if (data.matchMode === 'gauntlet') BattlePass.recordChallengeEvent('gauntlet_stage', Math.min(data.wave, 10));
    if (data.matchMode === 'endless' && data.wave >= 50) BattlePass.recordChallengeEvent('endless_wave_50', 1);
    if (data.towersBuilt > 0) BattlePass.recordChallengeEvent('tower_placed', data.towersBuilt);

    // Save high score
    const score = data.wave * 100 + data.creepsKilled * 2 + (data.won ? 1000 : 0) + data.gold;
    try {
      const key = `td_highscore_${data.matchMode}`;
      const current = parseInt(localStorage.getItem(key) || '0', 10);
      if (score > current) localStorage.setItem(key, String(score));
    } catch (_) {}

    // Hand off to DOM UI
    UIBridge.showGameOver({ ...data, shardsEarned });
  }
}
