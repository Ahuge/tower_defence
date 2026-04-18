/**
 * TutorialMode — scripted onboarding match.
 *
 * Everything about the gameplay loop (towers, sends, frontier buildings,
 * wave income) is identical to StandardMode, so we extend it. The only
 * overrides are:
 *   - `canStartWave` is gated: the first wave is locked until the player
 *     has placed at least one tower. Prevents a brand-new player from
 *     punching through the Start Wave button and wondering why they died.
 *   - Listens for towerPlaced on the EventBus so the gate auto-releases.
 *
 * Starting gold/lives are bumped in GameScene when matchMode === 'tutorial'
 * (250g and 99 lives) — cheaper than threading a bonus through GameMode.
 */
import { GameModeContext } from '../GameMode';
import { StandardMode } from './StandardMode';

export class TutorialMode extends StandardMode {
  private hasPlacedAnyTower = false;

  constructor() {
    super('tutorial');
  }

  createUI(ctx: GameModeContext): void {
    super.createUI(ctx);

    // Release the wave-start gate the moment the player places their
    // first tower. Any cell is fine — the tutorial script uses a "hint"
    // spotlight rather than strict validation.
    ctx.eventBus.on('towerPlaced', () => {
      this.hasPlacedAnyTower = true;
    });
  }

  canStartWave(): boolean {
    return this.hasPlacedAnyTower;
  }
}
