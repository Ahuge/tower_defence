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
};

/** All faction IDs that have creep spritesheets */
const CREEP_FACTIONS: FactionId[] = [
  'arcane', 'mechanical', 'nature', 'void', 'military',
  'aliens', 'cypherpunk', 'infernal', 'celestial', 'psionic', 'harmonic',
];

function sheetKey(faction: FactionId): string {
  return `creeps_${faction}`;
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
}

/** Create walk + death animations for a given creep faction (call in scene.create) */
export function createCreepAnimations(scene: Phaser.Scene, faction: FactionId): void {
  const key = sheetKey(faction);
  if (!scene.textures.exists(key)) return;

  for (const [typeId, col] of Object.entries(CREEP_TYPE_TO_COL)) {
    // Walk animation (rows 0-3)
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

    // Death animation (rows 4-6)
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

/** Create a creep sprite for a given faction and type */
export function createCreepSprite(
  scene: Phaser.Scene,
  faction: FactionId,
  creepTypeId: string,
  x: number,
  y: number,
): Phaser.GameObjects.Sprite | null {
  const key = sheetKey(faction);
  if (!scene.textures.exists(key)) return null;

  const col = CREEP_TYPE_TO_COL[creepTypeId] ?? 0;
  const frame = col; // row 0, column = col
  const sprite = scene.add.sprite(x, y, key, frame);
  sprite.setDepth(10);
  sprite.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);

  // Start walk animation
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
