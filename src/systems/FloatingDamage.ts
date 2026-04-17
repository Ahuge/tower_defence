import * as Phaser from 'phaser';
/**
 * Pool of floating damage/heal/level-up text objects.
 * Spawned texts float upward, fade out, then recycle.
 */

export interface DamageNumberEntry {
  x: number;
  y: number;
  text: string;
  color: string;
  duration: number;
}

interface FloatingText {
  obj: Phaser.GameObjects.Text;
  startY: number;
  elapsed: number;
  duration: number;
  active: boolean;
}

// Color presets
export const DMG_COLOR = {
  NORMAL: '#ffffff',
  CRIT: '#ffff44',
  ABILITY: '#cc66ff',
  HERO_DAMAGE: '#ff4444',
  HEAL: '#44ff44',
  LEVEL_UP: '#ffaa44',
  GOLD: '#ffdd44',
  ELITE: '#ff6600',
};

export class FloatingDamage {
  private pool: FloatingText[] = [];
  private scene: Phaser.Scene;
  private static readonly POOL_SIZE = 30;
  private static readonly FLOAT_SPEED = 40; // pixels per second upward
  private static readonly DEFAULT_DURATION = 0.8;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    for (let i = 0; i < FloatingDamage.POOL_SIZE; i++) {
      const obj = scene.add.text(0, 0, '', {
        fontSize: '13px',
        fontFamily: 'monospace',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3,
      }).setDepth(25).setVisible(false).setOrigin(0.5);
      this.pool.push({ obj, startY: 0, elapsed: 0, duration: 0.8, active: false });
    }
  }

  spawn(x: number, y: number, text: string, color: string = DMG_COLOR.NORMAL, duration: number = FloatingDamage.DEFAULT_DURATION): void {
    // Find inactive slot
    let slot = this.pool.find(s => !s.active);
    if (!slot) {
      // Recycle oldest
      slot = this.pool[0];
      for (const s of this.pool) {
        if (s.elapsed > slot.elapsed) slot = s;
      }
    }

    // Slight random X offset to avoid stacking
    const offsetX = (Math.random() - 0.5) * 20;

    slot.obj.setText(text);
    slot.obj.setColor(color);
    slot.obj.setPosition(x + offsetX, y);
    slot.obj.setAlpha(1);
    slot.obj.setVisible(true);
    // Larger font for important texts
    if (color === DMG_COLOR.LEVEL_UP || color === DMG_COLOR.ELITE) {
      slot.obj.setFontSize(16);
    } else if (color === DMG_COLOR.CRIT) {
      slot.obj.setFontSize(14);
    } else {
      slot.obj.setFontSize(13);
    }
    slot.startY = y;
    slot.elapsed = 0;
    slot.duration = duration;
    slot.active = true;
  }

  update(dt: number): void {
    for (const slot of this.pool) {
      if (!slot.active) continue;
      slot.elapsed += dt;
      if (slot.elapsed >= slot.duration) {
        slot.active = false;
        slot.obj.setVisible(false);
        continue;
      }
      const progress = slot.elapsed / slot.duration;
      slot.obj.setY(slot.startY - FloatingDamage.FLOAT_SPEED * slot.elapsed);
      slot.obj.setAlpha(1 - progress * progress); // ease-out fade
    }
  }

  destroy(): void {
    for (const slot of this.pool) {
      slot.obj.destroy();
    }
    this.pool = [];
  }
}
