/** Tracks per-tower-type and global game statistics */
export interface TowerTypeStats {
  totalDamage: number;
  totalShots: number;
  totalKills: number;
  totalGoldEarned: number;
  timeAlive: number; // ms
  count: number; // how many of this type were built
}

export interface GameStats {
  towerStats: Record<string, TowerTypeStats>;
  frontierSpent: number;
  frontierEarned: number;
  sendsSpent: number;
  sendsIncome: number;
  totalGoldEarned: number;
  totalGoldSpent: number;
  creepsKilled: number;
  creepsLeaked: number;
  wavesCompleted: number;
  gameTimeMs: number;
}

export class StatsTracker {
  stats: GameStats = {
    towerStats: {},
    frontierSpent: 0,
    frontierEarned: 0,
    sendsSpent: 0,
    sendsIncome: 0,
    totalGoldEarned: 0,
    totalGoldSpent: 0,
    creepsKilled: 0,
    creepsLeaked: 0,
    wavesCompleted: 0,
    gameTimeMs: 0,
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
