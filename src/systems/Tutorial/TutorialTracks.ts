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
import { requestEconTab } from '../../ui/game/EconomyPanelDOM';

export type Placement = 'top' | 'bottom' | 'left' | 'right' | 'center' | 'auto' | 'top-banner' | 'bottom-banner';

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
  // particular tower (e.g. Arcane Bolt for the first placement, Frost
  // for the slow-effect lesson).
  dockBoltSlot:  '[data-tutorial-tower-id="arcane_bolt"]',
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
 *  items / log). Used when a tutorial step needs specific tab content
 *  visible, e.g. `buy_frontier` activating the Frontier tab so the
 *  Leyline Nexus entry is highlighted rather than the Sends list.
 *
 *  Routes through `requestEconTab` rather than dispatching a raw
 *  window event. That helper stores the requested tab in a
 *  module-level ref that EconomyPanelDOM reads on mount, so the
 *  switch is delivered whether or not the panel was already mounted
 *  when the request fired. Previously used a setTimeout(0) dispatch
 *  which raced CollapsiblePanel's lazy-mount behaviour — the switch
 *  would drop when the panel wasn't rendered yet (reproducible on
 *  mobile sidebar + jumpToTutorialStep in e2e tests). */
function switchEconTab(tab: 'sends' | 'frontier' | 'essence' | 'items' | 'log'): void {
  requestEconTab(tab);
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
      body: "Changed your mind about the tour? Tap this ? button to replay any tutorial including the guided practice match.",
      placement: 'bottom',
    },
  ],
};

/** Replays from the Help carousel only — no longer auto-fires (Plan 3
 *  + 4: SplashScreen + FTG own first-launch onboarding, the `?`
 *  carousel owns ongoing reference). Copy rewritten in Plan 4 from
 *  the previous "What's Different" framing into plain teaching voice
 *  per user feedback that the old version read like marketing. */
const basics: TutorialTrack = {
  id: 'basics',
  name: 'Welcome Tour',
  summary: 'A walk through how the genre, the maps, and the menu work.',
  steps: [
    {
      id: 'intro',
      target: { kind: 'screen' },
      title: 'Quick Tour',
      body: "Five short cards on how the game works. Skip any time.",
    },
    {
      id: 'td_basics',
      target: { kind: 'screen' },
      title: 'How a Match Plays',
      body: 'Creeps walk from spawn to exit. Towers along the path kill them. Each kill drops gold. Spend gold on more towers. If too many creeps reach the exit, you lose.',
    },
    {
      id: 'mazing',
      target: { kind: 'screen' },
      title: 'Mazing',
      body: "Towers block tiles. Placing them in a pattern bends the creep path into a long S-curve through your towers. The longer the path, the longer your towers shoot. This is the dominant skill.",
    },
    {
      id: 'income',
      target: { kind: 'screen' },
      title: 'Income',
      body: 'On Normal and above, kill gold alone is not enough. You also raise wave income by buying Frontier buildings (safe, slow) or sending extra creeps onto your own wave (risky, faster).',
    },
    {
      id: 'factions',
      target: { kind: 'screen' },
      title: '11 Factions',
      body: "Each faction plays differently. The first time you pick one, a 5-line brief explains its identity. Locked factions appear silhouetted in the picker.",
    },
    {
      id: 'map',
      target: { kind: 'dom', selector: SEL.menuMapGrid },
      title: 'Maps',
      body: "Layouts vary in path length, entry count, and obstacles. Plains is straightforward. Random uses today\'s daily seed so everyone fights the same generated map.",
      placement: 'bottom',
    },
    {
      id: 'modes',
      target: { kind: 'dom', selector: SEL.menuModeCards },
      title: 'Game Modes',
      body: 'Standard is the baseline. Endless removes the wave cap. Hero Defense adds an arena hero. Modes you haven\'t unlocked yet are hidden until you\'re ready.',
      placement: 'top',
    },
    {
      id: 'encyclopedia',
      target: { kind: 'dom', selector: SEL.menuEncyclopediaBtn },
      title: 'Encyclopedia',
      body: 'Stats and traits for every tower, creep, and hero. Read up on a faction before playing it.',
      placement: 'top',
    },
    {
      id: 'store',
      target: { kind: 'dom', selector: SEL.menuStoreBtn },
      title: 'Store',
      body: 'Cosmetic skins and faction unlocks (paid with Shards earned in-game). No power purchases.',
      placement: 'top',
    },
    {
      id: 'done',
      target: { kind: 'dom', selector: SEL.menuModeStandard },
      title: "You're Ready",
      body: "Start with Standard on Plains, Normal difficulty. Or replay the guided First Tutorial from the ? menu.",
      placement: 'top',
      cta: {
        label: 'Replay First Tutorial',
        action: () => window.dispatchEvent(new Event('tutorial-launch-ftg')),
      },
    },
  ],
};

/** First Tutorial Game (Plan 3) — the cold-boot 5-minute onboarding
 *  game launched from the splash. Deliberately slimmer than
 *  `tutorial_match`: mazing + towers ONLY. No frontier, no sends, no
 *  draft. The player learns the single most important skill of the
 *  game (mazing) before being introduced to anything else.
 *
 *  Plays as Arcane on the tutorial map (single straight east-west
 *  path through the vertical middle). Lives = 99 (TutorialMode
 *  default), so leaks here are not fatal — but the script tries to
 *  guide the player to a clean win.
 *
 *  On complete: PlayerProfile.markFirstGameComplete() fires (wired in
 *  TutorialManager.complete) — sets the FTG flag so splash never
 *  re-prompts, and grants a one-shot XP bonus that crosses L1→L2 so
 *  the player sees the unlock loop immediately. */
const ftg: TutorialTrack = {
  id: 'ftg',
  name: 'First Tutorial',
  summary: 'A 5-minute starter — place towers, shape the path, win one short game.',
  scrimless: true,
  skipLabel: 'Quit',
  steps: [
    {
      id: 'welcome',
      target: { kind: 'screen' },
      title: 'Welcome',
      body: "Quick start. We'll place a couple of towers, run a few waves, and you're done. You can quit any time.",
    },
    {
      id: 'pick_bolt',
      target: { kind: 'dom', selector: SEL.dockBoltSlot },
      title: 'Pick a Tower',
      body: 'Tap the Arcane Bolt card in the dock. The basic Arcane tower.',
      placement: 'top',
      advanceOn: { event: 'dockTowerSelected' },
    },
    {
      id: 'place_first',
      target: gridCellRect(10, 13, 5, 1),
      title: 'Place It Here',
      body: 'Drop the tower anywhere in the highlighted strip. Watch what happens to the creep path.',
      placement: 'top-banner',
      advanceOn: { event: 'towerPlaced' },
    },
    {
      id: 'mazing',
      target: { kind: 'screen' },
      title: "That's Mazing",
      body: "The path bent around your tower. Every tower you drop reshapes the route. Longer creep walk = more time your towers have to shoot. This is the heart of the game.",
    },
    {
      id: 'pick_bolt_2',
      target: { kind: 'dom', selector: SEL.dockBoltSlot },
      title: 'Pick Bolt Again',
      body: 'Select Arcane Bolt one more time. We need a second to make a real maze.',
      placement: 'top',
      advanceOn: { event: 'dockTowerSelected' },
    },
    {
      id: 'place_second',
      target: nextMazeExtensionTarget(),
      title: 'Extend the Maze',
      body: 'Drop a second Bolt in the highlighted strip. The longer the detour, the longer your towers shoot.',
      placement: 'top-banner',
      advanceOn: { event: 'towerPlaced' },
    },
    {
      id: 'start_wave_1',
      target: { kind: 'dom', selector: SEL.startWaveBtn },
      title: 'Start Wave 1',
      body: 'Tap Next Wave. A few slow creeps will spawn. Your two Bolts can handle them.',
      placement: 'top',
      advanceOn: { event: 'waveStarted' },
    },
    {
      id: 'watch_wave_1',
      target: { kind: 'dom', selector: SEL.statusGold },
      title: 'Kills Drop Gold',
      body: 'Watch your gold tick up — every kill pays. Wait for the wave to finish.',
      placement: 'top-banner',
      advanceOn: { event: 'waveCleared' },
    },
    {
      id: 'done',
      target: { kind: 'screen' },
      title: "You're Set",
      body: 'That\'s mazing and tower placement — the core of every match. Pick a faction and play a real game when you\'re ready.',
      cta: {
        label: 'Back to Menu',
        action: () => window.dispatchEvent(new Event('tutorial-go-menu')),
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
  summary: 'An introductory scripted round playing as Arcane: learn to maze, run some waves, challenge sends, and build a frontier structure.',
  scrimless: true,
  skipLabel: 'Quit',
  steps: [
    {
      id: 'welcome',
      target: { kind: 'screen' },
      title: 'Welcome',
      body: "This is a short sandbox round. We'll place towers, run three waves, and use the income systems at least once each.",
    },
    {
      id: 'pick_tower',
      // Highlight the Bolt slot specifically so the player's eye lands
      // on the exact card, matching the per-tower highlight pattern
      // used later for Frost. Prevents the "which tower is the right
      // one?" hesitation on mobile where multi-tower docks are dense.
      target: { kind: 'dom', selector: SEL.dockBoltSlot },
      title: 'Pick a Tower',
      body: 'Click Arcane Bolt tower. It is the basic Arcane tower. You should see it as a glowing card in the dock.',
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
      body: "The path bent around your tower. Every tower you drop reshapes the route. The longer you make creeps walk, the more time your towers have to shoot them.",
    },
    {
      id: 'pick_bolt_2',
      // Re-select Bolt. The explainer step before this deselects the
      // dock (TutorialManager's requestSelectDockTower(-1) on non-
      // placement steps), so the player would otherwise land on the
      // placement step with no tower active. Mirroring the pick_frost
      // pattern: one step to pick, one to place.
      target: { kind: 'dom', selector: SEL.dockBoltSlot },
      title: 'Pick Bolt Again',
      body: 'Select Arcane Bolt tower again. We need a second one to extend the maze.',
      placement: 'top',
      advanceOn: { event: 'dockTowerSelected' },
    },
    {
      id: 'place_second',
      // Dynamic: highlights the strip just past the first tower's
      // bulge, so placing another Bolt extends the detour.
      target: nextMazeExtensionTarget(),
      title: 'Extend the Maze',
      body: "Drop the Bolt in the highlighted strip. You want creeps to walk past your towers as long as possible.",
      placement: 'top-banner',
      advanceOn: { event: 'towerPlaced' },
    },
    {
      id: 'start_wave_1',
      target: { kind: 'dom', selector: SEL.startWaveBtn },
      title: 'Start Wave 1',
      body: "Click Next Wave. Five slow creeps will spawn and your two Bolts should handle them easily. Then we'll add some variety.",
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
      body: "See the +10/w next to your gold? That's your income. You get it at the end of every wave regardless of kills. Sends and Frontier buildings both raise it.",
      placement: 'bottom',
    },
    {
      id: 'pick_frost',
      target: { kind: 'dom', selector: SEL.dockFrostSlot },
      title: 'Try the Frost Tower',
      body: "Not every tower deals huge damage. Arcane Frost slows creeps it hits. You can Pair it with your Bolts and creeps crawl through your killzone.",
      placement: 'top',
      advanceOn: { event: 'dockTowerSelected' },
    },
    {
      id: 'place_frost',
      // Dynamic: drop the Frost tower in the strip adjacent to the
      // current route so it hits creeps in the maze, not a dead zone.
      target: nextMazeExtensionTarget(),
      title: 'Place the Frost',
      body: "Drop it in the highlighted strip so it hits the detoured creeps. Wave 2 introduces fast creeps. They'll show the slow effect clearly.",
      placement: 'top-banner',
      advanceOn: { event: 'towerPlaced' },
    },
    {
      id: 'buy_send',
      // Target the tab header (always rendered when the panel is
      // open) but pin the popover to the viewport BOTTOM so it
      // doesn't overlap the send list sitting in the top-left
      // ECONOMY panel on mobile.
      target: { kind: 'dom', selector: SEL.econSendsTab },
      title: 'Buy a Send',
      body: 'On the Sends tab, pick a Standard send and queue it. A send spawns an extra pack of creeps on your own wave. It is risky, but it permanently raises your income. You get money from the kills plus income.',
      placement: 'bottom-banner',
      onEnter: () => { openSidebarPanel('economy'); switchEconTab('sends'); },
      advanceOn: { event: 'sendPurchased' },
    },
    {
      id: 'start_wave_2',
      target: { kind: 'dom', selector: SEL.startWaveBtn },
      title: 'Start Wave 2',
      body: "More fast creeps incoming. They're twice as quick as standard creeps. Watch your Frost tower drag them down to a crawl.",
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
      body: "See the fast creeps slowing down in the frost zone? That's the Arcane synergy. Slow them, then hit them while they're stuck. Next we try the safer income source.",
      placement: 'top-banner',
      advanceOn: { event: 'waveCleared' },
    },
    {
      id: 'pick_bolt_reinforce',
      // Same re-pick pattern as pick_bolt_2 — watch_wave_2 is a
      // non-placement step that deselects the dock, so we need an
      // explicit selection step before the next placement.
      target: { kind: 'dom', selector: SEL.dockBoltSlot },
      title: 'Pick Bolt',
      body: 'One more Arcane Bolt tower for the final wave. Select it from the dock.',
      placement: 'top',
      advanceOn: { event: 'dockTowerSelected' },
    },
    {
      id: 'place_fourth',
      // Same dynamic hint — re-inspects the path after the third
      // tower so the reinforcement strip moves further along the
      // current bulge direction.
      target: nextMazeExtensionTarget(),
      title: 'Reinforce',
      body: "Wave 3 brings an armoured creep. Extend the maze once more. You can choose any tower you'd like. The highlight shows the next row along your current detour.",
      placement: 'top-banner',
      advanceOn: { event: 'towerPlaced' },
    },
    {
      id: 'frontier_intro',
      target: { kind: 'screen' },
      title: 'Frontier. Safe Income',
      body: "Every faction has two Frontier structures: passive income that ticks up every wave, no risk, no extra creeps to fight. It's the quiet, reliable counterpart to Sends. Over a long match, Frontier investments compound into most of your gold. For Arcane, that's the Leyline Nexus. We'll buy one next.",
      placement: 'top-banner',
    },
    {
      id: 'leyline_nexus_intro',
      target: { kind: 'screen' },
      title: 'The Leyline Nexus',
      body: "The Nexus generates steady income and has an Overcharge button you can hit for a 3× gold burst, at the cost of two dormant waves after. Other factions have their own flavour: Mechanical digs (more gold, collapse risk), Nature grows and harvests on a cycle, Void gambles for a jackpot. They all fill the same slot in the economy.",
      placement: 'top-banner',
    },
    {
      id: 'buy_frontier',
      // Target the Frontier tab header; popover pinned to the
      // viewport bottom so the Nexus buy list (which sits in the
      // top-left ECONOMY panel) stays visible on mobile.
      target: { kind: 'dom', selector: SEL.econFrontierTab },
      title: 'Buy the Nexus',
      body: "Tap the Frontier tab and buy a Leyline Nexus. You'll see your +w income jump at the end of the next wave.",
      placement: 'bottom-banner',
      onEnter: () => { openSidebarPanel('economy'); switchEconTab('frontier'); },
      advanceOn: { event: 'frontierPurchased' },
    },
    {
      id: 'start_wave_3',
      target: { kind: 'dom', selector: SEL.startWaveBtn },
      title: 'Final Wave',
      body: "One armoured creep in this one. Don't worry if it leaks. You have 99 lives here.",
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
      body: "Place towers to maze, kill for gold, invest in income. Pick a faction and run a real match. Plains, Standard, Normal is a clean first pick.",
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
  name: 'Economy: Standard',
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
      body: 'When you are ready, start the next wave. Harder difficulties need higher income. Early sends pay off massively by the late game. It is a balancing act between investing in income early and keeping yourself alive.',
      placement: 'top',
    },
  ],
};

/** Essence / battle mode economy primer. */
const incomeBattle: TutorialTrack = {
  id: 'income_battle',
  name: 'Economy: Essence',
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
      body: 'Buy generators early. They compound over time. Spend essence on sends to boost your gold income. The loop: gold → generators → essence → sends → income → gold.',
      placement: 'right',
    },
  ],
};

/** Hero defence mode primer — deep dive on the hero shop panel. */
const incomeHero: TutorialTrack = {
  id: 'income_hero',
  name: 'Economy: Hero Defense',
  summary: 'Hero shop walkthrough: items, tomes, accessories, abilities.',
  steps: [
    {
      id: 'hero_intro',
      target: { kind: 'screen' },
      title: 'Hero Defense',
      body: 'You control a hero in a 12-row arena. This mode has 10x creeps and elites at waves 10/20/30. The economy is simpler: a percentage of unspent gold returns as interest between waves. Most of your gold goes into the hero shop.',
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
      body: 'Six slot-based items. First purchase fills the slot at tier 1; subsequent purchases tier it up to the cap.',
      placement: 'right',
      onEnter: () => openSidebarPanel('economy'),
    },
    {
      id: 'shop_tomes',
      target: { kind: 'dom', selector: '[data-tutorial-target="hero-tomes"]' },
      title: 'Tomes',
      body: 'One-shot stat boosts. Usually cheaper early-game purchases that add raw HP / damage / attack speed to your hero. Costs climb as you buy more. ',
      placement: 'right',
      onEnter: () => openSidebarPanel('economy'),
    },
    {
      id: 'shop_accessories',
      target: { kind: 'dom', selector: '[data-tutorial-target="hero-accessories"]' },
      title: 'Accessories',
      body: 'Up to 3 equipped at once. [P] are passive; [A] are active. Press T in-game to trigger the active one. The offer pool rotates every few waves, so grab what fits your build.',
      placement: 'right',
      onEnter: () => openSidebarPanel('economy'),
    },
    {
      id: 'shop_abilities',
      target: { kind: 'dom', selector: '[data-tutorial-target="hero-abilities"]' },
      title: 'Abilities',
      body: 'Three abilities bound to Q/W/E, plus an ultimate at R (unlocks at hero level 6). Level up to earn upgrade points and spend them with the [+] icon on any ability.',
      placement: 'right',
      onEnter: () => openSidebarPanel('economy'),
    },
    {
      id: 'start_wave',
      target: { kind: 'dom', selector: SEL.startWaveBtn },
      title: 'Start Wave',
      body: "Saved gold isn't wasted because it comes back as interest. Don't overbuy early; a hero that survives wave 10 is worth more than a decked-out hero that dies at 5.",
      placement: 'top',
    },
  ],
};

/** Versus mode primer. Runs when entering the lobby. */
const multiplayer: TutorialTrack = {
  id: 'multiplayer',
  name: 'Online Play',
  summary: 'Versus 1v1 and Circle Co-op. No server required games are done over P2P.',
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
      body: "In Versus, each player builds on their own map. Creeps you send attack your opponent. You try to overwhelm them while balancing your own defences. When you send you're giving them a one time cash infusion if they survive but you get consistent income.",
    },
    {
      id: 'mp_circle',
      target: { kind: 'screen' },
      title: 'Circle Co-op',
      body: '2–4 players share a circular map. Everyone defends together. Help your allies when they leak.',
    },
  ],
};

// ─── Tutorial 3 (Versus vs CPU) ─────────────────────────────
// Plan 4: a real 5-wave Versus session against a bot opponent. Lobby
// auto-spins this up when the Help-carousel CTA fires (sets the
// `__tutorialVsCpuQueued` window flag, which LobbyScreen consumes on
// mount). Track runs inside GameScene with coach marks for the three
// versus-specific UX surfaces: opponent minimap, send-to-opponent
// (sends GO TO the opponent here, not yourself), and the ready vote.
const tutorialVsCpu: TutorialTrack = {
  id: 'tutorial_vs_cpu',
  name: 'Versus Tutorial',
  summary: 'Five-wave game against a CPU. Learn how sends and ready-votes work in 1v1.',
  scrimless: true,
  skipLabel: 'Quit',
  steps: [
    {
      id: 'welcome',
      target: { kind: 'screen' },
      title: '1v1 vs CPU',
      body: "Same as Standard — except your sends spawn on the opponent's map, and theirs spawn on yours. Five short waves. Lose, draw, or win — it's practice.",
    },
    {
      id: 'sends_explainer',
      target: { kind: 'dom', selector: SEL.econSendsTab },
      title: 'Sends Go to Them',
      body: 'In Versus, buying a send dumps creeps onto your opponent\'s map. You get permanent income, they get more to fight. Risky for them, profitable for you.',
      placement: 'bottom-banner',
      onEnter: () => { openSidebarPanel('economy'); switchEconTab('sends'); },
    },
    {
      id: 'opponent_minimap',
      target: { kind: 'screen' },
      title: 'Opponent Minimap',
      body: "Top-right shows the opponent's board — towers, lives, wave, ready status. Tap it to swap to a full opponent view.",
    },
    {
      id: 'ready_vote',
      target: { kind: 'dom', selector: SEL.startWaveBtn },
      title: 'Ready Vote',
      body: 'Press the Start Wave button (or SPACE) to vote ready. The wave starts when both players ready up — or when the timer expires.',
      placement: 'top',
      onEnter: () => closeSidebarPanels(),
    },
    {
      id: 'play_through',
      target: { kind: 'screen' },
      title: 'Play It Out',
      body: 'Five waves. Try a send mid-game and watch your income climb. The CPU plays a balanced strategy — it\'s a safe sparring partner.',
    },
    {
      id: 'done',
      target: { kind: 'screen' },
      title: "Versus Basics Down",
      body: "When you\'re ready, jump back to the lobby for a real opponent — or run another vs CPU. Public matchmaking comes in a later release.",
      cta: {
        label: 'Back to Menu',
        action: () => window.dispatchEvent(new Event('tutorial-go-menu')),
      },
    },
  ],
};

// ─── Tutorial 2 (Economy) ─────────────────────────────
// Plan 4: a gentle 4-wave embedded lesson on Hero Plains. Same in-game
// shape as FTG (mode=tutorial, 99 lives, +250g start) but centred on
// the three income sources: kill gold, frontier buildings, and
// sends. The player can't fail — the lesson is told, not felt.
//
// Trigger entry points: the Help carousel ("Learn the Economy" tile)
// and an end-of-FTG CTA. No auto-prompt.
const tutorialEconomy: TutorialTrack = {
  id: 'tutorial_economy',
  name: 'Economy Lesson',
  summary: 'Three income sources: kills, frontier buildings, sends. Quick guided round on Hero Plains.',
  scrimless: true,
  skipLabel: 'Quit',
  steps: [
    {
      id: 'welcome',
      target: { kind: 'screen' },
      title: 'Three Ways to Get Gold',
      body: 'Kills pay out, but on Normal+ you also need passive income. Four short waves to show you how.',
    },
    {
      id: 'pick_bolt',
      target: { kind: 'dom', selector: SEL.dockBoltSlot },
      title: 'Place a Bolt',
      body: 'Tap the Arcane Bolt card. Drop it on the path so something kills creeps in wave 1.',
      placement: 'top',
      advanceOn: { event: 'dockTowerSelected' },
    },
    {
      id: 'place_first',
      target: { kind: 'screen' },
      title: 'Drop It',
      body: 'Anywhere on the corridor works. Then start wave 1.',
      placement: 'top-banner',
      advanceOn: { event: 'towerPlaced' },
    },
    {
      id: 'start_wave_1',
      target: { kind: 'dom', selector: SEL.startWaveBtn },
      title: 'Start Wave 1',
      body: 'Watch what happens to your gold balance as creeps die.',
      placement: 'top',
      advanceOn: { event: 'waveStarted' },
    },
    {
      id: 'kill_gold',
      target: { kind: 'dom', selector: SEL.statusGold },
      title: 'Kills Drop Gold',
      body: 'Every creep pays out. This is the first income source.',
      placement: 'bottom',
      advanceOn: { event: 'waveCleared' },
    },
    {
      id: 'wave_income',
      target: { kind: 'dom', selector: SEL.statusIncome },
      title: '+ Per-Wave Income',
      body: "See the +X/w next to your gold? That's wave income — you get it at the end of every wave whether you killed anything or not. Frontier buildings and sends both raise this.",
      placement: 'bottom',
    },
    {
      id: 'frontier_intro',
      target: { kind: 'screen' },
      title: 'Source 2 — Frontier',
      body: "Frontier buildings tick income up every wave with no risk. They're the safe, slow option — quietly compound into most of your late-game gold.",
    },
    {
      id: 'buy_frontier',
      target: { kind: 'dom', selector: SEL.econFrontierTab },
      title: 'Buy a Leyline Nexus',
      body: 'Open the Frontier tab and buy the Leyline Nexus. Your wave income jumps next wave.',
      placement: 'bottom-banner',
      onEnter: () => { openSidebarPanel('economy'); switchEconTab('frontier'); },
      advanceOn: { event: 'frontierPurchased' },
    },
    {
      id: 'start_wave_2',
      target: { kind: 'dom', selector: SEL.startWaveBtn },
      title: 'Start Wave 2',
      body: "Run wave 2. After it, watch your wave-income figure tick up.",
      placement: 'top',
      onEnter: () => closeSidebarPanels(),
      advanceOn: { event: 'waveStarted' },
    },
    {
      id: 'watch_wave_2',
      target: { kind: 'screen' },
      title: 'Income Climbing',
      body: "Frontier income compounds — every wave it pays. The earlier you buy, the more cumulative gold.",
      placement: 'top-banner',
      advanceOn: { event: 'waveCleared' },
    },
    {
      id: 'sends_intro',
      target: { kind: 'screen' },
      title: 'Source 3 — Sends',
      body: 'Sends spawn EXTRA creeps on your wave. Risky — more to fight — but each send permanently raises your wave income. The faster, riskier income.',
    },
    {
      id: 'buy_send',
      target: { kind: 'dom', selector: SEL.econSendsTab },
      title: 'Queue a Send',
      body: 'Open the Sends tab and queue a Standard send. Extra creeps will spawn on the next wave; if you survive, your income jumps permanently.',
      placement: 'bottom-banner',
      onEnter: () => { openSidebarPanel('economy'); switchEconTab('sends'); },
      advanceOn: { event: 'sendPurchased' },
    },
    {
      id: 'start_wave_3',
      target: { kind: 'dom', selector: SEL.startWaveBtn },
      title: 'Start Wave 3',
      body: "Heavier wave coming because you sent. Survive it.",
      placement: 'top',
      onEnter: () => closeSidebarPanels(),
      advanceOn: { event: 'waveStarted' },
    },
    {
      id: 'watch_wave_3',
      target: { kind: 'screen' },
      title: 'Synthesis',
      body: 'Kill gold + frontier ticks + send-driven income. All three together = winning the economy.',
      placement: 'top-banner',
      advanceOn: { event: 'waveCleared' },
    },
    {
      id: 'done',
      target: { kind: 'screen' },
      title: "That's the Economy",
      body: "On Normal and above, just killing creeps isn't enough. Mix all three. Frontier early, sends when you're stable, kill gold from a tight maze.",
      cta: {
        label: 'Back to Menu',
        action: () => window.dispatchEvent(new Event('tutorial-go-menu')),
      },
    },
  ],
};

// ─── JIT (Just-In-Time) lessons ─────────────────────────────
// Plan 4: tiny one-step popovers fired the FIRST time a game-event
// concept appears. Each fires once per profile, gated on
// PlayerProfile flags (`jit_seen.{concept}`). They run scrimless so
// the player can keep watching the wave; tap the popover to dismiss.

function jitTrack(id: string, title: string, body: string): TutorialTrack {
  return {
    id,
    name: title,
    summary: body.length > 80 ? body.slice(0, 77) + '…' : body,
    scrimless: true,
    skipLabel: 'Got it',
    steps: [{ id: 'tip', target: { kind: 'screen' }, title, body, placement: 'top-banner' }],
  };
}

const jitFlying = jitTrack(
  'jit_flying',
  'Flying Creeps',
  "These ignore your maze and fly straight to the exit. Some towers can't hit them — Arcane Bolt and Frost can.",
);
const jitRegen = jitTrack(
  'jit_regen',
  'Regenerating Creep',
  'This creep heals between hits. You need sustained damage, not burst — keep it in your kill zone.',
);
const jitMage = jitTrack(
  'jit_mage',
  'Mage Creep',
  'Mage creeps cast auras that buff nearby creeps. Mute them with Cypherpunk Rootkit, Celestial Ward, or kill them first.',
);
const jitBoss = jitTrack(
  'jit_boss',
  'Boss Wave',
  'Bosses are massive. They cost 5 lives if they leak. Burn them down before they reach the end.',
);
const jitLeak = jitTrack(
  'jit_leak',
  'Watch the Path',
  'Your last placement opened a leak in the maze. Place a tower or wall to close the gap.',
);

const jitTracks: TutorialTrack[] = [jitFlying, jitRegen, jitMage, jitBoss, jitLeak];

// ─── Per-faction content ────────────────────────────────────
// Plan 4: each brief is a 5-line teaching block — identity, opener,
// key tower, key trap (what to avoid), win condition. Players can
// suppress every brief with a global toggle (TutorialPersistence
// .setFactionBriefsSkipped) — the Skip-all checkbox renders inline
// on every brief intro step.

interface FactionBriefContent {
  identity: string;
  opener: string;
  keyTower: string;
  keyTrap: string;
  winCon: string;
}

function factionTrack(id: string, name: string, c: FactionBriefContent): TutorialTrack {
  return {
    id: `faction:${id}`,
    name: `${name} Brief`,
    summary: `Five-line overview of how ${name} plays.`,
    steps: [
      { id: 'identity',   target: { kind: 'screen' }, title: `${name} — Identity`,        body: c.identity },
      { id: 'opener',     target: { kind: 'screen' }, title: `${name} — Opener`,          body: c.opener },
      { id: 'key_tower',  target: { kind: 'screen' }, title: `${name} — Key Tower`,       body: c.keyTower },
      { id: 'key_trap',   target: { kind: 'screen' }, title: `${name} — Watch Out For`,   body: c.keyTrap },
      { id: 'win_con',    target: { kind: 'screen' }, title: `${name} — How You Win`,     body: c.winCon },
    ],
  };
}

const factionTracks: TutorialTrack[] = [
  factionTrack('arcane', 'Arcane', {
    identity: 'High-fantasy precision magic. Crits, AoE, and damage amplification — efficient single-target kills with strong burst.',
    opener:   'Bolt (25g) is the workhorse — drop two before wave 1, then add a Frost (35g) at the first curve. Income comes later.',
    keyTower: 'Focus (90g) — sniper with 25% crit for 3x damage. Place on long sightlines so it gets full uptime on each creep.',
    keyTrap:  'Skipping Mana Drain (120g) on shielded boss waves leaves your damage absorbed. One Drain near the boss path is mandatory.',
    winCon:   'Stack a Meteor (200g) into your kill zone, max your Bolts, and let crits do the work. The Arcane Nova ultimate (700g) closes 100-wave runs.',
  }),
  factionTrack('mechanical', 'Mechanical', {
    identity: 'Steampunk engineering. Cheap walls, heavy artillery, sustained burn. Wins on long maps with deep mazes.',
    opener:   'Wall (10g) lets you maze with your eyes closed. Build the maze first, then drop a Turret (30g) at the first choke.',
    keyTower: 'Mortar (120g) — extreme range, huge splash. One Mortar covers most of a small map; two cover everything.',
    keyTrap:  'Walls everywhere with no DPS = leaks. Spend at least 60% of your gold on shooters, not bricks.',
    winCon:   'Railgun (300g) pierces every creep in a line. Aim it down a long straight section — it deletes packs in one shot.',
  }),
  factionTrack('nature', 'Nature', {
    identity: 'Living forest. Poison, roots, and adjacency synergy — every Nature tower next to another gets stronger.',
    opener:   'Bramble Hedge (12g) doubles as wall and damage. Cluster three or four early, then add Root (25g) for the slow.',
    keyTower: 'Blossom (60g) — no attack, but +25% damage and +15% fire rate to every adjacent tower per level. Sit it in the middle of a shooter cluster.',
    keyTrap:  "Spreading towers thin kills your synergy. Nature wants tight 3x3 clusters, not a long thin line.",
    winCon:   'Spore (100g) ticks 2-3% HP/s on every creep in range, ignoring armor. Two Spores wipe most boss waves outright.',
  }),
  factionTrack('void', 'Void', {
    identity: 'Pure chaos. Gambling, random damage, gold generation, teleportation. High variance — explosive wins, brutal losses.',
    opener:   'Gambler (15g, cheapest tower in the game) and Spike (30g, 50–150% damage) both swing wildly. Build many cheap, not few expensive.',
    keyTower: 'Siphon (50g) — +1 gold per hit. One Siphon on a busy choke pays itself off by wave 5.',
    keyTrap:  'Over-committing to a single build. Void wants spread bets; if your Gambler whiffs three waves you need a backup plan.',
    winCon:   "Stack Siphons until you're rich, drop the Oblivion ultimate (900g), and let 15% instakills + +3g/hit carry you home.",
  }),
  factionTrack('military', 'Military', {
    identity: 'Boots on the ground. Mobile units that walk to engage — they don\'t block the grid, so you maze with cheap walls instead.',
    opener:   'Sandbag (8g, cheapest wall) for the maze, then Rifleman (40g, mobile ranged) to chase down stragglers.',
    keyTower: 'Tank (120g) — slow but huge AoE explosive shells with massive range. One Tank deletes packs from across the map.',
    keyTrap:  'Treating Riflemen / Brawlers as walls — they move. Plan your maze around the immobile Sandbag/Wire, not the units.',
    winCon:   'Commander (750g) is a mobile fighter + adjacency aura. Drop it at the worst chokepoint and your whole army hits harder.',
  }),
  factionTrack('aliens', 'Aliens', {
    identity: 'The hive. Cheap, fast-firing swarm units that overwhelm with quantity — every tower fires fast, none hit hard alone.',
    opener:   'Spitter (12g) fires every 250ms — drop four before wave 1. Cheapest reliable DPS in the game.',
    keyTower: 'Swarm Node (60g) — no attack, but every Alien tower in range fires 20% faster. Drop it in the middle of your swarm.',
    keyTrap:  "One big tower instead of many small ones. Aliens lose to single-target heavy damage — stay swarmy.",
    winCon:   "Hive Spire (180g) chains to 5 targets. One in your kill zone wipes packs; two delete everything. Overmind ultimate (700g) makes the whole faction faster.",
  }),
  factionTrack('cypherpunk', 'Cypherpunk', {
    identity: 'Digital warfare. Hack creep behavior — make them walk backward, infect them with spreading viruses, mute their abilities.',
    opener:   'Ping (15g) is a long-range chip-damage tower; build two early. Firewall (35g) chains to another Firewall — two of them lay a damaging beam between.',
    keyTower: 'Virus (55g) — DoT that spreads to nearby creeps. One Virus on a chokepoint infects the whole wave.',
    keyTrap:  'Building one Firewall alone. Firewalls only damage things between LINKED pairs — always build them in twos.',
    winCon:   'Backdoor (90g) walks creeps backward, doubling their time in your kill zone. Stack it with DDoS root (150g) and Rootkit shred — Zero Day ultimate (800g) does it all at once.',
  }),
  factionTrack('infernal', 'Infernal', {
    identity: 'Sacrifice and decay. Towers expire (Imp), lose damage per wave (Hellfire), or self-destruct (Fiend). Pure burst, no longevity.',
    opener:   'Imp (12g) — 12 dmg every 700ms but expires after 4 waves. Spam them early, replace them constantly. Treat them as ammunition.',
    keyTower: 'Soul Drain (90g) — +2 gold per kill within range. Drop near a chokepoint to fund the constant Imp turnover.',
    keyTrap:  "Building Infernal long-term. Hellfire (45g) loses 15% damage per wave — sell it before it withers. Don’t fall in love with any tower.",
    winCon:   'Cash in burst, replace constantly. Apocalypse ultimate (900g) is the closer — massive burn AoE + damage amp on the wave you need it.',
  }),
  factionTrack('celestial', 'Celestial', {
    identity: 'Holy protection. Lower DPS than other factions, but towers can gain lives back, absorb leaks, and protect the player.',
    opener:   'Acolyte (25g) is your basic shooter — 5% chance on nearby kill to grant +1 life. Stack three to start refunding leaks.',
    keyTower: 'Sanctuary (150g) — absorbs 1 leaked creep entirely (recharges every 10 waves). One per chokepoint = one free leak per cycle.',
    keyTrap:  "Treating Celestial like a damage faction. Your DPS is weak — Celestial wins by losing fewer lives than the cost of leaks.",
    winCon:   'Stack Acolytes near chokes to refund lives, hold critical waves with Sanctuary absorbs. Absolution ultimate (600g) closes with holy AoE + 10% life-on-kill.',
  }),
  factionTrack('psionic', 'Psionic', {
    identity: 'True damage and mind control. Bypasses armor entirely, plus tools to confuse / fear / slow creeps.',
    opener:   'Probe (20g) — true damage, ignores all armor. Two early Probes chew through any armored opener.',
    keyTower: 'Mesmer (45g) confuses creeps to walk backward 1.2s. Place at chokepoints to multiply your kill-zone uptime.',
    keyTrap:  "Skipping Psionic on heavily-armored waves. If everyone else has 20+ armor, only Psionic is dealing full damage.",
    winCon:   'Mind Spike (150g) at long range deletes mage creeps. Overmind ultimate (750g) is mass confusion + true damage AoE — saves armored boss waves.',
  }),
  factionTrack('harmonic', 'Harmonic', {
    identity: 'Aura network. Towers are weak alone but devastating when their auras overlap — the placement-puzzle faction.',
    opener:   'Drop a Resonator (20g) first, then surround it with one Amplifier (30g, +damage), one Quickener (40g, +AS), one Reach (50g, +range). Synergy is the gameplay.',
    keyTower: 'Conduit (100g) — manually links 2-3 aura towers and shares their effects across the map at 70%. Bridges your network.',
    keyTrap:  'A disconnected Harmonic tower is a wasted slot. Plan the whole maze around aura coverage, not individual placements.',
    winCon:   "Crescendo ultimate (650g) is moderate DPS designed to soak every aura you've stacked. Build the lattice first, drop the Crescendo last.",
  }),
  factionTrack('chaos', 'Chaos', {
    identity: 'Adapt or die. Each wave you get 6 random towers from all factions — bought towers persist, so commit to keepers.',
    opener:   'Buy what fits the FIRST wave. The second-wave roll is different; you can\'t plan a build, only react.',
    keyTower: "Whichever faction's ultimate you happen to roll. Save up for it — most ultimates carry the run on their own.",
    keyTrap:  "Buying every tower offered. You'll go broke. Pick 1-2 per wave, save the rest for upgrades and ultimates.",
    winCon:   'Synergy luck. If you get a Frost + Storm + Spore roll, lean hard into AoE. If you get Cypherpunk + Psionic, lean disrupt. Read the rolls.',
  }),
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
      { id: 's', target: { kind: 'screen' }, title: 'Endless', body: 'Waves scale forever. Economy, towers, and sends work as in Standard. The match doesn\'t end until you lose. Score is the wave you die on.' },
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
  ftg,
  tutorialEconomy,
  tutorialVsCpu,
  basics,
  tutorialMatch,
  skipHint,
  incomeStandard,
  incomeBattle,
  incomeHero,
  multiplayer,
  ...jitTracks,
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
