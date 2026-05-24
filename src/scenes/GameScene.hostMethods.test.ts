/**
 * Regression pin — verifies GameScene implements every `WorldHost`
 * install/remove host method that an aspect Setup might dispatch to.
 *
 * The pre-Phase-E3 bug: Phase E3 deleted the legacy
 * `_missionPrePlacedTowers` data-passthrough that fed Arcane M1+M2's
 * Frost towers, expecting the new aspect path
 * (`arcanePrePlacedRuntime` → `world.installPrePlacedTowers`) to take
 * over. But `WorldMutatorImpl.installPrePlacedTowers` forwards via
 * `this.host.installPrePlacedTowers?.(towers)` — optional chaining —
 * and `GameScene` was never given the method. Result: silent no-op,
 * M1+M2 ship without their teaching Frost towers, the whole Arcane
 * tutorial intent is gone.
 *
 * This test catches the gap by reading GameScene.ts as text and
 * asserting each documented host method is present. Static-text
 * style (same pattern as MechCreeps.test.ts) — keeps the test free
 * of Phaser scene construction + safe to run in vitest. Pairs with
 * `WorldMutator.test.ts` which already verifies the forwarding
 * semantics; the gap they together close is "the chain has both
 * ends + every link in between."
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const SRC = readFileSync('src/scenes/GameScene.ts', 'utf-8');

const REQUIRED_HOST_METHODS = [
  // Pre-placed tower installer for Arcane M1/M2 (the previously-broken path).
  ['installPrePlacedTowers', 'arcane M1/M2 Frost teaching towers'],
  ['removePrePlacedTowers',  'arcane M1/M2 Frost teardown'],
  // Suppression Pylons for Mech M2/M5/M6/M8.
  ['installSuppressionPylons', 'mech pylon mute zones'],
  ['removeSuppressionPylons',  'mech pylon teardown'],
  // M10 finale install methods (per the campaign-#5 ADR-0002 hard
  // constraint, these stay as the three campaign-specific exceptions
  // until Path A or B resolves).
  ['installMechSabotage',     'mech M10 throne sabotage'],
  ['removeMechSabotage',      'mech M10 teardown'],
  ['installArcaneFinale',     'arcane M10 finale controller'],
  ['removeArcaneFinale',      'arcane M10 teardown'],
  ['installGreenwardRules',   'greenward consecration controller'],
  ['removeGreenwardRules',    'greenward teardown'],
] as const;

describe('GameScene — host method coverage for aspect Setup', () => {
  for (const [method, purpose] of REQUIRED_HOST_METHODS) {
    it(`implements ${method} (${purpose})`, () => {
      // Class member declaration: `methodName(args): ReturnType {` or
      // `methodName?(args): ReturnType {`. The regex matches both.
      const pattern = new RegExp(`\\b${method}\\s*\\??\\s*\\(`);
      expect(pattern.test(SRC), `GameScene.ts must declare ${method} so the WorldMutator's host?.${method}?.() forward isn't a silent no-op`).toBe(true);
    });
  }
});
