import { describe, expect, it } from 'vitest';
import { Raider } from './Raider';
import type { Damageable } from '../systems/finale/Damageable';

function makeTarget(x: number, y: number, hp = 100): Damageable & { takeDamageCalls: number[] } {
  const t: any = {
    id: 'mock',
    x, y,
    col: Math.floor(x / 32),
    row: Math.floor(y / 32),
    widthCells: 1,
    heightCells: 1,
    hp,
    maxHp: hp,
    alive: true,
    factionId: 'mechanical',
    ownerIndex: 99,
    isMissionWinTarget: false,
    takeDamageCalls: [] as number[],
    takeDamage(amount: number) {
      this.takeDamageCalls.push(amount);
      this.hp -= amount;
      if (this.hp <= 0) {
        this.hp = 0;
        this.alive = false;
        return true;
      }
      return false;
    },
  };
  return t;
}

function makeRaider(opts: Partial<ConstructorParameters<typeof Raider>[0]> = {}): Raider {
  return new Raider({
    id: 1,
    x: 0,
    y: 0,
    hp: 200,
    attack: 30,
    speed: 100,
    ...opts,
  });
}

describe('Raider', () => {
  it('takes damage and dies on the killing blow', () => {
    const r = makeRaider({ hp: 50 });
    expect(r.takeDamage(20)).toBe(false);
    expect(r.hp).toBe(30);
    expect(r.alive).toBe(true);
    expect(r.takeDamage(40)).toBe(true);
    expect(r.hp).toBe(0);
    expect(r.alive).toBe(false);
    // Further damage is a no-op.
    expect(r.takeDamage(99)).toBe(false);
  });

  it('walks toward the nearest target when out of range', () => {
    const r = makeRaider({ x: 0, y: 0, speed: 100 });
    const t = makeTarget(500, 0); // far away
    // 1 second tick at 100 px/s = 100 px move along +x.
    r.update(0, 1000, [t]);
    expect(r.x).toBeCloseTo(100);
    expect(r.y).toBeCloseTo(0);
  });

  it('does not overshoot the target when step exceeds distance', () => {
    const r = makeRaider({ x: 0, y: 0, speed: 1000, range: 1 }); // tiny range
    const t = makeTarget(50, 0);
    r.update(0, 1000, [t]);
    expect(r.x).toBeLessThanOrEqual(50);
  });

  it('fires when in range and cooldown elapsed', () => {
    const r = makeRaider({ range: 100, fireRateMs: 500, attack: 30 });
    const t = makeTarget(50, 0); // within 100px range
    r.update(0, 16, [t]);
    expect(t.takeDamageCalls).toEqual([30]);
    // Same frame again — cooldown not elapsed.
    r.update(100, 16, [t]);
    expect(t.takeDamageCalls).toEqual([30]);
    // After cooldown.
    r.update(500, 16, [t]);
    expect(t.takeDamageCalls).toEqual([30, 30]);
  });

  it('picks the nearest alive target', () => {
    const r = makeRaider({ x: 0, y: 0, range: 1000 });
    const near = makeTarget(50, 0);
    const far = makeTarget(500, 0);
    r.update(0, 16, [far, near]);
    expect(near.takeDamageCalls).toEqual([r.attack]);
    expect(far.takeDamageCalls).toEqual([]);
  });

  it('honors manual target over auto — attacks the manual target, not the closer auto-pick', () => {
    const r = makeRaider({ x: 0, y: 0, range: 1000 });
    const near = makeTarget(50, 0);
    const far = makeTarget(500, 0);
    r.setManualTarget(far);
    r.update(0, 16, [near, far]);
    expect(near.takeDamageCalls).toEqual([]);
    expect(far.takeDamageCalls).toEqual([r.attack]);
  });

  it('clears already-dead manual target on the next update tick', () => {
    const r = makeRaider({ x: 0, y: 0, range: 1000 });
    const corpse = makeTarget(50, 0, 30);
    (corpse as { alive: boolean }).alive = false;
    r.setManualTarget(corpse);
    expect(r.manualTarget).toBe(corpse);
    r.update(0, 16, []);
    expect(r.manualTarget).toBeNull();
  });

  it('clears manual target when it dies', () => {
    const r = makeRaider({ x: 0, y: 0, range: 1000 });
    const target = makeTarget(50, 0, 30);
    r.setManualTarget(target);
    r.update(0, 16, [target]);   // hits for 30 → kill
    expect(target.alive).toBe(false);
    expect(r.manualTarget).toBeNull();
  });

  it('returns null when no targets are visible', () => {
    const r = makeRaider();
    expect(r.update(0, 16, [])).toBeNull();
  });

  it('stops engaging after death', () => {
    const r = makeRaider({ hp: 1 });
    const target = makeTarget(50, 0);
    r.takeDamage(1);
    expect(r.update(0, 16, [target])).toBeNull();
    expect(target.takeDamageCalls).toEqual([]);
  });
});
