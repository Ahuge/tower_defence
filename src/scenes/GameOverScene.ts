import Phaser from 'phaser';
import { CANVAS_WIDTH, GAME_HEIGHT } from '../config';
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
}

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  create(data: GameOverData): void {
    const cx = CANVAS_WIDTH / 2;

    const title = data.won ? 'VICTORY!' : 'DEFEAT';
    const titleColor = data.won ? '#44ff44' : '#ff4444';

    this.add.text(cx, 60, title, {
      fontSize: '36px', color: titleColor, fontFamily: 'monospace',
    }).setOrigin(0.5);

    const lines = [
      `Mode: ${data.matchMode}${data.faction ? ` (${data.faction})` : ''}`,
      `Waves: ${data.wave} / ${data.totalWaves}`,
      `Gold Remaining: ${data.gold}`,
      `Towers Built: ${data.towersBuilt}`,
      `Creeps Killed: ${data.creepsKilled}`,
    ];

    // Calculate score
    const score = data.wave * 100
      + data.creepsKilled * 2
      + (data.won ? 1000 : 0)
      + data.gold;

    lines.push('', `Score: ${score}`);

    // Save high score
    this.saveScore(data.matchMode, score);
    const highScore = this.getHighScore(data.matchMode);
    if (score >= highScore) {
      lines.push('NEW HIGH SCORE!');
    } else {
      lines.push(`High Score: ${highScore}`);
    }

    this.add.text(cx, 130, lines.join('\n'), {
      fontSize: '14px', color: '#cccccc', fontFamily: 'monospace',
      align: 'center',
      lineSpacing: 6,
    }).setOrigin(0.5, 0);

    // Buttons
    const btnY = 350;

    const retryBtn = this.add.text(cx - 100, btnY, '[ Retry ]', {
      fontSize: '16px', color: '#ffaa44', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    retryBtn.on('pointerdown', () => this.scene.start('MenuScene'));
    retryBtn.on('pointerover', () => retryBtn.setColor('#ffffff'));
    retryBtn.on('pointerout', () => retryBtn.setColor('#ffaa44'));

    const menuBtn = this.add.text(cx + 100, btnY, '[ Menu ]', {
      fontSize: '16px', color: '#4488ff', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    menuBtn.on('pointerdown', () => this.scene.start('MenuScene'));
    menuBtn.on('pointerover', () => menuBtn.setColor('#ffffff'));
    menuBtn.on('pointerout', () => menuBtn.setColor('#4488ff'));
  }

  private saveScore(mode: string, score: number): void {
    try {
      const key = `td_highscore_${mode}`;
      const current = parseInt(localStorage.getItem(key) || '0', 10);
      if (score > current) {
        localStorage.setItem(key, String(score));
      }
    } catch (_) { /* localStorage may not be available */ }
  }

  private getHighScore(mode: string): number {
    try {
      return parseInt(localStorage.getItem(`td_highscore_${mode}`) || '0', 10);
    } catch (_) {
      return 0;
    }
  }
}
