/**
 * Playwright test hook.
 *
 * Lazily installed by main.ts only when the URL carries `?test=1`,
 * so production builds serve zero extra code. Exposes a small
 * surface on `window.__td_test` that Playwright specs use to:
 *
 *   - click grid cells on the Phaser canvas (world-coordinate input
 *     doesn't survive a plain Playwright `mouse.click(x, y)` because
 *     Phaser's pointer routing depends on synthetic pointer events)
 *   - query the current tutorial state without sleep/poll hacks
 *   - reset persisted tutorial state so fresh-install scenarios are
 *     a one-liner in tests
 *
 * Keep this surface intentionally tiny. Every hook is a durable
 * public API the tests rely on; adding more is easy, removing them
 * is a test rewrite.
 */
import { gridX, gridY } from './config';
import { UIBridge } from './ui/UIBridge';
import { TutorialManager } from './systems/Tutorial/TutorialManager';
import { TutorialPersistence } from './systems/Tutorial/TutorialPersistence';
import { GameUIStore } from './ui/GameUIStore';
import type { GameEvents } from './systems/EventBus';
import { getCampaign } from './systems/campaign/CampaignRegistry';
import { MissionRunner } from './systems/missions/MissionRunner';
import { PlayerProfile } from './systems/profile/PlayerProfile';
import type { FactionId } from './data/Factions';
import type { SabotageController } from './systems/sabotage/SabotageController';

declare global {
  interface Window {
    /** Present only when the page was loaded with `?test=1`. */
    __td_test?: TestHook;
  }
}

type SabotageStatus = ReturnType<SabotageController['getSnapshot']>;

interface TestHook {
  /** Synthesise a click on the grid at the given cell. Maps world
   *  coordinates through the active GameScene camera's worldView to
   *  viewport CSS pixels, then dispatches pointerdown + pointerup on
   *  the canvas element. */
  clickCell: (col: number, row: number) => boolean;
  /** Return the CSS-pixel client coordinates of the given cell's
   *  centre, or null if no scene is active. Tests use this to
   *  drive Playwright's `page.mouse.click(x, y)`, which routes
   *  through the browser's real pointer pipeline — more reliable
   *  on Phaser than synthesising PointerEvent objects ourselves. */
  getCellClientPos: (col: number, row: number) => { x: number; y: number } | null;
  /** Emit a GameEvents event directly on the active scene's EventBus.
   *  Used to advance event-gated tutorial steps when the real user
   *  action (canvas click, button click in a UI overlay) is flaky or
   *  hard to reach from Playwright. The unit suite owns the assertion
   *  that the *real* action produces the same event; the E2E suite
   *  just needs to verify the tutorial's reaction. */
  emitGameEvent: <K extends keyof GameEvents>(event: K, ...args: Parameters<GameEvents[K]>) => boolean;
  /** Fast-forward the active tutorial to the given step id by
   *  repeatedly calling `TutorialManager.next()`. Used by overlap /
   *  placement tests that need to see a specific step rendered but
   *  don't care about walking through every preceding step's real
   *  interactions. Returns true if the step was reached, false if
   *  it was never seen (wrong id, no active track, etc). */
  jumpToTutorialStep: (stepId: string, maxSteps?: number) => boolean;
  /** Select a tower in the DOM tower dock by its slot index. Going
   *  through GameUIStore.requestSelectDockTower instead of clicking
   *  the DOM element avoids the click-propagation quirks that make
   *  Playwright clicks on the wrapper not always reach the inner
   *  .dock-slot's onClick handler. */
  selectDockTower: (index: number) => void;
  /** Active tutorial step id, or null if no tutorial is running. */
  getActiveTutorialStep: () => string | null;
  /** Active tutorial track id, or null. */
  getActiveTutorialTrack: () => string | null;
  /** Wipe persisted tutorial state and reload the page — tests use
   *  this to start a "fresh install" scenario without touching
   *  localStorage directly (cross-browser quirks). */
  resetTutorialState: () => void;
  /** True once the app-startup splash has emitted its "dismissed"
   *  signal. Tests poll this before interacting with the menu. */
  isBootComplete: () => boolean;
  /** True once the GameScene is active and tickable. The smoke spec
   *  polls this after `launchCampaignMission` to know when the
   *  mission's setup is done and the SabotageController is wired. */
  isGameSceneActive: () => boolean;
  /** Snapshot of the M10 SabotageController state. Returns null when
   *  no sabotage mission is active. The spec asserts on this instead
   *  of poking controller internals. */
  getSabotageStatus: () => SabotageStatus | null;
  /** E2E-only: drive a sabotage target to 0 hp through the real
   *  Damageable.takeDamage path. Routes through controller
   *  invulnerability gates — kills on the throne while generators
   *  are alive are no-ops, by design. Returns false on bad index
   *  or no active sabotage mission. Generator kind requires `idx`;
   *  passing undefined returns false. */
  forceKillSabotageTarget: (kind: 'generator' | 'throne', idx?: number) => boolean;
  /** Greenward snapshot — ConsecrationManager state + the resolved
   *  finale state when M10 is active. Returns null on non-Greenward
   *  missions. */
  getGreenwardStatus: () => {
    ruins: { id: string; mode: 'ceremony' | 'siege' | 'mercy'; claimed: boolean; progress01: number }[];
    claimedByMode: { ceremony: number; siege: number; mercy: number };
    finale: { active: string; resolvedNaveMode: string | null } | null;
  } | null;
  /** E2E-only: force a Greenward ruin to its claimed state. Routes
   *  through ConsecrationManager.forceClaim. Returns false on bad
   *  id or no active Greenward mission. Used by the M10 endings
   *  e2e to walk Courtyard → Nave → Throne without exercising the
   *  full per-mode claim mechanics. */
  forceClaimGreenwardRuin: (ruinId: string) => boolean;
  /** Snake Eyes snapshot — persistent Debt + the active mission's
   *  Pactbook state (drawn wager ids + accepted id if any). Returns
   *  null when no Snake Eyes mission is active. */
  getSnakeEyesStatus: () => {
    debt: number;
    firstMissionStarted: boolean;
    pactbook: {
      drawn: { id: string; tier: 1 | 2 | 3 }[];
      acceptedId: string | null;
      declined: boolean;
    } | null;
  } | null;
  /** E2E-only: accept a Pactbook wager by id without driving the
   *  PactbookPanel UI. Routes through the active SnakeEyesMissionController.
   *  Returns false on bad id, no active Snake Eyes mission, or panel
   *  already resolved. */
  acceptSnakeEyesWager: (wagerId: string) => boolean;
  /** E2E-only: decline all three drawn Pactbook wagers. Mirrors the
   *  PactbookPanel's decline button + applies the +20g penalty.
   *  Returns false when no active Snake Eyes mission or panel
   *  already resolved. */
  declineSnakeEyesWagers: () => boolean;
  /** E2E-only: Snake Eyes M10 setpiece snapshot. Returns the
   *  CounterfactualMirrorController stage + lane snapshot for
   *  e2e assertions. Null when not in a Snake Eyes M10 mission. */
  getSnakeEyesM10Status: () => {
    stage: string;
    approachCleared: number;
    approachTotal: number;
    laneGap: number;
    laneWinner: string | null;
    bossHpRemaining: number;
    bossHpMax: number;
    isWon: boolean;
    isLost: boolean;
  } | null;
  /** E2E-only: advance one M10 Approach wave clear. Returns false on
   *  non-M10 missions or after the Approach setpiece has flipped. */
  m10AdvanceApproach: () => boolean;
  /** E2E-only: force the player to win the M10 Mirror Lane race.
   *  Stage flips to 'table'. Returns false when not in mirror_lane. */
  m10ForcePlayerLaneWin: () => boolean;
  /** E2E-only: force the Counterfactual boss kill (skips actual
   *  combat). Stage flips to 'complete' → gameWon fires. Returns
   *  false when not in the Table stage. */
  m10ForceBossKill: () => boolean;
  /** Read mission stars from the player profile. Returns 0 for missions
   *  not yet completed. Decouples specs from the profile's on-disk
   *  schema — campaignProgress could move + the spec keeps working. */
  getMissionStars: (campaignFactionId: string, missionIdx: number) => number;
  /** Wait for one occurrence of a GameEvent. Returns a promise that
   *  resolves with the event's arguments or rejects on timeout. */
  onceEvent: <K extends keyof GameEvents>(event: K, timeoutMs?: number) => Promise<Parameters<GameEvents[K]>>;
  /** Launch a campaign mission programmatically. Bypasses the lobby
   *  UI clicks — used by every campaign e2e spec to skip straight to
   *  the gameplay being tested. Returns false on unknown faction id
   *  or missing mission idx. */
  launchCampaignMission: (campaignFactionId: string, missionIdx: number) => boolean;
  /** Navigate to a specific DOM screen. Thin wrapper around
   *  UIBridge.show — exposed for the Play Store screenshot capture
   *  script which needs to drive through Menu / Store / Draft /
   *  etc. without following the real button-click flow. */
  showScreen: (screen: string, data?: Record<string, unknown>) => void;
  /** Set the active GameScene's main camera zoom + optional scroll.
   *  Used by the place-and-approve e2e to verify the gate's icons
   *  track the live camera through pinch-zoom / pan. Returns false
   *  when the GameScene isn't active. */
  setCameraZoom: (zoom: number, scrollX?: number, scrollY?: number) => boolean;
  /** Directly stage a placement ghost — used by the place-and-approve
   *  e2e to set up the gate without driving the full select-tower +
   *  click-cell flow (the cell positions move with zoom, so isolating
   *  the projection from input is more readable). Returns false if
   *  no GameScene is active. */
  stagePlacementGhost: (towerTypeId: string, col: number, row: number) => boolean;
  /** Snapshot the active GameScene's scheduled wave script — used by
   *  e2e regression tests that need to assert specific creep types
   *  in specific waves (e.g. Mech M9 ensures wave 5 still contains
   *  `mech_ace_pilot` after the v2 routing). Returns null when no
   *  GameScene is active. */
  getScheduledWaves: () => null | { wave: number; isBoss: boolean; groups: { creepType: string; count: number }[] }[];
  /** Snapshot the active Circle (co-op) state — used by e2e tests
   *  that need to confirm a campaign coop_with_bot mission instantiated
   *  a bot ally with the right faction. Returns null when the scene
   *  isn't running Circle mode. */
  getCircleStatus: () => null | {
    botSlots: number[];
    playerFactions: { [slot: number]: string };
  };
}

let bootComplete = false;
window.addEventListener('app-splash-dismissed', () => { bootComplete = true; });

function getCellClientPos(col: number, row: number): { x: number; y: number } | null {
  const canvas = document.querySelector<HTMLCanvasElement>('#game-root canvas');
  if (!canvas) return null;
  const game = UIBridge.getGame();
  if (!game) return null;
  const scene = game.scene.getScene('GameScene') as unknown as { cameras?: { main: Phaser.Cameras.Scene2D.Camera } } | null;
  const cam = scene?.cameras?.main;
  if (!cam) return null;
  const wv = cam.worldView;
  if (!wv || wv.width === 0 || wv.height === 0) return null;

  const worldX = gridX(col);
  const worldY = gridY(row);
  const cr = canvas.getBoundingClientRect();
  const u = (worldX - wv.x) / wv.width;
  const v = (worldY - wv.y) / wv.height;
  return { x: cr.left + u * cr.width, y: cr.top + v * cr.height };
}

function clickCell(col: number, row: number): boolean {
  const pos = getCellClientPos(col, row);
  if (!pos) return false;
  const canvas = document.querySelector<HTMLCanvasElement>('#game-root canvas');
  if (!canvas) return false;

  const opts: PointerEventInit = {
    clientX: pos.x, clientY: pos.y,
    bubbles: true,
    cancelable: true,
    button: 0,
    buttons: 1,
    pointerId: 1,
    pointerType: 'mouse',
    isPrimary: true,
  };
  canvas.dispatchEvent(new PointerEvent('pointerdown', opts));
  canvas.dispatchEvent(new PointerEvent('pointerup', { ...opts, buttons: 0 }));
  return true;
}

function emitGameEvent<K extends keyof GameEvents>(event: K, ...args: Parameters<GameEvents[K]>): boolean {
  const game = UIBridge.getGame();
  if (!game) return false;
  const scene = game.scene.getScene('GameScene') as unknown as { eventBus?: { emit: (ev: string, ...a: unknown[]) => void } } | null;
  if (!scene?.eventBus) return false;
  scene.eventBus.emit(event, ...args);
  return true;
}

function getSabotageController(): SabotageController | null {
  const game = UIBridge.getGame();
  if (!game) return null;
  const scene = game.scene.getScene('GameScene') as unknown as
    { _sabotageController?: SabotageController | null } | null;
  return scene?._sabotageController ?? null;
}

function isGameSceneActive(): boolean {
  const game = UIBridge.getGame();
  if (!game) return false;
  const scene = game.scene.getScene('GameScene');
  // scene.sys.settings.active flips true once Phaser's scene manager
  // has finished start(); .isActive() is the public read.
  return !!(scene && typeof (scene as { scene?: { isActive?: () => boolean } }).scene?.isActive === 'function'
    && (scene as { scene: { isActive: () => boolean } }).scene.isActive());
}

function getSabotageStatus(): SabotageStatus | null {
  return getSabotageController()?.getSnapshot() ?? null;
}

function forceKillSabotageTarget(kind: 'generator' | 'throne', idx?: number): boolean {
  const ctrl = getSabotageController();
  if (!ctrl) return false;
  if (kind === 'generator') {
    if (typeof idx !== 'number') return false;
    return ctrl.forceKillTarget('generator', idx);
  }
  return ctrl.forceKillTarget('throne');
}

function onceEvent<K extends keyof GameEvents>(event: K, timeoutMs = 10_000): Promise<Parameters<GameEvents[K]>> {
  return new Promise((resolve, reject) => {
    const game = UIBridge.getGame();
    if (!game) {
      reject(new Error('onceEvent: no active game'));
      return;
    }
    const scene = game.scene.getScene('GameScene') as unknown as
      { eventBus?: { on: (ev: K, fn: GameEvents[K]) => void; off: (ev: K, fn: GameEvents[K]) => void } } | null;
    if (!scene?.eventBus) {
      reject(new Error(`onceEvent(${event}): no eventBus on GameScene`));
      return;
    }
    let timer: ReturnType<typeof setTimeout> | null = null;
    const handler = ((...args: unknown[]) => {
      if (timer) clearTimeout(timer);
      scene.eventBus!.off(event, handler as GameEvents[K]);
      resolve(args as Parameters<GameEvents[K]>);
    }) as GameEvents[K];
    scene.eventBus.on(event, handler);
    timer = setTimeout(() => {
      scene.eventBus!.off(event, handler as GameEvents[K]);
      reject(new Error(`onceEvent(${event}): timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
}

function launchCampaignMission(campaignFactionId: string, missionIdx: number): boolean {
  const def = getCampaign(campaignFactionId as FactionId);
  if (!def) return false;
  if (missionIdx < 0 || missionIdx >= def.missions.length) return false;
  return MissionRunner.start(def, missionIdx);
}

interface GreenwardSceneRef {
  _greenwardController?: {
    consecration: {
      getSnapshot: () => {
        ruins: { id: string; mode: 'ceremony' | 'siege' | 'mercy'; claimed: boolean; progress01: number }[];
        claimedByMode: { ceremony: number; siege: number; mercy: number };
        allMercyWatchersUnharmed: boolean;
      };
    };
  } | null;
  _greenwardFinaleController?: {
    getSnapshot: () => { active: string; resolvedNaveMode: string | null };
  } | null;
}

function getGreenwardStatus(): ReturnType<NonNullable<Window['__td_test']>['getGreenwardStatus']> {
  const game = UIBridge.getGame();
  if (!game) return null;
  const scene = game.scene.getScene('GameScene') as unknown as GreenwardSceneRef | null;
  if (!scene?._greenwardController) return null;
  const snap = scene._greenwardController.consecration.getSnapshot();
  const finale = scene._greenwardFinaleController ? scene._greenwardFinaleController.getSnapshot() : null;
  return {
    ruins: snap.ruins,
    claimedByMode: snap.claimedByMode,
    finale,
  };
}

interface GreenwardForceClaimRef {
  _greenwardController?: {
    consecration: { forceClaim: (id: string) => boolean };
  } | null;
}

function forceClaimGreenwardRuin(ruinId: string): boolean {
  const game = UIBridge.getGame();
  if (!game) return false;
  const scene = game.scene.getScene('GameScene') as unknown as GreenwardForceClaimRef | null;
  if (!scene?._greenwardController) return false;
  return scene._greenwardController.consecration.forceClaim(ruinId);
}

// ─── Snake Eyes ──────────────────────────────────────────────────
// Tests for the Pactbook draw + Debt lifecycle. The controller +
// state imports are lazy (dynamic require) so the test-hook module
// itself doesn't statically depend on the Snake Eyes runtime — keeps
// the production-build tree-shaking clean if Snake Eyes is ever
// gated behind a feature flag.

function getSnakeEyesStatus(): ReturnType<NonNullable<Window['__td_test']>['getSnakeEyesStatus']> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getSnakeEyesState } = require('./systems/voidc/DebtTracker') as typeof import('./systems/voidc/DebtTracker');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getActiveSnakeEyesController } = require('./systems/voidc/SnakeEyesMissionController') as typeof import('./systems/voidc/SnakeEyesMissionController');
  const controller = getActiveSnakeEyesController();
  // No active controller = not in a Snake Eyes mission. Don't return
  // the persistent state by itself — the spec needs the controller
  // reference to assert on the Pactbook, and a null return tells it
  // clearly that the mission isn't a Snake Eyes one.
  if (!controller) return null;
  const state = getSnakeEyesState();
  const pb = controller.getPactbook();
  return {
    debt: state.debt,
    firstMissionStarted: state.firstMissionStarted,
    pactbook: {
      drawn: pb.getDrawn().map(w => ({ id: w.id, tier: w.tier })),
      acceptedId: pb.getSelected()?.id ?? null,
      declined: pb.isDeclined(),
    },
  };
}

function acceptSnakeEyesWager(wagerId: string): boolean {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getActiveSnakeEyesController } = require('./systems/voidc/SnakeEyesMissionController') as typeof import('./systems/voidc/SnakeEyesMissionController');
  const controller = getActiveSnakeEyesController();
  if (!controller) return false;
  const pb = controller.getPactbook();
  if (pb.isResolved()) return false;
  try {
    pb.accept(wagerId);
    return true;
  } catch {
    return false;
  }
}

function declineSnakeEyesWagers(): boolean {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getActiveSnakeEyesController } = require('./systems/voidc/SnakeEyesMissionController') as typeof import('./systems/voidc/SnakeEyesMissionController');
  const controller = getActiveSnakeEyesController();
  if (!controller) return false;
  const pb = controller.getPactbook();
  if (pb.isResolved()) return false;
  pb.declineAll();
  return true;
}

function getSnakeEyesM10Status(): ReturnType<NonNullable<Window['__td_test']>['getSnakeEyesM10Status']> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getActiveSnakeEyesController } = require('./systems/voidc/SnakeEyesMissionController') as typeof import('./systems/voidc/SnakeEyesMissionController');
  const controller = getActiveSnakeEyesController();
  const m10 = controller?.getM10Controller();
  if (!m10) return null;
  const snap = m10.getSnapshot();
  return {
    stage: snap.stage,
    approachCleared: snap.approachWavesCleared,
    approachTotal: snap.approachWavesTotal,
    laneGap: snap.mirrorLane.laneGap,
    laneWinner: snap.mirrorLane.winner,
    bossHpRemaining: snap.bossHpRemaining,
    bossHpMax: snap.bossHpMax,
    isWon: m10.isWon(),
    isLost: m10.isLost(),
  };
}

function m10AdvanceApproach(): boolean {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getActiveSnakeEyesController } = require('./systems/voidc/SnakeEyesMissionController') as typeof import('./systems/voidc/SnakeEyesMissionController');
  const controller = getActiveSnakeEyesController();
  const m10 = controller?.getM10Controller();
  if (!m10 || m10.getStage() !== 'approach') return false;
  controller!._forceM10ApproachAdvance();
  return true;
}

function m10ForcePlayerLaneWin(): boolean {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getActiveSnakeEyesController } = require('./systems/voidc/SnakeEyesMissionController') as typeof import('./systems/voidc/SnakeEyesMissionController');
  const controller = getActiveSnakeEyesController();
  const m10 = controller?.getM10Controller();
  if (!m10 || m10.getStage() !== 'mirror_lane') return false;
  controller!._forceM10PlayerLaneWin();
  return true;
}

function m10ForceBossKill(): boolean {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getActiveSnakeEyesController } = require('./systems/voidc/SnakeEyesMissionController') as typeof import('./systems/voidc/SnakeEyesMissionController');
  const controller = getActiveSnakeEyesController();
  const m10 = controller?.getM10Controller();
  if (!m10 || m10.getStage() !== 'table') return false;
  controller!._forceM10BossKill();
  return true;
}

function jumpToTutorialStep(stepId: string, maxSteps = 50): boolean {
  for (let guard = 0; guard < maxSteps; guard++) {
    const active = TutorialManager.getActive();
    if (!active) return false;
    if (active.step.id === stepId) return true;
    TutorialManager.next();
  }
  return false;
}

export function installTestHook(): void {
  window.__td_test = {
    clickCell,
    getCellClientPos,
    emitGameEvent,
    jumpToTutorialStep,
    selectDockTower: (index: number) => GameUIStore.requestSelectDockTower(index),
    getActiveTutorialStep: () => TutorialManager.getActive()?.step.id ?? null,
    getActiveTutorialTrack: () => TutorialManager.getActive()?.track.id ?? null,
    resetTutorialState: () => {
      TutorialPersistence.reset();
      location.reload();
    },
    isBootComplete: () => bootComplete,
    isGameSceneActive,
    getSabotageStatus,
    forceKillSabotageTarget,
    getGreenwardStatus,
    forceClaimGreenwardRuin,
    getSnakeEyesStatus,
    acceptSnakeEyesWager,
    declineSnakeEyesWagers,
    getSnakeEyesM10Status,
    m10AdvanceApproach,
    m10ForcePlayerLaneWin,
    m10ForceBossKill,
    getMissionStars: (factionId, idx) => PlayerProfile.getMissionStars(factionId, idx),
    onceEvent,
    launchCampaignMission,
    showScreen: (screen: string, data: Record<string, unknown> = {}) => {
      // Cast through unknown — UIBridge.show's ScreenId union is
      // private to ../ui/UIBridge, but the test hook accepts any
      // string so scripts don't have to import that type.
      UIBridge.show(screen as Parameters<typeof UIBridge.show>[0], data);
    },
    setCameraZoom: (zoom: number, scrollX?: number, scrollY?: number) => {
      const game = UIBridge.getGame();
      if (!game) return false;
      const scene = game.scene.getScene('GameScene') as unknown as {
        cameras?: { main?: { setZoom: (z: number) => void; setScroll: (x: number, y: number) => void; scrollX: number; scrollY: number } };
      } | null;
      const cam = scene?.cameras?.main;
      if (!cam) return false;
      cam.setZoom(zoom);
      if (scrollX !== undefined || scrollY !== undefined) {
        cam.setScroll(scrollX ?? cam.scrollX, scrollY ?? cam.scrollY);
      }
      return true;
    },
    stagePlacementGhost: (towerTypeId: string, col: number, row: number) => {
      if (!isGameSceneActive()) return false;
      GameUIStore.setPlacementGhost({ col, row, towerTypeId });
      return true;
    },
    getScheduledWaves: () => {
      const game = UIBridge.getGame();
      if (!game) return null;
      const scene = game.scene.getScene('GameScene') as unknown as {
        waves?: { wave: number; isBoss: boolean; groups: { creepType: string; count: number }[] }[];
      } | null;
      if (!scene?.waves) return null;
      // Shallow snapshot — copy each wave entry's identifying fields
      // so the caller can serialize across the Playwright bridge.
      return scene.waves.map(w => ({
        wave: w.wave,
        isBoss: w.isBoss,
        groups: w.groups.map(g => ({ creepType: g.creepType, count: g.count })),
      }));
    },
    getCircleStatus: () => {
      const game = UIBridge.getGame();
      if (!game) return null;
      // `circle.botSlots` is a `Set<number>` on the live CircleManager;
      // the snapshot below converts to an array via spread so the
      // return shape stays JSON-serialisable across the Playwright bridge.
      const scene = game.scene.getScene('GameScene') as unknown as {
        circle?: { botSlots: Set<number>; playerFactions: Map<number, string> } | null;
      } | null;
      const c = scene?.circle;
      if (!c) return null;
      const factions: { [slot: number]: string } = {};
      c.playerFactions.forEach((fac, slot) => { factions[slot] = fac; });
      return { botSlots: [...c.botSlots], playerFactions: factions };
    },
  };
  // One-line breadcrumb — handy when a test fails and you open the
  // browser's console in trace viewer.
  console.info('[td-test] debug hook installed');
}
