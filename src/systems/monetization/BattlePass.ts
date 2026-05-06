/**
 * BattlePass — seasonal progression system with free and premium tracks.
 */
import { StorePersistence, ChallengeProgress } from './StorePersistence';
import { ShardWallet } from './ShardWallet';
import { PlayerInventory } from './PlayerInventory';
import { BP_XP_PER_LEVEL, BP_MAX_LEVEL, BATTLE_PASS_SHARD_COST } from './StoreDefinitions';
import { Analytics } from '../AnalyticsClient';

export type RewardType = 'shards' | 'skin' | 'terrain' | 'faction' | 'perk';

export interface PassReward {
  level: number;
  type: RewardType;
  shards?: number;
  skinId?: string;
  terrainId?: string;
  factionId?: string;
  perkId?: string;
  label: string;
}

export interface SeasonDef {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  freeTrack: PassReward[];
  premiumTrack: PassReward[];
}

export interface ChallengeTemplate {
  id: string;
  description: string;
  target: number;
  xpReward: number;
  type: 'daily' | 'weekly';
  eventKey: string;
  param?: string;
}

const SEASON_1: SeasonDef = {
  id: 'season_1',
  name: 'Season 1: Awakening',
  startDate: '2026-04-15',
  endDate: '2026-06-10',
  freeTrack: [
    { level: 3,  type: 'shards',  shards: 50,  label: '50 Shards' },
    { level: 6,  type: 'skin',    skinId: 'mech_tower_rusted', label: 'Rusted Mechanical (Tower Skin)' },
    { level: 9,  type: 'shards',  shards: 75,  label: '75 Shards' },
    { level: 12, type: 'terrain', terrainId: 'theme_nature', label: 'Ancient Grove (Terrain)' },
    { level: 15, type: 'shards',  shards: 100, label: '100 Shards' },
    { level: 18, type: 'skin',    skinId: 'hero_warden_golden', label: 'Golden Warden (Hero Skin)' },
    { level: 21, type: 'shards',  shards: 125, label: '125 Shards' },
    { level: 24, type: 'skin',    skinId: 'arcane_tower_neon', label: 'Neon Arcane (Tower Skin)' },
    { level: 27, type: 'shards',  shards: 150, label: '150 Shards' },
    { level: 30, type: 'skin',    skinId: 'void_tower_crimson', label: 'Crimson Void (Faction Skin Pack)' },
  ],
  premiumTrack: [
    { level: 1,  type: 'perk',    perkId: 'free_modifiers', label: 'All Draft Modifiers Free' },
    { level: 5,  type: 'skin',    skinId: 'mech_tower_gilded', label: 'Gilded Mechanical (Tower Skin)' },
    { level: 8,  type: 'shards',  shards: 200, label: '200 Shards' },
    { level: 10, type: 'perk',    perkId: 'free_continue', label: '1 Free Continue / Game' },
    { level: 13, type: 'skin',    skinId: 'hero_shadow_blood', label: 'Blood Shadow (Hero Skin)' },
    { level: 16, type: 'shards',  shards: 250, label: '250 Shards' },
    { level: 18, type: 'perk',    perkId: 'all_speeds', label: 'All Game Speeds (Mobile)' },
    { level: 20, type: 'perk',    perkId: 'free_roll_weekly', label: '1 Free Skin Roll / Week' },
    { level: 23, type: 'skin',    skinId: 'cel_tower_eclipse', label: 'Eclipse Celestial (Tower Skin)' },
    { level: 25, type: 'skin',    skinId: 'hero_arcanist_void', label: 'Void Arcanist (Hero Skin)' },
    { level: 27, type: 'shards',  shards: 300, label: '300 Shards' },
    { level: 30, type: 'skin',    skinId: 'arcane_tower_legendary', label: 'Prismatic Arcane (Legendary)' },
  ],
};

const SEASONS: SeasonDef[] = [SEASON_1];

const DAILY_CHALLENGES: ChallengeTemplate[] = [
  { id: 'daily_win',         description: 'Win a game',              target: 1,   xpReward: 200, type: 'daily', eventKey: 'game_won' },
  { id: 'daily_kill_500',    description: 'Kill 500 creeps',         target: 500, xpReward: 150, type: 'daily', eventKey: 'creep_killed' },
  { id: 'daily_survive_20',  description: 'Survive 20 waves',        target: 20,  xpReward: 175, type: 'daily', eventKey: 'wave_survived' },
  { id: 'daily_build_30',    description: 'Build 30 towers',         target: 30,  xpReward: 150, type: 'daily', eventKey: 'tower_placed' },
  { id: 'daily_play_3',      description: 'Play 3 games',            target: 3,   xpReward: 175, type: 'daily', eventKey: 'game_completed' },
  { id: 'daily_gauntlet',    description: 'Complete a Gauntlet stage', target: 1, xpReward: 200, type: 'daily', eventKey: 'gauntlet_stage' },
];

const WEEKLY_CHALLENGES: ChallengeTemplate[] = [
  { id: 'weekly_gauntlet',   description: 'Complete a Gauntlet run', target: 1,  xpReward: 500, type: 'weekly', eventKey: 'gauntlet_complete' },
  { id: 'weekly_win_5',      description: 'Win 5 games',             target: 5,  xpReward: 600, type: 'weekly', eventKey: 'game_won' },
  { id: 'weekly_factions_3', description: 'Win with 3 factions',     target: 3,  xpReward: 750, type: 'weekly', eventKey: 'faction_win_unique' },
  { id: 'weekly_endless_50', description: 'Reach wave 50 in Endless', target: 1, xpReward: 500, type: 'weekly', eventKey: 'endless_wave_50' },
  { id: 'weekly_kill_5000',  description: 'Kill 5,000 creeps',       target: 5000, xpReward: 600, type: 'weekly', eventKey: 'creep_killed' },
];

export const PREMIUM_PERKS = {
  free_modifiers: { level: 1, label: 'Free Draft Modifiers' },
  free_continue: { level: 10, label: 'Free Continue' },
  all_speeds: { level: 18, label: 'All Game Speeds' },
  free_roll_weekly: { level: 20, label: 'Free Weekly Roll' },
} as const;

export type PerkId = keyof typeof PREMIUM_PERKS;

class BattlePassClass {
  getCurrentSeason(): SeasonDef | null {
    const now = new Date().toISOString().slice(0, 10);
    for (let i = SEASONS.length - 1; i >= 0; i--) {
      if (SEASONS[i].startDate <= now && SEASONS[i].endDate >= now) return SEASONS[i];
    }
    return null;
  }

  ensureSeason(): SeasonDef | null {
    const season = this.getCurrentSeason();
    if (!season) return null;
    const state = StorePersistence.load();
    if (state.battlePassSeason !== season.id) {
      StorePersistence.update(s => {
        s.battlePassSeason = season.id;
        s.battlePassXP = 0;
        s.battlePassPremium = false;
        s.claimedFreeRewards = [];
        s.claimedPremiumRewards = [];
        s.dailyChallenges = [];
        s.weeklyChallenges = [];
        s.freeRollsRemaining = 0;
      });
    }
    return season;
  }

  getXP(): number {
    this.ensureSeason();
    return StorePersistence.load().battlePassXP;
  }

  getLevel(): number {
    return Math.min(Math.floor(this.getXP() / BP_XP_PER_LEVEL) + 1, BP_MAX_LEVEL);
  }

  getLevelProgress(): { current: number; required: number } {
    const xp = this.getXP();
    return { current: xp % BP_XP_PER_LEVEL, required: BP_XP_PER_LEVEL };
  }

  addXP(amount: number, reason: string): void {
    if (amount <= 0) return;
    const fromLevel = this.getLevel();
    StorePersistence.update(s => { s.battlePassXP += amount; });
    Analytics.track('bp_xp_awarded', { amount, source: reason });
    const toLevel = this.getLevel();
    if (toLevel > fromLevel) {
      Analytics.track('bp_level_up', { from: fromLevel, to: toLevel });
    }
  }

  recordGameComplete(wavesCleared: number, won: boolean): void {
    let xp = 100;
    xp += Math.floor(wavesCleared / 10) * 50;
    if (won) xp += 50;
    this.addXP(xp, `Game complete (${wavesCleared} waves${won ? ', won' : ''})`);
  }

  isPremium(): boolean {
    this.ensureSeason();
    return StorePersistence.load().battlePassPremium;
  }

  purchasePremium(): boolean {
    if (this.isPremium()) return true;
    Analytics.track('purchase_attempted', { itemId: 'battle_pass_premium', currency: 'shards', cost: BATTLE_PASS_SHARD_COST });
    if (!ShardWallet.spend(BATTLE_PASS_SHARD_COST, 'Battle Pass Premium')) {
      Analytics.track('purchase_failed', { itemId: 'battle_pass_premium', reason: 'insufficient_shards' });
      return false;
    }
    StorePersistence.update(s => { s.battlePassPremium = true; });
    Analytics.track('purchase_completed', { itemId: 'battle_pass_premium', currency: 'shards', cost: BATTLE_PASS_SHARD_COST });
    Analytics.track('bp_premium_purchased', {});
    return true;
  }

  grantPremium(): void {
    StorePersistence.update(s => { s.battlePassPremium = true; });
  }

  hasPerk(perkId: PerkId): boolean {
    if (!this.isPremium()) return false;
    return this.getLevel() >= PREMIUM_PERKS[perkId].level;
  }

  getClaimableFreeRewards(): PassReward[] {
    const season = this.ensureSeason();
    if (!season) return [];
    const level = this.getLevel();
    const claimed = new Set(StorePersistence.load().claimedFreeRewards);
    return season.freeTrack.filter(r => r.level <= level && !claimed.has(r.level));
  }

  getClaimablePremiumRewards(): PassReward[] {
    if (!this.isPremium()) return [];
    const season = this.ensureSeason();
    if (!season) return [];
    const level = this.getLevel();
    const claimed = new Set(StorePersistence.load().claimedPremiumRewards);
    return season.premiumTrack.filter(r => r.level <= level && !claimed.has(r.level));
  }

  claimFreeReward(level: number): boolean {
    const reward = this.getClaimableFreeRewards().find(r => r.level === level);
    if (!reward) return false;
    this.grantReward(reward);
    StorePersistence.update(s => { s.claimedFreeRewards.push(level); });
    Analytics.track('bp_reward_claimed', { track: 'free', level, rewardType: reward.type });
    return true;
  }

  claimPremiumReward(level: number): boolean {
    const reward = this.getClaimablePremiumRewards().find(r => r.level === level);
    if (!reward) return false;
    this.grantReward(reward);
    StorePersistence.update(s => { s.claimedPremiumRewards.push(level); });
    Analytics.track('bp_reward_claimed', { track: 'premium', level, rewardType: reward.type });
    return true;
  }

  private grantReward(reward: PassReward): void {
    switch (reward.type) {
      case 'shards': if (reward.shards) ShardWallet.earn(reward.shards, `Battle Pass reward (L${reward.level})`); break;
      case 'skin': if (reward.skinId) PlayerInventory.grantSkin(reward.skinId); break;
      case 'terrain':
        if (reward.terrainId) StorePersistence.update(s => {
          if (reward.terrainId && !s.unlockedTerrains.includes(reward.terrainId)) s.unlockedTerrains.push(reward.terrainId);
        });
        break;
      case 'faction':
        if (reward.factionId) StorePersistence.update(s => {
          if (reward.factionId && !s.unlockedFactions.includes(reward.factionId)) s.unlockedFactions.push(reward.factionId);
        });
        break;
      case 'perk': break; // Perks are checked live via hasPerk()
    }
  }

  getDailyChallenges(): ChallengeProgress[] {
    this.ensureSeason();
    const today = new Date().toISOString().slice(0, 10);
    const state = StorePersistence.load();
    if (state.dailyResetDate !== today || state.dailyChallenges.length === 0) {
      const picked = this.pickRandom(DAILY_CHALLENGES, 3);
      const challenges: ChallengeProgress[] = picked.map(t => ({
        challengeId: t.id, current: 0, target: t.target, completed: false,
      }));
      StorePersistence.update(s => { s.dailyChallenges = challenges; s.dailyResetDate = today; });
      return challenges;
    }
    return state.dailyChallenges;
  }

  getWeeklyChallenges(): ChallengeProgress[] {
    this.ensureSeason();
    const weekStart = this.getWeekStart();
    const state = StorePersistence.load();
    if (state.weeklyResetDate !== weekStart || state.weeklyChallenges.length === 0) {
      const picked = this.pickRandom(WEEKLY_CHALLENGES, 3);
      const challenges: ChallengeProgress[] = picked.map(t => ({
        challengeId: t.id, current: 0, target: t.target, completed: false,
      }));
      StorePersistence.update(s => { s.weeklyChallenges = challenges; s.weeklyResetDate = weekStart; });
      return challenges;
    }
    return state.weeklyChallenges;
  }

  recordChallengeEvent(eventKey: string, count = 1): void {
    this.ensureSeason();
    const allTemplates = [...DAILY_CHALLENGES, ...WEEKLY_CHALLENGES];
    StorePersistence.update(s => {
      const updateList = (list: ChallengeProgress[]) => {
        for (const ch of list) {
          if (ch.completed) continue;
          const template = allTemplates.find(t => t.id === ch.challengeId);
          if (!template || template.eventKey !== eventKey) continue;
          ch.current = Math.min(ch.current + count, ch.target);
          if (ch.current >= ch.target) ch.completed = true;
        }
      };
      updateList(s.dailyChallenges);
      updateList(s.weeklyChallenges);
    });
  }

  getChallengeTemplate(challengeId: string): ChallengeTemplate | undefined {
    return [...DAILY_CHALLENGES, ...WEEKLY_CHALLENGES].find(t => t.id === challengeId);
  }

  getFreeRollsRemaining(): number {
    if (!this.hasPerk('free_roll_weekly')) return 0;
    const weekStart = this.getWeekStart();
    const state = StorePersistence.load();
    if (state.freeRollResetDate !== weekStart) {
      StorePersistence.update(s => { s.freeRollsRemaining = 1; s.freeRollResetDate = weekStart; });
      return 1;
    }
    return state.freeRollsRemaining;
  }

  useFreeRoll(): boolean {
    if (this.getFreeRollsRemaining() <= 0) return false;
    StorePersistence.update(s => { s.freeRollsRemaining--; });
    return true;
  }

  private pickRandom<T>(arr: T[], count: number): T[] {
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  private getWeekStart(): string {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    return monday.toISOString().slice(0, 10);
  }
}

export const BattlePass = new BattlePassClass();
