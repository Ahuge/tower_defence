/**
 * IconPreheat — warms the TowerIconRenderer data-URL cache in the
 * background after BootScene's spritesheets finish loading. Without
 * this, the Store/Inventory screens block the main thread on first
 * open while extracting dozens of canvas frames synchronously.
 *
 * Strategy:
 *   - Iterate every tower/hero id that has a sprite config
 *   - For each, call getTowerIconUrl / getHeroIconUrl (extracts the
 *     idle frame into a cached data URL)
 *   - Yield between each via requestIdleCallback (or setTimeout
 *     fallback) so Phaser + DOM stay responsive
 *   - Emit 'app-preload-progress' events so AppLoadingScreen can
 *     show accurate progress
 */
import { getAllSpriteTowerIds } from '../../systems/SpriteManager';
import { getTowerIconUrl, getHeroIconUrl } from './TowerIconRenderer';
import { HERO_ORDER } from '../../data/HeroTypes';

type IdleDeadline = { didTimeout: boolean; timeRemaining: () => number };
type IdleCallback = (deadline: IdleDeadline) => void;

const rIC: (cb: IdleCallback) => number =
  (window as any).requestIdleCallback ??
  ((cb: IdleCallback) => window.setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 16 }), 16)) as any;

function emitProgress(value: number, phase: 'assets' | 'warming'): void {
  window.dispatchEvent(new CustomEvent('app-preload-progress', { detail: { value, phase } }));
}

/**
 * Extract idle icons for every tower + hero. Yields between each to keep
 * the main thread responsive. Resolves when all icons are warm.
 *
 * @param progressBase Start of the progress range (0-1) this phase occupies.
 *                     e.g. pass 0.8 if asset loading was 0-80%.
 * @param progressRange Width of the progress range. e.g. 0.2 for 80-100%.
 */
export function preheatIcons(progressBase = 0, progressRange = 1): Promise<void> {
  const towerIds = getAllSpriteTowerIds();
  const heroIds = [...HERO_ORDER];
  const jobs: Array<() => void> = [
    ...towerIds.map(id => () => { getTowerIconUrl(id); }),
    ...heroIds.map(id => () => { getHeroIconUrl(id); }),
  ];
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
