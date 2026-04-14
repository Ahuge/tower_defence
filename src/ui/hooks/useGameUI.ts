/**
 * useGameUI — Preact hook to subscribe to GameUIStore changes.
 * Re-renders the component whenever game state changes.
 */
import { useState, useEffect } from 'preact/hooks';
import { GameUIStore, GameUIState } from '../GameUIStore';

export function useGameUI(): GameUIState {
  const [state, setState] = useState(GameUIStore.getState());

  useEffect(() => {
    return GameUIStore.subscribe(() => {
      setState(GameUIStore.getState());
    });
  }, []);

  return state;
}

/** Selective subscription — only re-renders when the selector output changes */
export function useGameUISelector<T>(selector: (state: GameUIState) => T): T {
  const [value, setValue] = useState(() => selector(GameUIStore.getState()));

  useEffect(() => {
    return GameUIStore.subscribe(() => {
      const next = selector(GameUIStore.getState());
      setValue(prev => {
        // Shallow compare for primitives, reference compare for objects
        if (prev === next) return prev;
        return next;
      });
    });
  }, [selector]);

  return value;
}
