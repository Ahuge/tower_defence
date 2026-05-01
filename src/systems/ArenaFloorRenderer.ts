/**
 * ArenaFloorRenderer — paints the per-faction Hero Defense arena
 * floor tileset (PRD 01) inside `ArenaManager`'s rect.
 *
 * Tile sources at `public/assets/arena/<faction>_arena_tileset.png`
 * are 448×56 (16 cols × 2 rows × 28 px). Row 0: ground variants
 * (12 base + 4 accent). Row 1: alpha-PNG prop tiles scattered ~3% of
 * cells.
 *
 * Tiles are stamped once at construction into a `RenderTexture` so
 * the floor is essentially free per frame — no recreation, no
 * iteration. Picking is deterministic from (faction × col × row) so
 * the layout is stable across replays.
 *
 * Falls back gracefully if the spritesheet didn't load (missing
 * faction file): the renderer self-skips and ArenaManager's existing
 * procedural background fills the rect instead.
 */
import * as Phaser from 'phaser';
import { FactionId } from '../data/Factions';

const TILE = 28;
const COLS = 16;
const PROP_RATE = 0.04;       // ~4% cells get a row-1 prop sprite
const ACCENT_RATE = 0.06;     // ~6% cells use a row-0 accent variant (12-15)

function sheetKey(faction: FactionId): string {
  return `arena_floor_${faction}`;
}

/** Faction ids that ship arena floor tilesets. Meta factions
 *  (chaos / random) intentionally omitted — the renderer self-skips
 *  for those and the procedural fallback fills the rect. */
const ARENA_FACTIONS: FactionId[] = [
  'arcane', 'mechanical', 'nature', 'void', 'military',
  'aliens', 'cypherpunk', 'infernal', 'celestial', 'psionic', 'harmonic',
];

/** Preload all arena floor tilesets. Call from GameScene.preload. */
export function preloadArenaFloors(scene: Phaser.Scene): void {
  for (const faction of ARENA_FACTIONS) {
    const key = sheetKey(faction);
    if (scene.textures.exists(key)) continue;
    scene.load.spritesheet(key, `assets/arena/${faction}_arena_tileset.png`, {
      frameWidth: TILE,
      frameHeight: TILE,
    });
  }
}

/** Hash-based deterministic RNG. Fast and stable across runs. */
function hash3(a: number, b: number, c: number): number {
  let h = (a * 0x9e3779b1) ^ (b * 0x85ebca6b) ^ (c * 0xc2b2ae35);
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 0xffffffff;
}

export class ArenaFloorRenderer {
  private scene: Phaser.Scene;
  private rt: Phaser.GameObjects.RenderTexture | null = null;

  constructor(
    scene: Phaser.Scene,
    faction: FactionId | null,
    arenaX: number,
    arenaY: number,
    arenaWidth: number,
    arenaHeight: number,
  ) {
    this.scene = scene;
    if (!faction) return;
    const key = sheetKey(faction);
    if (!scene.textures.exists(key)) return;

    const cols = Math.ceil(arenaWidth / TILE);
    const rows = Math.ceil(arenaHeight / TILE);

    // Single render texture sized to the arena. Stamped once below
    // and then never touched per frame.
    this.rt = scene.add.renderTexture(arenaX, arenaY, arenaWidth, arenaHeight)
      .setOrigin(0, 0)
      .setDepth(-100); // below everything (creeps, hero, base, projectiles)

    const factionSeed = stringHash(faction);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = col * TILE;
        const y = row * TILE;
        // Pick a row-0 ground variant. ~6% of cells use frames 12-15
        // (accent variants); the rest use frames 0-11 (plain ground).
        let groundFrame: number;
        const rA = hash3(factionSeed, col, row * 7 + 1);
        if (rA < ACCENT_RATE) {
          groundFrame = 12 + Math.floor(hash3(factionSeed, col, row + 31) * 4);
        } else {
          groundFrame = Math.floor(hash3(factionSeed, col, row) * 12);
        }
        // Phaser's stamp() defaults origin to (0.5, 0.5) — pin to
        // top-left so (x, y) is the tile's upper-left corner.
        const stampOpts = { originX: 0, originY: 0 } as const;
        this.rt.stamp(key, groundFrame, x, y, stampOpts);

        // ~4% of cells overlay a row-1 prop sprite. Picked
        // independently from the ground so accents and props can
        // co-occur on the same cell without interfering.
        const rP = hash3(factionSeed, col + 13, row + 17);
        if (rP < PROP_RATE) {
          const propFrame = COLS + Math.floor(hash3(factionSeed, col + 7, row + 11) * COLS);
          this.rt.stamp(key, propFrame, x, y, stampOpts);
        }
      }
    }
  }

  /** Tear down the render texture. Called by ArenaManager.destroy(). */
  destroy(): void {
    if (this.rt) {
      this.rt.destroy();
      this.rt = null;
    }
  }
}

function stringHash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return h >>> 0;
}
