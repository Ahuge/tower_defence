/**
 * HeroItems — Hero Defense mode: items, tomes, accessories, abilities.
 */
import { useGameUISelector } from '../hooks/useGameUI';
import { GameUIStore } from '../GameUIStore';

export function HeroItemsDOM() {
  const shop = useGameUISelector(s => s.heroShop);
  const gold = useGameUISelector(s => s.gold);

  if (!shop) return <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>Hero items not available</div>;

  return (
    <>
      {/* Hero info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <span style={{ fontSize: '11px', color: 'var(--faction-psionic)', fontWeight: 'bold' }}>{shop.heroName}</span>
        <span style={{ fontFamily: "'VT323', ui-monospace, monospace", fontSize: '12px', color: 'var(--gold)' }}>Lv.{shop.level}{shop.maxLevel ? ' MAX' : ''}</span>
      </div>

      {/* XP bar */}
      {!shop.maxLevel && (
        <div style={{ height: '8px', background: 'var(--bg-inset)', borderRadius: '4px', marginBottom: '4px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${shop.xpNeeded > 0 ? (shop.xp / shop.xpNeeded) * 100 : 0}%`, background: 'var(--gold)', borderRadius: '4px' }} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '7px', color: 'var(--text-primary)' }}>
            {shop.xp}/{shop.xpNeeded}
          </div>
        </div>
      )}

      {/* Stats */}
      <div style={{ fontFamily: "'VT323', ui-monospace, monospace", fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>
        HP: {shop.hp}/{shop.maxHp} | DMG: {shop.damage} | AS: {shop.attackSpeed.toFixed(2)}/s
      </div>

      {/* Pending upgrades */}
      {shop.pendingUpgrades > 0 && (
        <div style={{ background: 'rgba(232,183,109,0.1)', border: '1px solid rgba(232,183,109,0.3)', borderRadius: '4px', padding: '4px 6px', marginBottom: '6px' }}>
          <div style={{ fontSize: '10px', color: 'var(--gold)', fontWeight: 'bold', marginBottom: '3px' }}>
            LEVEL UP! ({shop.pendingUpgrades} point{shop.pendingUpgrades > 1 ? 's' : ''})
          </div>
          {shop.upgradeOptions.map(opt => (
            <div key={opt.id}
              onClick={() => GameUIStore.requestHeroUpgrade(opt.id)}
              style={{ fontSize: '9px', color: 'var(--jewel-teal)', cursor: 'pointer', padding: '2px 4px', borderRadius: '2px', marginBottom: '2px' }}>
              [{opt.label}] {opt.desc}
            </div>
          ))}
        </div>
      )}

      {/* Item slots */}
      <div data-tutorial-target="hero-items">
      <div style={{ fontSize: '9px', color: 'var(--text-dim)', letterSpacing: '1px', marginBottom: '3px' }}>ITEMS</div>
      {shop.items.map(item => {
        const canBuy = !item.owned ? gold >= item.cost : item.tier < item.maxTier && gold >= item.cost;
        const maxed = item.tier >= item.maxTier;
        return (
          <div key={item.slotId}
            onClick={() => !maxed && canBuy && GameUIStore.requestBuyHeroItem(item.slotId)}
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '3px 6px', marginBottom: '2px', borderRadius: '3px', cursor: !maxed && canBuy ? 'pointer' : 'default',
              background: item.owned ? 'rgba(45,155,138,0.04)' : 'transparent',
            }}>
            <span style={{ fontSize: '10px', color: item.owned ? item.color : 'var(--text-dim)' }}>
              {item.name} {item.owned ? `T${item.tier}` : '(empty)'}
            </span>
            {maxed ? <span style={{ fontSize: '8px', color: 'var(--gold)' }}>MAX</span>
              : <span style={{ fontSize: '9px', color: canBuy ? 'var(--jewel-teal)' : 'var(--text-dim)' }}>{item.cost}g</span>}
          </div>
        );
      })}

      </div>

      {/* Tomes */}
      <div data-tutorial-target="hero-tomes">
      <div style={{ fontSize: '9px', color: 'var(--gold)', letterSpacing: '1px', marginTop: '6px', marginBottom: '3px' }}>TOMES</div>
      {shop.tomes.map(tome => {
        const canBuy = gold >= tome.cost;
        return (
          <div key={tome.id}
            onClick={() => canBuy && GameUIStore.requestBuyTome(tome.id)}
            style={{
              display: 'flex', justifyContent: 'space-between', fontSize: '9px',
              padding: '2px 6px', cursor: canBuy ? 'pointer' : 'default', opacity: canBuy ? 1 : 0.5,
            }}>
            <span style={{ color: 'var(--text-primary)' }}>{tome.label}</span>
            <span style={{ color: canBuy ? 'var(--jewel-teal)' : 'var(--text-dim)' }}>{tome.cost}g</span>
          </div>
        );
      })}

      </div>

      {/* Accessories */}
      <div data-tutorial-target="hero-accessories">
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', marginTop: '6px', marginBottom: '3px' }}>
        <span style={{ color: 'var(--jewel-violet)', letterSpacing: '1px' }}>ACCESSORIES ({shop.equippedAccessories.length}/3)</span>
        <span style={{ color: 'var(--text-dim)' }}>Rotates W{shop.nextRotationWave}</span>
      </div>
      {shop.equippedAccessories.map(acc => (
        <div key={acc.id} style={{ fontSize: '9px', color: 'var(--jewel-violet)', padding: '1px 6px' }}>
          {acc.name}{acc.passive ? '' : ' [T]'}{acc.cooldown && acc.cooldown > 0 ? ` (${acc.cooldown}s)` : ''}
        </div>
      ))}
      {shop.equippedAccessories.length === 0 && <div style={{ fontSize: '9px', color: 'var(--text-dim)', padding: '1px 6px' }}>None equipped</div>}
      {shop.accessoryOffers.map((acc, i) => {
        const canBuy = shop.equippedAccessories.length < 3 && gold >= acc.cost;
        return (
          <div key={acc.id}
            onClick={() => canBuy && GameUIStore.requestBuyAccessory(i)}
            style={{ padding: '3px 6px', marginBottom: '2px', cursor: canBuy ? 'pointer' : 'default', opacity: canBuy ? 1 : 0.5 }}>
            <div style={{ fontSize: '9px' }}>
              <span style={{ color: acc.passive ? 'var(--rarity-rare)' : 'var(--jewel-teal)' }}>[{acc.passive ? 'P' : 'A'}]</span>
              <span style={{ color: 'var(--text-primary)', marginLeft: '4px' }}>{acc.name}</span>
              <span style={{ color: canBuy ? 'var(--jewel-teal)' : 'var(--text-dim)', marginLeft: '4px' }}>{acc.cost}g</span>
            </div>
            <div style={{ fontSize: '8px', color: 'var(--text-dim)', marginLeft: '18px' }}>{acc.description}</div>
          </div>
        );
      })}

      </div>

      {/* Abilities */}
      <div data-tutorial-target="hero-abilities">
      <div style={{ fontSize: '9px', color: 'var(--gold)', letterSpacing: '1px', marginTop: '6px', marginBottom: '3px' }}>ABILITIES</div>
      {shop.abilities.map((ab, i) => (
        <div key={ab.key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', padding: '1px 6px' }}>
          <span style={{ color: ab.ready ? 'var(--jewel-teal)' : 'var(--jewel-red)' }}>
            [{ab.key}] {ab.name}{ab.upgrades > 0 ? ` +${ab.upgrades}` : ''}
            {!ab.ready && ` ${ab.cooldown}s`}
          </span>
          {shop.pendingUpgrades > 0 && (
            <span style={{ color: 'var(--gold)', cursor: 'pointer' }} onClick={() => GameUIStore.requestUpgradeAbility(i)}>[+]</span>
          )}
        </div>
      ))}
      {shop.ultimate && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', padding: '1px 6px' }}>
          <span style={{ color: shop.ultimate.cooldown === -1 ? 'var(--text-dim)' : shop.ultimate.ready ? 'var(--jewel-violet)' : 'var(--text-dim)' }}>
            [R] {shop.ultimate.name}{shop.ultimate.upgrades > 0 ? ` +${shop.ultimate.upgrades}` : ''}
            {shop.ultimate.cooldown === -1 ? ' (Lv6 req)' : !shop.ultimate.ready ? ` ${shop.ultimate.cooldown}s` : ''}
          </span>
          {shop.pendingUpgrades > 0 && shop.ultimate.cooldown !== -1 && (
            <span style={{ color: 'var(--gold)', cursor: 'pointer' }} onClick={() => GameUIStore.requestUpgradeAbility(3)}>[+]</span>
          )}
        </div>
      )}
      </div>
    </>
  );
}
