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

/** Helper: generate tower configs for a faction */
function factionTowers(sheetKey: string, towerIds: string[]): Record<string, TowerSpriteConfig> {
  const cfg: Record<string, TowerSpriteConfig> = {};
  for (let i = 0; i < towerIds.length; i++) {
    cfg[towerIds[i]] = {
      sheetKey, column: i, totalCols: towerIds.length,
      rows: { idle: 0, charge: 1, fire: 2, cooldown: 3 },
    };
  }
  return cfg;
}

/** Helper: generate projectile configs for a faction */
function factionProj(sheetKey: string, towerIds: string[]): Record<string, ProjectileSpriteConfig> {
  const cfg: Record<string, ProjectileSpriteConfig> = {};
  for (let i = 0; i < towerIds.length; i++) {
    cfg[towerIds[i]] = {
      sheetKey, column: i, totalCols: towerIds.length,
      travelRows: [0, 1, 2], impactRows: [3, 4, 5],
    };
  }
  return cfg;
}

/** Map of tower ID → sprite config */
const TOWER_SPRITE_CONFIGS: Record<string, TowerSpriteConfig> = {
  ...factionTowers('void_towers', ['void_gambler', 'void_spike', 'void_siphon', 'void_rift', 'void_oblivion']),
  ...factionTowers('arcane_towers', ['arcane_bolt', 'arcane_frost', 'arcane_storm', 'arcane_focus', 'arcane_drain', 'arcane_meteor', 'arcane_nova']),
  ...factionTowers('mech_towers', ['mech_wall', 'mech_turret', 'mech_flamethrower', 'mech_tesla', 'mech_mortar', 'mech_shredder', 'mech_railgun', 'mech_titan']),
  ...factionTowers('nature_towers', ['nature_thorn', 'nature_root', 'nature_blossom', 'nature_spore', 'nature_vine', 'nature_elder']),
  ...factionTowers('mil_towers', ['mil_sandbag', 'mil_wire', 'mil_rifleman', 'mil_brawler', 'mil_heavy', 'mil_commander']),
  ...factionTowers('alien_towers', ['alien_spitter', 'alien_stinger', 'alien_swarm_node', 'alien_acid', 'alien_hive_spire', 'alien_brood_mother', 'alien_swarmling', 'alien_overmind']),
  ...factionTowers('cyber_towers', ['cyber_ping', 'cyber_firewall', 'cyber_virus', 'cyber_backdoor', 'cyber_ddos', 'cyber_rootkit', 'cyber_zeroday']),
  ...factionTowers('infernal_towers', ['infernal_imp', 'infernal_hellfire', 'infernal_soul_drain', 'infernal_bomber', 'infernal_immolate', 'infernal_apocalypse']),
  ...factionTowers('celestial_towers', ['celestial_acolyte', 'celestial_ward', 'celestial_smite', 'celestial_sanctuary', 'celestial_absolution']),
  ...factionTowers('psionic_towers', ['psi_probe', 'psi_mesmer', 'psi_terror', 'psi_mind_spike', 'psi_overmind']),
  ...factionTowers('harmonic_towers', ['harmonic_resonator', 'harmonic_amplifier', 'harmonic_quickener', 'harmonic_reach', 'harmonic_critical_mass', 'harmonic_conduit', 'harmonic_crescendo']),
};

const PROJECTILE_SPRITE_CONFIGS: Record<string, ProjectileSpriteConfig> = {
  ...factionProj('void_proj', ['void_gambler', 'void_spike', 'void_siphon', 'void_rift', 'void_oblivion']),
  ...factionProj('arcane_proj', ['arcane_bolt', 'arcane_frost', 'arcane_storm', 'arcane_focus', 'arcane_drain', 'arcane_meteor', 'arcane_nova']),
  ...factionProj('mech_proj', ['mech_wall', 'mech_turret', 'mech_flamethrower', 'mech_tesla', 'mech_mortar', 'mech_shredder', 'mech_railgun', 'mech_titan']),
  ...factionProj('nature_proj', ['nature_thorn', 'nature_root', 'nature_blossom', 'nature_spore', 'nature_vine', 'nature_elder']),
  ...factionProj('mil_proj', ['mil_sandbag', 'mil_wire', 'mil_rifleman', 'mil_brawler', 'mil_heavy', 'mil_commander']),
  ...factionProj('alien_proj', ['alien_spitter', 'alien_stinger', 'alien_swarm_node', 'alien_acid', 'alien_hive_spire', 'alien_brood_mother', 'alien_swarmling', 'alien_overmind']),
  ...factionProj('cyber_proj', ['cyber_ping', 'cyber_firewall', 'cyber_virus', 'cyber_backdoor', 'cyber_ddos', 'cyber_rootkit', 'cyber_zeroday']),
  ...factionProj('infernal_proj', ['infernal_imp', 'infernal_hellfire', 'infernal_soul_drain', 'infernal_bomber', 'infernal_immolate', 'infernal_apocalypse']),
  ...factionProj('celestial_proj', ['celestial_acolyte', 'celestial_ward', 'celestial_smite', 'celestial_sanctuary', 'celestial_absolution']),
  ...factionProj('psionic_proj', ['psi_probe', 'psi_mesmer', 'psi_terror', 'psi_mind_spike', 'psi_overmind']),
  ...factionProj('harmonic_proj', ['harmonic_resonator', 'harmonic_amplifier', 'harmonic_quickener', 'harmonic_reach', 'harmonic_critical_mass', 'harmonic_conduit', 'harmonic_crescendo']),
};

/** Tower IDs that are mobile units (need walk-cycle frames instead of tower states) */
const MOBILE_TOWER_IDS = new Set([
  'mil_rifleman', 'mil_brawler', 'mil_heavy', 'mil_commander',
  'alien_swarmling',
  'infernal_bomber',
]);

/** Check if a tower ID has sprite art available */
export function hasTowerSprite(towerId: string): boolean {
  return towerId in TOWER_SPRITE_CONFIGS;
}

/** Check if a tower is a mobile unit (needs walk-cycle rendering) */
export function isMobileTowerSprite(towerId: string): boolean {
  return MOBILE_TOWER_IDS.has(towerId);
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
/** Faction asset definitions: sheet keys, file paths, cell sizes */
const FACTION_SHEETS: { towers: string; proj: string; hero: string; dir: string; towerCols: number; projCols: number }[] = [
  { towers: 'void_towers', proj: 'void_proj', hero: 'void_hero', dir: 'void', towerCols: 5, projCols: 5 },
  { towers: 'arcane_towers', proj: 'arcane_proj', hero: 'arcane_hero', dir: 'arcane', towerCols: 7, projCols: 7 },
  { towers: 'mech_towers', proj: 'mech_proj', hero: 'mech_hero', dir: 'mechanical', towerCols: 8, projCols: 8 },
  { towers: 'nature_towers', proj: 'nature_proj', hero: 'nature_hero', dir: 'nature', towerCols: 6, projCols: 6 },
  { towers: 'mil_towers', proj: 'mil_proj', hero: 'mil_hero', dir: 'military', towerCols: 6, projCols: 6 },
  { towers: 'alien_towers', proj: 'alien_proj', hero: 'alien_hero', dir: 'aliens', towerCols: 8, projCols: 8 },
  { towers: 'cyber_towers', proj: 'cyber_proj', hero: 'cyber_hero', dir: 'cypherpunk', towerCols: 7, projCols: 7 },
  { towers: 'infernal_towers', proj: 'infernal_proj', hero: 'infernal_hero', dir: 'infernal', towerCols: 6, projCols: 6 },
  { towers: 'celestial_towers', proj: 'celestial_proj', hero: 'celestial_hero', dir: 'celestial', towerCols: 5, projCols: 5 },
  { towers: 'psionic_towers', proj: 'psionic_proj', hero: 'psionic_hero', dir: 'psionic', towerCols: 5, projCols: 5 },
  { towers: 'harmonic_towers', proj: 'harmonic_proj', hero: 'harmonic_hero', dir: 'harmonic', towerCols: 7, projCols: 7 },
];

/** Hero ID → sheet key mapping */
const HERO_SPRITE_SHEETS: Record<string, string> = {
  shadow: 'void_hero',
  arcanist: 'arcane_hero',
  engineer: 'mech_hero',
  druid: 'nature_hero',
  warden: 'mil_hero',
  necromancer: 'alien_hero',
  duelist: 'cyber_hero',
  berserker: 'infernal_hero',
  paladin: 'celestial_hero',
  monk: 'psionic_hero',
  ranger: 'harmonic_hero',
};

/** Get hero sheet key for a hero ID */
export function getHeroSheetKey(heroId: string): string | undefined {
  return HERO_SPRITE_SHEETS[heroId];
}

export function preloadSprites(scene: Phaser.Scene): void {
  for (const f of FACTION_SHEETS) {
    scene.load.spritesheet(f.towers, `assets/${f.dir}/${f.dir}_towers.png`, { frameWidth: 64, frameHeight: 64 });
    scene.load.spritesheet(f.proj, `assets/${f.dir}/${f.dir}_projectiles.png`, { frameWidth: 32, frameHeight: 32 });
    scene.load.spritesheet(f.hero, `assets/${f.dir}/${f.dir}_hero.png`, { frameWidth: 64, frameHeight: 128 });
  }
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
 * For static towers only.
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
 * Update a mobile unit sprite based on movement direction and state.
 * Mobile unit sheets use rows: 0=idle, 1=walk, 2=attack, 3=special/death
 * Within each row, the column is the tower's column in the sheet.
 *
 * @param dx - movement delta X this frame (positive = right)
 * @param dy - movement delta Y this frame (positive = down)
 * @param isAttacking - whether the unit is currently attacking
 * @param animTimer - incremented timer for walk cycle frame selection
 */
export function updateMobileTowerSprite(
  sprite: Phaser.GameObjects.Sprite, towerId: string,
  dx: number, dy: number, isAttacking: boolean, animTimer: number,
): void {
  const config = TOWER_SPRITE_CONFIGS[towerId];
  if (!config) return;

  const isMoving = Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5;
  let row: number;

  if (isAttacking) {
    row = 2; // attack row
  } else if (isMoving) {
    row = 1; // walk row
    // Flip sprite based on horizontal direction
    if (Math.abs(dx) > Math.abs(dy)) {
      sprite.setFlipX(dx < 0);
    }
  } else {
    row = 0; // idle row
  }

  const frameIndex = row * config.totalCols + config.column;
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
