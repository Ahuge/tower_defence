/**
 * CreepSpriteManager — loads and renders faction-specific creep spritesheets.
 *
 * Each faction has a 1024×448 spritesheet (16 cols × 7 rows at 64×64):
 *   Columns: standard, fast, armored, swarm, healer, boss, group, splitter,
 *            shielded, evasive, regenerator, flying, mage_iron, mage_haste,
 *            mage_mist, mage_heal
 *   Rows 0-3: walk cycle, Rows 4-6: death animation
 *
 * Creep types map to column indices. The walk animation cycles frames 0-3.
 * Death plays frames 4-6 once.
 */
import * as Phaser from 'phaser';
import { FactionId } from '../data/Factions';

const FRAME_SIZE = 64;
const COLS = 16;
const WALK_FRAMES = 4;
const DEATH_FRAMES = 3;
const WALK_FPS = 4;
const DEATH_FPS = 3;

/** Maps creep type ID to spritesheet column index */
const CREEP_TYPE_TO_COL: Record<string, number> = {
  standard: 0, fast: 1, armored: 2, swarm: 3,
  healer: 4, boss: 5, group: 6, splitter: 7,
  shielded: 8, evasive: 9, regenerator: 10, flying: 11,
  mage_armor: 12, mage_speed: 13, mage_evasion: 14, mage_heal: 15,
  // Aliases
  splitter_child: 3, // use swarm sprite for splitlings
  // Plan A — caster aliases. Sigils ride the mage_armor sprite (the
  // tankier, more visibly threatening mage); Scribes ride mage_heal
  // (the spellcaster look). Halo overlay (ChannelBarOverlay) layers
  // a faction glow on top so the player can read them as casters
  // distinct from regular mages.
  arcane_sigil: 12,
  arcane_scribe: 15,
  // M3 Archmages reuse mage sprite columns; the channel-bar halo +
  // unique tints + boss-tier scale make them visually distinct.
  // Meteora → mage_armor (col 12), tinted hot orange in Creep ctor.
  arcane_archmage_meteor: 12,
  // Stormcaller → mage_speed (col 13), tinted blue.
  arcane_archmage_storm: 13,
  // Necromaster → mage_evasion (col 14), tinted deep purple.
  arcane_archmage_necro: 14,
  // M5 Warlords ride the boss sprite (col 5) at 2.2-2.6 scale, with
  // per-creep tint baked in Creep.ts. Same trick as the archmages
  // but using the boss column for the heavier silhouette.
  warlord_stalwart: 5,
  warlord_healer: 5,
  warlord_champion: 5,
  warlord_tactician: 5,
  warlord_captain: 5,
};

/**
 * Bespoke-art override sheet for the Snake Eyes campaign.
 *
 * Currently a single-creep sheet (1 col × 7 rows = 64×448) for
 * The Collector, the M8 named-boss enforcer. The Dealer's hand on
 * the road — banker's coat, top hat, gold-coin face stamped with
 * the snake-eyes "1" pip. Without bespoke art he falls back to
 * col 0 of the void faction sheet (a generic void blob), which
 * undercuts his read as the campaign's named antagonist.
 *
 * Runtime resolveSheet() prefers this sheet for void_collector
 * if loaded, with cold-start fallback to the void faction sheet.
 *
 * Adding more Snake Eyes creep variants later: extend
 * snake_eyes_creep_sprites.tsx with more draw fns, expand the
 * sheet dimensions, and add the id → column mapping here.
 */
const SNAKE_EYES_CAMPAIGN_TO_COL: Record<string, number> = {
  void_collector: 0,
};
const SNAKE_EYES_CAMPAIGN_SHEET_KEY = 'creeps_snake_eyes_campaign';
const SNAKE_EYES_CAMPAIGN_COLS = 1;

/** All faction IDs that have creep spritesheets */
const CREEP_FACTIONS: FactionId[] = [
  'arcane', 'mechanical', 'nature', 'void', 'military',
  'aliens', 'cypherpunk', 'infernal', 'celestial', 'psionic', 'harmonic',
];

function sheetKey(faction: FactionId): string {
  return `creeps_${faction}`;
}

/**
 * Resolve which sheet + column a creep id should render from.
 *
 * Snake Eyes campaign creeps ride their own dedicated sheet so
 * named characters like The Collector get a bespoke silhouette
 * rather than a generic void-faction fallback. Cold-start safety:
 * falls back to the faction sheet if the campaign sheet hasn't
 * been loaded yet.
 */
function resolveSheet(
  scene: Phaser.Scene,
  faction: FactionId,
  creepTypeId: string,
): { key: string; col: number; cols: number } | null {
  if (creepTypeId in SNAKE_EYES_CAMPAIGN_TO_COL && scene.textures.exists(SNAKE_EYES_CAMPAIGN_SHEET_KEY)) {
    return {
      key: SNAKE_EYES_CAMPAIGN_SHEET_KEY,
      col: SNAKE_EYES_CAMPAIGN_TO_COL[creepTypeId],
      cols: SNAKE_EYES_CAMPAIGN_COLS,
    };
  }
  const key = sheetKey(faction);
  if (!scene.textures.exists(key)) return null;
  return { key, col: CREEP_TYPE_TO_COL[creepTypeId] ?? 0, cols: COLS };
}

/** Preload all creep spritesheets (call in scene.preload) */
export function preloadCreepSprites(scene: Phaser.Scene): void {
  for (const faction of CREEP_FACTIONS) {
    const key = sheetKey(faction);
    if (scene.textures.exists(key)) continue;
    scene.load.spritesheet(key, `assets/creeps/${faction}_creeps.png`, {
      frameWidth: FRAME_SIZE,
      frameHeight: FRAME_SIZE,
    });
  }
  // Snake Eyes campaign bespoke sheet (1 col × 7 rows = 64×448).
  if (!scene.textures.exists(SNAKE_EYES_CAMPAIGN_SHEET_KEY)) {
    scene.load.spritesheet(SNAKE_EYES_CAMPAIGN_SHEET_KEY, 'assets/creeps/snake_eyes_creeps.png', {
      frameWidth: FRAME_SIZE,
      frameHeight: FRAME_SIZE,
    });
  }
}

/** Create walk + death animations for a given creep faction (call in scene.create) */
export function createCreepAnimations(scene: Phaser.Scene, faction: FactionId): void {
  const key = sheetKey(faction);
  if (scene.textures.exists(key)) {
    for (const [typeId, col] of Object.entries(CREEP_TYPE_TO_COL)) {
      const walkKey = `creep_${faction}_${typeId}_walk`;
      if (!scene.anims.exists(walkKey)) {
        scene.anims.create({
          key: walkKey,
          frames: Array.from({ length: WALK_FRAMES }, (_, row) => ({
            key, frame: row * COLS + col,
          })),
          frameRate: WALK_FPS,
          repeat: -1,
        });
      }
      const deathKey = `creep_${faction}_${typeId}_death`;
      if (!scene.anims.exists(deathKey)) {
        scene.anims.create({
          key: deathKey,
          frames: Array.from({ length: DEATH_FRAMES }, (_, i) => ({
            key, frame: (4 + i) * COLS + col,
          })),
          frameRate: DEATH_FPS,
          repeat: 0,
        });
      }
    }
  }
  // Snake Eyes campaign animations — row stride matches the 1-col
  // sheet (each row is just frame index `row`).
  if (scene.textures.exists(SNAKE_EYES_CAMPAIGN_SHEET_KEY)) {
    for (const [typeId, col] of Object.entries(SNAKE_EYES_CAMPAIGN_TO_COL)) {
      const walkKey = `creep_${faction}_${typeId}_walk`;
      if (!scene.anims.exists(walkKey)) {
        scene.anims.create({
          key: walkKey,
          frames: Array.from({ length: WALK_FRAMES }, (_, row) => ({
            key: SNAKE_EYES_CAMPAIGN_SHEET_KEY,
            frame: row * SNAKE_EYES_CAMPAIGN_COLS + col,
          })),
          frameRate: WALK_FPS,
          repeat: -1,
        });
      }
      const deathKey = `creep_${faction}_${typeId}_death`;
      if (!scene.anims.exists(deathKey)) {
        scene.anims.create({
          key: deathKey,
          frames: Array.from({ length: DEATH_FRAMES }, (_, i) => ({
            key: SNAKE_EYES_CAMPAIGN_SHEET_KEY,
            frame: (4 + i) * SNAKE_EYES_CAMPAIGN_COLS + col,
          })),
          frameRate: DEATH_FPS,
          repeat: 0,
        });
      }
    }
  }
}

/** Create a creep sprite for a given faction and type */
export function createCreepSprite(
  scene: Phaser.Scene,
  faction: FactionId,
  creepTypeId: string,
  x: number,
  y: number,
): Phaser.GameObjects.Sprite | null {
  const resolved = resolveSheet(scene, faction, creepTypeId);
  if (!resolved) return null;
  const sprite = scene.add.sprite(x, y, resolved.key, resolved.col);
  sprite.setDepth(10);
  sprite.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);

  const walkKey = `creep_${faction}_${creepTypeId}_walk`;
  if (scene.anims.exists(walkKey)) {
    sprite.play(walkKey);
  }

  return sprite;
}

/** Play death animation on a creep sprite, then destroy it.
 *  Defensive cleanup: in addition to the `animationcomplete` listener,
 *  schedule a delayed destroy as a backstop. If the event fires first
 *  the destroy is a no-op (Phaser checks `active`). If the event is
 *  swallowed (scene transition mid-animation, or any Phaser 4 edge
 *  case where the listener never fires), the timer fires anyway and
 *  the corpse can't outlive the animation duration. */
export function playCreepDeath(
  scene: Phaser.Scene,
  sprite: Phaser.GameObjects.Sprite,
  faction: FactionId,
  creepTypeId: string,
): void {
  const deathKey = `creep_${faction}_${creepTypeId}_death`;
  const safeDestroy = () => {
    if (sprite && (sprite as any).active !== false) sprite.destroy();
  };
  if (scene.anims.exists(deathKey)) {
    sprite.play(deathKey);
    sprite.once('animationcomplete', safeDestroy);
    // Backstop timer at 1.5× animation duration. DEATH_FRAMES / DEATH_FPS
    // is the natural runtime; the cushion gives the listener room to
    // win the race in the happy path.
    const ms = Math.ceil((DEATH_FRAMES / DEATH_FPS) * 1500);
    scene.time.delayedCall(ms, safeDestroy);
  } else {
    sprite.destroy();
  }
}

/** Get the scale factor for a creep type (boss bigger, swarm smaller) */
export function getCreepSpriteScale(creepTypeId: string): number {
  switch (creepTypeId) {
    case 'boss': return 0.7;        // boss is drawn large in the frame
    case 'swarm': return 0.3;       // swarm is tiny
    case 'splitter_child': return 0.3;
    case 'armored': return 0.5;
    case 'regenerator': return 0.5;
    default: return 0.4;            // standard size
  }
}

/** Check if a creep faction's sprites are loaded */
export function hasCreepSprites(faction: FactionId, scene: Phaser.Scene): boolean {
  return scene.textures.exists(sheetKey(faction));
}

export { CREEP_FACTIONS, CREEP_TYPE_TO_COL };
