/**
 * GameScene host-method cleanup tests.
 *
 * The `remove*` host methods are called by `WorldMutatorImpl.shutdown`
 * at scene tear-down. A regression in any of them would leak a stale
 * controller into the next mission's `update()` tick — Arcane M10 →
 * Mech M1 in the same session would tick a stale `_finaleController`.
 *
 * Tests `GameScene.prototype.<method>` directly with a stub `this`
 * context. Avoids spinning up a full Phaser scene (impractical in
 * vitest) while still testing the REAL method bodies — a regression
 * that empties any of them breaks these specs.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { GameScene } from './GameScene';
import {
  _resetActiveSuppressionManagerForTest,
  setActiveSuppressionManager,
  getActiveSuppressionManager,
} from '../systems/suppression/ActiveSuppressionManager';
import type { SuppressionManager } from '../systems/suppression/SuppressionManager';

// `GameScene` methods read/write a handful of `this.` fields — we stub
// only those. Cast through `unknown` per the standard prototype-method
// invocation pattern.
type StubScene = {
  _finaleController: unknown;
  _greenwardController: unknown;
  _greenwardFinaleController: unknown;
  _suppressionMgr: unknown;
  _suppressionRender: { destroy?: () => void } | null;
  _sabotageRender: { destroy?: () => void } | null;
  _sabotageController: unknown;
  _selectedRaider: unknown;
  _workshopPanelOpen: boolean;
  _onSabotageTrain: ((e: Event) => void) | null;
  _onSabotageUpgrade: ((e: Event) => void) | null;
  _onSabotagePanelClose: ((e: Event) => void) | null;
};

function callOnStub<K extends keyof GameScene>(
  method: K,
  stub: StubScene,
): void {
  const fn = (GameScene.prototype as unknown as Record<string, (this: StubScene) => void>)[method as string];
  fn.call(stub);
}

function makeStub(): StubScene {
  return {
    _finaleController: { id: 'finale' },
    _greenwardController: { id: 'gw' },
    _greenwardFinaleController: { id: 'gwfin' },
    _suppressionMgr: { id: 'sup' },
    _suppressionRender: { destroy: () => undefined },
    _sabotageRender: { destroy: () => undefined },
    _sabotageController: { id: 'sab' },
    _selectedRaider: { id: 'r1' },
    _workshopPanelOpen: true,
    _onSabotageTrain: null,  // window.addEventListener fixtures live in real init only
    _onSabotageUpgrade: null,
    _onSabotagePanelClose: null,
  };
}

describe('GameScene.removeArcaneFinale', () => {
  it('nulls _finaleController', () => {
    const s = makeStub();
    callOnStub('removeArcaneFinale', s);
    expect(s._finaleController).toBeNull();
  });
});

describe('GameScene.removeGreenwardRules', () => {
  it('nulls both Greenward controllers', () => {
    const s = makeStub();
    callOnStub('removeGreenwardRules', s);
    expect(s._greenwardController).toBeNull();
    expect(s._greenwardFinaleController).toBeNull();
  });
});

describe('GameScene.removeSuppressionPylons', () => {
  beforeEach(() => { _resetActiveSuppressionManagerForTest(); });

  it('clears the active SuppressionManager singleton + nulls scene refs', () => {
    setActiveSuppressionManager({} as SuppressionManager);
    expect(getActiveSuppressionManager()).not.toBeNull();
    const s = makeStub();
    callOnStub('removeSuppressionPylons', s);
    expect(s._suppressionRender).toBeNull();
    expect(s._suppressionMgr).toBeNull();
    expect(getActiveSuppressionManager()).toBeNull();
  });
});

describe('GameScene.removeMechSabotage', () => {
  it('nulls controller + render refs and clears HUD state', () => {
    const s = makeStub();
    callOnStub('removeMechSabotage', s);
    expect(s._sabotageController).toBeNull();
    expect(s._sabotageRender).toBeNull();
    expect(s._selectedRaider).toBeNull();
    expect(s._workshopPanelOpen).toBe(false);
  });
});
