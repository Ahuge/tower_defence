import { SIDEBAR_WIDTH } from '../config';
import { WaveDefinition } from '../data/WaveDefinitions';

export class UpcomingWaves {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private contentItems: Phaser.GameObjects.GameObject[] = [];
  private autoPlayBtn!: Phaser.GameObjects.Text;
  private autoPlayBg!: Phaser.GameObjects.Graphics;

  static readonly HEIGHT = 80;

  constructor(scene: Phaser.Scene, onAutoPlayToggle?: () => void) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setDepth(28);

    const bg = scene.add.graphics();
    bg.fillStyle(0x121218, 1);
    bg.fillRect(0, 0, SIDEBAR_WIDTH, UpcomingWaves.HEIGHT);
    bg.lineStyle(1, 0x333333, 1);
    bg.strokeRect(0, 0, SIDEBAR_WIDTH, UpcomingWaves.HEIGHT);
    this.container.add(bg);

    const title = scene.add.text(8, 4, 'UPCOMING WAVES', {
      fontSize: '12px', color: '#6688aa', fontFamily: 'monospace',
    });
    this.container.add(title);

    // Auto-play button
    this.autoPlayBg = scene.add.graphics();
    this.drawAutoPlayBg(false);
    this.container.add(this.autoPlayBg);

    this.autoPlayBtn = scene.add.text(SIDEBAR_WIDTH - 8, 4, '[A] AUTO', {
      fontSize: '12px', color: '#666666', fontFamily: 'monospace',
    }).setOrigin(1, 0);
    this.container.add(this.autoPlayBtn);

    this.autoPlayBtn.setInteractive({ useHandCursor: true });
    this.autoPlayBtn.on('pointerdown', () => onAutoPlayToggle?.());
    this.autoPlayBtn.on('pointerover', () => this.autoPlayBtn.setAlpha(0.7));
    this.autoPlayBtn.on('pointerout', () => this.autoPlayBtn.setAlpha(1));
  }

  private drawAutoPlayBg(active: boolean): void {
    const btnW = 72;
    const btnH = 18;
    const btnX = SIDEBAR_WIDTH - btnW - 4;
    const btnY = 2;
    this.autoPlayBg.clear();
    this.autoPlayBg.fillStyle(active ? 0x224422 : 0x1a1a22, 1);
    this.autoPlayBg.fillRoundedRect(btnX, btnY, btnW, btnH, 3);
    this.autoPlayBg.lineStyle(1, active ? 0x44aa44 : 0x444444, 1);
    this.autoPlayBg.strokeRoundedRect(btnX, btnY, btnW, btnH, 3);
  }

  setAutoPlay(active: boolean): void {
    this.drawAutoPlayBg(active);
    this.autoPlayBtn.setColor(active ? '#44cc44' : '#666666');
    this.autoPlayBtn.setText(active ? '[A] AUTO ▶' : '[A] AUTO');
  }

  update(currentWave: number, waves: WaveDefinition[]): void {
    // Clear old content
    for (const item of this.contentItems) {
      this.container.remove(item, true);
    }
    this.contentItems = [];

    let y = 18;
    for (let i = 0; i < 3; i++) {
      const waveIdx = currentWave + i; // currentWave is 1-indexed after starting
      if (waveIdx >= waves.length) break;

      const wave = waves[waveIdx];
      const waveNum = waveIdx + 1;
      const types = [...new Set(wave.groups.map(g => g.creepType))];
      const totalCount = wave.groups.reduce((s, g) => s + g.count, 0);

      const prefix = i === 0 ? 'Next' : `+${i + 1}`;
      const bossTag = wave.isBoss ? ' [BOSS]' : '';
      const typeStr = types.join(', ');

      const text = this.scene.add.text(8, y, `${prefix} W${waveNum}: ${typeStr}${bossTag} (${totalCount})`, {
        fontSize: '13px',
        color: wave.isBoss ? '#ff4444' : (i === 0 ? '#cccccc' : '#888888'),
        fontFamily: 'monospace',
        wordWrap: { width: SIDEBAR_WIDTH - 16 },
      });
      this.container.add(text);
      this.contentItems.push(text);
      y += 18;
    }

    if (currentWave >= waves.length) {
      const text = this.scene.add.text(8, y, 'Final wave!', {
        fontSize: '13px', color: '#ffdd44', fontFamily: 'monospace',
      });
      this.container.add(text);
      this.contentItems.push(text);
    }
  }

  getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }
}
