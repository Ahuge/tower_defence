/**
 * IconPreheat — warms the TowerIconRenderer data-URL cache in the
 * background after BootScene's spritesheets finish loading. Without
 * this, the Store/Inventory screens block the main thread on first
 * open while extracting dozens of canvas frames synchronously.
 *
 * The Store renders every SkinDef preview (tower_faction packs,
 * individual tower skins, hero skins) — each requested with a distinct
 * `assetSuffix`. The icon cache key includes the suffix, so just
 * warming base icons isn't enough: we need to preheat every skin
 * variant the Store can show.
 *
 * Strategy:
 *   - Walk SKIN_DEFS + TOWER_SKINS to derive every (towerId|heroId,
 *     suffix) pair the Store can request
 *   - Also warm base (unskinned) icons for every tower + hero
 *   - Run jobs one at a time via requestIdleCallback (setTimeout
 *     fallback), yielding between each so the main thread stays
 *     responsive
 *   - Emit 'app-preload-progress' events so AppLoadingScreen can
 *     track preheat progress
 */
import { FACTIONS, FactionId } from '../../data/Factions';
import { getAllSpriteTowerIds } from '../../systems/SpriteManager';
import { getTowerIconUrl, getHeroIconUrl } from './TowerIconRenderer';
import { HERO_ORDER } from '../../data/HeroTypes';
import { SKIN_DEFS, TOWER_SKINS } from '../../systems/monetization';

type IdleDeadline = { didTimeout: boolean; timeRemaining: () => number };
type IdleCallback = (deadline: IdleDeadline) => void;

const rIC: (cb: IdleCallback) => number =
  (window as any).requestIdleCallback ??
  ((cb: IdleCallback) => window.setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 16 }), 16)) as any;

function emitProgress(value: number, phase: 'assets' | 'warming'): void {
  window.dispatchEvent(new CustomEvent('app-preload-progress', { detail: { value, phase } }));
}

/** Build the full list of icon extractions the Store will eventually
 *  request. Dedupes so each (id, suffix) pair is warmed only once. */
function buildJobs(): Array<() => void> {
  const seen = new Set<string>();
  const jobs: Array<() => void> = [];

  const addTower = (towerId: string, suffix: string = '') => {
    const key = `tower|${towerId}|${suffix}`;
    if (seen.has(key)) return;
    seen.add(key);
    jobs.push(() => { getTowerIconUrl(towerId, suffix || undefined); });
  };
  const addHero = (heroId: string, suffix: string = '') => {
    const key = `hero|${heroId}|${suffix}`;
    if (seen.has(key)) return;
    seen.add(key);
    jobs.push(() => { getHeroIconUrl(heroId, suffix || undefined); });
  };

  // Base icons — every tower + every hero, unskinned.
  for (const id of getAllSpriteTowerIds()) addTower(id);
  for (const id of HERO_ORDER) addHero(id);

  // tower_faction packs — each renders every tower in the faction with the
  // pack's suffix. This is the big one: one pack = N icons.
  for (const skin of SKIN_DEFS) {
    if (skin.target === 'tower_faction' && skin.faction) {
      const faction = FACTIONS[skin.faction as FactionId];
      if (!faction) continue;
      for (const towerId of faction.towerIds) addTower(towerId, skin.assetSuffix);
    } else if (skin.target === 'tower' && skin.towerId) {
      addTower(skin.towerId, skin.assetSuffix);
    } else if (skin.target === 'hero' && skin.heroId) {
      addHero(skin.heroId, skin.assetSuffix);
    }
  }

  // Per-tower skins (generated from themes) — each renders a single tower.
  for (const skin of TOWER_SKINS) {
    if (skin.target === 'tower' && skin.towerId) addTower(skin.towerId, skin.assetSuffix);
  }

  return jobs;
}

/**
 * Preheat every icon the Store can render. Yields between jobs to keep
 * the main thread responsive. Resolves when all icons are warm.
 *
 * @param progressBase Start of the progress range (0-1) this phase occupies.
 *                     e.g. pass 0.8 if asset loading was 0-80%.
 * @param progressRange Width of the progress range. e.g. 0.2 for 80-100%.
 */
export function preheatIcons(progressBase = 0, progressRange = 1): Promise<void> {
  const jobs = buildJobs();
  const total = jobs.length;
  if (total === 0) return Promise.resolve();

  return new Promise(resolve => {
    let index = 0;
    const step = (deadline: IdleDeadline) => {
      // Process as many jobs as fit in this idle slice, then yield.
      while (index < total && (deadline.timeRemaining() > 4 || deadline.didTimeout)) {
        try { jobs[index](); } catch (err) { console.warn('[IconPreheat] job failed', err); }
        index++;
      }
      const fraction = index / total;
      emitProgress(progressBase + fraction * progressRange, 'warming');
      if (index < total) rIC(step);
      else resolve();
    };
    rIC(step);
  });
}
