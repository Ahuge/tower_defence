/**
 * TutorialOverlay — mounts once in App.tsx. Renders nothing when no track
 * is active. When active, renders Spotlight + Popover and keeps the target
 * rect fresh on a rAF loop so spotlighted panels that open/collapse track
 * their moving bounding box.
 */
import { useEffect, useState } from 'preact/hooks';
import { useTutorial } from './useTutorial';
import { Spotlight } from './Spotlight';
import { Popover } from './Popover';
import { resolveTarget, ResolvedRect } from '../../systems/Tutorial/TutorialTargets';
import { TutorialManager } from '../../systems/Tutorial/TutorialManager';

function useResolvedTargetRect(active: ReturnType<typeof useTutorial>): ResolvedRect | null {
  const [rect, setRect] = useState<ResolvedRect | null>(() => active ? resolveTarget(active.step.target) : null);

  useEffect(() => {
    if (!active) { setRect(null); return; }
    let raf = 0;
    let prev: ResolvedRect | null = null;
    const tick = () => {
      const r = resolveTarget(active.step.target);
      if (!rectsEqual(prev, r)) {
        prev = r;
        setRect(r);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active?.track.id, active?.stepIndex]);

  return rect;
}

function rectsEqual(a: ResolvedRect | null, b: ResolvedRect | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}

/** When a step activates, scroll the spotlight target into view if it's
 *  off-screen. DOM targets resolve directly to their element — we ask the
 *  element to scroll itself into center, which handles any scrollable
 *  ancestor (window or a custom container) without us needing to know
 *  which one. No-op for canvas/screen targets — the tutorial match locks
 *  the camera, so those stay in view by construction. */
function useScrollIntoViewOnStepChange(active: ReturnType<typeof useTutorial>): void {
  useEffect(() => {
    if (!active) return;
    const t = active.step.target;
    if (t.kind !== 'dom') return;
    // Let the current render settle before measuring — e.g. a step's
    // onEnter hook might have expanded a sidebar panel that contains the
    // target, and the new layout hasn't committed yet.
    const id = setTimeout(() => {
      const el = document.querySelector<HTMLElement>(t.selector);
      if (!el) return;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      const fullyVisible =
        r.top >= 0 && r.left >= 0 && r.bottom <= vh && r.right <= vw;
      if (!fullyVisible) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      }
    }, 60);
    return () => clearTimeout(id);
  }, [active?.track.id, active?.stepIndex]);
}

export function TutorialOverlay() {
  const active = useTutorial();
  const rect = useResolvedTargetRect(active);
  useScrollIntoViewOnStepChange(active);

  if (!active) return null;
  const { track, step, stepIndex } = active;

  // Hide Next when the step is waiting on a game event (action-gated).
  const eventGated = step.advanceOn && step.advanceOn !== 'click' && 'event' in step.advanceOn;
  const showNext = !eventGated && !step.actionRequired;

  const onNext = () => TutorialManager.next();
  const onSkip = () => TutorialManager.skip();

  // Clicking the scrim advances on click-style steps, is a no-op on event steps
  // (so the player can't accidentally advance by tapping the dim area).
  const onScrim = eventGated ? undefined : onNext;

  return (
    <>
      <Spotlight rect={rect} onClickScrim={onScrim} scrimless={track.scrimless} />
      <Popover
        title={step.title}
        body={step.body}
        rect={rect}
        placement={step.placement ?? 'auto'}
        stepIndex={stepIndex}
        totalSteps={track.steps.length}
        showNext={showNext}
        onNext={onNext}
        onSkip={onSkip}
        skipLabel={track.skipLabel}
        cta={step.cta}
      />
    </>
  );
}
