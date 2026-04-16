import { useState, useMemo } from 'preact/hooks';
import { UIBridge } from '../UIBridge';
import { ShardBadge } from '../components/ShardBadge';
import { FACTIONS, FACTION_ORDER, FactionId } from '../../data/Factions';
import { TOWER_TYPES } from '../../data/TowerTypes';
import { HERO_TYPES, HERO_ORDER, HeroTypeDef } from '../../data/HeroTypes';
import { CREEP_TYPES } from '../../data/CreepTypes';
import { getTowerIconUrl, getHeroIconUrl } from '../game/TowerIconRenderer';

type Tab = 'factions' | 'towers' | 'creeps' | 'heroes';

function hexColor(n: number): string {
  return '#' + n.toString(16).padStart(6, '0');
}

/** Human-readable labels for common trait ids */
function traitLabel(trait: { id: string;[k: string]: unknown }): string | null {
  switch (trait.id) {
    case 'direct_damage': return null; // too generic to show
    case 'splash_damage': return `Splash (${trait.radius}px)`;
    case 'slow_on_hit': return `Slow ${Math.round((1 - (trait.factor as number)) * 100)}%`;
    case 'crit_chance': return `${Math.round((trait.chance as number) * 100)}% Crit x${trait.multiplier}`;
    case 'burn_dot': return `Burn ${trait.dps} dps`;
    case 'poison_dot': return `Poison ${Math.round((trait.percentPerSec as number) * 100)}%/s`;
    case 'chain_damage': return `Chain x${trait.chainCount}`;
    case 'pierce_delivery': return 'Pierce';
    case 'teleport_delivery': return 'Teleport';
    case 'root_on_hit': return `${Math.round((trait.chance as number) * 100)}% Root`;
    case 'strip_shield': return 'Shield Break';
    case 'armor_shred_on_hit': return 'Armor Shred';
    case 'gold_on_hit': return `+${trait.amount}g/hit`;
    case 'jackpot': return 'Jackpot';
    case 'damage_variance': return 'Variable Dmg';
    case 'ramp_up': return `Ramp x${trait.maxStacks}`;
    case 'adjacency_buff': return 'Adj. Buff';
    case 'tower_aura_damage': return 'Aura Dmg';
    case 'faction_speed_aura': return `+${Math.round((trait.ratePercent as number) * 100)}% AS Aura`;
    case 'mobile_unit': return 'Mobile';
    case 'barbed_wire': return 'Barbed Wire';
    case 'firewall_link': return 'Link Beam';
    case 'spawn_swarmlings_per_wave': return `Spawn ${trait.count}/wave`;
    case 'commander_aura': return 'Commander Aura';
    case 'self_buff': return 'Self Buff';
    case 'flat_heal_aura': return 'Heal Aura';
    default: return trait.id.replace(/_/g, ' ');
  }
}

/** Small tower sprite icon */
function TowerIcon({ towerId, size = 28 }: { towerId: string; size?: number }) {
  const url = useMemo(() => getTowerIconUrl(towerId), [towerId]);
  if (!url) return null;
  return <img src={url} width={size} height={size} style={{ imageRendering: 'pixelated' as any, verticalAlign: 'middle' }} />;
}

/** Hero sprite portrait */
function HeroPortrait({ heroId, height = 64 }: { heroId: string; height?: number }) {
  const url = useMemo(() => getHeroIconUrl(heroId), [heroId]);
  if (!url) return null;
  return <img src={url} height={height} style={{ imageRendering: 'pixelated' as any, objectFit: 'contain' }} />;
}

// ---------------------------------------------------------------------------
// Factions Tab
// ---------------------------------------------------------------------------

function FactionsTab() {
  return (
    <div class="ui-section">
      <div class="ui-section-title">All Factions</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {FACTION_ORDER.filter(fId => fId !== 'random').map(fId => {
          const faction = FACTIONS[fId];
          const towers = faction.towerIds
            .map(tId => TOWER_TYPES[tId])
            .filter(Boolean);
          return (
            <div key={fId} class="card" style={{ padding: '14px' }}>
              <div class="card-accent" style={{ background: hexColor(faction.primaryColor) }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', marginTop: '2px' }}>
                <div class="card-name" style={{ margin: 0 }}>{faction.name}</div>
              </div>
              <div class="card-desc" style={{ marginBottom: '10px' }}>{faction.description}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {towers.map(t => (
                  <div key={t.id} style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    background: 'rgba(20,20,36,0.6)', borderRadius: '4px', padding: '3px 7px',
                    fontSize: '12px',
                  }}>
                    <TowerIcon towerId={t.id} size={22} />
                    <span style={{ color: 'var(--text-secondary)' }}>{t.name}</span>
                    <span style={{ color: 'var(--gold)', fontFamily: "'VT323', monospace" }}>{t.cost}g</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Towers Tab
// ---------------------------------------------------------------------------

function TowersTab() {
  const factionIds = FACTION_ORDER.filter(fId => fId !== 'random');
  return (
    <div>
      {factionIds.map(fId => {
        const faction = FACTIONS[fId];
        const towers = faction.towerIds
          .map(tId => TOWER_TYPES[tId])
          .filter(Boolean);
        if (towers.length === 0) return null;
        return (
          <div key={fId} class="ui-section">
            <div
              class="ui-section-title"
              style={{ color: hexColor(faction.primaryColor) }}
            >
              {faction.name}
            </div>
            <div class="card-grid">
              {towers.map(tower => {
                const traits = tower.traits
                  .map(t => traitLabel(t as { id: string;[k: string]: unknown }))
                  .filter(Boolean);
                return (
                  <div key={tower.id} class="card">
                    <div
                      class="card-accent"
                      style={{ background: hexColor(faction.primaryColor) }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <TowerIcon towerId={tower.id} size={32} />
                      <div>
                        <div class="card-name" style={{ margin: 0 }}>
                          {tower.name}
                          {tower.ultimate && (
                            <span style={{ color: 'var(--gold)', marginLeft: '6px', fontSize: '10px' }}>
                              ULT
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div class="card-desc">{tower.description}</div>
                    <div class="text-dim text-xs mt-2" style={{ lineHeight: '1.6' }}>
                      <span style={{ color: 'var(--gold)' }}>{tower.cost}g</span>
                      {' \u00b7 '}
                      {tower.damage} dmg
                      {' \u00b7 '}
                      {tower.range} range
                      {' \u00b7 '}
                      {(tower.fireRate / 1000).toFixed(1)}s
                    </div>
                    {traits.length > 0 && (
                      <div class="text-xs mt-2" style={{ color: 'var(--rarity-rare)' }}>
                        {traits.join(' \u00b7 ')}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Creeps Tab
// ---------------------------------------------------------------------------

function CreepsTab() {
  const creepIds = Object.keys(CREEP_TYPES).filter(
    id => id !== 'splitter_child' // internal sub-type
  );
  return (
    <div class="ui-section">
      <div class="ui-section-title">Creep Types</div>
      {creepIds.map(id => {
        const creep = CREEP_TYPES[id];
        const tags: string[] = [];
        if (creep.armor === 'heavy') tags.push('Heavy Armor');
        else if (creep.armor === 'light') tags.push('Light Armor');
        if (creep.spawnBehavior === 'flying') tags.push('Flying');
        if (creep.spawnBehavior === 'group') tags.push('Group Spawn');
        if (creep.count > 1) tags.push(`x${creep.count} per unit`);
        creep.traits.forEach(t => {
          switch (t.id) {
            case 'shield': tags.push('Shield'); break;
            case 'heal_aura': tags.push('Heal Aura'); break;
            case 'split_on_death': tags.push('Splits on Death'); break;
            case 'armor_aura': tags.push('Armor Aura'); break;
            case 'speed_aura': tags.push('Speed Aura'); break;
            case 'evasion_aura': tags.push('Evasion Aura'); break;
            case 'flat_heal_aura': tags.push('Heal Aura'); break;
            case 'damage_cap_shield': tags.push('Damage Cap Shield'); break;
            case 'evasion': tags.push(`${Math.round(((t as { chance?: number }).chance ?? 0) * 100)}% Evasion`); break;
            case 'regeneration': tags.push('Regen'); break;
          }
        });
        return (
          <div key={id} class="faction-row">
            <div
              class="faction-color-strip"
              style={{ background: hexColor(creep.color) }}
            />
            <div class="faction-info" style={{ flex: 1 }}>
              <div class="faction-name">{creep.name}</div>
              <div class="faction-desc">{creep.description}</div>
              <div class="text-dim text-xs mt-2" style={{ lineHeight: '1.6' }}>
                HP x{creep.hpMultiplier}
                {' \u00b7 '}
                Speed x{creep.speedMultiplier}
                {' \u00b7 '}
                {creep.armor} armor
                {' \u00b7 '}
                Size {creep.size}
              </div>
              {tags.length > 0 && (
                <div class="text-xs mt-2" style={{ color: 'var(--gold)' }}>
                  {tags.join(' \u00b7 ')}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Heroes Tab
// ---------------------------------------------------------------------------

function HeroCard({ hero }: { hero: HeroTypeDef }) {
  const faction = FACTIONS[hero.faction as FactionId];
  const fColor = faction ? hexColor(faction.primaryColor) : '#888';
  return (
    <div class="card" style={{ padding: '16px' }}>
      <div class="card-accent" style={{ background: fColor }} />
      {/* Header: portrait + name/faction/stats */}
      <div style={{ display: 'flex', gap: '14px', marginBottom: '10px', marginTop: '2px' }}>
        <div style={{
          flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(20,20,36,0.6)', borderRadius: '8px', padding: '6px',
          border: `1px solid ${fColor}33`,
        }}>
          <HeroPortrait heroId={hero.id} height={72} />
        </div>
        <div style={{ flex: 1 }}>
          <div class="card-name" style={{ margin: 0, fontSize: '20px' }}>{hero.name}</div>
          <div style={{ color: fColor, fontSize: '13px', marginBottom: '4px' }}>
            {faction?.name ?? hero.faction}
          </div>
          <div class="card-desc" style={{ fontSize: '13px' }}>{hero.description}</div>
        </div>
      </div>
      {/* Stats row */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px',
      }}>
        {[
          { label: 'HP', value: hero.hp, color: 'var(--jewel-red)' },
          { label: 'DMG', value: hero.damage, color: 'var(--gold)' },
          { label: 'SPD', value: hero.attackSpeed + '/s', color: 'var(--text-secondary)' },
          { label: 'RNG', value: hero.attackRange + 'px', color: 'var(--text-secondary)' },
          { label: 'MOVE', value: hero.moveSpeed + 'px/s', color: 'var(--text-secondary)' },
          ...(hero.baseArmor ? [{ label: 'ARM', value: hero.baseArmor, color: 'var(--text-secondary)' }] : []),
        ].map(s => (
          <div key={s.label} style={{
            background: 'rgba(20,20,36,0.6)', borderRadius: '4px', padding: '3px 8px',
            fontSize: '12px', fontFamily: "'VT323', monospace",
          }}>
            <span style={{ color: 'var(--text-muted)', marginRight: '3px' }}>{s.label}</span>
            <span style={{ color: s.color }}>{s.value}</span>
          </div>
        ))}
      </div>
      {/* Abilities */}
      <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '8px' }}>
        {hero.abilities.map(a => (
          <div key={a.key} style={{ marginBottom: '6px', lineHeight: '1.5', fontSize: '13px' }}>
            <span style={{ color: 'var(--gold)', fontWeight: 'bold' }}>[{a.key}]</span>{' '}
            <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{a.name}</span>
            {' \u2014 '}
            <span style={{ color: 'var(--text-secondary)' }}>{a.description}</span>
            {' '}
            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>({a.cooldown}s)</span>
          </div>
        ))}
        {hero.ultimate && (
          <div style={{ marginTop: '4px', lineHeight: '1.5', fontSize: '13px' }}>
            <span style={{ color: 'var(--jewel-red)', fontWeight: 'bold' }}>[{hero.ultimate.key}]</span>{' '}
            <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{hero.ultimate.name}</span>
            {' \u2014 '}
            <span style={{ color: 'var(--text-secondary)' }}>{hero.ultimate.description}</span>
            {' '}
            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>({hero.ultimate.cooldown}s)</span>
          </div>
        )}
      </div>
    </div>
  );
}

function HeroesTab() {
  return (
    <div class="ui-section">
      <div class="ui-section-title">Heroes</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {HERO_ORDER.map(hId => {
          const hero = HERO_TYPES[hId];
          return <HeroCard key={hId} hero={hero} />;
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export function EncyclopediaScreen() {
  const [tab, setTab] = useState<Tab>('factions');
  const tabs: Tab[] = ['factions', 'towers', 'creeps', 'heroes'];

  return (
    <>
      <div class="ui-header" style={{ flexWrap: 'wrap', gap: '6px' }}>
        <button class="ui-header-back" onClick={() => UIBridge.show('menu')}>
          {'< Back'}
        </button>
        <div class="ui-header-title">ENCYCLOPEDIA</div>
        <ShardBadge />
      </div>
      <div class="tab-bar">
        {tabs.map(t => (
          <button
            key={t}
            class={`tab ${tab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      {tab === 'factions' && <FactionsTab />}
      {tab === 'towers' && <TowersTab />}
      {tab === 'creeps' && <CreepsTab />}
      {tab === 'heroes' && <HeroesTab />}
    </>
  );
}
