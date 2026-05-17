/**
 * Texture-key constants + preload for the Mech-campaign procedural
 * sprites (mech_campaign_sprites.tsx output). Loaded once at
 * GameScene.preload via `preloadMechCampaignAssets(scene)`. Idempotent
 * — each texture is checked before loading so the helper can be
 * called multiple times safely.
 *
 * Sprite sheets are all single-column N-frame layouts. Frame counts
 * + tile dimensions match the WORKSHOP_DIMS / SUPPRESSION_PYLON_DIMS
 * / etc constants exported from mech_campaign_sprites.tsx.
 */

import * as Phaser from 'phaser';

export const WORKSHOP_TEXTURE          = 'struct_workshop';
export const SUPPRESSION_PYLON_TEXTURE = 'struct_suppression_pylon';
export const GENERATOR_TEXTURE         = 'struct_generator';
export const RAIDER_TEXTURE            = 'raider';
export const VOSS_THRONE_TEXTURE       = 'struct_voss_throne';

/** Frame indices for the Suppression Pylon sheet. The first 4 are
 *  the active-pulse loop; the next 2 are channeling; the last 2 are
 *  muted. Consumer picks one based on pylon state + now-time. */
export const PYLON_FRAMES = {
  ACTIVE_LOOP: [0, 1, 2, 3],
  CHANNELING:  [4, 5],
  MUTED:       [6, 7],
} as const;

/** Sheet frame-index for a [0, 1] HP ratio. Generator has 4 damage
 *  tiers (100/66/33/0%); Throne has 5 (100/75/50/25/0%). */
export function generatorFrameForHp(ratio: number): number {
  const r = Math.max(0, Math.min(1, ratio));
  if (r > 0.66) return 0;
  if (r > 0.33) return 1;
  if (r > 0)    return 2;
  return 3;
}
export function thronePristineFrame(): number { return 0; }
export function throneFrameForHp(ratio: number): number {
  const r = Math.max(0, Math.min(1, ratio));
  if (r > 0.75) return 1;
  if (r > 0.50) return 2;
  if (r > 0)    return 3;
  return 4;
}

export function preloadMechCampaignAssets(scene: Phaser.Scene): void {
  if (!scene.textures.exists(WORKSHOP_TEXTURE)) {
    scene.load.image(WORKSHOP_TEXTURE, 'assets/arena/struct_workshop.png');
  }
  if (!scene.textures.exists(SUPPRESSION_PYLON_TEXTURE)) {
    scene.load.spritesheet(
      SUPPRESSION_PYLON_TEXTURE,
      'assets/arena/struct_suppression_pylon.png',
      { frameWidth: 32, frameHeight: 32 },
    );
  }
  if (!scene.textures.exists(GENERATOR_TEXTURE)) {
    scene.load.spritesheet(
      GENERATOR_TEXTURE,
      'assets/arena/struct_generator.png',
      { frameWidth: 32, frameHeight: 32 },
    );
  }
  if (!scene.textures.exists(RAIDER_TEXTURE)) {
    scene.load.spritesheet(
      RAIDER_TEXTURE,
      'assets/arena/raider.png',
      { frameWidth: 32, frameHeight: 32 },
    );
  }
  if (!scene.textures.exists(VOSS_THRONE_TEXTURE)) {
    scene.load.spritesheet(
      VOSS_THRONE_TEXTURE,
      'assets/arena/struct_voss_throne.png',
      { frameWidth: 32, frameHeight: 32 },
    );
  }
}
