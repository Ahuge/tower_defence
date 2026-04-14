/**
 * PlayerInventory — tracks owned items, equipped cosmetics, and faction unlocks.
 * Singleton. All ownership checks and equip/unequip go through here.
 */
import { FactionId } from '../../data/Factions';
import { HeroId } from '../../data/HeroTypes';
import { StorePersistence } from './StorePersistence';
import { ShardWallet } from './ShardWallet';
import {
  SkinDef,
  getSkinDef,
  getRollableSkins,
  FREE_FACTIONS,
  PREMIUM_FACTIONS,
  FACTION_UNLOCK_COST,
  TERRAIN_THEMES,
  SKIN_ROLL_COST,
  DUPLICATE_REFUND,
  ROLL_WEIGHTS,
  Rarity,
} from './StoreDefinitions';

type InventoryListener = (event: string, detail?: unknown) => void;

class PlayerInventoryClass {
  private listeners: InventoryListener[] = [];

  ownsFaction(factionId: FactionId): boolean {
    if (factionId === 'random') return true;
    if ((FREE_FACTIONS as string[]).includes(factionId)) return true;
    return StorePersistence.load().unlockedFactions.includes(factionId);
  }

  getOwnedFactions(): FactionId[] {
    const unlocked = StorePersistence.load().unlockedFactions;
    return [...FREE_FACTIONS, ...PREMIUM_FACTIONS.filter(f => unlocked.includes(f))];
  }

  unlockFaction(factionId: FactionId): boolean {
    if (this.ownsFaction(factionId)) return true;
    if (!(PREMIUM_FACTIONS as string[]).includes(factionId)) return false;
    if (!ShardWallet.spend(FACTION_UNLOCK_COST, `Unlock faction: ${factionId}`)) return false;
    StorePersistence.update(s => {
      if (!s.unlockedFactions.includes(factionId)) s.unlockedFactions.push(factionId);
    });
    this.notify('faction_unlocked', factionId);
    return true;
  }

  ownsSkin(skinId: string): boolean {
    return StorePersistence.load().ownedSkins.includes(skinId);
  }

  getOwnedSkins(): string[] {
    return StorePersistence.load().ownedSkins;
  }

  purchaseSkin(skinId: string): boolean {
    if (this.ownsSkin(skinId)) return true;
    const def = getSkinDef(skinId);
    if (!def || def.shardCost <= 0) return false;
    if (!ShardWallet.spend(def.shardCost, `Buy skin: ${def.name}`)) return false;
    StorePersistence.update(s => {
      if (!s.ownedSkins.includes(skinId)) s.ownedSkins.push(skinId);
    });
    this.notify('skin_purchased', skinId);
    return true;
  }

  grantSkin(skinId: string): void {
    if (this.ownsSkin(skinId)) return;
    StorePersistence.update(s => {
      if (!s.ownedSkins.includes(skinId)) s.ownedSkins.push(skinId);
    });
    this.notify('skin_granted', skinId);
  }

  rollSkin(): { skin: SkinDef; isDuplicate: boolean } | null {
    if (!ShardWallet.spend(SKIN_ROLL_COST, 'Skin roll')) return null;
    const pool = getRollableSkins(this.getOwnedFactions());
    if (pool.length === 0) return null;
    const rarity = this.rollRarity();
    const raritySkins = pool.filter(s => s.rarity === rarity);
    const candidates = raritySkins.length > 0 ? raritySkins : pool;
    const skin = candidates[Math.floor(Math.random() * candidates.length)];
    const isDuplicate = this.ownsSkin(skin.id);
    if (isDuplicate) {
      ShardWallet.earn(DUPLICATE_REFUND, `Duplicate skin refund: ${skin.name}`);
    } else {
      StorePersistence.update(s => { s.ownedSkins.push(skin.id); });
    }
    this.notify('skin_rolled', { skin, isDuplicate });
    return { skin, isDuplicate };
  }

  private rollRarity(): Rarity {
    const roll = Math.random() * 100;
    let cumulative = 0;
    for (const [rarity, weight] of Object.entries(ROLL_WEIGHTS) as [Rarity, number][]) {
      cumulative += weight;
      if (roll < cumulative) return rarity;
    }
    return 'common';
  }

  equipSkin(skinId: string): boolean {
    if (!this.ownsSkin(skinId)) return false;
    const def = getSkinDef(skinId);
    if (!def) return false;
    const slotKey = this.getSlotKey(def);
    if (!slotKey) return false;
    StorePersistence.update(s => { s.equippedSkins[slotKey] = skinId; });
    this.notify('skin_equipped', { skinId, slot: slotKey });
    return true;
  }

  unequipSkin(skinId: string): void {
    const def = getSkinDef(skinId);
    if (!def) return;
    const slotKey = this.getSlotKey(def);
    if (!slotKey) return;
    StorePersistence.update(s => {
      if (s.equippedSkins[slotKey] === skinId) delete s.equippedSkins[slotKey];
    });
    this.notify('skin_unequipped', { skinId, slot: slotKey });
  }

  getEquippedSkin(slotKey: string): string | null {
    return StorePersistence.load().equippedSkins[slotKey] ?? null;
  }

  getEquippedSkins(): Record<string, string> {
    return { ...StorePersistence.load().equippedSkins };
  }

  private getSlotKey(def: SkinDef): string | null {
    switch (def.target) {
      case 'tower_faction':  return def.faction ? `tower:${def.faction}` : null;
      case 'tower':          return def.faction ? `tower:${def.faction}` : null;
      case 'creep_faction':  return def.faction ? `creep:${def.faction}` : null;
      case 'hero':           return def.heroId ? `hero:${def.heroId}` : null;
      case 'terrain':        return 'terrain';
      default:               return null;
    }
  }

  ownsTerrainTheme(themeId: string): boolean {
    return StorePersistence.load().unlockedTerrains.includes(themeId);
  }

  unlockTerrainTheme(themeId: string): boolean {
    if (this.ownsTerrainTheme(themeId)) return true;
    const theme = TERRAIN_THEMES.find(t => t.id === themeId);
    if (!theme) return false;
    if (!ShardWallet.spend(theme.shardCost, `Unlock terrain: ${theme.name}`)) return false;
    StorePersistence.update(s => {
      if (!s.unlockedTerrains.includes(themeId)) s.unlockedTerrains.push(themeId);
    });
    this.notify('terrain_unlocked', themeId);
    return true;
  }

  equipTerrain(themeId: string): void {
    StorePersistence.update(s => { s.equippedTerrain = themeId; });
    this.notify('terrain_equipped', themeId);
  }

  unequipTerrain(): void {
    StorePersistence.update(s => { s.equippedTerrain = null; });
    this.notify('terrain_unequipped');
  }

  getEquippedTerrain(): string | null {
    return StorePersistence.load().equippedTerrain;
  }

  isAdFree(): boolean {
    return StorePersistence.load().adFree;
  }

  setAdFree(): void {
    StorePersistence.update(s => { s.adFree = true; });
    this.notify('ad_free_purchased');
  }

  recordGamePlayed(won: boolean): void {
    StorePersistence.update(s => {
      s.gamesPlayed++;
      if (won) s.gamesWon++;
    });
  }

  getStats(): { gamesPlayed: number; gamesWon: number } {
    const s = StorePersistence.load();
    return { gamesPlayed: s.gamesPlayed, gamesWon: s.gamesWon };
  }

  onChange(listener: InventoryListener): void { this.listeners.push(listener); }
  offChange(listener: InventoryListener): void {
    const idx = this.listeners.indexOf(listener);
    if (idx >= 0) this.listeners.splice(idx, 1);
  }

  private notify(event: string, detail?: unknown): void {
    for (const fn of this.listeners) fn(event, detail);
  }
}

export const PlayerInventory = new PlayerInventoryClass();
