/**
 * ParametricStory — resolves `MissionDef.story` into a string at the
 * call site (lobby modal, in-game banner, mission outro).
 *
 * v1 stories were always literal strings. v2 stories may be functions
 * that read the campaign state + last mission result so they can say
 * things like:
 *
 *     story: ({ state }) =>
 *       `The depot raid yielded ${state.ingotsSalvaged} ingots.`
 *
 * This module exists so callers don't need to know which form a given
 * mission used. Lobby code does:
 *
 *     const text = ParametricStory.resolve(mission.story, ctx);
 *
 * and gets a string back regardless of which form the campaign author
 * picked. v1 missions remain plain strings — `ctx` is unused for them.
 */

import type { MissionResult } from '../../data/campaigns/CampaignDef';

export interface StoryContext<TState = unknown> {
  /** Current campaign state for the faction. */
  state: TState;
  /** Result of the most recent mission this campaign played. Null
   *  before the first mission completes. */
  lastResult: MissionResult | null;
}

export type StoryString<TState = unknown> =
  | string
  | ((ctx: StoryContext<TState>) => string);

export const ParametricStory = {
  resolve<TState = unknown>(
    story: StoryString<TState>,
    ctx: StoryContext<TState>,
  ): string {
    if (typeof story === 'string') return story;
    try {
      return story(ctx);
    } catch (err) {
      console.warn('[ParametricStory] resolver threw; falling back to empty:', err);
      return '';
    }
  },
};
