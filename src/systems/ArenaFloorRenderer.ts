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

const BASE_W = 112;
const BASE_H = 140;

function baseKey(faction: FactionId): string {
  return `arena_base_${faction}`;
}

/** Preload all per-faction HD base spritesheets (PRD 02). Each is a
 *  vertical 5-frame strip — frame 0 pristine through frame 4 collapse.
 *  Call from GameScene.preload alongside preloadArenaFloors. */
export function preloadArenaBases(scene: Phaser.Scene): void {
  for (const faction of ARENA_FACTIONS) {
    const key = baseKey(faction);
    if (scene.textures.exists(key)) continue;
    scene.load.spritesheet(key, `assets/arena/base_${faction}.png`, {
      frameWidth: BASE_W,
      frameHeight: BASE_H,
    });
  }
}

/** Pick the damage frame for a given baseHp / baseMaxHp ratio.
 *  Returns 0..4 — frame 0 = pristine, frame 4 = collapse. Threshold
 *  matches the PRD: 100% → 0, 75% → 1, 50% → 2, 25% → 3, 0% → 4. */
export function baseDamageFrame(hpRatio: number): number {
  if (hpRatio >= 0.85) return 0;
  if (hpRatio >= 0.6) return 1;
  if (hpRatio >= 0.35) return 2;
  if (hpRatio >= 0.1) return 3;
  return 4;
}

// ─── PRD 03: Hero ability VFX atlas ────────────────────────────────
// 12 sheets ship for v1: mage / ranger / paladin × Q W E R. Each
// sheet is a 6-frame horizontal strip of 64x64 frames. Plays at 18 fps,
// 0.33s play-once. Spawned via spawnHeroAbilityVfx() from Hero ability
// handlers; the sprite self-destroys on animationcomplete.

const VFX_FRAME = 64;
const VFX_FPS = 18;
const HERO_VFX: Array<{ hero: string; key: 'Q' | 'W' | 'E' | 'R' }> = [
  { hero: 'arcanist', key: 'Q' }, { hero: 'arcanist', key: 'W' },
  { hero: 'arcanist', key: 'E' }, { hero: 'arcanist', key: 'R' },
  { hero: 'ranger', key: 'Q' }, { hero: 'ranger', key: 'W' },
  { hero: 'ranger', key: 'E' }, { hero: 'ranger', key: 'R' },
  { hero: 'paladin', key: 'Q' }, { hero: 'paladin', key: 'W' },
  { hero: 'paladin', key: 'E' }, { hero: 'paladin', key: 'R' },
];

function vfxKey(hero: string, key: string): string {
  return `hero_vfx_${hero}_${key}`;
}

function vfxAnimKey(hero: string, key: string): string {
  return `${vfxKey(hero, key)}_anim`;
}

/** Preload all hero ability VFX sheets. Call from GameScene.preload. */
export function preloadHeroAbilityVfx(scene: Phaser.Scene): void {
  for (const { hero, key } of HERO_VFX) {
    const sheetKey = vfxKey(hero, key);
    if (scene.textures.exists(sheetKey)) continue;
    scene.load.spritesheet(sheetKey, `assets/heroes/vfx/${hero}_${key}.png`, {
      frameWidth: VFX_FRAME,
      frameHeight: VFX_FRAME,
    });
  }
}

/** Register the play-once animations for each hero VFX sheet. Call
 *  from GameScene.create after textures are loaded. */
export function createHeroAbilityVfxAnimations(scene: Phaser.Scene): void {
  for (const { hero, key } of HERO_VFX) {
    const animKey = vfxAnimKey(hero, key);
    const sheetKey = vfxKey(hero, key);
    if (!scene.textures.exists(sheetKey)) continue;
    if (scene.anims.exists(animKey)) continue;
    scene.anims.create({
      key: animKey,
      frames: scene.anims.generateFrameNumbers(sheetKey, { start: 0, end: 5 }),
      frameRate: VFX_FPS,
      repeat: 0,
    });
  }
}

/** Spawn a one-shot VFX sprite at (x, y) for a hero ability. Self-
 *  destroys on animationcomplete with a 1.5x duration backstop timer
 *  in case the listener is dropped (Phaser 4 scene-transition edge
 *  case, same defensive pattern as creep death anims). No-op if the
 *  hero / key combo doesn't have an authored VFX sheet — caller's
 *  procedural FX will still play unaffected. */
export function spawnHeroAbilityVfx(
  scene: Phaser.Scene,
  hero: string,
  key: string,
  x: number,
  y: number,
): void {
  const sheetKey = vfxKey(hero, key);
  const animKey = vfxAnimKey(hero, key);
  if (!scene.textures.exists(sheetKey)) return;
  if (!scene.anims.exists(animKey)) return;
  const sprite = scene.add.sprite(x, y, sheetKey, 0).setDepth(15);
  sprite.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
  sprite.play(animKey);
  const safeDestroy = () => { if (sprite && (sprite as any).active !== false) sprite.destroy(); };
  sprite.once('animationcomplete', safeDestroy);
  scene.time.delayedCall(Math.ceil((6 / VFX_FPS) * 1500), safeDestroy);
}

/** ArenaBase — manages the base sprite at the right edge of the arena.
 *  Frame swaps based on baseHp threshold; the engine destroys this
 *  sprite when the base is fully destroyed (frame 4 has been shown). */
export class ArenaBase {
  private scene: Phaser.Scene;
  private sprite: Phaser.GameObjects.Sprite | null = null;
  private currentFrame = -1;

  constructor(scene: Phaser.Scene, faction: FactionId | null, x: number, bottomY: number) {
    this.scene = scene;
    if (!faction) return;
    const key = baseKey(faction);
    if (!scene.textures.exists(key)) return;
    // Anchor bottom-center on the arena floor.
    this.sprite = scene.add.sprite(x, bottomY, key, 0)
      .setOrigin(0.5, 1)
      .setDepth(5); // above floor (-100), below creeps/hero (10+)
    this.sprite.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.currentFrame = 0;
  }

  /** Re-evaluate the damage frame based on current HP ratio. Cheap
   *  no-op when the frame hasn't changed since last call. */
  update(hpRatio: number): void {
    if (!this.sprite) return;
    const frame = baseDamageFrame(Math.max(0, Math.min(1, hpRatio)));
    if (frame === this.currentFrame) return;
    this.currentFrame = frame;
    this.sprite.setFrame(frame);
  }

  /** True when a faction sprite is in use (vs. the procedural rect
   *  fallback). ArenaManager checks this to decide whether to skip
   *  the legacy graphics-painted base block. */
  isActive(): boolean {
    return this.sprite !== null;
  }

  destroy(): void {
    this.sprite?.destroy();
    this.sprite = null;
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
