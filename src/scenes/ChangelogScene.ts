import Phaser from 'phaser';
import { CANVAS_WIDTH, GAME_HEIGHT } from '../config';
import { TowerSelectBar } from '../ui/TowerSelectBar';

// In-app changelog — recent changes shown to the player
const CHANGELOG_ENTRIES = [
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
      'Difficulty system: Easy/Normal/Hard with per-creep-type scaling',
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

  constructor() {
    super('ChangelogScene');
  }

  create(): void {
    const cx = CANVAS_WIDTH / 2;
    const totalH = GAME_HEIGHT + 28 + TowerSelectBar.BAR_HEIGHT;

    this.add.graphics().fillStyle(0x0a0a0f, 1).fillRect(0, 0, CANVAS_WIDTH, totalH);

    this.add.text(cx, 25, 'CHANGELOG', {
      fontSize: '28px', color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Back button
    const backBtn = this.add.text(50, 25, '[ Back ]', {
      fontSize: '14px', color: '#888888', fontFamily: 'monospace',
    }).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.scene.start('MenuScene'));

    // Scrollable content
    const contentY = 65;
    const contentH = totalH - 75;
    const marginL = 280;
    const marginR = 280;
    const contentW = CANVAS_WIDTH - marginL - marginR;

    const mask = this.add.graphics();
    mask.fillRect(0, contentY, CANVAS_WIDTH, contentH);
    const maskGeo = mask.createGeometryMask();

    const container = this.add.container(0, contentY);
    container.setMask(maskGeo);

    let y = 10; // top spacer
    for (const section of CHANGELOG_ENTRIES) {
      const header = this.add.text(cx, y, section.version, {
        fontSize: '16px', color: '#ffaa44', fontFamily: 'monospace',
      }).setOrigin(0.5);
      container.add(header);
      y += 24;

      for (const change of section.changes) {
        const text = this.add.text(marginL, y, `• ${change}`, {
          fontSize: '11px', color: '#cccccc', fontFamily: 'monospace',
          wordWrap: { width: contentW },
        });
        container.add(text);
        y += text.height + 6;
      }
      y += 16;
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
  }
}
