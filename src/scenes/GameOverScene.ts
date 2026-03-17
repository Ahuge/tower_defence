import Phaser from 'phaser';
import { CANVAS_WIDTH, GAME_HEIGHT } from '../config';
import { GameStats } from '../systems/StatsTracker';
import { TOWER_TYPES } from '../data/TowerTypes';
import { TowerSelectBar } from '../ui/TowerSelectBar';

export interface GameOverData {
  won: boolean;
  wave: number;
  totalWaves: number;
  gold: number;
  towersBuilt: number;
  creepsKilled: number;
  matchMode: string;
  faction: string | null;
  stats?: GameStats;
  // Versus fields
  isVersus?: boolean;
  lives?: number;
  sendsSent?: number;
  sendsReceived?: number;
  opponentStats?: { stats: GameStats; wave: number; lives: number; sendsSent: number; sendsReceived: number } | null;
  opponentLives?: number;
}

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  create(data: GameOverData): void {
    const cx = CANVAS_WIDTH / 2;
    const totalH = GAME_HEIGHT + 28 + TowerSelectBar.BAR_HEIGHT;

    // Background
    this.add.graphics().fillStyle(0x0a0a0f, 1).fillRect(0, 0, CANVAS_WIDTH, totalH);

    const title = data.won ? 'VICTORY!' : 'DEFEAT';
    const titleColor = data.won ? '#44ff44' : '#ff4444';

    this.add.text(cx, 25, title, {
      fontSize: '32px', color: titleColor, fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Overview
    const gameTime = data.stats ? Math.round(data.stats.gameTimeMs / 1000) : 0;
    const minutes = Math.floor(gameTime / 60);
    const seconds = gameTime % 60;

    const score = data.wave * 100 + data.creepsKilled * 2 + (data.won ? 1000 : 0) + data.gold;
    this.saveScore(data.matchMode, score);
    const highScore = this.getHighScore(data.matchMode);

    const overviewLines = [
      `Mode: ${data.matchMode}${data.faction ? ` (${data.faction})` : ''}`,
      `Waves: ${data.wave}/${data.totalWaves}  |  Time: ${minutes}m ${seconds}s`,
      `Creeps Killed: ${data.creepsKilled}  |  Leaked: ${data.stats?.creepsLeaked ?? 0}`,
      `Towers Built: ${data.towersBuilt}  |  Gold Remaining: ${data.gold}`,
      `Score: ${score}${score >= highScore ? ' (NEW HIGH!)' : `  |  High: ${highScore}`}`,
    ];

    this.add.text(cx, 65, overviewLines.join('\n'), {
      fontSize: '11px', color: '#cccccc', fontFamily: 'monospace',
      align: 'center', lineSpacing: 4,
    }).setOrigin(0.5, 0);

    // Tower Performance Table
    if (data.stats && Object.keys(data.stats.towerStats).length > 0) {
      const tableY = 155;
      this.add.text(cx, tableY, 'TOWER PERFORMANCE', {
        fontSize: '13px', color: '#ffaa44', fontFamily: 'monospace',
      }).setOrigin(0.5);

      // Header
      const headerY = tableY + 20;
      const colX = [60, 210, 310, 400, 500, 600];
      const headers = ['Tower', 'Total DMG', 'Avg DPS', 'Gold Earned', 'Shots', 'Built'];
      headers.forEach((h, i) => {
        this.add.text(colX[i], headerY, h, {
          fontSize: '9px', color: '#888888', fontFamily: 'monospace',
        });
      });

      // Divider
      const divG = this.add.graphics();
      divG.lineStyle(1, 0x444444, 0.5);
      divG.lineBetween(50, headerY + 14, CANVAS_WIDTH - 50, headerY + 14);

      // Rows — sorted by total damage
      const entries = Object.entries(data.stats.towerStats)
        .sort(([, a], [, b]) => b.totalDamage - a.totalDamage);

      let rowY = headerY + 20;
      for (const [typeId, ts] of entries) {
        const towerDef = TOWER_TYPES[typeId];
        const name = towerDef?.name ?? typeId;
        const avgDps = ts.timeAlive > 0 ? Math.round(ts.totalDamage / (ts.timeAlive / 1000)) : 0;

        const values = [
          name,
          ts.totalDamage.toLocaleString(),
          `${avgDps}/s`,
          ts.totalGoldEarned > 0 ? `+${ts.totalGoldEarned}g` : '-',
          ts.totalShots.toString(),
          ts.count.toString(),
        ];

        const rowColor = ts.totalDamage > 0 ? '#cccccc' : '#666666';
        values.forEach((v, i) => {
          this.add.text(colX[i], rowY, v, {
            fontSize: '9px', color: rowColor, fontFamily: 'monospace',
          });
        });
        rowY += 14;
      }

      // Economy section
      const econY = Math.max(rowY + 20, 380);
      this.add.text(cx, econY, 'ECONOMY', {
        fontSize: '13px', color: '#ffaa44', fontFamily: 'monospace',
      }).setOrigin(0.5);

      const s = data.stats;
      const towerBonusGold = Object.values(s.towerStats).reduce((sum, t) => sum + t.totalGoldEarned, 0);
      const econLines = [
        `Creeps Killed: ${s.creepsKilled}  |  Leaked: ${s.creepsLeaked}`,
        `Gold Earned: ${s.totalGoldEarned.toLocaleString()}g (kills + income + frontier)`,
        `Gold Spent: ${s.totalGoldSpent.toLocaleString()}g (towers + sends + frontier)`,
        `Tower Bonus Gold: ${towerBonusGold}g (Siphon, gold-on-hit, etc.)`,
        `Frontier — Invested: ${s.frontierSpent}g  |  Returned: ${s.frontierEarned}g  |  ROI: ${s.frontierSpent > 0 ? Math.round((s.frontierEarned / s.frontierSpent) * 100) : 0}%`,
        `Sends — Spent: ${s.sendsSpent}g  |  Income Gained: +${s.sendsIncome}/wave`,
        `Kill Efficiency: ${s.creepsKilled > 0 ? (s.totalGoldEarned / s.creepsKilled).toFixed(1) : 0}g per kill`,
      ];

      this.add.text(cx, econY + 20, econLines.join('\n'), {
        fontSize: '10px', color: '#aaaaaa', fontFamily: 'monospace',
        align: 'center', lineSpacing: 4,
      }).setOrigin(0.5, 0);

      // Fun stats
      const funY = econY + 90;
      const topDamage = entries[0];
      const topGold = entries.reduce((best, e) =>
        e[1].totalGoldEarned > (best?.[1]?.totalGoldEarned ?? 0) ? e : best, entries[0]);

      const funLines: string[] = [];
      if (topDamage) {
        const name = TOWER_TYPES[topDamage[0]]?.name ?? topDamage[0];
        funLines.push(`MVP Tower: ${name} (${topDamage[1].totalDamage.toLocaleString()} damage)`);
      }
      if (topGold && topGold[1].totalGoldEarned > 0) {
        const name = TOWER_TYPES[topGold[0]]?.name ?? topGold[0];
        funLines.push(`Best Earner: ${name} (+${topGold[1].totalGoldEarned}g)`);
      }
      funLines.push(`Damage per second: ${gameTime > 0 ? Math.round(entries.reduce((s, e) => s + e[1].totalDamage, 0) / gameTime) : 0}/s overall`);

      if (funLines.length > 0) {
        this.add.text(cx, funY, funLines.join('\n'), {
          fontSize: '10px', color: '#88aacc', fontFamily: 'monospace',
          align: 'center', lineSpacing: 4,
        }).setOrigin(0.5, 0);
      }
    }

    // Versus summary
    if (data.isVersus) {
      const vsY = 520;
      this.add.text(cx, vsY, 'VERSUS RESULTS', {
        fontSize: '14px', color: '#ff8844', fontFamily: 'monospace',
      }).setOrigin(0.5);

      const winner = data.won ? 'YOU WON!' : 'YOU LOST';
      const winColor = data.won ? '#44ff44' : '#ff4444';
      this.add.text(cx, vsY + 22, winner, {
        fontSize: '18px', color: winColor, fontFamily: 'monospace',
      }).setOrigin(0.5);

      const myLives = data.lives ?? 0;
      const oppLives = data.opponentLives ?? 0;

      const vsLines = [
        `Your Lives: ${myLives}  |  Opponent Lives: ${oppLives}`,
        `Sends Sent: ${data.sendsSent ?? 0}  |  Sends Received: ${data.sendsReceived ?? 0}`,
      ];

      if (data.opponentStats) {
        const os = data.opponentStats;
        const oppTotalDmg = Object.values(os.stats.towerStats).reduce((s, t) => s + t.totalDamage, 0);
        const myTotalDmg = data.stats ? Object.values(data.stats.towerStats).reduce((s, t) => s + t.totalDamage, 0) : 0;
        vsLines.push(`Your Total Damage: ${myTotalDmg.toLocaleString()}  |  Opponent: ${oppTotalDmg.toLocaleString()}`);
        vsLines.push(`Opponent Wave: ${os.wave}  |  Opponent Kills: ${os.stats.creepsKilled}`);
      }

      this.add.text(cx, vsY + 50, vsLines.join('\n'), {
        fontSize: '10px', color: '#cccccc', fontFamily: 'monospace',
        align: 'center', lineSpacing: 4,
      }).setOrigin(0.5, 0);
    }

    // Buttons
    const btnY = totalH - 50;

    const retryBtn = this.add.text(cx - 100, btnY, '[ Play Again ]', {
      fontSize: '14px', color: '#ffaa44', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    retryBtn.on('pointerdown', () => this.scene.start('MenuScene'));
    retryBtn.on('pointerover', () => retryBtn.setColor('#ffffff'));
    retryBtn.on('pointerout', () => retryBtn.setColor('#ffaa44'));

    const menuBtn = this.add.text(cx + 100, btnY, '[ Menu ]', {
      fontSize: '14px', color: '#4488ff', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    menuBtn.on('pointerdown', () => this.scene.start('MenuScene'));
    menuBtn.on('pointerover', () => menuBtn.setColor('#ffffff'));
    menuBtn.on('pointerout', () => menuBtn.setColor('#4488ff'));
  }

  private saveScore(mode: string, score: number): void {
    try {
      const key = `td_highscore_${mode}`;
      const current = parseInt(localStorage.getItem(key) || '0', 10);
      if (score > current) localStorage.setItem(key, String(score));
    } catch (_) {}
  }

  private getHighScore(mode: string): number {
    try {
      return parseInt(localStorage.getItem(`td_highscore_${mode}`) || '0', 10);
    } catch (_) {
      return 0;
    }
  }
}
