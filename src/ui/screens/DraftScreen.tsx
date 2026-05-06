import { UIBridge } from '../UIBridge';
import { ShardBadge } from '../components/ShardBadge';
import { Header } from '../components/Header';
import { DraftModifier, getRandomModifiers } from '../../data/DraftModifiers';
import { BattlePass, claimRewarded, isRewardInstant } from '../../systems/monetization';
import { platformBridge } from '../../systems/platform';
import {
  AD_DRAFT_MODIFIER_2,
  AD_DRAFT_MODIFIER_3,
  AD_DRAFT_REROLL,
} from '../../systems/platform/AdPlacements';
import { formatCountdown } from '../../systems/platform/AdCooldowns';
import { useState, useEffect } from 'preact/hooks';
import { isCaptureEnabled } from '../../systems/learning/LiveCapture';

/**
 * Cooldown (ms) required before the Nth reroll (1-indexed). First
 * three are free-flowing; from the 4th onward the gap between
 * rerolls escalates to discourage compulsion watching. Strategy-doc
 * #4 placement spec.
 */
function cooldownBeforeReroll(n: number): number {
  if (n <= 3) return 0;
  if (n === 4) return 30_000;
  if (n === 5) return 60_000;
  return 120_000;
}

interface Props { data: Record<string, unknown>; }

/**
 * Draft screen — always picks one modifier.
 *
 * Slot 1 is free for everyone.
 * Slots 2 and 3 are ad-gated rewarded placements (#2 / #3 from
 * ad-strategy.md). Progressive-reveal: slot 3 only unlocks after
 * slot 2 does so the player watches the ads in order (which is how
 * we deliver the "short ad → longer ad" framing — same ad length,
 * but twice as many to get the third option).
 *
 * Bypass paths:
 *   - Battle Pass `free_modifiers` perk: all three unlocked from
 *     the jump (existing behaviour).
 *   - ads_off IAP owners: all three unlocked, `claimRewarded` skips
 *     the ad entirely.
 *
 * Multi-faction / gauntlet modes route through the same screen — no
 * mode-specific branching needed.
 */
export function DraftScreen({ data }: Props) {
  // Training-data capture suppresses modifiers entirely. The headless
  // bot harness (which generates the rest of the training set) runs
  // modifier=null, so allowing modifier picks here would inject a
  // dimension into the human captures that the bot data doesn't have
  // — model gradient gets dominated by the no-modifier majority and
  // the modifier feature carries no signal. See CLAUDE.md (capture
  // ingest section) and the "DraftModifier — Option A" decision.
  const captureLocked = isCaptureEnabled();

  const [modifiers, setModifiers] = useState(() => getRandomModifiers(3));
  const hasFreeMods = BattlePass.hasPerk('free_modifiers');
  // ads_off bypass delegates to claimRewarded but we use the helper to
  // decide the INITIAL unlock state — no point making the player click
  // "Claim" buttons when the whole point of the IAP is skipping friction.
  const instantByDefault = hasFreeMods || isRewardInstant();
  // Rewarded ads don't serve on web, so hide the unlock affordance there
  // unless ads_off flipped everything open above. (isNative is the
  // truthful "is there any chance an ad fills?" check.)
  const canAdUnlock = platformBridge().isNative;

  const [unlocked, setUnlocked] = useState<boolean[]>(() =>
    instantByDefault ? [true, true, true] : [true, false, false]
  );
  const [busySlot, setBusySlot] = useState<number | null>(null);

  // Reroll state — component-local since Draft mounts fresh every match.
  // `rerollCount` is how many rerolls have completed; the cooldown for
  // attempt N is `cooldownBeforeReroll(N)` read off the next attempt,
  // i.e. `rerollCount + 1`.
  const [rerollCount, setRerollCount] = useState(0);
  const [rerollReadyAt, setRerollReadyAt] = useState(0); // ms-since-epoch
  const [rerollBusy, setRerollBusy] = useState(false);
  const [nowTick, setNowTick] = useState(Date.now());
  // Tick the clock once per second while a cooldown is active so the
  // countdown label stays fresh. Skipped when ready to avoid an idle
  // timer.
  useEffect(() => {
    if (Date.now() >= rerollReadyAt) return;
    const id = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [rerollReadyAt]);

  const matchMode = data.mode as string;

  const pick = (mod: DraftModifier | null) => {
    if (matchMode === 'gauntlet') {
      UIBridge.show('gauntletpreview', { ...data, modifier: mod });
    } else {
      UIBridge.startScene('GameScene', { ...data, modifier: mod });
    }
  };

  const unlockSlot = async (slotIdx: number) => {
    if (busySlot !== null) return;
    const placement = slotIdx === 1 ? AD_DRAFT_MODIFIER_2 : AD_DRAFT_MODIFIER_3;
    setBusySlot(slotIdx);
    try {
      const granted = await claimRewarded(placement);
      if (granted) {
        setUnlocked(prev => prev.map((u, i) => i === slotIdx ? true : u));
      }
      // granted === false: ad skipped / unavailable — leave the slot
      // locked. Player can tap the button again if they change their
      // mind.
    } finally {
      setBusySlot(null);
    }
  };

  const rerollNow = async () => {
    if (rerollBusy) return;
    const nextAttempt = rerollCount + 1;
    if (Date.now() < rerollReadyAt) return;
    setRerollBusy(true);
    try {
      const granted = await claimRewarded(AD_DRAFT_REROLL);
      if (granted) {
        setModifiers(getRandomModifiers(3));
        setRerollCount(nextAttempt);
        // Schedule cooldown for the reroll AFTER this one.
        const nextCooldown = cooldownBeforeReroll(nextAttempt + 1);
        setRerollReadyAt(nextCooldown > 0 ? Date.now() + nextCooldown : 0);
        // Unlock state intentionally preserved — a player who paid
        // to reveal slot 2 doesn't want it re-locked on a reroll.
      }
    } finally {
      setRerollBusy(false);
    }
  };

  const rerollWaitMs = Math.max(0, rerollReadyAt - nowTick);
  const rerollOnCooldown = rerollWaitMs > 0;
  const rerollLabel = rerollBusy
    ? (isRewardInstant() ? 'Rerolling...' : 'Loading ad...')
    : rerollOnCooldown
      ? `Reroll in ${formatCountdown(rerollWaitMs)}`
      : isRewardInstant()
        ? 'Reroll Modifiers'
        : 'Watch Ad → Reroll';

  const headerLine = hasFreeMods
    ? 'Battle Pass: all modifiers unlocked'
    : isRewardInstant()
      ? 'Ads-off: all modifiers unlocked'
      : 'First modifier free — watch an ad to unlock more options';

  if (captureLocked) {
    // Single explanatory card + Continue button that picks modifier=null.
    // Deliberately *not* auto-routing — surprising the user with a vanished
    // screen would be worse than one extra click that explains itself.
    return (
      <>
        <Header title="CHOOSE MODIFIER" back={() => UIBridge.show('menu')} rightContent={<ShardBadge />} />
        <div class="ui-section" style={{ textAlign: 'center' }}>
          <div class="text-dim text-sm mb-2">Training capture is on</div>
        </div>
        <div class="ui-section" style={{ paddingTop: 0 }}>
          <div class="card" style={{ maxWidth: '440px', margin: '0 auto', padding: '20px', textAlign: 'center' }}>
            <div class="card-name" style={{ color: 'var(--gold)', marginBottom: '10px' }}>Modifiers disabled</div>
            <div class="card-desc" style={{ marginBottom: '14px' }}>
              While training-data capture is active, all matches run without a modifier so the recordings stay aligned with the bot dataset. Toggle capture off in Settings to pick a modifier.
            </div>
            <button class="btn btn-gold" onClick={() => pick(null)}>Continue</button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="CHOOSE MODIFIER" back={() => UIBridge.show('menu')} rightContent={<ShardBadge />} />
      <div class="ui-section" style={{ textAlign: 'center' }}>
        <div class="text-dim text-sm mb-2">{headerLine}</div>
      </div>
      <div class="ui-section" style={{ paddingTop: 0 }}>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {modifiers.map((mod, i) => {
            const isUnlocked = unlocked[i];
            const isBusy = busySlot === i;
            // Progressive reveal: slot `i` is only eligible to unlock
            // once slot `i-1` is already unlocked. Slot 0 is always
            // unlocked above.
            const prevUnlocked = i === 0 || unlocked[i - 1];
            const canUnlockNow = !isUnlocked && prevUnlocked && canAdUnlock;

            return (
              <div key={mod.id} class={`card ${isUnlocked ? '' : 'locked'}`}
                style={{ width: 'min(200px, 100%)', minHeight: '120px', textAlign: 'center', cursor: isUnlocked ? 'pointer' : 'default' }}
                onClick={() => isUnlocked && pick(mod)}>
                <div class="card-name" style={{ marginTop: '8px', color: isUnlocked ? 'var(--gold)' : 'var(--text-dim)' }}>
                  {isUnlocked ? mod.name : '???'}
                </div>
                <div class="card-desc" style={{ marginTop: '8px', color: isUnlocked ? 'var(--text-primary)' : 'var(--text-dim)' }}>
                  {isUnlocked ? mod.description : ''}
                </div>
                {!isUnlocked && canUnlockNow && (
                  <button
                    class={`btn btn-gold ${isBusy ? 'btn-disabled' : ''}`}
                    style={{ fontSize: '11px', padding: '4px 10px', marginTop: '12px' }}
                    onClick={(e) => { e.stopPropagation(); void unlockSlot(i); }}
                    disabled={isBusy}
                  >
                    {isBusy ? 'Loading ad...' : `Watch Ad (Option ${i + 1})`}
                  </button>
                )}
                {!isUnlocked && !canUnlockNow && !prevUnlocked && (
                  <div style={{ marginTop: '12px', fontSize: '20px', color: 'var(--text-dim)' }}>&#x1f512;</div>
                )}
                {!isUnlocked && !canUnlockNow && prevUnlocked && !canAdUnlock && (
                  <div class="text-dim text-xs" style={{ marginTop: '12px' }}>Unavailable on web</div>
                )}
              </div>
            );
          })}
        </div>
        {canAdUnlock && (
          <div class="text-center mt-4" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              class={`btn ${rerollBusy || rerollOnCooldown ? 'btn-disabled' : ''}`}
              style={{ fontSize: '11px', padding: '5px 12px' }}
              onClick={rerollNow}
              disabled={rerollBusy || rerollOnCooldown}
            >
              {rerollLabel}
            </button>
            {rerollCount > 0 && (
              <span class="text-dim text-xs">Rerolls this match: {rerollCount}</span>
            )}
          </div>
        )}
        <div class="text-center mt-4"><button class="btn" onClick={() => pick(null)}>Skip — No modifier</button></div>
      </div>
    </>
  );
}
