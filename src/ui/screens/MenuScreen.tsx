import { useState } from 'preact/hooks';
import { UIBridge } from '../UIBridge';
import { ShardBadge } from '../components/ShardBadge';
import { MAP_ORDER, MAPS, MapId } from '../../data/Maps';
import { getDailySeed } from '../../data/MapGenerator';
import { MatchMode } from '../../data/WaveDefinitions';
import { ShardWallet } from '../../systems/monetization';

type DifficultyLevel = 'easy' | 'normal' | 'hard' | 'insane';

const DIFFICULTIES: { id: DifficultyLevel; label: string; color: string }[] = [
  { id: 'easy', label: 'Easy', color: 'var(--jewel-teal)' },
  { id: 'normal', label: 'Normal', color: 'var(--gold)' },
  { id: 'hard', label: 'Hard', color: 'var(--jewel-red)' },
  { id: 'insane', label: 'Insane', color: 'var(--faction-psionic)' },
];

const MODES: { id: string; label: string; desc: string; accent: string; mode: MatchMode | 'lobby' | 'circle' }[] = [
  { id: 'standard', label: 'Standard', desc: 'Classic tower defence', accent: 'var(--jewel-teal)', mode: 'standard' },
  { id: 'battle', label: 'Essence', desc: 'Dual economy — Gold + Essence', accent: 'var(--jewel-amber)', mode: 'battle' },
  { id: 'hero', label: 'Hero Defense', desc: 'Control a hero in the arena', accent: 'var(--faction-psionic)', mode: 'hero_defense' },
  { id: 'gauntlet', label: 'Faction Gauntlet', desc: '100 waves — fight all factions', accent: 'var(--jewel-red)', mode: 'gauntlet' },
  { id: 'endless', label: 'Endless', desc: 'Infinite scaling — play until you fall', accent: 'var(--faction-harmonic)', mode: 'endless' },
  { id: 'versus', label: 'Versus 1v1', desc: 'P2P competitive — sends attack', accent: 'var(--faction-infernal)', mode: 'lobby' },
  { id: 'circle', label: 'Circle Co-op', desc: '2-4 players — shared map', accent: 'var(--rarity-rare)', mode: 'circle' },
];

const WAVE_COUNTS = [
  { label: 'Quick', waves: 15 },
  { label: 'Standard', waves: 30 },
  { label: 'Extended', waves: 100 },
];

export function MenuScreen() {
  const [selectedMap, setSelectedMap] = useState<MapId>('plains');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('normal');
  const [dailySeed, setDailySeed] = useState(true);
  const [waveOverlay, setWaveOverlay] = useState(false);
  const [, setShardTick] = useState(0);

  const goFaction = (mode: MatchMode, waveCount?: number) => {
    const seed = selectedMap === 'random'
      ? (dailySeed ? getDailySeed() : Math.floor(Math.random() * 999999999))
      : 0;
    UIBridge.showFactionSelect({
      mode, map: selectedMap, difficulty, randomSeed: seed, dailySeed, waveCount,
    });
  };

  const handleModeClick = (m: typeof MODES[0]) => {
    if (m.mode === 'lobby') {
      UIBridge.startScene('LobbyScene');
    } else if (m.mode === 'circle') {
      UIBridge.startScene('CircleLobbyScene');
    } else if (m.mode === 'standard') {
      setWaveOverlay(true);
    } else {
      goFaction(m.mode as MatchMode);
    }
  };

  return (
    <>
      <div class="ui-header">
        <div class="ui-header-title">TOWER DEFENCE</div>
        <ShardBadge />
      </div>
      <div class="ui-section">
        <div class="ui-section-title">Map</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {MAP_ORDER.map(mapId => {
            const isSelected = mapId === selectedMap;
            const isCustom = mapId === 'custom';
            const isRandom = mapId === 'random';
            const name = isCustom ? 'Custom' : (MAPS[mapId]?.name ?? mapId);
            return (
              <button key={mapId} class={`btn ${isSelected ? 'btn-gold' : ''}`}
                style={isSelected ? { borderWidth: '2px' } : undefined}
                onClick={() => { if (isCustom) { UIBridge.startScene('CustomMapScene'); } else { setSelectedMap(mapId); } }}>
                <span style={{ color: isRandom ? 'var(--faction-psionic)' : isCustom ? 'var(--gold)' : undefined }}>{name}</span>
              </button>
            );
          })}
        </div>
        {selectedMap === 'random' && (
          <div style={{ marginTop: '8px', fontSize: '12px', cursor: 'pointer', color: dailySeed ? 'var(--gold)' : 'var(--text-dim)' }}
            onClick={() => setDailySeed(!dailySeed)}>
            {dailySeed ? `Daily: ON — seed ${getDailySeed()}` : 'Daily: OFF — random seed'}
          </div>
        )}
      </div>
      <div class="ui-section" style={{ paddingTop: 0 }}>
        <div class="ui-section-title">Difficulty</div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {DIFFICULTIES.map(d => (
            <button key={d.id} class={`btn ${d.id === difficulty ? 'btn-gold' : ''}`}
              style={{ color: d.color, borderColor: d.id === difficulty ? d.color : undefined }}
              onClick={() => setDifficulty(d.id)}>{d.label}</button>
          ))}
        </div>
      </div>
      <div class="ui-section" style={{ paddingTop: 0 }}>
        <div class="ui-section-title">Mode</div>
        <div class="card-grid">
          {MODES.map(m => (
            <div key={m.id} class="card" onClick={() => handleModeClick(m)}>
              <div class="card-accent" style={{ background: m.accent }} />
              <div class="card-name" style={{ marginTop: '4px' }}>{m.label}</div>
              <div class="card-desc">{m.desc}</div>
            </div>
          ))}
        </div>
        <div class="text-dim text-sm text-center mt-2">Multiplayer modes use P2P WebRTC — no server required</div>
      </div>
      <div class="ui-section" style={{ paddingTop: 0, display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <button class="btn btn-gold" onClick={() => UIBridge.show('store')}>Store</button>
        <button class="btn btn-primary" onClick={() => UIBridge.show('battlepass')}>Battle Pass</button>
        <button class="btn btn-green" onClick={() => UIBridge.show('inventory')}>Inventory</button>
        <button class="btn" onClick={() => UIBridge.show('encyclopedia')}>Encyclopedia</button>
        <button class="btn" onClick={() => UIBridge.show('leaderboard')}>Leaderboard</button>
        <button class="btn" onClick={() => UIBridge.show('changelog')}>Changelog</button>
        <button class="btn btn-gold" onClick={() => { ShardWallet.earn(5000, 'test: Add Money'); setShardTick(t => t + 1); }}>+5000 Shards (test)</button>
      </div>
      <div class="text-dim text-center" style={{ padding: '8px', fontSize: '11px' }}>Version {__BUILD_TIME__}</div>
      {waveOverlay && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
          onClick={() => setWaveOverlay(false)}>
          <div style={{ background: 'var(--bg-surface)', borderRadius: '12px', padding: '24px', border: '1px solid var(--border-default)', maxWidth: 'calc(100vw - 32px)', width: '400px' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: 'center', fontFamily: "'Silkscreen', ui-sans-serif, sans-serif", fontSize: 'var(--text-lg)', color: 'var(--text-primary)', marginBottom: '16px' }}>Select Wave Count</div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {WAVE_COUNTS.map(opt => (
                <button key={opt.waves} class="btn btn-gold" style={{ padding: '16px 20px', minWidth: '90px' }}
                  onClick={() => { setWaveOverlay(false); goFaction('standard', opt.waves); }}>
                  <div style={{ fontWeight: 'bold' }}>{opt.label}</div>
                  <div class="text-dim text-sm">{opt.waves} waves</div>
                </button>
              ))}
            </div>
            <div class="text-center mt-4"><button class="btn" onClick={() => setWaveOverlay(false)}>Cancel</button></div>
          </div>
        </div>
      )}
    </>
  );
}
