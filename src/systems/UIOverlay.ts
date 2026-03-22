import { GAME_HEIGHT, getGridOffsetX, getCanvasWidth } from '../config';
import { ResponsiveManager } from './ResponsiveManager';
import { EventBus } from './EventBus';

export class UIOverlay {
  private goldText: Phaser.GameObjects.Text;
  private livesText: Phaser.GameObjects.Text;
  private waveText: Phaser.GameObjects.Text;
  private statusText: Phaser.GameObjects.Text;
  private speedText: Phaser.GameObjects.Text;
  private waveBtn: Phaser.GameObjects.Text;
  private speedBtn: Phaser.GameObjects.Text;
  private seedText: Phaser.GameObjects.Text;
  private livesMode: 'lives' | 'base_hp';
  private onWaveStart: (() => void) | null = null;
  private onSpeedCycle: (() => void) | null = null;

  constructor(scene: Phaser.Scene, _events: EventBus, livesMode: 'lives' | 'base_hp' = 'lives') {
    this.livesMode = livesMode;
    const isPhone = ResponsiveManager.isPhone();
    const fs = isPhone ? '14px' : '16px';
    const uiStyle = { fontSize: fs, color: '#ffffff', fontFamily: 'monospace' };
    const baseX = getGridOffsetX();
    const cw = getCanvasWidth();
    const barY = GAME_HEIGHT + 4;

    // Compact layout for phone: tighter spacing
    const col1 = baseX + 8;
    const col2 = isPhone ? baseX + 100 : baseX + 160;
    const col3 = isPhone ? baseX + 210 : baseX + 300;
    const col4 = isPhone ? baseX + 320 : baseX + 480;

    this.goldText = scene.add.text(col1, barY, '', uiStyle).setDepth(30);
    this.livesText = scene.add.text(col2, barY, '', uiStyle).setDepth(30);
    this.waveText = scene.add.text(col3, barY, '', uiStyle).setDepth(30);
    this.statusText = scene.add.text(col4, barY, '', uiStyle).setDepth(30);
    // On phone, hide status text (wave/speed handled by control bar)
    if (isPhone) this.statusText.setVisible(false);

    this.speedText = scene.add.text(cw - 8, barY, '', {
      ...uiStyle, color: '#aaaaaa',
    }).setDepth(30).setOrigin(1, 0);
    if (isPhone) this.speedText.setVisible(false);

    // Tappable wave start button (hidden on phone — control bar handles it)
    this.waveBtn = scene.add.text(col4, barY, '', {
      fontSize: fs, color: '#44ff44', fontFamily: 'monospace',
      backgroundColor: '#1a2a1a', padding: { x: 6, y: 1 },
    }).setDepth(31).setInteractive({ useHandCursor: true }).setVisible(false);
    this.waveBtn.on('pointerdown', () => this.onWaveStart?.());
    this.waveBtn.on('pointerover', () => this.waveBtn.setColor('#88ff88'));
    this.waveBtn.on('pointerout', () => this.waveBtn.setColor('#44ff44'));

    // Tappable speed button (hidden on phone)
    this.speedBtn = scene.add.text(cw - 8, barY, '', {
      fontSize: fs, color: '#aaaaaa', fontFamily: 'monospace',
      backgroundColor: '#1a1a2a', padding: { x: 6, y: 1 },
    }).setDepth(31).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    this.speedBtn.on('pointerdown', () => this.onSpeedCycle?.());
    this.speedBtn.on('pointerover', () => this.speedBtn.setAlpha(0.7));
    this.speedBtn.on('pointerout', () => this.speedBtn.setAlpha(1));
    if (isPhone) this.speedBtn.setVisible(false);

    // Seed display (shown for random maps)
    this.seedText = scene.add.text(cw - 8, 4, '', {
      fontSize: '10px', color: '#666666', fontFamily: 'monospace',
    }).setDepth(30).setOrigin(1, 0).setVisible(false);
  }

  setCallbacks(onWaveStart: () => void, onSpeedCycle: () => void): void {
    this.onWaveStart = onWaveStart;
    this.onSpeedCycle = onSpeedCycle;
  }

  update(gold: number, lives: number, currentWave: number, totalWaves: number, waveActive: boolean, betweenWaves: boolean, gameSpeed: number = 1, versusTimer: number = -1): void {
    this.goldText.setText(`Gold: ${Math.floor(gold)}`);
    this.livesText.setText(this.livesMode === 'base_hp' ? `Base HP: ${lives}` : `Lives: ${lives}`);
    this.waveText.setText(`Wave: ${currentWave}/${totalWaves}`);

    if (betweenWaves && currentWave < totalWaves && lives > 0) {
      if (versusTimer >= 0) {
        this.statusText.setText(`[SPACE] Ready (${versusTimer}s)`);
      } else {
        this.statusText.setText('[SPACE] Start Next Wave');
      }
      // Show tappable wave button (not on phone — control bar handles it)
      if (!ResponsiveManager.isPhone()) {
        this.waveBtn.setText(versusTimer >= 0 ? `Ready (${versusTimer}s)` : 'Start Wave');
        this.waveBtn.setVisible(true);
      }
    } else if (waveActive) {
      this.statusText.setText('Wave in progress...');
      this.waveBtn.setVisible(false);
    } else {
      this.waveBtn.setVisible(false);
    }

    // Speed indicator
    const speedColor = gameSpeed === 0 ? '#ff4444' : gameSpeed === 1 ? '#aaaaaa' : '#ffdd44';
    this.speedText.setColor(speedColor);
    this.speedText.setText(`[TAB] ${gameSpeed}x`);

    // Speed button
    this.speedBtn.setColor(speedColor);
    this.speedBtn.setText(`${gameSpeed}x`);
  }

  setStatus(text: string): void {
    this.statusText.setText(text);
  }

  showSeed(seed: number): void {
    this.seedText.setText(`Seed: ${seed}`).setVisible(true);
  }
}
