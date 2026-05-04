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

/** Upgrade choice surfaced in the tower info panel. Linear towers
 *  get a single entry (branchId=null); branching towers get the
 *  default path plus one entry per branch. */
export interface TowerUpgradeOption {
  branchId: string | null;
  label: string;
  cost: number;
  /** Tower name AFTER this option resolves. For branches that
   *  rename the tower this shows the new name in tooltips. */
  resolvedName: string;
  /** Precomputed stat deltas for the preview row. */
  dmg: string;
  rng: string;
  spd: string;
}

export interface TowerStats {
  name: string;
  level: number;
  maxLevel: number;
  cost: number;
  sellValue: number;
  damage: number;
  range: number;
  fireRate: number;
  /** Values after aura/buff resolution. Equal to base when no buffs active. */
  effectiveDamage: number;
  effectiveRange: number;
  effectiveFireRate: number;
  damageType: string;
  isUltimate: boolean;
  canUpgrade: boolean;
  upgradeCost: number;
  /** Circle co-op: false when tower belongs to another player. Disables upgrade/sell. */
  owned: boolean;
  /** Formatted trait descriptions */
  traits: string[];
  /** Aura buff descriptions (from adjacent towers) */
  auraBuffs: string[];
  /** Upgrade preview: stat deltas (default path — back-compat). */
  upgradePreview: { dmg: string; rng: string; spd: string } | null;
  /** All upgrade choices currently available (≥2 when this tower
   *  is at a branch point). Drives the info panel's button row. */
  upgradeOptions: TowerUpgradeOption[];
  /** Raw tower reference for callbacks */
  _tower: Tower;
}

export interface CreepEffect {
  /** Short label like "Slow 40%" or "Burn 8dps" */
  label: string;
  /** Remaining duration in seconds (already rounded to 1dp) */
  durationS: number;
  /** Short kind tag for color accents (slow/burn/poison/root/...) */
  kind: string;
}

export interface CreepStats {
  /** Display name: "Military Tank" */
  name: string;
  /** Faction primary color (hex string). null for unfactioned creeps. */
  factionColor: string | null;
  isBoss: boolean;
  hp: number;
  maxHp: number;
  /** Armor tier name (light/medium/heavy) */
  armor: string;
  baseArmor: string;
  speed: number;
  baseSpeed: number;
  effects: CreepEffect[];
  /** Trait labels like "Shield: 40/120" or "Heal aura (3% nearby/s)" */
  traits: string[];
  /** Identity reference — used to detect "same creep re-inspected" across frames. */
  _creep: Creep;
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

export interface EssenceGeneratorInfo {
  id: string;
  name: string;
  cost: number;
  essencePerSec: number;
  description: string;
}

export interface EssenceSendInfo {
  id: string;
  name: string;
  essenceCost: number;
  incomeReward: number;
  hotkey: string;
}

export interface EssenceState {
  essence: number;
  rate: number;
  generators: EssenceGeneratorInfo[];
  sends: EssenceSendInfo[];
  owned: { name: string; count: number; rate: number }[];
}

export interface HeroItemInfo {
  slotId: string;
  name: string;
  tier: number;
  maxTier: number;
  cost: number;
  description: string;
  owned: boolean;
  color: string;
}

export interface TomeInfo {
  id: string;
  label: string;
  cost: number;
}

export interface AccessoryInfo {
  id: string;
  name: string;
  description: string;
  cost: number;
  passive: boolean;
  equipped: boolean;
  cooldown?: number;
}

export interface AbilityInfo {
  key: string;
  name: string;
  ready: boolean;
  cooldown: number;
  upgrades: number;
}

export interface HeroShopState {
  heroName: string;
  level: number;
  maxLevel: boolean;
  xp: number;
  xpNeeded: number;
  hp: number;
  maxHp: number;
  damage: number;
  attackSpeed: number;
  items: HeroItemInfo[];
  tomes: TomeInfo[];
  equippedAccessories: AccessoryInfo[];
  accessoryOffers: AccessoryInfo[];
  nextRotationWave: number;
  abilities: AbilityInfo[];
  ultimate: AbilityInfo | null;
  pendingUpgrades: number;
  upgradeOptions: { id: string; label: string; desc: string }[];
}

export interface EventLogEntry {
  id: number;
  text: string;
  color: string;
  time: number;
}

/** Per-player row in the Circle Co-op roster panel. GameScene
 *  snapshots these each frame from `CircleManager` + the kill /
 *  bot-gold / tower-ownership suppliers so the DOM component can
 *  render them without touching any of the live systems. */
export interface CircleRosterPlayer {
  index: number;
  kind: 'me' | 'bot' | 'remote';
  /** Faction display name (lowercased faction id, e.g. 'nature'). */
  faction: string;
  /** Zone color as a CSS hex string (e.g. '#88cc22'). */
  colorHex: string;
  ready: boolean;
  gold: number | null;   // bots only — remote peers keep this null
  towers: number;
  kills: number;
}

export interface CircleRosterState {
  players: CircleRosterPlayer[];
  /** Remaining seconds on the current wave countdown (-1 = no timer). */
  timerS: number;
  sharedLives: number;
}

export interface GameUIState {
  /** Whether the game is active (sidebar should render) */
  active: boolean;
  /** Currently selected tower (null = nothing selected) */
  selectedTower: TowerStats | null;
  /** Currently inspected creep (null = no creep inspection active) */
  selectedCreep: CreepStats | null;
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
  /** Remaining seconds on the ad-unlocked 3× speed boost (strategy-doc #5).
   *  0 when no boost is active. Rounded to seconds (not ms) by GameScene
   *  so the snapshot only changes once per second — prevents a 60Hz
   *  re-render while the boost timer ticks down. */
  speedBoostRemainingSec: number;
  /** Is game paused */
  paused: boolean;
  /** Total income per wave */
  income: number;
  /** Is wave active */
  waveActive: boolean;
  /** Is between waves (can start next) */
  betweenWaves: boolean;
  /** Versus timer (-1 if no timer) */
  versusTimer: number;
  /** Tower dock bar state */
  towerBar: {
    towers: { id: string; name: string; cost: number; hotkey: string; color: number }[];
    selectedIndex: number;
  };
  /** Send options for the send panel */
  sendOptions: SendOption[];
  /** Event log entries (most recent first, max 20) */
  eventLog: EventLogEntry[];
  /** Frontier buildings state */
  frontier: FrontierState;
  /** Essence/dual economy state (Battle mode) */
  essence: EssenceState | null;
  /** Hero item shop state (Hero Defense mode) */
  heroShop: HeroShopState | null;
  /** Continue-ad offer. Set when the player's lives hit zero and we
   *  can still legitimately offer a revive. Drives the
   *  ContinueOfferModal in the DOM layer; GameScene sets it and pauses
   *  the update loop, clears it once the player picks (or the ad
   *  errors out). null most of the time. */
  continueOffer: ContinueOffer | null;
  /** Circle Co-op roster snapshot. `null` on any non-Circle match so
   *  the DOM panel stays unmounted. GameScene rewrites this each
   *  frame; shallow-equality in the setter skips the notify when
   *  nothing changed. */
  circleRoster: CircleRosterState | null;
  /** Plan 12: attacker-mode breakthrough progress. Populated only when
   *  `matchMode === 'attacker'`. The HUD swaps "Lives: 999" for a
   *  meaningful "Breakthrough: X / N" readout — in attacker mode the
   *  player WANTS leaks, so the lives counter is misleading. */
  attackerProgress: { leaks: number; threshold: number } | null;
  /** Plan 14 v2: in-mission objective tracker state. Populated each
   *  frame when a campaign mission is active; null otherwise. Drives
   *  the MISSION sidebar panel — players see live which star
   *  objectives they're currently meeting and which they still need. */
  missionPanel: MissionPanelState | null;
  /** Plan 12 v2: AttackerComposer snapshot. Set when an attacker
   *  mission is between waves and the player should compose their
   *  next wave; cleared while a wave is in flight. */
  attackerComposer: AttackerComposerUIState | null;
}

export interface MissionPanelState {
  missionName: string;
  archetypeId: string;
  /** Each objective with its live met/unmet state evaluated against a
   *  hypothetical "if I won right now" snapshot. Order: star 1 (always
   *  "win"), star 2, star 3 if declared. */
  objectives: Array<{ star: 1 | 2 | 3; label: string; met: boolean }>;
}

/** Plan 12 v2: snapshot of the AttackerComposer pushed to the DOM each
 *  time the player adjusts a pick. The overlay reads this and renders
 *  palette cards + a Send Wave button. Null when not in attacker v2
 *  mode, or when the wave is in flight (composer hidden mid-wave). */
export interface AttackerComposerUIState {
  /** Palette entries visible at this mission's idx — the overlay maps
   *  these to cards. */
  entries: Array<{
    creepType: string;
    label: string;
    cost: number;
    description: string;
    /** Currently-picked count of this entry. */
    count: number;
  }>;
  /** Essence spent so far this wave. */
  spent: number;
  /** Total essence budget this wave. */
  budget: number;
  /** Wave number that will be sent when the player hits Send. */
  waveNum: number;
  /** True iff at least one creep is picked. Disables Send button below. */
  canSend: boolean;
}

export interface ContinueOffer {
  /** How many lives the player gets back if they accept. */
  livesGranted: number;
  /** Fires when the user taps "Watch Ad". GameScene wires this to
   *  platformBridge().ads.showRewarded() + reward grant. */
  onAccept: () => void;
  /** Fires when the user taps "No thanks" / closes — GameScene falls
   *  through to the normal game-over path. */
  onDecline: () => void;
}

type Listener = () => void;

/** Shallow equality for CreepStats snapshots — field-by-field comparison
 *  so the 60Hz updateSelectedCreep doesn't re-render unless something
 *  actually changed (HP/armor/speed/effects). */
function creepStatsEqual(a: CreepStats, b: CreepStats): boolean {
  if (a.hp !== b.hp || a.maxHp !== b.maxHp) return false;
  if (a.armor !== b.armor || a.baseArmor !== b.baseArmor) return false;
  if (a.speed !== b.speed || a.baseSpeed !== b.baseSpeed) return false;
  if (a.isBoss !== b.isBoss || a.name !== b.name) return false;
  if (a.factionColor !== b.factionColor) return false;
  if (a.effects.length !== b.effects.length || a.traits.length !== b.traits.length) return false;
  for (let i = 0; i < a.effects.length; i++) {
    const ea = a.effects[i], eb = b.effects[i];
    if (ea.label !== eb.label || ea.durationS !== eb.durationS || ea.kind !== eb.kind) return false;
  }
  for (let i = 0; i < a.traits.length; i++) {
    if (a.traits[i] !== b.traits[i]) return false;
  }
  return true;
}

/** Shallow equality for CircleRosterState — per-row field check so
 *  a snapshot with identical values (common across frames when
 *  nothing is happening) doesn't trigger a DOM re-render. */
function circleRosterEqual(a: CircleRosterState, b: CircleRosterState): boolean {
  if (a.timerS !== b.timerS || a.sharedLives !== b.sharedLives) return false;
  if (a.players.length !== b.players.length) return false;
  for (let i = 0; i < a.players.length; i++) {
    const pa = a.players[i], pb = b.players[i];
    if (pa.index !== pb.index || pa.kind !== pb.kind) return false;
    if (pa.faction !== pb.faction || pa.colorHex !== pb.colorHex) return false;
    if (pa.ready !== pb.ready || pa.gold !== pb.gold) return false;
    if (pa.towers !== pb.towers || pa.kills !== pb.kills) return false;
  }
  return true;
}

// ─── Store ──────────────────────────────────────────────

class GameUIStoreClass {
  private state: GameUIState = this.defaultState();
  private listeners: Set<Listener> = new Set();
  private callbacks: {
    onUpgrade?: (tower: Tower, branchId?: string | null) => void;
    onSell?: (tower: Tower) => void;
    onToggleSidebar?: () => void;
    onStartWave?: () => void;
    onToggleAutoPlay?: () => void;
    onSetSpeed?: (speed: number) => void;
    onSend?: (sendId: string) => void;
    onFrontierPurchase?: (buildingId: string) => void;
    onFrontierAction?: (action: string, buildingIdx: number) => void;
    onFrontierBatchAction?: (action: string, defId: string) => void;
    onBuyEssenceGenerator?: (genId: string) => void;
    onEssenceSend?: (sendId: string) => void;
    onBuyHeroItem?: (slotId: string) => void;
    onBuyTome?: (tomeId: string) => void;
    onBuyAccessory?: (index: number) => void;
    onHeroUpgrade?: (optionId: string) => void;
    onUpgradeAbility?: (abilityIndex: number) => void;
    onSelectDockTower?: (index: number) => void;
    onDeselectTower?: () => void;
    onCycleSpeed?: () => void;
    onRequestSpeedBoost?: () => void;
    onPause?: () => void;
    onFrontierDoodad?: (color: number, buildingId: string, factionFallback?: string) => { destroy(): void } | null | undefined;
    onAttackerAdjust?: (creepTypeId: string, delta: number) => void;
    onAttackerClear?: () => void;
    onAttackerSendWave?: () => void;
  } = {};

  private defaultState(): GameUIState {
    return {
      active: false,
      selectedTower: null,
      selectedCreep: null,
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
      income: 0,
      waveActive: false,
      betweenWaves: false,
      versusTimer: -1,
      towerBar: { towers: [], selectedIndex: -1 },
      sendOptions: [],
      eventLog: [],
      frontier: { available: [], owned: [] },
      essence: null,
      heroShop: null,
      continueOffer: null,
      speedBoostRemainingSec: 0,
      circleRoster: null,
      attackerProgress: null,
      missionPanel: null,
      attackerComposer: null,
    };
  }

  /** Replace the circle roster snapshot. Shallow-compares each row
   *  so a frame-for-frame identical snapshot doesn't cost a re-
   *  render. Pass `null` to hide the panel (non-Circle matches). */
  setCircleRoster(next: CircleRosterState | null): void {
    const prev = this.state.circleRoster;
    if (prev === next) return;
    if (prev && next && circleRosterEqual(prev, next)) return;
    this.state = { ...this.state, circleRoster: next };
    this.notify();
  }

  /** Plan 12: push attacker-mode breakthrough progress for the HUD.
   *  Pass null on non-attacker matches so StatusBarDOM falls back to
   *  the regular Lives readout. Skips notify when nothing changed. */
  setAttackerProgress(next: { leaks: number; threshold: number } | null): void {
    const prev = this.state.attackerProgress;
    if (prev === next) return;
    if (prev && next && prev.leaks === next.leaks && prev.threshold === next.threshold) return;
    this.state = { ...this.state, attackerProgress: next };
    this.notify();
  }

  /** Plan 14 v2: push in-mission objective tracker state. Pushed each
   *  frame from GameScene only on campaign mission runs. Skip notify
   *  when nothing changed (compares per-objective met flag — labels +
   *  archetype don't change once the mission starts). */
  setMissionPanel(next: MissionPanelState | null): void {
    const prev = this.state.missionPanel;
    if (prev === next) return;
    if (prev && next
      && prev.missionName === next.missionName
      && prev.objectives.length === next.objectives.length
      && prev.objectives.every((o, i) => o.met === next.objectives[i].met)) return;
    this.state = { ...this.state, missionPanel: next };
    this.notify();
  }

  /** Plan 12 v2: push the attacker-composer snapshot. Pass null to
   *  hide the overlay (e.g. while a wave is in flight). Skips notify
   *  when nothing changed so the per-frame push is cheap. */
  setAttackerComposer(next: AttackerComposerUIState | null): void {
    const prev = this.state.attackerComposer;
    if (prev === next) return;
    if (prev && next
      && prev.spent === next.spent
      && prev.budget === next.budget
      && prev.waveNum === next.waveNum
      && prev.canSend === next.canSend
      && prev.entries.length === next.entries.length
      && prev.entries.every((e, i) => e.count === next.entries[i].count && e.creepType === next.entries[i].creepType)) {
      return;
    }
    this.state = { ...this.state, attackerComposer: next };
    this.notify();
  }

  /** Surface the continue-ad offer. GameScene calls this on lives→0
   *  (outside tutorial / versus / already-used cases) and pauses its
   *  update loop until one of the callbacks fires. */
  offerContinue(offer: ContinueOffer): void {
    this.state = { ...this.state, continueOffer: offer };
    this.notify();
  }

  /** Clear the offer — called by the modal's action handlers after
   *  they invoke onAccept / onDecline. */
  clearContinueOffer(): void {
    if (this.state.continueOffer === null) return;
    this.state = { ...this.state, continueOffer: null };
    this.notify();
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

  /** Replace totalWaves after activate. Phaser scene reuse keeps the
   *  GameScene instance alive across matches, so `this.waves` from a
   *  prior run can be stale at activate-time — without a follow-up
   *  push the wave HUD shows the previous match's count (e.g. /20
   *  bleeding into a 5-wave Hero Duel mission). GameScene calls this
   *  immediately after `this.waves = getWavesForMode(...)`. */
  setTotalWaves(totalWaves: number): void {
    if (this.state.totalWaves === totalWaves) return;
    this.state = { ...this.state, totalWaves };
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

  /** Start inspecting a creep — shows the creep info panel */
  selectCreep(stats: CreepStats): void {
    this.state = { ...this.state, selectedCreep: stats };
    this.notify();
  }

  /** Push an updated snapshot for the inspected creep. No-op (and no
   *  re-render) when the new stats are observationally equal to the
   *  previous snapshot — prevents a 60Hz flood of setState calls while
   *  a creep walks uncontested. */
  updateSelectedCreep(stats: CreepStats): void {
    const prev = this.state.selectedCreep;
    if (prev && prev._creep === stats._creep && creepStatsEqual(prev, stats)) return;
    this.state = { ...this.state, selectedCreep: stats };
    this.notify();
  }

  /** Hide the creep info panel */
  deselectCreep(): void {
    if (this.state.selectedCreep === null) return;
    this.state = { ...this.state, selectedCreep: null };
    this.notify();
  }

  /** Update economy display */
  updateEconomy(gold: number, lives: number, income?: number): void {
    if (this.state.gold === gold && this.state.lives === lives && (income === undefined || this.state.income === income)) return;
    this.state = { ...this.state, gold, lives, income: income ?? this.state.income };
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

  /** Update wave/game state for status bar */
  updateGameState(waveActive: boolean, betweenWaves: boolean, speed: number, versusTimer: number = -1, speedBoostRemainingSec: number = 0): void {
    // Short-circuit on equal snapshot — this fires every tick.
    if (
      this.state.waveActive === waveActive &&
      this.state.betweenWaves === betweenWaves &&
      this.state.speed === speed &&
      this.state.versusTimer === versusTimer &&
      this.state.speedBoostRemainingSec === speedBoostRemainingSec
    ) return;
    this.state = { ...this.state, waveActive, betweenWaves, speed, versusTimer, speedBoostRemainingSec };
    this.notify();
  }

  /** Set tower bar towers */
  setTowerBar(towers: GameUIState['towerBar']['towers']): void {
    this.state = { ...this.state, towerBar: { ...this.state.towerBar, towers } };
    this.notify();
  }

  /** Update selected tower in dock */
  selectDockTower(index: number): void {
    if (this.state.towerBar.selectedIndex === index) return;
    this.state = { ...this.state, towerBar: { ...this.state.towerBar, selectedIndex: index } };
    this.notify();
  }

  /** Update essence state (Battle mode) */
  updateEssence(essence: EssenceState): void {
    this.state = { ...this.state, essence };
    this.notify();
  }

  /** Update hero shop state (Hero Defense mode) */
  updateHeroShop(heroShop: HeroShopState): void {
    this.state = { ...this.state, heroShop };
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
    const log = [entry, ...this.state.eventLog].slice(0, 100);
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
  requestUpgrade(tower: Tower, branchId: string | null = null): void {
    this.callbacks.onUpgrade?.(tower, branchId);
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

  requestCycleSpeed(): void {
    this.callbacks.onCycleSpeed?.();
  }

  requestSpeedBoost(): void {
    this.callbacks.onRequestSpeedBoost?.();
  }

  requestPause(): void {
    this.callbacks.onPause?.();
  }

  placeFrontierDoodad(color: number = 0xffaa44, buildingId: string = 'generic', factionFallback?: string): { destroy(): void } | null {
    return this.callbacks.onFrontierDoodad?.(color, buildingId, factionFallback) ?? null;
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
    this.callbacks.onFrontierBatchAction?.(action, defId);
  }

  requestBuyEssenceGenerator(genId: string): void {
    this.callbacks.onBuyEssenceGenerator?.(genId);
  }

  requestEssenceSend(sendId: string): void {
    this.callbacks.onEssenceSend?.(sendId);
  }

  requestBuyHeroItem(slotId: string): void {
    this.callbacks.onBuyHeroItem?.(slotId);
  }

  requestBuyTome(tomeId: string): void {
    this.callbacks.onBuyTome?.(tomeId);
  }

  requestBuyAccessory(index: number): void {
    this.callbacks.onBuyAccessory?.(index);
  }

  requestHeroUpgrade(optionId: string): void {
    this.callbacks.onHeroUpgrade?.(optionId);
  }

  requestUpgradeAbility(abilityIndex: number): void {
    this.callbacks.onUpgradeAbility?.(abilityIndex);
  }

  requestSelectDockTower(index: number): void {
    this.callbacks.onSelectDockTower?.(index);
  }

  /** Full deselect — clears the GameScene's inspected tower as well as
   *  the DOM's `selectedTower`, so the per-frame refresh in GameScene
   *  doesn't immediately re-push the snapshot back into the store. The
   *  raw `deselectTower()` only clears the DOM state; for user-driven
   *  dismissals (X button, panel collapse) always go through this. */
  requestDeselectTower(): void {
    if (this.callbacks.onDeselectTower) this.callbacks.onDeselectTower();
    else this.deselectTower();
  }

  /** Plan 12 v2: composer pick adjust (called by overlay +/- buttons). */
  requestAttackerAdjust(creepTypeId: string, delta: number): void {
    this.callbacks.onAttackerAdjust?.(creepTypeId, delta);
  }

  /** Plan 12 v2: clear all picks. */
  requestAttackerClear(): void {
    this.callbacks.onAttackerClear?.();
  }

  /** Plan 12 v2: lock picks and start the wave. */
  requestAttackerSendWave(): void {
    this.callbacks.onAttackerSendWave?.();
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
