/**
 * GameUIStore — reactive state bridge between Phaser GameScene and DOM UI panels.
 *
 * GameScene writes to the store imperatively (e.g. store.selectTower(tower)).
 * Preact components subscribe via useGameUI() hook and re-render on changes.
 *
 * This replaces the old pattern of GameScene calling towerInfo.show(tower)
 * directly on Phaser display objects.
 */
import { Tower } from '../entities/Tower';
import { Creep } from '../entities/Creep';
import { WaveDefinition } from '../data/WaveDefinitions';

// ─── Types ──────────────────────────────────────────────

export interface TowerStats {
  name: string;
  level: number;
  maxLevel: number;
  cost: number;
  sellValue: number;
  damage: number;
  range: number;
  fireRate: number;
  damageType: string;
  isUltimate: boolean;
  canUpgrade: boolean;
  upgradeCost: number;
  /** Formatted trait descriptions */
  traits: string[];
  /** Aura buff descriptions (from adjacent towers) */
  auraBuffs: string[];
  /** Upgrade preview: stat deltas */
  upgradePreview: { dmg: string; rng: string; spd: string } | null;
  /** Raw tower reference for callbacks */
  _tower: Tower;
}

export interface WavePreview {
  waveNum: number;
  label: string;
  creepTypes: string;
  count: number;
  isBoss: boolean;
}

export interface SendOption {
  id: string;
  name: string;
  cost: number;
  income: number;
  tier: number;
  hotkey: string;
  locked: boolean;
  unlockWave: number;
}

export interface FrontierBuildingInfo {
  id: string;
  name: string;
  cost: number;
  description: string;
  mechanic: string;
}

export interface OwnedBuildingInfo {
  defId: string;
  name: string;
  mechanic: string;
  /** Mechanic-specific state label (e.g. "Dig Lv3", "4 stacks", "Dormant 2w") */
  status: string;
  destroyed: boolean;
  /** Grouped count (when in grouped view) */
  count?: number;
}

export interface FrontierState {
  available: FrontierBuildingInfo[];
  owned: OwnedBuildingInfo[];
}

export interface EventLogEntry {
  id: number;
  text: string;
  color: string;
  time: number;
}

export interface GameUIState {
  /** Whether the game is active (sidebar should render) */
  active: boolean;
  /** Currently selected tower (null = nothing selected) */
  selectedTower: TowerStats | null;
  /** Current wave number */
  currentWave: number;
  /** Total waves (0 = endless) */
  totalWaves: number;
  /** Upcoming wave previews */
  upcomingWaves: WavePreview[];
  /** Auto-play state */
  autoPlay: boolean;
  /** Current gold */
  gold: number;
  /** Current lives */
  lives: number;
  /** Is the sidebar overlay open (mobile/tablet) */
  sidebarOpen: boolean;
  /** Match mode */
  matchMode: string;
  /** Game speed multiplier */
  speed: number;
  /** Is game paused */
  paused: boolean;
  /** Send options for the send panel */
  sendOptions: SendOption[];
  /** Event log entries (most recent first, max 20) */
  eventLog: EventLogEntry[];
  /** Frontier buildings state */
  frontier: FrontierState;
}

type Listener = () => void;

// ─── Store ──────────────────────────────────────────────

class GameUIStoreClass {
  private state: GameUIState = this.defaultState();
  private listeners: Set<Listener> = new Set();
  private callbacks: {
    onUpgrade?: (tower: Tower) => void;
    onSell?: (tower: Tower) => void;
    onToggleSidebar?: () => void;
    onStartWave?: () => void;
    onToggleAutoPlay?: () => void;
    onSetSpeed?: (speed: number) => void;
    onSend?: (sendId: string) => void;
    onFrontierPurchase?: (buildingId: string) => void;
    onFrontierAction?: (action: string, buildingIdx: number) => void;
    onFrontierBatchAction?: (action: string, defId: string) => void;
  } = {};

  private defaultState(): GameUIState {
    return {
      active: false,
      selectedTower: null,
      currentWave: 0,
      totalWaves: 0,
      upcomingWaves: [],
      autoPlay: false,
      gold: 0,
      lives: 0,
      sidebarOpen: false,
      matchMode: 'standard',
      speed: 1,
      paused: false,
      sendOptions: [],
      eventLog: [],
      frontier: { available: [], owned: [] },
    };
  }

  // ─── Getters ────────────────────────────────────────

  getState(): GameUIState {
    return this.state;
  }

  // ─── Mutations (called by GameScene) ────────────────

  /** Activate the game sidebar (called when GameScene starts) */
  activate(matchMode: string, totalWaves: number): void {
    this.state = { ...this.defaultState(), active: true, matchMode, totalWaves };
    this.notify();
  }

  /** Deactivate (called when game ends) */
  deactivate(): void {
    this.state = this.defaultState();
    this.notify();
  }

  /** Select a tower — shows the tower info panel */
  selectTower(stats: TowerStats): void {
    this.state = { ...this.state, selectedTower: stats };
    this.notify();
  }

  /** Deselect tower — hides the tower info panel */
  deselectTower(): void {
    this.state = { ...this.state, selectedTower: null };
    this.notify();
  }

  /** Update economy display */
  updateEconomy(gold: number, lives: number): void {
    if (this.state.gold === gold && this.state.lives === lives) return;
    this.state = { ...this.state, gold, lives };
    this.notify();
  }

  /** Update wave info */
  updateWaves(currentWave: number, upcomingWaves: WavePreview[]): void {
    this.state = { ...this.state, currentWave, upcomingWaves };
    this.notify();
  }

  /** Update auto-play state */
  setAutoPlay(active: boolean): void {
    this.state = { ...this.state, autoPlay: active };
    this.notify();
  }

  /** Update game speed */
  setSpeed(speed: number): void {
    this.state = { ...this.state, speed };
    this.notify();
  }

  /** Update paused state */
  setPaused(paused: boolean): void {
    this.state = { ...this.state, paused };
    this.notify();
  }

  /** Update frontier state */
  updateFrontier(frontier: FrontierState): void {
    this.state = { ...this.state, frontier };
    this.notify();
  }

  /** Update send panel options */
  updateSendOptions(options: SendOption[]): void {
    this.state = { ...this.state, sendOptions: options };
    this.notify();
  }

  /** Add an event log message */
  private _logId = 0;
  addLogEntry(text: string, color: string = '#ccc'): void {
    const entry: EventLogEntry = { id: this._logId++, text, color, time: Date.now() };
    const log = [entry, ...this.state.eventLog].slice(0, 20);
    this.state = { ...this.state, eventLog: log };
    this.notify();
  }

  /** Toggle sidebar overlay (mobile) */
  toggleSidebar(): void {
    this.state = { ...this.state, sidebarOpen: !this.state.sidebarOpen };
    this.notify();
    this.callbacks.onToggleSidebar?.();
  }

  // ─── Callbacks (registered by GameScene) ────────────

  registerCallbacks(cbs: typeof this.callbacks): void {
    this.callbacks = { ...this.callbacks, ...cbs };
  }

  /** Called by DOM panel when user clicks upgrade */
  requestUpgrade(tower: Tower): void {
    this.callbacks.onUpgrade?.(tower);
  }

  /** Called by DOM panel when user clicks sell */
  requestSell(tower: Tower): void {
    this.callbacks.onSell?.(tower);
  }

  requestStartWave(): void {
    this.callbacks.onStartWave?.();
  }

  requestToggleAutoPlay(): void {
    this.callbacks.onToggleAutoPlay?.();
  }

  requestSetSpeed(speed: number): void {
    this.callbacks.onSetSpeed?.(speed);
  }

  requestSend(sendId: string): void {
    this.callbacks.onSend?.(sendId);
  }

  requestFrontierPurchase(buildingId: string): void {
    this.callbacks.onFrontierPurchase?.(buildingId);
  }

  requestFrontierAction(action: string, buildingIdx: number): void {
    this.callbacks.onFrontierAction?.(action, buildingIdx);
  }

  requestFrontierBatchAction(action: string, defId: string): void {
    this.callbacks.onFrontierBatchAction?.(defId, defId);
  }

  // ─── Subscription ───────────────────────────────────

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const fn of this.listeners) fn();
  }
}

export const GameUIStore = new GameUIStoreClass();
