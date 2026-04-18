/**
 * useTutorial — Preact subscription hook for TutorialManager state.
 * Mirrors the pattern in useGameUI().
 */
import { useState, useEffect } from 'preact/hooks';
import { TutorialManager, ActiveTutorial } from '../../systems/Tutorial/TutorialManager';

export function useTutorial(): ActiveTutorial | null {
  const [active, setActive] = useState<ActiveTutorial | null>(TutorialManager.getActive());

  useEffect(() => {
    return TutorialManager.subscribe(() => {
      setActive(TutorialManager.getActive());
    });
  }, []);

  return active;
}
