/**
 * Shared placement helper for the two finale controllers (Arcane M10
 * via FinaleController, Mech M10 via SabotageController). Both
 * controllers consume `mapDef.destructibleTowers` and stamp the same
 * base shape (destructible / ownerIndex / hp / maxHp) before applying
 * mission-specific flags (isUlt, isGenerator, isThrone, …).
 *
 * Centralising this prevents drift between the two controllers and
 * keeps the per-controller setup loop focused on the flags it cares
 * about.
 */

import type { Tower } from '../../entities/Tower';
import type { TowerManager } from '../TowerManager';
import { getTowerType } from '../../data/TowerTypes';

export interface BaseCpuTowerSpec {
  col: number;
  row: number;
  towerId: string;
  hp: number;
}

export interface PlacedCpuTower<T extends BaseCpuTowerSpec> {
  spec: T;
  tower: Tower;
}

/** Place every CPU tower spec via the TowerManager (free placement),
 *  stamp `destructible / ownerIndex / hp / maxHp` on each, and return
 *  the placement pairs in input order. Specs that fail to place are
 *  skipped with a console warning (matches the previous inlined
 *  per-controller behaviour).
 *
 *  Caller stamps mission-specific flags on `pair.tower` and pushes
 *  into whatever bucket lists they maintain (cpuTowers, generators,
 *  throne ref, etc). */
export function placeCpuTowers<T extends BaseCpuTowerSpec>(
  towerMgr: TowerManager,
  specs: T[],
  ownerIndex: number,
  defaultHp: number,
): PlacedCpuTower<T>[] {
  const out: PlacedCpuTower<T>[] = [];
  for (const spec of specs) {
    try {
      const towerType = getTowerType(spec.towerId);
      const result = towerMgr.placeTower(
        spec.col, spec.row, towerType,
        [], () => [],
        true,
      );
      if (!result) continue;
      const t = result.tower;
      t.destructible = true;
      t.ownerIndex = ownerIndex;
      t.maxHp = spec.hp ?? defaultHp;
      t.hp = t.maxHp;
      out.push({ spec, tower: t });
    } catch (err) {
      console.warn(`[cpuPlacement] failed to place ${spec.towerId} at ${spec.col},${spec.row}:`, err);
    }
  }
  return out;
}
