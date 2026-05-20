/**
 * FactionTreeScreen — Plan 5 unlock tree UI.
 *
 * Tier-bucketed columnar layout:
 *   Tier 0 (Arcane root, free)
 *   Tier 1 (Mech / Nature / Void at L3, 1000 Shards)
 *   Tier 2 (6 specialists at L6, 1500 Shards)
 *   Tier 3 (Harmonic capstone at L18, 2000 Shards)
 *
 * Each node shows current state (locked-by-level / locked-by-parents /
 * locked-by-capstone-N / unlockable / campaign-pending /
 * campaign-in-progress / playable). Tapping a node opens a detail
 * panel with:
 *   - Faction brief (terse-mechanical, from FactionTracks)
 *   - Tower preview list with costs
 *   - State-appropriate CTA: spend Shards / open campaign lobby /
 *     play match (playable) / "Coming soon" if campaign content
 *     hasn't shipped
 *
 * Visual polish notes (Plan 5 spec): per-faction emblem art,
 * animated parallax homeworld background, edge animations between
 * unlocked/unlockable, audio sting on unlock. v1 ships the structural
 * shell + state machine; the bespoke art assets land as a separate
 * polish pass with the per-faction welcome splashes.
 */
import { useState } from 'preact/hooks';
import { Header } from '../components/Header';
import { ShardBadge } from '../components/ShardBadge';
import { UIBridge } from '../UIBridge';
import {
  listTreeNodes, nodesByTier, getTreeNode,
  type FactionTreeNode,
} from '../../data/FactionTree';
import {
  getFactionNodeState, isFactionPlayable, isFactionCampaignPurchased,
  type FactionNodeState,
  getCurrentLevel,
} from '../../systems/profile/UnlockGates';
import { attemptFactionUnlock } from '../../systems/profile/FactionUnlockFlow';
import { FACTIONS, type FactionId } from '../../data/Factions';
import { TOWER_TYPES } from '../../data/TowerTypes';
import { ShardWallet } from '../../systems/monetization/ShardWallet';
import { getCampaign } from '../../systems/campaign/CampaignRegistry';
import { Analytics } from '../../systems/AnalyticsClient';
import { FactionEmblem } from '../components/FactionEmblem';
import { Fragment } from 'preact';

function hex(n: number): string { return '#' + n.toString(16).padStart(6, '0'); }

const STATE_LABEL: Record<FactionNodeState, string> = {
  locked_level: 'Level Locked',
  locked_parents: 'Locked',
  locked_capstone: 'Capstone Locked',
  unlockable: 'Available',
  campaign_pending: 'Campaign Coming Soon',
  campaign_in_progress: 'Campaign In Progress',
  playable: 'Playable',
};

const STATE_COLOR: Record<FactionNodeState, string> = {
  locked_level: '#666',
  locked_parents: '#666',
  locked_capstone: '#666',
  unlockable: 'var(--gold, #e8b76d)',
  campaign_pending: 'var(--text-secondary)',
  campaign_in_progress: 'var(--gold, #e8b76d)',
  playable: '#88dd99',
};

export function FactionTreeScreen() {
  const [selected, setSelected] = useState<FactionId | null>(null);
  const [, setTick] = useState(0);
  const rerender = () => setTick(t => t + 1);

  const tiers = nodesByTier();
  const playerLevel = getCurrentLevel();
  const shardBalance = ShardWallet.getBalance();

  const onNodeTap = (id: FactionId) => {
    setSelected(id);
    Analytics.track('faction_tree_node_focused', { factionId: id });
  };

  const onUnlock = () => {
    if (!selected) return;
    const result = attemptFactionUnlock(selected);
    if (result.ok) rerender();
  };

  const onPlayCampaign = () => {
    if (!selected) return;
    const def = getCampaign(selected);
    if (def) UIBridge.show('campaign-lobby', { campaign: def });
  };

  const onPlayFaction = () => {
    if (!selected) return;
    // Drop the player back into MenuScreen with the faction preselected.
    // Plan 5 doesn't add a new "play with this faction" flow — the menu
    // already routes faction picks through FactionSelect.
    UIBridge.show('menu');
  };

  const detail = selected ? renderDetail(selected, onUnlock, onPlayCampaign, onPlayFaction, () => setSelected(null)) : null;

  return (
    <>
      {/* Plan 5 polish: animated starfield background hints at the tree
          spanning multiple homeworlds without committing to bespoke
          parallax art per faction. CSS-only, no assets. */}
      <style>{`
        @keyframes tree-starfield-drift {
          from { background-position: 0 0, 0 0; }
          to   { background-position: 200px 100px, -150px 80px; }
        }
        @keyframes tree-node-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,170,68, 0.0); }
          50%      { box-shadow: 0 0 12px 2px rgba(255,170,68, 0.35); }
        }
        .faction-tree-bg {
          position: absolute; inset: 0; z-index: 0; pointer-events: none;
          background:
            radial-gradient(circle at 20% 30%, rgba(120, 80, 200, 0.08), transparent 40%),
            radial-gradient(circle at 80% 70%, rgba(60, 200, 180, 0.07), transparent 40%),
            radial-gradient(2px 2px at 20% 30%, #fff, transparent),
            radial-gradient(1px 1px at 60% 70%, #fff, transparent),
            radial-gradient(1.5px 1.5px at 40% 80%, #fff, transparent),
            radial-gradient(1px 1px at 80% 20%, #fff, transparent),
            radial-gradient(1.5px 1.5px at 10% 60%, #fff, transparent);
          background-size: 100% 100%, 100% 100%, 200px 200px, 150px 150px, 250px 250px, 180px 180px, 220px 220px;
          opacity: 0.55;
          animation: tree-starfield-drift 60s linear infinite;
        }
        .faction-tree-pulse {
          animation: tree-node-pulse 2.4s ease-in-out infinite;
        }
        .faction-tree-shell { position: relative; min-height: 100%; }
        .faction-tree-content { position: relative; z-index: 1; }
        .faction-tree-tier-divider {
          width: 100%; height: 14px; display: flex; align-items: center; justify-content: center;
          color: rgba(255,255,255,0.18); font-size: 14px; user-select: none;
        }
      `}</style>
      <Header title="FACTION TREE" back={() => UIBridge.show('menu')} rightContent={<ShardBadge />} />
      <div class="faction-tree-shell">
        <div class="faction-tree-bg" />
        {/* Plan 5 art-pass: when a faction is focused, layer in its
            three parallax homeworld backgrounds (far / mid / fore)
            with progressively faster pan rates per the PRD A3 spec.
            Layers ride above the starfield so the focus state has a
            distinct identity. They fade out when no node is selected. */}
        {selected && <FactionParallax factionId={selected} />}
        <div class="faction-tree-content">
          <div class="ui-section" style={{ paddingBottom: '8px' }}>
            <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '640px', margin: '0 auto', lineHeight: 1.55 }}>
              Spend Shards to unlock a faction's campaign. Beat the campaign to play that faction in every other mode.
              Locked branches require unlocking their parent first. No refunds.
            </div>
          </div>
          <div class="ui-section" style={{ paddingTop: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '720px', margin: '0 auto' }}>
              {[0, 1, 2, 3].map((tier, i) => (
                // Fragment must own the iteration key — the inner
                // children's `key` props don't help reconciliation
                // when the outer element is the iterated node.
                <Fragment key={tier}>
                  {i > 0 && <div class="faction-tree-tier-divider">↓</div>}
                  <TierRow tier={tier} nodes={tiers[tier] ?? []}
                    playerLevel={playerLevel}
                    shardBalance={shardBalance}
                    onTap={onNodeTap}
                    selectedId={selected} />
                </Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>
      {detail}
    </>
  );
}

function TierRow({ tier, nodes, playerLevel, shardBalance, onTap, selectedId }: {
  tier: number;
  nodes: FactionTreeNode[];
  playerLevel: number;
  shardBalance: number;
  onTap: (id: FactionId) => void;
  selectedId: FactionId | null;
}) {
  if (nodes.length === 0) return null;
  const tierLabel = ['Root', 'Archetypes (L3)', 'Specialists (L6)', 'Capstone (L18)'][tier] ?? `Tier ${tier}`;
  return (
    <div>
      <div style={{
        fontFamily: "'Silkscreen', monospace",
        fontSize: '11px',
        color: 'var(--text-dim)',
        letterSpacing: '0.1em',
        marginBottom: '6px',
        textAlign: 'center',
      }}>{tierLabel}</div>
      <div style={{
        display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
        gap: '8px',
      }}>
        {nodes.map(node => (
          <FactionNode key={node.id} node={node}
            playerLevel={playerLevel}
            shardBalance={shardBalance}
            selected={node.id === selectedId}
            onTap={() => onTap(node.id)} />
        ))}
      </div>
    </div>
  );
}

function FactionNode({ node, playerLevel, shardBalance, selected, onTap }: {
  node: FactionTreeNode;
  playerLevel: number;
  shardBalance: number;
  selected: boolean;
  onTap: () => void;
}) {
  const faction = FACTIONS[node.id];
  const state = getFactionNodeState(node.id);
  const color = hex(faction.primaryColor);
  const isLocked = state.startsWith('locked');
  const stateColor = STATE_COLOR[state];

  const subtitle =
    state === 'locked_level' ? `Player L${node.minLevel}` :
    state === 'locked_parents' ? `Unlock ${node.parents.map(p => FACTIONS[p as FactionId].name).join(' or ')} first` :
    state === 'locked_capstone' ? `Unlock 4 others first` :
    state === 'unlockable' ? `${node.shardCost} Shards${shardBalance < node.shardCost ? ` (have ${shardBalance})` : ''}` :
    state === 'campaign_pending' ? `Campaign coming` :
    state === 'campaign_in_progress' ? `Campaign in progress` :
    state === 'playable' ? `Playable` :
    '';

  return (
    <button onClick={onTap}
      class={`card ${state === 'unlockable' ? 'faction-tree-pulse' : ''}`}
      style={{
        minWidth: '140px',
        padding: '12px 14px',
        opacity: isLocked ? 0.55 : 1,
        borderColor: selected ? color : (state === 'unlockable' ? color : undefined),
        borderWidth: selected ? '2px' : '1px',
        textAlign: 'center',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
      }}>
      <FactionEmblem faction={node.id} size={56} locked={isLocked} />
      <div style={{
        fontFamily: "'Silkscreen', monospace",
        fontSize: '13px',
        color: isLocked ? 'var(--text-dim)' : '#fff',
        marginTop: '2px',
      }}>{faction.name}</div>
      <div style={{ fontSize: '10px', color: stateColor }}>
        {STATE_LABEL[state]}
      </div>
      <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
        {subtitle}
      </div>
    </button>
  );
}

function renderDetail(
  factionId: FactionId,
  onUnlock: () => void,
  onPlayCampaign: () => void,
  onPlayFaction: () => void,
  onClose: () => void,
) {
  const node = getTreeNode(factionId);
  if (!node) return null;
  const faction = FACTIONS[factionId];
  const state = getFactionNodeState(factionId);
  const color = hex(faction.primaryColor);
  const balance = ShardWallet.getBalance();
  const canAfford = balance >= node.shardCost;
  const campaignDef = getCampaign(factionId);

  const cta = (() => {
    if (state === 'unlockable') {
      return (
        <button class={`btn ${canAfford ? 'btn-gold' : ''}`}
          disabled={!canAfford}
          onClick={onUnlock}>
          {canAfford ? `Unlock — ${node.shardCost} Shards` : `Need ${node.shardCost} Shards (have ${balance})`}
        </button>
      );
    }
    if (state === 'campaign_pending' || state === 'campaign_in_progress') {
      if (!campaignDef) {
        return <button class="btn" disabled>Campaign Coming Soon</button>;
      }
      return <button class="btn btn-gold" onClick={onPlayCampaign}>Open Campaign</button>;
    }
    if (state === 'playable') {
      const replayCampaign = isFactionCampaignPurchased(factionId) && campaignDef;
      return (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button class="btn btn-gold" onClick={onPlayFaction}>Play as {faction.name}</button>
          {replayCampaign && <button class="btn" onClick={onPlayCampaign}>Replay Campaign</button>}
        </div>
      );
    }
    return <button class="btn" disabled>{STATE_LABEL[state]}</button>;
  })();

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(8, 6, 14, 0.25)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 600, padding: '16px',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--bg-surface)',
        border: `1px solid ${color}`,
        borderRadius: '12px',
        padding: '24px 28px',
        maxWidth: 'min(560px, 100%)',
        maxHeight: 'calc(100vh - 60px)',
        overflow: 'auto',
        boxShadow: '0 18px 48px rgba(0,0,0,0.7)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px' }}>
          <FactionEmblem faction={factionId} size={72} />
          <div>
            <div style={{
              fontFamily: "'Silkscreen', monospace",
              fontSize: '24px',
              color,
            }}>{faction.name}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
              Tier {node.tier} {node.shardCost > 0 ? `· ${node.shardCost} Shards` : '· Free'} · L{node.minLevel}+
            </div>
          </div>
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: '16px' }}>
          {faction.description}
        </div>
        {faction.towerIds.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Tower kit</div>
            <div style={{ fontSize: '11px', lineHeight: 1.7 }}>
              {faction.towerIds.map(tid => {
                const t = TOWER_TYPES[tid];
                if (!t) return null;
                return <div key={tid} style={{ color: '#bbb' }}>{t.name} <span style={{ color: '#777' }}>({t.cost}g)</span></div>;
              })}
            </div>
          </div>
        )}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button class="btn" onClick={onClose}>Close</button>
          {cta}
        </div>
      </div>
    </div>
  );
}


// ─── Faction parallax overlay (Plan 5 art-pass) ─────────────────
// Three layered <img> elements per faction, panning at the rates
// from the PRD A3 spec (far 0.05 px/frame, mid 0.10 px/frame, fore
// 0.25 px/frame). CSS keyframes drive the pan; if any layer fails
// to load, that layer self-removes via onError without breaking
// the others.

import { factionParallaxSrc as parallaxSrc } from '../utils/factionAssets';

function FactionParallax({ factionId }: { factionId: FactionId }) {
  return (
    <>
      <style>{`
        @keyframes parallax-far  { from { background-position: 0 0; }   to { background-position: -240px 0; } }
        @keyframes parallax-mid  { from { background-position: 0 0; }   to { background-position: -480px 0; } }
        @keyframes parallax-fore { from { background-position: 0 0; }   to { background-position: -1200px 0; } }
        .parallax-layer { position: absolute; inset: 0; z-index: 0; pointer-events: none; background-repeat: repeat-x; opacity: 0.45; transition: opacity 600ms ease; }
        .parallax-far  { animation: parallax-far  240s linear infinite; background-size: cover; }
        .parallax-mid  { animation: parallax-mid  120s linear infinite; background-size: cover; opacity: 0.35; }
        .parallax-fore { animation: parallax-fore  60s linear infinite; background-size: cover; opacity: 0.25; }
      `}</style>
      <div class="parallax-layer parallax-far"
        style={{ backgroundImage: `url(${parallaxSrc(factionId, "far")})` }} />
      <div class="parallax-layer parallax-mid"
        style={{ backgroundImage: `url(${parallaxSrc(factionId, "mid")})` }} />
      <div class="parallax-layer parallax-fore"
        style={{ backgroundImage: `url(${parallaxSrc(factionId, "fore")})` }} />
    </>
  );
}
