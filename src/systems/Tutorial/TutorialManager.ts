/**
 * TutorialManager — singleton state machine + trigger router.
 *
 * Responsibilities:
 *  1. Hold the "current track + step" state and notify Preact subscribers.
 *  2. Persist which tracks have been completed/skipped across sessions.
 *  3. Auto-trigger tracks on first-launch, first-time screen entry, first
 *     time a faction/mode is chosen. "First time" means: not already in
 *     completedTracks.
 *  4. Accept external EventBus events (wired by GameScene via UIBridge)
 *     so action-gated steps can advance when the player actually places
 *     a tower / starts a wave.
 *
 * Follows the same subscribe/notify pattern as GameUIStore so the Preact
 * useTutorial() hook can re-render on step changes.
 */
import { UIBridge, ScreenId } from '../../ui/UIBridge';
import { EventBus, GameEvents } from '../EventBus';
import { TutorialPersistence, TutorialState } from './TutorialPersistence';
import { getTrack, TutorialTrack, TutorialStep } from './TutorialTracks';

type Listener = () => void;

export interface ActiveTutorial {
  track: TutorialTrack;
  stepIndex: number;
  step: TutorialStep;
}

class TutorialManagerClass {
  private persisted: TutorialState = TutorialPersistence.load();
  private active: ActiveTutorial | null = null;
  private listeners: Set<Listener> = new Set();

  /** The most recent GameScene EventBus. GameScene pushes it here on create()
   *  and clears it on shutdown. Used to subscribe to in-game events for
   *  action-gated steps. */
  private gameEventBus: EventBus | null = null;
  private currentEventBinding: { event: keyof GameEvents; fn: (...args: any[]) => void } | null = null;

  /** True once init() has run. Guards against double-subscribe in dev/HMR. */
  private initialized = false;

  /** Track id queued by GameScene create() but deferred until the match-load
   *  LoadingScreen has fully dismissed. Otherwise the in-game primers would
   *  fire while the faction splash is still covering the canvas. */
  private pendingAfterMatchLoad: string | null = null;

  // ─── Lifecycle ──────────────────────────────────────────

  init(): void {
    if (this.initialized) return;
    this.initialized = true;

    UIBridge.onScreenChange((screen, data) => this.onScreenChange(screen, data));

    // First launch — wait for the AppLoadingScreen splash to fully dismiss.
    // The splash emits 'app-splash-dismissed' once its fade-out completes,
    // so we don't race it with a timer.
    window.addEventListener('app-splash-dismissed', () => {
      // Small buffer lets the menu finish mounting so DOM targets resolve.
      setTimeout(() => this.maybeStartFirstLaunch(), 200);
    });

    // In-game primers — the match-load splash (LoadingScreen) runs for a
    // minimum of 5s and fades out over 200ms. GameScene.create() fires long
    // before that, so in-match tracks get queued here and only start once
    // LoadingScreen signals 'match-loading-dismissed'.
    window.addEventListener('match-loading-dismissed', () => {
      const trackId = this.pendingAfterMatchLoad;
      this.pendingAfterMatchLoad = null;
      if (!trackId) return;
      this.maybeAutoStart(trackId);
    });
  }

  /** Called by GameScene once its EventBus is created, and again with null
   *  when the scene is shut down. */
  setGameEventBus(bus: EventBus | null): void {
    // Tear down any existing event binding — new bus, new listener.
    if (this.currentEventBinding && this.gameEventBus) {
      this.gameEventBus.off(this.currentEventBinding.event, this.currentEventBinding.fn as any);
    }
    this.gameEventBus = bus;
    if (this.active) this.rebindEventAdvance();
  }

  // ─── Query ──────────────────────────────────────────────

  getActive(): ActiveTutorial | null {
    return this.active;
  }

  isCompleted(trackId: string): boolean {
    return this.persisted.completedTracks.includes(trackId);
  }

  hasDismissedFirstLaunch(): boolean {
    return this.persisted.dismissedFirstLaunch;
  }

  // ─── Control ────────────────────────────────────────────

  /** Start a track by id. If already active, the call is ignored so a late
   *  trigger (e.g. screen change during a tour) can't hijack the active run. */
  start(trackId: string): void {
    if (this.active) return;
    const track = getTrack(trackId);
    if (!track || track.steps.length === 0) return;
    this.active = { track, stepIndex: 0, step: track.steps[0] };
    this.rebindEventAdvance();
    this.runStepEnter();
    this.notify();
  }

  /** Advance to next step, or complete the track if already on the last one. */
  next(): void {
    if (!this.active) return;
    const { track, stepIndex } = this.active;
    if (stepIndex + 1 >= track.steps.length) {
      this.complete();
      return;
    }
    this.active = { track, stepIndex: stepIndex + 1, step: track.steps[stepIndex + 1] };
    this.rebindEventAdvance();
    this.runStepEnter();
    this.notify();
  }

  private runStepEnter(): void {
    if (!this.active) return;
    try { this.active.step.onEnter?.(); }
    catch (err) { console.warn('[Tutorial] step onEnter threw:', err); }
  }

  /** Skip the current track. Marks it completed so it won't re-trigger. */
  skip(): void {
    if (!this.active) return;
    this.markCompleted(this.active.track.id);
    this.clearActive();
    // Skipping any track also implies they've seen the first-launch flow.
    this.markFirstLaunchDismissed();
    this.notify();
  }

  /** Finish the current track naturally. */
  complete(): void {
    if (!this.active) return;
    this.markCompleted(this.active.track.id);
    this.clearActive();
    this.markFirstLaunchDismissed();
    this.notify();
  }

  /** Replay a track from the Help menu — bypasses the "already completed"
   *  gate, but doesn't clear the completed flag. */
  replay(trackId: string): void {
    if (this.active) this.clearActive();
    const track = getTrack(trackId);
    if (!track || track.steps.length === 0) return;
    this.active = { track, stepIndex: 0, step: track.steps[0] };
    this.rebindEventAdvance();
    this.runStepEnter();
    this.notify();
  }

  /** Clear all tutorial progress — useful from a debug path. */
  resetAll(): void {
    this.persisted = { completedTracks: [], dismissedFirstLaunch: false, version: this.persisted.version };
    TutorialPersistence.save(this.persisted);
    this.clearActive();
    this.notify();
  }

  // ─── Subscription ───────────────────────────────────────

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  }

  private notify(): void {
    for (const fn of this.listeners) fn();
  }

  // ─── Triggers ───────────────────────────────────────────

  private maybeStartFirstLaunch(): void {
    if (this.persisted.dismissedFirstLaunch) return;
    if (this.active) return;
    // Only start basics if the player is currently on the menu screen — if
    // they've already navigated away we don't want to yank them back.
    if (UIBridge.getScreen() !== 'menu' && UIBridge.getScreen() !== null) return;
    this.start('basics');
  }

  private onScreenChange(screen: ScreenId, data: Record<string, unknown>): void {
    // Mode primer — fires when FactionSelectScreen is shown with a fresh mode.
    if (screen === 'factionselect') {
      const mode = typeof data.mode === 'string' ? data.mode : null;
      if (mode) this.maybeAutoStart(`mode:${mode}`);
    }
    // Faction primer — fires on the screens that follow faction selection
    // (hero-select, creep-faction-select, draft). Any of them carries the
    // faction id, so we trigger on whichever shows up first.
    if (screen === 'heroselect' || screen === 'creepfactionselect' || screen === 'draft') {
      const faction = typeof data.faction === 'string' ? data.faction : null;
      if (faction) this.maybeAutoStart(`faction:${faction}`);
    }
  }

  /** Called by scenes/screens that aren't routed through UIBridge.show() —
   *  e.g. LobbyScene (a Phaser scene). main.ts wires this up. */
  onLobbyOpened(): void {
    this.maybeAutoStart('multiplayer');
  }

  /** Called from GameScene on create() so the income-primer fires once per
   *  mode — but deferred until the match-load splash has faded out. The
   *  match-loading-dismissed listener drains `pendingAfterMatchLoad`. */
  onGameSceneCreated(matchMode: string): void {
    // Income track ids map 1:1 with mode ids where applicable.
    const trackId =
      matchMode === 'battle'       ? 'income_battle'   :
      matchMode === 'hero_defense' ? 'income_hero'     :
      // standard/endless/gauntlet share the income_standard primer.
      (matchMode === 'standard' || matchMode === 'endless' || matchMode === 'gauntlet') ? 'income_standard' :
      null;
    if (!trackId) return;
    if (this.isCompleted(trackId)) return;
    this.pendingAfterMatchLoad = trackId;
  }

  private maybeAutoStart(trackId: string): void {
    if (this.active) return;
    if (this.isCompleted(trackId)) return;
    if (!getTrack(trackId)) return;
    // Small delay lets the target DOM mount before we try to resolve it.
    setTimeout(() => {
      if (this.active) return;
      if (this.isCompleted(trackId)) return;
      this.start(trackId);
    }, 250);
  }

  // ─── Event-gated step advance ───────────────────────────

  private rebindEventAdvance(): void {
    if (this.currentEventBinding && this.gameEventBus) {
      this.gameEventBus.off(this.currentEventBinding.event, this.currentEventBinding.fn as any);
      this.currentEventBinding = null;
    }
    if (!this.active) return;
    const advance = this.active.step.advanceOn;
    if (!advance || advance === 'click') return;
    if (!this.gameEventBus) return;

    const event = advance.event;
    const fn = (..._args: any[]) => {
      // Guard against stale fires after step moved on.
      if (!this.active || this.active.step.advanceOn === 'click') return;
      if (this.active.step.advanceOn && 'event' in this.active.step.advanceOn && this.active.step.advanceOn.event === event) {
        this.next();
      }
    };
    this.gameEventBus.on(event, fn as any);
    this.currentEventBinding = { event, fn };
  }

  // ─── Persistence helpers ────────────────────────────────

  private markCompleted(trackId: string): void {
    if (this.persisted.completedTracks.includes(trackId)) return;
    this.persisted = {
      ...this.persisted,
      completedTracks: [...this.persisted.completedTracks, trackId],
    };
    TutorialPersistence.save(this.persisted);
  }

  private markFirstLaunchDismissed(): void {
    if (this.persisted.dismissedFirstLaunch) return;
    this.persisted = { ...this.persisted, dismissedFirstLaunch: true };
    TutorialPersistence.save(this.persisted);
  }

  private clearActive(): void {
    if (this.currentEventBinding && this.gameEventBus) {
      this.gameEventBus.off(this.currentEventBinding.event, this.currentEventBinding.fn as any);
    }
    this.currentEventBinding = null;
    this.active = null;
  }
}

export const TutorialManager = new TutorialManagerClass();
