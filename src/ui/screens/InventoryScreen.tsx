import { useState } from 'preact/hooks';
import { UIBridge } from '../UIBridge';
import { ShardBadge } from '../components/ShardBadge';
import {
  PlayerInventory, SkinDef, SKIN_DEFS, RARITY_COLORS, RARITY_LABELS,
  getSkinDef, Rarity,
} from '../../systems/monetization';
import { FACTIONS, FACTION_ORDER, FactionId } from '../../data/Factions';
import { TOWER_TYPES } from '../../data/TowerTypes';

function hexColor(n: number): string { return '#' + n.toString(16).padStart(6, '0'); }

type FilterMode = 'all' | 'tower' | 'hero' | 'creep';

export function InventoryScreen() {
  const [filter, setFilter] = useState<FilterMode>('all');
  const [, setTick] = useState(0);
  const rerender = () => setTick(t => t + 1);

  const ownedIds = PlayerInventory.getOwnedSkins();
  const equipped = PlayerInventory.getEquippedSkins();
  const ownedSkins = ownedIds.map(id => getSkinDef(id)).filter((s): s is SkinDef => !!s);

  const filtered = filter === 'all' ? ownedSkins
    : filter === 'tower' ? ownedSkins.filter(s => s.target === 'tower' || s.target === 'tower_faction')
    : filter === 'hero' ? ownedSkins.filter(s => s.target === 'hero')
    : ownedSkins.filter(s => s.target === 'creep_faction');

  // Group by faction for tower skins
  const factionGroups = new Map<string, SkinDef[]>();
  for (const skin of filtered) {
    const key = skin.faction ?? skin.heroId ?? 'other';
    if (!factionGroups.has(key)) factionGroups.set(key, []);
    factionGroups.get(key)!.push(skin);
  }

  const getSlotKey = (skin: SkinDef): string | null => {
    if ((skin.target === 'tower_faction' || skin.target === 'tower') && skin.faction) return `tower:${skin.faction}`;
    if (skin.target === 'creep_faction' && skin.faction) return `creep:${skin.faction}`;
    if (skin.target === 'hero' && skin.heroId) return `hero:${skin.heroId}`;
    return null;
  };

  const isEquipped = (skin: SkinDef): boolean => {
    const slot = getSlotKey(skin);
    return slot ? equipped[slot] === skin.id : false;
  };

  const toggleEquip = (skin: SkinDef) => {
    if (isEquipped(skin)) {
      PlayerInventory.unequipSkin(skin.id);
    } else {
      PlayerInventory.equipSkin(skin.id);
    }
    rerender();
  };

  return (
    <>
      <div class="ui-header">
        <button class="ui-header-back" onClick={() => UIBridge.show('menu')}>{'< Back'}</button>
        <div class="ui-header-title">INVENTORY</div>
        <ShardBadge />
      </div>

      {/* Filter tabs */}
      <div class="tab-bar">
        {([['all', 'All'], ['tower', 'Towers'], ['hero', 'Heroes'], ['creep', 'Creeps']] as [FilterMode, string][]).map(([id, label]) => (
          <button key={id} class={`tab ${filter === id ? 'active' : ''}`} onClick={() => setFilter(id)}>
            {label} {id === 'all' ? `(${ownedSkins.length})` : ''}
          </button>
        ))}
      </div>

      <div class="ui-section">
        {ownedSkins.length === 0 ? (
          <div class="text-center" style={{ padding: '40px 0' }}>
            <div class="text-dim" style={{ fontSize: '14px' }}>No skins yet</div>
            <div class="text-dim text-sm mt-2">Roll for skins in the Store or earn them through the Battle Pass</div>
            <button class="btn btn-gold mt-4" onClick={() => UIBridge.show('store')}>Open Store</button>
          </div>
        ) : filtered.length === 0 ? (
          <div class="text-dim text-center" style={{ padding: '20px 0' }}>No skins in this category</div>
        ) : (
          Array.from(factionGroups.entries()).map(([groupKey, skins]) => {
            const faction = FACTIONS[groupKey as FactionId];
            const groupLabel = faction?.name ?? groupKey;
            const groupColor = faction ? hexColor(faction.primaryColor) : '#888';

            return (
              <div key={groupKey} style={{ marginBottom: '16px' }}>
                {/* Group header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <div style={{ width: '4px', height: '16px', background: groupColor, borderRadius: '2px' }} />
                  <div style={{ fontSize: '12px', color: groupColor, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    {groupLabel}
                  </div>
                  <div class="text-dim text-xs">{skins.length} skin{skins.length !== 1 ? 's' : ''}</div>
                </div>

                {/* Skin cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '6px' }}>
                  {skins.map(skin => {
                    const eq = isEquipped(skin);
                    const rc = RARITY_COLORS[skin.rarity];
                    const towerName = skin.towerId ? (TOWER_TYPES[skin.towerId]?.name ?? skin.towerId) : null;

                    return (
                      <div
                        key={skin.id}
                        class={`card ${eq ? 'owned' : ''}`}
                        style={{
                          cursor: 'pointer',
                          borderColor: eq ? hexColor(rc) : undefined,
                          borderWidth: eq ? '2px' : undefined,
                        }}
                        onClick={() => toggleEquip(skin)}
                      >
                        <div class="card-accent" style={{ background: hexColor(rc) }} />

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '4px' }}>
                          <div>
                            <div class="card-name">{skin.name}</div>
                            {towerName && <div class="text-dim text-xs">{towerName}</div>}
                          </div>
                          <span class={`rarity-${skin.rarity}`} style={{ fontSize: '9px', fontWeight: 'bold' }}>
                            {RARITY_LABELS[skin.rarity]}
                          </span>
                        </div>

                        <div class="card-desc" style={{ marginTop: '4px' }}>{skin.description}</div>

                        <div style={{ marginTop: '8px', fontSize: '11px' }}>
                          {eq ? (
                            <span style={{ color: 'var(--accent-green)', fontWeight: 'bold' }}>EQUIPPED — tap to remove</span>
                          ) : (
                            <span class="text-dim">Tap to equip</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}

        {/* Currently equipped summary */}
        {Object.keys(equipped).length > 0 && (
          <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-dim)', paddingTop: '16px' }}>
            <div class="ui-section-title">Currently Equipped</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {Object.entries(equipped).map(([slot, skinId]) => {
                const skin = getSkinDef(skinId);
                if (!skin) return null;
                const rc = RARITY_COLORS[skin.rarity];
                return (
                  <div key={slot} style={{
                    background: 'var(--bg-card)', border: `1px solid ${hexColor(rc)}`,
                    borderRadius: '6px', padding: '6px 10px', fontSize: '11px',
                  }}>
                    <div style={{ color: '#999', fontSize: '9px' }}>{slot}</div>
                    <div style={{ color: hexColor(rc) }}>{skin.name}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
