/**
 * preloadFactionArt — warm the browser cache for a faction's splash +
 * emblem the moment the player picks them. By the time the user
 * reaches LoadingScreen / FactionUnlockSplash a few clicks later, the
 * art is already decoded and renders instantly.
 *
 * WebP brought the per-faction payload down to ~150KB total, so this
 * is a low-risk fire-and-forget. We don't block on the request and we
 * don't surface errors — if the prefetch fails the consumers'
 * onError fallbacks kick in just like before.
 */
import type { FactionId } from '../../data/Factions';
import { ASSET_BASE } from './factionAssets';

const seen = new Set<string>();

function prefetch(url: string): void {
  if (seen.has(url)) return;
  seen.add(url);
  // `<img>`-based prefetch hits the same HTTP cache the real `<img>`
  // will read from, on every browser. Cheaper than `<link rel=preload>`
  // wiring and works under Capacitor WebView too.
  const img = new Image();
  img.decoding = 'async';
  img.src = url;
}

export function preloadFactionArt(faction: FactionId): void {
  if (faction === 'chaos' || faction === 'random') return;
  const base = `${ASSET_BASE}assets/${faction}/${faction}`;
  // Splash both orientations — the consumer picks one based on viewport
  // but we don't know which here, and the bytes are tiny (~30KB mobile,
  // ~100KB landscape).
  prefetch(`${base}_splash.webp`);
  prefetch(`${base}_splash_mobile.webp`);
  prefetch(`${base}_emblem.webp`);
}
