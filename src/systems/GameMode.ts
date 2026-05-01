import * as Phaser from 'phaser';
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
  /** Plan 14: campaign mission restrictions. Set when the scene was
   *  launched as a campaign mission; null otherwise. Modes read this
   *  to gate sends / frontier purchases before they happen. */
  missionRestrictions?: {
    noSends?: boolean;
    noFrontier?: boolean;
    allowedTowerIds?: string[];
    allowedFactions?: FactionId[];
    maxTowers?: number;
    noWalls?: boolean;
  } | null;
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

  /**
   * Convert a Celestial `life_on_kill` proc into the mode's defensive-pool
   * replenish. Default (returns false) lets GameScene do `this.lives +=
   * count` — the Standard behaviour. Override to handle differently.
   *   - Standard / Gauntlet / Circle: return false (fall back to +lives)
   *   - Hero Defense: heal base HP by 5% of max per proc, return true
   *
   * Called once per wave with the summed `count` from every Celestial
   * tower that procced during the wave.
   */
  onLifeGain?(count: number, towerLabel?: string): boolean;

  /**
   * Query mode-specific damage shields that should absorb base/life damage
   * before it takes effect. Returns the amount of damage the mode's shields
   * absorbed. Used by `leak_absorb` (Celestial Sanctuary) in HD where the
   * shield pool drains against arena base damage.
   */
  absorbDamage?(damage: number): number;

  /** Move mode-specific sidebar panels into the overlay (tablet mode) */
  reparentSidebarPanels?(overlay: SidebarOverlay): void;

  /** Clean up mode-specific resources (panels, keyboard listeners) on scene shutdown */
  destroy?(): void;
}
