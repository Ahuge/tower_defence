/**
 * TutorialMenuButton — the `?` affordance on the menu header.
 *
 * Plan 4: opens a 6-card teaching carousel (Mazing / Income /
 * Factions / Modes / Sends / Online) by default. The carousel is
 * brief — ≤40 words per card, plain teaching voice, no sales tone.
 * It replaces the old "list every track" drawer as the primary
 * surface.
 *
 * Power users can flip to "All Tutorials" mode to replay any
 * specific track (FTG, Economy lesson, Vs CPU, faction briefs, etc.).
 *
 * Modal is portaled to document.body to escape MenuScreen's stacking
 * context (the surrounding `.ui-screen > *` z-index: 1 was scoping
 * the previous modal inside the header).
 */
import { useState } from 'preact/hooks';
import { createPortal } from 'preact/compat';
import { TutorialManager } from '../../systems/Tutorial/TutorialManager';
import { TutorialPersistence } from '../../systems/Tutorial/TutorialPersistence';
import { getHelpMenuTracks } from '../../systems/Tutorial/TutorialTracks';

interface CarouselCard {
  title: string;
  body: string;
}

const CAROUSEL: CarouselCard[] = [
  {
    title: 'Mazing',
    body: 'Towers block creep paths. Place them so creeps walk a long S-curve through your kill zone. Longer path = more time to shoot. This is the dominant skill of the game.',
  },
  {
    title: 'Income',
    body: 'Three sources. Kill gold drops from creeps. Wave income ticks at the end of every wave. Frontier buildings (safe) and sends (risky) both raise wave income.',
  },
  {
    title: 'Factions',
    body: '11 factions, each plays differently. Arcane crits. Nature poisons. Infernal sacrifices. You unlock more as you level up. The first time you pick one, a 5-line brief explains its identity.',
  },
  {
    title: 'Modes',
    body: 'Standard is the classic mode. Endless scales forever. Hero Defense puts you in an arena with a hero. Versus is 1v1, Co-op is 2-4 players. Each unlocks at a Player Level threshold.',
  },
  {
    title: 'Sends',
    body: 'Press Z/X/C/V to spawn extra creeps on your own wave. Risky but each send permanently raises your income. In Versus, sends spawn on your opponent\'s map instead.',
  },
  {
    title: 'Online Play',
    body: 'No accounts, no server. You and a friend exchange room codes. One hosts, the other joins. Versus 1v1 has sends; Co-op shares lives across 2-4 players.',
  },
];

type View = 'carousel' | 'tracks';

export function TutorialMenuButton() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>('carousel');
  const [cardIdx, setCardIdx] = useState(0);
  const [skipBriefs, setSkipBriefs] = useState(() => TutorialPersistence.isFactionBriefsSkipped());
  const tracks = getHelpMenuTracks();

  const close = () => { setOpen(false); setView('carousel'); setCardIdx(0); };

  const replay = (id: string) => {
    close();
    // In-game tracks need their host scene running. Route through the
    // appropriate launch helper so the scene starts and the track
    // fires after match-loading-dismissed.
    if (id === 'ftg')              { TutorialManager.launchFTG(); return; }
    if (id === 'tutorial_match')   { TutorialManager.launchTutorialMatch(); return; }
    if (id === 'tutorial_economy') { TutorialManager.launchEconomyTutorial(); return; }
    if (id === 'tutorial_vs_cpu')  { TutorialManager.launchVsCpuTutorial(); return; }
    TutorialManager.replay(id);
  };

  const toggleSkipBriefs = () => {
    const next = !skipBriefs;
    TutorialPersistence.setFactionBriefsSkipped(next);
    setSkipBriefs(next);
  };

  const card = CAROUSEL[cardIdx];

  const carousel = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{
        fontFamily: "'Silkscreen', ui-sans-serif, sans-serif",
        fontSize: '16px',
        color: 'var(--gold, #e8b76d)',
        letterSpacing: '2px',
        textAlign: 'center',
      }}>How To Play</div>

      <div style={{
        background: 'rgba(255,255,255,0.04)',
        borderRadius: '8px',
        padding: '18px 20px',
        minHeight: '160px',
        display: 'flex', flexDirection: 'column', gap: '8px',
      }}>
        <div style={{ fontFamily: "'Silkscreen', ui-sans-serif, sans-serif", fontSize: '14px', color: 'var(--gold, #e8b76d)' }}>
          {card.title}
        </div>
        <div style={{ fontSize: '13px', lineHeight: 1.55, color: 'var(--text-secondary, #cfc0a8)' }}>
          {card.body}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <button class="btn" disabled={cardIdx === 0} style={{ opacity: cardIdx === 0 ? 0.4 : 1 }}
          onClick={() => setCardIdx(i => Math.max(0, i - 1))}>← Back</button>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: '4px' }}>
          {CAROUSEL.map((_, i) => (
            <div key={i} style={{
              width: '7px', height: '7px', borderRadius: '50%',
              background: i === cardIdx ? 'var(--gold, #e8b76d)' : 'rgba(255,255,255,0.25)',
            }} />
          ))}
        </div>
        <button class="btn" disabled={cardIdx === CAROUSEL.length - 1} style={{ opacity: cardIdx === CAROUSEL.length - 1 ? 0.4 : 1 }}
          onClick={() => setCardIdx(i => Math.min(CAROUSEL.length - 1, i + 1))}>Next →</button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
        <button class="btn" style={{ fontSize: '11px', padding: '4px 10px' }} onClick={() => setView('tracks')}>
          All Tutorials →
        </button>
        <button class="btn" onClick={close}>Close</button>
      </div>
    </div>
  );

  const tracksList = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{
        fontFamily: "'Silkscreen', ui-sans-serif, sans-serif",
        fontSize: '16px',
        color: 'var(--gold, #e8b76d)',
        letterSpacing: '2px',
        textAlign: 'center',
        marginBottom: '4px',
      }}>All Tutorials</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '50vh', overflow: 'auto' }}>
        {tracks.map(track => {
          const done = TutorialManager.isCompleted(track.id);
          return (
            <button key={track.id} class="btn"
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                padding: '8px 12px', textAlign: 'left',
                borderColor: done ? 'rgba(80, 200, 120, 0.4)' : undefined,
              }}
              onClick={() => replay(track.id)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                <span style={{ color: done ? '#88dd99' : 'var(--gold, #e8b76d)', fontSize: '12px', minWidth: '16px' }}>
                  {done ? '✓' : '•'}
                </span>
                <span style={{ fontFamily: "'Silkscreen', ui-sans-serif, sans-serif", fontSize: '12px' }}>
                  {track.name}
                </span>
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.55)', marginLeft: '24px' }}>
                {track.summary}
              </div>
            </button>
          );
        })}
      </div>

      <label style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        fontSize: '12px', color: 'var(--text-secondary, #cfc0a8)',
        marginTop: '8px', padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px',
        cursor: 'pointer',
      }}>
        <input type="checkbox" checked={skipBriefs} onChange={toggleSkipBriefs} />
        Skip all faction briefs (the 5-line tour on first faction pick)
      </label>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
        <button class="btn" style={{ fontSize: '11px', padding: '4px 10px' }} onClick={() => setView('carousel')}>← How To Play</button>
        <button class="btn" onClick={close}>Close</button>
      </div>
    </div>
  );

  const modal = open ? (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(10, 8, 15, 0.92)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 500,
        animation: 'tutorialModalFade 180ms ease',
      }}
      onClick={close}
    >
      <style>{`
        @keyframes tutorialModalFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes tutorialModalRise {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div
        style={{
          background: 'var(--bg-surface, #1a1322)',
          border: '1px solid var(--border-default, rgba(232,183,109,0.35))',
          borderRadius: '12px',
          padding: '20px',
          width: 'min(520px, calc(100vw - 32px))',
          maxHeight: 'calc(100vh - 80px)',
          overflow: 'auto',
          color: 'var(--text-primary, #f2e6d0)',
          fontFamily: "'DM Sans', system-ui, sans-serif",
          boxShadow: '0 18px 48px rgba(0,0,0,0.7)',
          animation: 'tutorialModalRise 220ms ease',
        }}
        onClick={e => e.stopPropagation()}
      >
        {view === 'carousel' ? carousel : tracksList}
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        class="btn"
        data-tutorial-target="tutorials-help-btn"
        style={{ padding: '4px 10px', fontSize: '16px', lineHeight: 1 }}
        title="How To Play / Tutorials"
        onClick={() => setOpen(true)}
      >?</button>
      {modal && createPortal(modal, document.body)}
    </>
  );
}
