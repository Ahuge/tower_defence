import * as Phaser from 'phaser';
/**
 * AbilitySystem — manages visual effects for hero abilities.
 * Actual ability logic is in Hero.useAbility(). This handles VFX.
 */

export interface AbilityVFX {
  x: number;
  y: number;
  radius: number;
  color: number;
  lifetime: number; // ms remaining
  maxLifetime: number;
  type: 'circle' | 'ring';
}

export class AbilitySystem {
  private effects: AbilityVFX[] = [];
  private graphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics().setDepth(16);
  }

  /** Add a visual effect at position */
  addEffect(x: number, y: number, radius: number, color: number, duration: number, type: 'circle' | 'ring' = 'circle'): void {
    this.effects.push({
      x, y, radius, color,
      lifetime: duration,
      maxLifetime: duration,
      type,
    });
  }

  update(delta: number): void {
    this.graphics.clear();

    for (const fx of this.effects) {
      fx.lifetime -= delta;
      const alpha = Math.max(0, fx.lifetime / fx.maxLifetime) * 0.6;

      if (fx.type === 'circle') {
        this.graphics.fillStyle(fx.color, alpha);
        this.graphics.fillCircle(fx.x, fx.y, fx.radius);
      } else {
        this.graphics.lineStyle(2, fx.color, alpha);
        this.graphics.strokeCircle(fx.x, fx.y, fx.radius);
      }
    }

    this.effects = this.effects.filter(fx => fx.lifetime > 0);
  }

  destroy(): void {
    this.graphics.destroy();
  }
}
