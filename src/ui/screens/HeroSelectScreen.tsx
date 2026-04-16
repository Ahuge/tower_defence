import { useState, useMemo } from 'preact/hooks';
import { UIBridge } from '../UIBridge';
import { ShardBadge } from '../components/ShardBadge';
import { HeroId, HERO_ORDER, HERO_TYPES, HeroTypeDef, getHeroForFaction } from '../../data/HeroTypes';
import { FACTIONS, FactionId } from '../../data/Factions';
import { PlayerInventory } from '../../systems/monetization';

function hexColor(n: number): string { return '#' + n.toString(16).padStart(6, '0'); }

function pickRandom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

interface Props { data: Record<string, unknown>; }

export function HeroSelectScreen({ data }: Props) {
  const faction = data.faction as FactionId | null;

  const offered = useMemo(() => {
    const ownedFactions = PlayerInventory.getOwnedFactions();
    const ownedHeroes = HERO_ORDER.filter(h => ownedFactions.includes(HERO_TYPES[h].faction as FactionId));
    const factionHero = faction && faction !== 'random' ? getHeroForFaction(faction) : null;

    if (factionHero) {
      const others = ownedHeroes.filter(h => h !== factionHero);
      return [factionHero, ...pickRandom(others, 2)];
    }
    return pickRandom(ownedHeroes, 3);
  }, []);

  const [rerollCount, setRerollCount] = useState(0);
  const [heroes, setHeroes] = useState(offered);

  const reroll = () => {
    const ownedFactions = PlayerInventory.getOwnedFactions();
    const ownedHeroes = HERO_ORDER.filter(h => ownedFactions.includes(HERO_TYPES[h].faction as FactionId));
    const factionHero = faction && faction !== 'random' ? getHeroForFaction(faction) : null;
    if (factionHero) {
      const others = ownedHeroes.filter(h => h !== factionHero);
      setHeroes([factionHero, ...pickRandom(others, 2)]);
    } else {
      setHeroes(pickRandom(ownedHeroes, 3));
    }
    setRerollCount(r => r + 1);
  };

  const selectHero = (heroId: HeroId) => {
    // CreepFactionSelect is next, then Draft
    UIBridge.show('creepfactionselect', { ...data, heroId });
  };

  const factionHeroId = faction && faction !== 'random' ? getHeroForFaction(faction) : null;

  return (
    <>
      <div class="ui-header">
        <button class="ui-header-back" onClick={() => UIBridge.showFactionSelect(data)}>{'< Back'}</button>
        <div class="ui-header-title">CHOOSE HERO</div>
        <ShardBadge />
      </div>

      <div class="ui-section" style={{ textAlign: 'center', paddingBottom: '4px' }}>
        <div class="text-dim text-sm">Three heroes offered — pick wisely</div>
      </div>

      <div class="ui-section" style={{ paddingTop: 0 }}>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', alignItems: 'stretch' }}>
          {heroes.map(heroId => {
            const hero = HERO_TYPES[heroId];
            const isFactionHero = heroId === factionHeroId;
            const color = hexColor(hero.color);
            const factionName = FACTIONS[hero.faction as FactionId]?.name ?? hero.faction;

            return (
              <div
                key={heroId + rerollCount}
                class="card"
                style={{ width: 'min(260px, 100%)', cursor: 'pointer', padding: '0', overflow: 'hidden' }}
                onClick={() => selectHero(heroId)}
              >
                {/* Header with color */}
                <div style={{ background: color + '22', borderBottom: `2px solid ${color}`, padding: '10px 12px' }}>
                  <div style={{ fontSize: '9px', color: isFactionHero ? 'var(--gold)' : 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    {factionName} {isFactionHero ? '(your faction)' : ''}
                  </div>
                  <div style={{ fontFamily: "'Silkscreen', ui-sans-serif, sans-serif", fontSize: '18px', color: 'var(--text-primary)', fontWeight: 'bold', marginTop: '2px' }}>{hero.name}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>{hero.description}</div>
                </div>

                {/* Stats */}
                <div style={{ padding: '8px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '11px' }}>
                  <StatRow label="HP" value={String(hero.hp)} />
                  <StatRow label="Damage" value={String(hero.damage)} />
                  <StatRow label="Speed" value={`${hero.attackSpeed}/s`} />
                  <StatRow label="Range" value={hero.attackRange <= 50 ? 'Melee' : `${hero.attackRange}px`} />
                  <StatRow label="Move" value={String(hero.moveSpeed)} />
                  {hero.baseArmor ? <StatRow label="Armor" value={String(hero.baseArmor)} /> : null}
                </div>

                {/* Abilities */}
                <div style={{ padding: '4px 12px 12px', borderTop: '1px solid var(--border-subtle)' }}>
                  {hero.abilities.map(ab => (
                    <div key={ab.key} style={{ marginTop: '6px' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-primary)' }}>
                        <span style={{ color: 'var(--gold)' }}>[{ab.key}]</span> {ab.name}
                        <span style={{ color: 'var(--text-dim)', marginLeft: '6px' }}>{ab.cooldown}s</span>
                      </div>
                      <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '1px' }}>{ab.description}</div>
                    </div>
                  ))}
                  {hero.ultimate && (
                    <div style={{ marginTop: '8px' }}>
                      <div style={{ fontSize: '11px', color: 'var(--jewel-violet)' }}>
                        <span style={{ color: 'var(--faction-arcane)' }}>[R]</span> {hero.ultimate.name}
                        <span style={{ color: 'var(--text-dim)', marginLeft: '6px' }}>{hero.ultimate.cooldown}s</span>
                      </div>
                      <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '1px' }}>{hero.ultimate.description}</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div class="text-center mt-4">
          <button class="btn" onClick={reroll}>Reroll Heroes</button>
        </div>
      </div>
    </>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ color: 'var(--text-primary)', fontFamily: "'VT323', ui-monospace, monospace" }}>{value}</span>
    </div>
  );
}
