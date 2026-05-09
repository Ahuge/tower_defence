/**
 * factionAssets — central source of truth for `assets/<faction>/`
 * URL paths. Every faction-art consumer used to inline its own
 * `BASE_URL` + path concatenation, three or four near-identical
 * helpers across CampaignLobbyScreen / FactionTreeScreen /
 * LoadingScreen / preloadFactionArt. Centralising lets us swap the
 * suffix scheme (e.g. `.webp` → `.avif`) in one place.
 *
 * Meta-faction ids ('chaos' / 'random') have no art bundle — every
 * helper returns an empty string for them, callers fall back to
 * gradient mood lighting via an onError handler.
 */
import type { FactionId } from '../../data/Factions';

export const ASSET_BASE: string = (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';

function isMetaFaction(faction: string | null | undefined): boolean {
  return !faction || faction === 'chaos' || faction === 'random';
}

/** Square 2040×1812 hero piece, no title overlay. v2 art-drop only —
 *  missing files silently 404 and the consumer's onError hides the
 *  layer. Used by CampaignLobbyScreen. */
export function factionKeyartSrc(factionId: FactionId | string): string {
  if (isMetaFaction(factionId)) return '';
  return `${ASSET_BASE}assets/${factionId}/${factionId}_keyart.webp`;
}

/** Splash key art for the loading screen. `mobile=true` swaps to a
 *  9:16 portrait crop. Engine picks between the two via a viewport-
 *  width media query in `useIsPortraitViewport`. */
export function factionSplashSrc(faction: FactionId | string | null, mobile = false): string {
  if (isMetaFaction(faction)) return '';
  const suffix = mobile ? '_splash_mobile' : '_splash';
  return `${ASSET_BASE}assets/${faction}/${faction}${suffix}.webp`;
}

/** One layer of the 3-layer parallax (far / mid / fore) used by the
 *  faction-tree detail panel. Whole bundle is ~25KB WebP. */
export function factionParallaxSrc(factionId: FactionId | string, layer: 'far' | 'mid' | 'fore'): string {
  if (isMetaFaction(factionId)) return '';
  return `${ASSET_BASE}assets/${factionId}/${factionId}_parallax_${layer}.webp`;
}
