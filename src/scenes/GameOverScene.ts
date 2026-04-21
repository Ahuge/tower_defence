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
