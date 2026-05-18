/**
 * Smoke tests for PactbookPanel — pure-presentation contract.
 * Full visual rendering covered by Playwright in a follow-up.
 */
import { describe, it, expect } from 'vitest';
import { PactbookPanel } from './PactbookPanel';
import { Pactbook } from '../../systems/voidc/Pactbook';
import { registerTier1WagerEffects } from '../../systems/voidc/wagers/tier1';
import { _resetWagerEffectsForTest } from '../../systems/voidc/WagerEffects';

describe('PactbookPanel — component existence', () => {
  it('is a function (component)', () => {
    expect(typeof PactbookPanel).toBe('function');
  });
});

describe('PactbookPanel — lifecycle contract', () => {
  it('renders null when no cards drawn', () => {
    _resetWagerEffectsForTest();
    registerTier1WagerEffects();
    const pb = new Pactbook({ rng: () => 0.5 });
    // No draw call → drawn[] is empty.
    const result = PactbookPanel({ pactbook: pb, onResolved: () => {} });
    expect(result).toBeNull();
  });

  it('renders null after a Wager has been accepted (mission UI takes over)', () => {
    _resetWagerEffectsForTest();
    registerTier1WagerEffects();
    const pb = new Pactbook({ rng: () => 0.5 });
    pb.draw(3, [1, 0, 0]);
    pb.accept(pb.getDrawn()[0].id);
    expect(PactbookPanel({ pactbook: pb, onResolved: () => {} })).toBeNull();
  });

  it('renders null after declineAll (mission UI takes over)', () => {
    _resetWagerEffectsForTest();
    registerTier1WagerEffects();
    const pb = new Pactbook({ rng: () => 0.5 });
    pb.draw(3, [1, 0, 0]);
    pb.declineAll();
    expect(PactbookPanel({ pactbook: pb, onResolved: () => {} })).toBeNull();
  });

  it('renders a non-null element when cards drawn + unresolved', () => {
    _resetWagerEffectsForTest();
    registerTier1WagerEffects();
    const pb = new Pactbook({ rng: () => 0.5 });
    pb.draw(3, [1, 0, 0]);
    const result = PactbookPanel({ pactbook: pb, onResolved: () => {} });
    expect(result).not.toBeNull();
  });
});
