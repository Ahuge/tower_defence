/**
 * FactionModules — registry mapping faction IDs to their sprite generator
 * draw functions. Each module is lazy-imported to avoid loading all factions.
 *
 * The sprite generators export a default React component, but the actual
 * drawing happens in internal functions (drawTowers, drawProjectiles, drawHero).
 * Since those aren't exported, we import the whole module and use the same
 * internal pattern: create a canvas, get context, call the component's
 * useEffect logic.
 *
 * For the skin editor, we need the drawTowers/drawProjectiles/drawHero
 * functions. Since they're not exported, the simplest approach is to
 * render the component's canvases and capture the output.
 *
 * APPROACH: We import the module, create a temporary React root, render
 * the component, and grab the canvas refs. But that's heavy.
 *
 * SIMPLER APPROACH: We know the pattern — each module has drawTowers(ctx),
 * drawProjectiles(ctx), drawHero(ctx) as module-level functions. We can
 * access them by importing the module and calling the functions via the
 * module's internal scope.
 *
 * SIMPLEST APPROACH: Since we can't call un-exported functions, we'll
 * render each faction's default component to a hidden div, let its useEffect
 * run and populate the canvases, then grab the canvas image data. We proxy
 * the canvas context at creation time.
 *
 * ACTUAL SIMPLEST: Export the draw functions from each sprite file. But
 * that means modifying 11 files. Let's do it — it's a one-line change each.
 *
 * FOR NOW: We'll use a hybrid — the editor knows the standard pattern
 * (drawTowers/drawProjectiles/drawHero) and the canvas dimensions for each
 * faction. We duplicate just the rendering loop (not the draw functions)
 * and import each module to access the palette constant C.
 */

export interface FactionSpriteInfo {
  id: string;
  name: string;
  /** Number of tower columns in the spritesheet */
  towerCols: number;
  /** Total rows in tower sheet (maxLevel * 4 states) */
  towerRows: number;
  /** Tower cell size in pixels */
  towerCell: number;
  /** Projectile columns */
  projCols: number;
  /** File path for dynamic import */
  modulePath: string;
  /** Tower names for labeling */
  towerNames: string[];
}

export const FACTION_SPRITES: FactionSpriteInfo[] = [
  { id: 'arcane', name: 'Arcane', towerCols: 7, towerRows: 20, towerCell: 64, projCols: 7, modulePath: '/arcane_sprites.tsx',
    towerNames: ['Bolt', 'Frost', 'Storm', 'Focus', 'Mana Drain', 'Meteor', 'Arcane Nova'] },
  { id: 'void', name: 'Void', towerCols: 5, towerRows: 24, towerCell: 64, projCols: 5, modulePath: '/void_sprites.tsx',
    towerNames: ['Gambler', 'Spike', 'Siphon', 'Rift', 'Oblivion'] },
  { id: 'mechanical', name: 'Mechanical', towerCols: 8, towerRows: 24, towerCell: 64, projCols: 8, modulePath: '/mechanical_sprites.tsx',
    towerNames: ['Wall', 'Turret', 'Flame', 'Tesla', 'Mortar', 'Shredder', 'Railgun', 'Titan'] },
  { id: 'nature', name: 'Nature', towerCols: 6, towerRows: 24, towerCell: 64, projCols: 6, modulePath: '/nature_sprites.tsx',
    towerNames: ['Thorn', 'Root', 'Blossom', 'Spore', 'Vine', 'Elder Treant'] },
  { id: 'military', name: 'Military', towerCols: 6, towerRows: 20, towerCell: 64, projCols: 6, modulePath: '/military_sprites.tsx',
    towerNames: ['Sandbag', 'Wire', 'Rifleman', 'Brawler', 'Tank', 'Commander'] },
  { id: 'aliens', name: 'Aliens', towerCols: 8, towerRows: 16, towerCell: 64, projCols: 8, modulePath: '/aliens_sprites.tsx',
    towerNames: ['Spitter', 'Stinger', 'Swarm Node', 'Acid', 'Hive Spire', 'Brood Mother', 'Swarmling', 'Overmind'] },
  { id: 'cypherpunk', name: 'Cypherpunk', towerCols: 7, towerRows: 20, towerCell: 64, projCols: 7, modulePath: '/cypherpunk_sprites.tsx',
    towerNames: ['Ping', 'Firewall', 'Virus', 'Backdoor', 'DDoS', 'Rootkit', 'Zero Day'] },
  { id: 'infernal', name: 'Infernal', towerCols: 6, towerRows: 16, towerCell: 64, projCols: 6, modulePath: '/infernal_sprites.tsx',
    towerNames: ['Imp', 'Hellfire', 'Soul Drain', 'Bomber', 'Immolate', 'Apocalypse'] },
  { id: 'celestial', name: 'Celestial', towerCols: 5, towerRows: 20, towerCell: 64, projCols: 5, modulePath: '/celestial_sprites.tsx',
    towerNames: ['Acolyte', 'Ward', 'Smite', 'Sanctuary', 'Absolution'] },
  { id: 'psionic', name: 'Psionic', towerCols: 5, towerRows: 20, towerCell: 64, projCols: 5, modulePath: '/psionic_sprites.tsx',
    towerNames: ['Probe', 'Mesmer', 'Terror', 'Mind Spike', 'Overmind'] },
  { id: 'harmonic', name: 'Harmonic', towerCols: 7, towerRows: 24, towerCell: 64, projCols: 7, modulePath: '/harmonic_sprites.tsx',
    towerNames: ['Resonator', 'Amplifier', 'Quickener', 'Reach', 'Critical Mass', 'Conduit', 'Crescendo'] },
];

export function getFactionSprite(factionId: string): FactionSpriteInfo | undefined {
  return FACTION_SPRITES.find(f => f.id === factionId);
}
