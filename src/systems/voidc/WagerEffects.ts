/**
 * WagerEffects — registry of runtime mutators for accepted Wagers.
 *
 * The Pactbook (commit 5) tells you what was drawn + which was
 * accepted. WagerEffects tells you what an accepted Wager actually
 * DOES during the mission.
 *
 * Each effect is a `WagerEffectHandler` with a small set of
 * optional lifecycle hooks. The active mission's accepted Wager
 * provides one handler; GameScene calls into the handler at the
 * appropriate moments. Tier-1 cards (this commit) tend to use:
 *
 *   - **onMissionStart** — one-shot adjustments at scene init
 *     (Coin Flip's RNG roll, House Cut's gold-reduction flag).
 *   - **modifyCreepKillGold** — chain modifier on the gold awarded
 *     per creep kill (House Cut, Markers).
 *   - **getMissionFlags** — opaque key-value flags that GameScene
 *     paths read (Sleeve Card surfaces "free-sell available" to the
 *     UI without coupling itself to the registry directly).
 *   - **getTraitsForTower** — bag-of-flags v2 hook: per-tower trait
 *     injection at spawn time. The trait's handlers (registered
 *     elsewhere via Trait.ts's registerDamageMod / etc.) carry the
 *     mutation; the Wager effect just declares which towers receive
 *     it. **This is the only path that touches Tower behavior.**
 *
 * Tier-1 effects don't yet need per-tower traits (Coin Flip / House
 * Cut / Sleeve Card don't modify a tower; Markers does via a Siphon-
 * specific trait declared here but with no actual trait-handler yet
 * — the trait handler lands when the wager-trait pipeline integrates
 * with Tower spawn in Phase 2). For commit 6 we keep the registry
 * pure and ship the four tier-1 handlers stand-alone.
 *
 * Tier-2 (commit 7) and tier-3 (commit 8) effects will exercise the
 * per-tower trait path. Tier-2 wager `Loaded Dice` is the first one
 * to register an actual `registerDamageMod` handler that the
 * existing trait pipeline picks up.
 */

import type { Trait } from '../traits/Trait';

// ─── Types ───────────────────────────────────────────────────────

/** Context passed to lifecycle hooks. GameScene populates this when
 *  it calls into the handler. Kept minimal — handlers should not
 *  reach into scene internals; if you need more state, add it to
 *  the context type and the caller. */
export interface WagerEffectContext {
  /** Deterministic random source. Tests inject a fixed sequence;
   *  production uses Math.random by default at the caller site. */
  rng: () => number;
  /** Mission idx (0..9). Some effects gate on the mission. */
  missionIdx: number;
  /** Opaque scene handle for effects that need to call scene-side
   *  APIs (rare — most effects work via return values + flags). */
  scene?: unknown;
}

/** Mission-wide one-shot flag bag returned by getMissionFlags. Keys
 *  are stable string ids that GameScene paths look up. Values are
 *  primitives only (no functions, no scene refs) so the flag bag
 *  is serializable + inspectable in tests. */
export type WagerMissionFlags = { [key: string]: number | string | boolean };

/** Single accepted-Wager's runtime behaviour. All hooks optional;
 *  unimplemented hooks default to no-op. */
export interface WagerEffectHandler {
  /** One-shot scene-init. Return a partial result indicating which
   *  things the handler wants to influence at start. Caller merges
   *  these into scene state (starting gold delta, mission-flag bag,
   *  etc.). Pure function — no side effects in this hook. */
  onMissionStart?(ctx: WagerEffectContext): {
    /** Add this to the player's starting gold. Negative reduces it. */
    goldDelta?: number;
    /** Flags merged into the mission flag bag. */
    flags?: WagerMissionFlags;
  } | void;

  /** Chain modifier on kill-gold. `baseGold` is what the creep
   *  would have awarded; return the modified amount. Multiple
   *  handlers compose by calling each in registration order, but
   *  Snake Eyes only ever has one active Wager per mission so the
   *  chain length is always 0 or 1. */
  modifyCreepKillGold?(ctx: WagerEffectContext, baseGold: number): number;

  /** Per-tower trait injection at spawn. Returns extra traits to
   *  merge into the spawning tower's trait list. The trait ids
   *  must already be registered with the appropriate Trait.ts
   *  handler (registerDamageMod / etc.) — this hook only declares
   *  which towers get which traits. **Bag-of-flags v2 integration
   *  point — no Tower.ts edits required for new Wagers.**
   *
   *  `towerTypeId` is the canonical id (e.g. 'void_siphon'); the
   *  handler returns an empty array if the Wager doesn't affect
   *  this tower type. */
  getTraitsForTower?(towerTypeId: string): Trait[];

  /** Static metadata for HUD + analytics. */
  meta: {
    /** Human-readable summary shown on the Pactbook card + active-
     *  Wager HUD chip. One short sentence. */
    summary: string;
  };
}

// ─── Registry ────────────────────────────────────────────────────

const REGISTRY: Map<string, WagerEffectHandler> = new Map();

/** Register a Wager's effect handler. Idempotent on the same id
 *  (later registrations win — useful for tests + hot-reload). */
export function registerWagerEffect(effectId: string, handler: WagerEffectHandler): void {
  REGISTRY.set(effectId, handler);
}

/** Look up a registered handler. Returns null if the effect id was
 *  never registered (typically a sign that the Wager's effect-impl
 *  commit hasn't landed yet). */
export function getWagerEffect(effectId: string): WagerEffectHandler | null {
  return REGISTRY.get(effectId) ?? null;
}

/** List all registered effect ids. Test-friendly. */
export function listRegisteredWagerEffects(): string[] {
  return Array.from(REGISTRY.keys()).sort();
}

/** Test-only: wipe the registry. */
export function _resetWagerEffectsForTest(): void {
  REGISTRY.clear();
}
