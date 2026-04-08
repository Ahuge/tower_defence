import { MatchMode, WaveDefinition } from '../data/WaveDefinitions';
import { EconomyManager } from './EconomyManager';
import { IncomeManager } from './IncomeManager';
import { SendManager } from './SendManager';
import { StatsTracker } from './StatsTracker';
import { EventBus } from './EventBus';
import { EventLog } from '../ui/EventLog';
import { FactionId } from '../data/Factions';
import { DraftModifier } from '../data/DraftModifiers';
import { VersusManager } from './multiplayer/VersusManager';
import { SidebarOverlay } from '../ui/SidebarOverlay';

/**
 * Context passed to GameMode for initialization.
 * Contains everything a mode needs to set up its systems and UI.
 */
export interface GameModeContext {
  scene: Phaser.Scene;
  economy: EconomyManager;
  incomeMgr: IncomeManager;
  sendMgr: SendManager;
  statsTracker: StatsTracker;
  eventBus: EventBus;
  eventLog: EventLog;
  faction: FactionId | null;
  modifier: DraftModifier | null;
  versus: VersusManager | null;
  sidebarTopY: number; // Y position for sidebar panels
}

/**
 * Interface for game modes. Each mode controls its own economy UI,
 * send system, and per-frame updates. GameScene delegates to this.
 */
export interface GameMode {
  readonly id: MatchMode;

  /** Create mode-specific UI panels and register hotkeys */
  createUI(ctx: GameModeContext): void;

  /** Per-frame update (e.g. tick essence, update panels) */
  update(delta: number): void;

  /** Called when a wave clears — mode-specific income/rewards */
  onWaveCleared(waveNum: number): void;

  /** Can the player start the next wave? (e.g. check cooldowns) */
  canStartWave(): boolean;

  /** Handle a send purchase attempt. Returns true if handled. */
  handleSend(sendId: string): boolean;

  /** Called when a new wave starts spawning */
  onWaveStart?(wave: WaveDefinition, waveNum: number): void;

  /** Move mode-specific sidebar panels into the overlay (tablet mode) */
  reparentSidebarPanels?(overlay: SidebarOverlay): void;

  /** Clean up mode-specific resources (panels, keyboard listeners) on scene shutdown */
  destroy?(): void;
}
