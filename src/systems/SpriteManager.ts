/**
 * SpriteManager — handles loading and creating sprites for factions that have art.
 * Factions without spritesheets continue using Graphics primitives.
 */

/** Tower sprite animation config */
export interface TowerSpriteConfig {
  /** Spritesheet key (loaded in preload) */
  sheetKey: string;
  /** Column index in the sheet (0-based) for this tower */
  column: number;
  /** Total columns in the sheet */
  totalCols: number;
  /** Row indices: idle, charge, fire, cooldown */
  rows: { idle: number; charge: number; fire: number; cooldown: number };
}

/** Projectile sprite animation config */
export interface ProjectileSpriteConfig {
  sheetKey: string;
  column: number;
  totalCols: number;
  /** First 3 rows = travel, last 3 rows = impact */
  travelRows: number[];
  impactRows: number[];
}

/** Map of tower ID → sprite config */
const TOWER_SPRITE_CONFIGS: Record<string, TowerSpriteConfig> = {
  // Void faction towers: 5 columns, 4 rows (idle/charge/fire/cooldown)
  void_gambler:  { sheetKey: 'void_towers', column: 0, totalCols: 5, rows: { idle: 0, charge: 1, fire: 2, cooldown: 3 } },
  void_spike:    { sheetKey: 'void_towers', column: 1, totalCols: 5, rows: { idle: 0, charge: 1, fire: 2, cooldown: 3 } },
  void_siphon:   { sheetKey: 'void_towers', column: 2, totalCols: 5, rows: { idle: 0, charge: 1, fire: 2, cooldown: 3 } },
  void_rift:     { sheetKey: 'void_towers', column: 3, totalCols: 5, rows: { idle: 0, charge: 1, fire: 2, cooldown: 3 } },
  void_oblivion: { sheetKey: 'void_towers', column: 4, totalCols: 5, rows: { idle: 0, charge: 1, fire: 2, cooldown: 3 } },
};

const PROJECTILE_SPRITE_CONFIGS: Record<string, ProjectileSpriteConfig> = {
  void_gambler:  { sheetKey: 'void_proj', column: 0, totalCols: 5, travelRows: [0, 1, 2], impactRows: [3, 4, 5] },
  void_spike:    { sheetKey: 'void_proj', column: 1, totalCols: 5, travelRows: [0, 1, 2], impactRows: [3, 4, 5] },
  void_siphon:   { sheetKey: 'void_proj', column: 2, totalCols: 5, travelRows: [0, 1, 2], impactRows: [3, 4, 5] },
  void_rift:     { sheetKey: 'void_proj', column: 3, totalCols: 5, travelRows: [0, 1, 2], impactRows: [3, 4, 5] },
  void_oblivion: { sheetKey: 'void_proj', column: 4, totalCols: 5, travelRows: [0, 1, 2], impactRows: [3, 4, 5] },
};

/** Check if a tower ID has sprite art available */
export function hasTowerSprite(towerId: string): boolean {
  return towerId in TOWER_SPRITE_CONFIGS;
}

/** Check if a tower's projectiles have sprite art */
export function hasProjectileSprite(towerId: string): boolean {
  return towerId in PROJECTILE_SPRITE_CONFIGS;
}

/** Get the tower sprite config */
export function getTowerSpriteConfig(towerId: string): TowerSpriteConfig | undefined {
  return TOWER_SPRITE_CONFIGS[towerId];
}

/** Get the projectile sprite config */
export function getProjectileSpriteConfig(towerId: string): ProjectileSpriteConfig | undefined {
  return PROJECTILE_SPRITE_CONFIGS[towerId];
}

/**
 * Load all sprite assets. Call in scene preload().
 */
export function preloadSprites(scene: Phaser.Scene): void {
  // Void faction
  scene.load.spritesheet('void_towers', 'assets/void/void_towers_animated.png', {
    frameWidth: 64, frameHeight: 64,
  });
  scene.load.spritesheet('void_proj', 'assets/void/void_projectiles_animated.png', {
    frameWidth: 32, frameHeight: 32,
  });
  scene.load.spritesheet('void_hero', 'assets/void/shadow_hero_directional.png', {
    frameWidth: 64, frameHeight: 128,
  });
}

/**
 * Create all animations from loaded spritesheets. Call in scene create() after preload.
 */
export function createSpriteAnimations(scene: Phaser.Scene): void {
  // Tower animations — one per tower per state
  for (const [towerId, config] of Object.entries(TOWER_SPRITE_CONFIGS)) {
    for (const [stateName, row] of Object.entries(config.rows)) {
      const frameIndex = row * config.totalCols + config.column;
      const animKey = `${towerId}_${stateName}`;
      if (!scene.anims.exists(animKey)) {
        scene.anims.create({
          key: animKey,
          frames: [{ key: config.sheetKey, frame: frameIndex }],
          frameRate: 1,
          repeat: 0,
        });
      }
    }
  }

  // Projectile animations — travel and impact per projectile type
  for (const [towerId, config] of Object.entries(PROJECTILE_SPRITE_CONFIGS)) {
    // Travel animation (loop)
    const travelKey = `proj_${towerId}_travel`;
    if (!scene.anims.exists(travelKey)) {
      const travelFrames = config.travelRows.map(row => ({
        key: config.sheetKey,
        frame: row * config.totalCols + config.column,
      }));
      scene.anims.create({
        key: travelKey,
        frames: travelFrames,
        frameRate: 8,
        repeat: -1,
      });
    }

    // Impact animation (play once)
    const impactKey = `proj_${towerId}_impact`;
    if (!scene.anims.exists(impactKey)) {
      const impactFrames = config.impactRows.map(row => ({
        key: config.sheetKey,
        frame: row * config.totalCols + config.column,
      }));
      scene.anims.create({
        key: impactKey,
        frames: impactFrames,
        frameRate: 12,
        repeat: 0,
      });
    }
  }
}

/**
 * Create a tower sprite for a given tower ID. Returns null if no sprite available.
 */
export function createTowerSprite(
  scene: Phaser.Scene, towerId: string, x: number, y: number,
): Phaser.GameObjects.Sprite | null {
  const config = TOWER_SPRITE_CONFIGS[towerId];
  if (!config) return null;

  const frameIndex = config.rows.idle * config.totalCols + config.column;
  const sprite = scene.add.sprite(x, y, config.sheetKey, frameIndex);
  sprite.setDepth(5);

  // Scale sprite to fill ~1.3 tiles (64px sprite on 28px grid)
  const scale = (28 * 1.3) / 64;
  sprite.setScale(scale);

  // Crisp pixel rendering
  sprite.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);

  return sprite;
}

/**
 * Set tower sprite to the correct animation frame based on attack state.
 */
export function setTowerSpriteState(
  sprite: Phaser.GameObjects.Sprite, towerId: string,
  state: 'idle' | 'charge' | 'fire' | 'cooldown',
): void {
  const config = TOWER_SPRITE_CONFIGS[towerId];
  if (!config) return;
  const frameIndex = config.rows[state] * config.totalCols + config.column;
  sprite.setFrame(frameIndex);
}

/**
 * Create a projectile sprite. Returns null if no sprite available.
 */
export function createProjectileSprite(
  scene: Phaser.Scene, towerId: string, x: number, y: number,
): Phaser.GameObjects.Sprite | null {
  const config = PROJECTILE_SPRITE_CONFIGS[towerId];
  if (!config) return null;

  const frameIndex = config.travelRows[0] * config.totalCols + config.column;
  const sprite = scene.add.sprite(x, y, config.sheetKey, frameIndex);
  sprite.setDepth(15);

  // Scale projectile (32px sprite → ~14px display)
  const scale = 14 / 32;
  sprite.setScale(scale);

  // Start travel animation
  const travelKey = `proj_${towerId}_travel`;
  sprite.play(travelKey);

  return sprite;
}

/**
 * Play impact animation on a projectile sprite, then destroy it.
 */
export function playProjectileImpact(
  sprite: Phaser.GameObjects.Sprite, towerId: string,
): void {
  const impactKey = `proj_${towerId}_impact`;
  const scale = 18 / 32; // impact is slightly bigger than travel
  sprite.setScale(scale);
  sprite.play(impactKey);
  sprite.once('animationcomplete', () => {
    sprite.destroy();
  });
}
