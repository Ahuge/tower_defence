/**
 * scorerModelLoader — browser-side loader for the imitation placement
 * scorer models (`playtest/models/scorer-<faction>.json`).
 *
 * The game already code-splits these JSON files (see
 * `PlacementAdvisor`), so they are available to the browser bundle.
 * `LearnedScorer` itself is Node-only (it reads the files with fs),
 * so this module loads the JSON via dynamic import and caches it;
 * `RLBrain.getScorer` picks the cached model up and constructs a
 * `LearnedScorer` from the in-memory weights.
 *
 * Usage (lobby, before the match starts):
 *   await loadScorerModel('harmonic');   // caches for RLBrain
 */
import type { ScorerModel } from '../../../../playtest/LearnedScorer';

const LOADERS: Record<string, () => Promise<unknown>> = {
  arcane: () => import('../../../../playtest/models/scorer-arcane.json'),
  mechanical: () => import('../../../../playtest/models/scorer-mechanical.json'),
  nature: () => import('../../../../playtest/models/scorer-nature.json'),
  void: () => import('../../../../playtest/models/scorer-void.json'),
  military: () => import('../../../../playtest/models/scorer-military.json'),
  aliens: () => import('../../../../playtest/models/scorer-aliens.json'),
  cypherpunk: () => import('../../../../playtest/models/scorer-cypherpunk.json'),
  infernal: () => import('../../../../playtest/models/scorer-infernal.json'),
  celestial: () => import('../../../../playtest/models/scorer-celestial.json'),
  psionic: () => import('../../../../playtest/models/scorer-psionic.json'),
  harmonic: () => import('../../../../playtest/models/scorer-harmonic.json'),
  chaos: () => import('../../../../playtest/models/scorer-chaos.json'),
};

const cache = new Map<string, ScorerModel | null>();

/** Synchronous cache read used by RLBrain at construction time. */
export function getCachedScorerModel(faction: string): ScorerModel | null {
  return cache.get(faction) ?? null;
}

/** Load + cache a faction's scorer model. Returns null when the
 *  faction has no model or the import fails (RLBrain then falls back
 *  to its heuristic placement scorer). */
export async function loadScorerModel(faction: string): Promise<ScorerModel | null> {
  if (cache.has(faction)) return cache.get(faction) ?? null;
  const loader = LOADERS[faction];
  if (!loader) {
    cache.set(faction, null);
    return null;
  }
  try {
    const raw = await loader();
    // Vite's JSON dynamic import returns the object directly, but
    // normalize a `{ default: ... }` wrapper just in case.
    const model = ((raw as { default?: ScorerModel })?.default ?? raw) as ScorerModel;
    cache.set(faction, model);
    return model;
  } catch {
    cache.set(faction, null);
    return null;
  }
}
