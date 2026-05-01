/**
 * SplashScreen — single full-screen card shown on cold boot when the
 * player has not yet completed (or explicitly skipped) the FTG. Two
 * buttons: a large primary "Play Tutorial" and a small "Skip".
 *
 * Lives between the AppLoadingScreen (asset preload) and the menu —
 * decided by App.tsx, which gates `<MenuScreen />` behind this when
 * appropriate. Per Plan 3 design: deliberately minimal copy, the time
 * estimate ("~3 min") sits on the Play button so impatient users know
 * the budget up-front.
 *
 * Skipping marks `dismissedFirstLaunch` in TutorialPersistence — that
 * also suppresses the existing menu-level `basics` track from
 * auto-firing. The FTG is reachable later via the Tutorials Help menu
 * (replay).
 */
import { Analytics } from '../../systems/AnalyticsClient';
import { TutorialPersistence } from '../../systems/Tutorial/TutorialPersistence';
import { useEffect } from 'preact/hooks';
import { Header } from '../components/Header';

interface Props {
  /** Called after the user dismisses the splash (either Play or Skip).
   *  App.tsx flips its local "show splash" flag in this callback. */
  onDismissed: () => void;
}

export function SplashScreen({ onDismissed }: Props) {
  useEffect(() => {
    Analytics.track('splash_shown', {});
  }, []);

  const onPlay = () => {
    Analytics.track('splash_play_tapped', {});
    // The TutorialManager listens for this event and starts the FTG
    // by booting GameScene in tutorial mode + queuing the `ftg` track.
    // Fire BEFORE we mark dismissed so any subsequent maybeStartFirstLaunch
    // check still sees the same suppressed-state pre-dismissal.
    window.dispatchEvent(new Event('tutorial-launch-ftg'));
    TutorialPersistence.markFirstLaunchDismissed();
    onDismissed();
  };

  const onSkip = () => {
    Analytics.track('splash_skip_tapped', {});
    // Persist so we never re-prompt on this device. They can replay
    // the FTG later via the Help menu's tutorial list.
    TutorialPersistence.markFirstLaunchDismissed();
    onDismissed();
  };

  return (
    <div class="ui-screen" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      background: 'radial-gradient(ellipse at center, #1a0f24 0%, #0a0610 100%)',
    }}>
      <Header title="FACTIONS" />
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: '36px',
        maxWidth: '520px',
        width: '100%',
      }}>
        <div>
          <div style={{
            fontFamily: "'Silkscreen', monospace",
            fontSize: 'clamp(28px, 6vw, 42px)',
            color: 'var(--gold)',
            letterSpacing: '0.05em',
            marginBottom: '12px',
          }}>
            Welcome
          </div>
          <div style={{
            fontSize: 'clamp(13px, 2.6vw, 15px)',
            color: 'var(--text-secondary)',
            lineHeight: 1.55,
            maxWidth: '380px',
            margin: '0 auto',
          }}>
            New here? A quick guided round will teach you how to place
            towers and shape paths. You can skip it.
          </div>
        </div>

        <button
          class="btn btn-gold"
          onClick={onPlay}
          style={{
            padding: '18px 36px',
            fontSize: 'clamp(15px, 3vw, 18px)',
            minWidth: '220px',
            borderWidth: '2px',
          }}
        >
          <div style={{ fontWeight: 'bold' }}>Play Tutorial</div>
          <div style={{ fontSize: '11px', opacity: 0.75, marginTop: '2px' }}>~3 minutes</div>
        </button>

        <button
          class="btn"
          onClick={onSkip}
          style={{
            padding: '8px 16px',
            fontSize: '12px',
            opacity: 0.6,
          }}
        >
          Skip — go to menu
        </button>
      </div>
    </div>
  );
}
