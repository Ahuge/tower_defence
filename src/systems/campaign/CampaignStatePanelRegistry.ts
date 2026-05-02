/**
 * CampaignStatePanelRegistry — per-faction lobby panel slot.
 *
 * The campaign lobby reserves a slot above the mission cards where a
 * v2 campaign can render its own state-readout component (Counterspell
 * Channel-Clock, Cascade Supply-Readout). v1 campaigns don't register
 * anything and the slot is hidden.
 *
 * Each panel is a Preact functional component receiving `factionId`
 * as a prop. It looks up its own typed state via CampaignState.get<T>.
 * The registry doesn't know about the state shape — it just picks the
 * component to render.
 *
 * Plan A registers `arcane` → ChannelClockPanel.
 * Plan B registers `mechanical` → SupplyReadoutPanel.
 */

import type { ComponentType } from 'preact';

export interface CampaignStatePanelProps {
  factionId: string;
}

type PanelComponent = ComponentType<CampaignStatePanelProps>;

const PANELS: Map<string, PanelComponent> = new Map();

export const CampaignStatePanelRegistry = {
  /** Register a panel for a faction. Last registration wins (no-op for
   *  re-registrations of the same component). Idempotent against HMR. */
  register(factionId: string, component: PanelComponent): void {
    PANELS.set(factionId, component);
  },

  /** Look up the panel component for a faction. Returns null when no
   *  panel is registered (v1 campaigns) — caller hides the slot. */
  get(factionId: string): PanelComponent | null {
    return PANELS.get(factionId) ?? null;
  },

  /** Test-only: clear the registry. */
  __reset(): void {
    PANELS.clear();
  },
};
