/**
 * HeronSpawner — state machine for the recurring Heron of Eadwin
 * sprite across M3 / M6 / M8 / M10.
 *
 * The Heron is a single named figure who appears in four states as
 * the campaign escalates:
 *
 *   M3 — silhouette  — perched on the inn's chimney. Non-interactive.
 *   M6 — watching    — perched on the chapel roof in Tarrenford.
 *                      Non-interactive but no longer "outline only."
 *   M8 — walking     — walks the Stillborn Court behind the Child.
 *                      Still non-aggressive; an unsettling presence.
 *                      The Heron has come down from the roofs.
 *   M10 — full creep — at the Nave. Either a passive Mercy Watcher,
 *                      a Ceremony witness, or the Siege-path boss
 *                      depending on the player's mode-lean.
 *
 * This module is the per-mission stateful spawner that picks the
 * right state given the active mission idx and mode-lean. It does
 * NOT draw or animate — Phaser-side rendering reads the spritesheet
 * frame chosen by `getFrameFor(state)`.
 */

import type { ModeLean } from './ModeLeanTracker';

export type HeronState = 'silhouette' | 'watching' | 'walking' | 'kneeling';

/** Frame indices into `heron_of_eadwin.png`. Stay in sync with the
 *  TSX sheet order (drawHeronSheet stacks F0..F3 vertically). */
export const HERON_FRAME = {
  silhouette: 0,
  watching: 1,
  walking: 2,
  kneeling: 3,
} as const satisfies Record<HeronState, number>;

/** Pick the appropriate Heron state for a given mission idx + the
 *  campaign-wide mode-lean (only consulted at M10). Returns null
 *  when the mission doesn't include the Heron at all. */
export function getHeronStateFor(missionIdx: number, lean?: ModeLean): HeronState | null {
  // Mission idxs: M1=0, M2=1, M3=2, M4=3, M5=4, M6=5, M7=6, M8=7, M9=8, M10=9
  switch (missionIdx) {
    case 2: return 'silhouette'; // M3 chimney
    case 5: return 'watching';   // M6 chapel roof
    case 7: return 'walking';    // M8 behind the Child
    case 9: return heronM10State(lean);
    default: return null;
  }
}

/** M10 Heron state by Nave path. The Mercy ending leaves the Heron
 *  kneeling on the altar; Ceremony leaves him watching as the nave
 *  fills with light; Siege brings him standing for the fight (the
 *  walking sprite reused — he led his last court). */
function heronM10State(lean: ModeLean | undefined): HeronState {
  switch (lean) {
    case 'mercy':    return 'kneeling';
    case 'both':     return 'kneeling';  // both paths open → player gets the gentle one in the spawn frame
    case 'ceremony': return 'watching';
    case 'siege':    return 'walking';
    default:         return 'walking';   // fallback (Reserves-zero narrowing path)
  }
}

/** Frame index for a given state — convenience wrapper that returns
 *  -1 when state is null (caller skips rendering). */
export function getHeronFrame(state: HeronState | null): number {
  if (state === null) return -1;
  return HERON_FRAME[state];
}

/** True if the mission features the Heron at all. Convenience for
 *  scene-init code that only spawns the sprite when needed. */
export function missionHasHeron(missionIdx: number): boolean {
  return getHeronStateFor(missionIdx) !== null;
}
