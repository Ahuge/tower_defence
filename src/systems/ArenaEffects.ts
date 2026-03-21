/**
 * Transient visual effects rendered in the hero arena.
 * Each effect has a position, type, duration, and color.
 * ArenaManager ticks elapsed and draws active effects.
 */

export type EffectType =
  | 'circle_expand'    // expanding ring (AoE, frost nova, ground slam)
  | 'circle_pulse'     // pulsing filled circle (meteor impact, stun)
  | 'flash'            // brief bright flash at point (teleport, execute)
  | 'dash_trail'       // line from A to B (dash, lunge)
  | 'ring'             // static ring that fades (taunt, buff)
  | 'lightning'        // jagged line between two points
  | 'shockwave';       // fast expanding thin ring

export interface ArenaEffect {
  type: EffectType;
  x: number;
  y: number;
  x2?: number;         // end point for dash_trail, lightning
  y2?: number;
  radius: number;      // max radius for circles, width for others
  color: number;
  alpha: number;       // starting alpha
  duration: number;    // total seconds
  elapsed: number;     // seconds elapsed (starts at 0)
}

/** Create common effect presets */
export const FX = {
  aoeBlast(x: number, y: number, radius: number, color: number): ArenaEffect {
    return { type: 'circle_expand', x, y, radius, color, alpha: 0.5, duration: 0.4, elapsed: 0 };
  },
  meteorImpact(x: number, y: number, radius: number): ArenaEffect {
    return { type: 'circle_pulse', x, y, radius, color: 0xff6622, alpha: 0.7, duration: 0.5, elapsed: 0 };
  },
  stun(x: number, y: number): ArenaEffect {
    return { type: 'circle_pulse', x, y, radius: 20, color: 0xffff44, alpha: 0.6, duration: 0.3, elapsed: 0 };
  },
  teleportFlash(x: number, y: number, color: number): ArenaEffect {
    return { type: 'flash', x, y, radius: 30, color, alpha: 0.8, duration: 0.3, elapsed: 0 };
  },
  dashTrail(x1: number, y1: number, x2: number, y2: number, color: number): ArenaEffect {
    return { type: 'dash_trail', x: x1, y: y1, x2, y2, radius: 4, color, alpha: 0.7, duration: 0.35, elapsed: 0 };
  },
  buffRing(x: number, y: number, color: number): ArenaEffect {
    return { type: 'ring', x, y, radius: 24, color, alpha: 0.6, duration: 0.6, elapsed: 0 };
  },
  lightning(x1: number, y1: number, x2: number, y2: number): ArenaEffect {
    return { type: 'lightning', x: x1, y: y1, x2, y2, radius: 3, color: 0x44aaff, alpha: 0.9, duration: 0.25, elapsed: 0 };
  },
  shockwave(x: number, y: number, radius: number, color: number): ArenaEffect {
    return { type: 'shockwave', x, y, radius, color, alpha: 0.5, duration: 0.35, elapsed: 0 };
  },
  execute(x: number, y: number): ArenaEffect {
    return { type: 'flash', x, y, radius: 18, color: 0xff4444, alpha: 0.9, duration: 0.25, elapsed: 0 };
  },
};

/** Draw a single effect onto a Graphics object */
export function drawEffect(g: Phaser.GameObjects.Graphics, fx: ArenaEffect): void {
  const t = fx.elapsed / fx.duration; // 0→1 progress
  const fadeAlpha = fx.alpha * (1 - t);

  switch (fx.type) {
    case 'circle_expand': {
      const r = fx.radius * t;
      g.lineStyle(2, fx.color, fadeAlpha);
      g.strokeCircle(fx.x, fx.y, r);
      // Filled inner glow
      g.fillStyle(fx.color, fadeAlpha * 0.2);
      g.fillCircle(fx.x, fx.y, r);
      break;
    }
    case 'circle_pulse': {
      // Fills then fades
      const r = fx.radius * (0.5 + t * 0.5);
      g.fillStyle(fx.color, fadeAlpha * 0.4);
      g.fillCircle(fx.x, fx.y, r);
      g.lineStyle(2, fx.color, fadeAlpha);
      g.strokeCircle(fx.x, fx.y, r);
      break;
    }
    case 'flash': {
      // Bright shrinking circle
      const r = fx.radius * (1 - t * 0.5);
      g.fillStyle(fx.color, fadeAlpha * 0.6);
      g.fillCircle(fx.x, fx.y, r);
      g.lineStyle(2, 0xffffff, fadeAlpha);
      g.strokeCircle(fx.x, fx.y, r * 0.6);
      break;
    }
    case 'dash_trail': {
      if (fx.x2 === undefined || fx.y2 === undefined) break;
      g.lineStyle(fx.radius * (1 - t * 0.5), fx.color, fadeAlpha);
      g.lineBetween(fx.x, fx.y, fx.x2, fx.y2);
      // Bright head
      g.fillStyle(0xffffff, fadeAlpha * 0.8);
      const hx = fx.x + (fx.x2 - fx.x) * Math.min(1, t * 2);
      const hy = fx.y + (fx.y2 - fx.y) * Math.min(1, t * 2);
      g.fillCircle(hx, hy, 5);
      break;
    }
    case 'ring': {
      const pulse = 1 + Math.sin(t * Math.PI * 4) * 0.15; // wobble
      g.lineStyle(2, fx.color, fadeAlpha);
      g.strokeCircle(fx.x, fx.y, fx.radius * pulse);
      break;
    }
    case 'lightning': {
      if (fx.x2 === undefined || fx.y2 === undefined) break;
      g.lineStyle(fx.radius * (1 - t), fx.color, fadeAlpha);
      // Jagged line: 4-5 segments with random offsets
      const segments = 5;
      let px = fx.x, py = fx.y;
      for (let i = 1; i <= segments; i++) {
        const frac = i / segments;
        const nx = fx.x + (fx.x2 - fx.x) * frac;
        const ny = fx.y + (fx.y2 - fx.y) * frac;
        const jitter = i < segments ? (1 - t) * 8 : 0;
        const jx = nx + (Math.random() - 0.5) * jitter * 2;
        const jy = ny + (Math.random() - 0.5) * jitter * 2;
        g.lineBetween(px, py, jx, jy);
        px = jx;
        py = jy;
      }
      break;
    }
    case 'shockwave': {
      const r = fx.radius * t;
      g.lineStyle(Math.max(1, 3 * (1 - t)), fx.color, fadeAlpha);
      g.strokeCircle(fx.x, fx.y, r);
      break;
    }
  }
}
