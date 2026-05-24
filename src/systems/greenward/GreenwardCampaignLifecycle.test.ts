/**
 * GreenwardCampaignLifecycle — reachability bridge for ADR-0003.
 *
 * Item 6 of the campaign-#5 unblocker audit: Greenward's mission
 * controllers stay owned by GameScene, but the wrapper exposes them
 * through the same `MissionRunner.getActiveLifecycle` typed accessor
 * Snake Eyes uses. Tests pin:
 *   - the wrapper returns null until setControllers fires
 *   - getActiveGreenwardController returns the wrapper's controller
 *   - getActiveGreenwardController returns null when no mission is
 *     active OR when the active mission belongs to a different
 *     campaign whose lifecycle is a different class
 *   - shutdown nulls the references
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GreenwardCampaignLifecycle, getActiveGreenwardController } from './GreenwardCampaignLifecycle';
import { GreenwardMissionController } from './GreenwardMissionController';
import { MissionRunner } from '../missions/MissionRunner';

function installLifecycle(lifecycle: unknown): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (MissionRunner as any).active = {
    ext: { factionId: 'nature' },
    mission: { id: 'm0', idx: 0 },
    archetypeId: 'standard',
    startedAt: Date.now(),
    runtime: { lifecycle },
  };
}

function clearActive(): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (MissionRunner as any).active = null;
}

describe('GreenwardCampaignLifecycle', () => {
  beforeEach(() => { clearActive(); });
  afterEach(() => { clearActive(); });

  it('returns null controllers before setControllers fires', () => {
    const wrapper = new GreenwardCampaignLifecycle();
    expect(wrapper.getController()).toBeNull();
    expect(wrapper.getFinaleController()).toBeNull();
  });

  it('setControllers populates the wrapper references', () => {
    const wrapper = new GreenwardCampaignLifecycle();
    const ctrl = new GreenwardMissionController({ ruins: [] }, 0);
    wrapper.setControllers(ctrl, null);
    expect(wrapper.getController()).toBe(ctrl);
    expect(wrapper.getFinaleController()).toBeNull();
  });

  it('shutdown nulls the references', () => {
    const wrapper = new GreenwardCampaignLifecycle();
    const ctrl = new GreenwardMissionController({ ruins: [] }, 0);
    wrapper.setControllers(ctrl, null);
    wrapper.shutdown();
    expect(wrapper.getController()).toBeNull();
  });
});

describe('getActiveGreenwardController', () => {
  beforeEach(() => { clearActive(); });
  afterEach(() => { clearActive(); });

  it('returns null when no mission is active', () => {
    expect(getActiveGreenwardController()).toBeNull();
  });

  it('returns null when the active lifecycle is a different class', () => {
    installLifecycle({ update() {}, shutdown() {} });
    expect(getActiveGreenwardController()).toBeNull();
  });

  it('returns null when the wrapper is active but controller is not yet set', () => {
    const wrapper = new GreenwardCampaignLifecycle();
    installLifecycle(wrapper);
    expect(getActiveGreenwardController()).toBeNull();
  });

  it('returns the controller once the wrapper has it populated', () => {
    const wrapper = new GreenwardCampaignLifecycle();
    const ctrl = new GreenwardMissionController({ ruins: [] }, 50);
    wrapper.setControllers(ctrl, null);
    installLifecycle(wrapper);
    expect(getActiveGreenwardController()).toBe(ctrl);
  });
});
