/**
 * SnakeEyesMissionIds — single source of truth for the Snake Eyes
 * mission-idx → role mapping.
 *
 * Multiple modules gate behaviour on the mission's idx (the
 * Counterfactual escalation beats, Theris's M6 vanishing, the
 * Counterfactual table appearance at M10). Without a central
 * constants module these idxs lived as magic numbers across many
 * files — a future mission re-order silently breaks the gates.
 *
 * Every Snake Eyes module that gates on missionIdx imports its
 * named constant from here instead of using a literal. The campaign
 * data file (snake-eyes.ts) MUST keep these idxs aligned with the
 * mission order; a parametric test in snake-eyes.test.ts pins the
 * archetype lineup (which is structurally aligned with these idxs).
 *
 * If a mission gets moved or removed, fail loudly:
 *   - Update this file's constants
 *   - Update snake-eyes.ts mission order
 *   - The cross-pin test in SnakeEyesMissionIds.test.ts catches mismatch
 */

/** M1 — The Last Hand at Talavar (tutorial Pact). */
export const M1_LAST_HAND_TALAVAR = 0;
/** M2 — The Road West (Counterfactual silhouette beat). */
export const M2_ROAD_WEST = 1;
/** M3 — Silvermine Creek (high-tier Pact draw). */
export const M3_SILVERMINE_CREEK = 2;
/** M4 — The Ferryman's Game (Counterfactual mirror tower beat). */
export const M4_FERRYMANS_GAME = 3;
/** M5 — Wheel of Cipher (speedrun, first Dealer interlude). */
export const M5_WHEEL_OF_CIPHER = 4;
/** M6 — Theris's Goodbye (coop_with_bot; Theris vanishes here). */
export const M6_THERIS_GOODBYE = 5;
/** M7 — Mirror Walkers (Counterfactual creep variant; Siphon locked). */
export const M7_MIRROR_WALKERS = 6;
/** M8 — Snake Eyes (frugal; the Collector boss). */
export const M8_SNAKE_EYES = 7;
/** M9 — Burning the Pactbook (attacker mode). */
export const M9_BURNING_PACTBOOK = 8;
/** M10 — The Counterfactual's Mirror (final_void). */
export const M10_COUNTERFACTUAL_MIRROR = 9;
