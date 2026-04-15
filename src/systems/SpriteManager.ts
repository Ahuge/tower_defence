/**
 * SpriteManager — handles loading and creating sprites for factions that have art.
 * Factions without spritesheets continue using Graphics primitives.
 */
import { SkinManager } from './monetization/SkinManager';
import { FactionId } from '../data/Factions';

/** Tower sprite animation config */
export interface TowerSpriteConfig {
  /** Spritesheet key (loaded in preload) */
  sheetKey: string;
  /** Column index in the sheet (0-based) for this tower */
  column: number;
  /** Total columns in the sheet */
  totalCols: number;
  /** Row indices: idle, charge, fire, cooldown (for level 1) */
  rows: { idle: number; charge: number; fire: number; cooldown: number };
  /** Number of upgrade levels this tower has (1 = no upgrades) */
  maxLevel: number;
  /** Rows per level (default 4: idle/charge/fire/cooldown) */
  rowsPerLevel: number;
}

/**
 * Mobile unit sprite config — separate mini-spritesheet per unit.
 * Sheet: 128×128px, 32×32 cells, 4 cols × 4 rows.
 * Cols: frame 0-3 of animation cycle.
 * Rows: 0=down, 1=right, 2=up, 3=attack.
 * Right row flips for left.
 */
export interface MobileUnitSpriteConfig {
  sheetKey: string;
  frameWidth: number;
  frameHeight: number;
  cols: number; // frames per direction
}

/** Projectile sprite animation config */
export interface ProjectileSpriteConfig {
  sheetKey: string;
  column: number;
  totalCols: number;
  /** First 3 rows = travel, last 3 rows = impact */
  travelRows: number[];
  impactRows: number[];
  /** Optional high-res impact sheet (128×128 cells) for AoE towers */
  impactHiResKey?: string;
  impactHiResCols?: number;
  impactHiResRows?: number[];
}

/**
 * Helper: generate tower configs for a faction.
 * @param levels — array of max level per tower (same order as towerIds)
 */
function factionTowers(sheetKey: string, towerIds: string[], levels?: number[]): Record<string, TowerSpriteConfig> {
  const cfg: Record<string, TowerSpriteConfig> = {};
  for (let i = 0; i < towerIds.length; i++) {
    const maxLevel = levels?.[i] ?? 1;
    cfg[towerIds[i]] = {
      sheetKey, column: i, totalCols: towerIds.length,
      rows: { idle: 0, charge: 1, fire: 2, cooldown: 3 },
      maxLevel,
      rowsPerLevel: 4,
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
  // Level counts: how many upgrade levels each tower has (matches TowerTypes.ts)
  ...factionTowers('void_towers', ['void_gambler', 'void_spike', 'void_siphon', 'void_rift', 'void_oblivion'],
    [4, 6, 6, 3, 1]),
  ...factionTowers('arcane_towers', ['arcane_bolt', 'arcane_frost', 'arcane_storm', 'arcane_focus', 'arcane_drain', 'arcane_meteor', 'arcane_nova'],
    [4, 3, 5, 4, 4, 3, 1]),
  ...factionTowers('mech_towers', ['mech_wall', 'mech_turret', 'mech_flamethrower', 'mech_tesla', 'mech_mortar', 'mech_shredder', 'mech_railgun', 'mech_titan'],
    [4, 6, 5, 4, 4, 5, 3, 3]),
  ...factionTowers('nature_towers', ['nature_thorn', 'nature_root', 'nature_blossom', 'nature_spore', 'nature_vine', 'nature_elder'],
    [6, 4, 5, 5, 3, 1]),
  ...factionTowers('mil_towers', ['mil_sandbag', 'mil_wire', 'mil_rifleman', 'mil_brawler', 'mil_heavy', 'mil_commander'],
    [2, 4, 5, 5, 3, 3]),
  ...factionTowers('alien_towers', ['alien_spitter', 'alien_stinger', 'alien_swarm_node', 'alien_acid', 'alien_hive_spire', 'alien_brood_mother', 'alien_swarmling', 'alien_overmind'],
    [4, 3, 3, 4, 4, 3, 2, 3]),
  ...factionTowers('cyber_towers', ['cyber_ping', 'cyber_firewall', 'cyber_virus', 'cyber_backdoor', 'cyber_ddos', 'cyber_rootkit', 'cyber_zeroday'],
    [4, 4, 5, 4, 3, 2, 1]),
  ...factionTowers('infernal_towers', ['infernal_imp', 'infernal_hellfire', 'infernal_soul_drain', 'infernal_bomber', 'infernal_immolate', 'infernal_apocalypse'],
    [3, 4, 3, 2, 2, 3]),
  ...factionTowers('celestial_towers', ['celestial_acolyte', 'celestial_ward', 'celestial_smite', 'celestial_sanctuary', 'celestial_absolution'],
    [5, 5, 4, 2, 2]),
  ...factionTowers('psionic_towers', ['psi_probe', 'psi_mesmer', 'psi_terror', 'psi_mind_spike', 'psi_overmind'],
    [5, 4, 4, 3, 4]),
  ...factionTowers('harmonic_towers', ['harmonic_resonator', 'harmonic_amplifier', 'harmonic_quickener', 'harmonic_reach', 'harmonic_critical_mass', 'harmonic_conduit', 'harmonic_crescendo'],
    [6, 4, 3, 3, 4, 3, 1]),
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

/** Mobile unit sprite configs — each gets its own small spritesheet */
const MOBILE_SPRITE_CONFIGS: Record<string, MobileUnitSpriteConfig> = {
  mil_rifleman:    { sheetKey: 'mobile_mil_rifleman',  frameWidth: 32, frameHeight: 32, cols: 4 },
  mil_brawler:     { sheetKey: 'mobile_mil_brawler',   frameWidth: 32, frameHeight: 32, cols: 4 },
  mil_heavy:       { sheetKey: 'mobile_mil_heavy',     frameWidth: 32, frameHeight: 32, cols: 4 },
  mil_commander:   { sheetKey: 'mobile_mil_commander', frameWidth: 32, frameHeight: 32, cols: 4 },
  alien_swarmling: { sheetKey: 'mobile_alien_swarmling', frameWidth: 32, frameHeight: 32, cols: 4 },
  infernal_bomber: { sheetKey: 'mobile_infernal_fiend', frameWidth: 32, frameHeight: 32, cols: 4 },
};

/** Check if a tower ID has sprite art available */
export function hasTowerSprite(towerId: string): boolean {
  return towerId in TOWER_SPRITE_CONFIGS || towerId in MOBILE_SPRITE_CONFIGS;
}

/** Check if a tower is a mobile unit (needs walk-cycle rendering) */
export function isMobileTowerSprite(towerId: string): boolean {
  return towerId in MOBILE_SPRITE_CONFIGS;
}

/** Towers that should rotate to face their target — DISABLED for now */
/** Rotation looked bad (whole tower rotates, not just barrel). May revisit with directional sprites. */
const ROTATING_TOWER_PREFIXES = new Set<string>([]); // empty = no rotation
const NON_ROTATING_TOWERS = new Set<string>([]);

/** Check if a tower sprite should rotate to face targets */
export function shouldTowerRotate(towerId: string): boolean {
  if (NON_ROTATING_TOWERS.has(towerId)) return false;
  for (const prefix of ROTATING_TOWER_PREFIXES) {
    if (towerId.startsWith(prefix)) return true;
  }
  return false;
}

/** Get mobile unit sprite config */
export function getMobileSpriteConfig(towerId: string): MobileUnitSpriteConfig | undefined {
  return MOBILE_SPRITE_CONFIGS[towerId];
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

/** Map tower ID prefix to faction ID (e.g. 'arcane' → 'arcane', 'mech' → 'mechanical') */
export const TOWER_PREFIX_TO_FACTION: Record<string, FactionId> = {
  arcane:'arcane', mech:'mechanical', nature:'nature', void:'void',
  mil:'military', alien:'aliens', cyber:'cypherpunk', infernal:'infernal',
  celestial:'celestial', psi:'psionic', harmonic:'harmonic',
};

/** Get the faction ID for a tower ID */
export function getTowerFaction(towerId: string): FactionId | undefined {
  return TOWER_PREFIX_TO_FACTION[towerId.split('_')[0]];
}

/** Known skin asset suffixes per faction directory. Add entries here when new skins are created. */
const SKIN_ASSETS: Record<string, string[]> = {
  arcane: ['_corrupted'],
  mechanical: ['_gilded'],
  military: ['_desert_storm'],
  cypherpunk: ['_cyber_sakura'],
};

export function preloadSprites(scene: Phaser.Scene): void {
  for (const f of FACTION_SHEETS) {
    scene.load.spritesheet(f.towers, `assets/${f.dir}/${f.dir}_towers.png`, { frameWidth: 64, frameHeight: 64 });
    scene.load.spritesheet(f.proj, `assets/${f.dir}/${f.dir}_projectiles.png`, { frameWidth: 32, frameHeight: 32 });
    scene.load.spritesheet(f.hero, `assets/${f.dir}/${f.dir}_hero.png`, { frameWidth: 64, frameHeight: 128 });

    // Load skin variant spritesheets
    const skins = SKIN_ASSETS[f.dir] ?? [];
    for (const suffix of skins) {
      const towerKey = f.towers + suffix;
      const projKey = f.proj + suffix;
      if (!scene.textures.exists(towerKey)) {
        scene.load.spritesheet(towerKey, `assets/${f.dir}/${f.dir}_towers${suffix}.png`, { frameWidth: 64, frameHeight: 64 });
      }
      if (!scene.textures.exists(projKey)) {
        scene.load.spritesheet(projKey, `assets/${f.dir}/${f.dir}_projectiles${suffix}.png`, { frameWidth: 32, frameHeight: 32 });
      }
    }
  }

  // Mobile unit mini-spritesheets (128×128, 32×32 cells)
  for (const [towerId, cfg] of Object.entries(MOBILE_SPRITE_CONFIGS)) {
    const faction = towerId.startsWith('mil_') ? 'military'
      : towerId.startsWith('alien_') ? 'aliens'
      : towerId.startsWith('infernal_') ? 'infernal' : '';
    if (faction) {
      const name = towerId.replace(/^(mil_|alien_|infernal_)/, '');
      scene.load.spritesheet(cfg.sheetKey, `assets/${faction}/${name}_mobile.png`, {
        frameWidth: cfg.frameWidth, frameHeight: cfg.frameHeight,
      });

      // Load skinned mobile unit spritesheets
      const mobileSkins = SKIN_ASSETS[faction] ?? [];
      for (const suffix of mobileSkins) {
        const skinKey = cfg.sheetKey + suffix;
        if (!scene.textures.exists(skinKey)) {
          scene.load.spritesheet(skinKey, `assets/${faction}/${name}_mobile${suffix}.png`, {
            frameWidth: cfg.frameWidth, frameHeight: cfg.frameHeight,
          });
        }
      }
    }
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
        frameRate: 6, // slower so each frame is readable
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

  // Mobile unit walk-cycle animations
  // Sheet: 4 cols × 4 rows. Rows: 0=down, 1=right, 2=up, 3=attack
  const dirNames = ['down', 'right', 'up', 'attack'];
  for (const [towerId, cfg] of Object.entries(MOBILE_SPRITE_CONFIGS)) {
    if (!scene.textures.exists(cfg.sheetKey)) continue;
    for (let row = 0; row < 4; row++) {
      const animKey = `mobile_${towerId}_${dirNames[row]}`;
      if (scene.anims.exists(animKey)) continue;
      const frames: Phaser.Types.Animations.AnimationFrame[] = [];
      for (let col = 0; col < cfg.cols; col++) {
        frames.push({ key: cfg.sheetKey, frame: row * cfg.cols + col });
      }
      scene.anims.create({
        key: animKey,
        frames,
        frameRate: row === 3 ? 10 : 8, // attack slightly faster
        repeat: row === 3 ? 0 : -1, // attack plays once, walk/idle loop
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
  // Mobile unit — use separate mini-spritesheet (with skin resolution)
  const mobileCfg = MOBILE_SPRITE_CONFIGS[towerId];
  if (mobileCfg) {
    const mfid = getTowerFaction(towerId);
    let mobileKey = mobileCfg.sheetKey;
    if (mfid) {
      const suffix = SkinManager.getSkinSuffix(mfid, towerId);
      if (suffix) {
        const skinnedKey = mobileCfg.sheetKey + suffix;
        if (scene.textures.exists(skinnedKey)) mobileKey = skinnedKey;
      }
    }
    if (scene.textures.exists(mobileKey)) {
      const sprite = scene.add.sprite(x, y, mobileKey, 0);
      sprite.setDepth(5);
      sprite.setScale(24 / 32);
      sprite.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      const idleAnim = `mobile_${towerId}_down`;
      if (scene.anims.exists(idleAnim)) sprite.play(idleAnim);
      return sprite;
    }
  }

  // Static tower
  const config = TOWER_SPRITE_CONFIGS[towerId];
  if (!config) return null;

  // Resolve skinned sheet key (per-tower first, then faction-wide)
  const fid = getTowerFaction(towerId);
  let sheetKey = config.sheetKey;
  if (fid) {
    const skinned = SkinManager.getTowerSheetKey(fid, towerId);
    if (skinned && skinned !== sheetKey && scene.textures.exists(skinned)) {
      sheetKey = skinned;
    }
  }

  const frameIndex = config.rows.idle * config.totalCols + config.column;
  const sprite = scene.add.sprite(x, y, sheetKey, frameIndex);
  sprite.setDepth(5);

  // Scale sprite to fill ~1.3 tiles (64px sprite on 28px grid)
  const scale = (28 * 1.3) / 64;
  sprite.setScale(scale);

  // Crisp pixel rendering
  sprite.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);

  return sprite;
}

/**
 * Set tower sprite to the correct animation frame based on attack state and level.
 * For static towers only.
 * @param level — tower upgrade level (1-based). Level 1 = rows 0-3, Level 2 = rows 4-7, etc.
 */
export function setTowerSpriteState(
  sprite: Phaser.GameObjects.Sprite, towerId: string,
  state: 'idle' | 'charge' | 'fire' | 'cooldown',
  level: number = 1,
): void {
  const config = TOWER_SPRITE_CONFIGS[towerId];
  if (!config) return;
  // Clamp level to available range
  const effectiveLevel = Math.min(level, config.maxLevel);
  const levelOffset = (effectiveLevel - 1) * config.rowsPerLevel;
  const stateRow = config.rows[state];
  const frameIndex = (levelOffset + stateRow) * config.totalCols + config.column;
  sprite.setFrame(frameIndex);
}

/**
 * Update a mobile unit sprite based on movement direction and state.
 * Uses the mini-spritesheet with walk cycle animations.
 * Rows: 0=down, 1=right (flip for left), 2=up, 3=attack
 */
export function updateMobileTowerSprite(
  sprite: Phaser.GameObjects.Sprite, towerId: string,
  dx: number, dy: number, isAttacking: boolean,
): void {
  if (!(towerId in MOBILE_SPRITE_CONFIGS)) return;

  const isMoving = Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5;

  if (isAttacking) {
    const key = `mobile_${towerId}_attack`;
    if (sprite.anims.currentAnim?.key !== key) sprite.play(key);
    return;
  }

  if (isMoving) {
    // Determine direction
    let dir: string;
    sprite.setFlipX(false);

    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal movement
      dir = 'right';
      if (dx < 0) sprite.setFlipX(true); // flip right anim for left
    } else {
      dir = dy > 0 ? 'down' : 'up';
    }

    const key = `mobile_${towerId}_${dir}`;
    if (sprite.anims.currentAnim?.key !== key) sprite.play(key);
  } else {
    // Idle — show first frame of down animation
    const key = `mobile_${towerId}_down`;
    if (sprite.anims.currentAnim?.key !== key) sprite.play(key);
  }
}

/**
 * Create a projectile sprite. Returns null if no sprite available.
 */
export function createProjectileSprite(
  scene: Phaser.Scene, towerId: string, x: number, y: number,
): Phaser.GameObjects.Sprite | null {
  const config = PROJECTILE_SPRITE_CONFIGS[towerId];
  if (!config) return null;

  // Resolve skinned projectile sheet key
  const pfid = getTowerFaction(towerId);
  let projSheetKey = config.sheetKey;
  if (pfid) {
    const skinned = SkinManager.getProjectileSheetKey(pfid, towerId);
    if (skinned && skinned !== projSheetKey && scene.textures.exists(skinned)) {
      projSheetKey = skinned;
    }
  }

  const frameIndex = config.travelRows[0] * config.totalCols + config.column;
  const sprite = scene.add.sprite(x, y, projSheetKey, frameIndex);
  sprite.setDepth(15);

  // Scale projectile — larger for flame/splash towers
  // Tower-specific projectile sizes
  const isFlame = towerId.includes('flame');
  const isUltimate = towerId.includes('nova') || towerId.includes('elder') || towerId.includes('titan') ||
    towerId.includes('oblivion') || towerId.includes('apocalypse') || towerId.includes('absolution') ||
    towerId.includes('overmind') || towerId.includes('crescendo') || towerId.includes('zeroday');
  const scale = isFlame ? 38 / 32 : isUltimate ? 28 / 32 : 20 / 32;
  sprite.setScale(scale);

  // Start travel animation
  const travelKey = `proj_${towerId}_travel`;
  sprite.play(travelKey);

  return sprite;
}

/**
 * Play impact animation on a projectile sprite, then destroy it.
 */
/**
 * Play impact animation on a projectile sprite, then destroy it.
 * For large AoE (splash), scale the impact to match the AoE diameter.
 */
export function playProjectileImpact(
  sprite: Phaser.GameObjects.Sprite, towerId: string, splashRadius?: number,
  scene?: Phaser.Scene,
): void {
  const impactKey = `proj_${towerId}_impact`;

  // Ensure crisp pixel art scaling (not blurry interpolation)
  sprite.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);

  if (splashRadius && splashRadius > 40) {
    // Scale impact to match AoE diameter — NEAREST filter keeps pixels crisp
    const scale = (splashRadius * 2) / 32;
    sprite.setScale(scale);
  } else {
    sprite.setScale(26 / 32);
  }
  sprite.play(impactKey);
  sprite.once('animationcomplete', () => {
    sprite.destroy();
  });
}
