import { SIDEBAR_WIDTH } from '../config';
import { WaveDefinition } from '../data/WaveDefinitions';

export class UpcomingWaves {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private contentItems: Phaser.GameObjects.GameObject[] = [];

  static readonly HEIGHT = 80;

  constructor(scene: Phaser.Scene) {
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
}
