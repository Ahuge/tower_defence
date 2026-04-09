import Phaser from 'phaser';
import { getCanvasWidth } from '../config';
import { ResponsiveManager } from '../systems/ResponsiveManager';
import { UIScale } from '../systems/UIScale';

// In-app changelog — recent changes shown to the player
const CHANGELOG_ENTRIES = [
  {
    version: 'v25 — Faction Gauntlet',
    changes: [
      'NEW MODE: Faction Gauntlet — 100 waves across 10 faction homeworlds',
      '10 unique themed maps: Crystal Caverns, Iron Foundry, Ancient Grove, Rift Dimension, Warzone Outpost, Hive Tunnels, Data Grid, Hellscape, Sky Citadel, Mind Palace, Concert Hall',
      'Custom terrain sprites: Cypherpunk circuit board + Infernal lava/brimstone',
      'Preview screen shows full stage order before starting',
      'Stage transitions: fade to black, faction banner, new map',
      'Frontier + send income persist between stages, towers reset, lives reset to 10',
      'Stage scaling: HP 1x-4x, speed 1x-1.5x across 10 stages',
    ],
  },
  {
    version: 'v24 — Creep Sprites + Terrain + Zoom',
    changes: [
      'Creep sprites for all 11 factions — 176 unique creatures with walk + death animations',
      'Creep Faction Select: choose which enemy faction you face',
      'Terrain system: themed auto-tiled terrain for all maps (mountain, water, trees, stone, lava)',
      'Ground doodads: bushes, flowers, pebbles, mushrooms scattered on walkable tiles',
      'Tower targeting priority: snipers target strongest, frost targets fastest, etc.',
      'Desktop zoom: scroll wheel + middle-click pan + buttons',
      'Mobile camera: pinch zoom, elastic bounds, responsive tower bar',
      'UILayer system: eliminated camera filter bugs',
      'PanelBase: reusable sidebar panel class',
      'Multiplayer signaling server (Cloudflare Workers)',
      'Analytics dashboard with world map',
    ],
  },
  {
    version: 'v23 — Sprite Art + Balance',
    changes: [
      'Pixel art sprites for all 11 factions — towers, projectiles, and heroes',
      'Per-level tower art: towers visually evolve as they upgrade (up to 6 levels)',
      'Tower picker shows sprite icons instead of text labels',
      'Hero select shows sprite portraits (desktop + phone)',
      'Encyclopedia displays tower and hero sprite art',
      'Mobile unit walk-cycle sprites: Rifleman, Brawler, Tank, Commander, Swarmling, Fiend',
      'Heavy Gunner → Tank: slower (45 speed), longer range (4.5-6 tiles), AoE explosive shells',
      'Brood Mother: commander_aura buffs Swarmlings +20% DMG +15% AS within 6 tiles',
      'Firewall: 35 DPS + 65% slow through beam',
      'Meteor: true ground-targeting — hits where the creep was, not where it moved',
      'Railgun: projectile travels to map edge, damages creeps as the beam passes',
      'Arcanist renamed to Mage',
      'Hero Defense tomes: XP Tome (100g), Stat Tome (250g+), Interest Tome (2%→5%)',
      'Mobile: zoom bounds scale with zoom level, pause menu centers on screen',
      'Send panel expanded for T2 sends, event log bottom-anchored',
      'Creep info panel properly sized for shield/effects display',
    ],
  },
  {
    version: 'v22 — Mobile Phone Support',
    changes: [
      'Pinch-to-zoom (1x–3x) + drag-to-pan on phone — camera starts at 1.8x zoom',
      'Touch controls: tap to place towers, drag to pan, pinch to zoom',
      'GameControlBar: touch buttons for wave/speed/pause + ability buttons (Q/W/E/R/T)',
      'Touch clicks deferred to pointerup — panning never accidentally places towers',
      'Full-screen sidebar overlay on phone with larger close button',
      'Smaller tower buttons (42px), responsive menu/faction/hero select scenes',
      'Hero select: single-card carousel with prev/next navigation on phone',
    ],
  },
  {
    version: 'v21 — Hero Defense Overhaul',
    changes: [
      '11 heroes (up from 3): Paladin, Ranger, Berserker, Necromancer, Monk, Engineer, Duelist, Druid',
      'Random draft: 3 heroes offered per game, reroll available',
      'Each hero belongs to a faction — picking a non-random faction guarantees that hero',
      'Hero leveling (uncapped): XP from arena kills, choose stat or ability upgrades per level',
      'Ability upgrades: [+] buttons next to Q/W/E/R — each gives +20% damage/effects, -5% CD',
      'Ultimate abilities (R key): one per hero, unlocks at level 6, long cooldown',
      'Floating damage numbers: color-coded hits, crits, heals, ability damage, level ups',
      'Ability VFX: AoE rings, dash trails, teleport flashes, meteor impacts, lightning bolts',
      'Visual targeting mode for ground abilities (Blink) — preview circle + range ring',
      'Arena creep waves: 3-6 creeps spawn per TD wave (halved on boss waves)',
      'Elite enemies at waves 10/20/30: Shield Guardian, Base Charger, Necromancer',
      '3 accessory slots (up from 1): 15 accessories total, rotating shop every 5 waves',
      'New AoE accessories: Cleave Axe, Inferno Blade, Tempest Hammer — attacks splash in radius',
      'Tower assists: leaked creeps enter arena with current HP (tower damage carries over)',
      'Melee heroes buffed: +100-150 HP and innate armor (2-8) varying by hero',
      'Healer diminishing returns: stacked heals halved per source, healers receive only 10%',
      'Economy rebalanced: reduced kill gold, wave income, and arena rewards',
      '2% interest on gold at end of each wave',
      'Stat accessories: War Gauntlet (+dmg), Heart of Iron (+HP), Rapid Quiver (+AS%), Hawk Eye (+range)',
      'Faction heroes: each hero belongs to a faction, guaranteed in draft if you pick that faction',
      'Sidebar shows attack speed instead of move speed',
      'Heroes encyclopedia page with carousel browser',
    ],
  },
  {
    version: 'v20 — Procedural Random Maps',
    changes: [
      'New "Random" map in the map picker — procedurally generated from a seed',
      '6 layout templates (classic, dual entry, siege, gauntlet, diagonal, corridor)',
      'Terrain features: lakes, ridges, pillars, walls, islands, boulder clusters',
      'Difficulty-linked density: Easy = open, Insane = cramped with NoBuild zones',
      'Daily seed toggle: same map for everyone that day (seed = YYYYMMDD)',
      'Versus uses shared seed — both players get identical random maps',
      'Seed displayed in top-right corner during gameplay',
    ],
  },
  {
    version: 'v19 — Difficulty Scaling, Send Tiers & Bug Fixes',
    changes: [
      'Send cost scaling: costs rise +10% per 5 waves, income rewards scale slightly to compensate',
      'Tier 2 sends: Healer (w10+), Shielded (w10+), Flying (w15+), Regen (w20+) — hotkeys 1/2/3/4',
      'Send panel updates each wave with current costs and unlock status',
      'Fixed DoT/beam rounding bug: Virus, burn, and Firewall beam were dealing 0 damage at 60fps',
      'Quadratic HP scaling: late-wave creeps are much tougher (wave 20: 340 HP, wave 30: 620 HP)',
      'Themed late-wave compositions: healer+tank packs, speed rushes, regen DPS checks, flying bypasses',
      'Kill gold decays over time (5g → 4g → 3g → 2g floor) to prevent income snowball',
      'New creep type: Regenerator — heavy armor, 2% HP/s regen, appears wave 25+',
      'New regeneration trait with green pulse visual effect',
      'Hard difficulty retuned: toughness 2.0×, count 1.6×, speed 1.2×, gold 0.6×',
      'New Insane difficulty: 3.5× toughness, 2× count, 1.35× speed, 0.4× gold. Good luck.',
      'Insane extras: boss damage-cap shields, armored regen, 45% evasion, 5% regenerator regen',
      'Hard-mode bosses now regenerate 1% HP/s',
      'Faster late-wave spawns (floor lowered to 150ms)',
    ],
  },
  {
    version: 'v18 — Responsive Scaling & Tablet Support',
    changes: [
      'Tablet layout: sidebar becomes a collapsible overlay with hamburger toggle',
      'Touch input: long-press (500ms) to sell towers, tappable Upgrade/Sell buttons',
      'Tappable Start Wave and Speed buttons in the status bar',
      'Dynamic canvas sizing — game area fills available width on smaller screens',
      'All menus and scenes adapt to the active canvas width',
    ],
  },
  {
    version: 'v17 — Circle Co-op + Hero Combat + Menu Redesign',
    changes: [
      'New multiplayer mode: Circle Co-op — 2-4 players on one shared map',
      'Creeps loop through all player zones; shared lives, individual gold',
      '3 new circle maps: 2P (halves), 3P (Y-sectors), 4P (quadrants)',
      'Zone overlay, player roster panel, wave sync with ready votes',
      'Individual gold: kill credit tracks which tower dealt the killing blow',
      'Periodic tower sync every 5s reconciles missed placements between players',
      'Lobby: joiners see their player index, all players notified of new joins',
      'Hero Defense: arena creeps now aggro and attack the hero (240px range)',
      'Hero Defense: creeps park at base and repeatedly attack it (10k base HP)',
      'Hero Defense: 10x creep waves with faster spawns for arena pressure',
      'Hero Defense: ranged heroes (Arcanist) fire visible projectiles',
      'Harmonic: conduit-linked aura towers re-emit inherited buffs to neighbors',
      'Menu redesign: 2x3 card grid for all 7 modes with color-coded accents',
      'Autoplay: press A or click [A] AUTO to auto-start waves',
    ],
  },
  {
    version: 'v16 — Hero Defense Mode',
    changes: [
      'New game mode: Hero Defense — leaked creeps enter a hero arena',
      'Split-screen layout: hero arena (top) + smaller TD grid (bottom)',
      '3 heroes: Warden (tank), Arcanist (mage), Shadow (assassin)',
      'Click-to-move hero micro, Q/W/E abilities with cooldowns',
      'Hero item shop: Weapon, Armor, Boots with 3 upgrade tiers each',
      'Arena creeps fight back — aggro, chase, and attack the hero',
      'Base HP replaces lives — creeps past the hero damage the base',
      'Hero death/respawn: 10s timer, full HP on respawn',
      'Ranged heroes fire projectiles, melee heroes deal instant damage',
      'Creeps that reach the base park and attack it repeatedly',
      '10x creep waves flood the arena, 10% kill gold to balance',
      '10,000 base HP replaces lives, hero heals 20% on wave clear',
      'Hero select screen with stat cards and ability descriptions',
    ],
  },
  {
    version: 'v15 — GameMode Interface',
    changes: [
      'Pluggable GameMode system: each mode is a self-contained class',
      'StandardMode owns sends, frontier panel, and frontier actions',
      'BattleMode owns essence panel, generators, and essence sends',
      'Frontier actions (overcharge/dig/harvest) moved from GameScene into StandardMode',
      'Fixed: eventLog created before game mode init (was null)',
      'Fixed: versus reference now wired into game mode context',
      'GameScene reduced from ~1200 to ~1070 lines',
    ],
  },
  {
    version: 'v14 — Dual Economy & Architecture',
    changes: [
      'Battle mode: Dual Economy with Gold + Essence resources',
      'Essence generators: buy with gold, produce essence in real-time',
      'Sends cost essence instead of gold — compound growth loop',
      'GameScene decomposed: TowerManager, CreepManager, WaveController',
      'Pluggable leak/death handlers for future game modes',
      'ResourceManager: N-resource system with real-time ticking',
    ],
  },
  {
    version: 'v13 — New Factions & Maps',
    changes: [
      'Harmonic faction: stacking aura network with Conduit linking',
      'Manual Conduit: press L to link/unlink aura towers',
      'Distinct aura colors: red (damage), green (rate), blue (range), magenta (crit)',
      'Maps reworked: mountains, lakes, rivers, canyons',
      '5 new maps: Serpentine, Islands, Gauntlet, Spiral, Siege',
      'Encyclopedia: Factions carousel, Tower carousel, Creep cards',
      'In-app Changelog viewer with full history',
      'Version SHA on menu screen',
    ],
  },
  {
    version: 'v12 — Harmonic & Encyclopedia',
    changes: [
      'Harmonic faction: aura network with stacking damage/rate/range/crit auras',
      'Conduit tower links aura towers and shares their effects at 70%',
      'Encyclopedia: browse all towers, creeps, and frontier buildings',
      'In-app changelog with scrollable history',
      'Version SHA displayed on menu screen',
      'Maps reworked: mountains, lakes, rivers instead of NoBuild zones',
    ],
  },
  {
    version: 'v11 — 6 New Factions',
    changes: [
      'Spawn Aliens: extreme fire rates, Swarmling mobile units, Brood Mother',
      'Cypherpunk: Firewall beams, Virus spread, Backdoor hack (walk backward)',
      'Infernal: Imp (expires), Hellfire (decays), Fiend (kamikaze explode)',
      'Celestial: life gain on kill, Ward mutes mages, Sanctuary absorbs leaks',
      'Psionic: true damage ignoring armor, Mesmer confusion, fear aura',
      'Military faction with mobile units (Rifleman, Brawler, Heavy, Commander)',
      'Mobile unit balance nerfs across all factions',
    ],
  },
  {
    version: 'v10 — Multiplayer',
    changes: [
      'P2P WebRTC multiplayer — no server required',
      'Manual SDP exchange via clipboard (host/join)',
      'Sends go to opponent as extra creeps in their game',
      '60s first wave / 30s subsequent countdown with ready vote',
      'Opponent minimap — click to swap full view with simulated creeps',
      'In-game chat (ENTER key), host controls game speed',
      'Mirrored waves via shared seed, wave sync protocol',
      'Disconnect detection — continues as solo game',
    ],
  },
  {
    version: 'v9 — Creep Variety & Difficulty',
    changes: [
      'Difficulty system: Easy/Normal/Hard/Insane with per-creep-type scaling',
      '7 new creep types: Group, Splitter, Shielded, Evasive, Flying, 4 Mage types',
      'Flying creeps bypass maze entirely (straight line to exit)',
      'Shielded creeps: max 1 damage per hit until shield breaks',
      'Confused creeps walk backward, Muted creeps lose abilities',
      'NoBuild terrain: walkable but unbuildable cells',
      'Boss leak costs 5 lives instead of 1',
    ],
  },
  {
    version: 'v8 — Tower Expansion',
    changes: [
      'Asymmetric faction sizes: Mechanical 8, Arcane 7, Nature 6, Void 5',
      'Cost scaling from 10g starters to 900g ultimates',
      'Per-tower upgrade design (0 to 5 levels per tower)',
      '4 ultimate towers: Titan Cannon, Arcane Nova, Elder Treant, Oblivion',
      'Random faction: 6 towers rotate each wave from all pools',
      'Creep inspection: click to see HP, armor, status effects',
      'Tower hover tooltips with full stat breakdown',
    ],
  },
  {
    version: 'v7 — Trait System',
    changes: [
      'All tower/creep behaviors are composable traits',
      'Handler registry with 5-phase resolution pipeline',
      'Removed all hardcoded ability if/else chains',
      'Abilities scale with tower level automatically',
      'Location-based projectiles for AoE towers',
      'Tracking projectiles accelerate to always catch targets',
    ],
  },
  {
    version: 'v6 — UI & Economy',
    changes: [
      'Left sidebar: Upcoming Waves, Sends, Frontier, Event Log',
      '3-mode selection: Build / Inspect / None',
      'Frontier buildings with faction mechanics (overcharge, dig, grow, gamble)',
      'Send system with Z/X/C/V hotkeys and adaptive spawning',
      'Income display, pause menu, game speed control (TAB)',
      'Score screen with tower DPS tables and economy breakdown',
    ],
  },
  {
    version: 'v1-5 — Foundation',
    changes: [
      'Grid-based maze building with A* pathfinding',
      '4 base tower types, 3-level upgrades, status effects',
      'Armor/damage type system (physical/magic vs light/medium/heavy)',
      '3 match modes: Sprint (15w), Standard (30w), Marathon (endless)',
      '4 original factions: Arcane, Mechanical, Nature, Void',
      'Draft modifiers: Gold Rush, Glass Cannon, Rapid Fire, etc.',
      '3 maps: Plains, Crossroads, Fortress',
    ],
  },
];

export class ChangelogScene extends Phaser.Scene {
  private scrollY: number = 0;
  private contentHeight: number = 0;
  private isDragging: boolean = false;
  private dragStartY: number = 0;
  private dragStartScrollY: number = 0;

  constructor() {
    super('ChangelogScene');
  }

  create(): void {
    const cx = getCanvasWidth() / 2;
    const totalH = ResponsiveManager.canvasHeight();

    this.add.graphics().fillStyle(0x0a0a0f, 1).fillRect(0, 0, getCanvasWidth(), totalH);

    this.add.text(cx, UIScale.space(25), 'CHANGELOG', {
      fontSize: UIScale.font(28), color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Back button
    const backBtn = this.add.text(UIScale.space(50), UIScale.space(25), '[ Back ]', {
      fontSize: UIScale.font(14), color: '#888888', fontFamily: 'monospace',
    }).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.scene.start('MenuScene'));

    // Scrollable content
    const contentY = UIScale.space(65);
    const contentH = totalH - UIScale.space(75);
    const marginL = UIScale.space(80);
    const marginR = UIScale.space(80);
    const contentW = getCanvasWidth() - marginL - marginR;

    const mask = this.add.graphics();
    mask.fillRect(0, contentY, getCanvasWidth(), contentH);
    const maskGeo = mask.createGeometryMask();

    const container = this.add.container(0, contentY);
    container.setMask(maskGeo);

    let y = UIScale.space(10); // top spacer
    for (const section of CHANGELOG_ENTRIES) {
      const header = this.add.text(cx, y, section.version, {
        fontSize: UIScale.font(16), color: '#ffaa44', fontFamily: 'monospace',
      }).setOrigin(0.5);
      container.add(header);
      y += UIScale.space(24);

      for (const change of section.changes) {
        const text = this.add.text(marginL, y, `• ${change}`, {
          fontSize: UIScale.font(11), color: '#cccccc', fontFamily: 'monospace',
          wordWrap: { width: contentW },
        });
        container.add(text);
        y += text.height + UIScale.space(6);
      }
      y += UIScale.space(16);
    }

    this.contentHeight = y;

    // Scroll with mouse wheel
    this.input.on('wheel', (_pointer: any, _gameObjects: any, _deltaX: number, deltaY: number) => {
      this.scrollY = Phaser.Math.Clamp(
        this.scrollY - deltaY * 0.5,
        -(this.contentHeight - contentH + 20),
        0,
      );
      container.setY(contentY + this.scrollY);
    });

    // Touch drag scrolling
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.isDragging = true;
      this.dragStartY = pointer.y;
      this.dragStartScrollY = this.scrollY;
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isDragging) return;
      const dy = pointer.y - this.dragStartY;
      this.scrollY = Phaser.Math.Clamp(
        this.dragStartScrollY + dy,
        -(this.contentHeight - contentH + 20),
        0,
      );
      container.setY(contentY + this.scrollY);
    });
    this.input.on('pointerup', () => { this.isDragging = false; });
  }
}
