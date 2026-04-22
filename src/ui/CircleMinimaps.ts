import * as Phaser from 'phaser';
import { getCanvasWidth } from '../config';
import { CircleManager } from '../systems/multiplayer/CircleManager';
import { ResponsiveManager } from '../systems/ResponsiveManager';

/**
 * Player roster panel for Circle Co-op.
 * Shows all players, their zones (color), faction, and shared lives.
 * For CPU slots, also shows the bot's private gold and tower count —
 * which a human can't otherwise see since bots don't share the
 * main economy. Positioned in top-right corner.
 */
export class CirclePlayerRoster {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private circle: CircleManager;
  private statusTexts: Phaser.GameObjects.Text[] = [];
  private timerText: Phaser.GameObjects.Text;
  private zoneColors: number[];
  /** Lookups supplied by GameScene — lets the roster render per-bot
   *  gold and tower counts without holding a reference to the whole
   *  bot AI or the owner map. Both are optional so non-bot matches
   *  (all humans) render the plain label. */
  private botGoldSupplier?: () => Map<number, number>;
  /** Per-player kill counts — keyed by playerIndex. Covers local
   *  human, remote humans, and bots in one map (see
   *  CircleDeathHandler.getKillsByPlayer). */
  private killsSupplier?: () => Map<number, number>;
  private towerOwnersSupplier?: () => Map<string, number>;

  private readonly panelW = 230;

  constructor(
    scene: Phaser.Scene,
    circle: CircleManager,
    zoneColors: number[],
    botGoldSupplier?: () => Map<number, number>,
    killsSupplier?: () => Map<number, number>,
    towerOwnersSupplier?: () => Map<string, number>,
  ) {
    this.scene = scene;
    this.circle = circle;
    this.zoneColors = zoneColors;
    this.botGoldSupplier = botGoldSupplier;
    this.killsSupplier = killsSupplier;
    this.towerOwnersSupplier = towerOwnersSupplier;

    // On desktop the camera controller pins +/-/⊙ zoom buttons
    // to the top-right (x ≈ canvasWidth - 50, ~40px wide). Shift
    // the roster panel left by that band + a small gap so the
    // two never overlap. Phone uses pinch-to-zoom (no buttons)
    // so no offset needed there.
    const zoomBtnReservation = ResponsiveManager.isPhone() ? 0 : 55;
    const x = getCanvasWidth() - this.panelW - 8 - zoomBtnReservation;
    const y = 6;

    this.container = scene.add.container(x, y).setDepth(29);

    // Background
    const bg = scene.add.graphics();
    const panelH = 18 + circle.playerCount * 18 + 20;
    bg.fillStyle(0x111111, 0.9);
    bg.fillRect(0, 0, this.panelW, panelH);
    bg.lineStyle(1, 0x555555, 0.6);
    bg.strokeRect(0, 0, this.panelW, panelH);
    this.container.add(bg);

    // Title
    const title = scene.add.text(this.panelW / 2, 4, 'CIRCLE CO-OP', {
      fontSize: '10px', color: '#ffaa44', fontFamily: 'monospace',
    }).setOrigin(0.5, 0);
    this.container.add(title);

    // Player rows
    for (let i = 0; i < circle.playerCount; i++) {
      const rowY = 20 + i * 18;
      const color = zoneColors[i] ?? 0xffffff;
      const colorStr = '#' + color.toString(16).padStart(6, '0');

      // Zone color indicator
      const indicator = scene.add.graphics();
      indicator.fillStyle(color, 0.8);
      indicator.fillRect(4, rowY + 2, 10, 10);
      this.container.add(indicator);

      const isMe = i === circle.playerIndex;
      const label = isMe ? `P${i} (you)` : `P${i}`;

      const text = scene.add.text(18, rowY, label, {
        fontSize: '11px', color: colorStr, fontFamily: 'monospace',
      });
      this.container.add(text);
      this.statusTexts.push(text);
    }

    // Timer text
    this.timerText = scene.add.text(this.panelW - 4, 4, '', {
      fontSize: '11px', color: '#ffdd44', fontFamily: 'monospace',
    }).setOrigin(1, 0);
    this.container.add(this.timerText);
  }

  update(sharedLives: number): void {
    // Snapshot once per frame — avoids N calls to the supplier for
    // an N-player roster.
    const botGold = this.botGoldSupplier?.();
    const kills = this.killsSupplier?.();
    const owners = this.towerOwnersSupplier?.();

    for (let i = 0; i < this.circle.playerCount; i++) {
      const isMe = i === this.circle.playerIndex;
      const isBot = this.circle.isBotSlot(i);
      const faction = this.circle.playerFactions.get(i) ?? '';
      const readyStr = this.circle.playersReady.has(i) ? ' [RDY]' : '';
      const playerKills = kills?.get(i) ?? 0;
      const playerTowers = owners ? countOwned(owners, i) : 0;

      let label: string;
      if (isMe) {
        // Local human: show the same T / K columns bots get so
        // the player can compare their output against allies.
        const readyFlag = this.circle.localReady ? ' [RDY]' : '';
        label = `P${i} (you) ${faction}${readyFlag} ${playerTowers}T ${playerKills}K`;
      } else if (isBot) {
        const gold = botGold?.get(i) ?? 0;
        label = `P${i} [CPU] ${faction} ${gold}g ${playerTowers}T ${playerKills}K`;
      } else {
        // Remote human: gold isn't known locally (they have their
        // own EconomyManager on their client); show what we do
        // know — faction, ready state, tower + kill counts.
        label = `P${i} ${faction}${readyStr} ${playerTowers}T ${playerKills}K`;
      }
      this.statusTexts[i]?.setText(label);
    }

    if (this.circle.waveTimerActive) {
      this.timerText.setText(`${this.circle.getWaveTimerSeconds()}s`);
    } else {
      this.timerText.setText(`Lives: ${sharedLives}`);
    }
  }
}

/** Count towers in the owners map assigned to a specific player. */
function countOwned(owners: Map<string, number>, playerIndex: number): number {
  let count = 0;
  for (const owner of owners.values()) {
    if (owner === playerIndex) count++;
  }
  return count;
}
