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

export function TutorialOverlay() {
  const active = useTutorial();
  const rect = useResolvedTargetRect(active);

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
      <Spotlight rect={rect} onClickScrim={onScrim} />
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
        cta={step.cta}
      />
    </>
  );
}
