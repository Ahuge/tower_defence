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
import * as Phaser from 'phaser';
import { UIBridge, ScreenId } from '../../ui/UIBridge';
import { EventBus, GameEvents } from '../EventBus';
import { TutorialPersistence, TutorialState } from './TutorialPersistence';
import { getTrack, TutorialTrack, TutorialStep } from './TutorialTracks';
import { resolveCanvasTargetRect, getGameCamera } from './TutorialTargets';
import { goToMenu } from '../../ui/navigation';
import { GameUIStore } from '../../ui/GameUIStore';

type Listener = () => void;

/**
 * Central animation + delay tuning for tutorial routing. Pulled up to
 * module scope so tweaking pacing doesn't require hunting through
 * half a dozen bare literals sprinkled across the file.
 */
const TIMING = {
  /** Delay after 'app-splash-dismissed' before starting the first-launch
   *  basics track — gives the menu DOM a moment to mount selectors. */
  FIRST_LAUNCH_DELAY_MS: 200,
  /** Delay after 'match-loading-dismissed' before kicking off the queued
   *  in-match track. Covers DOM mount + canvas settling. */
  MATCH_LOAD_DELAY_MS: 200,
  /** Delay between a skip/complete and the skip-hint check. Lets any
   *  scene transition finish so we don't fire the hint mid-navigation. */
  SKIP_HINT_AFTER_EVENT_MS: 500,
  /** Delay on menu screenChange before firing the skip-hint check —
   *  gives MenuScreen time to render the ? button. */
  SKIP_HINT_AFTER_MENU_MS: 350,
  /** Camera pan duration for canvas-target step transitions. */
  CAMERA_PAN_MS: 350,
  /** How long a pendingAfterMatchLoad record is considered live — after
   *  this timeout the queued trackId is discarded. Prevents a stale
   *  pending ref from surviving an aborted match-load. */
  PENDING_MATCH_LOAD_TTL_MS: 10_000,
  /** Delay inside `maybeAutoStart` before firing `start()`. Matches the
   *  historical buffer used when DOM targets weren't yet mounted. */
  AUTO_START_DELAY_MS: 250,
} as const;

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

  /** Track queued to fire once the match-load LoadingScreen has dismissed.
   *  `replay: true` bypasses the isCompleted gate — used when the player
   *  explicitly launches the tutorial match from a CTA or the Help list.
   *  `expiresAt` guards against a stale ref if the player aborts the
   *  match-load (close tab, back button mid-load). */
  private pendingAfterMatchLoad: { id: string; replay: boolean; expiresAt: number } | null = null;

  // ─── Lifecycle ──────────────────────────────────────────

  init(): void {
    if (this.initialized) return;
    this.initialized = true;

    UIBridge.onScreenChange((screen, data) => this.onScreenChange(screen, data));

    // First launch — wait for the AppLoadingScreen splash to fully dismiss.
    // The splash emits 'app-splash-dismissed' once its fade-out completes,
    // so we don't race it with a timer. Listeners registered here live for
    // the page lifetime (TutorialManager is a singleton); no cleanup needed.
    window.addEventListener('app-splash-dismissed', () => {
      // Small buffer lets the menu finish mounting so DOM targets resolve.
      setTimeout(() => this.maybeStartFirstLaunch(), TIMING.FIRST_LAUNCH_DELAY_MS);
    });

    // Tutorial CTAs dispatch these events so TutorialTracks (content) can
    // stay free of imports from UIBridge / this manager (avoids a
    // load-order cycle).
    window.addEventListener('tutorial-launch-match', () => this.launchTutorialMatch());
    window.addEventListener('tutorial-go-menu', () => goToMenu());

    // In-game primers — the match-load splash (LoadingScreen) runs for a
    // minimum of 5s and fades out over 200ms. GameScene.create() fires
    // long before that, so in-match tracks get queued in
    // `pendingAfterMatchLoad` and only start once LoadingScreen signals
    // 'match-loading-dismissed'.
    window.addEventListener('match-loading-dismissed', () => {
      const pending = this.pendingAfterMatchLoad;
      this.pendingAfterMatchLoad = null;
      if (!pending) return;
      if (Date.now() > pending.expiresAt) return; // stale — drop
      // Small DOM-settle buffer before spotlights start resolving targets.
      setTimeout(() => {
        if (pending.replay) this.replay(pending.id);
        else this.maybeAutoStart(pending.id);
      }, TIMING.MATCH_LOAD_DELAY_MS);
    });
  }

  /** Kick off the scripted tutorial match. Starts GameScene in tutorial
   *  mode and queues the `tutorial_match` track to launch once the
   *  faction-load splash finishes fading out. */
  launchTutorialMatch(): void {
    this.pendingAfterMatchLoad = {
      id: 'tutorial_match',
      replay: true,
      expiresAt: Date.now() + TIMING.PENDING_MATCH_LOAD_TTL_MS,
    };
    UIBridge.startScene('GameScene', {
      mode: 'tutorial',
      faction: 'arcane',
      map: 'tutorial',
      difficulty: 'easy',
      creepFaction: 'mechanical',
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
    this.panCameraToStep();
    this.maybeDeselectDockForStep();
  }

  /** Deselects whatever tower is in the dock when entering a non-
   *  placement step in the tutorial match. Prevents the player from
   *  accidentally dropping towers while watching a wave or reading
   *  an explainer. No-op for other tracks (where the player might
   *  legitimately be mid-build) and for placement steps themselves. */
  private maybeDeselectDockForStep(): void {
    if (!this.active) return;
    if (this.active.track.id !== 'tutorial_match') return;
    const advance = this.active.step.advanceOn;
    const isPlacement = !!advance
      && typeof advance === 'object'
      && 'event' in advance
      && advance.event === 'towerPlaced';
    if (isPlacement) return;
    GameUIStore.requestSelectDockTower(-1);
  }

  /** If the current step targets a canvas / canvas-dynamic rect (a grid
   *  cell or live path region), smoothly pan the main camera to centre
   *  on it. Keeps the spotlight visible even if the player panned
   *  somewhere else, and ensures mobile players don't have to hunt for
   *  where the tutorial is pointing. No-op for DOM or screen targets,
   *  or when a dynamic target's compute() can't resolve a rect yet. */
  private panCameraToStep(): void {
    if (!this.active) return;
    const worldRect = resolveCanvasTargetRect(this.active.step.target);
    if (!worldRect) return;
    const cam = getGameCamera();
    if (!cam) return;
    const cx = worldRect.x + worldRect.width / 2;
    const cy = worldRect.y + worldRect.height / 2;
    cam.pan(cx, cy, TIMING.CAMERA_PAN_MS, Phaser.Math.Easing.Sine.InOut);
  }

  /** Skip the current track. Marks it completed so it won't re-trigger. */
  skip(): void {
    if (!this.active) return;
    const justDismissed = this.active.track.id;
    const wasTutorialMatch = justDismissed === 'tutorial_match';
    this.markCompleted(justDismissed);
    this.clearActive();
    // Skipping any track also implies they've seen the first-launch flow.
    this.markFirstLaunchDismissed();
    this.notify();
    // Skipping the tutorial match leaves GameScene running in a no-stakes
    // 99-lives state — push the player back to the menu.
    if (wasTutorialMatch) goToMenu();
    // If they're still (or now back) on the menu, drop the one-shot
    // "where to find tutorials again" reminder — unless the dismissed
    // track WAS the skip hint itself (avoid an immediate re-fire loop).
    this.checkForSkipHintAfterDelay(justDismissed);
  }

  /** Finish the current track naturally. */
  complete(): void {
    if (!this.active) return;
    const justCompleted = this.active.track.id;
    this.markCompleted(justCompleted);
    this.clearActive();
    this.markFirstLaunchDismissed();
    this.notify();
    this.checkForSkipHintAfterDelay(justCompleted);
  }

  /** After a small delay (lets any scene transition land), fire the
   *  skip-hint mini-track if the player is on the menu. Guarded on the
   *  just-dismissed track id so dismissing the hint itself doesn't
   *  immediately re-queue another check. */
  private checkForSkipHintAfterDelay(justDismissed?: string): void {
    if (justDismissed === 'skip_hint') return;
    setTimeout(() => this.maybeStartSkipHint(), TIMING.SKIP_HINT_AFTER_EVENT_MS);
  }

  /** One-shot "tap the ? button to replay tutorials" nudge. Fires on
   *  the menu the first time the player finishes or skips any other
   *  track, so they know how to get back to the tutorial list. */
  private maybeStartSkipHint(): void {
    if (this.active) return;
    if (this.isCompleted('skip_hint')) return;
    if (UIBridge.getScreen() !== 'menu') return;
    // Need at least one OTHER completed track — skip_hint doesn't
    // surface until the player has actually interacted with the
    // tutorial system at least once.
    const others = this.persisted.completedTracks.filter(t => t !== 'skip_hint');
    if (others.length === 0) return;
    if (!getTrack('skip_hint')) return;
    this.start('skip_hint');
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
    // Skip-hint reminder — fires on menu arrival if the player has
    // finished or skipped any tutorial before. Small delay so the
    // menu DOM has time to mount the ? button.
    if (screen === 'menu') {
      setTimeout(() => this.maybeStartSkipHint(), TIMING.SKIP_HINT_AFTER_MENU_MS);
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
    this.pendingAfterMatchLoad = {
      id: trackId,
      replay: false,
      expiresAt: Date.now() + TIMING.PENDING_MATCH_LOAD_TTL_MS,
    };
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
    }, TIMING.AUTO_START_DELAY_MS);
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
