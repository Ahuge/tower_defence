export interface StatusEffect {
  type: string;
  duration: number; // remaining ms
  magnitude: number; // e.g. slow factor (0.5 = 50% speed)
}

export class StatusEffectManager {
  effects: StatusEffect[] = [];

  apply(type: string, duration: number, magnitude: number): void {
    // Refresh if same type exists, otherwise add
    const existing = this.effects.find(e => e.type === type);
    if (existing) {
      existing.duration = Math.max(existing.duration, duration);
      existing.magnitude = magnitude;
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
      if (e.type === 'slow') {
        factor = Math.min(factor, e.magnitude);
      }
    }
    return factor;
  }

  has(type: string): boolean {
    return this.effects.some(e => e.type === type);
  }
}
