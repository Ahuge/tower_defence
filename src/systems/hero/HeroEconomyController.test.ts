/**
 * HeroEconomyController — unit tests for the mode-agnostic hero
 * progression layer. Covers accessory rotation cadence, gold spend
 * gating on purchases, hero-shop state push to GameUIStore, and the
 * onWaveCleared options bag.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { HeroEconomyController } from './HeroEconomyController';
import { EconomyManager } from '../EconomyManager';
import { EventBus } from '../EventBus';

interface HeroStub {
  level: number;
  xp: number;
  hp: number;
  maxHp: number;
  pendingUpgrades: number;
  tomeCount: number;
  tomeBonusDamage: number;
  tomeBonusHp: number;
  tomeBonusAttackSpeed: number;
  accessories: { id: string; name: string; description: string; passive?: boolean; cost?: number }[];
  accessoryCooldowns: Map<string, number>;
  items: { tier: number }[];
  abilities: { def: { key: string; name: string }; cooldownRemaining: number }[];
  abilityUpgrades: number[];
  ultimate: null;
  typeDef: { name: string };
  healPercent: (pct: number) => void;
  getEffectiveDamage: () => number;
  getEffectiveAttackSpeed: () => number;
  getEffectiveMaxHp: () => number;
  xpToNextLevel: () => number;
  grantXP: (n: number) => void;
  applyUpgrade: (id: string) => void;
  upgradeAbility: (i: number) => void;
  canUpgradeItem: (i: number) => { canUpgrade: boolean; cost: number };
  upgradeItem: (i: number) => void;
  equipAccessory: (acc: { id: string }) => void;
  getUpgradeOptions: () => { id: string; label: string; desc: string }[];
}

function makeHero(): HeroStub {
  return {
    level: 1, xp: 0, hp: 100, maxHp: 100,
    pendingUpgrades: 0,
    tomeCount: 0, tomeBonusDamage: 0, tomeBonusHp: 0, tomeBonusAttackSpeed: 0,
    accessories: [],
    accessoryCooldowns: new Map(),
    items: [{ tier: 0 }, { tier: 0 }, { tier: 0 }],
    abilities: [
      { def: { key: 'Q', name: 'Bolt' }, cooldownRemaining: 0 },
      { def: { key: 'W', name: 'Frost' }, cooldownRemaining: 0 },
      { def: { key: 'E', name: 'Storm' }, cooldownRemaining: 0 },
    ],
    abilityUpgrades: [0, 0, 0, 0],
    ultimate: null,
    typeDef: { name: 'Test Hero' },
    healPercent: function (pct: number) { this.hp = Math.min(this.maxHp, this.hp + this.maxHp * pct); },
    getEffectiveDamage: () => 10,
    getEffectiveAttackSpeed: () => 1,
    getEffectiveMaxHp: function () { return this.maxHp + this.tomeBonusHp; },
    xpToNextLevel: () => 100,
    grantXP: function (n: number) { this.xp += n; },
    applyUpgrade: function () { this.pendingUpgrades = Math.max(0, this.pendingUpgrades - 1); },
    upgradeAbility: function (i: number) { this.abilityUpgrades[i]++; this.pendingUpgrades--; },
    canUpgradeItem: () => ({ canUpgrade: true, cost: 50 }),
    upgradeItem: function (i: number) { this.items[i].tier++; },
    equipAccessory: function (acc) { this.accessories.push(acc as { id: string; name: string; description: string }); },
    getUpgradeOptions: () => [],
  };
}

function makeStubEventLog(): { messages: string[]; gameMessage: (s: string) => void; waveCleared: () => void; clear: () => void } {
  const messages: string[] = [];
  return {
    messages,
    gameMessage: (s: string) => { messages.push(s); },
    waveCleared: () => {},
    clear: () => { messages.length = 0; },
  };
}

function fresh() {
  const bus = new EventBus();
  const econ = new EconomyManager(bus);
  // Accessories range 600..2000g, and getRandomAccessories without a
  // seed uses Math.random() so per-CI-run the rolled offer at index 0
  // can land on the priciest entry. Seed enough gold to afford the
  // most expensive accessory + a bit, otherwise the "successful buy"
  // test flakes on CI when the random roll lands on a 2000g item.
  econ.addGold(5000);
  const hero = makeHero();
  const log = makeStubEventLog();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ctrl = new HeroEconomyController(hero as any, econ, log as any);
  return { ctrl, hero, econ, log };
}

describe('HeroEconomyController — accessory rotation', () => {
  it('rolls 3 offers on construction', () => {
    const { ctrl } = fresh();
    expect(ctrl.currentAccessoryOffers.length).toBe(3);
  });

  it('rotates when waveNum >= nextRotationWave', () => {
    const { ctrl } = fresh();
    const before = ctrl.currentAccessoryOffers.map(a => a.id).join(',');
    ctrl.nextRotationWave = 5;
    ctrl.rotateAccessories(5); // hits threshold
    expect(ctrl.nextRotationWave).toBe(10); // 5 + cadence(5)
    // New offers may overlap by chance, but rotation ran
    expect(ctrl.currentAccessoryOffers.length).toBe(3);
    void before;
  });

  it('does not rotate when waveNum < nextRotationWave', () => {
    const { ctrl } = fresh();
    ctrl.nextRotationWave = 5;
    const before = ctrl.currentAccessoryOffers.map(a => a.id).join(',');
    ctrl.rotateAccessories(3);
    expect(ctrl.nextRotationWave).toBe(5); // unchanged
    expect(ctrl.currentAccessoryOffers.map(a => a.id).join(',')).toBe(before);
  });

  it('respects custom rotationCadence', () => {
    const bus = new EventBus();
    const econ = new EconomyManager(bus);
    const hero = makeHero();
    const log = makeStubEventLog();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctrl = new HeroEconomyController(hero as any, econ, log as any, { rotationCadence: 4 });
    ctrl.nextRotationWave = 10;
    ctrl.rotateAccessories(10);
    expect(ctrl.nextRotationWave).toBe(14); // 10 + cadence(4)
  });

  it('skipInitialRoll leaves offers empty until first rotateAccessories', () => {
    const bus = new EventBus();
    const econ = new EconomyManager(bus);
    const hero = makeHero();
    const log = makeStubEventLog();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctrl = new HeroEconomyController(hero as any, econ, log as any, { skipInitialRoll: true });
    expect(ctrl.currentAccessoryOffers.length).toBe(0);
    ctrl.rotateAccessories(1);
    expect(ctrl.currentAccessoryOffers.length).toBe(3);
  });
});

describe('HeroEconomyController — onWaveCleared', () => {
  it('heals hero by healPercent', () => {
    const { ctrl, hero } = fresh();
    hero.hp = 50;
    hero.maxHp = 100;
    ctrl.onWaveCleared(2, { healPercent: 0.2 });
    expect(hero.hp).toBe(70); // +20 (20% of 100 max)
  });

  it('applies interest to gold pool when interestRate set', () => {
    const { ctrl, econ } = fresh();
    econ.spend(econ.gold);
    econ.addGold(1000);
    ctrl.onWaveCleared(2, { interestRate: 0.05 });
    expect(econ.gold).toBe(1050);
  });

  it('fires onInterestPaid callback with the actual amount', () => {
    const { ctrl, econ } = fresh();
    econ.spend(econ.gold);
    econ.addGold(1000);
    let paid = 0;
    ctrl.onWaveCleared(2, { interestRate: 0.03, onInterestPaid: (n) => { paid = n; } });
    expect(paid).toBe(30);
  });

  it('rotates accessories on every onWaveCleared call', () => {
    const { ctrl } = fresh();
    ctrl.nextRotationWave = 1; // ready to rotate
    ctrl.onWaveCleared(0);     // waveCleared(0) → rotateAccessories(1)
    expect(ctrl.nextRotationWave).toBe(6); // 1 + cadence(5)
  });

  it('skips heal when healPercent omitted', () => {
    const { ctrl, hero } = fresh();
    hero.hp = 50;
    hero.maxHp = 100;
    ctrl.onWaveCleared(2, {});
    expect(hero.hp).toBe(50);
  });
});

describe('HeroEconomyController — buyAccessory', () => {
  it('returns false when index out of range', () => {
    const { ctrl } = fresh();
    expect(ctrl.buyAccessory(99)).toBe(false);
  });

  it('refuses when 3 accessories already equipped', () => {
    const { ctrl, hero, log } = fresh();
    hero.accessories = [{ id: 'a', name: 'A', description: '' }, { id: 'b', name: 'B', description: '' }, { id: 'c', name: 'C', description: '' }];
    expect(ctrl.buyAccessory(0)).toBe(false);
    expect(log.messages.some((m: string) => m.includes('full'))).toBe(true);
  });

  it('refuses on duplicate id', () => {
    const { ctrl, hero, log } = fresh();
    const first = ctrl.currentAccessoryOffers[0];
    hero.accessories.push({ id: first.id, name: first.name, description: first.description });
    expect(ctrl.buyAccessory(0)).toBe(false);
    expect(log.messages.some((m: string) => m.includes('Already equipped'))).toBe(true);
  });

  it('refuses when player cannot afford', () => {
    const { ctrl, econ } = fresh();
    econ.spend(econ.gold); // drain to 0
    expect(ctrl.buyAccessory(0)).toBe(false);
  });

  it('successfully equips, charges, and removes from offers on success', () => {
    const { ctrl, econ, hero } = fresh();
    const offer = ctrl.currentAccessoryOffers[0];
    const goldBefore = econ.gold;
    expect(ctrl.buyAccessory(0)).toBe(true);
    expect(econ.gold).toBe(goldBefore - offer.cost);
    expect(hero.accessories.some(a => a.id === offer.id)).toBe(true);
    expect(ctrl.currentAccessoryOffers.find(a => a.id === offer.id)).toBeUndefined();
  });
});

describe('HeroEconomyController — destroy', () => {
  it('marks destroyed so syncToDOM/onWaveCleared no-op', () => {
    const { ctrl, hero } = fresh();
    hero.hp = 50; hero.maxHp = 100;
    ctrl.destroy();
    ctrl.onWaveCleared(2, { healPercent: 0.5 });
    expect(hero.hp).toBe(50); // not healed — destroyed
  });
});
