import Phaser from 'phaser';
import { getCanvasWidth, GAME_HEIGHT } from '../config';
import { GameStats } from '../systems/StatsTracker';
import { TOWER_TYPES } from '../data/TowerTypes';
import { TowerSelectBar } from '../ui/TowerSelectBar';
import { UIScale } from '../systems/UIScale';

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
  // Hero defense fields
  heroStats?: { kills: number; deaths: number; damageDealt: number; abilitiesUsed: number; heroName: string } | null;
}

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  create(data: GameOverData): void {
    const cx = getCanvasWidth() / 2;
    const totalH = GAME_HEIGHT + 28 + TowerSelectBar.BAR_HEIGHT;
    const isPhone = UIScale.isPhone;

    // Phone-adaptive sizes
    const titleFontSize = UIScale.fontCapped(32, 26);
    const sectionFontSize = UIScale.fontCapped(13, 11);
    const bodyFontSize = UIScale.fontCapped(13, 10);
    const smallFontSize = UIScale.fontCapped(11, 9);
    const btnFontSize = UIScale.fontCapped(14, 12);
    const rowH = isPhone ? 12 : 14; // TODO: centralize in UIScale
    const leftMargin = isPhone ? 20 : 60; // TODO: centralize in UIScale

    // Background
    this.add.graphics().fillStyle(0x0a0a0f, 1).fillRect(0, 0, getCanvasWidth(), totalH);

    const title = data.won ? 'VICTORY!' : 'DEFEAT';
    const titleColor = data.won ? '#44ff44' : '#ff4444';

    this.add.text(cx, isPhone ? 18 : 25, title, { // TODO: centralize Y in UIScale
      fontSize: titleFontSize, color: titleColor, fontFamily: 'monospace',
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

    this.add.text(cx, isPhone ? 50 : 65, overviewLines.join('\n'), { // TODO: centralize Y in UIScale
      fontSize: sectionFontSize, color: '#cccccc', fontFamily: 'monospace',
      align: 'center', lineSpacing: isPhone ? 2 : 4, // TODO: centralize in UIScale
    }).setOrigin(0.5, 0);

    // Tower Performance Table
    if (data.stats && Object.keys(data.stats.towerStats).length > 0) {
      const tableY = isPhone ? 130 : 155; // TODO: centralize Y in UIScale
      this.add.text(cx, tableY, 'TOWER PERFORMANCE', {
        fontSize: sectionFontSize, color: '#ffaa44', fontFamily: 'monospace',
      }).setOrigin(0.5);

      // Header
      const headerY = tableY + (isPhone ? 16 : 20); // TODO: centralize in UIScale
      // TODO: centralize column positions in UIScale
      const colX = isPhone
        ? [leftMargin, 160, 260, 350, 440, 520]
        : [60, 210, 310, 400, 500, 600];
      const headers = ['Tower', 'Total DMG', 'Avg DPS', 'Gold Earned', 'Shots', 'Built'];
      // On phone, abbreviate headers
      const displayHeaders = isPhone
        ? ['Tower', 'DMG', 'DPS', 'Gold', 'Shots', 'Built']
        : headers;
      displayHeaders.forEach((h, i) => {
        this.add.text(colX[i], headerY, h, {
          fontSize: bodyFontSize, color: '#888888', fontFamily: 'monospace',
        });
      });

      // Divider
      const divG = this.add.graphics();
      divG.lineStyle(1, 0x444444, 0.5);
      divG.lineBetween(leftMargin - 10, headerY + rowH, getCanvasWidth() - (isPhone ? 20 : 50), headerY + rowH); // TODO: centralize in UIScale

      // Rows — sorted by total damage
      const entries = Object.entries(data.stats.towerStats)
        .sort(([, a], [, b]) => b.totalDamage - a.totalDamage);

      let rowY = headerY + rowH + 6;
      for (const [typeId, ts] of entries) {
        const towerDef = TOWER_TYPES[typeId];
        const name = towerDef?.name ?? typeId;
        const avgDps = ts.timeAlive > 0 ? Math.round(ts.totalDamage / (ts.timeAlive / 1000)) : 0;

        const displayName = isPhone && name.length > 12 ? name.substring(0, 11) + '.' : name;
        const values = [
          displayName,
          ts.totalDamage.toLocaleString(),
          `${avgDps}/s`,
          ts.totalGoldEarned > 0 ? `+${ts.totalGoldEarned}g` : '-',
          ts.totalShots.toString(),
          ts.count.toString(),
        ];

        const rowColor = ts.totalDamage > 0 ? '#cccccc' : '#666666';
        values.forEach((v, i) => {
          this.add.text(colX[i], rowY, v, {
            fontSize: bodyFontSize, color: rowColor, fontFamily: 'monospace',
          });
        });
        rowY += rowH;
      }

      // Economy table — positioned dynamically after tower table
      const econY = rowY + (isPhone ? 10 : 16); // TODO: centralize in UIScale
      this.add.text(cx, econY, 'ECONOMY', {
        fontSize: sectionFontSize, color: '#ffaa44', fontFamily: 'monospace',
      }).setOrigin(0.5);

      const s = data.stats;
      const towerBonusGold = Object.values(s.towerStats).reduce((sum, t) => sum + t.totalGoldEarned, 0);
      const econHeaderY = econY + (isPhone ? 14 : 18); // TODO: centralize in UIScale
      // TODO: centralize column positions in UIScale
      const econColX = isPhone ? [leftMargin, 200, 400] : [60, 250, 500];
      const econHeaders = ['Stat', 'Value', 'Detail'];
      econHeaders.forEach((h, i) => {
        this.add.text(econColX[i], econHeaderY, h, {
          fontSize: smallFontSize, color: '#888888', fontFamily: 'monospace',
        });
      });

      const econRows = [
        ['Creeps Killed', s.creepsKilled.toString(), `Leaked: ${s.creepsLeaked}`],
        ['Gold Earned', `${s.totalGoldEarned.toLocaleString()}g`, 'kills + income + frontier'],
        ['Gold Spent', `${s.totalGoldSpent.toLocaleString()}g`, 'towers + sends + frontier'],
        ['Tower Bonus', `${towerBonusGold}g`, 'Siphon, gold-on-hit'],
        ['Frontier', `${s.frontierEarned}g earned`, `Invested: ${s.frontierSpent}g | ROI: ${s.frontierSpent > 0 ? Math.round((s.frontierEarned / s.frontierSpent) * 100) : 0}%`],
        ['Sends', `${s.sendsSpent}g spent`, `Income: +${s.sendsIncome}/wave`],
        ['Kill Efficiency', `${s.creepsKilled > 0 ? (s.totalGoldEarned / s.creepsKilled).toFixed(1) : 0}g/kill`, ''],
      ];

      let econRowY = econHeaderY + (isPhone ? 12 : 16); // TODO: centralize in UIScale
      for (const row of econRows) {
        row.forEach((v, i) => {
          this.add.text(econColX[i], econRowY, v, {
            fontSize: smallFontSize, color: '#cccccc', fontFamily: 'monospace',
          });
        });
        econRowY += rowH;
      }

      // Fun stats
      const funY = econRowY + (isPhone ? 4 : 8); // TODO: centralize in UIScale
      const topDamage = entries[0];
      const topGold = entries.reduce((best, e) =>
        e[1].totalGoldEarned > (best?.[1]?.totalGoldEarned ?? 0) ? e : best, entries[0]);

      const funLines: string[] = [];
      if (topDamage) {
        const name = TOWER_TYPES[topDamage[0]]?.name ?? topDamage[0];
        funLines.push(`MVP: ${name} (${topDamage[1].totalDamage.toLocaleString()} dmg)`);
      }
      if (topGold && topGold[1].totalGoldEarned > 0) {
        const name = TOWER_TYPES[topGold[0]]?.name ?? topGold[0];
        funLines.push(`Top Earner: ${name} (+${topGold[1].totalGoldEarned}g)`);
      }
      funLines.push(`Overall DPS: ${gameTime > 0 ? Math.round(entries.reduce((s, e) => s + e[1].totalDamage, 0) / gameTime) : 0}/s`);

      this.add.text(cx, funY, isPhone ? funLines.join('\n') : funLines.join('  |  '), {
        fontSize: smallFontSize, color: '#88aacc', fontFamily: 'monospace',
        align: 'center',
      }).setOrigin(0.5);
    }

    // Hero defense stats
    if (data.heroStats) {
      const hs = data.heroStats;
      const heroY = isPhone ? 460 : 490; // TODO: centralize Y in UIScale
      this.add.text(cx, heroY, 'HERO PERFORMANCE', {
        fontSize: sectionFontSize, color: '#ff44aa', fontFamily: 'monospace',
      }).setOrigin(0.5);

      const heroLines = [
        `Hero: ${hs.heroName}`,
        `Kills: ${hs.kills}  |  Deaths: ${hs.deaths}  |  K/D: ${hs.deaths > 0 ? (hs.kills / hs.deaths).toFixed(1) : hs.kills}`,
        `Damage Dealt: ${hs.damageDealt.toLocaleString()}  |  Abilities Used: ${hs.abilitiesUsed}`,
      ];
      this.add.text(cx, heroY + (isPhone ? 14 : 18), heroLines.join('\n'), { // TODO: centralize in UIScale
        fontSize: smallFontSize, color: '#cccccc', fontFamily: 'monospace',
        align: 'center', lineSpacing: isPhone ? 2 : 4, // TODO: centralize in UIScale
      }).setOrigin(0.5, 0);
    }

    // Versus summary
    if (data.isVersus) {
      const vsY = isPhone ? 490 : 520; // TODO: centralize Y in UIScale
      this.add.text(cx, vsY, 'VERSUS RESULTS', {
        fontSize: btnFontSize, color: '#ff8844', fontFamily: 'monospace',
      }).setOrigin(0.5);

      const winner = data.won ? 'YOU WON!' : 'YOU LOST';
      const winColor = data.won ? '#44ff44' : '#ff4444';
      this.add.text(cx, vsY + (isPhone ? 18 : 22), winner, { // TODO: centralize in UIScale
        fontSize: UIScale.fontCapped(18, 16), color: winColor, fontFamily: 'monospace',
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

      this.add.text(cx, vsY + (isPhone ? 40 : 50), vsLines.join('\n'), { // TODO: centralize in UIScale
        fontSize: UIScale.fontCapped(14, 11), color: '#cccccc', fontFamily: 'monospace',
        align: 'center', lineSpacing: isPhone ? 2 : 4, // TODO: centralize in UIScale
      }).setOrigin(0.5, 0);
    }

    // Buttons
    const btnY = totalH - (isPhone ? 40 : 50); // TODO: centralize in UIScale
    const btnSpacing = isPhone ? 80 : 100; // TODO: centralize in UIScale

    const retryBtn = this.add.text(cx - btnSpacing, btnY, '[ Play Again ]', {
      fontSize: btnFontSize, color: '#ffaa44', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    retryBtn.on('pointerdown', () => this.scene.start('MenuScene'));
    retryBtn.on('pointerover', () => retryBtn.setColor('#ffffff'));
    retryBtn.on('pointerout', () => retryBtn.setColor('#ffaa44'));

    const menuBtn = this.add.text(cx + btnSpacing, btnY, '[ Menu ]', {
      fontSize: btnFontSize, color: '#4488ff', fontFamily: 'monospace',
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
