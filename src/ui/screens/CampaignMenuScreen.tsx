/**
 * CampaignMenuScreen — overview of every campaign and the player's
 * progress through it.
 *
 * Status states per faction:
 *   - "available"      → campaign content shipped + purchased (or free root). Card is interactive.
 *   - "in_progress"    → at least one mission won, not all (X/10 missions, Y stars).
 *   - "complete"       → all 10 missions won (shows total stars / max).
 *   - "coming_soon"    → faction tree node exists but campaign content hasn't shipped yet.
 *   - "locked"         → faction not yet Shards-purchased — directs to Faction Tree.
 *
 * Each card tap routes through to the campaign lobby (or, for locked
 * factions, the Faction Tree screen).
 *
 * Design note: chaos / random meta entries are excluded — they're
 * picker tokens, not campaigns. Capstone (harmonic) is included; if
 * its content hasn't shipped it surfaces as "coming_soon."
 */
import { Header } from '../components/Header';
import { ShardBadge } from '../components/ShardBadge';
import { UIBridge } from '../UIBridge';
import { listTreeNodes } from '../../data/FactionTree';
import { FACTIONS, type FactionId } from '../../data/Factions';
import { getCampaign } from '../../systems/campaign/CampaignRegistry';
import {
  isFactionCampaignPurchased, isFactionCampaignComplete,
  isFactionPlayable, getCurrentLevel,
} from '../../systems/profile/UnlockGates';
import { PlayerProfile } from '../../systems/profile/PlayerProfile';
import { FactionEmblem } from '../components/FactionEmblem';

type Status = 'available' | 'in_progress' | 'complete' | 'coming_soon' | 'locked';

interface Row {
  factionId: FactionId;
  status: Status;
  missionsDone: number;
  missionsTotal: number;
  stars: number;
  starsMax: number;
}

function hex(n: number): string { return '#' + n.toString(16).padStart(6, '0'); }

function buildRows(): Row[] {
  const rows: Row[] = [];
  for (const node of listTreeNodes()) {
    const id = node.id as FactionId;
    const def = getCampaign(id);
    const purchased = isFactionCampaignPurchased(id);
    const complete = isFactionCampaignComplete(id);
    const progress = PlayerProfile.getCampaignProgress(id);
    const stars = PlayerProfile.getCampaignTotalStars(id);
    const missionsDone = Object.values(progress).filter(s => s >= 1).length;
    const missionsTotal = def?.missions.length ?? 10;
    const starsMax = missionsTotal * 3;

    let status: Status;
    if (!def) status = 'coming_soon';
    else if (!purchased && id !== 'arcane') status = 'locked';
    else if (complete) status = 'complete';
    else if (missionsDone > 0) status = 'in_progress';
    else status = 'available';

    rows.push({ factionId: id, status, missionsDone, missionsTotal, stars, starsMax });
  }
  return rows;
}

const STATUS_LABEL: Record<Status, string> = {
  available: 'Begin Campaign',
  in_progress: 'In Progress',
  complete: 'Complete',
  coming_soon: 'Coming Soon',
  locked: 'Locked',
};

const STATUS_COLOR: Record<Status, string> = {
  available: 'var(--gold, #e8b76d)',
  in_progress: 'var(--gold, #e8b76d)',
  complete: '#88dd99',
  coming_soon: 'var(--text-secondary)',
  locked: 'var(--text-dim)',
};

const STATUS_ORDER: Record<Status, number> = {
  in_progress: 0, available: 1, complete: 2, coming_soon: 3, locked: 4,
};

export function CampaignMenuScreen() {
  const rows = buildRows().sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
  const playerLevel = getCurrentLevel();

  const onCardTap = (row: Row) => {
    if (row.status === 'locked' || row.status === 'coming_soon') {
      UIBridge.show('faction-tree');
      return;
    }
    const def = getCampaign(row.factionId);
    if (def) UIBridge.show('campaign-lobby', { campaign: def });
  };

  return (
    <>
      <Header title="CAMPAIGNS" back={() => UIBridge.show('menu')} rightContent={<ShardBadge />} />
      <div class="ui-section" style={{ paddingBottom: '8px' }}>
        <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '640px', margin: '0 auto', lineHeight: 1.55 }}>
          Each campaign is 10 missions against that faction. Beat all 10 to unlock playing as them in every mode.
          {playerLevel < 7 && <div style={{ marginTop: '4px', color: 'var(--text-dim)' }}>Campaigns unlock at Player Level 7.</div>}
        </div>
      </div>

      <div class="ui-section" style={{ paddingTop: 0 }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '10px',
          maxWidth: '900px', margin: '0 auto',
        }}>
          {rows.map(row => (
            <CampaignCard key={row.factionId} row={row} onTap={() => onCardTap(row)} />
          ))}
        </div>
      </div>
    </>
  );
}

function CampaignCard({ row, onTap }: { row: Row; onTap: () => void }) {
  const faction = FACTIONS[row.factionId];
  const color = hex(faction.primaryColor);
  const label = STATUS_LABEL[row.status];
  const labelColor = STATUS_COLOR[row.status];
  const dimmed = row.status === 'locked' || row.status === 'coming_soon';

  // Progress sub-line per status.
  let progressLine = '';
  if (row.status === 'in_progress') {
    progressLine = `${row.missionsDone}/${row.missionsTotal} missions · ${row.stars}/${row.starsMax} stars`;
  } else if (row.status === 'complete') {
    progressLine = `All cleared · ${row.stars}/${row.starsMax} stars`;
  } else if (row.status === 'available') {
    progressLine = `${row.missionsTotal} missions · vs ${faction.name}`;
  } else if (row.status === 'coming_soon') {
    progressLine = `Content in development`;
  } else {
    progressLine = `Visit Faction Tree to unlock`;
  }

  return (
    <button class="card"
      onClick={onTap}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        padding: '14px 16px',
        textAlign: 'left',
        opacity: dimmed ? 0.6 : 1,
        borderColor: row.status === 'available' || row.status === 'in_progress' ? color : undefined,
        cursor: 'pointer',
      }}>
      <FactionEmblem faction={row.factionId} size={56} locked={dimmed} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "'Silkscreen', monospace",
          fontSize: '14px',
          color: dimmed ? 'var(--text-dim)' : '#fff',
          marginBottom: '2px',
        }}>{faction.name}</div>
        <div style={{ fontSize: '11px', color: labelColor, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
          {progressLine}
        </div>
      </div>
      {/* Star pips for in_progress / complete */}
      {(row.status === 'in_progress' || row.status === 'complete') && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: '36px' }}>
          <div style={{ fontSize: '20px', color: 'var(--gold)', lineHeight: 1 }}>{row.stars}</div>
          <div style={{ fontSize: '9px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>stars</div>
        </div>
      )}
    </button>
  );
}
