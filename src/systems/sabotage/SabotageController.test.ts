import { describe, expect, it, vi } from 'vitest';
import { SabotageController } from './SabotageController';
import type { Tower } from '../../entities/Tower';
import type { TowerManager } from '../TowerManager';

/** Minimal Tower stand-in. Mimics the fields SabotageController reads
 *  + a takeDamage that drives hp to zero and sets _expired. */
function makeTower(col: number, row: number): Partial<Tower> {
  const t: any = {
    col, row,
    hp: undefined,
    maxHp: undefined,
    destructible: false,
    ownerIndex: 0,
    _expired: false,
    _invulnerable: false,
    isGenerator: false,
    isThrone: false,
    generatorLinkedCells: undefined,
    takeDamage(amount: number) {
      if (!this.destructible || this.hp === undefined) return false;
      if (this.hp <= 0) return false;
      if (this._invulnerable) return false;
      this.hp -= amount;
      if (this.hp <= 0) {
        this.hp = 0;
        this._expired = true;
        return true;
      }
      return false;
    },
  };
  return t;
}

/** TowerManager stand-in — we only need placeTower to return a fresh
 *  tower stub at the requested cell. */
function makeTowerMgr(): TowerManager {
  const placed: Partial<Tower>[] = [];
  return {
    placeTower(col: number, row: number) {
      const tower = makeTower(col, row);
      placed.push(tower);
      return { tower };
    },
    get towers() { return placed; },
  } as unknown as TowerManager;
}

vi.mock('../../data/TowerTypes', () => ({
  getTowerType: (id: string) => ({ id, name: id, cost: 0, fireRate: 1000, damage: 1, range: 0 }),
}));

/** Simple gold-spender stub matching `EconomyManager.spend`'s shape. */
function makeEconomy(initial = 99_999) {
  let bal = initial;
  return {
    spend(cost: number) {
      if (bal < cost) return false;
      bal -= cost;
      return true;
    },
    balance: () => bal,
  };
}

const TEST_WORKSHOP = { col: 30, row: 10, pixelX: 900, pixelY: 300 };
const NO_LINKS: { col: number; row: number }[] = [];

/** Args every test needs (workshop + economy are required). */
function baseArgs(towerMgr: TowerManager) {
  return {
    rules: {},
    towerMgr,
    workshop: TEST_WORKSHOP,
    economy: makeEconomy(),
    destructibleTowers: [] as { col: number; row: number; towerId: string; hp: number; isGenerator?: boolean; linkedTowers?: { col: number; row: number }[]; isThrone?: boolean }[],
  };
}

describe('SabotageController', () => {
  it('places destructible towers + generators + throne with the right flags', () => {
    const mgr = makeTowerMgr();
    const ctrl = new SabotageController({
      ...baseArgs(mgr),
      destructibleTowers: [
        { col: 1, row: 1, towerId: 'mech_turret', hp: 600 },
        { col: 5, row: 5, towerId: 'mech_generator', hp: 1200, isGenerator: true, linkedTowers: [{ col: 1, row: 1 }] },
        { col: 0, row: 0, towerId: 'mech_throne', hp: 5000, isThrone: true },
      ],
    });
    expect(ctrl.getTotalGeneratorCount()).toBe(1);
    expect(ctrl.getAliveGeneratorCount()).toBe(1);
    expect(ctrl.getThrone()?._invulnerable).toBe(true);
    expect(ctrl.getThrone()?.isThrone).toBe(true);
  });

  it('expires linked towers when the generator dies', () => {
    const mgr = makeTowerMgr();
    const ctrl = new SabotageController({
      ...baseArgs(mgr),
      destructibleTowers: [
        { col: 1, row: 1, towerId: 'mech_turret', hp: 600 },
        { col: 2, row: 2, towerId: 'mech_turret', hp: 600 },
        { col: 5, row: 5, towerId: 'mech_generator', hp: 1200, isGenerator: true, linkedTowers: [{ col: 1, row: 1 }, { col: 2, row: 2 }] },
      ],
    });
    const generator = (mgr.towers as any)[2] as Partial<Tower>;
    generator.takeDamage!(generator.maxHp!);
    ctrl.update();
    const linked1 = (mgr.towers as any)[0];
    const linked2 = (mgr.towers as any)[1];
    expect(linked1._expired).toBe(true);
    expect(linked2._expired).toBe(true);
  });

  it('throne becomes vulnerable + fires callback once every generator is down', () => {
    const mgr = makeTowerMgr();
    const onThroneVulnerable = vi.fn();
    const ctrl = new SabotageController({
      ...baseArgs(mgr),
      destructibleTowers: [
        { col: 5, row: 5, towerId: 'mech_generator', hp: 100, isGenerator: true, linkedTowers: NO_LINKS },
        { col: 6, row: 6, towerId: 'mech_generator', hp: 100, isGenerator: true, linkedTowers: NO_LINKS },
        { col: 0, row: 0, towerId: 'mech_throne', hp: 5000, isThrone: true },
      ],
      onThroneVulnerable,
    });
    expect(ctrl.getThrone()?._invulnerable).toBe(true);
    const [g1, g2] = (mgr.towers as any).slice(0, 2);
    g1.takeDamage(100);
    ctrl.update();
    expect(ctrl.getThrone()?._invulnerable).toBe(true);
    expect(onThroneVulnerable).not.toHaveBeenCalled();
    g2.takeDamage(100);
    ctrl.update();
    expect(ctrl.getThrone()?._invulnerable).toBe(false);
    expect(onThroneVulnerable).toHaveBeenCalledTimes(1);
    ctrl.update();
    expect(onThroneVulnerable).toHaveBeenCalledTimes(1);
  });

  it('throne is invulnerable to damage while any generator is alive', () => {
    const mgr = makeTowerMgr();
    new SabotageController({
      ...baseArgs(mgr),
      destructibleTowers: [
        { col: 5, row: 5, towerId: 'mech_generator', hp: 100, isGenerator: true, linkedTowers: NO_LINKS },
        { col: 0, row: 0, towerId: 'mech_throne', hp: 1000, isThrone: true },
      ],
    });
    const throne = (mgr.towers as any)[1];
    throne.takeDamage(9999);
    expect(throne.hp).toBe(1000);
    expect(throne._expired).toBe(false);
  });

  it('fires onWin exactly once when the throne dies', () => {
    const mgr = makeTowerMgr();
    const onWin = vi.fn();
    const ctrl = new SabotageController({
      ...baseArgs(mgr),
      destructibleTowers: [
        { col: 0, row: 0, towerId: 'mech_throne', hp: 100, isThrone: true },
      ],
      onWin,
    });
    ctrl.update();
    const throne = ctrl.getThrone()!;
    expect(throne._invulnerable).toBe(false);
    (throne as any).takeDamage(100);
    ctrl.update();
    expect(onWin).toHaveBeenCalledTimes(1);
    ctrl.update();
    expect(onWin).toHaveBeenCalledTimes(1);
  });

  it('handles a generator with no linked towers cleanly', () => {
    const mgr = makeTowerMgr();
    const ctrl = new SabotageController({
      ...baseArgs(mgr),
      destructibleTowers: [
        { col: 5, row: 5, towerId: 'mech_generator', hp: 100, isGenerator: true /* linkedTowers omitted */ },
      ],
    });
    const g = (mgr.towers as any)[0];
    expect(() => {
      g.takeDamage(100);
      ctrl.update();
    }).not.toThrow();
    expect(ctrl.getAliveGeneratorCount()).toBe(0);
  });

  it('uses default hp when spec.hp is missing on the throne', () => {
    const mgr = makeTowerMgr();
    new SabotageController({
      ...baseArgs(mgr),
      rules: { cpuTowerHpDefault: 999 },
      destructibleTowers: [
        { col: 0, row: 0, towerId: 'mech_throne', hp: undefined as unknown as number, isThrone: true },
      ],
    });
    const throne = (mgr.towers as any)[0];
    expect(throne.maxHp).toBe(999);
    expect(throne.hp).toBe(999);
  });

  describe('workshop + raider squad integration', () => {
    function makeCtrl(extra: Partial<Parameters<typeof baseArgs>[0]> & { economy?: ReturnType<typeof makeEconomy>; onRaiderDied?: (r: unknown) => void } = {}) {
      const mgr = makeTowerMgr();
      const economy = extra.economy ?? makeEconomy();
      const ctrl = new SabotageController({
        ...baseArgs(mgr),
        economy,
        destructibleTowers: [
          { col: 0, row: 0, towerId: 'mech_throne', hp: 100, isThrone: true },
        ],
        onRaiderDied: extra.onRaiderDied,
      });
      return { mgr, ctrl, economy };
    }

    it('trainRaider succeeds and spawns at workshop pixel', () => {
      const economy = makeEconomy(1000);
      const { ctrl } = makeCtrl({ economy });
      expect(ctrl.trainRaider(0)).toBe(true);
      expect(ctrl.getRaiders().length).toBe(1);
      const r = ctrl.getRaiders()[0];
      expect(r.x).toBe(900);
      expect(r.y).toBe(300);
      expect(economy.balance()).toBe(850);
    });

    it('upgrades persist across raider deaths and apply to NEW raiders only', () => {
      const { ctrl } = makeCtrl();
      ctrl.trainRaider(0);
      const earlyRaider = ctrl.getRaiders()[0];
      const earlyHp = earlyRaider.maxHp;
      ctrl.buyUpgrade('plate');
      ctrl.trainRaider(99_999);
      const lateRaider = ctrl.getRaiders()[1];
      expect(lateRaider.maxHp).toBeGreaterThan(earlyHp);
      earlyRaider.takeDamage(99_999);
      expect(earlyRaider.alive).toBe(false);
    });

    it('update ticks raiders and prunes dead ones', () => {
      const onDied = vi.fn();
      const { ctrl } = makeCtrl({ onRaiderDied: onDied });
      ctrl.trainRaider(0);
      const r = ctrl.getRaiders()[0];
      r.takeDamage(r.maxHp);
      ctrl.update(0, 16, [], []);
      expect(ctrl.getRaiders()).toHaveLength(0);
      expect(onDied).toHaveBeenCalledOnce();
    });

    it('setRaiderTarget routes through the raider only when it owns the unit', () => {
      const { ctrl } = makeCtrl();
      ctrl.trainRaider(0);
      const r = ctrl.getRaiders()[0];
      const fakeTarget = { x: 0, y: 0, alive: true, takeDamage: () => false };
      ctrl.setRaiderTarget(r, fakeTarget);
      expect(r.manualTarget).toBe(fakeTarget);
      const stranger: any = { setManualTarget: vi.fn() };
      ctrl.setRaiderTarget(stranger, fakeTarget);
      expect(stranger.setManualTarget).not.toHaveBeenCalled();
    });

    it('findRaiderById returns the matching raider or null', () => {
      const { ctrl } = makeCtrl();
      ctrl.trainRaider(0);
      const r = ctrl.getRaiders()[0];
      expect(ctrl.findRaiderById(r.id)).toBe(r);
      expect(ctrl.findRaiderById(9999)).toBeNull();
    });
  });

  describe('CPU towers attack raiders', () => {
    function setup() {
      const mgr = makeTowerMgr();
      const ctrl = new SabotageController({
        ...baseArgs(mgr),
        destructibleTowers: [
          { col: 5, row: 5, towerId: 'mech_turret', hp: 600 },
          { col: 0, row: 0, towerId: 'mech_throne', hp: 100, isThrone: true },
        ],
      });
      // Configure the CPU turret with combat stats and pixel position
      // (the placement helper doesn't set damage/range/fireRate on
      // the test mock — production Tower carries these from typeDef).
      const turret = (mgr.towers as any)[0];
      turret.x = 100;
      turret.y = 100;
      turret.damage = 25;
      turret.range = 200;
      turret.fireRate = 1000;
      turret.lastFired = -Infinity;
      return { mgr, ctrl, turret };
    }

    it('damages the closest in-range raider when cooldown is available', () => {
      const { ctrl, turret } = setup();
      ctrl.trainRaider(0);
      const r = ctrl.getRaiders()[0];
      r.x = 100; r.y = 150;       // 50px → in range (200)
      ctrl.update(5_000, 16, [], []);
      expect(r.hp).toBe(r.maxHp - turret.damage);
      expect(turret.lastFired).toBe(5_000);
    });

    it('does not fire on cooldown', () => {
      const { ctrl, turret } = setup();
      ctrl.trainRaider(0);
      const r = ctrl.getRaiders()[0];
      r.x = 100; r.y = 150;
      ctrl.update(5_000, 16, [], []);
      const hpAfter1 = r.hp;
      ctrl.update(5_500, 16, [], []);  // 500ms < 1000ms fireRate
      expect(r.hp).toBe(hpAfter1);
    });

    it('skips out-of-range raiders', () => {
      const { ctrl } = setup();
      ctrl.trainRaider(0);
      const r = ctrl.getRaiders()[0];
      r.x = 1000; r.y = 1000;     // way out of range
      ctrl.update(5_000, 16, [], []);
      expect(r.hp).toBe(r.maxHp);
    });

    it('skips when no raiders are alive', () => {
      const { ctrl, turret } = setup();
      ctrl.update(5_000, 16, [], []);
      expect(turret.lastFired).toBe(-Infinity);
    });
  });
});
