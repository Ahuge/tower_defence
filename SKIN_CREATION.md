# Skin Creation Guide

How to create, publish, and ship a new tower skin from the skin editor to the in-game store.

## Prerequisites

- Dev server running (`npm run dev`)
- Skin editor open at `/skin-editor.html`

## Step 1: Create the Skin

1. Open the skin editor at `http://localhost:5173/tower_defence/skin-editor.html`
2. Pick a faction
3. Edit colors:
   - **"All" tab** → edits shared base/pedestal colors across all towers
   - **Per-tower tabs** → edit colors for a specific tower only
   - **Click any pixel** on the canvas to eyedropper-pick its color
   - **PEDESTAL / BASE** section = colors only used by the pedestal (safe to change without affecting tower bodies)
   - **Tower-unique** section = colors specific to the selected tower
4. Name your skin in the text field
5. Click **Export Skin** → downloads 3 files:
   - `<faction>_towers_<suffix>.png` — tower spritesheet
   - `<faction>_projectiles_<suffix>.png` — projectile spritesheet
   - `<faction>_skin_<suffix>.json` — palette data (for re-importing later)

## Step 2: Place the Assets

Copy the exported PNGs into the public assets directory:

```bash
cp <faction>_towers_<suffix>.png     public/assets/<faction>/<faction>_towers_<suffix>.png
cp <faction>_projectiles_<suffix>.png public/assets/<faction>/<faction>_projectiles_<suffix>.png
```

**Directory mapping:**
| Faction    | Directory    |
|------------|-------------|
| Arcane     | `arcane`     |
| Mechanical | `mechanical` |
| Nature     | `nature`     |
| Void       | `void`       |
| Military   | `military`   |
| Aliens     | `aliens`     |
| Cypherpunk | `cypherpunk` |
| Infernal   | `infernal`   |
| Celestial  | `celestial`  |
| Psionic    | `psionic`    |
| Harmonic   | `harmonic`   |

## Step 3: Register the Skin Asset

In `src/systems/SpriteManager.ts`, add the suffix to the `SKIN_ASSETS` registry:

```typescript
const SKIN_ASSETS: Record<string, string[]> = {
  arcane: ['_corrupted'],       // ← add your suffix here
  mechanical: ['_gilded'],      // example
};
```

This tells the game to preload the skin spritesheet during scene initialization.

## Step 4: Add the Store Definition

In `src/systems/monetization/StoreDefinitions.ts`, add a `SkinDef` entry to the `SKIN_DEFS` array:

```typescript
// Faction-wide skin (direct purchase in Store > Skins tab)
{
  id: 'arcane_pack_corrupted',
  name: 'Corrupted Arcane Pack',
  description: 'All Arcane towers — green corruption theme',
  rarity: 'epic',
  target: 'tower_faction',
  faction: 'arcane',
  shardCost: 1200,          // 0 = not directly purchasable (roll/pass only)
  assetSuffix: '_corrupted',
},
```

**Skin types:**
- `tower_faction` — reskins all towers + projectiles for a faction (direct purchase)
- `tower` — reskins a single tower (used in roll system, auto-generated)
- `hero` — reskins a hero
- Set `exclusive: true` for battle-pass-only or seasonal skins
- Set `shardCost: 0` for skins that can only be obtained through rolls or rewards

## Step 5: Verify

1. Start the game → go to **Store > Skins** tab
2. The skin should appear with its name, rarity badge, and shard cost
3. Buy or grant yourself shards (localStorage: edit `td_store` key)
4. Purchase the skin → go to **Inventory**
5. Equip the skin → play a game with that faction
6. Towers and projectiles should use the skinned spritesheet

## How It Works Under the Hood

```
Player equips skin → PlayerInventory stores equippedSkins['tower:arcane'] = 'arcane_pack_corrupted'
                   → SkinManager.getTowerSheetKey('arcane') returns 'arcane_towers_corrupted'
                   → SpriteManager.createTowerSprite() uses 'arcane_towers_corrupted' texture
                   → Phaser renders from the skinned spritesheet PNG
```

The frame indices stay the same between base and skinned sheets (same grid layout). Only the texture key changes.

## Re-editing a Skin

1. Open the skin editor
2. Click **Import Palette** → load the `_skin_<suffix>.json` file
3. Edit colors → re-export
4. Replace the PNGs in `public/assets/<faction>/`
5. Refresh the game

## Split Palette Convention (Arcane only, for now)

Arcane's sprite generator exports three palette objects:
- `C_base` — pedestal/base colors (9 colors)
- `C_tower` — tower body colors (26 colors)
- `C_proj` — projectile colors (20 colors)

The skin editor uses these to precisely separate base editing from tower editing. Other factions fall back to pixel-region detection (labeled "estimated" in the editor). To add precise palette splitting to another faction, follow the pattern in `arcane_sprites.tsx`.

## File Reference

| File | Purpose |
|------|---------|
| `skin-editor.html` | Skin editor entry point |
| `src/skin-editor/SkinEditorApp.tsx` | Editor UI + rendering logic |
| `src/skin-editor/ColorProxyContext.ts` | Canvas color interception proxy |
| `src/systems/SpriteManager.ts` | `SKIN_ASSETS` registry + skin-aware sprite creation |
| `src/systems/monetization/SkinManager.ts` | Resolves equipped skins to texture keys |
| `src/systems/monetization/StoreDefinitions.ts` | Skin catalog + pricing |
| `src/systems/monetization/PlayerInventory.ts` | Owns/equips/rolls skins |
| `public/assets/<faction>/` | Spritesheet PNGs (base + skin variants) |
