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
import type { TutorialTarget } from './TutorialTargets';
import type { GameEvents } from '../EventBus';

export type Placement = 'top' | 'bottom' | 'left' | 'right' | 'center' | 'auto';

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
}

export interface TutorialTrack {
  id: string;
  /** Short label for the Help menu. */
  name: string;
  /** One-line description for the Help menu. */
  summary: string;
  steps: TutorialStep[];
}

// ─── Selectors ──────────────────────────────────────────────
// Stable data attributes added to the key DOM panels. Keep in sync with the
// `data-tutorial-target` attrs in the corresponding Preact components.
const SEL = {
  statusBar: '[data-tutorial-target="status-bar"]',
  statusGold: '[data-tutorial-target="status-gold"]',
  statusLives: '[data-tutorial-target="status-lives"]',
  statusWave: '[data-tutorial-target="status-wave"]',
  startWaveBtn: '[data-tutorial-target="start-wave"]',
  towerDock: '[data-tutorial-target="tower-dock"]',
  wavesPanel: '[data-tutorial-target="waves-panel"]',
  economyPanel: '[data-tutorial-target="economy-panel"]',
  menuStoreBtn: '[data-tutorial-target="menu-store"]',
  menuEncyclopediaBtn: '[data-tutorial-target="menu-encyclopedia"]',
  menuModeCards: '[data-tutorial-target="menu-modes"]',
  menuMapGrid: '[data-tutorial-target="menu-map"]',
} as const;

// ─── Tracks ─────────────────────────────────────────────────

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
      body: 'Standard is the classic mode. Others change the economy or add heroes. You’ll see a short primer the first time you pick each mode.',
      placement: 'top',
    },
    {
      id: 'meta',
      target: { kind: 'dom', selector: SEL.menuEncyclopediaBtn },
      title: 'Encyclopedia & Store',
      body: 'The Encyclopedia documents every tower, creep, and hero. The Store has cosmetic skins and faction unlocks.',
      placement: 'top',
    },
    {
      id: 'done',
      target: { kind: 'screen' },
      title: "You're Ready",
      body: "Pick Standard on Plains with Normal difficulty for your first run. Replay any tutorial from the Help button in the top-right.",
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
      target: { kind: 'dom', selector: SEL.statusBar },
      title: 'Income Per Wave',
      body: "See the +N/w figure? That's extra gold you'll get at the end of every wave, on top of kill rewards. Grow it fast.",
      placement: 'bottom',
    },
    {
      id: 'economy_panel',
      target: { kind: 'dom', selector: SEL.economyPanel },
      title: 'Economy Panel',
      body: 'Open the ECONOMY panel to see send options and Frontier buildings. Sends spawn creeps on your own map for income (risk + reward). Frontier buildings grow income safely over time.',
      placement: 'right',
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

/** Hero defence mode primer. */
const incomeHero: TutorialTrack = {
  id: 'income_hero',
  name: 'Economy — Hero Defense',
  summary: 'How the hero arena works.',
  steps: [
    {
      id: 'hero_intro',
      target: { kind: 'screen' },
      title: 'Hero Defense',
      body: 'Control a hero in a 12-row arena. Economy is simpler: a percentage of unspent gold carries over between waves.',
    },
    {
      id: 'hero_abilities',
      target: { kind: 'dom', selector: SEL.towerDock },
      title: 'Hero & Items',
      body: 'Buy items, tomes, and accessories from the Hero panel. Your hero has Q/W/E/R abilities and an ultimate — use them.',
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

function factionTrack(id: string, name: string, identity: string, tip: string): TutorialTrack {
  return {
    id: `faction:${id}`,
    name: `${name} Primer`,
    summary: `How ${name} plays.`,
    steps: [
      {
        id: 'identity',
        target: { kind: 'screen' },
        title: `${name}`,
        body: identity,
      },
      {
        id: 'tip',
        target: { kind: 'screen' },
        title: 'Key Tip',
        body: tip,
      },
    ],
  };
}

const factionTracks: TutorialTrack[] = [
  factionTrack('arcane',     'Arcane',     'Precision magic — crits and AoE. Damage spikes, not sustain.',                   'Stack crit towers on high-HP chokes. Arcane Meteor excels on grouped targets.'),
  factionTrack('mechanical', 'Mechanical', 'Heavy raw damage, burn DoT, pierce. The most forgiving faction.',                'Mech Wall lets you maze with your eyes closed. Railgun shreds elite creeps.'),
  factionTrack('nature',     'Nature',     'Poison, roots, and adjacency auras. Rewards tight placement.',                   'Cluster Nature towers together — every adjacent buff stacks. Roots stop flyers cold.'),
  factionTrack('void',       'Void',       'Gambling, gold-on-hit, teleport. High variance, huge upside.',                   'Gold-on-hit towers snowball if they survive. Don’t over-commit to any one build.'),
  factionTrack('military',   'Military',   'Mobile units that move to engage. Walls, wire, boots on the ground.',            "Military units don't block the grid — use real walls/wire for mazing, units for damage."),
  factionTrack('aliens',     'Aliens',     'Swarms of cheap units. Your numbers win fights.',                                'Spam Swarmlings from the Hive Spire. Quantity is quality.'),
  factionTrack('cypherpunk', 'Cypherpunk', 'Hack, infect, rewire. Weird effects that debuff and chain.',                     'Infect stacks turn creeps against each other. Keep the network online.'),
  factionTrack('infernal',   'Infernal',   'Sacrifice mechanics. Towers can expire or decay — use them then lose them.',     "Don't build Infernal long-term. Cash in their burst and replace."),
  factionTrack('celestial',  'Celestial',  'Healing, life gain, leak block. The defensive faction.',                         'Celestial towers can gain lives — stacking them turns leaks into non-events.'),
  factionTrack('psionic',    'Psionic',    'True damage. Armor means nothing.',                                              'Psionic shines vs heavily armored waves. Save it for elites.'),
  factionTrack('harmonic',   'Harmonic',   'Aura network — adjacency-chained buffs.',                                        'Plan the whole maze around your aura lattice. A disconnected Harmonic tower is a wasted slot.'),
  factionTrack('random',     'Random',     'Six towers rotate each wave. No two games play the same.',                       'Buy what fits the wave. Bought towers persist, so commit to keepers.'),
];

// ─── Per-mode content ───────────────────────────────────────

const modeTracks: TutorialTrack[] = [
  {
    id: 'mode:standard',
    name: 'Standard Primer',
    summary: 'Classic tower defence with income.',
    steps: [
      { id: 's', target: { kind: 'screen' }, title: 'Standard', body: 'Normal waves, gold + income, Frontier buildings. The baseline mode. Try Plains map on Normal for your first run.' },
    ],
  },
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
