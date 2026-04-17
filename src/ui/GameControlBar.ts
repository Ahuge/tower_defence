import * as Phaser from 'phaser';
import { getCanvasWidth, getGameWidth, getGridOffsetX } from '../config';
import { ArenaManager } from '../systems/ArenaManager';
import { Hero } from '../entities/Hero';
import { UIScale } from '../systems/UIScale';

interface ControlButton {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  color: number;
  action: () => void;
  // Dynamic state
  cooldown?: () => number;  // returns seconds remaining
  locked?: () => boolean;
  zone: Phaser.GameObjects.Zone;
}

/**
 * Touch control bar for phone mode.
 * Shows wave start, speed, pause buttons (all modes)
 * + ability buttons Q/W/E/R/T (hero defense mode).
 */
export class GameControlBar {
  private scene: Phaser.Scene;
  private graphics: Phaser.GameObjects.Graphics;
  private buttons: ControlButton[] = [];
  private labels: Phaser.GameObjects.Text[] = [];
  private arenaManager: ArenaManager | null;

  static readonly BAR_HEIGHT = 70; // phone-only bar, fixed height
  private static get BTN_SIZE(): number {
    return UIScale.current.btnSize;
  }
  private static readonly BTN_GAP = 4;

  private onWaveStart: (() => void) | null = null;
  private onSpeedCycle: (() => void) | null = null;
  private onPause: (() => void) | null = null;
  private onAutoPlay: (() => void) | null = null;

  // State for display
  private waveActive = false;
  private betweenWaves = false;
  private canStart = false;
  private autoPlay = false;
  private gameSpeed = 1;

  constructor(
    scene: Phaser.Scene,
    y: number,
    arenaManager: ArenaManager | null,
  ) {
    this.scene = scene;
    this.arenaManager = arenaManager;
    this.graphics = scene.add.graphics().setDepth(32);

    const barY = y;
    const { BTN_SIZE, BTN_GAP } = GameControlBar;
    let x = getGridOffsetX() + 4;

    // Wave start button
    this.addButton(x, barY + 2, BTN_SIZE + 16, BTN_SIZE, '▶ Wave', 0x226622, () => {
      this.onWaveStart?.();
    });
    x += BTN_SIZE + 16 + BTN_GAP;

    // Speed button
    this.addButton(x, barY + 2, BTN_SIZE, BTN_SIZE, '1x', 0x222244, () => {
      this.onSpeedCycle?.();
    });
    x += BTN_SIZE + BTN_GAP;

    // Pause button
    this.addButton(x, barY + 2, BTN_SIZE, BTN_SIZE, '⏸', 0x333333, () => {
      this.onPause?.();
    });
    x += BTN_SIZE + BTN_GAP;

    // Auto-play button
    this.addButton(x, barY + 2, BTN_SIZE + 10, BTN_SIZE, 'Auto', 0x224422, () => {
      this.onAutoPlay?.();
    });
    x += BTN_SIZE + 10 + BTN_GAP;

    // Hero defense ability buttons
    if (arenaManager) {
      x += 8; // gap before abilities

      const hero = arenaManager.hero;
      const abilityKeys = ['Q', 'W', 'E'];
      for (let i = 0; i < abilityKeys.length; i++) {
        const idx = i;
        const ab = hero.abilities[idx];
        this.addButton(x, barY + 2, BTN_SIZE, BTN_SIZE, abilityKeys[i], hero.typeDef.color, () => {
          arenaManager.handleAbilityKey(idx);
        }, () => ab.cooldownRemaining, () => false);
        x += BTN_SIZE + BTN_GAP;
      }

      // Ultimate (R)
      if (hero.ultimate) {
        const ult = hero.ultimate;
        this.addButton(x, barY + 2, BTN_SIZE, BTN_SIZE, 'R', 0x6633aa, () => {
          arenaManager.handleAbilityKey(3);
        }, () => ult.cooldownRemaining, () => hero.level < Hero.ULTIMATE_UNLOCK_LEVEL);
        x += BTN_SIZE + BTN_GAP;
      }

      // Accessory (T)
      this.addButton(x, barY + 2, BTN_SIZE, BTN_SIZE, 'T', 0x553366, () => {
        arenaManager.handleAccessoryKey();
      });
    }
  }

  private addButton(
    x: number, y: number, w: number, h: number,
    label: string, color: number, action: () => void,
    cooldown?: () => number, locked?: () => boolean,
  ): void {
    const zone = this.scene.add.zone(x + w / 2, y + h / 2, w, h)
      .setDepth(33)
      .setInteractive({ useHandCursor: true });
    zone.on('pointerdown', action);

    const textObj = this.scene.add.text(x + w / 2, y + h / 2, label, {
      fontSize: UIScale.font(14), color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(34);
    this.labels.push(textObj);

    this.buttons.push({ x, y, w, h, label, color, action, cooldown, locked, zone });
  }

  setCallbacks(onWaveStart: () => void, onSpeedCycle: () => void, onPause: () => void, onAutoPlay?: () => void): void {
    this.onWaveStart = onWaveStart;
    this.onSpeedCycle = onSpeedCycle;
    this.onPause = onPause;
    this.onAutoPlay = onAutoPlay ?? null;
  }

  setState(waveActive: boolean, betweenWaves: boolean, canStart: boolean, gameSpeed: number, autoPlay: boolean = false): void {
    this.waveActive = waveActive;
    this.betweenWaves = betweenWaves;
    this.canStart = canStart;
    this.gameSpeed = gameSpeed;
    this.autoPlay = autoPlay;
  }

  update(): void {
    this.graphics.clear();

    // Bar background
    const barY = this.buttons[0]?.y ?? 0;
    this.graphics.fillStyle(0x111118, 1);
    this.graphics.fillRect(getGridOffsetX(), barY - 2, getCanvasWidth() - getGridOffsetX(), GameControlBar.BAR_HEIGHT);
    this.graphics.lineStyle(1, 0x333333, 1);
    this.graphics.lineBetween(getGridOffsetX(), barY - 2, getCanvasWidth(), barY - 2);

    for (let i = 0; i < this.buttons.length; i++) {
      const btn = this.buttons[i];
      const label = this.labels[i];

      const isLocked = btn.locked?.() ?? false;
      const cd = btn.cooldown?.() ?? 0;
      const onCooldown = cd > 0;

      // Button background
      const alpha = isLocked ? 0.3 : onCooldown ? 0.5 : 1;
      this.graphics.fillStyle(btn.color, alpha);
      this.graphics.fillRect(btn.x, btn.y, btn.w, btn.h);
      this.graphics.lineStyle(1, 0x555555, 0.5);
      this.graphics.strokeRect(btn.x, btn.y, btn.w, btn.h);

      // Cooldown overlay
      if (onCooldown && !isLocked) {
        label.setText(`${Math.ceil(cd)}`);
        label.setColor('#ff4444');
      } else if (isLocked) {
        label.setText(btn.label);
        label.setColor('#555555');
      } else {
        // Update special labels
        if (i === 0) {
          // Wave button
          label.setText(this.betweenWaves && this.canStart ? '▶' : '...');
          label.setColor(this.betweenWaves && this.canStart ? '#44ff44' : '#555555');
        } else if (i === 1) {
          // Speed button
          const speedLabel = this.gameSpeed === 0 ? '⏸' : `${this.gameSpeed}x`;
          label.setText(speedLabel);
          label.setColor(this.gameSpeed > 1 ? '#ffdd44' : '#aaaaaa');
        } else if (i === 3) {
          // Auto button
          label.setText(this.autoPlay ? 'AUTO' : 'Auto');
          label.setColor(this.autoPlay ? '#44ff44' : '#888888');
        } else {
          label.setText(btn.label);
          label.setColor('#ffffff');
        }
      }
    }
  }

  /** Hide all visuals and disable input — DOM takes over */
  hide(): void {
    this.graphics.setVisible(false);
    for (const btn of this.buttons) btn.zone.disableInteractive();
    for (const lbl of this.labels) lbl.setVisible(false);
  }

  destroy(): void {
    this.graphics.destroy();
    for (const btn of this.buttons) btn.zone.destroy();
    for (const lbl of this.labels) lbl.destroy();
  }
}
