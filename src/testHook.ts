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
import { getCampaign } from './data/campaigns';
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
    getMissionStars: (factionId, idx) => PlayerProfile.getMissionStars(factionId, idx),
    onceEvent,
    launchCampaignMission,
    showScreen: (screen: string, data: Record<string, unknown> = {}) => {
      // Cast through unknown — UIBridge.show's ScreenId union is
      // private to ../ui/UIBridge, but the test hook accepts any
      // string so scripts don't have to import that type.
      UIBridge.show(screen as Parameters<typeof UIBridge.show>[0], data);
    },
  };
  // One-line breadcrumb — handy when a test fails and you open the
  // browser's console in trace viewer.
  console.info('[td-test] debug hook installed');
}
