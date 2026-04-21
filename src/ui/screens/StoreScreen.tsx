import { useState, useRef, useEffect } from 'preact/hooks';
import { UIBridge } from '../UIBridge';
import { ShardBadge } from '../components/ShardBadge';
import { SkinPreview } from '../components/SkinPreview';
import {
  ShardWallet, PlayerInventory, BattlePass,
  SKIN_DEFS, SkinDef, RARITY_COLORS, RARITY_LABELS,
  TERRAIN_THEMES,
  PREMIUM_FACTIONS, FACTION_UNLOCK_COST,
  SKIN_ROLL_COST, DUPLICATE_REFUND,
  getRollableSkins, getPurchasableSkins,
  restorePurchases,
  claimRewarded, isRewardInstant,
  Rarity,
} from '../../systems/monetization';
import { platformBridge } from '../../systems/platform';
import {
  AD_SHARDS_DAILY,
  DAILY_SHARDS_REWARD,
  AD_TOWER_ROLL_REROLL,
} from '../../systems/platform/AdPlacements';
import {
  isDailyReady,
  msUntilNextDaily,
  markShown,
  formatCountdown,
} from '../../systems/platform/AdCooldowns';
import { FACTIONS, FactionId } from '../../data/Factions';

type Tab = 'skins' | 'factions' | 'terrain' | 'rolls';

function rarityClass(r: Rarity): string { return `rarity-${r}`; }
function hexColor(n: number): string { return '#' + n.toString(16).padStart(6, '0'); }

/**
 * "Watch Ad for +100 Shards" button — placement #1 from ad-strategy.md.
 * One play per local calendar day; shows a countdown pill when on
 * cooldown. Hidden entirely on web / non-native builds since the
 * rewarded bridge returns 'unavailable' there and a grey-disabled
 * button would just confuse users.
 */
function DailyAdButton({ rerender }: { rerender: () => void }) {
  const [busy, setBusy] = useState(false);
  const [, setTick] = useState(0);

  // Re-render once a minute while on cooldown so the countdown ticks
  // visibly ("7h 23m" → "7h 22m"). Skipped when ready to avoid a
  // pointless timer.
  const ready = isDailyReady(AD_SHARDS_DAILY);
  useEffect(() => {
    if (ready || busy) return;
    const id = window.setInterval(() => setTick(t => t + 1), 60_000);
    return () => window.clearInterval(id);
  }, [ready, busy]);

  // Hidden on web UNLESS the user owns ads-off (in which case this is
  // a free daily claim button, no ad involved — still valuable on web).
  if (!platformBridge().isNative && !isRewardInstant()) return null;

  const instant = isRewardInstant();

  const onClick = async () => {
    if (!ready || busy) return;
    setBusy(true);
    try {
      const granted = await claimRewarded(AD_SHARDS_DAILY);
      if (granted) {
        ShardWallet.earn(DAILY_SHARDS_REWARD, instant ? 'Daily reward (ad-free)' : 'Daily ad reward');
        markShown(AD_SHARDS_DAILY);
        rerender();
      }
      // granted === false: ad skipped / unavailable / disabled — cooldown
      // only advances on actual grant.
    } finally {
      setBusy(false);
      setTick(t => t + 1);
    }
  };

  if (!ready) {
    const remaining = formatCountdown(msUntilNextDaily(AD_SHARDS_DAILY));
    return (
      <span class="text-dim text-xs" style={{ padding: '4px 10px' }}>
        Daily reward in {remaining}
      </span>
    );
  }

  const label = instant
    ? `Claim +${DAILY_SHARDS_REWARD} Shards`
    : `Watch Ad → +${DAILY_SHARDS_REWARD} Shards`;

  return (
    <button
      class={`btn btn-gold ${busy ? 'btn-disabled' : ''}`}
      style={{ fontSize: '10px', padding: '4px 10px' }}
      onClick={onClick}
      disabled={busy}
    >
      {busy ? (instant ? 'Claiming...' : 'Loading ad...') : label}
    </button>
  );
}

export function StoreScreen() {
  const [tab, setTab] = useState<Tab>('skins');
  const [, setTick] = useState(0);
  const rerender = () => setTick(t => t + 1);
  const [rollResult, setRollResult] = useState<{ skin: SkinDef; isDuplicate: boolean } | null>(null);
  const [restoreState, setRestoreState] = useState<'idle' | 'running' | string>('idle');

  const isNative = platformBridge().isNative;
  const onRestore = async () => {
    if (restoreState === 'running') return;
    setRestoreState('running');
    const r = await restorePurchases();
    if (r.error) {
      setRestoreState('Restore failed. Check your connection.');
    } else if (r.appliedCount > 0) {
      setRestoreState(`Restored ${r.appliedCount} entitlement${r.appliedCount === 1 ? '' : 's'}.`);
      rerender();
    } else if (r.skuCount > 0) {
      setRestoreState('Already up to date.');
    } else {
      setRestoreState('No purchases found on this account.');
    }
    setTimeout(() => setRestoreState('idle'), 4000);
  };

  return (
    <>
      <div class="ui-header">
        <button class="ui-header-back" onClick={() => UIBridge.show('menu')}>{'< Back'}</button>
        <div class="ui-header-title text-gold">STORE</div>
        <ShardBadge />
      </div>
      {isNative && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', padding: '0 12px 8px', flexWrap: 'wrap' }}>
          <DailyAdButton rerender={rerender} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {restoreState !== 'idle' && restoreState !== 'running' && (
              <span class="text-dim text-xs">{restoreState}</span>
            )}
            <button
              class={`btn ${restoreState === 'running' ? 'btn-disabled' : ''}`}
              style={{ fontSize: '10px', padding: '4px 10px' }}
              onClick={onRestore}
            >
              {restoreState === 'running' ? 'Restoring...' : 'Restore Purchases'}
            </button>
          </div>
        </div>
      )}
      <div class="tab-bar">
        {(['skins', 'factions', 'terrain', 'rolls'] as Tab[]).map(t => (
          <button key={t} class={`tab ${tab === t ? 'active' : ''}`} onClick={() => { setTab(t); setRollResult(null); }}>
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      {tab === 'skins' && <SkinsTab rerender={rerender} />}
      {tab === 'factions' && <FactionsTab rerender={rerender} />}
      {tab === 'terrain' && <TerrainTab rerender={rerender} />}
      {tab === 'rolls' && <RollsTab rollResult={rollResult} setRollResult={setRollResult} rerender={rerender} />}
    </>
  );
}

function SkinsTab({ rerender }: { rerender: () => void }) {
  const skins = getPurchasableSkins();
  return (
    <div class="ui-section">
      <div class="ui-section-title">Cosmetic Skins</div>
      <div class="card-grid">
        {skins.map(skin => {
          const owned = PlayerInventory.ownsSkin(skin.id);
          const equipped = isEquipped(skin);
          const canBuy = !owned && ShardWallet.canAfford(skin.shardCost);
          const targetLabel = skin.target === 'tower_faction' ? 'Towers' : skin.target === 'hero' ? 'Hero' : 'Creeps';
          return (
            <div key={skin.id} class={`card ${owned ? 'owned' : ''}`}>
              <div class="card-accent" style={{ background: hexColor(RARITY_COLORS[skin.rarity]) }} />
              <div class="card-name" style={{ marginTop: '4px' }}>{skin.name}</div>
              <SkinPreview skin={skin} size={28} />
              <div class="card-desc"><span class={rarityClass(skin.rarity)} style={{ fontWeight: 'bold' }}>{RARITY_LABELS[skin.rarity]}</span> {targetLabel}</div>
              <div class="card-desc">{skin.description}</div>
              <div class="card-footer">
                {equipped ? (<span class="text-green text-sm">EQUIPPED</span>)
                : owned ? (<button class="btn" style={{ fontSize: '10px', padding: '3px 8px' }} onClick={() => { PlayerInventory.equipSkin(skin.id); rerender(); }}>Equip</button>)
                : (<button class={`btn btn-gold ${!canBuy ? 'btn-disabled' : ''}`} style={{ fontSize: '10px', padding: '3px 8px' }} onClick={() => { if (canBuy && PlayerInventory.purchaseSkin(skin.id)) rerender(); }}>{skin.shardCost} Shards</button>)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FactionsTab({ rerender }: { rerender: () => void }) {
  return (
    <div class="ui-section">
      <div class="ui-section-title">Premium Factions</div>
      {PREMIUM_FACTIONS.map(fId => {
        const faction = FACTIONS[fId as FactionId];
        if (!faction) return null;
        const owned = PlayerInventory.ownsFaction(fId as FactionId);
        const canBuy = !owned && ShardWallet.canAfford(FACTION_UNLOCK_COST);
        return (
          <div key={fId} class={`faction-row ${owned ? 'owned' : ''}`}>
            <div class="faction-color-strip" style={{ background: hexColor(faction.primaryColor) }} />
            <div class="faction-info">
              <div class="faction-name">{faction.name}</div>
              <div class="faction-desc">{faction.description}</div>
              <div class="text-dim text-xs" style={{ marginTop: '2px' }}>{faction.towerIds.length} towers + hero</div>
            </div>
            {owned ? (<span class="text-green" style={{ fontSize: '12px', fontWeight: 'bold' }}>OWNED</span>)
            : (<button class={`btn btn-gold ${!canBuy ? 'btn-disabled' : ''}`} onClick={() => { if (canBuy && PlayerInventory.unlockFaction(fId as FactionId)) rerender(); }}>{FACTION_UNLOCK_COST} Shards</button>)}
          </div>
        );
      })}
    </div>
  );
}

function TerrainTab({ rerender }: { rerender: () => void }) {
  const equipped = PlayerInventory.getEquippedTerrain();
  return (
    <div class="ui-section">
      <div class="ui-section-title">Terrain Themes</div>
      <div class="text-dim text-sm mb-2">Override the map terrain regardless of your faction</div>
      {TERRAIN_THEMES.map(theme => {
        const owned = PlayerInventory.ownsTerrainTheme(theme.id);
        const isEq = equipped === theme.id;
        const canBuy = !owned && ShardWallet.canAfford(theme.shardCost);
        const fColor = FACTIONS[theme.sourceFaction]?.primaryColor ?? 0x888888;
        return (
          <div key={theme.id} class={`faction-row ${owned ? 'owned' : ''}`}>
            <div class="faction-color-strip" style={{ background: hexColor(fColor) }} />
            <div class="faction-info"><div class="faction-name">{theme.name}</div><div class="faction-desc">{theme.description}</div></div>
            {isEq ? (<button class="btn btn-green" style={{ fontSize: '10px' }} onClick={() => { PlayerInventory.unequipTerrain(); rerender(); }}>Equipped ✕</button>)
            : owned ? (<button class="btn" style={{ fontSize: '10px' }} onClick={() => { PlayerInventory.equipTerrain(theme.id); rerender(); }}>Equip</button>)
            : (<button class={`btn btn-gold ${!canBuy ? 'btn-disabled' : ''}`} style={{ fontSize: '10px' }} onClick={() => { if (canBuy && PlayerInventory.unlockTerrainTheme(theme.id)) rerender(); }}>{theme.shardCost} Shards</button>)}
          </div>
        );
      })}
    </div>
  );
}

function RollsTab({ rollResult, setRollResult, rerender }: { rollResult: { skin: SkinDef; isDuplicate: boolean } | null; setRollResult: (r: { skin: SkinDef; isDuplicate: boolean } | null) => void; rerender: () => void; }) {
  const [rolling, setRolling] = useState(false);
  const [stripItems, setStripItems] = useState<SkinDef[]>([]);
  const [stripOffset, setStripOffset] = useState(0);
  const [revealed, setRevealed] = useState(false);
  // Reroll state — one shot per paid roll (strategy-doc #7). The flag
  // resets every time the user kicks off a fresh paid roll.
  const [rerollUsed, setRerollUsed] = useState(false);
  const [rerollBusy, setRerollBusy] = useState(false);
  const stripRef = useRef<HTMLDivElement>(null);
  const instantReward = isRewardInstant();
  const canAdReroll = platformBridge().isNative || instantReward;

  const freeRolls = BattlePass.getFreeRollsRemaining();
  const canRoll = (ShardWallet.canAfford(SKIN_ROLL_COST) || freeRolls > 0) && !rolling;
  const ownedCount = PlayerInventory.getOwnedSkins().length;
  const pool = getRollableSkins(PlayerInventory.getOwnedFactions());
  const totalCount = pool.length;

  const doRoll = () => {
    if (freeRolls > 0) BattlePass.useFreeRoll();
    const result = PlayerInventory.rollSkin();
    if (!result) return;
    // Fresh paid roll — reset the once-per-roll reroll flag.
    setRerollUsed(false);

    // Build the strip: ~40 random skins with the winner placed at position 35
    const STRIP_LEN = 42;
    const WIN_POS = 35;
    const CARD_TOTAL = 120; // card width (116) + gap (4)
    const items: SkinDef[] = [];
    for (let i = 0; i < STRIP_LEN; i++) {
      if (i === WIN_POS) {
        items.push(result.skin);
      } else {
        items.push(pool[Math.floor(Math.random() * pool.length)]);
      }
    }

    setStripItems(items);
    setRollResult(null);
    setRevealed(false);
    setRolling(false); // briefly disable transition
    setStripOffset(0); // reset to start

    // Wait two frames: first to flush offset=0 to DOM, second to start the animation
    const targetOffset = WIN_POS * CARD_TOTAL + 58;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setRolling(true);
        setStripOffset(targetOffset);

        // Sync reveal to CSS transition end instead of a fixed timeout
        const el = stripRef.current;
        if (el) {
          const onEnd = () => {
            el.removeEventListener('transitionend', onEnd);
            setRolling(false);
            setRevealed(true);
            setRollResult(result);
            rerender();
          };
          el.addEventListener('transitionend', onEnd);
        }
      });
    });
  };

  return (
    <div class="ui-section" style={{ textAlign: 'center' }}>
      <div class="ui-section-title">Skin Roll</div>
      <div class="text-dim text-sm mb-2">{SKIN_ROLL_COST} Shards — one random tower skin per roll</div>
      <div class="text-dim text-xs mb-2">
        Common 60% &middot; Rare 25% &middot; Epic 12% &middot; Legendary 3%
      </div>
      {freeRolls > 0 && (
        <div class="text-pass" style={{ fontSize: '12px', marginBottom: '12px' }}>
          Battle Pass: {freeRolls} free roll available!
        </div>
      )}

      {/* Casino strip viewport */}
      <div class="roll-viewport">
        {/* Center marker */}
        <div class="roll-marker" />
        <div
          ref={stripRef}
          class="roll-strip"
          style={{
            transform: `translateX(-${stripOffset}px)`,
            transition: rolling ? 'transform 4s cubic-bezier(0.15, 0.85, 0.25, 1)' : 'none',
          }}
        >
          {stripItems.map((skin, i) => {
            const isWinner = i === 35 && revealed;
            const rc = RARITY_COLORS[skin.rarity];
            return (
              <div
                key={i}
                class={`roll-card ${isWinner ? 'roll-card-winner' : ''}`}
                style={{ borderColor: hexColor(rc) }}
              >
                <div class="roll-card-accent" style={{ background: hexColor(rc) }} />
                <div class="roll-card-name">{skin.name}</div>
                <SkinPreview skin={skin} size={24} />
                <div class={`roll-card-rarity rarity-${skin.rarity}`}>{RARITY_LABELS[skin.rarity]}</div>
                <div class="roll-card-tower">{skin.towerId?.split('_').slice(1).join(' ') ?? ''}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Roll button */}
      <div class="mt-4">
        <button
          class={`btn btn-gold btn-large ${!canRoll ? 'btn-disabled' : ''}`}
          onClick={() => { if (canRoll) doRoll(); }}
        >
          {rolling ? 'Rolling...' : `Roll for ${freeRolls > 0 ? 'FREE' : `${SKIN_ROLL_COST} Shards`}`}
        </button>
      </div>

      {/* Result reveal */}
      {revealed && rollResult && (
        <div class="roll-result mt-4" style={{ background: hexColor(RARITY_COLORS[rollResult.skin.rarity]) + '22', border: `2px solid ${hexColor(RARITY_COLORS[rollResult.skin.rarity])}` }}>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: rollResult.isDuplicate ? 'var(--text-dim)' : hexColor(RARITY_COLORS[rollResult.skin.rarity]) }}>
            {rollResult.isDuplicate ? `DUPLICATE` : 'NEW SKIN!'}
          </div>
          <SkinPreview skin={rollResult.skin} size={48} />
          <div style={{ fontSize: '16px', color: '#fff', marginTop: '6px' }}>{rollResult.skin.name}</div>
          <div class="text-dim text-sm" style={{ marginTop: '4px' }}>
            {RARITY_LABELS[rollResult.skin.rarity]} &middot; {rollResult.skin.faction} &middot; {rollResult.skin.description}
          </div>
          {rollResult.isDuplicate && (
            <div style={{ color: '#ffcc44', marginTop: '8px', fontSize: '13px' }}>+{DUPLICATE_REFUND} Shards refunded</div>
          )}
          {canAdReroll && !rerollUsed && (
            <div style={{ marginTop: '12px' }}>
              <button
                class={`btn btn-gold ${rerollBusy ? 'btn-disabled' : ''}`}
                style={{ fontSize: '11px', padding: '5px 12px' }}
                onClick={async () => {
                  if (rerollBusy) return;
                  setRerollBusy(true);
                  try {
                    const granted = await claimRewarded(AD_TOWER_ROLL_REROLL);
                    if (granted) {
                      const newResult = PlayerInventory.rerollSkinAtRarity(
                        rollResult.skin.rarity,
                        rollResult.skin.id,
                      );
                      if (newResult) {
                        setRollResult(newResult);
                        setRerollUsed(true);
                        rerender();
                      }
                    }
                  } finally {
                    setRerollBusy(false);
                  }
                }}
                disabled={rerollBusy}
              >
                {rerollBusy
                  ? (instantReward ? 'Rerolling...' : 'Loading ad...')
                  : (instantReward ? 'Reroll (same tier)' : 'Watch Ad → Reroll (same tier)')}
              </button>
              <div class="text-dim text-xs" style={{ marginTop: '4px' }}>
                One reroll per paid roll · stays at {RARITY_LABELS[rollResult.skin.rarity]}
              </div>
            </div>
          )}
          {rerollUsed && (
            <div class="text-dim text-xs" style={{ marginTop: '12px' }}>
              Reroll used — next reroll after your next paid roll.
            </div>
          )}
        </div>
      )}

      <div class="text-dim text-sm mt-4">Collection: {ownedCount}/{totalCount} tower skins</div>
    </div>
  );
}

function isEquipped(skin: SkinDef): boolean {
  const equipped = PlayerInventory.getEquippedSkins();
  let slotKey: string | null = null;
  if (skin.target === 'tower_faction' && skin.faction) slotKey = `towerfaction:${skin.faction}`;
  else if (skin.target === 'tower' && skin.towerId) slotKey = `tower:${skin.towerId}`;
  else if (skin.target === 'tower' && skin.faction) slotKey = `towerfaction:${skin.faction}`;
  else if (skin.target === 'creep_faction' && skin.faction) slotKey = `creep:${skin.faction}`;
  else if (skin.target === 'hero' && skin.heroId) slotKey = `hero:${skin.heroId}`;
  if (!slotKey) return false;
  return equipped[slotKey] === skin.id;
}
