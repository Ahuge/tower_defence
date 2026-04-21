/**
 * Continue-ad modal — appears the moment lives hit zero, before the
 * GameOverScreen. Player can watch a rewarded ad to revive with
 * `livesGranted` lives, or decline and fall through to the normal
 * defeat screen.
 *
 * Why a modal and not a GameOverScreen button:
 *   - Once the GameOverScreen has shown the loss summary the moment
 *     is over — players have mentally moved on. The rescue offer
 *     needs to land at the emotional peak of losing, not after.
 *   - Pausing the live game board behind the modal preserves state
 *     so +5 lives means the player resumes exactly where they were:
 *     same creeps mid-path, same towers firing.
 *
 * State lives on GameUIStore.continueOffer; this component just
 * reads it and calls back. The scene itself handles the bridge call,
 * the reward grant, and the pause/resume. See
 * `GameScene.offerContinueOrGameOver`.
 */
import { useState } from 'preact/hooks';
import { useGameUISelector } from '../hooks/useGameUI';
import { GameUIStore } from '../GameUIStore';
import { isRewardInstant } from '../../systems/monetization';

export function ContinueOfferModal() {
  const offer = useGameUISelector(s => s.continueOffer);
  const [busy, setBusy] = useState(false);
  if (!offer) return null;

  const instant = isRewardInstant();

  const handleAccept = async () => {
    if (busy) return;
    setBusy(true);
    try {
      offer.onAccept();
    } finally {
      GameUIStore.clearContinueOffer();
    }
  };

  const handleDecline = () => {
    if (busy) return;
    offer.onDecline();
    GameUIStore.clearContinueOffer();
  };

  return (
    <div class="continue-offer-backdrop" role="dialog" aria-modal="true" aria-label="Continue offer">
      <div class="continue-offer-card">
        <div class="continue-offer-title">You Lost</div>
        <div class="continue-offer-body">
          {instant ? (
            <>Revive with <strong>{offer.livesGranted}</strong> {offer.livesGranted === 1 ? 'life' : 'lives'} and keep playing — no ad needed, ads-off benefit.</>
          ) : (
            <>Watch a short ad to come back with <strong>{offer.livesGranted}</strong> {offer.livesGranted === 1 ? 'life' : 'lives'} and keep playing.</>
          )}
        </div>
        <div class="continue-offer-actions">
          <button
            class={`btn btn-gold btn-large ${busy ? 'btn-disabled' : ''}`}
            onClick={handleAccept}
            disabled={busy}
          >
            {busy
              ? (instant ? 'Reviving...' : 'Loading ad...')
              : (instant ? `Continue +${offer.livesGranted}` : `Watch Ad +${offer.livesGranted}`)}
          </button>
          <button
            class="btn btn-large"
            onClick={handleDecline}
            disabled={busy}
          >
            No thanks
          </button>
        </div>
      </div>
    </div>
  );
}
