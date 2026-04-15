/**
 * HeroItems — Hero Defense mode item shop.
 * Shows upgradeable item slots for the hero.
 */
import { useGameUISelector } from '../hooks/useGameUI';
import { GameUIStore } from '../GameUIStore';

export function HeroItemsDOM() {
  const shop = useGameUISelector(s => s.heroShop);
  const gold = useGameUISelector(s => s.gold);

  if (!shop) return <div style={{ fontSize: '10px', color: '#555' }}>Hero items not available</div>;

  return (
    <>
      <div style={{ fontSize: '10px', color: '#ff44aa', marginBottom: '6px' }}>{shop.heroName}</div>
      {shop.items.map(item => {
        const canAfford = !item.owned && gold >= item.cost;
        const maxed = item.tier >= item.maxTier && item.owned;
        return (
          <div key={item.slotId}
            onClick={() => canAfford && GameUIStore.requestBuyHeroItem(item.slotId)}
            style={{
              padding: '4px 6px', marginBottom: '3px', borderRadius: '4px',
              background: item.owned ? 'rgba(68,255,68,0.04)' : canAfford ? 'rgba(255,68,170,0.06)' : 'transparent',
              cursor: canAfford ? 'pointer' : 'default',
              opacity: maxed ? 0.5 : 1,
            }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
              <span style={{ color: item.owned ? '#88ff88' : '#ccc' }}>
                {item.name}
                {item.owned && <span style={{ color: '#666', marginLeft: '4px' }}>T{item.tier}/{item.maxTier}</span>}
              </span>
              {!maxed && (
                <span style={{ color: canAfford ? '#ffaa44' : '#664422', fontSize: '9px' }}>
                  {item.owned ? `Upgrade ${item.cost}g` : `${item.cost}g`}
                </span>
              )}
              {maxed && <span style={{ fontSize: '9px', color: '#44ff44' }}>MAX</span>}
            </div>
            <div style={{ fontSize: '8px', color: '#666', marginTop: '1px' }}>{item.description}</div>
          </div>
        );
      })}
    </>
  );
}
