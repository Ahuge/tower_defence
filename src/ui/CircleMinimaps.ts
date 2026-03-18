import { getCanvasWidth } from '../config';
import { CircleManager } from '../systems/multiplayer/CircleManager';

/**
 * Player roster panel for Circle Co-op.
 * Shows all players, their zones (color), and shared lives.
 * Positioned in top-right corner.
 */
export class CirclePlayerRoster {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private circle: CircleManager;
  private statusTexts: Phaser.GameObjects.Text[] = [];
  private timerText: Phaser.GameObjects.Text;
  private zoneColors: number[];

  private readonly panelW = 180;

  constructor(scene: Phaser.Scene, circle: CircleManager, zoneColors: number[]) {
    this.scene = scene;
    this.circle = circle;
    this.zoneColors = zoneColors;

    const x = getCanvasWidth() - this.panelW - 8;
    const y = 6;

    this.container = scene.add.container(x, y).setDepth(29);

    // Background
    const bg = scene.add.graphics();
    const panelH = 18 + circle.playerCount * 18 + 20;
    bg.fillStyle(0x111111, 0.9);
    bg.fillRect(0, 0, this.panelW, panelH);
    bg.lineStyle(1, 0x555555, 0.6);
    bg.strokeRect(0, 0, this.panelW, panelH);
    this.container.add(bg);

    // Title
    const title = scene.add.text(this.panelW / 2, 4, 'CIRCLE CO-OP', {
      fontSize: '10px', color: '#ffaa44', fontFamily: 'monospace',
    }).setOrigin(0.5, 0);
    this.container.add(title);

    // Player rows
    for (let i = 0; i < circle.playerCount; i++) {
      const rowY = 20 + i * 18;
      const color = zoneColors[i] ?? 0xffffff;
      const colorStr = '#' + color.toString(16).padStart(6, '0');

      // Zone color indicator
      const indicator = scene.add.graphics();
      indicator.fillStyle(color, 0.8);
      indicator.fillRect(4, rowY + 2, 10, 10);
      this.container.add(indicator);

      const isMe = i === circle.playerIndex;
      const label = isMe ? `P${i} (you)` : `P${i}`;

      const text = scene.add.text(18, rowY, label, {
        fontSize: '11px', color: colorStr, fontFamily: 'monospace',
      });
      this.container.add(text);
      this.statusTexts.push(text);
    }

    // Timer text
    this.timerText = scene.add.text(this.panelW - 4, 4, '', {
      fontSize: '11px', color: '#ffdd44', fontFamily: 'monospace',
    }).setOrigin(1, 0);
    this.container.add(this.timerText);
  }

  update(sharedLives: number): void {
    // Update player labels
    for (let i = 0; i < this.circle.playerCount; i++) {
      const isMe = i === this.circle.playerIndex;
      const faction = this.circle.playerFactions.get(i) ?? '';
      const readyStr = this.circle.playersReady.has(i) ? ' [RDY]' : '';
      const label = isMe
        ? `P${i} (you) ${faction}${this.circle.localReady ? ' [RDY]' : ''}`
        : `P${i} ${faction}${readyStr}`;
      this.statusTexts[i]?.setText(label);
    }

    // Timer
    if (this.circle.waveTimerActive) {
      this.timerText.setText(`${this.circle.getWaveTimerSeconds()}s`);
    } else {
      this.timerText.setText(`Lives: ${sharedLives}`);
    }
  }
}
