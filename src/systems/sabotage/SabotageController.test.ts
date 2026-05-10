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

/** Tower-type registry stub — getTowerType is called for each spec, so
 *  we register a pass-through entry. Vitest auto-mocks the data file. */
vi.mock('../../data/TowerTypes', () => ({
  getTowerType: (id: string) => ({ id, name: id, cost: 0, fireRate: 1000, damage: 1, range: 0 }),
}));

const NO_LINKS: { col: number; row: number }[] = [];

describe('SabotageController', () => {
  it('places destructible towers + generators + throne with the right flags', () => {
    const mgr = makeTowerMgr();
    const ctrl = new SabotageController({
      rules: {},
      towerMgr: mgr,
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
      rules: {},
      towerMgr: mgr,
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
      rules: {},
      towerMgr: mgr,
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
    expect(ctrl.getThrone()?._invulnerable).toBe(true); // one alive
    expect(onThroneVulnerable).not.toHaveBeenCalled();
    g2.takeDamage(100);
    ctrl.update();
    expect(ctrl.getThrone()?._invulnerable).toBe(false);
    expect(onThroneVulnerable).toHaveBeenCalledTimes(1);
    // Idempotency: extra updates don't refire.
    ctrl.update();
    expect(onThroneVulnerable).toHaveBeenCalledTimes(1);
  });

  it('throne is invulnerable to damage while any generator is alive', () => {
    const mgr = makeTowerMgr();
    new SabotageController({
      rules: {},
      towerMgr: mgr,
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
      rules: {},
      towerMgr: mgr,
      destructibleTowers: [
        { col: 0, row: 0, towerId: 'mech_throne', hp: 100, isThrone: true },
      ],
      onWin,
    });
    // No generators → throne becomes vulnerable on first update.
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
      rules: {},
      towerMgr: mgr,
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
      rules: { cpuTowerHpDefault: 999 },
      towerMgr: mgr,
      destructibleTowers: [
        { col: 0, row: 0, towerId: 'mech_throne', hp: undefined as unknown as number, isThrone: true },
      ],
    });
    const throne = (mgr.towers as any)[0];
    expect(throne.maxHp).toBe(999);
    expect(throne.hp).toBe(999);
  });

  describe('workshop + raider squad integration', () => {
    function makeCtrl() {
      const mgr = makeTowerMgr();
      const ctrl = new SabotageController({
        rules: {},
        towerMgr: mgr,
        workshop: { col: 30, row: 10, pixelX: 900, pixelY: 300 },
        destructibleTowers: [
          { col: 0, row: 0, towerId: 'mech_throne', hp: 100, isThrone: true },
        ],
      });
      return { mgr, ctrl };
    }

    it('trainRaider succeeds and spawns at workshop pixel', () => {
      const { ctrl } = makeCtrl();
      const wallet = { bal: 1000, debit(n: number) { if (this.bal < n) return false; this.bal -= n; return true; } };
      expect(ctrl.trainRaider(0, wallet.debit.bind(wallet))).toBe(true);
      expect(ctrl.getRaiders().length).toBe(1);
      const r = ctrl.getRaiders()[0];
      expect(r.x).toBe(900);
      expect(r.y).toBe(300);
      expect(wallet.bal).toBe(850);
    });

    it('train returns false when no workshop is configured', () => {
      const mgr = makeTowerMgr();
      const ctrl = new SabotageController({
        rules: {}, towerMgr: mgr, destructibleTowers: [],
      });
      const debit = vi.fn(() => true);
      expect(ctrl.trainRaider(0, debit)).toBe(false);
      expect(debit).not.toHaveBeenCalled();
    });

    it('upgrades persist across raider deaths and apply to NEW raiders only', () => {
      const { ctrl } = makeCtrl();
      const wallet = { bal: 99_999, debit(n: number) { this.bal -= n; return true; } };
      const debit = wallet.debit.bind(wallet);
      ctrl.trainRaider(0, debit);
      const earlyRaider = ctrl.getRaiders()[0];
      const earlyHp = earlyRaider.maxHp;
      ctrl.buyUpgrade('plate', debit);
      ctrl.trainRaider(99_999, debit);
      const lateRaider = ctrl.getRaiders()[1];
      expect(lateRaider.maxHp).toBeGreaterThan(earlyHp);
      // Killing the early raider doesn't retro-upgrade anyone.
      earlyRaider.takeDamage(99_999);
      expect(earlyRaider.alive).toBe(false);
    });

    it('update ticks raiders and prunes dead ones', () => {
      const { ctrl } = makeCtrl();
      const onDied = vi.fn();
      // Reach into the controller — install the death hook by reconstructing
      // (cleaner than mutating private state).
      const mgr2 = makeTowerMgr();
      const ctrl2 = new SabotageController({
        rules: {}, towerMgr: mgr2,
        workshop: { col: 30, row: 10, pixelX: 900, pixelY: 300 },
        destructibleTowers: [],
        onRaiderDied: onDied,
      });
      const debit = (_n: number) => true;
      ctrl2.trainRaider(0, debit);
      const r = ctrl2.getRaiders()[0];
      r.takeDamage(r.maxHp);
      ctrl2.update(0, 16, [], []);
      expect(ctrl2.getRaiders()).toHaveLength(0);
      expect(onDied).toHaveBeenCalledOnce();
    });

    it('setRaiderTarget routes through the raider only when it owns the unit', () => {
      const { ctrl } = makeCtrl();
      const debit = (_n: number) => true;
      ctrl.trainRaider(0, debit);
      const r = ctrl.getRaiders()[0];
      const fakeTarget = { x: 0, y: 0, alive: true, takeDamage: () => false };
      ctrl.setRaiderTarget(r, fakeTarget);
      expect(r.manualTarget).toBe(fakeTarget);
      // A raider not owned by this controller is a no-op.
      const stranger: any = { setManualTarget: vi.fn() };
      ctrl.setRaiderTarget(stranger, fakeTarget);
      expect(stranger.setManualTarget).not.toHaveBeenCalled();
    });

    it('findRaiderById returns the matching raider or null', () => {
      const { ctrl } = makeCtrl();
      const debit = (_n: number) => true;
      ctrl.trainRaider(0, debit);
      const r = ctrl.getRaiders()[0];
      expect(ctrl.findRaiderById(r.id)).toBe(r);
      expect(ctrl.findRaiderById(9999)).toBeNull();
    });
  });
});
