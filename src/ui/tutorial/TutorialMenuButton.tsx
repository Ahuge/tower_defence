/**
 * TutorialMenuButton — a "?" affordance on the menu that opens a small
 * modal listing every tutorial track. Completed tracks show a checkmark.
 * Clicking any track replays it from step 0.
 *
 * The modal is portaled into document.body via createPortal so it
 * escapes the MenuScreen header's stacking context. Without the portal,
 * sibling `.ui-section` elements (MAP / DIFFICULTY / MODE) paint on top
 * of the modal because `.ui-screen > *` assigns every direct child a
 * `z-index: 1` stacking context — our fixed modal's z-index: 500 was
 * being scoped inside `.ui-header`, not the document.
 */
import { useState } from 'preact/hooks';
import { createPortal } from 'preact/compat';
import { TutorialManager } from '../../systems/Tutorial/TutorialManager';
import { getHelpMenuTracks } from '../../systems/Tutorial/TutorialTracks';

export function TutorialMenuButton() {
  const [open, setOpen] = useState(false);
  const tracks = getHelpMenuTracks();

  const replay = (id: string) => {
    setOpen(false);
    // tutorial_match needs an actual GameScene running to have targets —
    // route through launchTutorialMatch so the scene starts and the track
    // fires after the faction-load splash dismisses.
    if (id === 'tutorial_match') {
      TutorialManager.launchTutorialMatch();
    } else {
      TutorialManager.replay(id);
    }
  };

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
      onClick={() => setOpen(false)}
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
              maxWidth: 'min(520px, calc(100vw - 32px))',
              maxHeight: 'calc(100vh - 80px)',
              overflow: 'auto',
              color: 'var(--text-primary, #f2e6d0)',
              fontFamily: "'DM Sans', system-ui, sans-serif",
              boxShadow: '0 18px 48px rgba(0,0,0,0.7)',
              animation: 'tutorialModalRise 220ms ease',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{
              fontFamily: "'Silkscreen', ui-sans-serif, sans-serif",
              fontSize: '16px',
              color: 'var(--gold, #e8b76d)',
              letterSpacing: '2px',
              marginBottom: '12px',
              textAlign: 'center',
            }}>Tutorials</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {tracks.map(track => {
                const done = TutorialManager.isCompleted(track.id);
                return (
                  <button
                    key={track.id}
                    class="btn"
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                      padding: '8px 12px', textAlign: 'left',
                      borderColor: done ? 'rgba(80, 200, 120, 0.4)' : undefined,
                    }}
                    onClick={() => replay(track.id)}
                  >
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

            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <button class="btn" onClick={() => setOpen(false)}>Close</button>
            </div>
          </div>
        </div>
  ) : null;

  return (
    <>
      <button
        class="btn"
        data-tutorial-target="tutorials-help-btn"
        style={{ padding: '4px 10px', fontSize: '16px', lineHeight: 1 }}
        title="Tutorials"
        onClick={() => setOpen(true)}
      >?</button>
      {modal && createPortal(modal, document.body)}
    </>
  );
}
