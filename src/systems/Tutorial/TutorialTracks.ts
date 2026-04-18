/**
 * TutorialTracks — static content for every tutorial track.
 *
 * A track is a named sequence of steps. Tracks live independently so they
 * can trigger on different events (first launch, first time a faction is
 * selected, first time a mode is opened, etc.) and be replayed in any order
 * from the Menu help list.
 *
 * Steps advance either on "Next" click or on a game event (e.g. towerPlaced).
 * Authors keep bodies short — 1–3 sentences — and aim for 5–8 steps per track.
 */
import type { TutorialTarget, WorldRect } from './TutorialTargets';
import { getCurrentTutorialPath } from './TutorialTargets';
import type { GameEvents } from '../EventBus';
import { TILE_SIZE, gridX, gridY, GRID_COLS, GRID_ROWS } from '../../config';

export type Placement = 'top' | 'bottom' | 'left' | 'right' | 'center' | 'auto' | 'top-banner';

export type StepAdvance =
  | 'click'
  /** Advance when the named EventBus event fires. */
  | { event: keyof GameEvents };

export interface TutorialStep {
  id: string;
  target: TutorialTarget;
  title: string;
  body: string;
  placement?: Placement;
  advanceOn?: StepAdvance;
  /** Hide the Next button — forces action. Implied when advanceOn is an event. */
  actionRequired?: boolean;
  /** Fired once when the step becomes active. Use for UI side-effects like
   *  opening a collapsed panel so its target is actually visible. */
  onEnter?: () => void;
  /** Optional call-to-action button rendered in the popover alongside (or
   *  in place of) Next. When present on a terminal step, replaces Next
   *  entirely; clicking invokes `action` and then completes the track. */
  cta?: { label: string; action: () => void };
}

export interface TutorialTrack {
  id: string;
  /** Short label for the Help menu. */
  name: string;
  /** One-line description for the Help menu. */
  summary: string;
  steps: TutorialStep[];
  /** Skip the dimming scrim and the scrim click-catcher. Used by the
   *  tutorial match so the player can watch the actual gameplay while
   *  the popover + highlight ring guide them. */
  scrimless?: boolean;
  /** Label for the dismiss button. Defaults to "Skip". The tutorial
   *  match uses "Quit" because dismissing there also exits the live
   *  match back to the menu — not just the overlay. */
  skipLabel?: string;
}

// ─── Selectors ──────────────────────────────────────────────
// Stable data attributes added to the key DOM panels. Keep in sync with the
// `data-tutorial-target` attrs in the corresponding Preact components.
const SEL = {
  statusBar: '[data-tutorial-target="status-bar"]',
  statusGold: '[data-tutorial-target="status-gold"]',
  statusLives: '[data-tutorial-target="status-lives"]',
  statusWave: '[data-tutorial-target="status-wave"]',
  statusIncome: '[data-tutorial-target="status-income"]',
  startWaveBtn: '[data-tutorial-target="start-wave"]',
  towerDock: '[data-tutorial-target="tower-dock"]',
  wavesPanel: '[data-tutorial-target="waves-panel"]',
  economyPanel: '[data-tutorial-target="economy-panel"]',
  menuStoreBtn: '[data-tutorial-target="menu-store"]',
  menuEncyclopediaBtn: '[data-tutorial-target="menu-encyclopedia"]',
  menuModeCards: '[data-tutorial-target="menu-modes"]',
  menuModeStandard: '[data-tutorial-target="menu-mode-standard"]',
  menuMapGrid: '[data-tutorial-target="menu-map"]',
  econFrontierTab: '[data-tutorial-target="econ-tab-frontier"]',
  econSendsTab: '[data-tutorial-target="econ-tab-sends"]',
  // Specific tower slot in the dock — matches data-tutorial-tower-id on
  // the per-slot wrapper. Used when the tutorial wants to point at a
  // particular tower (e.g. Arcane Frost for the slow-effect lesson).
  dockFrostSlot: '[data-tutorial-tower-id="arcane_frost"]',
  tutorialsHelpBtn: '[data-tutorial-target="tutorials-help-btn"]',
} as const;

/** Dispatched by tutorial steps to open a specific sidebar panel so the
 *  spotlight lands on its visible content instead of the collapsed header.
 *  Pass `null` to collapse whichever panel is currently open — used when
 *  a later step needs the game-area / wave controls unobscured. */
function openSidebarPanel(panel: 'waves' | 'economy' | null): void {
  window.dispatchEvent(new CustomEvent('tutorial-open-sidebar-panel', { detail: { panel } }));
}
function closeSidebarPanels(): void {
  openSidebarPanel(null);
}

/** Switch the Economy panel's internal tab (sends / frontier / essence /
 *  items / log). Dispatched when a tutorial step needs specific tab
 *  content visible, e.g. buy_frontier activating the Frontier tab so
 *  the Leyline Nexus entry is highlighted rather than the Sends list.
 *
 *  Deferred with setTimeout(0) so it fires after React has rendered
 *  the economy panel's children. CollapsiblePanel only mounts its
 *  child component when `open=true`, so an earlier openSidebarPanel
 *  call needs to paint before EconomyPanelDOM is alive to receive
 *  this event. Without the delay the switch gets dispatched to an
 *  unmounted listener and silently drops. */
function switchEconTab(tab: 'sends' | 'frontier' | 'essence' | 'items' | 'log'): void {
  setTimeout(() => {
    window.dispatchEvent(new CustomEvent('tutorial-switch-econ-tab', { detail: { tab } }));
  }, 0);
}

const GRID_RECT_PAD = 4;

/** World-space rect covering a span of grid cells. `gridX`/`gridY`
 *  return cell centres, so we subtract half the tile for the top-left
 *  corner and pad a few pixels so the highlight visibly frames the
 *  cells. Placement is loose — the helper typically covers a multi-
 *  cell strip, making the target obvious at mobile scale and giving
 *  the player a forgiving area to tap. */
function gridCellWorldRect(col: number, row: number, colSpan = 1, rowSpan = 1): WorldRect {
  return {
    x: gridX(col) - TILE_SIZE / 2 - GRID_RECT_PAD,
    y: gridY(row) - TILE_SIZE / 2 - GRID_RECT_PAD,
    width: TILE_SIZE * colSpan + GRID_RECT_PAD * 2,
    height: TILE_SIZE * rowSpan + GRID_RECT_PAD * 2,
  };
}

/** Same rect wrapped as a static `canvas` TutorialTarget. */
function gridCellRect(col: number, row: number, colSpan = 1, rowSpan = 1): TutorialTarget {
  return { kind: 'canvas', ...gridCellWorldRect(col, row, colSpan, rowSpan) };
}

/** The default creep-path row on the tutorial map (straight east-west
 *  through the vertical middle of the grid). Used as the reference row
 *  for detecting which side the live path is bulging toward. */
const TUTORIAL_DEFAULT_PATH_ROW = Math.floor(GRID_ROWS / 2);

/** Returns a dynamic canvas target that inspects the CURRENT creep
 *  path and highlights the strip just beyond the side the path is
 *  already bulging toward. First-two-towers push creeps up → this
 *  suggests another row up. If the player mirrored below instead,
 *  this suggests another row down. The spotlight updates live as the
 *  player places more towers, so it always points at where the next
 *  tower would actually extend the maze. */
function nextMazeExtensionTarget(): TutorialTarget {
  // Fallback rect used when no path is available yet — two rows above
  // default, matching the old hardcoded hint.
  const fallback = gridCellWorldRect(9, TUTORIAL_DEFAULT_PATH_ROW - 2, 7);

  return {
    kind: 'canvas-dynamic',
    compute: () => {
      const path = getCurrentTutorialPath();
      if (!path || path.length === 0) return fallback;

      // Scan the path for the biggest vertical deviation from the
      // default row, and which cols are on the deviated side.
      let minRow = TUTORIAL_DEFAULT_PATH_ROW;
      let maxRow = TUTORIAL_DEFAULT_PATH_ROW;
      for (const p of path) {
        if (p.row < minRow) minRow = p.row;
        if (p.row > maxRow) maxRow = p.row;
      }
      const aboveDev = TUTORIAL_DEFAULT_PATH_ROW - minRow;
      const belowDev = maxRow - TUTORIAL_DEFAULT_PATH_ROW;

      // No deviation yet — path still straight. Point above by default.
      if (aboveDev === 0 && belowDev === 0) return fallback;

      const goUp = aboveDev >= belowDev;
      const extremeRow = goUp ? minRow : maxRow;
      // Suggest the strip one row past the current bulge, clamped.
      const targetRow = goUp
        ? Math.max(0, extremeRow - 1)
        : Math.min(GRID_ROWS - 1, extremeRow + 1);

      // Cols spanned by the bulge — where the path actually reaches
      // the extreme row. Pad on both sides so the highlight isn't
      // pixel-tight against the detour.
      const bulgeCols: number[] = [];
      for (const p of path) if (p.row === extremeRow) bulgeCols.push(p.col);
      if (bulgeCols.length === 0) return fallback;
      const minCol = Math.max(0, Math.min(...bulgeCols) - 1);
      const maxCol = Math.min(GRID_COLS - 1, Math.max(...bulgeCols) + 1);

      return gridCellWorldRect(minCol, targetRow, maxCol - minCol + 1);
    },
  };
}

// ─── Tracks ─────────────────────────────────────────────────

/** One-shot nudge fired the next time the player lands on the menu
 *  after skipping any other track. Points at the `?` help button so
 *  they know how to find the tutorial list again. Single step, no
 *  skip prompt — just click to dismiss. */
const skipHint: TutorialTrack = {
  id: 'skip_hint',
  name: 'Tutorials Can Be Replayed',
  summary: 'Reminder that the ? button opens the tutorial list.',
  steps: [
    {
      id: 'hint',
      target: { kind: 'dom', selector: SEL.tutorialsHelpBtn },
      title: 'Come Back Any Time',
      body: "Changed your mind about the tour? Tap this ? button to replay any tutorial — including the guided practice match.",
      placement: 'bottom',
    },
  ],
};

/** First-launch orientation. Runs before any faction/mode has been chosen,
 *  so every target is either the Menu screen or a `screen` (centered) step. */
const basics: TutorialTrack = {
  id: 'basics',
  name: 'Welcome Tour',
  summary: 'What tower defence is and what makes this one different.',
  steps: [
    {
      id: 'intro',
      target: { kind: 'screen' },
      title: 'Welcome, Commander',
      body: "Quick tour — under a minute. You'll learn how the game works and what's unique about it. Skip anytime.",
    },
    {
      id: 'td_basics',
      target: { kind: 'screen' },
      title: 'The Basics',
      body: 'Creeps walk from spawn to base. You place towers along the way, towers kill creeps, dead creeps drop gold, gold buys more towers. Miss too many and you lose.',
    },
    {
      id: 'mazing',
      target: { kind: 'screen' },
      title: "What's Different: Mazing",
      body: "Towers block creep paths. Place them smartly and you force creeps to snake through your killzone. Mazing is the whole game — it's more important than which towers you pick.",
    },
    {
      id: 'income',
      target: { kind: 'screen' },
      title: "What's Different: Income",
      body: 'On Normal and above, just killing creeps is not enough gold. You also earn income each wave via self-sent creeps (risky) or Frontier buildings (safer). More on that in-game.',
    },
    {
      id: 'factions',
      target: { kind: 'screen' },
      title: '11 Factions',
      body: "Each faction plays differently — Arcane crits, Nature poisons, Infernal sacrifices. When you pick one for the first time, you'll get a short primer.",
    },
    {
      id: 'map',
      target: { kind: 'dom', selector: SEL.menuMapGrid },
      title: 'Pick a Map',
      body: "Maps have different layouts, entry points, and constraints. Plains is a safe first pick.",
      placement: 'bottom',
    },
    {
      id: 'modes',
      target: { kind: 'dom', selector: SEL.menuModeCards },
      title: 'Game Modes',
      body: 'Standard is the classic mode. Others change the economy or add heroes. You’ll see a short primer the first time you pick a different mode.',
      placement: 'top',
    },
    {
      id: 'encyclopedia',
      target: { kind: 'dom', selector: SEL.menuEncyclopediaBtn },
      title: 'Encyclopedia',
      body: 'Documents every tower, creep, and hero — stats, traits, and ability descriptions. Open it any time you want to read before you fight.',
      placement: 'top',
    },
    {
      id: 'store',
      target: { kind: 'dom', selector: SEL.menuStoreBtn },
      title: 'Store',
      body: 'Cosmetic skins for towers, heroes, and creeps, plus unlocks for the premium factions. Nothing in here is pay-to-win.',
      placement: 'top',
    },
    {
      id: 'done',
      target: { kind: 'dom', selector: SEL.menuModeStandard },
      title: "You're Ready",
      body: "Start with Standard on Plains with Normal difficulty — or take the guided practice match first.",
      placement: 'top',
      cta: {
        label: 'Play Tutorial Match',
        action: () => window.dispatchEvent(new Event('tutorial-launch-match')),
      },
    },
  ],
};

/** Scripted sandbox round — the onboarding tutorial match.
 *  Plays as Arcane on the tutorial map (straight path, row 13, single
 *  entry at col 0). Grid cell suggestions target col ~12-14 on row 13 so
 *  placing a tower there forces a visible path detour. */
const tutorialMatch: TutorialTrack = {
  id: 'tutorial_match',
  name: 'Tutorial Match',
  summary: 'A scripted round as Arcane: maze, run a wave, send, frontier.',
  scrimless: true,
  skipLabel: 'Quit',
  steps: [
    {
      id: 'welcome',
      target: { kind: 'screen' },
      title: 'Welcome',
      body: "A short sandbox round — a few minutes, can't lose. We'll place towers, run three waves, and use the income systems at least once each.",
    },
    {
      id: 'pick_tower',
      target: { kind: 'dom', selector: SEL.towerDock },
      title: 'Pick a Tower',
      body: 'Click Arcane Bolt in the dock at the bottom. Hotkey 1 works too.',
      placement: 'top',
      advanceOn: { event: 'dockTowerSelected' },
    },
    {
      id: 'place_first',
      // Highlight a 5-cell strip on the path (cols 10-14, row 13) so the
      // player has an obvious target zone. Placement is loose — any cell
      // on the path works.
      target: gridCellRect(10, 13, 5, 1),
      title: 'Place It Here',
      body: 'Drop the tower on the path anywhere in the highlighted strip. Watch what happens to the creep route.',
      placement: 'top-banner',
      advanceOn: { event: 'towerPlaced' },
    },
    {
      id: 'mazing',
      target: { kind: 'screen' },
      title: "That's Mazing",
      body: "The path bent around your tower. Every tower you drop reshapes the route — the longer you make creeps walk, the more time your towers have to shoot them.",
    },
    {
      id: 'place_second',
      // Dynamic: highlights the strip just past the first tower's
      // bulge, so placing another Bolt extends the detour.
      target: nextMazeExtensionTarget(),
      title: 'Extend the Maze',
      body: "Drop another Bolt in the highlighted strip — that's right along the new route. You want creeps to walk past your towers as long as possible.",
      placement: 'top-banner',
      advanceOn: { event: 'towerPlaced' },
    },
    {
      id: 'start_wave_1',
      target: { kind: 'dom', selector: SEL.startWaveBtn },
      title: 'Start Wave 1',
      body: "Click Next Wave. Five slow creeps — your two Bolts handle them easily. Then we'll add some variety.",
      placement: 'top',
      advanceOn: { event: 'waveStarted' },
    },
    {
      id: 'watch_wave_1',
      target: { kind: 'dom', selector: SEL.statusGold },
      title: 'Kills Drop Gold',
      body: "Every creep you kill pays out. Watch your Gold go up. Wait for the wave to finish.",
      placement: 'top-banner',
      advanceOn: { event: 'waveCleared' },
    },
    {
      id: 'income_bonus',
      target: { kind: 'dom', selector: SEL.statusIncome },
      title: 'Wave Income',
      body: "See the +10/w next to your gold? That's income — you get it at the end of every wave regardless of kills. Sends and Frontier buildings both raise it.",
      placement: 'bottom',
    },
    {
      id: 'pick_frost',
      target: { kind: 'dom', selector: SEL.dockFrostSlot },
      title: 'Try the Frost Tower',
      body: "Not every tower deals damage. Arcane Frost slows creeps it hits — pair it with your Bolts and creeps crawl through your killzone. Select it from the dock (hotkey 2).",
      placement: 'top',
      advanceOn: { event: 'dockTowerSelected' },
    },
    {
      id: 'place_frost',
      // Dynamic: drop the Frost tower in the strip adjacent to the
      // current route so it hits creeps in the maze, not a dead zone.
      target: nextMazeExtensionTarget(),
      title: 'Place the Frost',
      body: "Drop it in the highlighted strip so it hits the detoured creeps. Wave 2 brings fast creeps — you'll see the slow effect clearly.",
      placement: 'top-banner',
      advanceOn: { event: 'towerPlaced' },
    },
    {
      id: 'buy_send',
      // Same rationale as buy_frontier — target the tab header so the
      // spotlight is reliable even if the auto tab-switch is delayed,
      // and the send list sits visibly right below it.
      target: { kind: 'dom', selector: SEL.econSendsTab },
      title: 'Buy a Send',
      body: 'On the Sends tab, pick a Standard send and queue it. A send spawns an extra creep on your own wave — risky, but it permanently raises your income. Hotkey Z.',
      placement: 'bottom',
      onEnter: () => { openSidebarPanel('economy'); switchEconTab('sends'); },
      advanceOn: { event: 'sendPurchased' },
    },
    {
      id: 'start_wave_2',
      target: { kind: 'dom', selector: SEL.startWaveBtn },
      title: 'Start Wave 2',
      body: "Fast creeps incoming — they're twice as quick as standards. Watch your Frost tower drag them down to a crawl.",
      placement: 'top',
      // Close the ECONOMY panel left open by buy_send so it doesn't
      // obscure the game area while the wave runs.
      onEnter: () => closeSidebarPanels(),
      advanceOn: { event: 'waveStarted' },
    },
    {
      id: 'watch_wave_2',
      target: { kind: 'screen' },
      title: 'Next Wave Running',
      body: "See the fast creeps bogging down in the frost zone? That's the synergy — slow them, then hit them while they're stuck. Next we try the safer income source.",
      placement: 'top-banner',
      advanceOn: { event: 'waveCleared' },
    },
    {
      id: 'place_fourth',
      // Same dynamic hint — re-inspects the path after the third
      // tower so the reinforcement strip moves further along the
      // current bulge direction.
      target: nextMazeExtensionTarget(),
      title: 'Reinforce',
      body: "Wave 3 brings a heavier creep. Extend the maze one more step — the highlight shows the next row along your current detour.",
      placement: 'top-banner',
      advanceOn: { event: 'towerPlaced' },
    },
    {
      id: 'buy_frontier',
      // Target the Frontier tab header rather than the tab content
      // below it — the tab button is always rendered as soon as the
      // economy panel is open, regardless of whether the tutorial's
      // auto-switch fired yet. The Nexus entry sits visually right
      // under the spotlighted tab, so the player's eye lands on the
      // section name and drops straight into the buy list.
      target: { kind: 'dom', selector: SEL.econFrontierTab },
      title: 'Build a Frontier',
      body: "Arcane's Frontier is the Leyline Nexus — steady income every wave, plus an Overcharge button you can hit for 3x burst gold at the cost of two dormant waves. Other factions have their own versions: Mechanical digs for more (with collapse risk), Nature grows and harvests, Void gambles. Tap the Frontier tab, pick the Leyline Nexus, and buy it.",
      placement: 'bottom',
      onEnter: () => { openSidebarPanel('economy'); switchEconTab('frontier'); },
      advanceOn: { event: 'frontierPurchased' },
    },
    {
      id: 'start_wave_3',
      target: { kind: 'dom', selector: SEL.startWaveBtn },
      title: 'Final Wave',
      body: "One heavier creep in this one. If it leaks you'll barely notice — you have 99 lives here.",
      placement: 'top',
      // Same as start_wave_2 — close the ECONOMY panel left open by
      // buy_frontier so the game area is clear for the final wave.
      onEnter: () => closeSidebarPanels(),
      advanceOn: { event: 'waveStarted' },
    },
    {
      id: 'watch_wave_3',
      target: { kind: 'screen' },
      title: 'Bring It Home',
      body: 'Let the final wave finish.',
      placement: 'top-banner',
      advanceOn: { event: 'waveCleared' },
    },
    {
      id: 'done',
      target: { kind: 'screen' },
      title: "You've Got It",
      body: "Place towers to maze, kill for gold, invest in income. Pick a faction and run a real match — Plains, Standard, Normal is a clean first pick.",
      cta: {
        label: 'Back to Menu',
        action: () => window.dispatchEvent(new Event('tutorial-go-menu')),
      },
    },
  ],
};

/** First standard-mode game — the income lesson. Keyed to in-game anchors. */
const incomeStandard: TutorialTrack = {
  id: 'income_standard',
  name: 'Economy — Standard',
  summary: 'Sends, Frontier, and why income matters on Normal and above.',
  steps: [
    {
      id: 'status_gold',
      target: { kind: 'dom', selector: SEL.statusGold },
      title: 'Gold',
      body: 'Your balance. Spend it on towers, upgrades, sends, or Frontier buildings.',
      placement: 'bottom',
    },
    {
      id: 'status_income',
      target: { kind: 'dom', selector: SEL.statusIncome },
      title: 'Income Per Wave',
      body: "See the +10/w figure? That's extra gold you'll get at the end of every wave, on top of kill rewards. Grow it fast.",
      placement: 'bottom',
    },
    {
      id: 'economy_panel',
      target: { kind: 'dom', selector: SEL.economyPanel },
      title: 'Economy Panel',
      body: 'Here are your send options and Frontier buildings. Sends spawn creeps on your own map for permanent income (risk + reward). Frontier buildings grow income safely over time.',
      placement: 'right',
      onEnter: () => openSidebarPanel('economy'),
    },
    {
      id: 'start_wave',
      target: { kind: 'dom', selector: SEL.startWaveBtn },
      title: 'Start Wave',
      body: 'When you are ready, start the next wave. Harder difficulties need higher income — early sends pay off massively by the late game.',
      placement: 'top',
    },
  ],
};

/** Essence / battle mode economy primer. */
const incomeBattle: TutorialTrack = {
  id: 'income_battle',
  name: 'Economy — Essence',
  summary: 'Dual economy: gold + essence.',
  steps: [
    {
      id: 'essence_intro',
      target: { kind: 'screen' },
      title: 'Essence Mode',
      body: 'You have two resources now. Gold buys towers as usual. Essence ticks in real time and buys special sends that convert back into income.',
    },
    {
      id: 'essence_panel',
      target: { kind: 'dom', selector: SEL.economyPanel },
      title: 'Essence Generators',
      body: 'Buy generators early — they compound. Spend essence on sends to boost your gold income. The loop: gold → generators → essence → sends → income → gold.',
      placement: 'right',
    },
  ],
};

/** Hero defence mode primer — deep dive on the hero shop panel. */
const incomeHero: TutorialTrack = {
  id: 'income_hero',
  name: 'Economy — Hero Defense',
  summary: 'Hero shop walkthrough: items, tomes, accessories, abilities.',
  steps: [
    {
      id: 'hero_intro',
      target: { kind: 'screen' },
      title: 'Hero Defense',
      body: 'You control a hero in a 12-row arena — 10x creeps, elites at waves 10/20/30. Economy is simpler: a percentage of unspent gold returns as interest between waves. Most of your gold goes into the hero shop.',
    },
    {
      id: 'shop_overview',
      target: { kind: 'dom', selector: SEL.economyPanel },
      title: 'The Hero Shop',
      body: "Everything for your hero lives in the ECONOMY panel: stats, XP, items, tomes, accessories, and abilities. You'll spend most of your gold here instead of on towers.",
      placement: 'right',
      onEnter: () => openSidebarPanel('economy'),
    },
    {
      id: 'shop_items',
      target: { kind: 'dom', selector: '[data-tutorial-target="hero-items"]' },
      title: 'Items',
      body: 'Six slot-based items. First purchase fills the slot at tier 1; subsequent purchases tier it up to the cap. Pick the slot, not the individual item — each slot has one fixed item per hero.',
      placement: 'right',
      onEnter: () => openSidebarPanel('economy'),
    },
    {
      id: 'shop_tomes',
      target: { kind: 'dom', selector: '[data-tutorial-target="hero-tomes"]' },
      title: 'Tomes',
      body: 'One-shot stat boosts. Usually cheaper early-game purchases that add raw HP / damage / attack speed to your hero. Costs climb as you buy more.',
      placement: 'right',
      onEnter: () => openSidebarPanel('economy'),
    },
    {
      id: 'shop_accessories',
      target: { kind: 'dom', selector: '[data-tutorial-target="hero-accessories"]' },
      title: 'Accessories',
      body: 'Up to 3 equipped at once. [P] are passive; [A] are active — press T in-game to trigger the active one. The offer pool rotates every few waves, so grab what fits your build.',
      placement: 'right',
      onEnter: () => openSidebarPanel('economy'),
    },
    {
      id: 'shop_abilities',
      target: { kind: 'dom', selector: '[data-tutorial-target="hero-abilities"]' },
      title: 'Abilities',
      body: 'Three abilities bound to Q/W/E, plus an ultimate at R (unlocks at hero level 6). Level up to earn upgrade points — spend them with the [+] icon on any ability.',
      placement: 'right',
      onEnter: () => openSidebarPanel('economy'),
    },
    {
      id: 'start_wave',
      target: { kind: 'dom', selector: SEL.startWaveBtn },
      title: 'Start Wave',
      body: "Saved gold isn't wasted — it comes back as interest. Don't overbuy early; a hero that survives wave 10 is worth more than a decked-out hero that dies at 5.",
      placement: 'top',
    },
  ],
};

/** Versus mode primer. Runs when entering the lobby. */
const multiplayer: TutorialTrack = {
  id: 'multiplayer',
  name: 'Online Play',
  summary: 'Versus 1v1 and Circle Co-op — no server, P2P.',
  steps: [
    {
      id: 'mp_intro',
      target: { kind: 'screen' },
      title: 'P2P Multiplayer',
      body: 'No accounts, no server. You and your friend exchange connection codes directly. One of you hosts, the other joins with the host code.',
    },
    {
      id: 'mp_versus',
      target: { kind: 'screen' },
      title: 'Versus 1v1',
      body: "In Versus, each player builds on their own map. Creeps you send attack your opponent. You lose income but they lose lives — use sends aggressively.",
    },
    {
      id: 'mp_circle',
      target: { kind: 'screen' },
      title: 'Circle Co-op',
      body: '2–4 players share a circular map. Everyone defends together — coordinate who handles which lane.',
    },
  ],
};

// ─── Per-faction content ────────────────────────────────────
// Short stubs for now — 2 screens each. Faction-track author can flesh these
// out into 4–5 step tours with canvas targets as content grows.

function factionTrack(id: string, name: string, tip: string): TutorialTrack {
  return {
    id: `faction:${id}`,
    name: `${name} Tip`,
    summary: `One-line strategy pointer for ${name}.`,
    steps: [
      {
        id: 'tip',
        target: { kind: 'screen' },
        title: `${name} — Key Tip`,
        body: tip,
      },
    ],
  };
}

const factionTracks: TutorialTrack[] = [
  factionTrack('arcane',     'Arcane',     'Stack crit towers on high-HP chokes. Arcane Meteor excels on grouped targets.'),
  factionTrack('mechanical', 'Mechanical', 'Mech Wall lets you maze with your eyes closed. Railgun shreds elite creeps.'),
  factionTrack('nature',     'Nature',     'Cluster Nature towers together — every adjacent buff stacks. Roots stop flyers cold.'),
  factionTrack('void',       'Void',       'Gold-on-hit towers snowball if they survive. Don’t over-commit to any one build.'),
  factionTrack('military',   'Military',   "Military units don't block the grid — use real walls/wire for mazing, units for damage."),
  factionTrack('aliens',     'Aliens',     'Spam Swarmlings from the Hive Spire. Quantity is quality.'),
  factionTrack('cypherpunk', 'Cypherpunk', 'Infect stacks turn creeps against each other. Keep the network online.'),
  factionTrack('infernal',   'Infernal',   "Don't build Infernal long-term. Cash in their burst and replace."),
  factionTrack('celestial',  'Celestial',  'Celestial towers can gain lives — stacking them turns leaks into non-events.'),
  factionTrack('psionic',    'Psionic',    'Psionic shines vs heavily armored waves. Save it for elites.'),
  factionTrack('harmonic',   'Harmonic',   'Plan the whole maze around your aura lattice. A disconnected Harmonic tower is a wasted slot.'),
  factionTrack('random',     'Random',     'Buy what fits the wave. Bought towers persist, so commit to keepers.'),
];

// ─── Per-mode content ───────────────────────────────────────

// Standard mode intentionally has no auto-primer — the basics tour already
// explains it. Other modes get a one-liner primer on first selection.
const modeTracks: TutorialTrack[] = [
  {
    id: 'mode:endless',
    name: 'Endless Primer',
    summary: 'No wave cap.',
    steps: [
      { id: 's', target: { kind: 'screen' }, title: 'Endless', body: 'Waves scale forever. Economy, towers, and sends work as in Standard — just no end. Score is the wave you die on.' },
    ],
  },
  {
    id: 'mode:battle',
    name: 'Essence Primer',
    summary: 'Dual economy.',
    steps: [
      { id: 's', target: { kind: 'screen' }, title: 'Essence (Battle)', body: 'Gold + Essence. Essence generators tick in real time, essence sends convert back to gold income. Snowball mode.' },
    ],
  },
  {
    id: 'mode:hero_defense',
    name: 'Hero Defense Primer',
    summary: 'Arena + hero.',
    steps: [
      { id: 's', target: { kind: 'screen' }, title: 'Hero Defense', body: '12-row arena, one hero under your control, simpler carryover economy. Use Q/W/E/R abilities and items.' },
    ],
  },
  {
    id: 'mode:gauntlet',
    name: 'Gauntlet Primer',
    summary: '100 waves through every faction.',
    steps: [
      { id: 's', target: { kind: 'screen' }, title: 'Gauntlet', body: '100 waves, each faction’s creep pool rotates. Draft a modifier at the start. Longest run in the game.' },
    ],
  },
];

// ─── Registry ───────────────────────────────────────────────

const ALL: TutorialTrack[] = [
  basics,
  tutorialMatch,
  skipHint,
  incomeStandard,
  incomeBattle,
  incomeHero,
  multiplayer,
  ...factionTracks,
  ...modeTracks,
];

const BY_ID = new Map<string, TutorialTrack>(ALL.map(t => [t.id, t]));

export function getTrack(id: string): TutorialTrack | null {
  return BY_ID.get(id) ?? null;
}

/** Tracks surfaced in the Help menu (basics + income + multiplayer + first
 *  handful of faction/mode primers). Keeps the menu scannable. */
export function getHelpMenuTracks(): TutorialTrack[] {
  return ALL;
}
