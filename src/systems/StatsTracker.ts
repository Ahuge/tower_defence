/** Tracks per-tower-type and global game statistics */
export interface TowerTypeStats {
  totalDamage: number;
  totalShots: number;
  totalKills: number;
  totalGoldEarned: number;
  timeAlive: number; // ms
  count: number; // how many of this type were built
  // Granular damage by source
  directDamage: number;
  splashDamage: number;
  burnDamage: number;
  poisonDamage: number;
  chainDamage: number;
  pierceDamage: number;
  auraDamage: number;
  [key: string]: number; // extensible
}

export interface GameStats {
  towerStats: Record<string, TowerTypeStats>;
  frontierSpent: number;
  frontierEarned: number;
  sendsSpent: number;
  /** Per-wave income RATE accumulated by send purchases — sum of
   *  the +g/wave bonus that each send added. Displayed as
   *  "Send Income +Xg/w" since it's the final per-wave rate, not
   *  cumulative gold. */
  sendsIncome: number;
  /** Cumulative gold actually paid out from send bonuses across
   *  the whole match. Each wave-clear adds the current send bonus
   *  to this. Used by Sends ROI on the Game Over screen. */
  sendsEarned: number;
  totalGoldEarned: number;
  totalGoldSpent: number;
  creepsKilled: number;
  creepsLeaked: number;
  wavesCompleted: number;
  gameTimeMs: number;
  // Essence mode stats
  essenceGenerated: number;
  essenceSpentOnSends: number;
  essenceGeneratorsBuilt: number;
}

export class StatsTracker {
  stats: GameStats = {
    towerStats: {},
    frontierSpent: 0,
    frontierEarned: 0,
    sendsSpent: 0,
    sendsIncome: 0,
    sendsEarned: 0,
    totalGoldEarned: 0,
    totalGoldSpent: 0,
    creepsKilled: 0,
    creepsLeaked: 0,
    wavesCompleted: 0,
    gameTimeMs: 0,
    essenceGenerated: 0,
    essenceSpentOnSends: 0,
    essenceGeneratorsBuilt: 0,
  };

  private getOrCreate(typeId: string): TowerTypeStats {
    if (!this.stats.towerStats[typeId]) {
      this.stats.towerStats[typeId] = {
        totalDamage: 0,
        totalShots: 0,
        totalKills: 0,
        totalGoldEarned: 0,
        timeAlive: 0,
        count: 0,
        directDamage: 0,
        splashDamage: 0,
        burnDamage: 0,
        poisonDamage: 0,
        chainDamage: 0,
        pierceDamage: 0,
        auraDamage: 0,
      };
    }
    return this.stats.towerStats[typeId];
  }

  recordTowerBuilt(typeId: string): void {
    this.getOrCreate(typeId).count++;
  }

  recordDamage(typeId: string, amount: number): void {
    this.getOrCreate(typeId).totalDamage += amount;
  }

  recordHitStats(typeId: string, hitStats: Record<string, number>): void {
    const s = this.getOrCreate(typeId);
    for (const key of Object.keys(hitStats)) {
      if (hitStats[key] > 0) {
        s[key] = (s[key] ?? 0) + hitStats[key];
      }
    }
  }

  recordShot(typeId: string): void {
    this.getOrCreate(typeId).totalShots++;
  }

  recordTowerGold(typeId: string, amount: number): void {
    this.getOrCreate(typeId).totalGoldEarned += amount;
  }

  recordKill(): void {
    this.stats.creepsKilled++;
  }

  recordLeak(): void {
    this.stats.creepsLeaked++;
  }

  recordGoldEarned(amount: number): void {
    this.stats.totalGoldEarned += amount;
  }

  recordGoldSpent(amount: number): void {
    this.stats.totalGoldSpent += amount;
  }

  recordFrontierSpent(amount: number): void {
    this.stats.frontierSpent += amount;
  }

  recordFrontierEarned(amount: number): void {
    this.stats.frontierEarned += amount;
  }

  recordSendSpent(amount: number): void {
    this.stats.sendsSpent += amount;
  }

  recordSendIncome(amount: number): void {
    this.stats.sendsIncome += amount;
  }

  /** Record gold paid out from send bonuses on a single wave clear.
   *  Accumulates into `sendsEarned` for the Sends ROI computation. */
  recordSendsEarned(amount: number): void {
    this.stats.sendsEarned += amount;
  }

  recordEssenceGenerated(amount: number): void {
    this.stats.essenceGenerated += amount;
  }

  recordEssenceSpentOnSend(amount: number): void {
    this.stats.essenceSpentOnSends += amount;
  }

  recordEssenceGeneratorBuilt(): void {
    this.stats.essenceGeneratorsBuilt++;
  }

  recordWaveCompleted(): void {
    this.stats.wavesCompleted++;
  }

  updateTime(delta: number): void {
    this.stats.gameTimeMs += delta;
  }

  /** Calculate average DPS per tower type */
  getAverageDPS(typeId: string): number {
    const s = this.stats.towerStats[typeId];
    if (!s || s.timeAlive === 0) return 0;
    return Math.round(s.totalDamage / (s.timeAlive / 1000));
  }
}
