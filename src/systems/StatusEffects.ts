export interface StatusEffect {
  type: string;
  duration: number; // remaining ms
  magnitude: number; // e.g. slow factor, DPS, shred level
}

export class StatusEffectManager {
  effects: StatusEffect[] = [];

  apply(type: string, duration: number, magnitude: number): void {
    const existing = this.effects.find(e => e.type === type);
    if (existing) {
      existing.duration = Math.max(existing.duration, duration);
      existing.magnitude = magnitude;
    } else {
      this.effects.push({ type, duration, magnitude });
    }
  }

  /** Apply stacking effects — magnitude adds instead of replaces */
  applyStacking(type: string, duration: number, magnitude: number): void {
    const existing = this.effects.find(e => e.type === type);
    if (existing) {
      existing.duration = Math.max(existing.duration, duration);
      existing.magnitude += magnitude;
    } else {
      this.effects.push({ type, duration, magnitude });
    }
  }

  update(delta: number): void {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      this.effects[i].duration -= delta;
      if (this.effects[i].duration <= 0) {
        this.effects.splice(i, 1);
      }
    }
  }

  getSlowFactor(): number {
    let factor = 1;
    for (const e of this.effects) {
      if (e.type === 'slow') factor = Math.min(factor, e.magnitude);
    }
    // Root = full stop
    if (this.has('root')) factor = 0;
    return factor;
  }

  /** Total DoT damage this frame (flat burn + % poison) */
  getDotDamage(delta: number, maxHp: number): number {
    let total = 0;
    for (const e of this.effects) {
      if (e.type === 'burn') {
        total += e.magnitude * (delta / 1000); // magnitude = damage per second
      } else if (e.type === 'poison') {
        total += maxHp * e.magnitude * (delta / 1000); // magnitude = fraction per second
      }
    }
    return Math.round(total);
  }

  /** Number of armor tiers to reduce (heavy→medium→light) */
  getArmorShred(): number {
    let shred = 0;
    for (const e of this.effects) {
      if (e.type === 'armor_shred') shred += e.magnitude;
    }
    return Math.floor(shred);
  }

  /** Incoming damage multiplier (1.0 = normal, 1.3 = +30%) */
  getDamageAmp(): number {
    let amp = 1;
    for (const e of this.effects) {
      if (e.type === 'damage_amp') amp += e.magnitude;
    }
    return amp;
  }

  has(type: string): boolean {
    return this.effects.some(e => e.type === type);
  }
}
