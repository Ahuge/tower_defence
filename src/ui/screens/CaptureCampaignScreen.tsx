/**
 * v6.1.b — Capture Campaign screen.
 *
 * Setup + status screen for the multi-match capture run. Shows the
 * shuffled faction order, lets the player pick difficulty + restart
 * the order, and launches the next standard-mode match. After each
 * match, GameOverScreen detects an active campaign and shows
 * "Save & Next Faction" instead of the normal buttons.
 */
import { useState } from 'preact/hooks';
import { UIBridge } from '../UIBridge';
import { Header } from '../components/Header';
import { FACTIONS, FactionId, REAL_FACTIONS } from '../../data/Factions';
import { DifficultyLevel } from '../../data/Difficulty';
import {
  getState, startCampaign, getCompletedResults, clearCompletedCampaign, cancelCampaign,
} from '../../systems/CaptureCampaign';

const DIFFICULTIES: DifficultyLevel[] = ['easy', 'normal', 'hard', 'insane'];

export function CaptureCampaignScreen() {
  const [, setRerender] = useState(0);
  const rerender = () => setRerender(n => n + 1);

  const active = getState();
  const completed = !active ? getCompletedResults() : null;
  const showSummary = completed && completed.results.length > 0 && !completed.active;

  return (
    <div class="screen">
      <Header title="Capture Campaign" />
      <div class="ui-section" style={{ maxWidth: '720px', margin: '0 auto', padding: '16px' }}>
        <div class="text-dim text-sm" style={{ marginBottom: '16px' }}>
          Plays one Standard match per faction with gameplay recording on. After each match, you'll see a "Save & Next Faction" button to download the recording and advance. Each downloaded file goes straight into <code>ml/captured/</code> on the dev side; no manual rename.
        </div>

        {showSummary && completed && <SummaryView state={completed} onClear={() => { clearCompletedCampaign(); rerender(); }} />}
        {active && <ActiveCampaignView state={active} onUpdate={rerender} />}
        {!active && !showSummary && <NewCampaignSetup onStart={(diff) => { startCampaign(diff); rerender(); }} />}
      </div>
    </div>
  );
}

function NewCampaignSetup({ onStart }: { onStart: (difficulty: DifficultyLevel) => void }) {
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('normal');
  return (
    <div>
      <div class="ui-section-title" style={{ marginBottom: '8px' }}>Difficulty</div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {DIFFICULTIES.map(d => (
          <button
            class={`btn ${difficulty === d ? 'btn-primary' : ''}`}
            onClick={() => setDifficulty(d)}
          >{d}</button>
        ))}
      </div>
      <div class="text-dim text-sm" style={{ marginBottom: '16px' }}>
        {REAL_FACTIONS.length} factions × Standard 20-wave on plains. Estimated {Math.round(REAL_FACTIONS.length * 8)} minutes if you finish each match. Order is randomized at start.
      </div>
      <button class="btn btn-gold btn-large" onClick={() => onStart(difficulty)}>
        Start Campaign
      </button>
      <button class="btn" style={{ marginLeft: '8px' }} onClick={() => UIBridge.showMenu()}>
        Back
      </button>
    </div>
  );
}

function ActiveCampaignView({ state, onUpdate }: { state: ReturnType<typeof getState> & {} ; onUpdate: () => void }) {
  if (!state) return null;
  const total = state.factionOrder.length;
  const current = state.factionOrder[state.currentIndex];

  const launch = () => {
    UIBridge.startScene('GameScene', {
      mode: 'standard',
      faction: current,
      difficulty: state.difficulty,
      map: 'plains',
      modifier: null,
    });
  };

  const cancel = () => {
    if (!window.confirm('Cancel campaign? Captured matches stay in your training-data buffer; download them from Settings → Training Data before starting a new campaign.')) return;
    cancelCampaign();
    onUpdate();
  };

  return (
    <div>
      <div class="ui-section-title" style={{ marginBottom: '8px' }}>
        Match {state.currentIndex + 1} of {total} — {FACTIONS[current]?.name ?? current}
      </div>
      <div class="text-dim text-sm" style={{ marginBottom: '12px' }}>
        Difficulty: {state.difficulty}
      </div>
      <div style={{ marginBottom: '20px' }}>
        <button class="btn btn-gold btn-large" onClick={launch}>
          Begin {FACTIONS[current]?.name ?? current} match
        </button>
      </div>

      <div class="ui-section-title" style={{ marginTop: '20px', marginBottom: '8px' }}>Progress</div>
      <div>
        {state.factionOrder.map((f, i) => {
          const result = state.results[i];
          const isCurrent = i === state.currentIndex;
          const tag = result
            ? `${result.outcome}, w${result.waveReached}${result.savedFilename ? ' ✓ saved' : ' (not saved)'}`
            : isCurrent ? 'next' : 'pending';
          return (
            <div
              key={f}
              style={{
                padding: '6px 8px', marginBottom: '4px',
                background: isCurrent ? 'rgba(255,180,0,0.15)' : result ? 'rgba(60,180,60,0.10)' : 'rgba(255,255,255,0.04)',
                borderRadius: '4px',
                display: 'flex', justifyContent: 'space-between',
              }}
            >
              <span><b>{i + 1}.</b> {FACTIONS[f]?.name ?? f}</span>
              <span class="text-dim text-sm">{tag}</span>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: '16px' }}>
        <button class="btn" onClick={cancel}>Cancel campaign</button>
      </div>
    </div>
  );
}

function SummaryView({ state, onClear }: { state: NonNullable<ReturnType<typeof getCompletedResults>>; onClear: () => void }) {
  const wins = state.results.filter(r => r.outcome === 'win').length;
  const saved = state.results.filter(r => r.savedFilename).length;
  return (
    <div>
      <div class="ui-section-title" style={{ marginBottom: '8px' }}>Campaign Complete</div>
      <div class="text-dim text-sm" style={{ marginBottom: '12px' }}>
        {wins}/{state.results.length} wins. {saved}/{state.results.length} matches saved to disk.
      </div>
      <div>
        {state.results.map((r, i) => (
          <div key={i} style={{ padding: '4px 8px', marginBottom: '2px', display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.04)', borderRadius: '4px' }}>
            <span><b>{i + 1}.</b> {FACTIONS[r.faction]?.name ?? r.faction}</span>
            <span class="text-dim text-sm">
              {r.outcome} w{r.waveReached} {r.savedFilename ? '✓ saved' : '(not saved)'}
            </span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: '16px' }}>
        <button class="btn btn-primary" onClick={onClear}>Acknowledge & Close</button>
      </div>
    </div>
  );
}
