/**
 * GauntletPreviewScreen — DOM replacement for GauntletPreviewScene.
 * Shows the full stage order before starting the gauntlet.
 */
import { UIBridge } from '../UIBridge';
import { ShardBadge } from '../components/ShardBadge';
import { Header } from '../components/Header';
import { FACTIONS, FactionId } from '../../data/Factions';
import { getGauntletFactions, shuffleArray, getGauntletMap } from '../../data/GauntletMaps';
import { useState } from 'preact/hooks';

function hexColor(n: number): string { return '#' + n.toString(16).padStart(6, '0'); }

interface Props { data: Record<string, unknown>; }

export function GauntletPreviewScreen({ data }: Props) {
  const playerFaction = data.faction as FactionId;
  const [stageOrder] = useState(() => shuffleArray(getGauntletFactions(playerFaction)));

  const beginGauntlet = () => {
    UIBridge.startScene('GameScene', { ...data, gauntletOrder: stageOrder });
  };

  return (
    <>
      <Header title="FACTION GAUNTLET" titleStyle={{ color: 'var(--jewel-red)' }} back={() => UIBridge.show('draft', data)} rightContent={<ShardBadge />} />

      <div class="ui-section" style={{ textAlign: 'center', paddingBottom: 0 }}>
        <div class="text-muted text-sm">Playing as {FACTIONS[playerFaction]?.name ?? playerFaction}</div>
        <div class="text-dim text-sm mt-2">10 STAGES — DEFEAT ALL FACTIONS</div>
      </div>

      <div class="ui-section" style={{ maxWidth: '700px', margin: '0 auto' }}>
        {stageOrder.map((fid, i) => {
          const faction = FACTIONS[fid];
          const mapDef = getGauntletMap(fid);
          const isFirst = i === 0;
          return (
            <div key={fid} style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '8px 12px', marginBottom: '4px', borderRadius: '6px',
              background: isFirst ? 'rgba(197,61,74,0.08)' : 'transparent',
              border: isFirst ? '1px solid rgba(197,61,74,0.4)' : '1px solid transparent',
            }}>
              <span class="font-data" style={{ fontSize: '18px', color: isFirst ? 'var(--jewel-red)' : 'var(--text-dim)', minWidth: '28px' }}>
                {i + 1}.
              </span>
              <div style={{ width: '4px', height: '20px', borderRadius: '2px', background: hexColor(faction.primaryColor), opacity: isFirst ? 1 : 0.6, flexShrink: 0 }} />
              <span style={{ fontSize: '15px', color: isFirst ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: isFirst ? 'bold' : 'normal', flex: 1 }}>
                {faction.name}
              </span>
              <span class="text-muted" style={{ fontSize: '13px' }}>
                {mapDef.name}
              </span>
              <span class="font-data" style={{ fontSize: '13px', color: isFirst ? 'var(--jewel-red)' : 'var(--text-dim)', minWidth: '90px', textAlign: 'right' }}>
                Waves {i * 10 + 1}-{(i + 1) * 10}
              </span>
            </div>
          );
        })}
      </div>

      <div class="ui-section" style={{ textAlign: 'center' }}>
        <div class="text-dim text-sm mb-2">100 waves &middot; 10 lives per stage &middot; Frontier persists</div>
        <button class="btn btn-large" style={{ background: '#3a1118', borderColor: 'var(--jewel-red)', color: 'var(--jewel-red)', minWidth: '220px' }}
          onClick={beginGauntlet}>
          BEGIN GAUNTLET
        </button>
      </div>
    </>
  );
}
