"use strict";
(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // src/systems/Pathfinding.ts
  function findPathWithWaypoints(grid, start, waypoints, end) {
    const stops = [start, ...waypoints, end];
    const full = [];
    for (let i = 0; i < stops.length - 1; i++) {
      const segment = findPath(grid, stops[i], stops[i + 1]);
      if (!segment) return null;
      if (i === 0) {
        full.push(...segment);
      } else {
        full.push(...segment.slice(1));
      }
    }
    return full;
  }
  function findPath(grid, start, end) {
    const s = start ?? grid.entry;
    const e = end ?? grid.exit;
    const cols = grid.cols;
    const rows = grid.rows;
    const n = cols * rows;
    const sIdx = s.row * cols + s.col;
    const eIdx = e.row * cols + e.col;
    if (sIdx === eIdx) {
      return [{ col: s.col, row: s.row }];
    }
    const queue = new Int32Array(n);
    const visited = new Uint8Array(n);
    const parent = new Int32Array(n);
    for (let i = 0; i < n; i++) parent[i] = -1;
    let head = 0;
    let tail = 0;
    queue[tail++] = sIdx;
    visited[sIdx] = 1;
    const dcs = [0, 0, 0, 0];
    const drs = [0, 0, 0, 0];
    while (head < tail) {
      const cur = queue[head++];
      const cr = cur / cols | 0;
      const cc = cur - cr * cols;
      if (cur === eIdx) {
        const reverse = [];
        let node = cur;
        while (node !== -1) {
          const r = node / cols | 0;
          const c = node - r * cols;
          reverse.push({ col: c, row: r });
          node = parent[node];
        }
        reverse.reverse();
        return reverse;
      }
      const ddc = e.col - cc;
      const ddr = e.row - cr;
      const sdc = ddc > 0 ? 1 : ddc < 0 ? -1 : 1;
      const sdr = ddr > 0 ? 1 : ddr < 0 ? -1 : 1;
      const colFirst = Math.abs(ddc) >= Math.abs(ddr);
      if (colFirst) {
        dcs[0] = sdc;
        drs[0] = 0;
        dcs[1] = 0;
        drs[1] = sdr;
        dcs[2] = 0;
        drs[2] = -sdr;
        dcs[3] = -sdc;
        drs[3] = 0;
      } else {
        dcs[0] = 0;
        drs[0] = sdr;
        dcs[1] = sdc;
        drs[1] = 0;
        dcs[2] = -sdc;
        drs[2] = 0;
        dcs[3] = 0;
        drs[3] = -sdr;
      }
      for (let d = 0; d < 4; d++) {
        const nc = cc + dcs[d];
        const nr = cr + drs[d];
        if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue;
        const nIdx = nr * cols + nc;
        if (visited[nIdx]) continue;
        if (!grid.isWalkable(nc, nr)) continue;
        visited[nIdx] = 1;
        parent[nIdx] = cur;
        queue[tail++] = nIdx;
      }
    }
    return null;
  }
  var init_Pathfinding = __esm({
    "src/systems/Pathfinding.ts"() {
      "use strict";
    }
  });

  // src/systems/ResponsiveManager.ts
  var TABLET_BREAKPOINT, PHONE_BREAKPOINT, ResponsiveManagerClass, ResponsiveManager;
  var init_ResponsiveManager = __esm({
    "src/systems/ResponsiveManager.ts"() {
      "use strict";
      init_config();
      TABLET_BREAKPOINT = 1200;
      PHONE_BREAKPOINT = 600;
      ResponsiveManagerClass = class {
        constructor() {
          this._mode = "desktop";
          this._listeners = [];
          this._initialized = false;
        }
        init() {
          if (this._initialized) return;
          this._initialized = true;
          this._mode = this.detectMode();
          window.addEventListener("resize", () => {
            const newMode = this.detectMode();
            if (newMode !== this._mode) {
              this._mode = newMode;
              for (const cb of this._listeners) cb(this._mode);
            }
          });
        }
        detectMode() {
          const w = window.innerWidth;
          if (w < PHONE_BREAKPOINT) return "phone";
          if (w < TABLET_BREAKPOINT) return "tablet";
          return "desktop";
        }
        get mode() {
          return this._mode;
        }
        isPhone() {
          return this._mode === "phone";
        }
        isTablet() {
          return this._mode === "tablet" || this._mode === "phone";
        }
        sidebarInline() {
          return this._mode === "desktop";
        }
        /** Grid columns — always 36 (maps require full grid) */
        gridCols() {
          return 36;
        }
        /** Game area width (grid only, no sidebar) — always full width */
        gameWidth() {
          return GAME_WIDTH;
        }
        /** Grid offset X: on desktop the sidebar is inline, on tablet/phone grid uses full width */
        gridOffsetX() {
          return this._mode === "desktop" ? SIDEBAR_WIDTH : 0;
        }
        /** Canvas width — expanded to fill viewport aspect ratio (no letterboxing).
         *  Minimum: grid + sidebar offset on desktop, or grid on tablet/phone. */
        canvasWidth() {
          const minW = this._mode === "desktop" ? SIDEBAR_WIDTH + GAME_WIDTH : GAME_WIDTH;
          const minH = this._minCanvasHeight();
          const vpAspect = window.innerWidth / window.innerHeight;
          const targetW = Math.round(minH * vpAspect);
          return Math.max(minW, targetW);
        }
        /** Canvas height — expanded to fill viewport aspect ratio (no letterboxing).
         *  Minimum: grid + UI bars. Phone also includes control bar. */
        canvasHeight() {
          const minH = this._minCanvasHeight();
          const cw = this.canvasWidth();
          const vpAspect = window.innerHeight / window.innerWidth;
          const targetH = Math.round(cw * vpAspect);
          return Math.max(minH, targetH);
        }
        /** Minimum canvas height to fit all game content */
        _minCanvasHeight() {
          const base = GAME_HEIGHT + 28 + TOWER_BAR_HEIGHT;
          return this._mode === "phone" ? base + CONTROL_BAR_HEIGHT : base;
        }
        onLayoutChange(cb) {
          this._listeners.push(cb);
        }
        removeLayoutChangeListener(cb) {
          this._listeners = this._listeners.filter((l) => l !== cb);
        }
      };
      ResponsiveManager = new ResponsiveManagerClass();
    }
  });

  // src/config.ts
  function getGridOffsetX() {
    return ResponsiveManager.gridOffsetX();
  }
  function getGridCols() {
    return ResponsiveManager.gridCols();
  }
  function getGridOffsetY() {
    return _gridOffsetY;
  }
  function gridX(col) {
    return col * TILE_SIZE2 + TILE_SIZE2 / 2 + getGridOffsetX();
  }
  function gridY(row) {
    return row * TILE_SIZE2 + TILE_SIZE2 / 2 + _gridOffsetY;
  }
  var TILE_SIZE2, GRID_COLS, GRID_ROWS, GAME_WIDTH, GAME_HEIGHT, SIDEBAR_WIDTH, TOWER_BAR_HEIGHT, CONTROL_BAR_HEIGHT, CANVAS_WIDTH, _gridOffsetY, COLOR_PROJECTILE, CREEP_BASE_SPEED, STARTING_GOLD, STARTING_LIVES, KILL_GOLD, WAVE_CLEAR_BONUS;
  var init_config = __esm({
    "src/config.ts"() {
      "use strict";
      init_ResponsiveManager();
      TILE_SIZE2 = 28;
      GRID_COLS = 36;
      GRID_ROWS = 26;
      GAME_WIDTH = GRID_COLS * TILE_SIZE2;
      GAME_HEIGHT = GRID_ROWS * TILE_SIZE2;
      SIDEBAR_WIDTH = 360;
      TOWER_BAR_HEIGHT = 96;
      CONTROL_BAR_HEIGHT = 70;
      CANVAS_WIDTH = SIDEBAR_WIDTH + GAME_WIDTH;
      _gridOffsetY = 0;
      COLOR_PROJECTILE = 16777028;
      CREEP_BASE_SPEED = 80;
      STARTING_GOLD = 100;
      STARTING_LIVES = 20;
      KILL_GOLD = 5;
      WAVE_CLEAR_BONUS = 25;
    }
  });

  // src/systems/Grid.ts
  var Grid;
  var init_Grid = __esm({
    "src/systems/Grid.ts"() {
      "use strict";
      init_config();
      Grid = class {
        constructor(mapDef, rows, cols) {
          this.rows = rows ?? GRID_ROWS;
          this.cols = cols ?? getGridCols();
          this.cells = Array.from(
            { length: this.rows },
            () => Array(this.cols).fill(0 /* Empty */)
          );
          if (mapDef) {
            this.entries = mapDef.entries;
            this.exits = mapDef.exits;
            this.entry = mapDef.entries[0];
            this.exit = mapDef.exits[0];
            for (const e of mapDef.entries) {
              if (e.row >= 0 && e.row < this.rows && e.col >= 0 && e.col < this.cols) {
                this.cells[e.row][e.col] = 2 /* Entry */;
              }
            }
            for (const e of mapDef.exits) {
              if (e.row >= 0 && e.row < this.rows && e.col >= 0 && e.col < this.cols) {
                this.cells[e.row][e.col] = 3 /* Exit */;
              }
            }
            for (const b of mapDef.blocked) {
              if (b.row >= 0 && b.row < this.rows && b.col >= 0 && b.col < this.cols) {
                this.cells[b.row][b.col] = 4 /* Blocked */;
              }
            }
            for (const b of mapDef.noBuild || []) {
              if (b.row >= 0 && b.row < this.rows && b.col >= 0 && b.col < this.cols) {
                this.cells[b.row][b.col] = 5 /* NoBuild */;
              }
            }
          } else {
            this.entry = { col: 0, row: Math.floor(this.rows / 2) };
            this.exit = { col: this.cols - 1, row: Math.floor(this.rows / 2) };
            this.entries = [this.entry];
            this.exits = [this.exit];
            this.cells[this.entry.row][this.entry.col] = 2 /* Entry */;
            this.cells[this.exit.row][this.exit.col] = 3 /* Exit */;
          }
        }
        isWalkable(col, row) {
          if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return false;
          const cell = this.cells[row][col];
          return cell !== 1 /* Tower */ && cell !== 4 /* Blocked */;
        }
        canPlaceTower(col, row) {
          if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return false;
          return this.cells[row][col] === 0 /* Empty */;
        }
        placeTower(col, row) {
          if (!this.canPlaceTower(col, row)) return false;
          this.cells[row][col] = 1 /* Tower */;
          return true;
        }
        removeTower(col, row) {
          if (this.cells[row][col] !== 1 /* Tower */) return false;
          this.cells[row][col] = 0 /* Empty */;
          return true;
        }
      };
    }
  });

  // src/systems/Rng.ts
  function seedRng(seed) {
    state = seed >>> 0;
  }
  function rng() {
    state = state + 1831565813 | 0;
    let t = Math.imul(state ^ state >>> 15, 1 | state);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
  var state;
  var init_Rng = __esm({
    "src/systems/Rng.ts"() {
      "use strict";
      state = (Date.now() >>> 0 ^ (typeof performance !== "undefined" ? performance.now() : 0) >>> 0) >>> 0;
    }
  });

  // src/data/Factions.ts
  var FACTIONS;
  var init_Factions = __esm({
    "src/data/Factions.ts"() {
      "use strict";
      init_Rng();
      FACTIONS = {
        arcane: {
          id: "arcane",
          name: "Arcane",
          description: "High Fantasy precision magic. Crits, AoE, and spell amplification.",
          primaryColor: 6702335,
          secondaryColor: 10062079,
          towerIds: ["arcane_bolt", "arcane_frost", "arcane_storm", "arcane_focus", "arcane_drain", "arcane_meteor", "arcane_nova"]
        },
        mechanical: {
          id: "mechanical",
          name: "Mechanical",
          description: "Steampunk engineering and firepower. Burn, pierce, and raw efficiency.",
          primaryColor: 13404211,
          secondaryColor: 15645542,
          towerIds: ["mech_wall", "mech_turret", "mech_flamethrower", "mech_tesla", "mech_mortar", "mech_shredder", "mech_railgun", "mech_titan"]
        },
        nature: {
          id: "nature",
          name: "Nature",
          description: "Growth and synergy. Poison, roots, and adjacency buffs.",
          primaryColor: 3385924,
          secondaryColor: 6741367,
          towerIds: ["nature_bramble", "nature_root", "nature_viper", "nature_blossom", "nature_spore", "nature_sunroot", "nature_vine", "nature_elder"]
        },
        void: {
          id: "void",
          name: "Void",
          description: "Pure chaos. Gambling, gold gen, and teleportation.",
          primaryColor: 8921770,
          secondaryColor: 12277213,
          towerIds: ["void_gambler", "void_spike", "void_siphon", "void_rift", "void_oblivion"]
        },
        military: {
          id: "military",
          name: "Military",
          description: "Mobile units that move to engage. Walls, wire, and boots on the ground.",
          primaryColor: 5597999,
          secondaryColor: 9419919,
          towerIds: ["mil_sandbag", "mil_wire", "mil_rifleman", "mil_sniper", "mil_heavy", "mil_artillery", "mil_commander"]
        },
        aliens: {
          id: "aliens",
          name: "Spawn Aliens",
          description: "The hive hungers. Cheap, fast, overwhelming insectoid swarms.",
          primaryColor: 8978244,
          secondaryColor: 11206502,
          towerIds: ["alien_spitter", "alien_stinger", "alien_swarm_node", "alien_acid", "alien_hive_spire", "alien_brood_mother", "alien_swarmling", "alien_overmind"]
        },
        cypherpunk: {
          id: "cypherpunk",
          name: "Cypherpunk",
          description: "Everything is data. Hack, infect, and rewrite reality. Hack the planet",
          primaryColor: 65484,
          secondaryColor: 4521949,
          towerIds: ["cyber_ping", "cyber_firewall", "cyber_virus", "cyber_backdoor", "cyber_ddos", "cyber_rootkit", "cyber_zeroday"]
        },
        infernal: {
          id: "infernal",
          name: "Infernal",
          description: "Power at any price. Towers decay, expire, or sacrifice.",
          primaryColor: 16729122,
          secondaryColor: 16746564,
          towerIds: ["infernal_imp", "infernal_hellfire", "infernal_soul_drain", "infernal_bomber", "infernal_immolate", "infernal_apocalypse"]
        },
        celestial: {
          id: "celestial",
          name: "Celestial",
          description: "The light endures. Gain lives, block leaks, silence mages.",
          primaryColor: 16777130,
          secondaryColor: 16777215,
          towerIds: ["celestial_acolyte", "celestial_ward", "celestial_smite", "celestial_martyr", "celestial_prophet", "celestial_absolution"]
        },
        psionic: {
          id: "psionic",
          name: "Psionic",
          description: "Your thoughts betray you. True damage ignoring all armor.",
          primaryColor: 14518527,
          secondaryColor: 15636991,
          towerIds: ["psi_probe", "psi_mesmer", "psi_terror", "psi_mind_spike", "psi_overmind"]
        },
        harmonic: {
          id: "harmonic",
          name: "Harmonic",
          description: "Alone, a whisper. Together, a symphony. Aura network.",
          primaryColor: 16763972,
          secondaryColor: 16772744,
          towerIds: ["harmonic_resonator", "harmonic_amplifier", "harmonic_quickener", "harmonic_reach", "harmonic_critical_mass", "harmonic_conduit", "harmonic_crescendo"]
        },
        chaos: {
          id: "chaos",
          name: "Chaos",
          description: "6 random towers each wave from all factions. Adapt or die.",
          primaryColor: 13421772,
          secondaryColor: 16777215,
          towerIds: []
          // Populated dynamically each wave
        },
        random: {
          id: "random",
          name: "Random",
          description: "Roll one of the 11 real factions at match start. Surprise.",
          primaryColor: 16729343,
          secondaryColor: 16746751,
          towerIds: []
          // Resolved on selection — never used directly.
        },
        coalition: {
          id: "coalition",
          name: "Coalition",
          description: "The Arcane march on the realm. The Coalition rallies \u2014 old stone, plain steel, no spells of our own. Hold what you have. Build it well. There is nothing else coming.",
          primaryColor: 10134445,
          secondaryColor: 13160406,
          // Coalition starting kit. Specific Arcane campaign missions
          // override `restrictions.allowedTowerIds` to expose a subset
          // (M1 starts with arrow + cannon + coalition_wall only);
          // replacements happen as the campaign progresses.
          towerIds: ["arrow", "cannon", "sniper", "coalition_wall", "coalition_root"]
        }
      };
    }
  });

  // src/data/TowerTypes.ts
  function def(p) {
    return {
      damageType: "physical",
      projectileSpeed: 300,
      sellRefundRatio: 0.5,
      upgrades: [],
      traits: [{ id: "direct_damage" }],
      ...p
    };
  }
  function getTowerType(id) {
    const t = TOWER_TYPES[id];
    if (!t) throw new Error(`Unknown tower type: ${id}`);
    return t;
  }
  var TOWER_TYPES;
  var init_TowerTypes = __esm({
    "src/data/TowerTypes.ts"() {
      "use strict";
      init_Factions();
      TOWER_TYPES = {
        // ================================================================
        // GENERIC (used by Random faction pool)
        // ================================================================
        arrow: def({
          id: "arrow",
          name: "Arrow",
          description: "Fast physical attacks",
          damageType: "physical",
          cost: 20,
          damage: 8,
          range: 3.5,
          fireRate: 600,
          color: 4491519,
          projectileSpeed: 350,
          hotkey: "1",
          upgrades: [
            { level: 2, cost: 25, damage: 13, range: 3.5, fireRate: 550 },
            { level: 3, cost: 50, damage: 20, range: 4, fireRate: 480 }
          ]
        }),
        cannon: def({
          id: "cannon",
          name: "Cannon",
          description: "Area of effect splash, slow fire",
          damageType: "physical",
          cost: 35,
          damage: 25,
          range: 3,
          fireRate: 1800,
          color: 16746564,
          projectileSpeed: 200,
          hotkey: "2",
          traits: [{ id: "splash_damage", radius: 48 }],
          upgrades: [
            { level: 2, cost: 45, damage: 38, range: 3, fireRate: 1600 },
            { level: 3, cost: 80, damage: 55, range: 3.5, fireRate: 1400 }
          ]
        }),
        sniper: def({
          id: "sniper",
          name: "Sniper",
          description: "Long range, high damage, very slow",
          damageType: "magic",
          cost: 50,
          damage: 60,
          range: 6,
          fireRate: 3e3,
          color: 11158783,
          projectileSpeed: 500,
          hotkey: "3",
          targeting: "strongest",
          upgrades: [
            { level: 2, cost: 65, damage: 95, range: 6.5, fireRate: 2800 },
            { level: 3, cost: 110, damage: 150, range: 7, fireRate: 2500 }
          ]
        }),
        slow: def({
          id: "slow",
          name: "Frost Trap",
          description: "No damage, slows enemies",
          damageType: "magic",
          cost: 25,
          damage: 0,
          range: 3,
          fireRate: 800,
          color: 4513245,
          projectileSpeed: 250,
          hotkey: "4",
          targeting: "fastest",
          traits: [{ id: "direct_damage" }, { id: "slow_on_hit", duration: 2e3, factor: 0.4 }],
          upgrades: [
            { level: 2, cost: 35, damage: 0, range: 3.5, fireRate: 700 }
          ]
        }),
        // ================================================================
        // COALITION (Arcane-campaign first-time default kit)
        // ================================================================
        // Used only as the Coalition faction's tower set during the Arcane
        // campaign. Reuses generic arrow/cannon/sniper above; adds a
        // Coalition-specific wall (visually neutral steel — distinct from
        // mech_wall's faction palette) and Runebreaker (the AOE-root with
        // `interrupts_channels` that serves as Mana Drain's narrative
        // precursor). Stats for Runebreaker roughly 70% of arcane_drain so
        // the eventual swap feels like a real upgrade.
        coalition_wall: def({
          id: "coalition_wall",
          name: "Stone Wall",
          description: "Quarried stone, mortared in haste. It will hold a wave or two. Pile them well.",
          faction: "coalition",
          damageType: "physical",
          cost: 10,
          damage: 2,
          range: 1.5,
          fireRate: 2e3,
          color: 10134445,
          projectileSpeed: 200,
          hotkey: "3"
        }),
        coalition_root: def({
          id: "coalition_root",
          name: "Runebreaker",
          description: "Buried launchers fire hooked arcane chains that bind spellcasters mid-channel \u2014 words break on the barbs before the cast lands.",
          faction: "coalition",
          damageType: "magic",
          cost: 100,
          damage: 6,
          range: 4,
          fireRate: 1100,
          color: 6719556,
          projectileSpeed: 320,
          hotkey: "5",
          targeting: "strongest",
          traits: [
            { id: "direct_damage" },
            { id: "splash_damage", radius: 40 },
            { id: "slow_on_hit", duration: 1800, factor: 0.45 },
            { id: "interrupts_channels" }
          ]
        }),
        // ================================================================
        // ARCANE (7) — Precision magic, crits, elements
        // ================================================================
        arcane_bolt: def({
          id: "arcane_bolt",
          name: "Bolt",
          description: "Reliable magic DPS. The workhorse.",
          faction: "arcane",
          damageType: "magic",
          cost: 25,
          damage: 12,
          range: 3.5,
          fireRate: 700,
          color: 6702335,
          projectileSpeed: 400,
          hotkey: "1",
          upgrades: [
            { level: 2, cost: 30, damage: 18, range: 3.5, fireRate: 650 },
            { level: 3, cost: 55, damage: 26, range: 4, fireRate: 580 },
            { level: 4, cost: 90, damage: 38, range: 4.5, fireRate: 500 }
          ]
        }),
        arcane_frost: def({
          id: "arcane_frost",
          name: "Frost",
          description: "Applies 65% slow for 2.5s. Interrupts caster channels. No upgrades needed.",
          faction: "arcane",
          damageType: "magic",
          cost: 35,
          damage: 4,
          range: 3,
          fireRate: 900,
          color: 8961023,
          projectileSpeed: 280,
          hotkey: "2",
          targeting: "fastest",
          traits: [{ id: "direct_damage" }, { id: "slow_on_hit", duration: 2500, factor: 0.35 }, { id: "interrupts_channels" }]
          // No upgrades — it's balanced as a pure utility tower
        }),
        arcane_storm: def({
          id: "arcane_storm",
          name: "Storm",
          description: "Area of effect lightning. Good vs packs.",
          faction: "arcane",
          damageType: "magic",
          cost: 55,
          damage: 22,
          range: 3,
          fireRate: 1500,
          color: 8939263,
          projectileSpeed: 250,
          hotkey: "3",
          traits: [{ id: "splash_damage", radius: 56 }],
          upgrades: [
            { level: 2, cost: 65, damage: 35, range: 3.5, fireRate: 1300 },
            { level: 3, cost: 110, damage: 52, range: 4, fireRate: 1100 }
          ]
        }),
        arcane_focus: def({
          id: "arcane_focus",
          name: "Focus",
          description: "Long range sniper. 25% chance for 3x crit.",
          faction: "arcane",
          damageType: "magic",
          cost: 90,
          damage: 55,
          range: 7,
          fireRate: 2800,
          color: 13413119,
          projectileSpeed: 500,
          hotkey: "4",
          targeting: "strongest",
          traits: [{ id: "direct_damage" }, { id: "crit_chance", chance: 0.25, multiplier: 3 }],
          upgrades: [
            { level: 2, cost: 100, damage: 85, range: 7.5, fireRate: 2600 },
            { level: 3, cost: 160, damage: 130, range: 8, fireRate: 2400 }
          ]
        }),
        arcane_drain: def({
          id: "arcane_drain",
          name: "Mana Drain",
          description: "Strips creep shields and interrupts caster channels on hit.",
          faction: "arcane",
          damageType: "magic",
          cost: 120,
          damage: 10,
          range: 4.5,
          fireRate: 1e3,
          color: 4500223,
          projectileSpeed: 350,
          hotkey: "5",
          targeting: "strongest",
          traits: [{ id: "direct_damage" }, { id: "strip_shield" }, { id: "interrupts_channels" }, { id: "siphons_pylons" }],
          upgrades: [
            { level: 2, cost: 80, damage: 18, range: 5, fireRate: 900 }
          ]
        }),
        arcane_meteor: def({
          id: "arcane_meteor",
          name: "Meteor",
          description: "Slow-falling star. Massive area of effect on impact. Location target.",
          faction: "arcane",
          damageType: "magic",
          cost: 200,
          damage: 100,
          range: 5,
          fireRate: 4500,
          color: 16737860,
          projectileSpeed: 55,
          hotkey: "6",
          traits: [{ id: "splash_damage", radius: 80 }],
          upgrades: [
            { level: 2, cost: 180, damage: 160, range: 5.5, fireRate: 4e3 },
            { level: 3, cost: 280, damage: 250, range: 6, fireRate: 3500 }
          ]
        }),
        arcane_nova: def({
          id: "arcane_nova",
          name: "Arcane Nova",
          description: "ULTIMATE. Area of effect crit with slow and damage amp.",
          faction: "arcane",
          damageType: "magic",
          cost: 700,
          damage: 200,
          range: 5.5,
          fireRate: 3e3,
          color: 15654399,
          projectileSpeed: 350,
          hotkey: "7",
          ultimate: true,
          traits: [
            { id: "splash_damage", radius: 72 },
            { id: "crit_chance", chance: 0.3, multiplier: 2.5 },
            { id: "slow_on_hit", duration: 3e3, factor: 0.3 },
            { id: "damage_amp_on_hit", ampAmount: 0.2, duration: 4e3 }
          ]
          // No upgrades — already the apex
        }),
        // ─── M10 Finale Ult Tower ──────────────────────────────────────
        // The throne's firing module — embedded inside the
        // `arcane_archmage_throne` DestructibleStructure (PRD 06) as the
        // attack-capable component at the structure's center cell. Player
        // towers can never reach this kit. The structure handles HP /
        // damage frames / phase hooks; this tower handles the actual
        // shoots-at-hero logic via the standard Tower fire pipeline.
        // Phase mechanics (heal / summon / rage) are dispatched by
        // FinaleEffects, which can mutate this tower's fireRate for "rage".
        arcane_ult_throne: def({
          id: "arcane_ult_throne",
          name: "The Archmage Throne",
          description: "CPU ult. Massive HP, devastating cast. Win-target of the M10 finale.",
          faction: "arcane",
          damageType: "magic",
          cost: 0,
          damage: 80,
          range: 6,
          fireRate: 2200,
          color: 16768324,
          projectileSpeed: 320,
          hotkey: "0",
          ultimate: true,
          traits: [
            { id: "splash_damage", radius: 64 },
            { id: "crit_chance", chance: 0.2, multiplier: 2 }
          ]
        }),
        // ─── M10 Finale Mana Conduit ───────────────────────────────────
        // A dedicated summoning-feeder. Does NOT attack — its only purpose
        // is to sit adjacent to a Summoning Circle and contribute to the
        // shared charge meter. Lets the player keep their full Arcane kit
        // for actual defense + spend on conduits to summon the hero faster.
        // Strategic axis: every g spent on a conduit is g not spent on
        // damage towers, and the conduit MUST be in a magenta zone.
        arcane_conduit: def({
          id: "arcane_conduit",
          name: "Mana Conduit",
          description: "Channels arcane energy into a Summoning Circle. No attack \u2014 sit adjacent to a Circle to charge the summon.",
          faction: "arcane",
          damageType: "magic",
          cost: 40,
          damage: 0,
          range: 0,
          fireRate: 999999,
          color: 13404415,
          projectileSpeed: 0,
          hotkey: "8",
          traits: []
        }),
        // ================================================================
        // MECHANICAL (8) — Engineering, burn, pierce, efficiency
        // ================================================================
        mech_wall: def({
          id: "mech_wall",
          name: "Wall",
          description: "Dirt spike cheap maze filler. Barely attacks.",
          faction: "mechanical",
          damageType: "physical",
          cost: 8,
          damage: 2,
          range: 1.5,
          fireRate: 2e3,
          color: 10061926,
          projectileSpeed: 200,
          hotkey: "1"
          // No upgrades — it's a 10g blocker
        }),
        mech_turret: def({
          id: "mech_turret",
          name: "Turret",
          description: "Ramps fire rate on same target. Patient DPS.",
          faction: "mechanical",
          damageType: "physical",
          cost: 30,
          damage: 10,
          range: 3.5,
          fireRate: 800,
          color: 13404211,
          projectileSpeed: 350,
          hotkey: "2",
          traits: [{ id: "direct_damage" }, { id: "ramp_up", maxStacks: 5, reductionPerStack: 0.08 }],
          upgrades: [
            // L2 is the branch point. Default = standard Turret (raw DPS).
            // Branch = Piercer, which swaps the tower's typeDef to
            // mech_piercer (see below) — mech's armor-ignoring answer.
            {
              level: 2,
              cost: 35,
              damage: 16,
              range: 3.5,
              fireRate: 750,
              branchLabel: "Turret",
              branches: [{ id: "piercer", label: "Piercer", transformsTo: "mech_piercer" }]
            },
            { level: 3, cost: 60, damage: 24, range: 4, fireRate: 680 },
            { level: 4, cost: 100, damage: 35, range: 4, fireRate: 600 }
          ]
        }),
        // Piercer — not in `Factions.mechanical.towerIds`, so it can't be
        // placed directly from the tower dock. Only reachable via Turret's
        // L2 branch. Its `cost` is charged as the one-time branch-switch
        // fee. `upgrades` contains L3-L5, continuing the engine's level
        // counter from where Turret left off (L2 on swap).
        //
        // Design: mech's armor-ignoring answer (the faction's only
        // true_damage). Keeps ramp_up — still a turret at heart. The AP
        // path trades raw DPS for armor ignore at L2-L4, then L5 is the
        // "super high damage, super high cost" capstone.
        //
        // ART NEEDED: black-barrel turret variant. Add as 9th column in
        // mech_towers.png (see SpriteManager) when the sprite is ready.
        mech_piercer: def({
          id: "mech_piercer",
          name: "Piercer",
          description: "Black-barrel armor-piercing turret. Damage scales with target armor \u2014 the heavier they are, the harder it hits. Weak vs unarmored.",
          role: "dps-single",
          faction: "mechanical",
          damageType: "physical",
          cost: 45,
          damage: 10,
          range: 3.5,
          fireRate: 700,
          color: 2763306,
          projectileSpeed: 450,
          projectileColor: 1118481,
          hotkey: "",
          traits: [{ id: "true_damage" }, { id: "ramp_up", maxStacks: 5, reductionPerStack: 0.08 }, { id: "armor_scaling_damage", scale: 1 }],
          upgrades: [
            { level: 3, cost: 70, damage: 18, range: 3.5, fireRate: 680 },
            { level: 4, cost: 120, damage: 30, range: 4, fireRate: 650 },
            { level: 5, cost: 200, damage: 55, range: 4.5, fireRate: 620 }
          ]
        }),
        mech_flamethrower: def({
          id: "mech_flamethrower",
          name: "Flame",
          description: "Short range area of effect. Burns for 8 DPS over 3s.",
          faction: "mechanical",
          damageType: "physical",
          cost: 40,
          damage: 10,
          range: 2,
          fireRate: 500,
          color: 16729088,
          projectileSpeed: 200,
          projectileColor: 16737826,
          hotkey: "3",
          targeting: "closest",
          traits: [{ id: "splash_damage", radius: 32 }, { id: "burn_dot", dps: 8, duration: 3e3 }],
          upgrades: [
            { level: 2, cost: 50, damage: 16, range: 2.5, fireRate: 450 },
            { level: 3, cost: 90, damage: 24, range: 3, fireRate: 380 }
          ]
        }),
        mech_tesla: def({
          id: "mech_tesla",
          name: "Tesla",
          description: "Chain lightning. Jumps to nearby targets.",
          faction: "mechanical",
          damageType: "magic",
          cost: 80,
          damage: 18,
          range: 3.5,
          fireRate: 1400,
          color: 15645508,
          projectileSpeed: 400,
          hotkey: "4",
          targeting: "closest",
          traits: [{ id: "chain_damage", chainCount: 2, chainRange: 96, falloff: 0.7 }],
          upgrades: [
            { level: 2, cost: 75, damage: 28, range: 3.5, fireRate: 1200 },
            { level: 3, cost: 120, damage: 42, range: 4, fireRate: 1e3 }
          ]
        }),
        mech_mortar: def({
          id: "mech_mortar",
          name: "Mortar",
          description: "Extreme range artillery. Huge splash.",
          faction: "mechanical",
          damageType: "physical",
          cost: 120,
          damage: 50,
          range: 8,
          fireRate: 3500,
          color: 6715272,
          projectileSpeed: 150,
          hotkey: "5",
          traits: [{ id: "splash_damage", radius: 64 }],
          upgrades: [
            { level: 2, cost: 120, damage: 80, range: 9, fireRate: 3e3 }
          ]
        }),
        mech_shredder: def({
          id: "mech_shredder",
          name: "Shredder",
          description: "Very fast. Shreds one armor tier for 4s per hit.",
          faction: "mechanical",
          damageType: "physical",
          cost: 150,
          damage: 6,
          range: 3,
          fireRate: 350,
          color: 12298888,
          projectileSpeed: 400,
          hotkey: "6",
          targeting: "strongest",
          traits: [{ id: "direct_damage" }, { id: "armor_shred_on_hit", shredAmount: 1, duration: 4e3 }],
          upgrades: [
            { level: 2, cost: 120, damage: 10, range: 3.5, fireRate: 300 },
            { level: 3, cost: 200, damage: 16, range: 4, fireRate: 250 }
          ]
        }),
        mech_railgun: def({
          id: "mech_railgun",
          name: "Railgun",
          description: "Pierces ALL creeps in a line. Corridor destroyer.",
          faction: "mechanical",
          damageType: "physical",
          cost: 300,
          damage: 120,
          range: 10,
          fireRate: 4e3,
          color: 8960972,
          projectileSpeed: 600,
          hotkey: "7",
          traits: [{ id: "pierce_delivery", lineWidth: 24 }],
          upgrades: [
            { level: 2, cost: 250, damage: 200, range: 11, fireRate: 3500 },
            { level: 3, cost: 400, damage: 320, range: 12, fireRate: 3e3 }
          ]
        }),
        mech_titan: def({
          id: "mech_titan",
          name: "Titan Cannon",
          description: "ULTIMATE. Extreme damage, range, and splash.",
          faction: "mechanical",
          damageType: "physical",
          cost: 800,
          damage: 500,
          range: 12,
          fireRate: 5e3,
          color: 16772829,
          projectileSpeed: 250,
          hotkey: "8",
          ultimate: true,
          traits: [
            { id: "splash_damage", radius: 96 },
            { id: "burn_dot", dps: 25, duration: 4e3 },
            { id: "armor_shred_on_hit", shredAmount: 2, duration: 5e3 }
          ]
          // No upgrades — the apex of engineering
        }),
        // ================================================================
        // NATURE (8) — Growth, poison, synergy, roots
        // ================================================================
        // Note: `nature_thorn` (the classic cheap scaling DPS) was removed
        // in favour of `nature_bramble` — a faster-firing, shorter-range
        // thornbrush that doubles as a maze filler. Bramble carries
        // Thorn's 5-level scaling slot so Nature's early-DPS curve is
        // preserved.
        nature_root: def({
          id: "nature_root",
          name: "Root",
          description: "Strongest slow in game: 70% for 3s.",
          faction: "nature",
          damageType: "magic",
          cost: 25,
          damage: 3,
          range: 3,
          fireRate: 1e3,
          color: 8939059,
          projectileSpeed: 200,
          hotkey: "2",
          targeting: "fastest",
          traits: [{ id: "direct_damage" }, { id: "slow_on_hit", duration: 3e3, factor: 0.3 }],
          upgrades: [
            { level: 2, cost: 40, damage: 5, range: 3.5, fireRate: 900 }
          ]
        }),
        nature_blossom: def({
          id: "nature_blossom",
          name: "Blossom",
          description: "No attack. Buffs adjacent towers: +25% DMG, +15% SPD/level.",
          faction: "nature",
          damageType: "magic",
          cost: 60,
          damage: 0,
          range: 1.5,
          fireRate: 99999,
          color: 16746666,
          projectileSpeed: 0,
          hotkey: "4",
          traits: [{ id: "adjacency_buff", damagePercent: 0.25, ratePercent: 0.15 }],
          upgrades: [
            { level: 2, cost: 55, damage: 0, range: 1.5, fireRate: 99999 },
            { level: 3, cost: 90, damage: 0, range: 1.5, fireRate: 99999 }
          ]
        }),
        nature_spore: def({
          id: "nature_spore",
          name: "Spore",
          description: "Pulses 8 dmg AoE every 1.5s + 2% HP/s poison. Hits ALL creeps in range. Upgrades scale poison to 2.5% / 3% HP/s.",
          faction: "nature",
          damageType: "magic",
          cost: 100,
          damage: 8,
          range: 3,
          fireRate: 1500,
          color: 8965154,
          projectileSpeed: 200,
          projectileColor: 6728192,
          hotkey: "5",
          // scalePerLevel 0.25 makes poison_dot read 2%/2.5%/3% across L1/L2/L3
          // (vs the default 0.15 which would land at 2%/2.3%/2.6%). Other
          // poison-dot towers keep the default scaling.
          traits: [
            { id: "tower_aura_damage", radius: 96 },
            { id: "poison_dot", percentPerSec: 0.02, duration: 3e3, scalePerLevel: 0.25 }
          ],
          upgrades: [
            { level: 2, cost: 90, damage: 14, range: 3.5, fireRate: 1300 },
            { level: 3, cost: 150, damage: 22, range: 4, fireRate: 1100 }
          ]
        }),
        nature_vine: def({
          id: "nature_vine",
          name: "Vine",
          description: "20% chance to fully root (stun) for 0.8s per hit.",
          faction: "nature",
          damageType: "physical",
          cost: 160,
          damage: 14,
          range: 3.5,
          fireRate: 1e3,
          color: 2263091,
          projectileSpeed: 280,
          hotkey: "7",
          traits: [{ id: "direct_damage" }, { id: "root_on_hit", chance: 0.2, duration: 800 }],
          upgrades: [
            { level: 2, cost: 130, damage: 22, range: 4, fireRate: 900 },
            { level: 3, cost: 200, damage: 32, range: 4, fireRate: 800 }
          ]
        }),
        nature_elder: def({
          id: "nature_elder",
          name: "Elder Treant",
          description: "ULTIMATE. Grows +8% DMG permanently. Roots and buffs allies.",
          faction: "nature",
          damageType: "physical",
          cost: 450,
          damage: 40,
          range: 4,
          fireRate: 800,
          color: 2250001,
          projectileSpeed: 280,
          hotkey: "8",
          ultimate: true,
          traits: [
            { id: "direct_damage" },
            { id: "growth_scaling", growthPercent: 0.08 },
            { id: "root_on_hit", chance: 0.25, duration: 1e3 },
            { id: "adjacency_buff", damagePercent: 0.25, ratePercent: 0.12 }
          ]
          // No upgrades — it grows on its own
        }),
        nature_bramble: def({
          id: "nature_bramble",
          name: "Bramble Hedge",
          description: "Dense thornbrush. Pricks constantly. Small splash lets it handle early creep groups. At Lv2, choose Hedge (wider maze) or Razor Bramble (vicious DPS).",
          role: "wall",
          faction: "nature",
          damageType: "physical",
          cost: 12,
          damage: 3,
          range: 1.2,
          fireRate: 400,
          color: 4486963,
          projectileSpeed: 260,
          hotkey: "1",
          traits: [{ id: "direct_damage" }, { id: "splash_damage", radius: 28 }, { id: "root_on_hit", chance: 0.15, duration: 600, minLevel: 3 }],
          upgrades: [
            // L2 is the branch point. Default = Hedge (keeps the wall
            // identity and cheap-maze scaling). Branch = Razor Bramble,
            // which swaps the tower's typeDef to nature_razor_bramble
            // (see the sibling definition below for Razor's stats).
            {
              level: 2,
              cost: 15,
              damage: 4,
              range: 1.3,
              fireRate: 350,
              branchLabel: "Hedge",
              branches: [{ id: "razor", label: "Razor Bramble", transformsTo: "nature_razor_bramble" }]
            },
            { level: 3, cost: 25, damage: 6, range: 1.5, fireRate: 300 }
          ]
        }),
        // Razor Bramble — not in `Factions.nature.towerIds`, so it can't
        // be placed directly from the tower dock. Only reachable via
        // Bramble Hedge's L2 branch. Its `cost` is charged as the one-
        // time branch-switch fee. `upgrades` contains L3 and L4 stats,
        // continuing the engine's level counter from where Bramble left
        // off (L2 on swap → typeDef.upgrades[0].level === 3).
        nature_razor_bramble: def({
          id: "nature_razor_bramble",
          name: "Razor Bramble",
          description: "Bramble sharpened into blades. Short range, vicious bite.",
          role: "dps-single",
          faction: "nature",
          damageType: "physical",
          cost: 15,
          damage: 5,
          range: 1.5,
          fireRate: 300,
          color: 8930355,
          projectileSpeed: 300,
          projectileColor: 13386786,
          hotkey: "",
          traits: [{ id: "direct_damage" }],
          upgrades: [
            { level: 3, cost: 40, damage: 9, range: 1.8, fireRate: 260 },
            { level: 4, cost: 70, damage: 15, range: 2.2, fireRate: 220 }
          ]
        }),
        nature_viper: def({
          id: "nature_viper",
          name: "Grove Viper",
          description: "Mobile. Slithers along hidden paths; strikes with a fanged lunge and sinks venom deep.",
          faction: "nature",
          damageType: "physical",
          cost: 30,
          damage: 12,
          range: 2.5,
          fireRate: 750,
          color: 2775594,
          projectileSpeed: 200,
          hotkey: "3",
          traits: [
            // Slithers along the ground — underlying mobile_unit pathing
            // is standard (smooth-slide); the undulation is sprite-only
            // (4-frame S-curve cycle). engageRange tuned so the strike
            // reaches past the snake's own body length.
            { id: "mobile_unit", moveSpeed: 100, engageRange: 1.8, leashRange: 4, attackCooldown: 750 },
            { id: "direct_damage" },
            { id: "poison_dot", percentPerSec: 0.06, duration: 4500 }
          ],
          upgrades: [
            { level: 2, cost: 40, damage: 13, range: 2.8, fireRate: 700 },
            { level: 3, cost: 65, damage: 20, range: 3.2, fireRate: 650 }
          ]
        }),
        nature_sunroot: def({
          id: "nature_sunroot",
          name: "Sunroot",
          description: "Splash DPS. A bloom that learned to burn \u2014 fire-flowers arc wide.",
          faction: "nature",
          damageType: "magic",
          cost: 140,
          damage: 22,
          range: 4,
          fireRate: 900,
          color: 14527010,
          projectileSpeed: 260,
          projectileColor: 16763972,
          hotkey: "6",
          traits: [{ id: "splash_damage", radius: 72 }],
          upgrades: [
            { level: 2, cost: 120, damage: 34, range: 3.5, fireRate: 850 },
            { level: 3, cost: 200, damage: 50, range: 4, fireRate: 800 }
          ]
        }),
        // ================================================================
        // VOID (5) — Chaos, gambling, manipulation
        // ================================================================
        void_gambler: def({
          id: "void_gambler",
          name: "Gambler",
          description: "Cheap chaos. 4% instant kill (1% vs bosses), 25% whiff.",
          faction: "void",
          damageType: "magic",
          cost: 15,
          damage: 20,
          range: 3,
          fireRate: 1e3,
          color: 14501119,
          projectileSpeed: 300,
          hotkey: "1",
          targeting: "weakest",
          traits: [{ id: "direct_damage" }, { id: "jackpot", killChance: 0.04, missChance: 0.25 }],
          upgrades: [
            { level: 2, cost: 30, damage: 45, range: 3.5, fireRate: 900 }
          ]
        }),
        void_spike: def({
          id: "void_spike",
          name: "Spike",
          description: "Each shot deals 50-150% damage. Chaotic DPS.",
          faction: "void",
          damageType: "magic",
          cost: 30,
          damage: 22,
          range: 3.5,
          fireRate: 1e3,
          color: 8921770,
          projectileSpeed: 350,
          hotkey: "2",
          traits: [{ id: "direct_damage" }, { id: "damage_variance", min: 0.5, max: 1.5 }],
          upgrades: [
            { level: 2, cost: 40, damage: 38, range: 4, fireRate: 900 },
            { level: 3, cost: 75, damage: 60, range: 4.5, fireRate: 800 }
          ]
        }),
        void_siphon: def({
          id: "void_siphon",
          name: "Siphon",
          description: "40% chance of +2g per hit. Gambler's economy engine.",
          faction: "void",
          damageType: "magic",
          cost: 50,
          damage: 5,
          range: 3,
          fireRate: 700,
          color: 12277213,
          projectileSpeed: 300,
          projectileColor: 16768324,
          hotkey: "3",
          traits: [{ id: "direct_damage" }, { id: "gold_on_hit", amount: 2, chance: 0.4 }],
          upgrades: [
            { level: 2, cost: 55, damage: 8, range: 3.5, fireRate: 650 },
            { level: 3, cost: 90, damage: 12, range: 4, fireRate: 580 },
            { level: 4, cost: 140, damage: 18, range: 4, fireRate: 500 }
          ]
        }),
        void_rift: def({
          id: "void_rift",
          name: "Rift",
          description: "Teleports creeps backward on their path. Bites a little on the way through.",
          faction: "void",
          damageType: "magic",
          cost: 120,
          damage: 2,
          range: 3.5,
          fireRate: 3500,
          color: 4456550,
          projectileSpeed: 200,
          hotkey: "4",
          traits: [{ id: "teleport_delivery", stepsBase: 4, stepsPerLevel: 2 }],
          upgrades: [
            { level: 2, cost: 100, damage: 3, range: 4, fireRate: 3e3 },
            { level: 3, cost: 160, damage: 4, range: 4.5, fireRate: 2500 }
          ]
        }),
        void_oblivion: def({
          id: "void_oblivion",
          name: "Oblivion",
          description: "ULTIMATE. 15% instakill, 30% chance of +8 gold per hit, extreme variance.",
          faction: "void",
          damageType: "magic",
          cost: 900,
          damage: 80,
          range: 5,
          fireRate: 600,
          color: 2228292,
          projectileSpeed: 400,
          projectileColor: 16711935,
          hotkey: "5",
          ultimate: true,
          targeting: "weakest",
          traits: [
            { id: "direct_damage" },
            { id: "jackpot", killChance: 0.15, missChance: 0.1 },
            { id: "damage_variance", min: 0.5, max: 2.5 },
            { id: "gold_on_hit", amount: 8, chance: 0.3 },
            { id: "damage_amp_on_hit", ampAmount: 0.2, duration: 3e3 }
          ]
          // No upgrades — pure chaos incarnate
        }),
        // ================================================================
        // MILITARY (6) — Mobile units, area denial, tactical control
        // ================================================================
        mil_sandbag: def({
          id: "mil_sandbag",
          name: "Sandbag",
          description: "Dirt cheap maze filler. No attack.",
          faction: "military",
          damageType: "physical",
          cost: 4,
          damage: 0,
          range: 0,
          fireRate: 99999,
          color: 10061943,
          projectileSpeed: 0,
          hotkey: "1",
          traits: []
          // No upgrades — it's a 4g blocker
        }),
        mil_wire: def({
          id: "mil_wire",
          name: "Barbed Wire",
          description: "Slows adjacent creeps by 40%. No attack.",
          faction: "military",
          damageType: "physical",
          cost: 25,
          damage: 0,
          range: 1.5,
          fireRate: 99999,
          color: 7829350,
          projectileSpeed: 0,
          hotkey: "2",
          traits: [{ id: "barbed_wire", factor: 0.6 }],
          upgrades: [
            { level: 2, cost: 30, damage: 0, range: 2, fireRate: 99999 }
          ]
        }),
        mil_rifleman: def({
          id: "mil_rifleman",
          name: "Rifleman",
          description: "Mobile ranged unit. Engages at medium range.",
          faction: "military",
          damageType: "physical",
          cost: 40,
          damage: 14,
          range: 3,
          fireRate: 700,
          color: 5597999,
          projectileSpeed: 0,
          hotkey: "3",
          traits: [{ id: "mobile_unit", moveSpeed: 110, engageRange: 2.5, leashRange: 8, attackCooldown: 700 }],
          upgrades: [
            { level: 2, cost: 45, damage: 22, range: 3.5, fireRate: 600 },
            { level: 3, cost: 80, damage: 34, range: 4, fireRate: 500 }
          ]
        }),
        mil_brawler: def({
          id: "mil_brawler",
          name: "Brawler",
          description: "Mobile melee. High damage, gets up close.",
          faction: "military",
          damageType: "physical",
          cost: 55,
          damage: 22,
          range: 2,
          fireRate: 500,
          color: 9127187,
          projectileSpeed: 0,
          hotkey: "4",
          traits: [{ id: "mobile_unit", moveSpeed: 140, engageRange: 0.8, leashRange: 4, attackCooldown: 500 }],
          upgrades: [
            { level: 2, cost: 60, damage: 35, range: 2, fireRate: 450 },
            { level: 3, cost: 100, damage: 50, range: 2, fireRate: 400 }
          ]
        }),
        mil_heavy: def({
          id: "mil_heavy",
          name: "Tank",
          description: "Mobile area of effect. Slow but long range. Fires explosive shells.",
          faction: "military",
          damageType: "physical",
          cost: 120,
          damage: 30,
          range: 5,
          fireRate: 2e3,
          color: 4876097,
          projectileSpeed: 180,
          hotkey: "5",
          traits: [{ id: "mobile_unit", moveSpeed: 60, engageRange: 4.5, leashRange: 7, attackCooldown: 2e3 }, { id: "splash_damage", radius: 84 }],
          upgrades: [
            { level: 2, cost: 100, damage: 45, range: 5.5, fireRate: 1800 },
            { level: 3, cost: 160, damage: 65, range: 6, fireRate: 1500 }
          ]
        }),
        mil_commander: def({
          id: "mil_commander",
          name: "Commander",
          description: "ULTIMATE. Mobile. Buffs all units in range. Strong melee.",
          faction: "military",
          damageType: "physical",
          cost: 750,
          damage: 40,
          range: 5,
          fireRate: 800,
          color: 14329120,
          projectileSpeed: 0,
          hotkey: "6",
          ultimate: true,
          traits: [
            { id: "mobile_unit", moveSpeed: 110, engageRange: 1, leashRange: 6, attackCooldown: 800 },
            { id: "adjacency_buff", damagePercent: 0.2, ratePercent: 0.1 }
          ]
          // No upgrades — the Commander leads by presence
        }),
        mil_sniper: def({
          id: "mil_sniper",
          name: "Sniper",
          description: "Mobile. Extreme range, high single-target damage. Slow fire rate, slow movement.",
          faction: "military",
          damageType: "physical",
          cost: 85,
          damage: 80,
          range: 9,
          fireRate: 2500,
          color: 3100463,
          projectileSpeed: 800,
          hotkey: "4",
          traits: [
            { id: "direct_damage" },
            { id: "mobile_unit", moveSpeed: 50, engageRange: 8.5, leashRange: 12, attackCooldown: 2500 }
          ],
          upgrades: [
            { level: 2, cost: 70, damage: 120, range: 9.5, fireRate: 2300 },
            { level: 3, cost: 120, damage: 180, range: 10, fireRate: 2100 }
          ]
        }),
        mil_artillery: def({
          id: "mil_artillery",
          name: "Artillery",
          description: "Static. Massive AoE. Stuns and inflicts Vulnerable (+25% damage taken). Very slow.",
          faction: "military",
          damageType: "physical",
          cost: 220,
          damage: 50,
          range: 7,
          fireRate: 4e3,
          color: 4868682,
          projectileSpeed: 200,
          hotkey: "5",
          traits: [
            { id: "splash_damage", radius: 120 },
            { id: "stun_on_hit", chance: 1, duration: 1200 },
            { id: "damage_amp_on_hit", ampAmount: 0.25, duration: 4e3 }
          ],
          upgrades: [
            { level: 2, cost: 180, damage: 75, range: 7.5, fireRate: 3800 },
            { level: 3, cost: 300, damage: 110, range: 8, fireRate: 3500 }
          ]
        }),
        // ================================================================
        // SPAWN ALIENS (7) — Cheap, fast, swarm. Overwhelm through quantity.
        // ================================================================
        alien_spitter: def({
          id: "alien_spitter",
          name: "Spitter",
          description: "Dirt cheap. Extremely fast fire, tiny damage.",
          faction: "aliens",
          damageType: "physical",
          cost: 12,
          damage: 3,
          range: 3,
          fireRate: 250,
          color: 8978244,
          projectileSpeed: 400,
          hotkey: "1",
          upgrades: [
            { level: 2, cost: 15, damage: 5, range: 3, fireRate: 220 },
            { level: 3, cost: 25, damage: 8, range: 3.5, fireRate: 200 }
          ]
        }),
        alien_stinger: def({
          id: "alien_stinger",
          name: "Stinger",
          description: "Fast fire. Applies weak poison (1% HP/s).",
          faction: "aliens",
          damageType: "physical",
          cost: 25,
          damage: 4,
          range: 3,
          fireRate: 350,
          color: 6741282,
          projectileSpeed: 350,
          hotkey: "2",
          traits: [{ id: "direct_damage" }, { id: "poison_dot", percentPerSec: 0.01, duration: 2e3 }],
          upgrades: [
            { level: 2, cost: 30, damage: 6, range: 3.5, fireRate: 300 }
          ]
        }),
        alien_swarm_node: def({
          id: "alien_swarm_node",
          name: "Swarm Node",
          description: "No attack. All Alien towers in range fire 20% faster.",
          faction: "aliens",
          damageType: "physical",
          cost: 60,
          damage: 0,
          range: 4,
          fireRate: 99999,
          color: 11206502,
          projectileSpeed: 0,
          hotkey: "3",
          traits: [{ id: "faction_speed_aura", ratePercent: 0.2 }],
          upgrades: [
            { level: 2, cost: 55, damage: 0, range: 5, fireRate: 99999 }
          ]
        }),
        alien_acid: def({
          id: "alien_acid",
          name: "Acid Sprayer",
          description: "Short range area of effect + armor shred + poison.",
          faction: "aliens",
          damageType: "physical",
          cost: 100,
          damage: 8,
          range: 2.5,
          fireRate: 500,
          color: 4504320,
          projectileSpeed: 250,
          projectileColor: 6749952,
          hotkey: "4",
          targeting: "closest",
          traits: [{ id: "splash_damage", radius: 40 }, { id: "armor_shred_on_hit", shredAmount: 1, duration: 3e3 }, { id: "poison_dot", percentPerSec: 0.015, duration: 2500 }],
          upgrades: [
            { level: 2, cost: 90, damage: 12, range: 3, fireRate: 450 }
          ]
        }),
        alien_hive_spire: def({
          id: "alien_hive_spire",
          name: "Hive Spire",
          description: "Very fast chain. Chains to 5 targets.",
          faction: "aliens",
          damageType: "physical",
          cost: 180,
          damage: 12,
          range: 4,
          fireRate: 400,
          color: 7859763,
          projectileSpeed: 450,
          hotkey: "5",
          targeting: "closest",
          traits: [{ id: "chain_damage", chainCount: 4, chainRange: 80, falloff: 0.8 }],
          upgrades: [
            { level: 2, cost: 150, damage: 18, range: 4.5, fireRate: 350 },
            { level: 3, cost: 250, damage: 26, range: 5, fireRate: 300 }
          ]
        }),
        alien_brood_mother: def({
          id: "alien_brood_mother",
          name: "Brood Mother",
          description: "Spawns 2 Swarmlings/wave. Buffs nearby Swarmlings +20% damage, +15% speed.",
          faction: "aliens",
          damageType: "physical",
          cost: 80,
          damage: 6,
          range: 3,
          fireRate: 600,
          color: 5614114,
          projectileSpeed: 300,
          hotkey: "6",
          traits: [{ id: "direct_damage" }, { id: "spawn_swarmlings_per_wave", count: 2 }, { id: "commander_aura", buffRange: 6, damagePercent: 0.2, ratePercent: 0.15, targetIds: ["alien_swarmling"] }],
          upgrades: [
            { level: 2, cost: 70, damage: 10, range: 3.5, fireRate: 550 }
          ]
        }),
        alien_swarmling: def({
          id: "alien_swarmling",
          name: "Swarmling",
          description: "Mobile melee. Cheap, fast, disposable.",
          faction: "aliens",
          damageType: "physical",
          cost: 15,
          damage: 4,
          range: 2,
          fireRate: 400,
          color: 10088021,
          projectileSpeed: 0,
          hotkey: "7",
          traits: [{ id: "mobile_unit", moveSpeed: 160, engageRange: 0.6, leashRange: 5, attackCooldown: 400 }],
          upgrades: [
            { level: 2, cost: 15, damage: 10, range: 2, fireRate: 350 }
          ]
        }),
        alien_overmind: def({
          id: "alien_overmind",
          name: "Overmind",
          description: "ULTIMATE. Extreme fire rate. Buffs all aliens nearby.",
          faction: "aliens",
          damageType: "physical",
          cost: 700,
          damage: 15,
          range: 5,
          fireRate: 150,
          color: 13434760,
          projectileSpeed: 500,
          hotkey: "8",
          ultimate: true,
          traits: [{ id: "direct_damage" }, { id: "faction_speed_aura", ratePercent: 0.3 }]
        }),
        // ================================================================
        // CYPHERPUNK (7) — Digital warfare. Hacking, viruses, firewalls.
        // ================================================================
        cyber_ping: def({
          id: "cyber_ping",
          name: "Ping",
          description: "Cheap. Very long range, low damage.",
          faction: "cypherpunk",
          damageType: "magic",
          cost: 15,
          damage: 5,
          range: 8,
          fireRate: 700,
          color: 65484,
          projectileSpeed: 500,
          hotkey: "1",
          upgrades: [
            { level: 2, cost: 20, damage: 8, range: 9, fireRate: 800 },
            { level: 3, cost: 40, damage: 13, range: 10, fireRate: 700 }
          ]
        }),
        cyber_firewall: def({
          id: "cyber_firewall",
          name: "Firewall",
          description: "Links to another Firewall within range. Beam damages + heavily slows creeps crossing.",
          faction: "cypherpunk",
          damageType: "magic",
          cost: 35,
          damage: 0,
          range: 8,
          fireRate: 99999,
          color: 34986,
          projectileSpeed: 0,
          hotkey: "2",
          traits: [{ id: "firewall_link", linkRange: 8, dps: 35, slowFactor: 0.5 }],
          upgrades: [
            { level: 2, cost: 40, damage: 0, range: 10, fireRate: 99999 }
          ]
        }),
        cyber_virus: def({
          id: "cyber_virus",
          name: "Virus",
          description: "Infects target. Spreads to nearby creeps as Damage over Time.",
          faction: "cypherpunk",
          damageType: "magic",
          cost: 55,
          damage: 8,
          range: 4,
          fireRate: 1200,
          color: 56712,
          projectileSpeed: 350,
          projectileColor: 65416,
          hotkey: "3",
          traits: [{ id: "direct_damage" }, { id: "virus_spread", dps: 10, duration: 4e3, spreadRange: 2 }],
          upgrades: [
            { level: 2, cost: 60, damage: 12, range: 4.5, fireRate: 1e3 },
            { level: 3, cost: 100, damage: 18, range: 5, fireRate: 800 }
          ]
        }),
        cyber_backdoor: def({
          id: "cyber_backdoor",
          name: "Backdoor",
          description: "Hacks target \u2014 creep walks backward for 1.5s.",
          faction: "cypherpunk",
          damageType: "magic",
          cost: 90,
          damage: 10,
          range: 5,
          fireRate: 3e3,
          color: 43775,
          projectileSpeed: 400,
          hotkey: "4",
          traits: [{ id: "direct_damage" }, { id: "hack_reverse", duration: 1500 }],
          upgrades: [
            { level: 2, cost: 80, damage: 15, range: 5.5, fireRate: 2700 },
            { level: 3, cost: 130, damage: 22, range: 6, fireRate: 2400 }
          ]
        }),
        cyber_ddos: def({
          id: "cyber_ddos",
          name: "DDoS",
          description: "Area of effect. Roots all creeps in range for 0.5s periodically.",
          faction: "cypherpunk",
          damageType: "magic",
          cost: 150,
          damage: 15,
          range: 3.5,
          fireRate: 2e3,
          color: 4491502,
          projectileSpeed: 300,
          hotkey: "5",
          traits: [{ id: "splash_damage", radius: 56 }, { id: "root_on_hit", chance: 1, duration: 500 }],
          upgrades: [
            { level: 2, cost: 120, damage: 22, range: 4, fireRate: 1800 }
          ]
        }),
        cyber_rootkit: def({
          id: "cyber_rootkit",
          name: "Rootkit",
          description: "Mutes creep abilities in range. Strong armor shred per hit.",
          faction: "cypherpunk",
          damageType: "magic",
          cost: 300,
          damage: 12,
          range: 5,
          fireRate: 1e3,
          color: 2254506,
          projectileSpeed: 350,
          hotkey: "6",
          targeting: "strongest",
          traits: [{ id: "direct_damage" }, { id: "mute_mage_aura" }, { id: "armor_shred_on_hit", shredAmount: 2, duration: 6e3 }],
          upgrades: [
            { level: 2, cost: 250, damage: 18, range: 5.5, fireRate: 900 }
          ]
        }),
        cyber_zeroday: def({
          id: "cyber_zeroday",
          name: "Zero Day",
          description: "ULTIMATE. Hacks + virus + mutes in massive range.",
          faction: "cypherpunk",
          damageType: "magic",
          cost: 800,
          damage: 30,
          range: 6,
          fireRate: 1500,
          color: 65535,
          projectileSpeed: 450,
          hotkey: "7",
          ultimate: true,
          traits: [
            { id: "direct_damage" },
            { id: "hack_reverse", duration: 2e3 },
            { id: "virus_spread", dps: 15, duration: 5e3, spreadRange: 3 },
            { id: "mute_mage_aura" },
            { id: "armor_shred_on_hit", shredAmount: 2, duration: 5e3 }
          ]
        }),
        // ================================================================
        // INFERNAL (6) — Sacrifice and decay. Power at any price.
        // ================================================================
        infernal_imp: def({
          id: "infernal_imp",
          name: "Imp",
          description: "Cheap. Decent damage. Expires after 4 waves.",
          faction: "infernal",
          damageType: "magic",
          cost: 12,
          damage: 12,
          range: 3,
          fireRate: 700,
          color: 16729122,
          projectileSpeed: 350,
          hotkey: "1",
          traits: [{ id: "direct_damage" }, { id: "expires_after_waves", waves: 4 }]
        }),
        infernal_hellfire: def({
          id: "infernal_hellfire",
          name: "Hellfire",
          description: "Strong area of effect + burn. Loses 15% damage each wave.",
          faction: "infernal",
          damageType: "magic",
          cost: 45,
          damage: 35,
          range: 3,
          fireRate: 1500,
          color: 16737792,
          projectileSpeed: 250,
          hotkey: "2",
          targeting: "closest",
          traits: [{ id: "splash_damage", radius: 48 }, { id: "burn_dot", dps: 12, duration: 3e3 }, { id: "decay_per_wave", decayPercent: 0.15 }],
          upgrades: [
            { level: 2, cost: 50, damage: 55, range: 3.5, fireRate: 1300 }
          ]
        }),
        infernal_soul_drain: def({
          id: "infernal_soul_drain",
          name: "Soul Drain",
          description: "Earns +2g per kill within range.",
          faction: "infernal",
          damageType: "magic",
          cost: 90,
          damage: 18,
          range: 4,
          fireRate: 900,
          color: 13382502,
          projectileSpeed: 300,
          hotkey: "3",
          traits: [{ id: "direct_damage" }, { id: "gold_per_kill_range", goldPerKill: 2 }],
          upgrades: [
            { level: 2, cost: 65, damage: 28, range: 4.5, fireRate: 800 },
            { level: 3, cost: 100, damage: 42, range: 5, fireRate: 700 }
          ]
        }),
        infernal_bomber: def({
          id: "infernal_bomber",
          name: "Fiend",
          description: "Kamikaze. Runs to nearest creep and explodes for area of effect damage. Single use.",
          faction: "infernal",
          damageType: "magic",
          cost: 20,
          damage: 60,
          range: 10,
          fireRate: 99999,
          color: 14496512,
          projectileSpeed: 0,
          hotkey: "4",
          traits: [{ id: "mobile_unit", moveSpeed: 180, engageRange: 0.5, attackCooldown: 100, attackSplash: 56, selfDestruct: true }]
        }),
        infernal_immolate: def({
          id: "infernal_immolate",
          name: "Immolate",
          description: "Strong DPS. Right-click to sacrifice for 2000 area of effect damage.",
          faction: "infernal",
          damageType: "magic",
          cost: 200,
          damage: 40,
          range: 4,
          fireRate: 800,
          color: 16746496,
          projectileSpeed: 300,
          hotkey: "5",
          traits: [{ id: "direct_damage" }, { id: "burn_dot", dps: 15, duration: 3e3 }],
          upgrades: [
            { level: 2, cost: 160, damage: 65, range: 4.5, fireRate: 700 }
          ]
        }),
        infernal_apocalypse: def({
          id: "infernal_apocalypse",
          name: "Apocalypse",
          description: "ULTIMATE. Massive burn area of effect. Sacrifice for 8000 damage.",
          faction: "infernal",
          damageType: "magic",
          cost: 900,
          damage: 80,
          range: 5,
          fireRate: 1e3,
          color: 16720384,
          projectileSpeed: 300,
          hotkey: "5",
          ultimate: true,
          traits: [
            { id: "splash_damage", radius: 80 },
            { id: "burn_dot", dps: 30, duration: 5e3 },
            { id: "damage_amp_on_hit", ampAmount: 0.25, duration: 4e3 }
          ]
        }),
        // ================================================================
        // CELESTIAL (5) — Holy protection. Gain lives, block leaks, mute mages.
        // ================================================================
        celestial_acolyte: def({
          id: "celestial_acolyte",
          name: "Acolyte",
          description: "Light damage. 2% chance on nearby kill to gain +1 life (7.5% in Ward range).",
          faction: "celestial",
          damageType: "magic",
          cost: 25,
          damage: 14,
          range: 4.5,
          fireRate: 800,
          color: 16777130,
          projectileSpeed: 350,
          hotkey: "1",
          traits: [{ id: "direct_damage" }, { id: "life_on_kill", chance: 0.02 }],
          upgrades: [
            { level: 2, cost: 30, damage: 16, range: 4, fireRate: 700 },
            { level: 3, cost: 55, damage: 24, range: 4.5, fireRate: 600 }
          ]
        }),
        celestial_ward: def({
          id: "celestial_ward",
          name: "Ward",
          description: "No attack. Mutes mage abilities in range. Boosts nearby Acolytes' life gain to 7.5%.",
          faction: "celestial",
          damageType: "magic",
          cost: 40,
          damage: 0,
          range: 4,
          fireRate: 99999,
          color: 16768426,
          projectileSpeed: 0,
          hotkey: "2",
          traits: [{ id: "mute_mage_aura" }, { id: "acolyte_blessing_aura", blessingChance: 0.075 }],
          upgrades: [
            { level: 2, cost: 45, damage: 0, range: 5, fireRate: 99999 },
            { level: 3, cost: 80, damage: 0, range: 6, fireRate: 99999 }
          ]
        }),
        celestial_smite: def({
          id: "celestial_smite",
          name: "Smite",
          description: "High damage. +50% vs bosses and shielded creeps.",
          faction: "celestial",
          damageType: "magic",
          cost: 80,
          damage: 45,
          range: 5,
          fireRate: 1800,
          color: 16772812,
          projectileSpeed: 400,
          hotkey: "3",
          targeting: "strongest",
          traits: [{ id: "direct_damage" }, { id: "bonus_vs_boss", bonus: 0.5 }],
          upgrades: [
            { level: 2, cost: 90, damage: 70, range: 5.5, fireRate: 1600 },
            { level: 3, cost: 150, damage: 110, range: 6, fireRate: 1400 }
          ]
        }),
        celestial_martyr: def({
          id: "celestial_martyr",
          name: "Martyr",
          description: "Spends lives to execute creeps. Proc chance grows with your life total.",
          faction: "celestial",
          damageType: "magic",
          cost: 120,
          damage: 25,
          range: 5,
          fireRate: 1200,
          color: 16773324,
          projectileSpeed: 400,
          hotkey: "4",
          traits: [{ id: "direct_damage" }, { id: "life_execute", threshold: 50, cost: 10, baseChance: 0.05, maxChance: 0.2, scaleLives: 110 }],
          upgrades: [
            { level: 2, cost: 100, damage: 35, range: 5.5, fireRate: 1100 },
            { level: 3, cost: 180, damage: 50, range: 6, fireRate: 1e3 }
          ]
        }),
        celestial_prophet: def({
          id: "celestial_prophet",
          name: "Prophet",
          description: "Grows stronger with your life total. Weak at low lives, devastating when blessed.",
          faction: "celestial",
          damageType: "magic",
          cost: 180,
          damage: 10,
          range: 5.5,
          fireRate: 1500,
          color: 16777181,
          projectileSpeed: 380,
          hotkey: "5",
          traits: [{ id: "direct_damage" }, { id: "life_scaling", damagePerLife: 0.5, fireRatePerLife: 5, minFireRate: 400 }],
          upgrades: [
            { level: 2, cost: 150, damage: 15, range: 5.5, fireRate: 1400 },
            { level: 3, cost: 250, damage: 22, range: 6, fireRate: 1300 }
          ]
        }),
        celestial_absolution: def({
          id: "celestial_absolution",
          name: "Absolution",
          description: "ULTIMATE. Huge holy area of effect. 10% life gain on kill. Mutes mages.",
          faction: "celestial",
          damageType: "magic",
          cost: 600,
          damage: 60,
          range: 5,
          fireRate: 1200,
          color: 16775392,
          projectileSpeed: 350,
          hotkey: "6",
          ultimate: true,
          traits: [
            { id: "splash_damage", radius: 72 },
            { id: "life_on_kill", chance: 0.1 },
            { id: "mute_mage_aura" },
            { id: "bonus_vs_boss", bonus: 0.3 }
          ]
        }),
        // ================================================================
        // PSIONIC (5) — True damage. Confusion. Mind over matter.
        // ================================================================
        psi_probe: def({
          id: "psi_probe",
          name: "Probe",
          description: "Cheap true damage. Ignores all armor.",
          faction: "psionic",
          damageType: "magic",
          cost: 20,
          damage: 8,
          range: 4,
          fireRate: 700,
          color: 14518527,
          projectileSpeed: 350,
          hotkey: "1",
          traits: [{ id: "true_damage" }],
          upgrades: [
            { level: 2, cost: 25, damage: 14, range: 3.5, fireRate: 650 },
            { level: 3, cost: 50, damage: 22, range: 4, fireRate: 580 }
          ]
        }),
        psi_mesmer: def({
          id: "psi_mesmer",
          name: "Mesmer",
          description: "Confuses target \u2014 walks backward for 1.2s.",
          faction: "psionic",
          damageType: "magic",
          cost: 45,
          damage: 6,
          range: 4,
          fireRate: 2500,
          color: 13395711,
          projectileSpeed: 300,
          hotkey: "2",
          traits: [{ id: "true_damage" }, { id: "confuse_on_hit", duration: 1200 }],
          upgrades: [
            { level: 2, cost: 50, damage: 10, range: 4.5, fireRate: 2200 },
            { level: 3, cost: 90, damage: 16, range: 5, fireRate: 1900 }
          ]
        }),
        psi_terror: def({
          id: "psi_terror",
          name: "Terror",
          description: "Fear aura: 50% slow field. Plus true damage.",
          faction: "psionic",
          damageType: "magic",
          cost: 80,
          damage: 12,
          range: 3.5,
          fireRate: 900,
          color: 12272878,
          projectileSpeed: 300,
          hotkey: "3",
          targeting: "closest",
          traits: [{ id: "true_damage" }, { id: "slow_aura", factor: 0.5 }],
          upgrades: [
            { level: 2, cost: 75, damage: 20, range: 4, fireRate: 800 }
          ]
        }),
        psi_mind_spike: def({
          id: "psi_mind_spike",
          name: "Mind Spike",
          description: "Long range true damage. +50% vs mage creeps.",
          faction: "psionic",
          damageType: "magic",
          cost: 150,
          damage: 55,
          range: 7,
          fireRate: 2500,
          color: 11150045,
          projectileSpeed: 500,
          hotkey: "4",
          targeting: "strongest",
          traits: [{ id: "true_damage" }, { id: "bonus_vs_mage", bonus: 0.5 }],
          upgrades: [
            { level: 2, cost: 130, damage: 85, range: 8, fireRate: 2200 },
            { level: 3, cost: 200, damage: 130, range: 9, fireRate: 1900 }
          ]
        }),
        psi_overmind: def({
          id: "psi_overmind",
          name: "Overmind",
          description: "ULTIMATE. Mass confusion + massive true damage pulse.",
          faction: "psionic",
          damageType: "magic",
          cost: 750,
          damage: 100,
          range: 5,
          fireRate: 2e3,
          color: 10027263,
          projectileSpeed: 400,
          hotkey: "5",
          ultimate: true,
          traits: [
            { id: "splash_damage", radius: 80 },
            { id: "confuse_on_hit", duration: 2e3 },
            { id: "bonus_vs_mage", bonus: 1 }
          ]
        }),
        // ================================================================
        // HARMONIC (7) — Aura network. Sharing, connection, synergy.
        // ================================================================
        harmonic_resonator: def({
          id: "harmonic_resonator",
          name: "Resonator",
          description: "Basic DPS. Weak alone, powerful with auras.",
          faction: "harmonic",
          damageType: "magic",
          cost: 20,
          damage: 8,
          range: 3.5,
          fireRate: 700,
          color: 16763972,
          projectileSpeed: 350,
          hotkey: "1",
          upgrades: [
            { level: 2, cost: 25, damage: 14, range: 3.5, fireRate: 650 },
            { level: 3, cost: 50, damage: 22, range: 4, fireRate: 580 },
            { level: 4, cost: 85, damage: 32, range: 4, fireRate: 500 }
          ]
        }),
        harmonic_amplifier: def({
          id: "harmonic_amplifier",
          name: "Amplifier",
          description: "No attack. +15% damage to towers in range \u2014 stacks multiplicatively, no cap.",
          faction: "harmonic",
          damageType: "magic",
          cost: 30,
          damage: 0,
          range: 4,
          fireRate: 99999,
          color: 16737860,
          projectileSpeed: 0,
          hotkey: "2",
          traits: [{ id: "damage_aura", percent: 0.15 }],
          upgrades: [
            { level: 2, cost: 35, damage: 0, range: 4.5, fireRate: 99999 },
            { level: 3, cost: 60, damage: 0, range: 5, fireRate: 99999 }
          ]
        }),
        harmonic_quickener: def({
          id: "harmonic_quickener",
          name: "Quickener",
          description: "No attack. +10% fire rate to towers in range \u2014 stacks multiplicatively, no cap.",
          faction: "harmonic",
          damageType: "magic",
          cost: 40,
          damage: 0,
          range: 4,
          fireRate: 99999,
          color: 4517444,
          projectileSpeed: 0,
          hotkey: "3",
          traits: [{ id: "rate_aura", percent: 0.1 }],
          upgrades: [
            { level: 2, cost: 45, damage: 0, range: 4.5, fireRate: 99999 }
          ]
        }),
        harmonic_reach: def({
          id: "harmonic_reach",
          name: "Reach",
          description: "No attack. +10% range to towers in range \u2014 stacks multiplicatively, no cap.",
          faction: "harmonic",
          damageType: "magic",
          cost: 50,
          damage: 0,
          range: 4,
          fireRate: 99999,
          color: 4491519,
          projectileSpeed: 0,
          hotkey: "4",
          traits: [{ id: "range_aura", percent: 0.1 }],
          upgrades: [
            { level: 2, cost: 55, damage: 0, range: 5, fireRate: 99999 }
          ]
        }),
        harmonic_critical_mass: def({
          id: "harmonic_critical_mass",
          name: "Critical Mass",
          description: "No attack. Grants 20%/stack crit chance (2x) to towers in range \u2014 chance compounds (asymptotic to 100%), no cap.",
          faction: "harmonic",
          damageType: "magic",
          cost: 80,
          damage: 0,
          range: 4,
          fireRate: 99999,
          color: 16729343,
          projectileSpeed: 0,
          hotkey: "5",
          traits: [{ id: "crit_aura", chance: 0.2, multiplier: 2 }],
          upgrades: [
            { level: 2, cost: 75, damage: 0, range: 5, fireRate: 99999 }
          ]
        }),
        harmonic_conduit: def({
          id: "harmonic_conduit",
          name: "Conduit",
          description: "Links 2 nearest aura towers. Shares their auras between them.",
          faction: "harmonic",
          damageType: "magic",
          cost: 100,
          damage: 0,
          range: 6,
          fireRate: 99999,
          color: 12294434,
          projectileSpeed: 0,
          hotkey: "6",
          traits: [{ id: "conduit_link", maxLinks: 2, linkRange: 6 }],
          upgrades: [
            { level: 2, cost: 90, damage: 0, range: 7, fireRate: 99999 },
            { level: 3, cost: 150, damage: 0, range: 8, fireRate: 99999 }
          ]
        }),
        harmonic_crescendo: def({
          id: "harmonic_crescendo",
          name: "Crescendo",
          description: "ULTIMATE. Moderate DPS. All aura effects on this tower are doubled.",
          faction: "harmonic",
          damageType: "magic",
          cost: 650,
          damage: 30,
          range: 5,
          fireRate: 800,
          color: 16772744,
          projectileSpeed: 400,
          hotkey: "7",
          ultimate: true,
          traits: [{ id: "direct_damage" }]
          // Aura doubling handled by checking for this tower type in aura handlers
        })
      };
    }
  });

  // src/systems/DamageCalculator.ts
  function calculateDamage(baseDamage, damageType, armorType) {
    const multiplier = MULTIPLIERS[damageType][armorType];
    return Math.max(1, Math.round(baseDamage * multiplier));
  }
  var MULTIPLIERS;
  var init_DamageCalculator = __esm({
    "src/systems/DamageCalculator.ts"() {
      "use strict";
      MULTIPLIERS = {
        physical: {
          light: 1.25,
          medium: 1,
          heavy: 0.5
        },
        magic: {
          light: 0.75,
          medium: 1,
          heavy: 1.5
        }
      };
    }
  });

  // src/systems/traits/Trait.ts
  function createHitStats() {
    return { directDamage: 0, splashDamage: 0, burnDamage: 0, poisonDamage: 0, chainDamage: 0, pierceDamage: 0, auraDamage: 0 };
  }
  function registerDelivery(id, fn) {
    deliveryReg.set(id, fn);
  }
  function registerDamageMod(id, fn) {
    damageModReg.set(id, fn);
  }
  function registerFireRateMod(id, fn) {
    fireRateModReg.set(id, fn);
  }
  function registerHitEffect(id, fn) {
    hitEffectReg.set(id, fn);
  }
  function registerOnFire(id, fn) {
    onFireReg.set(id, fn);
  }
  function registerTowerUpdate(id, fn) {
    towerUpdateReg.set(id, fn);
  }
  function registerCreepDamage(id, fn) {
    creepDamageReg.set(id, fn);
  }
  function registerCreepUpdate(id, fn) {
    creepUpdateReg.set(id, fn);
  }
  function registerCreepDraw(id, fn) {
    creepDrawReg.set(id, fn);
  }
  function registerOverlayDraw(id, fn) {
    overlayDrawReg.set(id, fn);
  }
  function resolveDelivery(traits, ctx) {
    for (const trait of traits) {
      const fn = deliveryReg.get(trait.id);
      if (fn) {
        fn(trait, ctx);
        return;
      }
    }
    const dmg = calculateDamage(ctx.damage, ctx.damageType, ctx.target.armor);
    ctx.target.takeDamage(dmg);
    ctx.hitTargets.push(ctx.target);
  }
  function resolveDamageModifiers(traits, ctx) {
    for (const trait of traits) {
      const fn = damageModReg.get(trait.id);
      if (fn) {
        ctx.damage = fn(trait, ctx.damage, ctx);
      }
    }
  }
  function resolveFireRate(traits, baseRate, tower) {
    let rate = baseRate;
    for (const trait of traits) {
      const fn = fireRateModReg.get(trait.id);
      if (fn) {
        rate = fn(trait, rate, tower);
      }
    }
    return Math.max(100, rate);
  }
  function resolveHitEffects(traits, ctx) {
    for (const trait of traits) {
      const fn = hitEffectReg.get(trait.id);
      if (fn) {
        fn(trait, ctx);
      }
    }
  }
  function resolveOnFire(traits, tower, targetIdx) {
    for (const trait of traits) {
      const fn = onFireReg.get(trait.id);
      if (fn) {
        fn(trait, tower, targetIdx);
      }
    }
  }
  function resolveTowerUpdates(traits, tower, ctx) {
    for (const trait of traits) {
      const fn = towerUpdateReg.get(trait.id);
      if (fn) {
        fn(trait, tower, ctx);
      }
    }
  }
  function resolveCreepDamage(traits, damage) {
    let d = damage;
    for (const trait of traits) {
      const fn = creepDamageReg.get(trait.id);
      if (fn) {
        d = fn(trait, d);
      }
    }
    return d;
  }
  function resolveCreepUpdates(traits, creep, delta, nearbyCreeps) {
    for (const trait of traits) {
      const fn = creepUpdateReg.get(trait.id);
      if (fn) {
        fn(trait, creep, delta, nearbyCreeps);
      }
    }
  }
  function resolveCreepDraw(traits, creep, graphics) {
    for (const trait of traits) {
      const fn = creepDrawReg.get(trait.id);
      if (fn) {
        fn(trait, creep, graphics);
      }
    }
  }
  function resolveDamageVeto(traits, amount, source, tower) {
    for (const trait of traits) {
      const fn = damageVetoReg.get(trait.id);
      if (fn && fn(trait, amount, source, tower)) return true;
    }
    return false;
  }
  function resolveTowerDamageModifiers(traits, amount, source, tower) {
    let a = amount;
    for (const trait of traits) {
      const fn = damageModifierReg.get(trait.id);
      if (fn) a = fn(trait, a, source, tower);
    }
    return a;
  }
  function resolveOnTakeDamage(traits, amount, source, tower) {
    for (const trait of traits) {
      const fn = onTakeDamageReg.get(trait.id);
      if (fn) fn(trait, amount, source, tower);
    }
  }
  function resolveOnKill(traits, source, tower) {
    for (const trait of traits) {
      const fn = onKillReg.get(trait.id);
      if (fn) fn(trait, source, tower);
    }
  }
  function resolveOverlayDraw(traits, tower, graphics, scene) {
    for (const trait of traits) {
      const fn = overlayDrawReg.get(trait.id);
      if (fn) fn(trait, tower, graphics, scene);
    }
  }
  function cleanupExpiredTraits(traits) {
    for (let i = traits.length - 1; i >= 0; i--) {
      if (traits[i]._ttl !== void 0 && traits[i]._ttl <= 0) {
        traits.splice(i, 1);
      }
    }
  }
  function hasTrait(traits, id) {
    return traits.some((t) => t.id === id);
  }
  function getTrait(traits, id) {
    return traits.find((t) => t.id === id);
  }
  function removeTrait(traits, id) {
    const idx = traits.findIndex((t) => t.id === id);
    if (idx !== -1) traits.splice(idx, 1);
  }
  function addOrRefreshTrait(traits, trait) {
    const existing = traits.find((t) => t.id === trait.id);
    if (existing) {
      Object.assign(existing, trait);
    } else {
      traits.push(trait);
    }
  }
  var deliveryReg, damageModReg, fireRateModReg, hitEffectReg, onFireReg, towerUpdateReg, creepDamageReg, creepUpdateReg, creepDrawReg, damageVetoReg, damageModifierReg, onTakeDamageReg, onKillReg, overlayDrawReg;
  var init_Trait = __esm({
    "src/systems/traits/Trait.ts"() {
      "use strict";
      init_DamageCalculator();
      deliveryReg = /* @__PURE__ */ new Map();
      damageModReg = /* @__PURE__ */ new Map();
      fireRateModReg = /* @__PURE__ */ new Map();
      hitEffectReg = /* @__PURE__ */ new Map();
      onFireReg = /* @__PURE__ */ new Map();
      towerUpdateReg = /* @__PURE__ */ new Map();
      creepDamageReg = /* @__PURE__ */ new Map();
      creepUpdateReg = /* @__PURE__ */ new Map();
      creepDrawReg = /* @__PURE__ */ new Map();
      damageVetoReg = /* @__PURE__ */ new Map();
      damageModifierReg = /* @__PURE__ */ new Map();
      onTakeDamageReg = /* @__PURE__ */ new Map();
      onKillReg = /* @__PURE__ */ new Map();
      overlayDrawReg = /* @__PURE__ */ new Map();
    }
  });

  // src/data/TowerRoles.ts
  function getTowerRole(tower) {
    if (tower.role) return tower.role;
    if (hasTrait(tower.traits, "mobile_unit")) return "utility";
    const dps = tower.damage * 1e3 / Math.max(tower.fireRate, 1);
    const isNonAttacking = tower.damage === 0 && tower.fireRate >= 1e4;
    const isFillerWall = tower.cost <= 15 && dps < 3;
    const isSpecialized = hasTrait(tower.traits, "slow_on_hit") || hasAnyAura(tower);
    if ((isNonAttacking || isFillerWall) && !isSpecialized) {
      return "wall";
    }
    if (hasTrait(tower.traits, "slow_on_hit")) return "slow";
    if (hasAnyAura(tower)) return "aura";
    if (hasTrait(tower.traits, "splash_damage")) return "dps-splash";
    return "dps-single";
  }
  function hasAnyAura(tower) {
    return tower.traits.some(
      (t) => t.id.startsWith("tower_aura") || t.id.endsWith("_aura") || t.id === "adjacency_buff" || t.id === "spell_amp" || t.id === "overclock_buff" || t.id === "commander_aura"
    );
  }
  var init_TowerRoles = __esm({
    "src/data/TowerRoles.ts"() {
      "use strict";
      init_Trait();
    }
  });

  // src/systems/bots/MazePlanner.ts
  function pathCellsWithinRange(cell, path, rangeCells) {
    let count = 0;
    const r2 = rangeCells * rangeCells;
    for (const p of path) {
      const dc = p.col - cell.col;
      const dr = p.row - cell.row;
      if (dc * dc + dr * dr <= r2) count++;
    }
    return count;
  }
  var init_MazePlanner = __esm({
    "src/systems/bots/MazePlanner.ts"() {
      "use strict";
      init_Grid();
      init_Pathfinding();
      init_Rng();
    }
  });

  // src/systems/bots/learning/FeatureExtractor.ts
  function extractStateFeatures(ctx) {
    const out = new Array(STATE_FEATURE_COUNT).fill(0);
    let i = 0;
    out[i++] = (ctx.wave ?? 0) / 20;
    out[i++] = (ctx.lives ?? 0) / 20;
    out[i++] = (ctx.budget ?? 0) / 200;
    out[i++] = ctx.betweenWaves ? 1 : 0;
    let walls = 0, single = 0, splash = 0, slow = 0, aura = 0, util = 0, ults = 0;
    for (const p of ctx.placedTowers) {
      const t = TOWER_TYPES[p.towerId];
      if (!t) continue;
      if (t.ultimate) ults++;
      const role = getTowerRole(t);
      if (role === "wall") walls++;
      else if (role === "dps-single") single++;
      else if (role === "dps-splash") splash++;
      else if (role === "slow") slow++;
      else if (role === "aura") aura++;
      else util++;
    }
    out[i++] = ctx.placedTowers.length;
    out[i++] = walls;
    out[i++] = single;
    out[i++] = splash;
    out[i++] = slow;
    out[i++] = aura;
    out[i++] = util;
    out[i++] = ults > 0 ? 1 : 0;
    out[i++] = ctx.candidateCells.length / 100;
    const paths = ctx.allPaths.filter((p) => !!p && p.length > 0);
    let totalPathCells = 0, coveredPathCells = 0;
    if (paths.length > 0) {
      for (const p of paths) totalPathCells += p.length;
      const covers = /* @__PURE__ */ new Set();
      for (const placed of ctx.placedTowers) {
        const t = TOWER_TYPES[placed.towerId];
        if (!t || t.range <= 0) continue;
        for (const path of paths) {
          const r2 = t.range * t.range;
          for (const pt of path) {
            const dx = pt.col - placed.col, dy = pt.row - placed.row;
            if (dx * dx + dy * dy <= r2) covers.add(`${pt.col},${pt.row}`);
          }
        }
      }
      coveredPathCells = covers.size;
    }
    out[i++] = totalPathCells > 0 ? coveredPathCells / totalPathCells : 0;
    out[i++] = aura > 0 ? 1 : 0;
    for (const f of FACTION_ORDER2) {
      out[i++] = ctx.faction === f ? 1 : 0;
    }
    return out;
  }
  function extractActionFeatures(ctx, decision, proposerBrainId) {
    const out = new Array(ACTION_FEATURE_COUNT).fill(0);
    let i = 0;
    out[i++] = decision.kind === "place" ? 1 : 0;
    out[i++] = decision.kind === "upgrade" ? 1 : 0;
    out[i++] = decision.kind === "sell" ? 1 : 0;
    out[i++] = decision.kind === "send" ? 1 : 0;
    out[i++] = decision.kind === "frontier" ? 1 : 0;
    out[i++] = decision.kind === "skip" ? 1 : 0;
    let towerType = null;
    if (decision.kind === "place") {
      towerType = decision.type;
    } else if (decision.kind === "upgrade") {
      const owned = ctx.placedTowers.find((p) => p.col === decision.col && p.row === decision.row);
      if (owned) towerType = TOWER_TYPES[owned.towerId] ?? null;
    } else if (decision.kind === "sell") {
      const owned = ctx.placedTowers.find((p) => p.col === decision.col && p.row === decision.row);
      if (owned) towerType = TOWER_TYPES[owned.towerId] ?? null;
    }
    if (towerType) {
      out[i++] = (towerType.cost ?? 0) / 200;
      out[i++] = (towerType.damage ?? 0) / 100;
      out[i++] = (towerType.range ?? 0) / 10;
      out[i++] = towerType.fireRate > 0 ? 1e3 / towerType.fireRate : 0;
      const role = getTowerRole(towerType);
      out[i++] = role === "wall" ? 1 : 0;
      out[i++] = role === "dps-single" ? 1 : 0;
      out[i++] = role === "dps-splash" ? 1 : 0;
      out[i++] = role === "slow" ? 1 : 0;
      out[i++] = role === "aura" ? 1 : 0;
      out[i++] = role === "utility" ? 1 : 0;
      out[i++] = towerType.ultimate ? 1 : 0;
    } else {
      i += 11;
    }
    if (decision.kind === "place") {
      const paths = ctx.allPaths.filter((p) => !!p && p.length > 0);
      let coverage = 0;
      for (const p of paths) {
        coverage += pathCellsWithinRange({ col: decision.col, row: decision.row }, p, decision.type.range);
      }
      out[i++] = Math.min(1, coverage / 50);
      let inAuraZone = 0;
      for (const placed of ctx.placedTowers) {
        const t = TOWER_TYPES[placed.towerId];
        if (!t) continue;
        const role = getTowerRole(t);
        if (role !== "aura" && role !== "slow") continue;
        const dx = placed.col - decision.col, dy = decision.row - placed.row;
        if (dx * dx + dy * dy <= t.range * t.range) {
          inAuraZone = 1;
          break;
        }
      }
      out[i++] = inAuraZone;
    } else {
      i += 2;
    }
    for (const id of PROPOSER_ORDER) {
      out[i++] = proposerBrainId === id ? 1 : 0;
    }
    return out;
  }
  var STATE_FEATURE_NAMES, STATE_FEATURE_COUNT, FACTION_ORDER2, ACTION_FEATURE_NAMES, ACTION_FEATURE_COUNT, PROPOSER_ORDER, ALL_FEATURE_NAMES, ALL_FEATURE_COUNT;
  var init_FeatureExtractor = __esm({
    "src/systems/bots/learning/FeatureExtractor.ts"() {
      "use strict";
      init_TowerTypes();
      init_TowerRoles();
      init_MazePlanner();
      STATE_FEATURE_NAMES = [
        // Match progress
        "wave_norm",
        // current wave / 20
        "lives_norm",
        // current lives / 20
        "gold_norm",
        // current gold / 200
        "between_waves",
        // 0/1
        // Owned tower mix
        "tower_count",
        "wall_count",
        "dps_single_count",
        "dps_splash_count",
        "slow_count",
        "aura_count",
        "utility_count",
        "has_ult_placed",
        // 0/1
        // Board state
        "candidate_cells_norm",
        // count / 100
        "path_coverage_pct",
        // covered path cells / total path cells
        "has_aura_zone",
        // 0/1, any aura tower placed
        // Faction one-hot (11)
        "is_arcane",
        "is_mechanical",
        "is_nature",
        "is_void",
        "is_military",
        "is_aliens",
        "is_cypherpunk",
        "is_infernal",
        "is_celestial",
        "is_psionic",
        "is_harmonic"
      ];
      STATE_FEATURE_COUNT = STATE_FEATURE_NAMES.length;
      FACTION_ORDER2 = [
        "arcane",
        "mechanical",
        "nature",
        "void",
        "military",
        "aliens",
        "cypherpunk",
        "infernal",
        "celestial",
        "psionic",
        "harmonic"
      ];
      ACTION_FEATURE_NAMES = [
        // Decision kind one-hot
        "is_place",
        "is_upgrade",
        "is_sell",
        "is_send",
        "is_frontier",
        "is_skip",
        // Tower-related (place/upgrade) — 0 for non-place/upgrade
        "tower_cost_norm",
        // cost / 200
        "tower_damage_norm",
        // base damage / 100
        "tower_range_norm",
        // range / 10
        "tower_firerate_norm",
        // 1000 / fireRate (faster = higher)
        "tower_role_wall",
        "tower_role_dps_single",
        "tower_role_dps_splash",
        "tower_role_slow",
        "tower_role_aura",
        "tower_role_utility",
        "tower_is_ult",
        // Cell-related (place only)
        "cell_path_coverage_norm",
        // path cells within tower range
        "cell_in_aura_zone",
        // 0/1, cell sits in an existing aura tower's range
        // Proposer brain one-hot — needed so the model can distinguish
        // "harmonic brain placed Resonator on harmonic" from "balanced
        // placed Resonator on harmonic"; without this signal the model
        // averages the two and underprices specialist actions.
        "by_balanced",
        "by_greedy",
        "by_rush",
        "by_econ",
        "by_synergy",
        "by_ultimate",
        "by_aoe_focus",
        "by_nature",
        "by_harmonic",
        "by_psionic",
        // 'human' is reserved for live-capture rows from human play. Bot
        // data leaves this 0; the model sees it set only on imported
        // human turns so it can learn "human-on-mechanical = winning
        // strategy" without mixing into the existing brains' signal.
        "by_human"
      ];
      ACTION_FEATURE_COUNT = ACTION_FEATURE_NAMES.length;
      PROPOSER_ORDER = [
        "balanced",
        "greedy",
        "rush",
        "econ",
        "synergy",
        "ultimate",
        "aoe_focus",
        "nature",
        "harmonic",
        "psionic",
        "human"
      ];
      ALL_FEATURE_NAMES = [
        ...STATE_FEATURE_NAMES.map((n) => `s_${n}`),
        ...ACTION_FEATURE_NAMES.map((n) => `a_${n}`)
      ];
      ALL_FEATURE_COUNT = STATE_FEATURE_COUNT + ACTION_FEATURE_COUNT;
    }
  });

  // src/systems/learning/LiveCapture.ts
  var LiveCapture_exports = {};
  __export(LiveCapture_exports, {
    buildCtxFromSnapshot: () => buildCtxFromSnapshot,
    clearAll: () => clearAll,
    downloadJSONL: () => downloadJSONL,
    exportJSONL: () => exportJSONL,
    finishSession: () => finishSession,
    getStats: () => getStats,
    isCaptureEnabled: () => isCaptureEnabled,
    recordAction: () => recordAction,
    recordIncome: () => recordIncome,
    recordWaveEnd: () => recordWaveEnd,
    recordWaveStart: () => recordWaveStart,
    setCaptureEnabled: () => setCaptureEnabled,
    startSession: () => startSession
  });
  function isCaptureEnabled() {
    if (typeof window === "undefined") return false;
    try {
      if (new URLSearchParams(window.location.search).get("capture") === "1") return true;
      if (window.localStorage.getItem(ENABLE_KEY) === "1") return true;
    } catch {
    }
    return false;
  }
  function setCaptureEnabled(enabled) {
    if (typeof window === "undefined") return;
    try {
      if (enabled) window.localStorage.setItem(ENABLE_KEY, "1");
      else window.localStorage.removeItem(ENABLE_KEY);
    } catch {
    }
  }
  function startSession(faction, difficulty) {
    if (!isCaptureEnabled()) {
      session = null;
      return;
    }
    session = {
      faction,
      difficulty,
      startedAt: Date.now(),
      turnIdx: 0,
      turns: [],
      events: [],
      waveIncome: { kills: 0, waveBonus: 0, sends: 0, traits: 0, other: 0 },
      waveStartDamage: /* @__PURE__ */ new Map(),
      waveStartLives: 0
    };
    try {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(SESSION_KEY);
      }
    } catch {
    }
  }
  function recordAction(ctx, decision) {
    if (!session) return;
    try {
      const raw = { kind: decision.kind };
      if (decision.kind === "place") {
        raw.col = decision.col;
        raw.row = decision.row;
        raw.towerId = decision.type.id;
      } else if (decision.kind === "upgrade") {
        raw.col = decision.col;
        raw.row = decision.row;
        if (decision.branch) raw.branch = decision.branch;
      } else if (decision.kind === "sell") {
        raw.col = decision.col;
        raw.row = decision.row;
      } else if (decision.kind === "send") {
        raw.sendOptionId = decision.sendOptionId;
      } else if (decision.kind === "frontier") {
        raw.buildingId = decision.buildingId;
      } else if (decision.kind === "frontierManage") {
        raw.action = decision.action;
        if (decision.idx !== void 0) raw.idx = decision.idx;
        if (decision.defId) raw.defId = decision.defId;
      }
      const turn = {
        turnIdx: session.turnIdx++,
        stateFeatures: extractStateFeatures(ctx),
        actionFeatures: extractActionFeatures(ctx, decision, "human"),
        decisionKind: decision.kind,
        decisionRaw: raw,
        faction: session.faction,
        difficulty: session.difficulty,
        wave: ctx.wave,
        gold: ctx.budget ?? 0,
        lives: ctx.lives ?? 0
      };
      session.turns.push(turn);
    } catch (err) {
      if (typeof console !== "undefined") console.warn("[LiveCapture] recordAction failed:", err);
    }
  }
  function recordWaveStart(wave, gold, lives, towers, composition, availableTowers) {
    if (!session) return;
    try {
      session.waveIncome = { kills: 0, waveBonus: 0, sends: 0, traits: 0, other: 0 };
      session.waveStartDamage = new Map(
        towers.map((t) => [`${t.col},${t.row}`, t.damageDealt])
      );
      session.waveStartLives = lives;
      const event = {
        eventType: "wave_start",
        wave,
        gold,
        lives,
        towers,
        composition,
        availableTowers
      };
      session.events.push(event);
    } catch (err) {
      if (typeof console !== "undefined") console.warn("[LiveCapture] recordWaveStart failed:", err);
    }
  }
  function recordIncome(source, amount) {
    if (!session) return;
    try {
      session.waveIncome[source] += amount;
    } catch {
    }
  }
  function recordWaveEnd(wave, gold, lives, leaks, towers) {
    if (!session) return;
    try {
      const livesLost = session.waveStartLives - lives;
      const towerDamage = towers.map((t) => {
        const key = `${t.col},${t.row}`;
        const startDamage = session.waveStartDamage.get(key) ?? 0;
        return {
          towerId: t.towerId,
          col: t.col,
          row: t.row,
          damageDealt: t.damageDealt - startDamage
        };
      });
      const event = {
        eventType: "wave_end",
        wave,
        gold,
        lives,
        livesLost,
        leaks,
        income: { ...session.waveIncome },
        towerDamage
      };
      session.events.push(event);
    } catch (err) {
      if (typeof console !== "undefined") console.warn("[LiveCapture] recordWaveEnd failed:", err);
    }
  }
  function finishSession(outcome, waveReached, finalTowers) {
    if (!session) return;
    if (session.turns.length === 0) {
      session = null;
      return;
    }
    try {
      const matchId = Date.now();
      const towerTotals = (finalTowers ?? []).map((t) => ({
        towerId: t.towerId,
        col: t.col,
        row: t.row,
        damageDealt: t.damageDealt
      }));
      const finished = {
        matchId,
        generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        faction: session.faction,
        difficulty: session.difficulty,
        outcome,
        waveReached,
        turns: session.turns,
        events: session.events,
        towerTotals
      };
      if (typeof window !== "undefined") {
        const existingRaw = window.localStorage.getItem(ROWS_KEY);
        const existing = existingRaw ? JSON.parse(existingRaw) : [];
        existing.push(finished);
        window.localStorage.setItem(ROWS_KEY, JSON.stringify(existing));
      }
    } catch (err) {
      if (typeof console !== "undefined") console.warn("[LiveCapture] finishSession failed:", err);
    }
    session = null;
  }
  function clearAll() {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(SESSION_KEY);
      window.localStorage.removeItem(ROWS_KEY);
    } catch {
    }
    session = null;
  }
  function getStats() {
    if (typeof window === "undefined") return { matches: 0, wins: 0, turns: 0 };
    try {
      const raw = window.localStorage.getItem(ROWS_KEY);
      if (!raw) return { matches: 0, wins: 0, turns: 0 };
      const rows = JSON.parse(raw);
      let wins = 0, turns = 0;
      for (const m of rows) {
        if (m.outcome === "win") wins++;
        turns += m.turns.length;
      }
      return { matches: rows.length, wins, turns };
    } catch {
      return { matches: 0, wins: 0, turns: 0 };
    }
  }
  function exportJSONL() {
    if (typeof window === "undefined") return "";
    try {
      const raw = window.localStorage.getItem(ROWS_KEY);
      if (!raw) return "";
      const rows = JSON.parse(raw);
      const lines = [];
      for (const m of rows) {
        const won = m.outcome === "win" ? 1 : 0;
        for (const t of m.turns) {
          lines.push(JSON.stringify({
            matchId: m.matchId,
            rowType: "turn",
            turnIdx: t.turnIdx,
            stateFeatures: t.stateFeatures,
            actionFeatures: t.actionFeatures,
            decisionKind: t.decisionKind,
            decisionRaw: t.decisionRaw,
            faction: t.faction,
            brain: "human",
            difficulty: t.difficulty,
            wave: t.wave,
            gold: t.gold,
            lives: t.lives,
            outcome: m.outcome,
            won,
            waveReached: m.waveReached
          }));
        }
        for (const e of m.events ?? []) {
          lines.push(JSON.stringify({
            matchId: m.matchId,
            rowType: "event",
            ...e,
            faction: m.faction,
            brain: "human",
            difficulty: m.difficulty,
            outcome: m.outcome,
            won,
            waveReached: m.waveReached
          }));
        }
        if (m.towerTotals && m.towerTotals.length > 0) {
          lines.push(JSON.stringify({
            matchId: m.matchId,
            rowType: "match_summary",
            towerTotals: m.towerTotals,
            faction: m.faction,
            brain: "human",
            difficulty: m.difficulty,
            outcome: m.outcome,
            won,
            waveReached: m.waveReached
          }));
        }
      }
      return lines.join("\n") + "\n";
    } catch {
      return "";
    }
  }
  function downloadJSONL(filename = "human-turns.jsonl") {
    if (typeof window === "undefined") return;
    const text = exportJSONL();
    if (!text) return;
    const blob = new Blob([text], { type: "application/jsonl" });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
  function buildCtxFromSnapshot(snap) {
    return {
      playerIndex: 0,
      faction: snap.faction,
      candidateCells: snap.candidateCells,
      towerPool: [],
      budget: snap.budget,
      wave: snap.wave,
      lives: snap.lives,
      grid: null,
      // featurizer doesn't read grid directly
      allPaths: snap.allPaths,
      placedTowers: snap.placedTowers,
      sendOptions: [],
      frontierOptions: [],
      betweenWaves: snap.betweenWaves
    };
  }
  var SESSION_KEY, ROWS_KEY, ENABLE_KEY, session;
  var init_LiveCapture = __esm({
    "src/systems/learning/LiveCapture.ts"() {
      "use strict";
      init_FeatureExtractor();
      SESSION_KEY = "learning.capture.session";
      ROWS_KEY = "learning.capture.rows";
      ENABLE_KEY = "learning.capture";
      session = null;
      if (typeof window !== "undefined") {
        window.__learningCapture = {
          isEnabled: isCaptureEnabled,
          setEnabled: setCaptureEnabled,
          stats: getStats,
          exportJSONL,
          downloadJSONL,
          clear: clearAll
        };
      }
    }
  });

  // src/systems/channels/ChannelEffects.ts
  function warlordVfx(ctx, primary, secondary) {
    const scene = ctx.scene;
    const caster = ctx.caster;
    if (caster && typeof caster.x === "number" && typeof caster.y === "number") {
      const g = scene.add?.graphics?.();
      if (g) {
        g.setDepth(40);
        g.fillStyle(primary, 0.7);
        g.fillCircle(caster.x, caster.y, 64);
        g.fillStyle(secondary, 0.55);
        g.fillCircle(caster.x, caster.y, 36);
        g.lineStyle(5, secondary, 1);
        g.strokeCircle(caster.x, caster.y, 64);
        g.lineStyle(2, secondary, 0.7);
        g.strokeCircle(caster.x, caster.y, 96);
        scene.tweens?.add?.({ targets: g, alpha: 0, duration: 1300, onComplete: () => g.destroy() });
      }
    }
    scene.cameras?.main?.shake?.(450, 0.012);
  }
  var REGISTRY, ChannelEffects;
  var init_ChannelEffects = __esm({
    "src/systems/channels/ChannelEffects.ts"() {
      "use strict";
      init_Rng();
      REGISTRY = /* @__PURE__ */ new Map();
      ChannelEffects = {
        register(id, fn) {
          REGISTRY.set(id, fn);
        },
        dispatch(id, ctx) {
          const fn = REGISTRY.get(id);
          if (!fn) {
            console.warn(`[ChannelEffects] no effect registered for "${id}"`);
            return;
          }
          try {
            fn(ctx);
          } catch (err) {
            console.warn(`[ChannelEffects] effect "${id}" threw:`, err);
          }
        },
        has(id) {
          return REGISTRY.has(id);
        },
        __reset() {
          REGISTRY.clear();
        }
      };
      ChannelEffects.register("clear_towers_radius", (ctx) => {
        const radius = ctx.meta.radius ?? 140;
        const caster = ctx.caster;
        if (!caster || typeof caster.x !== "number") return;
        const scene = ctx.scene;
        const towers = scene.towers ?? scene.towerManager?.towers;
        if (!Array.isArray(towers)) return;
        const toRemove = [];
        for (const t of towers) {
          if (!t || t._expired) continue;
          const dx = (t.x ?? 0) - caster.x;
          const dy = (t.y ?? 0) - caster.y;
          if (dx * dx + dy * dy <= radius * radius) {
            toRemove.push(t);
          }
        }
        for (const t of toRemove) {
          t._expired = true;
        }
        const g = scene.add?.graphics?.();
        if (g) {
          g.setDepth(40);
          g.lineStyle(4, 11158783, 1);
          g.strokeCircle(caster.x, caster.y, radius);
          g.lineStyle(2, 16738047, 0.85);
          g.strokeCircle(caster.x, caster.y, radius * 0.5);
          g.fillStyle(16738047, 0.4);
          g.fillCircle(caster.x, caster.y, 28);
          scene.tweens?.add?.({
            targets: g,
            alpha: 0,
            duration: 900,
            onComplete: () => g.destroy()
          });
        }
        scene.cameras?.main?.shake?.(180, 5e-3);
        const log = scene.eventLog;
        if (log?.gameMessage) {
          const cleared = toRemove.length;
          log.gameMessage(
            cleared > 0 ? `\u26A0 Sigil cast landed \u2014 ${cleared} tower${cleared > 1 ? "s" : ""} destroyed` : `\u26A0 Sigil cast landed \u2014 no towers in radius`
          );
        }
      });
      ChannelEffects.register("meteor_drop", (ctx) => {
        const damage = ctx.meta.damage ?? 250;
        const radius = ctx.meta.radius ?? 80;
        const scene = ctx.scene;
        const caster = ctx.caster;
        const tx = (caster?.x ?? 400) + (rng() - 0.5) * 280;
        const ty = (caster?.y ?? 300) + (rng() - 0.5) * 280;
        const towers = scene.towers ?? scene.towerManager?.towers;
        if (Array.isArray(towers)) {
          for (const t of towers) {
            if (!t || t._expired) continue;
            const dx = (t.x ?? 0) - tx;
            const dy = (t.y ?? 0) - ty;
            if (dx * dx + dy * dy > radius * radius) continue;
            if (typeof t.takeDamage === "function" && t.destructible) {
              t.takeDamage(damage);
            } else {
              t._expired = true;
            }
          }
        }
        const g = scene.add?.graphics?.();
        if (g) {
          g.setDepth(40);
          g.fillStyle(16729088, 0.6);
          g.fillCircle(tx, ty, radius);
          g.fillStyle(16755268, 0.5);
          g.fillCircle(tx, ty, radius * 0.55);
          g.lineStyle(4, 16746530, 1);
          g.strokeCircle(tx, ty, radius);
          g.lineStyle(2, 16769126, 0.85);
          g.strokeCircle(tx, ty, radius * 1.4);
          scene.tweens?.add?.({ targets: g, alpha: 0, duration: 1100, onComplete: () => g.destroy() });
        }
        scene.cameras?.main?.shake?.(380, 0.012);
        const log = scene.eventLog;
        if (log?.gameMessage) {
          log.gameMessage(`\u2604 Meteora's meteor landed \u2014 damage: ${damage}`);
        }
      });
      ChannelEffects.register("chain_lightning_on_towers", (ctx) => {
        const count = ctx.meta.count ?? 3;
        const duration = ctx.meta.duration ?? 5;
        const scene = ctx.scene;
        const caster = ctx.caster;
        const towers = scene.towers ?? scene.towerManager?.towers;
        if (!Array.isArray(towers) || towers.length === 0) return;
        const candidates = towers.filter((t) => t && !t._expired && (t._disabledRemaining ?? 0) <= 0);
        for (let i = candidates.length - 1; i > 0; i--) {
          const j = Math.floor(rng() * (i + 1));
          [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
        }
        const targets = candidates.slice(0, count);
        for (const t of targets) {
          t._disabledRemaining = duration;
        }
        const g = scene.add?.graphics?.();
        if (g && caster && typeof caster.x === "number") {
          g.setDepth(40);
          g.lineStyle(3, 8965375, 1);
          for (const t of targets) {
            const mx = (caster.x + t.x) / 2 + (rng() - 0.5) * 30;
            const my = (caster.y + t.y) / 2 + (rng() - 0.5) * 30;
            g.lineBetween(caster.x, caster.y, mx, my);
            g.lineBetween(mx, my, t.x, t.y);
          }
          scene.tweens?.add?.({ targets: g, alpha: 0, duration: 700, onComplete: () => g.destroy() });
        }
        scene.cameras?.main?.shake?.(180, 5e-3);
        const log = scene.eventLog;
        if (log?.gameMessage) {
          log.gameMessage(`\u26A1 Stormcaller chained lightning \u2014 ${targets.length} tower${targets.length === 1 ? "" : "s"} disabled for ${duration}s`);
        }
      });
      ChannelEffects.register("warlord_reinforcements", (ctx) => {
        const scene = ctx.scene;
        if (scene.spawner) {
          for (let i = 0; i < 6; i++) {
            scene.time?.delayedCall?.(i * 200, () => {
              scene.spawner?.spawnQueue?.push?.({
                creepType: "fast",
                hpScale: 80,
                speedScale: 1,
                isBoss: false,
                groupBurst: 1,
                pathIndex: i % 4
              });
            });
          }
        }
        warlordVfx(ctx, 16746564, 16755268);
        scene.eventLog?.gameMessage?.("\u26A0 Stalwart's rage \u2014 6 reinforcements inbound");
      });
      ChannelEffects.register("warlord_heal_all", (ctx) => {
        const scene = ctx.scene;
        const creeps = scene.creeps ?? [];
        let healedCount = 0;
        for (const c of creeps) {
          if (!c.alive) continue;
          const before = c.hp ?? 0;
          c.hp = c.maxHp ?? before;
          if (c.hp > before) healedCount++;
        }
        warlordVfx(ctx, 4521864, 11206604);
        scene.eventLog?.gameMessage?.(`\u26A0 Healer's rage \u2014 ${healedCount} creep${healedCount === 1 ? "" : "s"} restored to full HP`);
      });
      ChannelEffects.register("warlord_shield_all", (ctx) => {
        const scene = ctx.scene;
        const creeps = scene.creeps ?? [];
        let count = 0;
        for (const c of creeps) {
          if (!c.alive || !c.traits) continue;
          if (c.traits.some((t) => t.id === "shield")) continue;
          const shieldHp = Math.round((c.maxHp ?? 50) * 0.5);
          c.traits.push({ id: "shield", _shieldHp: shieldHp, _active: true });
          count++;
        }
        warlordVfx(ctx, 15649928, 16773290);
        scene.eventLog?.gameMessage?.(`\u26A0 Champion's rage \u2014 ${count} creep${count === 1 ? "" : "s"} gained shields`);
      });
      ChannelEffects.register("warlord_haste_all", (ctx) => {
        const scene = ctx.scene;
        const creeps = scene.creeps ?? [];
        let count = 0;
        for (const c of creeps) {
          if (!c.alive) continue;
          if (typeof c.baseSpeed === "number") {
            c.baseSpeed *= 1.6;
            c.speed = (c.speed ?? c.baseSpeed) * 1.6;
            count++;
          }
        }
        warlordVfx(ctx, 6737151, 11197951);
        scene.eventLog?.gameMessage?.(`\u26A0 Tactician's rage \u2014 ${count} creep${count === 1 ? "" : "s"} now running 60% faster`);
      });
      ChannelEffects.register("warlord_mass_summon", (ctx) => {
        const scene = ctx.scene;
        if (scene.spawner) {
          for (let i = 0; i < 10; i++) {
            scene.time?.delayedCall?.(i * 150, () => {
              scene.spawner?.spawnQueue?.push?.({
                creepType: "standard",
                hpScale: 100,
                speedScale: 1,
                isBoss: false,
                groupBurst: 1,
                pathIndex: i % 6
              });
            });
          }
          for (let i = 0; i < 5; i++) {
            scene.time?.delayedCall?.(1500 + i * 200, () => {
              scene.spawner?.spawnQueue?.push?.({
                creepType: "armored",
                hpScale: 140,
                speedScale: 1,
                isBoss: false,
                groupBurst: 1,
                pathIndex: i % 4
              });
            });
          }
        }
        warlordVfx(ctx, 16729258, 16746717);
        scene.eventLog?.gameMessage?.("\u2620 Captain's rage \u2014 10 swarm + 5 armored inbound");
      });
      ChannelEffects.register("summon_creeps_at_position", (ctx) => {
        const count = ctx.meta.count ?? 5;
        const summonType = ctx.meta.summonType ?? "standard";
        const scene = ctx.scene;
        const caster = ctx.caster;
        if (scene.spawner) {
          for (let i = 0; i < count; i++) {
            scene.time?.delayedCall?.(i * 180, () => {
              scene.spawner?.spawnQueue?.push?.({
                creepType: summonType,
                hpScale: 60,
                speedScale: 1,
                isBoss: false,
                groupBurst: 1,
                pathIndex: 0
              });
            });
          }
        }
        if (caster && typeof caster.x === "number") {
          const g = scene.add?.graphics?.();
          if (g) {
            g.setDepth(40);
            g.fillStyle(4460902, 0.6);
            g.fillCircle(caster.x, caster.y, 60);
            g.fillStyle(8926122, 0.4);
            g.fillCircle(caster.x, caster.y, 30);
            g.lineStyle(3, 11158749, 1);
            g.strokeCircle(caster.x, caster.y, 60);
            g.lineStyle(2, 6693546, 0.7);
            g.strokeCircle(caster.x, caster.y, 90);
            scene.tweens?.add?.({ targets: g, alpha: 0, duration: 1e3, onComplete: () => g.destroy() });
          }
        }
        scene.cameras?.main?.shake?.(220, 6e-3);
        const log = scene.eventLog;
        if (log?.gameMessage) {
          log.gameMessage(`\u2620 Necromaster summoned ${count} shades`);
        }
      });
      ChannelEffects.register("buff_next_wave_hp", (ctx) => {
        const pct = ctx.meta.percent ?? 0.2;
        const cap = ctx.meta.maxBuff ?? 1;
        const scene = ctx.scene;
        const prev = scene._channelHpBuff ?? 0;
        scene._channelHpBuff = Math.min(cap, prev + pct);
        const caster = ctx.caster;
        if (caster && typeof caster.x === "number") {
          const g = scene.add?.graphics?.();
          if (g) {
            g.setDepth(40);
            g.fillStyle(16769126, 0.55);
            g.fillCircle(caster.x, caster.y, 56);
            g.fillStyle(16777215, 0.4);
            g.fillCircle(caster.x, caster.y, 24);
            g.lineStyle(4, 16769126, 1);
            g.strokeCircle(caster.x, caster.y, 56);
            g.lineStyle(2, 16777215, 0.8);
            g.strokeCircle(caster.x, caster.y, 90);
            scene.tweens?.add?.({
              targets: g,
              alpha: 0,
              duration: 1e3,
              onComplete: () => g.destroy()
            });
          }
          scene.cameras?.main?.shake?.(220, 4e-3);
        }
        const summonCount = ctx.meta.summonCount ?? 0;
        const summonType = ctx.meta.summonType ?? "standard";
        if (summonCount > 0 && scene.spawner) {
          for (let i = 0; i < summonCount; i++) {
            scene.time?.delayedCall?.(i * 220, () => {
              scene.spawner?.spawnQueue?.push?.({
                creepType: summonType,
                hpScale: 50,
                speedScale: 1,
                isBoss: false,
                groupBurst: 1,
                pathIndex: 0
              });
            });
          }
        }
        const log = scene.eventLog;
        if (log?.gameMessage) {
          const totalPct = Math.round(scene._channelHpBuff * 100);
          const summonNote = summonCount > 0 ? ` + ${summonCount} extras inbound` : "";
          log.gameMessage(`\u26A0 Scribe cast landed \u2014 future creeps +${totalPct}% HP${summonNote}`);
        }
      });
    }
  });

  // src/systems/AnalyticsClient.ts
  function detectPlatform() {
    if (typeof window === "undefined") return "web";
    const cap = window.Capacitor;
    if (cap?.isNativePlatform?.()) {
      const p = cap.getPlatform?.();
      if (p === "android" || p === "ios") return p;
    }
    const hasTouch = "ontouchstart" in window || (navigator?.maxTouchPoints ?? 0) > 0;
    const smallViewport = (window.innerWidth || 0) < 1024;
    return hasTouch && smallViewport ? "web" : "desktop";
  }
  function generateSessionId() {
    return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  }
  var DEFAULT_SERVER_URL, RING_BUFFER_SIZE, PLATFORM, SESSION_ID, playerContextProvider, AnalyticsClientClass, Analytics;
  var init_AnalyticsClient = __esm({
    "src/systems/AnalyticsClient.ts"() {
      "use strict";
      DEFAULT_SERVER_URL = "https://signal.streamingsplats.com";
      RING_BUFFER_SIZE = 200;
      PLATFORM = detectPlatform();
      SESSION_ID = generateSessionId();
      playerContextProvider = null;
      AnalyticsClientClass = class {
        constructor() {
          this.queue = [];
          this.flushTimer = null;
          this.enabled = true;
          /** In-memory ring buffer for the debug panel. Independent of opt-out:
           *  even if the user has opted out of network telemetry, they (or a
           *  developer with `?debug`) can still inspect what *would* have been
           *  sent. */
          this.ringBuffer = [];
          /** Listeners for the debug panel — fired on every event so the panel
           *  can re-render without polling. */
          this.listeners = /* @__PURE__ */ new Set();
          this.serverUrl = localStorage.getItem("td_server_url") ?? DEFAULT_SERVER_URL;
          if (localStorage.getItem("td_analytics_optout") === "1") {
            this.enabled = false;
          }
        }
        /** Typed event entry point. Use this for any event defined in
         *  AnalyticsEvents.ts. Payload is validated at compile time. */
        track(name, payload) {
          this.emit(name, payload);
        }
        /** Untyped event entry point. Kept for backward compatibility with
         *  existing call sites; new code should use track(). */
        event(type, data = {}) {
          this.emit(type, data);
        }
        /** Convenience: track game start (legacy shim). */
        gameStart(mode, faction, difficulty, map) {
          this.track("game_start", { mode, faction, difficulty, map });
          this.track("faction_pick", { faction });
        }
        /** Convenience: track game end (legacy shim). */
        gameEnd(mode, result, wave, duration) {
          this.track("game_end", { mode, result, wave, ...duration !== void 0 ? { duration } : {} });
        }
        /** Convenience: track multiplayer session (legacy shim). */
        multiplayerStart(mode, players) {
          this.track("multiplayer_start", { mode, players });
        }
        setEnabled(enabled) {
          this.enabled = enabled;
          localStorage.setItem("td_analytics_optout", enabled ? "0" : "1");
          this.track("analytics_optout_changed", { optedOut: !enabled });
        }
        /** Plan 2 will call this once PlayerProfile is initialized. After
         *  this hook is set, every event picks up player-level context. */
        setPlayerContextProvider(provider) {
          playerContextProvider = provider;
        }
        /** Debug panel API: read the ring buffer. */
        getRecentEvents() {
          return this.ringBuffer;
        }
        /** Debug panel API: subscribe for updates. Returns unsubscribe. */
        subscribe(listener) {
          this.listeners.add(listener);
          return () => {
            this.listeners.delete(listener);
          };
        }
        emit(type, data) {
          const playerCtx = playerContextProvider?.() ?? {};
          const merged = {
            type,
            ts: Date.now(),
            sessionId: SESSION_ID,
            platform: PLATFORM,
            ...playerCtx,
            ...data
          };
          const fullEvent = { type };
          for (const [k, v] of Object.entries(merged)) {
            if (v !== void 0) fullEvent[k] = v;
          }
          this.ringBuffer.push(fullEvent);
          if (this.ringBuffer.length > RING_BUFFER_SIZE) this.ringBuffer.shift();
          for (const l of this.listeners) {
            try {
              l();
            } catch {
            }
          }
          if (!this.enabled) return;
          this.queue.push(fullEvent);
          this.scheduleFlush();
        }
        scheduleFlush() {
          if (this.flushTimer) return;
          this.flushTimer = setTimeout(() => {
            this.flush();
            this.flushTimer = null;
          }, 5e3);
        }
        /** Send queued events to server */
        async flush() {
          if (this.queue.length === 0) return;
          const batch = this.queue.splice(0, 50);
          try {
            await fetch(`${this.serverUrl}/api/analytics`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(batch)
            });
          } catch {
          }
        }
        /** Flush any remaining events (call on page unload) */
        flushSync() {
          if (this.queue.length === 0) return;
          const batch = this.queue.splice(0, 50);
          try {
            navigator.sendBeacon(
              `${this.serverUrl}/api/analytics`,
              JSON.stringify(batch)
            );
          } catch {
          }
        }
      };
      Analytics = new AnalyticsClientClass();
      if (typeof window !== "undefined") {
        window.addEventListener("beforeunload", () => Analytics.flushSync());
      }
    }
  });

  // src/systems/channels/ChannelSystem.ts
  var SCENE_MAP, nextChannelCounter, ChannelSystem;
  var init_ChannelSystem = __esm({
    "src/systems/channels/ChannelSystem.ts"() {
      "use strict";
      init_ChannelEffects();
      init_AnalyticsClient();
      SCENE_MAP = /* @__PURE__ */ new WeakMap();
      nextChannelCounter = 0;
      ChannelSystem = class _ChannelSystem {
        constructor(scene) {
          this.active = /* @__PURE__ */ new Map();
          this.stats = { started: 0, interrupted: 0, completed: 0 };
          /** Listeners (HUD subscribes). Keep cheap — fired on add/remove only,
           *  never per-tick. HUD can poll listActive() each frame for progress. */
          this.listeners = /* @__PURE__ */ new Set();
          this.scene = scene;
        }
        static forScene(scene) {
          let inst = SCENE_MAP.get(scene);
          if (!inst) {
            inst = new _ChannelSystem(scene);
            SCENE_MAP.set(scene, inst);
            scene.events.once("shutdown", () => {
              SCENE_MAP.delete(scene);
            });
          }
          return inst;
        }
        /** True only when the scene has had a ChannelSystem touched. Avoids
         *  forcing creation in code paths that just want to peek. */
        static peek(scene) {
          return SCENE_MAP.get(scene) ?? null;
        }
        /** Begin a channel for a casting creep. The trait calls this when
         *  the channel-start condition is met (typically time-since-spawn).
         *  Returns the channel id. */
        start(caster, effectId, duration, meta = {}) {
          const id = `${caster?.id ?? "creep"}_c${++nextChannelCounter}`;
          const chan = {
            id,
            caster,
            effectId,
            duration,
            elapsed: 0,
            completed: false,
            interrupted: false,
            meta
          };
          this.active.set(id, chan);
          this.stats.started++;
          Analytics.track("arcane_channel_started", {
            channelId: id,
            effectId,
            duration
          });
          this.fire();
          return id;
        }
        /** Per-frame tick. Trait update calls this with `delta` ms. */
        tick(channelId, deltaMs) {
          const chan = this.active.get(channelId);
          if (!chan || chan.completed || chan.interrupted) return;
          chan.elapsed += deltaMs / 1e3;
          if (chan.elapsed >= chan.duration) {
            this.complete(channelId);
          }
        }
        /** Mark a channel completed and dispatch its effect. Idempotent. */
        complete(channelId) {
          const chan = this.active.get(channelId);
          if (!chan || chan.completed || chan.interrupted) return;
          chan.completed = true;
          chan.elapsed = chan.duration;
          this.stats.completed++;
          const ctx = {
            scene: this.scene,
            caster: chan.caster,
            meta: chan.meta
          };
          ChannelEffects.dispatch(chan.effectId, ctx);
          Analytics.track("arcane_channel_completed", {
            channelId,
            effectId: chan.effectId
          });
          this.fire();
          this.scene.time.delayedCall(800, () => {
            this.active.delete(channelId);
            this.fire();
          });
        }
        /** Cancel a channel (damage, death, AMF zone). Idempotent. */
        interrupt(channelId, source = "damage") {
          const chan = this.active.get(channelId);
          if (!chan || chan.completed || chan.interrupted) return;
          chan.interrupted = true;
          this.stats.interrupted++;
          Analytics.track("arcane_channel_interrupted", {
            channelId,
            effectId: chan.effectId,
            source,
            percentRemaining: Math.max(0, 1 - chan.elapsed / chan.duration)
          });
          this.fire();
          this.scene.time.delayedCall(400, () => {
            this.active.delete(channelId);
            this.fire();
          });
        }
        /** Find the active (non-completed, non-interrupted) channel for a
         *  caster, if any. Used by the damage hook to interrupt on hit. */
        activeChannelForCaster(caster) {
          for (const c of this.active.values()) {
            if (c.caster === caster && !c.completed && !c.interrupted) return c;
          }
          return null;
        }
        /** All channels in any state, ordered by start time. HUD reads this. */
        listActive() {
          return Array.from(this.active.values());
        }
        /** Direct lookup by channel id. O(1) — preferred over
         *  `listActive().find(c => c.id === id)` from per-frame paths. */
        get(channelId) {
          return this.active.get(channelId) ?? null;
        }
        /** True iff any channel is currently registered (started, not yet
         *  pruned). Cheaper than `listActive().length > 0` since it doesn't
         *  allocate. Useful as a per-frame early-out in HUD overlays. */
        hasAny() {
          return this.active.size > 0;
        }
        getStats() {
          return this.stats;
        }
        /** Subscribe to add/remove events (state changes that affect HUD
         *  membership). Returns an unsubscribe function. */
        subscribe(fn) {
          this.listeners.add(fn);
          return () => this.listeners.delete(fn);
        }
        fire() {
          for (const fn of this.listeners) {
            try {
              fn();
            } catch (err) {
              console.warn("[ChannelSystem] listener threw:", err);
            }
          }
        }
      };
    }
  });

  // src/systems/traits/TowerTraitHandlers.ts
  var require_TowerTraitHandlers = __commonJS({
    "src/systems/traits/TowerTraitHandlers.ts"() {
      "use strict";
      init_config();
      init_DamageCalculator();
      init_Rng();
      init_ChannelSystem();
      init_Trait();
      function spawnAttackEffect(tower, target, splashRadius, ctx) {
        const scene = tower.graphics?.scene;
        if (!scene) return;
        const towerTypeId = tower.typeId ?? "";
        const isMelee = towerTypeId.includes("brawler");
        const isHeavy = towerTypeId.includes("heavy") || towerTypeId.includes("commander");
        const isViper = towerTypeId === "nature_viper";
        const isSwarmling = towerTypeId === "alien_swarmling";
        if (isViper && target) {
          const lv = tower.level ?? 1;
          const gfx = scene.add.graphics();
          gfx.setDepth(14);
          const fang = 16183528;
          const fangShadow = 8939076;
          const venom = 6741299;
          const toxic = 11202099;
          const bloodFleck = 13378184;
          let stabProgress = 0;
          const stab = scene.time.addEvent({
            delay: 14,
            repeat: 3,
            callback: () => {
              stabProgress += 1 / 3;
              gfx.clear();
              const tx = tower.x + (target.x - tower.x) * stabProgress;
              const ty = tower.y + (target.y - tower.y) * stabProgress;
              const dx = target.x - tower.x;
              const dy = target.y - tower.y;
              const len = Math.max(1, Math.hypot(dx, dy));
              const nx = -dy / len;
              const ny = dx / len;
              const offset = 1 + lv;
              gfx.lineStyle(1 + Math.min(2, lv), fangShadow, 0.9);
              gfx.lineBetween(tower.x + nx * offset, tower.y + ny * offset, tx + nx * offset, ty + ny * offset);
              gfx.lineStyle(1, fang, 1);
              gfx.lineBetween(tower.x + nx * offset, tower.y + ny * offset, tx + nx * offset, ty + ny * offset);
              gfx.lineStyle(1 + Math.min(2, lv), fangShadow, 0.9);
              gfx.lineBetween(tower.x - nx * offset, tower.y - ny * offset, tx - nx * offset, ty - ny * offset);
              gfx.lineStyle(1, fang, 1);
              gfx.lineBetween(tower.x - nx * offset, tower.y - ny * offset, tx - nx * offset, ty - ny * offset);
              gfx.fillStyle(bloodFleck, 1);
              gfx.fillCircle(tx, ty, 1 + (lv >= 2 ? 1 : 0));
              if (stabProgress >= 1) {
                stab.destroy();
                gfx.clear();
                gfx.fillStyle(venom, 0.85);
                for (let i = 0; i < 6 + lv * 2; i++) {
                  const a = i / (6 + lv * 2) * Math.PI * 2;
                  const r = 3 + rng() * (3 + lv);
                  gfx.fillCircle(target.x + Math.cos(a) * r, target.y + Math.sin(a) * r, 1 + i % 2);
                }
                gfx.fillStyle(toxic, 0.7);
                gfx.fillCircle(target.x, target.y, 2 + lv);
                gfx.fillStyle(bloodFleck, 0.9);
                gfx.fillCircle(target.x - 1, target.y, 1);
                gfx.fillCircle(target.x + 1, target.y, 1);
                scene.time.delayedCall(100, () => gfx.destroy());
              }
            }
          });
          return;
        }
        if (isSwarmling && target) {
          const gfx = scene.add.graphics();
          gfx.setDepth(14);
          gfx.lineStyle(1, 13434794, 0.95);
          for (let i = 0; i < 3; i++) {
            const a = i / 3 * Math.PI / 2 - Math.PI / 4;
            const len = 6;
            gfx.lineBetween(
              target.x + Math.cos(a) * -len * 0.3,
              target.y + Math.sin(a) * -len * 0.3,
              target.x + Math.cos(a) * len,
              target.y + Math.sin(a) * len
            );
          }
          scene.time.delayedCall(90, () => gfx.destroy());
          return;
        }
        if (splashRadius > 0) {
          const gfx = scene.add.graphics();
          gfx.setDepth(14);
          const color = isHeavy ? 16746564 : 16777215;
          let progress = 0;
          const timer = scene.time.addEvent({
            delay: 16,
            repeat: 12,
            callback: () => {
              progress += 1 / 12;
              gfx.clear();
              gfx.lineStyle(2, color, 1 - progress);
              gfx.strokeCircle(tower.x, tower.y, splashRadius * progress);
              gfx.fillStyle(color, (1 - progress) * 0.1);
              gfx.fillCircle(tower.x, tower.y, splashRadius * progress);
              if (progress >= 1) {
                gfx.destroy();
                timer.destroy();
              }
            }
          });
        } else if (target && isMelee) {
          const gfx = scene.add.graphics();
          gfx.setDepth(14);
          let progress = 0;
          const timer = scene.time.addEvent({
            delay: 16,
            repeat: 8,
            callback: () => {
              progress += 1 / 8;
              gfx.clear();
              const size = 8 + 10 * progress;
              gfx.fillStyle(16777028, 1 - progress);
              for (let a = 0; a < 4; a++) {
                const angle = a / 4 * Math.PI * 2 + progress * 2;
                gfx.fillRect(target.x + Math.cos(angle) * size - 1, target.y + Math.sin(angle) * size - 1, 3, 3);
              }
              if (progress >= 1) {
                gfx.destroy();
                timer.destroy();
              }
            }
          });
        } else if (target) {
          const gfx = scene.add.graphics();
          gfx.setDepth(14);
          const color = towerTypeId.includes("commander") ? 16763972 : 16777130;
          gfx.lineStyle(2, color, 0.8);
          gfx.lineBetween(tower.x, tower.y, target.x, target.y);
          gfx.fillStyle(color, 0.9);
          gfx.fillCircle(target.x, target.y, 4);
          scene.time.delayedCall(100, () => gfx.destroy());
        }
      }
      function levelScale(base, level, perLevel = 0.1) {
        return base * (1 + perLevel * (level - 1));
      }
      registerDelivery("direct_damage", (_trait, ctx) => {
        const dmg = calculateDamage(ctx.damage, ctx.damageType, ctx.target.armor);
        ctx.target.takeDamage(dmg);
        ctx.hitTargets.push(ctx.target);
        ctx.hitStats.directDamage += dmg;
      });
      registerDelivery("splash_damage", (trait, ctx) => {
        const baseRadius = trait.radius ?? 48;
        const radius = levelScale(baseRadius, ctx.towerLevel);
        for (const creep of ctx.allTargets) {
          if (!creep.alive || creep.reached) continue;
          const cOwner = creep.ownerIndex;
          const tOwner = ctx.towerOwnerIndex;
          if (tOwner !== void 0 && cOwner !== void 0 && cOwner === tOwner) continue;
          if (tOwner === void 0 && creep.isFriendly) continue;
          const dx = creep.x - ctx.target.x;
          const dy = creep.y - ctx.target.y;
          if (Math.sqrt(dx * dx + dy * dy) <= radius) {
            const dmg = calculateDamage(ctx.damage, ctx.damageType, creep.armor);
            creep.takeDamage(dmg);
            ctx.hitTargets.push(creep);
            ctx.hitStats.splashDamage += dmg;
          }
        }
      });
      registerDelivery("chain_damage", (trait, ctx) => {
        const chainCount = (trait.chainCount ?? 2) + Math.floor(ctx.towerLevel / 2);
        const chainRange = trait.chainRange ?? TILE_SIZE2 * 3;
        const falloff = trait.falloff ?? 0.7;
        const dmg = calculateDamage(ctx.damage, ctx.damageType, ctx.target.armor);
        ctx.target.takeDamage(dmg);
        ctx.hitTargets.push(ctx.target);
        ctx.hitStats.chainDamage += dmg;
        const hit = /* @__PURE__ */ new Set([ctx.target]);
        let current = ctx.target;
        for (let c = 0; c < chainCount; c++) {
          let nearest = null;
          let nearDist = Infinity;
          for (const creep of ctx.allTargets) {
            if (!creep.alive || creep.reached || hit.has(creep)) continue;
            const dx = creep.x - current.x;
            const dy = creep.y - current.y;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d <= chainRange && d < nearDist) {
              nearest = creep;
              nearDist = d;
            }
          }
          if (!nearest) break;
          const chainDmg = calculateDamage(
            Math.round(ctx.damage * falloff),
            ctx.damageType,
            nearest.armor
          );
          nearest.takeDamage(chainDmg);
          ctx.hitTargets.push(nearest);
          ctx.hitStats.chainDamage += chainDmg;
          hit.add(nearest);
          current = nearest;
        }
      });
      registerDelivery("teleport_delivery", (trait, ctx) => {
        const steps = (trait.stepsBase ?? 3) + (trait.stepsPerLevel ?? 2) * ctx.towerLevel;
        const target = ctx.target;
        if (ctx.damage > 0) {
          const dmg = calculateDamage(ctx.damage, ctx.damageType, target.armor);
          target.takeDamage(dmg);
          ctx.hitStats.directDamage += dmg;
        }
        target.pathIndex = Math.max(1, target.pathIndex - steps);
        const tp = target.path[target.pathIndex - 1];
        if (tp) {
          target.x = gridX(tp.col);
          target.y = gridY(tp.row);
        }
        ctx.hitTargets.push(target);
      });
      registerDelivery("tower_aura_damage", (trait, ctx) => {
        const radius = levelScale(trait.radius ?? 96, ctx.towerLevel);
        const towerX = trait._towerX ?? ctx.target.x;
        const towerY = trait._towerY ?? ctx.target.y;
        for (const creep of ctx.allTargets) {
          if (!creep.alive || creep.reached) continue;
          const dx = creep.x - towerX;
          const dy = creep.y - towerY;
          if (Math.sqrt(dx * dx + dy * dy) <= radius) {
            const dmg = calculateDamage(ctx.damage, ctx.damageType, creep.armor);
            creep.takeDamage(dmg);
            ctx.hitTargets.push(creep);
            ctx.hitStats.auraDamage += dmg;
          }
        }
      });
      registerDelivery("pierce_delivery", (trait, ctx) => {
        const towerX = trait._towerX ?? ctx.target.x;
        const towerY = trait._towerY ?? ctx.target.y;
        const lineWidth = trait.lineWidth ?? TILE_SIZE2 * 0.8;
        const dx = ctx.target.x - towerX;
        const dy = ctx.target.y - towerY;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len === 0) return;
        const nx = dx / len;
        const ny = dy / len;
        for (const creep of ctx.allTargets) {
          if (!creep.alive || creep.reached) continue;
          const cx = creep.x - towerX;
          const cy = creep.y - towerY;
          const proj = cx * nx + cy * ny;
          if (proj < 0) continue;
          const perpX = cx - proj * nx;
          const perpY = cy - proj * ny;
          const perpDist = Math.sqrt(perpX * perpX + perpY * perpY);
          if (perpDist <= lineWidth / 2) {
            const dmg = calculateDamage(ctx.damage, ctx.damageType, creep.armor);
            creep.takeDamage(dmg);
            ctx.hitTargets.push(creep);
            ctx.hitStats.pierceDamage += dmg;
          }
        }
      });
      registerDamageMod("damage_variance", (trait, damage, _ctx) => {
        const min = trait.min ?? 0.5;
        const max = trait.max ?? 1.5;
        return Math.round(damage * (min + rng() * (max - min)));
      });
      registerDamageMod("damage_mult", (trait, damage, _ctx) => {
        return Math.round(damage * (trait.factor ?? 1));
      });
      registerDamageMod("crit_chance", (trait, damage, ctx) => {
        const baseChance = trait.chance ?? 0.25;
        const chance = Math.min(0.8, baseChance + 0.03 * (ctx.towerLevel - 1));
        const multiplier = trait.multiplier ?? 3;
        if (rng() < chance) {
          return Math.round(damage * multiplier);
        }
        return damage;
      });
      registerDamageMod("jackpot", (trait, damage, ctx) => {
        const baseKill = trait.killChance ?? 0.04;
        const levelKill = Math.min(0.5, baseKill + 0.02 * (ctx.towerLevel - 1));
        const killChance = ctx.target.isBoss ? levelKill * 0.25 : levelKill;
        const missChance = trait.missChance ?? 0.25;
        const roll = rng();
        if (roll < killChance) {
          return 99999;
        } else if (roll < killChance + missChance) {
          return 0;
        }
        return damage;
      });
      registerDamageMod("_adj_damage_buff", (trait, damage, _ctx) => {
        return damage + (trait.bonus ?? 0);
      });
      registerDamageMod("_spell_amp_buff", (trait, damage, ctx) => {
        if (ctx.damageType === "magic") {
          return Math.round(damage * (1 + (trait.bonus ?? 0)));
        }
        return damage;
      });
      registerFireRateMod("ramp_up", (trait, rate, _tower) => {
        const stacks = trait._stacks ?? 0;
        const reductionPerStack = trait.reductionPerStack ?? 0.08;
        const maxReduction = (trait.maxStacks ?? 5) * reductionPerStack;
        const reduction = Math.min(stacks * reductionPerStack, maxReduction);
        return Math.round(rate * (1 - reduction));
      });
      registerFireRateMod("fire_rate_mult", (trait, rate, _tower) => {
        return Math.round(rate * (trait.factor ?? 1));
      });
      registerFireRateMod("_adj_rate_buff", (trait, rate, _tower) => {
        return Math.round(rate * (1 - (trait.bonus ?? 0)));
      });
      registerFireRateMod("_overclock_buff", (trait, rate, _tower) => {
        return Math.round(rate * (1 - (trait.bonus ?? 0)));
      });
      registerOnFire("ramp_up", (trait, _tower, targetIdx) => {
        if (targetIdx === (trait._lastTargetIdx ?? -1)) {
          trait._stacks = Math.min((trait._stacks ?? 0) + 1, trait.maxStacks ?? 5);
        } else {
          trait._stacks = 0;
          trait._lastTargetIdx = targetIdx;
        }
      });
      registerOnFire("pierce_delivery", (trait, tower, _targetIdx) => {
        trait._towerX = tower.x;
        trait._towerY = tower.y;
      });
      registerOnFire("tower_aura_damage", (trait, tower, _targetIdx) => {
        trait._towerX = tower.x;
        trait._towerY = tower.y;
      });
      registerHitEffect("slow_on_hit", (trait, ctx) => {
        const baseDuration = trait.duration ?? 2e3;
        const duration = levelScale(baseDuration, ctx.towerLevel, 0.15);
        const factor = trait.factor ?? 0.5;
        for (const target of ctx.hitTargets) {
          target.applySlow(duration, factor);
        }
      });
      registerHitEffect("interrupts_channels", (_trait, ctx) => {
        for (const target of ctx.hitTargets) {
          const creep = target;
          if (!creep.traits) continue;
          const casterTrait = creep.traits.find((t) => t.id === "channel_caster");
          if (!casterTrait || !casterTrait._channelId) continue;
          const sys = ChannelSystem.peek(creep._scene);
          if (!sys) continue;
          sys.interrupt(casterTrait._channelId, "damage");
          casterTrait._channelId = null;
        }
      });
      registerHitEffect("gold_on_hit", (trait, ctx) => {
        const amount = trait.amount ?? 1;
        const chance = trait.chance ?? 1;
        if (chance >= 1) {
          ctx.goldEarned += amount * ctx.hitTargets.length;
          return;
        }
        for (let i = 0; i < ctx.hitTargets.length; i++) {
          if (rng() < chance) ctx.goldEarned += amount;
        }
      });
      registerHitEffect("burn_dot", (trait, ctx) => {
        const baseDps = trait.dps ?? 8;
        const dps = Math.round(levelScale(baseDps, ctx.towerLevel, 0.2));
        const duration = trait.duration ?? 3e3;
        for (const target of ctx.hitTargets) {
          target.statusEffects?.apply("burn", duration, dps);
        }
      });
      registerHitEffect("poison_dot", (trait, ctx) => {
        const basePercent = trait.percentPerSec ?? 0.02;
        const scale = trait.scalePerLevel ?? 0.15;
        const percent = levelScale(basePercent, ctx.towerLevel, scale);
        const duration = trait.duration ?? 3e3;
        for (const target of ctx.hitTargets) {
          target.statusEffects?.apply("poison", duration, percent);
        }
      });
      registerHitEffect("strip_shield", (_trait, ctx) => {
        for (const target of ctx.hitTargets) {
          const traits = target.traits;
          if (traits) {
            const shield = traits.find((t) => t.id === "shield");
            if (shield) {
              shield._shieldHp = 0;
              shield._active = false;
            }
            const capShield = traits.find((t) => t.id === "damage_cap_shield");
            if (capShield) {
              capShield._hits = capShield.shieldHits ?? 15;
            }
          }
        }
      });
      registerHitEffect("armor_shred_on_hit", (trait, ctx) => {
        const shredAmount = trait.shredAmount ?? 1;
        const duration = levelScale(trait.duration ?? 4e3, ctx.towerLevel, 0.15);
        for (const target of ctx.hitTargets) {
          target.statusEffects?.apply("armor_shred", duration, shredAmount);
        }
      });
      registerHitEffect("damage_amp_on_hit", (trait, ctx) => {
        const baseAmp = trait.ampAmount ?? 0.15;
        const amp = levelScale(baseAmp, ctx.towerLevel, 0.1);
        const duration = trait.duration ?? 3e3;
        for (const target of ctx.hitTargets) {
          target.statusEffects?.applyStacking("damage_amp", duration, amp);
        }
      });
      registerHitEffect("root_on_hit", (trait, ctx) => {
        const minLevel = trait.minLevel ?? 1;
        if (ctx.towerLevel < minLevel) return;
        const baseChance = trait.chance ?? 0.2;
        const chance = Math.min(0.6, baseChance + 0.03 * (ctx.towerLevel - 1));
        const baseDuration = trait.duration ?? 800;
        const duration = levelScale(baseDuration, ctx.towerLevel, 0.15);
        for (const target of ctx.hitTargets) {
          if (rng() < chance) {
            target.statusEffects?.apply("root", duration, 1);
          }
        }
      });
      registerHitEffect("stun_on_hit", (trait, ctx) => {
        const baseChance = trait.chance ?? 1;
        const chance = Math.min(1, baseChance);
        const baseDuration = trait.duration ?? 1e3;
        const duration = levelScale(baseDuration, ctx.towerLevel, 0.15);
        for (const target of ctx.hitTargets) {
          if (rng() < chance) {
            target.statusEffects?.apply("root", duration, 1);
          }
        }
      });
      function accumulateBuff(target, id, bonus, time) {
        let existing = target.traits.find((t) => t.id === id);
        if (!existing || existing._setAt !== time) {
          if (existing) {
            existing.bonus = bonus;
            existing._ttl = 200;
            existing._setAt = time;
          } else {
            target.traits.push({ id, bonus, _ttl: 200, _setAt: time });
          }
        } else {
          existing.bonus += bonus;
          existing._ttl = 200;
        }
      }
      function setBestBuff(target, id, score, fields, time) {
        let existing = target.traits.find((t) => t.id === id);
        if (!existing || existing._setAt !== time) {
          if (existing) {
            Object.assign(existing, fields);
            existing._ttl = 200;
            existing._setAt = time;
            existing._bestScore = score;
          } else {
            target.traits.push({ id, ...fields, _ttl: 200, _setAt: time, _bestScore: score });
          }
        } else if (score > (existing._bestScore ?? -Infinity)) {
          Object.assign(existing, fields);
          existing._bestScore = score;
          existing._ttl = 200;
        } else {
          existing._ttl = 200;
        }
      }
      registerTowerUpdate("adjacency_buff", (trait, tower, ctx) => {
        const dmgPercent = trait.damagePercent ?? 0.15;
        const ratePercent = trait.ratePercent ?? 0.08;
        for (const other of ctx.allTowers) {
          if (other === tower) continue;
          const dc = Math.abs(other.col - tower.col);
          const dr = Math.abs(other.row - tower.row);
          if (dc <= 1 && dr <= 1) {
            accumulateBuff(other, "_adj_damage_buff", Math.round(other.damage * dmgPercent * tower.level), ctx.time);
            accumulateBuff(other, "_adj_rate_buff", ratePercent * tower.level, ctx.time);
          }
        }
      });
      registerTowerUpdate("spell_amp", (trait, tower, ctx) => {
        const ampPercent = trait.ampPercent ?? 0.3;
        for (const other of ctx.allTowers) {
          if (other === tower) continue;
          const dc = Math.abs(other.col - tower.col);
          const dr = Math.abs(other.row - tower.row);
          if (dc <= 1 && dr <= 1) {
            accumulateBuff(other, "_spell_amp_buff", ampPercent * tower.level, ctx.time);
          }
        }
      });
      registerTowerUpdate("overclock_buff", (trait, tower, ctx) => {
        const rateReduction = trait.rateReduction ?? 0.4;
        let bestTower = null;
        let bestDist = Infinity;
        for (const other of ctx.allTowers) {
          if (other === tower) continue;
          const dc = Math.abs(other.col - tower.col);
          const dr = Math.abs(other.row - tower.row);
          if (dc <= 1 && dr <= 1) {
            if (other.damage === 0) continue;
            const dist = dc + dr;
            if (dist < bestDist) {
              bestTower = other;
              bestDist = dist;
            }
          }
        }
        if (bestTower) {
          const bonus = Math.min(0.6, rateReduction * tower.level);
          setBestBuff(bestTower, "_overclock_buff", bonus, { bonus }, ctx.time);
        }
      });
      registerTowerUpdate("slow_aura", (trait, tower, ctx) => {
        const factor = trait.factor ?? 0.7;
        const range = tower.range;
        for (const creep of ctx.allCreeps) {
          if (!creep.alive || creep.reached) continue;
          const dx = creep.x - tower.x;
          const dy = creep.y - tower.y;
          if (Math.sqrt(dx * dx + dy * dy) <= range) {
            creep.applySlow(200, factor);
          }
        }
      });
      registerTowerUpdate("growth_scaling", (trait, tower, ctx) => {
        trait._timeAccum = (trait._timeAccum ?? 0) + ctx.delta;
        if (trait._timeAccum >= 3e4) {
          trait._timeAccum = 0;
          const growthPercent = trait.growthPercent ?? 0.08;
          tower.damage = Math.round(tower.damage * (1 + growthPercent));
          tower.drawTower();
        }
      });
      registerTowerUpdate("mobile_unit", (trait, tower, ctx) => {
        const moveSpeed = (trait.moveSpeed ?? 120) * (ctx.delta / 1e3);
        const engageRange = (trait.engageRange ?? 0.8) * TILE_SIZE2;
        const leashRange = (trait.leashRange ?? (trait.engageRange ?? 0.8) * 4) * TILE_SIZE2;
        const attackDamage = tower.damage;
        const attackCooldown = trait.attackCooldown ?? 600;
        const attackSplash = trait.attackSplash ?? 0;
        if (trait._target === void 0) trait._target = null;
        if (trait._attackTimer === void 0) trait._attackTimer = 0;
        trait._attackTimer -= ctx.delta;
        let target = trait._target;
        if (target && (!target.alive || target.reached)) {
          target = null;
          trait._target = null;
        }
        if (target) {
          const ldx = target.x - tower.x;
          const ldy = target.y - tower.y;
          const lDist = Math.sqrt(ldx * ldx + ldy * ldy);
          if (lDist > leashRange) {
            target = null;
            trait._target = null;
          }
        }
        if (!target) {
          const aggroRange = tower.range || TILE_SIZE2 * 4;
          let closest = null;
          let closestDist = Infinity;
          for (const creep of ctx.allCreeps) {
            if (!creep.alive || creep.reached) continue;
            const dx = creep.x - tower.x;
            const dy = creep.y - tower.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= aggroRange && dist < closestDist) {
              closest = creep;
              closestDist = dist;
            }
          }
          target = closest;
          trait._target = target;
        }
        if (target) {
          const dx = target.x - tower.x;
          const dy = target.y - tower.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > engageRange) {
            tower.x += dx / dist * moveSpeed;
            tower.y += dy / dist * moveSpeed;
          } else {
            if (trait._attackTimer <= 0) {
              trait._attackTimer = attackCooldown;
              if (attackSplash > 0) {
                for (const creep of ctx.allCreeps) {
                  if (!creep.alive || creep.reached) continue;
                  const cx = creep.x - tower.x;
                  const cy = creep.y - tower.y;
                  if (Math.sqrt(cx * cx + cy * cy) <= attackSplash) {
                    creep.takeDamage(attackDamage);
                    tower.damageDealt += attackDamage;
                  }
                }
                spawnAttackEffect(tower, null, attackSplash, ctx);
              } else {
                target.takeDamage(attackDamage);
                tower.damageDealt += attackDamage;
                spawnAttackEffect(tower, target, 0, ctx);
              }
              if (trait.selfDestruct) {
                tower._expired = true;
              }
            }
          }
        }
      });
      registerTowerUpdate("commander_aura", (trait, tower, ctx) => {
        const dmgPercent = trait.damagePercent ?? 0.2;
        const ratePercent = trait.ratePercent ?? 0.15;
        const buffRange = (trait.buffRange ?? 6) * TILE_SIZE2;
        const targetIds = trait.targetIds ?? [];
        for (const other of ctx.allTowers) {
          if (other === tower) continue;
          if (targetIds.length > 0 && !targetIds.includes(other.typeId)) continue;
          const dx = other.x - tower.x;
          const dy = other.y - tower.y;
          if (Math.sqrt(dx * dx + dy * dy) <= buffRange) {
            const dmgBonus = Math.round(other.damage * dmgPercent * tower.level);
            const rateBonus = ratePercent * tower.level;
            setBestBuff(other, "_adj_damage_buff", dmgBonus, { bonus: dmgBonus }, ctx.time);
            setBestBuff(other, "_adj_rate_buff", rateBonus, { bonus: rateBonus }, ctx.time);
          }
        }
      });
      registerTowerUpdate("barbed_wire", (trait, tower, ctx) => {
        const factor = trait.factor ?? 0.6;
        const range = TILE_SIZE2 * 1.5;
        for (const creep of ctx.allCreeps) {
          if (!creep.alive || creep.reached) continue;
          const dx = creep.x - tower.homeX;
          const dy = creep.y - tower.homeY;
          if (Math.sqrt(dx * dx + dy * dy) <= range) {
            creep.applySlow(200, factor);
          }
        }
      });
      registerTowerUpdate("_adj_damage_buff", (trait, _tower, ctx) => {
        trait._ttl = (trait._ttl ?? 0) - ctx.delta;
      });
      registerTowerUpdate("_adj_rate_buff", (trait, _tower, ctx) => {
        trait._ttl = (trait._ttl ?? 0) - ctx.delta;
      });
      registerTowerUpdate("_spell_amp_buff", (trait, _tower, ctx) => {
        trait._ttl = (trait._ttl ?? 0) - ctx.delta;
      });
      registerTowerUpdate("_overclock_buff", (trait, _tower, ctx) => {
        trait._ttl = (trait._ttl ?? 0) - ctx.delta;
      });
      registerDelivery("true_damage", (_trait, ctx) => {
        ctx.target.takeDamage(ctx.damage);
        ctx.hitTargets.push(ctx.target);
        ctx.hitStats.directDamage += ctx.damage;
      });
      registerHitEffect("confuse_on_hit", (trait, ctx) => {
        const duration = levelScale(trait.duration ?? 1200, ctx.towerLevel, 0.1);
        for (const target of ctx.hitTargets) {
          target.statusEffects?.apply("confused", duration, 1);
        }
      });
      registerDamageMod("bonus_vs_boss", (trait, damage, ctx) => {
        const target = ctx.target;
        const isBoss = target.isBoss;
        const hasShield = target.traits?.some((t) => t.id === "shield" || t.id === "damage_cap_shield");
        if (isBoss || hasShield) {
          return Math.round(damage * (1 + (trait.bonus ?? 0.5)));
        }
        return damage;
      });
      registerDamageMod("bonus_vs_mage", (trait, damage, ctx) => {
        const target = ctx.target;
        const isMage = target.creepType?.id?.includes("mage");
        if (isMage) {
          return Math.round(damage * (1 + (trait.bonus ?? 0.5)));
        }
        return damage;
      });
      registerDamageMod("bonus_vs_armored", (trait, damage, ctx) => {
        const target = ctx.target;
        const armor = target.armor ?? target.armorFlat ?? 0;
        if (armor > 0) {
          return Math.round(damage * (1 + (trait.bonus ?? 0.5)));
        }
        return damage;
      });
      registerDamageMod("armor_scaling_damage", (trait, damage, ctx) => {
        const target = ctx.target;
        const armorTier = target.armor;
        const TIERS = { light: 1, medium: 2, heavy: 3 };
        const armor = typeof armorTier === "string" ? TIERS[armorTier] ?? 0 : target.armorFlat ?? armorTier ?? 0;
        const scale = trait.scale ?? 1;
        if (armor > 0) {
          return Math.round(damage * (1 + armor * scale));
        }
        return damage;
      });
      registerTowerUpdate("life_on_kill", (trait, tower, ctx) => {
        if (ctx.justDiedCreeps.length === 0) return;
        const blessed = tower.traits?.find((t) => t.id === "_blessed");
        const chance = blessed?.bonus ?? trait.chance ?? 0.05;
        const range = tower.range || TILE_SIZE2 * 5;
        for (const creep of ctx.justDiedCreeps) {
          const dx = creep.x - tower.x;
          const dy = creep.y - tower.y;
          if (dx * dx + dy * dy > range * range) continue;
          if (rng() < chance) {
            tower._livesEarned = (tower._livesEarned ?? 0) + 1;
          }
        }
      });
      registerTowerUpdate("mute_mage_aura", (trait, tower, ctx) => {
        const range = tower.range || TILE_SIZE2 * 4;
        for (const creep of ctx.allCreeps) {
          if (!creep.alive || creep.reached) continue;
          const dx = creep.x - tower.x;
          const dy = creep.y - tower.y;
          if (Math.sqrt(dx * dx + dy * dy) <= range) {
            creep.statusEffects?.apply("muted", 200, 1);
          }
        }
      });
      registerTowerUpdate("leak_absorb", (trait, _tower, _ctx) => {
        if (trait._charges === void 0) {
          trait._charges = trait.maxCharges ?? 1;
          trait._rechargeTimer = 0;
        }
      });
      registerTowerUpdate("firewall_link", (trait, tower, ctx) => {
        const linkRange = (trait.linkRange ?? 8) * TILE_SIZE2;
        const dps = trait.dps ?? 15;
        const damage = dps * (ctx.delta / 1e3);
        if (!trait._partnerCol && trait._partnerCol !== 0) {
          for (const other of ctx.allTowers) {
            if (other === tower) continue;
            const otherTrait = other.traits?.find((t) => t.id === "firewall_link");
            if (!otherTrait) continue;
            if (otherTrait._partnerCol !== void 0) continue;
            const dx = other.x - tower.x;
            const dy = other.y - tower.y;
            if (Math.sqrt(dx * dx + dy * dy) <= linkRange) {
              trait._partnerCol = other.col;
              trait._partnerRow = other.row;
              trait._partnerX = other.x;
              trait._partnerY = other.y;
              otherTrait._partnerCol = tower.col;
              otherTrait._partnerRow = tower.row;
              otherTrait._partnerX = tower.x;
              otherTrait._partnerY = tower.y;
              break;
            }
          }
        }
        if (trait._partnerX === void 0) return;
        const ax = tower.x, ay = tower.y;
        const bx = trait._partnerX, by = trait._partnerY;
        const beamLen = Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2);
        if (beamLen === 0) return;
        const nx = (bx - ax) / beamLen;
        const ny = (by - ay) / beamLen;
        for (const creep of ctx.allCreeps) {
          if (!creep.alive || creep.reached) continue;
          const cx = creep.x - ax;
          const cy = creep.y - ay;
          const proj = cx * nx + cy * ny;
          if (proj < 0 || proj > beamLen) continue;
          const perpX = cx - proj * nx;
          const perpY = cy - proj * ny;
          const perpDist = Math.sqrt(perpX * perpX + perpY * perpY);
          if (perpDist <= TILE_SIZE2 * 0.6) {
            creep.takeDamage(damage);
            tower.damageDealt += damage;
            const slowFactor = trait.slowFactor ?? 0.4;
            creep.applySlow(500, slowFactor);
          }
        }
      });
      registerHitEffect("virus_spread", (trait, ctx) => {
        const dps = trait.dps ?? 10;
        const duration = trait.duration ?? 4e3;
        const spreadRange = (trait.spreadRange ?? 2) * TILE_SIZE2;
        for (const target of ctx.hitTargets) {
          target.statusEffects?.apply("virus", duration, dps);
          for (const other of ctx.allTargets) {
            if (other === target || !other.alive || other.reached) continue;
            const dx = other.x - target.x;
            const dy = other.y - target.y;
            if (Math.sqrt(dx * dx + dy * dy) <= spreadRange) {
              other.statusEffects?.apply("virus", duration * 0.7, dps * 0.7);
            }
          }
        }
      });
      registerHitEffect("hack_reverse", (trait, ctx) => {
        const duration = levelScale(trait.duration ?? 1500, ctx.towerLevel, 0.15);
        for (const target of ctx.hitTargets) {
          target.statusEffects?.apply("confused", duration, 1);
        }
      });
      registerTowerUpdate("expires_after_waves", (trait, tower, _ctx) => {
        if (trait._wavesRemaining !== void 0 && trait._wavesRemaining <= 0) {
          tower._expired = true;
        }
      });
      registerTowerUpdate("decay_per_wave", (_trait, _tower, _ctx) => {
      });
      registerTowerUpdate("gold_per_kill_range", (trait, tower, ctx) => {
        if (ctx.justDiedCreeps.length === 0) return;
        const goldPerKill = trait.goldPerKill ?? 2;
        const range = tower.range || TILE_SIZE2 * 4;
        for (const creep of ctx.justDiedCreeps) {
          const dx = creep.x - tower.x;
          const dy = creep.y - tower.y;
          if (Math.sqrt(dx * dx + dy * dy) <= range) {
            tower.goldEarned += goldPerKill;
          }
        }
      });
      registerTowerUpdate("faction_speed_aura", (trait, tower, ctx) => {
        const rateBonus = trait.ratePercent ?? 0.2;
        const range = tower.range || TILE_SIZE2 * 4;
        const faction = tower.typeDef?.faction;
        if (!faction) return;
        for (const other of ctx.allTowers) {
          if (other === tower || other.typeDef?.faction !== faction) continue;
          const dx = other.x - tower.x;
          const dy = other.y - tower.y;
          if (Math.sqrt(dx * dx + dy * dy) <= range) {
            const bonus = rateBonus * tower.level;
            setBestBuff(other, "_faction_rate_buff", bonus, { bonus }, ctx.time);
          }
        }
      });
      registerFireRateMod("_faction_rate_buff", (trait, rate, _tower) => {
        return Math.round(rate * (1 - (trait.bonus ?? 0)));
      });
      registerTowerUpdate("_faction_rate_buff", (trait, _tower, ctx) => {
        trait._ttl = (trait._ttl ?? 0) - ctx.delta;
      });
      registerTowerUpdate("spawn_swarmlings_per_wave", (_trait, _tower, _ctx) => {
      });
      function compoundMul(traits, buffId, factor) {
        if (factor <= 1) return;
        const existing = traits.find((t) => t.id === buffId);
        if (existing) {
          existing.bonus = (existing.bonus ?? 1) * factor;
          existing._ttl = 200;
        } else {
          traits.push({ id: buffId, bonus: factor, _ttl: 200 });
        }
      }
      function compoundCrit(traits, stack, multiplier) {
        if (stack <= 0) return;
        const existing = traits.find((t) => t.id === "_harmonic_crit");
        if (existing) {
          existing.chance = 1 - (1 - (existing.chance ?? 0)) * (1 - stack);
          existing.multiplier = Math.max(existing.multiplier ?? 2, multiplier);
          existing._ttl = 200;
        } else {
          traits.push({ id: "_harmonic_crit", chance: stack, multiplier, _ttl: 200 });
        }
      }
      registerTowerUpdate("damage_aura", (trait, tower, ctx) => {
        const factor = 1 + (trait.percent ?? 0.15) * tower.level;
        const range = tower.range || TILE_SIZE2 * 4;
        const r2 = range * range;
        for (const other of ctx.allTowers) {
          if (other === tower) continue;
          const dx = other.x - tower.x;
          const dy = other.y - tower.y;
          if (dx * dx + dy * dy <= r2) compoundMul(other.traits, "_harmonic_damage", factor);
        }
      });
      registerDamageMod("_harmonic_damage", (trait, damage, _ctx) => {
        return Math.round(damage * (trait.bonus ?? 1));
      });
      registerTowerUpdate("_harmonic_damage", (trait, _tower, ctx) => {
        trait._ttl = (trait._ttl ?? 0) - ctx.delta;
        if (trait._ttl <= 0) trait.bonus = 1;
      });
      registerTowerUpdate("rate_aura", (trait, tower, ctx) => {
        const factor = 1 + (trait.percent ?? 0.1) * tower.level;
        const range = tower.range || TILE_SIZE2 * 4;
        const r2 = range * range;
        for (const other of ctx.allTowers) {
          if (other === tower) continue;
          const dx = other.x - tower.x;
          const dy = other.y - tower.y;
          if (dx * dx + dy * dy <= r2) compoundMul(other.traits, "_harmonic_rate", factor);
        }
      });
      var _HARMONIC_RATE_FLOOR_MS = 50;
      registerFireRateMod("_harmonic_rate", (trait, rate, _tower) => {
        const mult = trait.bonus ?? 1;
        if (mult <= 1) return rate;
        return Math.max(_HARMONIC_RATE_FLOOR_MS, Math.round(rate / mult));
      });
      registerTowerUpdate("_harmonic_rate", (trait, _tower, ctx) => {
        trait._ttl = (trait._ttl ?? 0) - ctx.delta;
        if (trait._ttl <= 0) trait.bonus = 1;
      });
      registerTowerUpdate("range_aura", (trait, tower, ctx) => {
        const factor = 1 + (trait.percent ?? 0.1) * tower.level;
        const range = tower.range || TILE_SIZE2 * 4;
        const r2 = range * range;
        for (const other of ctx.allTowers) {
          if (other === tower) continue;
          const dx = other.x - tower.x;
          const dy = other.y - tower.y;
          if (dx * dx + dy * dy <= r2) compoundMul(other.traits, "_harmonic_range", factor);
        }
      });
      registerTowerUpdate("_harmonic_range", (trait, _tower, ctx) => {
        trait._ttl = (trait._ttl ?? 0) - ctx.delta;
        if (trait._ttl <= 0) trait.bonus = 1;
      });
      registerTowerUpdate("crit_aura", (trait, tower, ctx) => {
        const stack = (trait.chance ?? 0.2) * tower.level;
        const multiplier = trait.multiplier ?? 2;
        const range = tower.range || TILE_SIZE2 * 4;
        const r2 = range * range;
        for (const other of ctx.allTowers) {
          if (other === tower) continue;
          const dx = other.x - tower.x;
          const dy = other.y - tower.y;
          if (dx * dx + dy * dy <= r2) compoundCrit(other.traits, stack, multiplier);
        }
      });
      registerDamageMod("_harmonic_crit", (trait, damage, _ctx) => {
        if (rng() < (trait.chance ?? 0.15)) {
          return Math.round(damage * (trait.multiplier ?? 2));
        }
        return damage;
      });
      registerTowerUpdate("_harmonic_crit", (trait, _tower, ctx) => {
        trait._ttl = (trait._ttl ?? 0) - ctx.delta;
        if (trait._ttl <= 0) {
          trait.chance = 0;
          trait.bonus = 0;
        }
      });
      registerTowerUpdate("conduit_link", (trait, tower, ctx) => {
        const auraTraitIds = ["damage_aura", "rate_aura", "range_aura", "crit_aura"];
        const auraColors = {
          damage_aura: 16729156,
          rate_aura: 4521796,
          range_aura: 4491519,
          crit_aura: 16729343
        };
        const manualLinks = trait._manualLinks ?? [];
        const linkedTowers = [];
        for (const link of manualLinks) {
          const linkedTower = ctx.allTowers.find((t) => t.col === link.col && t.row === link.row);
          if (linkedTower) linkedTowers.push(linkedTower);
        }
        trait._links = linkedTowers.map((t) => {
          const auraTrait = t.traits.find((tr) => auraTraitIds.includes(tr.id));
          return { x: t.x, y: t.y, color: auraColors[auraTrait?.id] ?? 16763972 };
        });
        for (const lt of linkedTowers) {
          addOrRefreshTrait(lt.traits, { id: "conduit_linked", srcX: tower.x, srcY: tower.y });
        }
        for (let i = 0; i < linkedTowers.length; i++) {
          for (let j = i + 1; j < linkedTowers.length; j++) {
            const towerA = linkedTowers[i];
            const towerB = linkedTowers[j];
            for (const traitA of towerA.traits) {
              if (!auraTraitIds.includes(traitA.id)) continue;
              shareAura(traitA, towerB, ctx, tower.level);
            }
            for (const traitB of towerB.traits) {
              if (!auraTraitIds.includes(traitB.id)) continue;
              shareAura(traitB, towerA, ctx, tower.level);
            }
          }
        }
        const linkedSet = new Set(linkedTowers);
        const reEmitEffectiveness = 0.5;
        const harmonicBuffIds = {
          "_harmonic_damage": "damage_aura",
          "_harmonic_rate": "rate_aura",
          "_harmonic_range": "range_aura",
          "_harmonic_crit": "crit_aura"
        };
        for (const lt of linkedTowers) {
          const ltRange = lt.range || TILE_SIZE2 * 4;
          for (const buff of lt.traits) {
            if (!harmonicBuffIds[buff.id]) continue;
            const sourceAuraId = harmonicBuffIds[buff.id];
            if (lt.traits.some((t) => t.id === sourceAuraId)) continue;
            const ltR2 = ltRange * ltRange;
            for (const other of ctx.allTowers) {
              if (other === lt || linkedSet.has(other) || other === tower) continue;
              const dx = other.x - lt.x;
              const dy = other.y - lt.y;
              if (dx * dx + dy * dy > ltR2) continue;
              if (buff.id === "_harmonic_damage" || buff.id === "_harmonic_rate" || buff.id === "_harmonic_range") {
                compoundMul(
                  other.traits,
                  buff.id,
                  1 + ((buff.bonus ?? 1) - 1) * reEmitEffectiveness
                );
              } else if (buff.id === "_harmonic_crit") {
                compoundCrit(
                  other.traits,
                  (buff.chance ?? 0) * reEmitEffectiveness,
                  buff.multiplier ?? 2
                );
              }
            }
          }
        }
      });
      function shareAura(auraTrait, fromTower, ctx, conduitLevel) {
        const range = fromTower.range || TILE_SIZE2 * 4;
        const r2 = range * range;
        const effectiveness = 0.7;
        for (const other of ctx.allTowers) {
          if (other === fromTower) continue;
          const dx = other.x - fromTower.x;
          const dy = other.y - fromTower.y;
          if (dx * dx + dy * dy > r2) continue;
          switch (auraTrait.id) {
            case "damage_aura":
              compoundMul(
                other.traits,
                "_harmonic_damage",
                1 + (auraTrait.percent ?? 0.15) * conduitLevel * effectiveness
              );
              break;
            case "rate_aura":
              compoundMul(
                other.traits,
                "_harmonic_rate",
                1 + (auraTrait.percent ?? 0.1) * conduitLevel * effectiveness
              );
              break;
            case "range_aura":
              compoundMul(
                other.traits,
                "_harmonic_range",
                1 + (auraTrait.percent ?? 0.1) * conduitLevel * effectiveness
              );
              break;
            case "crit_aura":
              compoundCrit(
                other.traits,
                (auraTrait.chance ?? 0.2) * conduitLevel * effectiveness,
                auraTrait.multiplier ?? 2
              );
              break;
          }
        }
      }
      registerOverlayDraw("conduit_linked", (trait, tower, graphics) => {
        const s = TILE_SIZE2 * 0.35;
        graphics.lineStyle(1, 16763972, 0.5);
        graphics.strokeCircle(tower.x, tower.y, s + 5);
        const srcX = trait.srcX;
        const srcY = trait.srcY;
        if (typeof srcX === "number" && typeof srcY === "number") {
          graphics.lineStyle(1, 16763972, 0.15);
          graphics.lineBetween(tower.x, tower.y, srcX, srcY);
        }
      });
      registerTowerUpdate("acolyte_blessing_aura", (trait, tower, ctx) => {
        const range = tower.range || TILE_SIZE2 * 4;
        const blessingChance = trait.blessingChance ?? 0.075;
        for (const other of ctx.allTowers) {
          if (other === tower) continue;
          if (other.typeId !== "celestial_acolyte" && other.typeDef?.id !== "celestial_acolyte") continue;
          const dx = other.x - tower.x;
          const dy = other.y - tower.y;
          if (Math.sqrt(dx * dx + dy * dy) > range) continue;
          accumulateBuff(other, "_blessed", blessingChance, ctx.time);
        }
      });
      registerDamageMod("life_execute", (trait, damage, ctx) => {
        const tower = ctx.tower;
        if (tower && tower._lifeSpendingEnabled === false) return damage;
        const getLives = ctx.getLives;
        const spendLives = ctx.spendLives;
        if (!getLives || !spendLives) return damage;
        const lives = getLives();
        const threshold = trait.threshold ?? 50;
        if (lives <= threshold) return damage;
        const cost = trait.cost ?? 10;
        const baseChance = trait.baseChance ?? 0.05;
        const maxChance = trait.maxChance ?? 0.2;
        const scaleLives = trait.scaleLives ?? 110;
        const t = Math.min(1, (lives - threshold) / Math.max(1, scaleLives - threshold));
        const chance = baseChance + (maxChance - baseChance) * t;
        if (rng() < chance) {
          spendLives(cost);
          if (ctx.target.isBoss) return damage * 4;
          return 99999;
        }
        return damage;
      });
      registerDamageMod("life_scaling", (trait, damage, ctx) => {
        const getLives = ctx.getLives;
        if (!getLives) return damage;
        const lives = getLives();
        const damagePerLife = trait.damagePerLife ?? 0.5;
        return damage + lives * damagePerLife;
      });
      registerFireRateMod("life_scaling", (trait, rate, tower) => {
        const getLives = tower?._getLives;
        if (!getLives) return rate;
        const lives = getLives();
        const fireRatePerLife = trait.fireRatePerLife ?? 5;
        const minFireRate = trait.minFireRate ?? 400;
        return Math.max(minFireRate, rate - lives * fireRatePerLife);
      });
    }
  });

  // src/systems/suppression/ActiveSuppressionManager.ts
  function isAnyPylonMutedNow() {
    return _active?.hasAnyMutedPylonNow() ?? false;
  }
  var _active;
  var init_ActiveSuppressionManager = __esm({
    "src/systems/suppression/ActiveSuppressionManager.ts"() {
      "use strict";
      _active = null;
    }
  });

  // src/systems/traits/CreepTraitHandlers.ts
  var require_CreepTraitHandlers = __commonJS({
    "src/systems/traits/CreepTraitHandlers.ts"() {
      "use strict";
      init_config();
      init_Rng();
      init_Trait();
      init_ActiveSuppressionManager();
      registerCreepDamage("shield", (trait, damage) => {
        if (!trait._active || trait._shieldHp <= 0) return damage;
        trait._shieldHp -= damage;
        if (trait._shieldHp <= 0) {
          trait._active = false;
          const overflow = -trait._shieldHp;
          trait._shieldHp = 0;
          return overflow;
        }
        return 0;
      });
      registerCreepDamage("damage_cap_shield", (trait, damage) => {
        if ((trait._hits ?? 0) >= (trait.shieldHits ?? 15)) return damage;
        trait._hits = (trait._hits ?? 0) + 1;
        return 1;
      });
      registerCreepDraw("damage_cap_shield", (trait, creep, g) => {
        const remaining = (trait.shieldHits ?? 15) - (trait._hits ?? 0);
        if (remaining <= 0) return;
        const baseSize = creep.isBoss ? TILE_SIZE2 * 0.45 : TILE_SIZE2 * 0.3;
        const drawSize = baseSize * creep.size;
        g.lineStyle(2, 4500223, 0.6);
        g.strokeCircle(creep.x, creep.y, drawSize + 4);
        g.strokeCircle(creep.x, creep.y, drawSize + 6);
      });
      registerCreepDamage("evasion", (trait, damage) => {
        const chance = trait.chance ?? 0.25;
        if (rng() < chance) {
          return 0;
        }
        return damage;
      });
      function applyHeal(target, amount) {
        const isHealer = target.traits?.some((t) => t.id === "heal_aura" || t.id === "flat_heal_aura");
        if (isHealer) amount = Math.floor(amount * 0.1);
        const sources = target._healSourcesThisTick ?? 0;
        const multiplier = Math.pow(0.5, sources);
        const finalHeal = Math.max(1, Math.floor(amount * multiplier));
        target.hp = Math.min(target.maxHp, target.hp + finalHeal);
        target._healSourcesThisTick = sources + 1;
      }
      registerCreepUpdate("heal_aura", (trait, creep, delta, nearbyCreeps) => {
        trait._cooldown = (trait._cooldown ?? 0) - delta;
        if (trait._cooldown > 0) return;
        trait._cooldown = trait.cooldown ?? 1e3;
        const healRange = (trait.range ?? 3) * TILE_SIZE2;
        const healPercent = trait.healPercent ?? 0.03;
        for (const other of nearbyCreeps) {
          if (other === creep || !other.alive || other.reached) continue;
          const dx = other.x - creep.x;
          const dy = other.y - creep.y;
          if (Math.sqrt(dx * dx + dy * dy) <= healRange) {
            applyHeal(other, Math.floor(other.maxHp * healPercent));
          }
        }
      });
      registerCreepUpdate("flat_heal_aura", (trait, creep, delta, nearbyCreeps) => {
        trait._cooldown = (trait._cooldown ?? 0) - delta;
        if (trait._cooldown > 0) return;
        trait._cooldown = trait.cooldown ?? 800;
        const range = (trait.range ?? 4) * TILE_SIZE2;
        const healAmount = trait.healAmount ?? 15;
        for (const other of nearbyCreeps) {
          if (other === creep || !other.alive || other.reached) continue;
          const dx = other.x - creep.x;
          const dy = other.y - creep.y;
          if (Math.sqrt(dx * dx + dy * dy) <= range) {
            applyHeal(other, healAmount);
          }
        }
      });
      registerCreepDraw("flat_heal_aura", (trait, creep, g) => {
        const range = (trait.range ?? 4) * TILE_SIZE2;
        g.lineStyle(1, 4521898, 0.25);
        g.strokeCircle(creep.x, creep.y, range);
      });
      registerCreepUpdate("armor_aura", (trait, creep, _delta, nearbyCreeps) => {
        const range = (trait.range ?? 4) * TILE_SIZE2;
        const TIERS = ["light", "medium", "heavy"];
        for (const other of nearbyCreeps) {
          if (other === creep || !other.alive || other.reached) continue;
          const dx = other.x - creep.x;
          const dy = other.y - creep.y;
          if (Math.sqrt(dx * dx + dy * dy) <= range) {
            const baseIdx = TIERS.indexOf(other.baseArmor);
            const boosted = TIERS[Math.min(TIERS.length - 1, baseIdx + 1)];
            if (TIERS.indexOf(other.armor) < TIERS.indexOf(boosted)) {
              other.armor = boosted;
            }
          }
        }
      });
      registerCreepUpdate("speed_aura", (trait, creep, _delta, nearbyCreeps) => {
        const range = (trait.range ?? 4) * TILE_SIZE2;
        const speedBonus = trait.speedBonus ?? 0.3;
        for (const other of nearbyCreeps) {
          if (other === creep || !other.alive || other.reached) continue;
          const dx = other.x - creep.x;
          const dy = other.y - creep.y;
          if (Math.sqrt(dx * dx + dy * dy) <= range) {
            other.speed = Math.max(other.speed, other.baseSpeed * (1 + speedBonus));
          }
        }
      });
      registerCreepUpdate("evasion_aura", (trait, creep, _delta, nearbyCreeps) => {
        const range = (trait.range ?? 4) * TILE_SIZE2;
        const bonus = trait.evasionBonus ?? 0.15;
        for (const other of nearbyCreeps) {
          if (other === creep || !other.alive || other.reached) continue;
          const dx = other.x - creep.x;
          const dy = other.y - creep.y;
          if (Math.sqrt(dx * dx + dy * dy) <= range) {
            other.statusEffects?.apply("evasion_buff", 200, bonus);
          }
        }
      });
      registerCreepUpdate("regeneration", (trait, creep, delta, _nearbyCreeps) => {
        if (!creep.alive || creep.reached) return;
        if (creep.hp >= creep.maxHp) return;
        const regenPercent = trait.regenPercent ?? 0.02;
        const healAmount = creep.maxHp * regenPercent * (delta / 1e3);
        creep.hp = Math.min(creep.maxHp, creep.hp + healAmount);
      });
      registerCreepDraw("regeneration", (_trait, creep, g) => {
        if (creep.hp >= creep.maxHp) return;
        const pulse = 0.3 + 0.2 * Math.sin(Date.now() * 5e-3);
        const baseSize = creep.isBoss ? TILE_SIZE2 * 0.45 : TILE_SIZE2 * 0.3;
        g.lineStyle(2, 4521796, pulse);
        g.strokeCircle(creep.x, creep.y, baseSize * creep.size + 3);
      });
      registerCreepDraw("shield", (trait, creep, g) => {
        if (!trait._active) return;
        const baseSize = creep.isBoss ? TILE_SIZE2 * 0.45 : TILE_SIZE2 * 0.3;
        const drawSize = baseSize * creep.size;
        g.lineStyle(2, 4491519, 0.5);
        g.strokeCircle(creep.x, creep.y, drawSize + 3);
      });
      registerCreepDraw("heal_aura", (trait, creep, g) => {
        const healRange = (trait.range ?? 3) * TILE_SIZE2;
        g.lineStyle(1, 4521864, 0.3);
        g.strokeCircle(creep.x, creep.y, healRange);
      });
      registerCreepDraw("armor_aura", (trait, creep, g) => {
        const range = (trait.range ?? 4) * TILE_SIZE2;
        g.lineStyle(1, 8947916, 0.2);
        g.strokeCircle(creep.x, creep.y, range);
      });
      registerCreepDraw("speed_aura", (trait, creep, g) => {
        const range = (trait.range ?? 4) * TILE_SIZE2;
        g.lineStyle(1, 16763972, 0.2);
        g.strokeCircle(creep.x, creep.y, range);
      });
      registerCreepDraw("evasion_aura", (trait, creep, g) => {
        const range = (trait.range ?? 4) * TILE_SIZE2;
        g.lineStyle(1, 11189213, 0.2);
        g.strokeCircle(creep.x, creep.y, range);
      });
      registerCreepDraw("evasion", (_trait, creep, g) => {
        if ((Math.floor(Date.now() / 100) + Math.floor(creep.x) + Math.floor(creep.y)) % 10 < 3) {
          const baseSize = creep.isBoss ? TILE_SIZE2 * 0.45 : TILE_SIZE2 * 0.3;
          g.lineStyle(1, 6737151, 0.3);
          g.strokeCircle(creep.x, creep.y, baseSize * creep.size + 2);
        }
      });
      registerCreepDamage("mech_pylon_vent_armor", (trait, damage) => {
        if (!isAnyPylonMutedNow()) return damage;
        const mult = typeof trait.bonusDamageMult === "number" ? trait.bonusDamageMult : 1.6;
        return damage * mult;
      });
    }
  });

  // ml/desktop/replay_sim_entry.ts
  init_Pathfinding();
  init_Grid();

  // src/systems/EventBus.ts
  var EventBus = class {
    constructor() {
      this.listeners = /* @__PURE__ */ new Map();
    }
    on(event, callback) {
      if (!this.listeners.has(event)) {
        this.listeners.set(event, []);
      }
      this.listeners.get(event).push(callback);
    }
    off(event, callback) {
      const cbs = this.listeners.get(event);
      if (!cbs) return;
      const idx = cbs.indexOf(callback);
      if (idx !== -1) cbs.splice(idx, 1);
    }
    emit(event, ...args) {
      const cbs = this.listeners.get(event);
      if (!cbs) return;
      for (const cb of cbs) {
        cb(...args);
      }
    }
    clear() {
      this.listeners.clear();
    }
  };

  // src/systems/EconomyManager.ts
  init_config();

  // src/systems/ResourceManager.ts
  var ResourceManager = class {
    constructor(events) {
      this.resources = /* @__PURE__ */ new Map();
      this.events = events;
    }
    /** Register a resource. Must be called before using it. */
    addResource(def2) {
      this.resources.set(def2.id, {
        current: def2.startingAmount,
        tickRate: def2.tickRate,
        waveIncome: 0,
        totalEarned: def2.startingAmount,
        totalSpent: 0
      });
    }
    /** Get current amount of a resource */
    get(id) {
      return this.resources.get(id)?.current ?? 0;
    }
    /** Can afford a cost in a specific resource? */
    canAfford(id, cost) {
      return this.get(id) >= cost;
    }
    /** Spend a resource. Returns false if insufficient. */
    spend(id, cost) {
      const r = this.resources.get(id);
      if (!r || r.current < cost) return false;
      r.current -= cost;
      r.totalSpent += cost;
      this.events.emit("goldChanged", -cost, r.current);
      return true;
    }
    /** Add to a resource */
    add(id, amount) {
      const r = this.resources.get(id);
      if (!r) return;
      r.current += amount;
      r.totalEarned += amount;
      this.events.emit("goldChanged", amount, r.current);
    }
    /** Set the per-wave income bonus for a resource */
    setWaveIncome(id, amount) {
      const r = this.resources.get(id);
      if (r) r.waveIncome = amount;
    }
    /** Add to per-wave income */
    addWaveIncome(id, amount) {
      const r = this.resources.get(id);
      if (r) r.waveIncome += amount;
    }
    /** Collect per-wave income. Returns amount collected. */
    collectWaveIncome(id) {
      const r = this.resources.get(id);
      if (!r) return 0;
      const income = r.waveIncome;
      r.current += income;
      r.totalEarned += income;
      return income;
    }
    /** Real-time tick — call each frame with delta in ms */
    tick(delta) {
      for (const [id, r] of this.resources) {
        if (r.tickRate > 0) {
          const amount = r.tickRate * (delta / 1e3);
          r.current += amount;
          r.totalEarned += amount;
        }
      }
    }
    /** Get state for UI display */
    getState(id) {
      return this.resources.get(id);
    }
    /** Get all resource IDs */
    getResourceIds() {
      return [...this.resources.keys()];
    }
    /** Check if a resource exists */
    has(id) {
      return this.resources.has(id);
    }
  };

  // src/systems/EconomyManager.ts
  var EconomyManager = class {
    constructor(events, resourceMgr) {
      this.currentWave = 0;
      this.events = events;
      this.resources = resourceMgr ?? new ResourceManager(events);
      if (!this.resources.has("gold")) {
        this.resources.addResource({
          id: "gold",
          name: "Gold",
          startingAmount: STARTING_GOLD,
          tickRate: 0,
          color: "#ffdd44"
        });
      }
      events.on("creepKilled", (_id, reward) => {
        this.addGold(reward);
        void Promise.resolve().then(() => (init_LiveCapture(), LiveCapture_exports)).then((m) => {
          if (m.isCaptureEnabled()) m.recordIncome("kills", reward);
        }).catch(() => {
        });
      });
      events.on("waveCleared", () => {
        this.addGold(WAVE_CLEAR_BONUS);
        void Promise.resolve().then(() => (init_LiveCapture(), LiveCapture_exports)).then((m) => {
          if (m.isCaptureEnabled()) m.recordIncome("waveBonus", WAVE_CLEAR_BONUS);
        }).catch(() => {
        });
      });
      events.on("waveStarted", (waveNum) => {
        this.currentWave = waveNum;
      });
    }
    get gold() {
      return this.resources.get("gold");
    }
    set gold(v) {
      const r = this.resources.getState("gold");
      if (r) r.current = v;
    }
    canAfford(cost) {
      return this.resources.canAfford("gold", cost);
    }
    spend(cost) {
      return this.resources.spend("gold", cost);
    }
    addGold(amount) {
      this.resources.add("gold", amount);
    }
    getKillGold() {
      return Math.max(2, KILL_GOLD - Math.floor(this.currentWave / 10));
    }
  };

  // src/systems/IncomeManager.ts
  var IncomeManager = class {
    constructor(events) {
      this.baseIncome = 10;
      this.sendBonus = 0;
      this.frontierIncome = 0;
      this.totalIncomeEarned = 0;
      /** Cumulative gold paid out via send bonuses across the whole
       *  match. Used by GameOverScreen for the Sends ROI stat. */
      this.totalSendsRealized = 0;
      /** Cumulative gold paid out via frontier steady income across
       *  the whole match. Mirror of totalSendsRealized for the
       *  Frontier ROI breakdown. */
      this.totalFrontierRealized = 0;
      this.events = events;
    }
    getWaveIncome() {
      return this.baseIncome + this.sendBonus + this.frontierIncome;
    }
    addSendBonus(amount) {
      this.sendBonus += amount;
    }
    addFrontierIncome(amount) {
      this.frontierIncome += amount;
    }
    collectWaveIncome() {
      const income = this.getWaveIncome();
      this.totalIncomeEarned += income;
      this.totalSendsRealized += this.sendBonus;
      this.totalFrontierRealized += this.frontierIncome;
      return income;
    }
    getBreakdown() {
      return {
        base: this.baseIncome,
        sends: this.sendBonus,
        frontier: this.frontierIncome,
        total: this.getWaveIncome()
      };
    }
  };

  // src/systems/StatsTracker.ts
  var StatsTracker = class {
    constructor() {
      this.stats = {
        towerStats: {},
        frontierSpent: 0,
        frontierEarned: 0,
        sendsSpent: 0,
        sendsIncome: 0,
        sendsEarned: 0,
        totalGoldEarned: 0,
        totalGoldSpent: 0,
        creepsKilled: 0,
        creepsLeaked: 0,
        wavesCompleted: 0,
        gameTimeMs: 0,
        essenceGenerated: 0,
        essenceSpentOnSends: 0,
        essenceGeneratorsBuilt: 0
      };
    }
    getOrCreate(typeId) {
      if (!this.stats.towerStats[typeId]) {
        this.stats.towerStats[typeId] = {
          totalDamage: 0,
          totalShots: 0,
          totalKills: 0,
          totalGoldEarned: 0,
          timeAlive: 0,
          count: 0,
          directDamage: 0,
          splashDamage: 0,
          burnDamage: 0,
          poisonDamage: 0,
          chainDamage: 0,
          pierceDamage: 0,
          auraDamage: 0
        };
      }
      return this.stats.towerStats[typeId];
    }
    recordTowerBuilt(typeId) {
      this.getOrCreate(typeId).count++;
    }
    recordDamage(typeId, amount) {
      this.getOrCreate(typeId).totalDamage += amount;
    }
    recordHitStats(typeId, hitStats) {
      const s = this.getOrCreate(typeId);
      for (const key of Object.keys(hitStats)) {
        if (hitStats[key] > 0) {
          s[key] = (s[key] ?? 0) + hitStats[key];
        }
      }
    }
    recordShot(typeId) {
      this.getOrCreate(typeId).totalShots++;
    }
    recordTowerGold(typeId, amount) {
      this.getOrCreate(typeId).totalGoldEarned += amount;
    }
    recordKill() {
      this.stats.creepsKilled++;
    }
    recordLeak() {
      this.stats.creepsLeaked++;
    }
    recordGoldEarned(amount) {
      this.stats.totalGoldEarned += amount;
    }
    recordGoldSpent(amount) {
      this.stats.totalGoldSpent += amount;
    }
    recordFrontierSpent(amount) {
      this.stats.frontierSpent += amount;
    }
    recordFrontierEarned(amount) {
      this.stats.frontierEarned += amount;
    }
    recordSendSpent(amount) {
      this.stats.sendsSpent += amount;
    }
    recordSendIncome(amount) {
      this.stats.sendsIncome += amount;
    }
    /** Record gold paid out from send bonuses on a single wave clear.
     *  Accumulates into `sendsEarned` for the Sends ROI computation. */
    recordSendsEarned(amount) {
      this.stats.sendsEarned += amount;
    }
    recordEssenceGenerated(amount) {
      this.stats.essenceGenerated += amount;
    }
    recordEssenceSpentOnSend(amount) {
      this.stats.essenceSpentOnSends += amount;
    }
    recordEssenceGeneratorBuilt() {
      this.stats.essenceGeneratorsBuilt++;
    }
    recordWaveCompleted() {
      this.stats.wavesCompleted++;
    }
    updateTime(delta) {
      this.stats.gameTimeMs += delta;
    }
    /** Calculate average DPS per tower type */
    getAverageDPS(typeId) {
      const s = this.stats.towerStats[typeId];
      if (!s || s.timeAlive === 0) return 0;
      return Math.round(s.totalDamage / (s.timeAlive / 1e3));
    }
  };

  // src/systems/SpawnManager.ts
  init_config();

  // src/entities/Creep.ts
  init_config();
  init_Pathfinding();

  // src/systems/StatusEffects.ts
  var StatusEffectManager = class {
    constructor() {
      this.effects = [];
      this._dotAccum = 0;
    }
    apply(type, duration, magnitude) {
      const existing = this.effects.find((e) => e.type === type);
      if (existing) {
        existing.duration = Math.max(existing.duration, duration);
        existing.magnitude = magnitude;
      } else {
        this.effects.push({ type, duration, magnitude });
      }
    }
    /** Apply stacking effects — magnitude adds instead of replaces */
    applyStacking(type, duration, magnitude) {
      const existing = this.effects.find((e) => e.type === type);
      if (existing) {
        existing.duration = Math.max(existing.duration, duration);
        existing.magnitude += magnitude;
      } else {
        this.effects.push({ type, duration, magnitude });
      }
    }
    update(delta) {
      for (let i = this.effects.length - 1; i >= 0; i--) {
        this.effects[i].duration -= delta;
        if (this.effects[i].duration <= 0) {
          this.effects.splice(i, 1);
        }
      }
    }
    getSlowFactor() {
      let factor = 1;
      for (const e of this.effects) {
        if (e.type === "slow") factor = Math.min(factor, e.magnitude);
      }
      if (this.has("root")) factor = 0;
      return factor;
    }
    /** Total DoT damage this frame (flat burn + % poison + virus) */
    getDotDamage(delta, maxHp) {
      for (const e of this.effects) {
        if (e.type === "burn" || e.type === "virus") {
          this._dotAccum += e.magnitude * (delta / 1e3);
        } else if (e.type === "poison") {
          this._dotAccum += maxHp * e.magnitude * (delta / 1e3);
        }
      }
      const dmg = Math.floor(this._dotAccum);
      this._dotAccum -= dmg;
      return dmg;
    }
    /** Is this creep confused (walking backward)? */
    isConfused() {
      return this.has("confused");
    }
    /** Are this creep's abilities muted? */
    isMuted() {
      return this.has("muted");
    }
    /** Number of armor tiers to reduce (heavy→medium→light) */
    getArmorShred() {
      let shred = 0;
      for (const e of this.effects) {
        if (e.type === "armor_shred") shred += e.magnitude;
      }
      return Math.floor(shred);
    }
    /** Incoming damage multiplier (1.0 = normal, 1.3 = +30%) */
    getDamageAmp() {
      let amp = 1;
      for (const e of this.effects) {
        if (e.type === "damage_amp") amp += e.magnitude;
      }
      return amp;
    }
    /** Get evasion chance from evasion_buff status (applied by mage aura) */
    getEvasionChance() {
      let chance = 0;
      for (const e of this.effects) {
        if (e.type === "evasion_buff") chance += e.magnitude;
      }
      return Math.min(0.5, chance);
    }
    has(type) {
      return this.effects.some((e) => e.type === type);
    }
  };

  // src/data/CreepTypes.ts
  function defaultDifficulty(hints) {
    return {
      hpMult: hints.toughness,
      speedMult: hints.speed,
      countMult: hints.count,
      goldMult: hints.goldMult,
      extraTraits: []
    };
  }
  var CREEP_TYPES = {
    // === Core types ===
    standard: {
      id: "standard",
      name: "Standard",
      description: "Balanced. No surprises.",
      hpMultiplier: 1,
      speedMultiplier: 1,
      armor: "medium",
      color: 16729156,
      size: 1,
      count: 1,
      traits: [],
      spawnBehavior: "normal",
      applyDifficulty: defaultDifficulty
    },
    fast: {
      id: "fast",
      name: "Fast",
      description: "Double speed, half HP. Rushes through.",
      hpMultiplier: 0.5,
      speedMultiplier: 2,
      armor: "light",
      color: 16755234,
      size: 0.8,
      count: 1,
      traits: [],
      spawnBehavior: "normal",
      applyDifficulty(hints) {
        return {
          hpMult: hints.toughness * 0.8,
          // fast creeps don't gain as much HP
          speedMult: hints.speed * 1.1,
          // but get even faster
          countMult: hints.count,
          goldMult: hints.goldMult,
          extraTraits: []
        };
      }
    },
    armored: {
      id: "armored",
      name: "Armored",
      description: "Heavy armor, slow, tanky. Resists physical.",
      hpMultiplier: 2.5,
      speedMultiplier: 0.7,
      armor: "heavy",
      color: 8947848,
      size: 1.2,
      count: 1,
      traits: [],
      spawnBehavior: "normal",
      applyDifficulty(hints) {
        return {
          hpMult: hints.toughness * 1.3,
          // armored absorbs toughness modifier more
          speedMult: hints.speed * 0.9,
          // barely speeds up
          countMult: Math.max(1, hints.count * 0.6),
          // fewer extras — each one is a problem
          goldMult: hints.goldMult,
          extraTraits: hints.toughness >= 3 ? [{ id: "regeneration", regenPercent: 0.01 }] : []
        };
      }
    },
    swarm: {
      id: "swarm",
      name: "Swarm",
      description: "Tiny but many. Spawns in groups of 3.",
      hpMultiplier: 0.3,
      speedMultiplier: 1.2,
      armor: "light",
      color: 11206468,
      size: 0.6,
      count: 3,
      traits: [],
      spawnBehavior: "normal",
      applyDifficulty(hints) {
        return {
          hpMult: hints.toughness,
          speedMult: hints.speed,
          countMult: hints.count * 1.5,
          // swarms get proportionally more extras
          goldMult: hints.goldMult * 0.8,
          // less gold per unit in swarms
          extraTraits: []
        };
      }
    },
    healer: {
      id: "healer",
      name: "Healer",
      description: "Heals nearby creeps 3%/s. Priority target.",
      hpMultiplier: 1.2,
      speedMultiplier: 0.9,
      armor: "medium",
      color: 4521864,
      size: 1,
      count: 1,
      traits: [{ id: "heal_aura", range: 3, healPercent: 0.03, cooldown: 1e3 }],
      spawnBehavior: "normal",
      applyDifficulty(hints) {
        return {
          hpMult: hints.toughness * 1.1,
          speedMult: hints.speed,
          countMult: Math.max(1, hints.count * 0.5),
          // healers are rare
          goldMult: hints.goldMult,
          extraTraits: []
        };
      }
    },
    boss: {
      id: "boss",
      name: "Boss",
      description: "Massive HP, shield, heavy armor.",
      hpMultiplier: 10,
      speedMultiplier: 0.6,
      armor: "heavy",
      color: 16720418,
      size: 1.5,
      count: 1,
      traits: [{ id: "shield", hpPercent: 0.3 }],
      spawnBehavior: "normal",
      applyDifficulty(hints) {
        return {
          hpMult: hints.toughness * 1.5,
          // bosses scale extra hard
          speedMult: hints.speed * 0.95,
          countMult: 1,
          // always exactly 1 boss
          goldMult: hints.goldMult,
          extraTraits: [
            ...hints.toughness >= 1.5 ? [{ id: "shield", hpPercent: 0.5 }] : [],
            ...hints.toughness >= 2 ? [{ id: "regeneration", regenPercent: 0.01 }] : [],
            ...hints.toughness >= 3 ? [{ id: "damage_cap_shield", shieldHits: 40 }] : []
          ]
        };
      }
    },
    // === New types ===
    group: {
      id: "group",
      name: "Group",
      description: "Arrives in tight clusters. Hard to pick off individually.",
      hpMultiplier: 0.8,
      speedMultiplier: 1,
      armor: "medium",
      color: 14518340,
      size: 0.9,
      count: 1,
      traits: [],
      spawnBehavior: "group",
      // SpawnManager handles burst spawning
      applyDifficulty: defaultDifficulty
    },
    splitter: {
      id: "splitter",
      name: "Splitter",
      description: "Splits into 2 smaller creeps on death.",
      hpMultiplier: 1.8,
      speedMultiplier: 0.8,
      armor: "medium",
      color: 13386956,
      size: 1.3,
      count: 1,
      traits: [{ id: "split_on_death", splitCount: 2, splitType: "splitter_child" }],
      spawnBehavior: "normal",
      applyDifficulty(hints) {
        return {
          hpMult: hints.toughness * 1.2,
          speedMult: hints.speed,
          countMult: Math.max(1, hints.count * 0.7),
          // fewer but each is a problem
          goldMult: hints.goldMult,
          extraTraits: hints.toughness >= 1.5 ? [{ id: "split_on_death", splitCount: 3, splitType: "splitter_child" }] : []
        };
      }
    },
    splitter_child: {
      id: "splitter_child",
      name: "Splitling",
      description: "Fragment of a splitter.",
      hpMultiplier: 0.4,
      speedMultiplier: 1.3,
      armor: "light",
      color: 15623918,
      size: 0.6,
      count: 1,
      traits: [],
      spawnBehavior: "normal",
      applyDifficulty: defaultDifficulty
    },
    mage_armor: {
      id: "mage_armor",
      name: "Iron Mage",
      description: "Aura: nearby creeps gain +1 armor tier.",
      hpMultiplier: 1,
      speedMultiplier: 0.85,
      armor: "medium",
      color: 8947916,
      size: 1.1,
      count: 1,
      traits: [{ id: "armor_aura", range: 4 }],
      spawnBehavior: "normal",
      applyDifficulty(hints) {
        return {
          hpMult: hints.toughness,
          speedMult: hints.speed,
          countMult: 1,
          // always exactly 1 per wave
          goldMult: hints.goldMult,
          extraTraits: []
        };
      }
    },
    mage_speed: {
      id: "mage_speed",
      name: "Haste Mage",
      description: "Aura: nearby creeps move 30% faster.",
      hpMultiplier: 0.9,
      speedMultiplier: 0.8,
      armor: "light",
      color: 16763972,
      size: 1.1,
      count: 1,
      traits: [{ id: "speed_aura", range: 4, speedBonus: 0.3 }],
      spawnBehavior: "normal",
      applyDifficulty(hints) {
        return {
          hpMult: hints.toughness,
          speedMult: hints.speed,
          countMult: 1,
          goldMult: hints.goldMult,
          extraTraits: []
        };
      }
    },
    mage_evasion: {
      id: "mage_evasion",
      name: "Mist Mage",
      description: "Aura: nearby creeps gain 15% evasion.",
      hpMultiplier: 0.8,
      speedMultiplier: 0.9,
      armor: "light",
      color: 11189213,
      size: 1.1,
      count: 1,
      traits: [{ id: "evasion_aura", range: 4, evasionBonus: 0.15 }],
      spawnBehavior: "normal",
      applyDifficulty(hints) {
        return {
          hpMult: hints.toughness,
          speedMult: hints.speed,
          countMult: 1,
          goldMult: hints.goldMult,
          extraTraits: []
        };
      }
    },
    mage_heal: {
      id: "mage_heal",
      name: "Heal Mage",
      description: "Aura: heals nearby creeps for flat HP periodically.",
      hpMultiplier: 1,
      speedMultiplier: 0.85,
      armor: "medium",
      color: 4521898,
      size: 1.1,
      count: 1,
      traits: [{ id: "flat_heal_aura", range: 4, healAmount: 15, cooldown: 800 }],
      spawnBehavior: "normal",
      applyDifficulty(hints) {
        return {
          hpMult: hints.toughness,
          speedMult: hints.speed,
          countMult: 1,
          goldMult: hints.goldMult,
          // Toughness increases the heal amount
          extraTraits: hints.toughness > 1 ? [{ id: "flat_heal_aura", range: 4, healAmount: Math.round(15 * hints.toughness), cooldown: 800 }] : []
        };
      }
    },
    shielded: {
      id: "shielded",
      name: "Shielded",
      description: "Energy shield: max 1 damage per hit until shield breaks.",
      hpMultiplier: 0.9,
      speedMultiplier: 1,
      armor: "medium",
      color: 4500223,
      size: 1.1,
      count: 1,
      traits: [{ id: "damage_cap_shield", shieldHits: 15 }],
      spawnBehavior: "normal",
      applyDifficulty(hints) {
        return {
          hpMult: hints.toughness,
          speedMult: hints.speed,
          countMult: Math.max(1, hints.count * 0.7),
          goldMult: hints.goldMult,
          extraTraits: hints.toughness >= 3 ? [{ id: "damage_cap_shield", shieldHits: 40 }] : hints.toughness >= 1.5 ? [{ id: "damage_cap_shield", shieldHits: 25 }] : []
        };
      }
    },
    evasive: {
      id: "evasive",
      name: "Evasive",
      description: "25% dodge chance. Attacks can miss entirely.",
      hpMultiplier: 0.7,
      speedMultiplier: 1.4,
      armor: "light",
      color: 6737151,
      size: 0.85,
      count: 1,
      traits: [{ id: "evasion", chance: 0.25 }],
      spawnBehavior: "normal",
      applyDifficulty(hints) {
        return {
          hpMult: hints.toughness * 0.9,
          speedMult: hints.speed * 1.1,
          countMult: hints.count,
          goldMult: hints.goldMult,
          extraTraits: hints.toughness >= 3 ? [{ id: "evasion", chance: 0.45 }] : hints.toughness >= 1.5 ? [{ id: "evasion", chance: 0.35 }] : []
        };
      }
    },
    regenerator: {
      id: "regenerator",
      name: "Regenerator",
      description: "Heavy armor, regenerates 2% max HP/s. DPS check.",
      hpMultiplier: 1.8,
      speedMultiplier: 0.85,
      armor: "heavy",
      color: 2280516,
      size: 1.15,
      count: 1,
      traits: [{ id: "regeneration", regenPercent: 0.02 }],
      spawnBehavior: "normal",
      applyDifficulty(hints) {
        return {
          hpMult: hints.toughness * 1.2,
          speedMult: hints.speed * 0.95,
          countMult: Math.max(1, hints.count * 0.7),
          goldMult: hints.goldMult,
          extraTraits: hints.toughness >= 3 ? [{ id: "regeneration", regenPercent: 0.05 }] : hints.toughness >= 2 ? [{ id: "regeneration", regenPercent: 0.03 }] : []
        };
      }
    },
    flying: {
      id: "flying",
      name: "Flying",
      description: "Ignores maze. Flies direct to exit.",
      hpMultiplier: 0.6,
      speedMultiplier: 0.9,
      armor: "light",
      color: 14540287,
      size: 0.9,
      count: 1,
      traits: [],
      spawnBehavior: "flying",
      // Uses direct path, not A*
      applyDifficulty(hints) {
        return {
          hpMult: hints.toughness * 0.8,
          // fragile — the maze bypass is the threat
          speedMult: hints.speed,
          countMult: Math.max(1, hints.count * 0.7),
          goldMult: hints.goldMult * 1.2,
          // bonus gold for the threat
          extraTraits: []
        };
      }
    },
    // ─── Plan A: Arcane Counterspell — caster creeps ───────────────
    // Channel a spell after a delay; any damage interrupts. Designed
    // to read clearly: a Sigil and a Scribe should look like distinct
    // threats in the wave so the player learns to prioritize them.
    arcane_sigil: {
      id: "arcane_sigil",
      name: "Sigil",
      description: "Channels a tower-clearing pulse. Damage alone will not cancel the channel \u2014 bring Frost or Mana Drain.",
      hpMultiplier: 12,
      speedMultiplier: 0.5,
      armor: "heavy",
      color: 11158783,
      size: 2.5,
      count: 1,
      traits: [{
        id: "channel_caster",
        // 10s channel. Interruptible only by counter-magic towers (Frost,
        // Mana Drain) via the `interrupts_channels` tower trait. Standard
        // damage doesn't auto-cancel — the player has to BUILD the
        // counter, not just have damage on the field.
        channelStartAt: 1.5,
        channelDuration: 10,
        effectId: "clear_towers_radius",
        meta: { radius: 140 },
        // 5 tiles — large enough to bite even loose mazing
        interruptible: false
      }],
      spawnBehavior: "normal",
      spawnOrder: "last",
      applyDifficulty(hints) {
        return {
          hpMult: hints.toughness * 0.9,
          speedMult: hints.speed * 0.8,
          countMult: 1,
          goldMult: hints.goldMult * 1.5,
          extraTraits: []
        };
      }
    },
    // ─── M5 Crystal Warlords (rage timer on first hit) ─────────────
    // Boss-tier creeps with channel_caster trait set to triggerOn:
    // 'first_hit'. The rage clock doesn't start until the player
    // engages — once you start damaging a Warlord you have ~25s to
    // finish them before their rage fires (different effect per
    // Warlord). interruptible: false so Frost can't pause the rage —
    // only killing the Warlord stops it.
    warlord_stalwart: {
      id: "warlord_stalwart",
      name: "Stalwart Warlord",
      description: "Tanky vanguard. Rage on first hit: summons 6 fast reinforcements.",
      hpMultiplier: 16,
      speedMultiplier: 0.4,
      armor: "heavy",
      color: 16746564,
      size: 2.2,
      count: 1,
      traits: [{
        id: "channel_caster",
        triggerOn: "first_hit",
        channelStartAt: 0,
        channelDuration: 15,
        effectId: "warlord_reinforcements",
        meta: {},
        interruptible: false,
        castCount: 1
      }],
      spawnBehavior: "normal",
      applyDifficulty(hints) {
        return { hpMult: hints.toughness * 0.95, speedMult: hints.speed * 0.7, countMult: 1, goldMult: hints.goldMult * 2, extraTraits: [] };
      }
    },
    warlord_healer: {
      id: "warlord_healer",
      name: "Healer Warlord",
      description: "Battlefield medic. Rage on first hit: heals every alive creep to full.",
      hpMultiplier: 14,
      speedMultiplier: 0.65,
      armor: "heavy",
      color: 4521864,
      size: 2.2,
      count: 1,
      traits: [{
        id: "channel_caster",
        triggerOn: "first_hit",
        channelStartAt: 0,
        channelDuration: 15,
        effectId: "warlord_heal_all",
        meta: {},
        interruptible: false,
        castCount: 1
      }],
      spawnBehavior: "normal",
      applyDifficulty(hints) {
        return { hpMult: hints.toughness * 0.95, speedMult: hints.speed * 0.7, countMult: 1, goldMult: hints.goldMult * 2, extraTraits: [] };
      }
    },
    warlord_champion: {
      id: "warlord_champion",
      name: "Champion Warlord",
      description: "Heavily armored. Rage on first hit: every alive creep gains a shield.",
      hpMultiplier: 18,
      speedMultiplier: 0.4,
      armor: "heavy",
      color: 15649928,
      size: 2.4,
      count: 1,
      traits: [{
        id: "channel_caster",
        triggerOn: "first_hit",
        channelStartAt: 0,
        channelDuration: 18,
        effectId: "warlord_shield_all",
        meta: {},
        interruptible: false,
        castCount: 1
      }],
      spawnBehavior: "normal",
      applyDifficulty(hints) {
        return { hpMult: hints.toughness * 0.95, speedMult: hints.speed * 0.7, countMult: 1, goldMult: hints.goldMult * 2, extraTraits: [] };
      }
    },
    warlord_tactician: {
      id: "warlord_tactician",
      name: "Tactician Warlord",
      description: "Field commander. FAST mover. Rage on first hit: every alive creep moves 60% faster.",
      hpMultiplier: 14,
      speedMultiplier: 0.95,
      armor: "heavy",
      color: 6737151,
      size: 2.2,
      count: 1,
      traits: [{
        id: "channel_caster",
        triggerOn: "first_hit",
        channelStartAt: 0,
        channelDuration: 12,
        effectId: "warlord_haste_all",
        meta: {},
        interruptible: false,
        castCount: 1
      }],
      spawnBehavior: "normal",
      applyDifficulty(hints) {
        return { hpMult: hints.toughness * 0.95, speedMult: hints.speed * 0.7, countMult: 1, goldMult: hints.goldMult * 2, extraTraits: [] };
      }
    },
    warlord_captain: {
      id: "warlord_captain",
      name: "Captain Warlord",
      description: "The vanguard's capstone. Rage on first hit: massive swarm summon.",
      hpMultiplier: 22,
      speedMultiplier: 0.5,
      armor: "heavy",
      color: 16729258,
      size: 2.6,
      count: 1,
      traits: [{
        id: "channel_caster",
        triggerOn: "first_hit",
        channelStartAt: 0,
        channelDuration: 18,
        effectId: "warlord_mass_summon",
        meta: {},
        interruptible: false,
        castCount: 1
      }],
      spawnBehavior: "normal",
      applyDifficulty(hints) {
        return { hpMult: hints.toughness, speedMult: hints.speed * 0.7, countMult: 1, goldMult: hints.goldMult * 2.5, extraTraits: [] };
      }
    },
    // ─── M3 Ritual Circle Archmages ──────────────────────────────
    // Boss-tier casters, each with a distinct named spell. interruptible:
    // false, large size, heavy armor, very slow. Castable by Frost or
    // Mana Drain. Designed to be the wave's centerpiece, not a swarm.
    arcane_archmage_meteor: {
      id: "arcane_archmage_meteor",
      name: "Meteora",
      description: "Boss caster. Channels meteor strikes. Counter with Frost or Mana Drain.",
      hpMultiplier: 18,
      speedMultiplier: 0.4,
      armor: "heavy",
      color: 16737826,
      size: 2.4,
      count: 1,
      traits: [{
        id: "channel_caster",
        channelStartAt: 1,
        channelDuration: 11,
        effectId: "meteor_drop",
        meta: { damage: 200, radius: 80 },
        interruptible: false,
        castCount: 2,
        castCooldown: 5
      }],
      spawnBehavior: "normal",
      applyDifficulty(hints) {
        return {
          hpMult: hints.toughness * 0.95,
          speedMult: hints.speed * 0.7,
          countMult: 1,
          goldMult: hints.goldMult * 2.5,
          extraTraits: []
        };
      }
    },
    arcane_archmage_storm: {
      id: "arcane_archmage_storm",
      name: "Stormcaller",
      description: "Boss caster. Disables towers with chain lightning. Counter with Frost or Mana Drain.",
      hpMultiplier: 18,
      speedMultiplier: 0.4,
      armor: "heavy",
      color: 4491468,
      size: 2.4,
      count: 1,
      traits: [{
        id: "channel_caster",
        channelStartAt: 1,
        channelDuration: 10,
        effectId: "chain_lightning_on_towers",
        meta: { count: 3, duration: 5 },
        interruptible: false,
        castCount: 2,
        castCooldown: 5
      }],
      spawnBehavior: "normal",
      applyDifficulty(hints) {
        return {
          hpMult: hints.toughness * 0.95,
          speedMult: hints.speed * 0.7,
          countMult: 1,
          goldMult: hints.goldMult * 2.5,
          extraTraits: []
        };
      }
    },
    arcane_archmage_necro: {
      id: "arcane_archmage_necro",
      name: "Necromaster",
      description: "Boss caster. Summons shades from beyond. Counter with Frost or Mana Drain.",
      hpMultiplier: 18,
      speedMultiplier: 0.4,
      armor: "heavy",
      color: 8926122,
      size: 2.4,
      count: 1,
      traits: [{
        id: "channel_caster",
        channelStartAt: 1,
        channelDuration: 10,
        effectId: "summon_creeps_at_position",
        meta: { count: 5, summonType: "standard" },
        interruptible: false,
        castCount: 2,
        castCooldown: 5
      }],
      spawnBehavior: "normal",
      applyDifficulty(hints) {
        return {
          hpMult: hints.toughness * 0.95,
          speedMult: hints.speed * 0.7,
          countMult: 1,
          goldMult: hints.goldMult * 2.5,
          extraTraits: []
        };
      }
    },
    arcane_scribe: {
      id: "arcane_scribe",
      name: "Scribe",
      description: "Channels a wave-buff repeatedly while it walks. Counter with Frost or Mana Drain \u2014 early.",
      hpMultiplier: 3,
      speedMultiplier: 0.6,
      armor: "medium",
      color: 16767334,
      size: 1.4,
      count: 1,
      traits: [{
        id: "channel_caster",
        channelStartAt: 1,
        channelDuration: 8,
        effectId: "buff_next_wave_hp",
        meta: { percent: 0.2, summonCount: 3, summonType: "standard" },
        // Damage alone won't cancel — Frost or Mana Drain required, same
        // as Sigil. Keeps the campaign's interrupt vocabulary consistent.
        interruptible: false,
        // Multi-channel: a Scribe channels for the entire duration of
        // its walk — castCount 0 means unlimited. Combined with the
        // +75% global buff cap and the per-cast 20%, the player still
        // can't be infinitely punished, but every uninterrupted Scribe
        // also drops 3 summoned creeps per cast — those don't cap.
        castCount: 0,
        castCooldown: 4
      }],
      spawnBehavior: "normal",
      // No spawnOrder — Scribes interleave with the rest of the wave so
      // the player can't just hold DPS for the back half.
      applyDifficulty(hints) {
        return {
          hpMult: hints.toughness,
          speedMult: hints.speed * 0.85,
          countMult: 1,
          goldMult: hints.goldMult * 1.2,
          extraTraits: []
        };
      }
    },
    // ─── Campaign #3 — The Greenward (Inheritors) ──────────────────
    // The Inheritors are what moved into the empty thrones after the
    // southern kingdoms fell. Recurring across all 10 Greenward
    // missions. Boss variants (Knight / Herald / Child / etc.) and
    // named Watchers (Old Woman / Cethric / Stone Bride / Heron) land
    // in their mission commits; the entries below are the common
    // wave-fodder variants used across multiple missions.
    //
    // Visual palette: pale/grey-faded, gold accents (faded kingdom
    // livery). Distinguishes them from typical creep colours.
    inheritor_road_walker: {
      id: "inheritor_road_walker",
      name: "Road-Walker",
      description: "A ragged figure on the road. Slow and patient. The most common Inheritor.",
      hpMultiplier: 1,
      speedMultiplier: 0.9,
      armor: "medium",
      color: 11051156,
      size: 1,
      count: 1,
      traits: [],
      spawnBehavior: "normal",
      applyDifficulty: defaultDifficulty
    },
    inheritor_den_walker: {
      id: "inheritor_den_walker",
      name: "Den-Walker",
      description: "Lurker who has made a den in a ruin. Slightly tougher than a Road-Walker.",
      hpMultiplier: 1.4,
      speedMultiplier: 0.8,
      armor: "medium",
      color: 8024154,
      size: 1.1,
      count: 1,
      traits: [],
      spawnBehavior: "normal",
      applyDifficulty: defaultDifficulty
    },
    inheritor_messenger: {
      id: "inheritor_messenger",
      name: "Messenger",
      description: "Faster, fragile. They bring nothing and take nothing.",
      hpMultiplier: 0.6,
      speedMultiplier: 1.6,
      armor: "light",
      color: 13154440,
      size: 0.85,
      count: 1,
      traits: [],
      spawnBehavior: "normal",
      applyDifficulty(hints) {
        return {
          hpMult: hints.toughness * 0.8,
          speedMult: hints.speed * 1.1,
          countMult: hints.count,
          goldMult: hints.goldMult,
          extraTraits: []
        };
      }
    },
    inheritor_river_crawler: {
      id: "inheritor_river_crawler",
      name: "River-Crawler",
      description: "Water-borne Inheritor. Only appears where rivers run salt.",
      hpMultiplier: 1.2,
      speedMultiplier: 1.1,
      armor: "light",
      color: 8954008,
      size: 0.95,
      count: 1,
      traits: [],
      spawnBehavior: "normal",
      applyDifficulty: defaultDifficulty
    },
    inheritor_civilian: {
      id: "inheritor_civilian",
      name: "Civilian",
      description: "Non-Inheritor friendly \u2014 a townsperson the grove was promised. Must not be killed.",
      hpMultiplier: 0.4,
      speedMultiplier: 1,
      armor: "light",
      color: 14535850,
      size: 0.9,
      count: 1,
      traits: [],
      spawnBehavior: "normal",
      // Civilians give NO gold and don't apply difficulty scaling —
      // they're a constraint, not a reward target.
      applyDifficulty(hints) {
        return {
          hpMult: 1,
          speedMult: 1,
          countMult: hints.count,
          goldMult: 0,
          extraTraits: []
        };
      }
    },
    inheritor_wedding_stone: {
      id: "inheritor_wedding_stone",
      name: "Wedding-Stone Walker",
      description: "A wedding party turned to stone. Slow, heavy, mossed. The bride is among them.",
      hpMultiplier: 1.6,
      speedMultiplier: 0.65,
      armor: "heavy",
      color: 11051168,
      size: 1.1,
      count: 1,
      traits: [],
      spawnBehavior: "normal",
      applyDifficulty(hints) {
        return {
          hpMult: hints.toughness * 1.1,
          // stone holds heavily
          speedMult: hints.speed * 0.95,
          countMult: hints.count,
          goldMult: hints.goldMult,
          extraTraits: []
        };
      }
    },
    // ─── Greenward named Watchers + bosses ─────────────────────────
    // Each named Watcher pins its HP/speed regardless of difficulty —
    // the Mercy mechanic is "don't touch her at any difficulty," so
    // scaling her HP makes no sense. Gold mult is pinned to 0 for the
    // same reason civilians don't pay out: she isn't a target.
    inheritor_old_woman: {
      id: "inheritor_old_woman",
      name: "The Old Woman of Eadwin",
      description: "The innkeeper at the hearth. She does not look up.",
      hpMultiplier: 0.8,
      speedMultiplier: 0,
      armor: "light",
      color: 14535850,
      size: 1,
      count: 1,
      traits: [],
      spawnBehavior: "normal",
      applyDifficulty() {
        return {
          hpMult: 1,
          speedMult: 1,
          countMult: 1,
          goldMult: 0,
          extraTraits: []
        };
      }
    },
    inheritor_cethric: {
      id: "inheritor_cethric",
      name: "Cethric the Crow-Priest",
      description: "A hooded crow-priest, cross-legged at the marsh crossroads. He does not turn his head.",
      hpMultiplier: 1,
      speedMultiplier: 0,
      armor: "light",
      color: 4868690,
      size: 1,
      count: 1,
      traits: [],
      spawnBehavior: "normal",
      applyDifficulty() {
        return {
          hpMult: 1,
          speedMult: 1,
          countMult: 1,
          goldMult: 0,
          extraTraits: []
        };
      }
    },
    inheritor_stone_bride: {
      id: "inheritor_stone_bride",
      name: "The Stone Bride",
      description: "A bride turned to stone forty winters ago; her veil is moss now. Walks slower than the wedding-stone livery \u2014 the visual cue Marra reads to spare her.",
      hpMultiplier: 1.2,
      speedMultiplier: 0.55,
      armor: "heavy",
      color: 12631216,
      size: 1.1,
      count: 1,
      traits: [],
      spawnBehavior: "normal",
      applyDifficulty() {
        return {
          hpMult: 1.2,
          speedMult: 0.55,
          countMult: 1,
          goldMult: 0,
          extraTraits: []
        };
      }
    },
    inheritor_child: {
      id: "inheritor_child",
      name: "The Child",
      description: "A small Inheritor with a banner of withered flowers. Walks with the host but never fights. Touching her fails the Mercy condition.",
      hpMultiplier: 2,
      speedMultiplier: 0.5,
      armor: "medium",
      color: 12097656,
      size: 0.75,
      count: 1,
      traits: [],
      spawnBehavior: "normal",
      applyDifficulty() {
        return {
          hpMult: 2,
          speedMult: 0.5,
          countMult: 1,
          goldMult: 0,
          extraTraits: []
        };
      }
    },
    inheritor_knight: {
      id: "inheritor_knight",
      name: "The Knight",
      description: "A Knight in heavy armor who never blooded a sword. M8 boss-rush \u2014 high HP, heavy armor, slow.",
      hpMultiplier: 8,
      speedMultiplier: 0.8,
      armor: "heavy",
      color: 6974072,
      size: 1.4,
      count: 1,
      traits: [],
      spawnBehavior: "normal",
      applyDifficulty(hints) {
        return {
          hpMult: hints.toughness * 8,
          speedMult: hints.speed * 0.8,
          countMult: 1,
          // never multi-spawned; boss
          goldMult: hints.goldMult * 5,
          // boss bounty
          extraTraits: []
        };
      }
    },
    inheritor_herald: {
      id: "inheritor_herald",
      name: "The Herald",
      description: "A banner-bearer who never spoke an announcement. M8 boss-rush \u2014 medium HP, faster than the Knight, banner billowing silent.",
      hpMultiplier: 5,
      speedMultiplier: 1,
      armor: "medium",
      color: 8939640,
      size: 1.3,
      count: 1,
      traits: [],
      spawnBehavior: "normal",
      applyDifficulty(hints) {
        return {
          hpMult: hints.toughness * 5,
          speedMult: hints.speed,
          countMult: 1,
          goldMult: hints.goldMult * 4,
          extraTraits: []
        };
      }
    },
    // Snake Eyes M8 — the Dealer's enforcer. Lobs damage tokens at the
    // player's towers (disabling them temporarily, not destroying them
    // — see CollectorBehavior). Defeating the Collector marks
    // SnakeEyesState.collectorDefeatedAt and cancels next mission's
    // interest charge. Bossier than the M8 Inheritor cycle but slower;
    // the threat is to your board, not to your lives.
    void_collector: {
      id: "void_collector",
      name: "The Collector",
      description: "The Dealer's hand on the road. Doesn't take lives \u2014 takes towers. Kill him before he taxes you off the board.",
      hpMultiplier: 12,
      speedMultiplier: 0.55,
      armor: "heavy",
      color: 3811898,
      size: 1.5,
      count: 1,
      // Trait id `void_collector_disable` is forward-declared here +
      // implemented in src/systems/voidc/CollectorBehavior.ts. The
      // creep update handler picks a target tower + emits a
      // tower-disable event each tick the cooldown elapses.
      traits: [{ id: "void_collector_disable", tokenIntervalMs: 4e3, disableDurationMs: 6e3, rangeCells: 6 }],
      spawnBehavior: "normal",
      applyDifficulty(hints) {
        return {
          hpMult: hints.toughness * 12,
          speedMult: hints.speed * 0.55,
          countMult: 1,
          // never multi-spawned; boss
          goldMult: hints.goldMult * 5,
          // bounty on defeating him
          extraTraits: []
        };
      }
    },
    // Snake Eyes M10 — The Counterfactual. Boss creep that resolves
    // the campaign's central conceit: the mirror-image gambler Ardax
    // could have been. Spawns on M10 wave 11 (the Table setpiece) after
    // Approach + Mirror Lane resolve. Death triggers
    // `m10MarkBossDefeated` → mission win → `SnakeEyesEndingPanel`.
    //
    // Boss-tier HP baseline. The actual on-creep HP is overridden at
    // spawn time by GameScene from `counterfactualBossHp(tally)` so
    // lifetime Pactbook acceptance/decline drives the difficulty. See
    // SnakeEyesMissionController.getM10Controller().getSnapshot().bossHpMax.
    // The wave-script `hpScale` is the v1 fallback baseline.
    //
    // Has its OWN typeId (not generic `boss`) so the GameScene boss-
    // kill detection can narrow on a Snake-Eyes-specific creep without
    // colliding with the generic `boss` creep that other waves spawn.
    void_counterfactual: {
      id: "void_counterfactual",
      name: "The Counterfactual",
      description: "The deal you didn't take. Wearing your coat. Waiting at your table.",
      hpMultiplier: 12,
      speedMultiplier: 0.6,
      armor: "heavy",
      color: 2758720,
      size: 1.6,
      count: 1,
      traits: [],
      spawnBehavior: "normal",
      applyDifficulty(hints) {
        return {
          hpMult: hints.toughness * 12,
          speedMult: hints.speed * 0.6,
          countMult: 1,
          // never multi-spawned; boss
          goldMult: hints.goldMult * 5,
          extraTraits: []
        };
      }
    },
    // ─── Iron Cascade (Mech campaign) creep variants ────────────────
    // Voss's industrial war-machine roster. The campaign narrative
    // references these by name across M1/M2/M4/M5/M6/M9 but they
    // didn't exist until this commit — every mission rendered generic
    // creeps. Adding them here unblocks per-mission wave scripts in
    // commits 3-5 of the Mech narrative-gameplay buildout.
    // Light, fast riders. Voss's frontline scouts (M1 "fast riders",
    // M6 "rail-yard" mobility). Burst-damage food.
    mech_scout: {
      id: "mech_scout",
      name: "Scout Rider",
      description: "Voss's outriders \u2014 single-pilot frames with no plating. Fast, fragile, sent ahead of every column.",
      hpMultiplier: 0.55,
      speedMultiplier: 1.8,
      armor: "light",
      color: 12634320,
      size: 0.85,
      count: 1,
      traits: [],
      spawnBehavior: "normal",
      applyDifficulty(hints) {
        return {
          hpMult: hints.toughness * 0.55,
          speedMult: hints.speed * 1.8,
          countMult: hints.count,
          goldMult: hints.goldMult * 0.7,
          // cheap kills
          extraTraits: []
        };
      }
    },
    // Light military skiffs — fast and arrive in groups. Pair with
    // scouts in early waves to overwhelm; alone they're not threatening.
    mech_skiff: {
      id: "mech_skiff",
      name: "Skiff",
      description: "Two-pilot scouting frames with light brass plating. Arrives in pairs.",
      hpMultiplier: 0.4,
      speedMultiplier: 1.4,
      armor: "light",
      color: 10520664,
      size: 0.8,
      count: 2,
      traits: [],
      spawnBehavior: "normal",
      applyDifficulty(hints) {
        return {
          hpMult: hints.toughness * 0.4,
          speedMult: hints.speed * 1.4,
          countMult: hints.count,
          goldMult: hints.goldMult * 0.8,
          extraTraits: []
        };
      }
    },
    // Standard Mech infantry walker. Backbone of mid waves. Medium
    // armor + moderate speed — the workhorse that the narrative
    // collectively calls "walkers."
    mech_light_walker: {
      id: "mech_light_walker",
      name: "Light Walker",
      description: "Voss's standard battlefield walker. Two-leg frame, plate over the boilers, slow but not slow enough.",
      hpMultiplier: 1.2,
      speedMultiplier: 0.9,
      armor: "medium",
      color: 7897232,
      size: 1,
      count: 1,
      traits: [],
      spawnBehavior: "normal",
      applyDifficulty(hints) {
        return {
          hpMult: hints.toughness * 1.2,
          speedMult: hints.speed * 0.9,
          countMult: hints.count,
          goldMult: hints.goldMult,
          extraTraits: []
        };
      }
    },
    // Heavy walker. Late-mid threat that requires sustained focus.
    // Heavy armor means physical-damage towers struggle without
    // armor-pen (Bolt's pierce, Storm's lightning). Voss's "armored
    // column" anchor.
    mech_armored_walker: {
      id: "mech_armored_walker",
      name: "Armored Walker",
      description: "Four-leg siege walker plated over its mana-furnace. Slow, hard-armored, lethal if not stopped.",
      hpMultiplier: 2.5,
      speedMultiplier: 0.7,
      armor: "heavy",
      color: 3817032,
      size: 1.15,
      count: 1,
      traits: [],
      spawnBehavior: "normal",
      applyDifficulty(hints) {
        return {
          hpMult: hints.toughness * 2.5,
          speedMult: hints.speed * 0.7,
          countMult: hints.count,
          goldMult: hints.goldMult * 1.3,
          extraTraits: []
        };
      }
    },
    // M5 marquee — Voss's flagship walker. Tank-class HP + heavy
    // armor + the `mech_pylon_vent_armor` trait that opens the
    // armor-vents when any Suppression Pylon is muted (channeled by
    // the player). Narrative: "armor vents briefly whenever the
    // Suppression Pylons cycle." The trait is registered in commit
    // 2 (the actual damage-vulnerability handler).
    mech_flagship_walker: {
      id: "mech_flagship_walker",
      name: "Flagship Walker",
      description: "Voss's flagship \u2014 a six-leg siege engine on its own rails. Heavily plated, but the engineer's schematics say the armor vents when the pylons are silenced.",
      hpMultiplier: 10,
      speedMultiplier: 0.5,
      armor: "heavy",
      color: 2758680,
      size: 1.45,
      count: 1,
      // Trait id is forward-declared here; the Trait.ts handler that
      // queries SuppressionManager + applies the bonus-damage
      // vulnerability lives in commit 2.
      traits: [{ id: "mech_pylon_vent_armor", bonusDamageMult: 1.6 }],
      spawnBehavior: "normal",
      applyDifficulty(hints) {
        return {
          hpMult: hints.toughness * 10,
          speedMult: hints.speed * 0.5,
          countMult: 1,
          // never multi-spawned; boss
          goldMult: hints.goldMult * 4,
          extraTraits: []
        };
      }
    },
    // M9 marquee — Voss's named pilot. Faster than a walker, evasive,
    // shielded. The "Ace" the Engineer specifically asked to fight.
    // Single-instance per spawn; the M9 wave script chains him in
    // escalating phases.
    mech_ace_pilot: {
      id: "mech_ace_pilot",
      name: "The Ace",
      description: "Voss's voice in the field. A custom walker frame piloted by his ace \u2014 fast, evasive, and bulwarked behind a kinetic shield until pressed.",
      hpMultiplier: 6,
      speedMultiplier: 1.1,
      armor: "medium",
      color: 14200904,
      size: 1.25,
      count: 1,
      traits: [{ id: "shield", hpPercent: 0.35 }],
      spawnBehavior: "normal",
      applyDifficulty(hints) {
        return {
          hpMult: hints.toughness * 6,
          speedMult: hints.speed * 1.1,
          countMult: 1,
          // single Ace per wave
          goldMult: hints.goldMult * 3,
          extraTraits: []
        };
      }
    }
  };

  // src/entities/Creep.ts
  init_Trait();

  // ml/desktop/phaser_shim.ts
  var Textures = { FilterMode: { NEAREST: 0, LINEAR: 1 } };

  // src/systems/CreepSpriteManager.ts
  var COLS = 16;
  var DEATH_FRAMES = 3;
  var DEATH_FPS = 3;
  var CREEP_TYPE_TO_COL = {
    standard: 0,
    fast: 1,
    armored: 2,
    swarm: 3,
    healer: 4,
    boss: 5,
    group: 6,
    splitter: 7,
    shielded: 8,
    evasive: 9,
    regenerator: 10,
    flying: 11,
    mage_armor: 12,
    mage_speed: 13,
    mage_evasion: 14,
    mage_heal: 15,
    // Aliases
    splitter_child: 3,
    // use swarm sprite for splitlings
    // Plan A — caster aliases. Sigils ride the mage_armor sprite (the
    // tankier, more visibly threatening mage); Scribes ride mage_heal
    // (the spellcaster look). Halo overlay (ChannelBarOverlay) layers
    // a faction glow on top so the player can read them as casters
    // distinct from regular mages.
    arcane_sigil: 12,
    arcane_scribe: 15,
    // M3 Archmages reuse mage sprite columns; the channel-bar halo +
    // unique tints + boss-tier scale make them visually distinct.
    // Meteora → mage_armor (col 12), tinted hot orange in Creep ctor.
    arcane_archmage_meteor: 12,
    // Stormcaller → mage_speed (col 13), tinted blue.
    arcane_archmage_storm: 13,
    // Necromaster → mage_evasion (col 14), tinted deep purple.
    arcane_archmage_necro: 14,
    // M5 Warlords ride the boss sprite (col 5) at 2.2-2.6 scale, with
    // per-creep tint baked in Creep.ts. Same trick as the archmages
    // but using the boss column for the heavier silhouette.
    warlord_stalwart: 5,
    warlord_healer: 5,
    warlord_champion: 5,
    warlord_tactician: 5,
    warlord_captain: 5,
    // Snake Eyes M10 — The Counterfactual rides the boss sprite (col 5)
    // for the v1 silhouette. Bespoke art is a follow-up (see the
    // Snake Eyes M10 polish PRD). Without this alias the creep would
    // render as col 0 (generic standard) — wrong-feel for a boss.
    void_counterfactual: 5,
    // ─── Iron Cascade (Mech) campaign creep aliases ──────────────
    // Regression-pin (kept in sync with MechCreeps.test.ts): these
    // values are intentionally distinct columns so a future edit
    // can't silently collapse two creeps onto the same alias and
    // re-introduce the "they all look identical" bug. Bespoke art
    // lives on a separate sheet — see MECH_CAMPAIGN_TO_COL below
    // — and routing through `resolveSheet()` swaps the sheet at
    // runtime. The values here are the fallback if the campaign
    // sheet fails to load.
    mech_scout: 1,
    // fast — light rider silhouette
    mech_skiff: 3,
    // swarm — light grouped frame
    mech_light_walker: 0,
    // standard — workhorse infantry
    mech_armored_walker: 2,
    // armored — heavy plate
    mech_flagship_walker: 5,
    // boss — heavy boss silhouette
    mech_ace_pilot: 8
    // shielded — shield trait + named boss
  };
  var MECH_CAMPAIGN_TO_COL = {
    mech_scout: 0,
    mech_skiff: 1,
    mech_light_walker: 2,
    mech_armored_walker: 3,
    mech_flagship_walker: 4,
    mech_ace_pilot: 5
  };
  var MECH_CAMPAIGN_SHEET_KEY = "creeps_mech_campaign";
  var MECH_CAMPAIGN_COLS = 6;
  var GREENWARD_CAMPAIGN_TO_COL = {
    inheritor_road_walker: 0,
    inheritor_den_walker: 1,
    inheritor_messenger: 2,
    inheritor_river_crawler: 3,
    inheritor_civilian: 4,
    inheritor_wedding_stone: 5,
    inheritor_old_woman: 6,
    inheritor_cethric: 7,
    inheritor_stone_bride: 8,
    inheritor_child: 9,
    inheritor_knight: 10,
    inheritor_herald: 11
  };
  var GREENWARD_CAMPAIGN_SHEET_KEY = "creeps_greenward_campaign";
  var GREENWARD_CAMPAIGN_COLS = 12;
  var SNAKE_EYES_CAMPAIGN_TO_COL = {
    void_collector: 0
  };
  var SNAKE_EYES_CAMPAIGN_SHEET_KEY = "creeps_snake_eyes_campaign";
  var SNAKE_EYES_CAMPAIGN_COLS = 1;
  function sheetKey(faction) {
    return `creeps_${faction}`;
  }
  function resolveSheet(scene, faction, creepTypeId) {
    if (creepTypeId in MECH_CAMPAIGN_TO_COL && scene.textures.exists(MECH_CAMPAIGN_SHEET_KEY)) {
      return {
        key: MECH_CAMPAIGN_SHEET_KEY,
        col: MECH_CAMPAIGN_TO_COL[creepTypeId],
        cols: MECH_CAMPAIGN_COLS
      };
    }
    if (creepTypeId in GREENWARD_CAMPAIGN_TO_COL && scene.textures.exists(GREENWARD_CAMPAIGN_SHEET_KEY)) {
      return {
        key: GREENWARD_CAMPAIGN_SHEET_KEY,
        col: GREENWARD_CAMPAIGN_TO_COL[creepTypeId],
        cols: GREENWARD_CAMPAIGN_COLS
      };
    }
    if (creepTypeId in SNAKE_EYES_CAMPAIGN_TO_COL && scene.textures.exists(SNAKE_EYES_CAMPAIGN_SHEET_KEY)) {
      return {
        key: SNAKE_EYES_CAMPAIGN_SHEET_KEY,
        col: SNAKE_EYES_CAMPAIGN_TO_COL[creepTypeId],
        cols: SNAKE_EYES_CAMPAIGN_COLS
      };
    }
    const key = sheetKey(faction);
    if (!scene.textures.exists(key)) return null;
    return { key, col: CREEP_TYPE_TO_COL[creepTypeId] ?? 0, cols: COLS };
  }
  function createCreepSprite(scene, faction, creepTypeId, x, y) {
    const resolved = resolveSheet(scene, faction, creepTypeId);
    if (!resolved) return null;
    const sprite = scene.add.sprite(x, y, resolved.key, resolved.col);
    sprite.setDepth(10);
    sprite.texture.setFilter(Textures.FilterMode.NEAREST);
    const walkKey = `creep_${faction}_${creepTypeId}_walk`;
    if (scene.anims.exists(walkKey)) {
      sprite.play(walkKey);
    }
    return sprite;
  }
  function playCreepDeath(scene, sprite, faction, creepTypeId) {
    const deathKey = `creep_${faction}_${creepTypeId}_death`;
    const safeDestroy = () => {
      if (sprite && sprite.active !== false) sprite.destroy();
    };
    if (scene.anims.exists(deathKey)) {
      sprite.play(deathKey);
      sprite.once("animationcomplete", safeDestroy);
      const ms = Math.ceil(DEATH_FRAMES / DEATH_FPS * 1500);
      scene.time.delayedCall(ms, safeDestroy);
    } else {
      sprite.destroy();
    }
  }
  function getCreepSpriteScale(creepTypeId) {
    switch (creepTypeId) {
      case "boss":
        return 0.7;
      // boss is drawn large in the frame
      case "swarm":
        return 0.3;
      // swarm is tiny
      case "splitter_child":
        return 0.3;
      case "armored":
        return 0.5;
      case "regenerator":
        return 0.5;
      default:
        return 0.4;
    }
  }
  function hasCreepSprites(faction, scene) {
    return scene.textures.exists(sheetKey(faction));
  }

  // src/entities/Creep.ts
  init_Rng();
  var ARMOR_TIERS = ["light", "medium", "heavy"];
  var Creep = class _Creep {
    constructor(scene, path, hp, speedMultiplier, isBoss, creepTypeId = "standard", creepFaction) {
      /** Col/row of the tower that last dealt damage (for kill credit in co-op) */
      this.lastHitCol = -1;
      this.lastHitRow = -1;
      /**
       * Player-index whose send / zone spawned this creep. Carried
       * through from `SendManager.queueSend(opt, ownerIndex)` for
       * bought sends, and populated from the spawner's `playerIndex`
       * for Circle Co-op wave creeps. Drives the 50/50 kill-gold
       * split in Circle Co-op: killer gets half, this field gets the
       * other half. `null` = no spawn owner (standard solo / 1v1
       * where every creep belongs to the defender themselves).
       */
      this.spawnOwnerIndex = null;
      /** Owner of this creep. Drives the universal "same-team-can't-target"
       *  rule (Tower.findTarget skips creeps with the same ownerIndex as
       *  the tower; sends/creeps with goalMode='attacking' skip towers
       *  with the same owner). Conventions:
       *    -  0..3 = a Player slot (single-player → 0; circle co-op → 0..3)
       *    -  99   = CPU / enemy waves (default for spawned wave creeps)
       *  Defaults to 99 so any spawn path that doesn't explicitly set
       *  ownership produces an "enemy" creep — preserving existing
       *  behaviour without per-call edits. */
      this.ownerIndex = 99;
      /** M10 finale (also useful for any future "decoy" mode): true when
       *  the creep was spawned by SendManager as a player send (not a wave
       *  creep). Distinct from ownerIndex — `isSend` is the SOURCE
       *  (queued via the send panel) while ownerIndex is the TEAM. */
      this.isSend = false;
      /** Goal mode (PRD per user spec):
       *    'pathing'   = walk to exit point along the existing path.
       *    'attacking' = pathfind to the nearest enemy-owned destructible
       *                  tower, attack until dead, repeat. Falls back to
       *                  'pathing' once no enemy towers remain.
       *  Defaults to 'pathing' — the existing single-direction behaviour. */
      this.goalMode = "pathing";
      /** Attack range (in pixels) for goalMode='attacking'. Standard sends
       *  / wave creeps are melee-ish (~40 px = 1.4 tiles). Flying / mage
       *  variants can override to attack from further away. */
      this.attackRange = 40;
      /** Last frame the creep dealt damage to its current attacking
       *  target. Drives the 1s-cadence (configurable per creep). */
      this._attackLastFiredAt = 0;
      /** Cadence of attacks while in `goalMode='attacking'` (ms). 1000ms
       *  by default — sends the same DPS-feel as the older opportunistic
       *  send-chip mechanic. */
      this.attackCadenceMs = 1e3;
      /**
       * Plan 12 v2 — Anti-magic Wagon shield. Number of incoming damage
       * instances this creep can fully absorb before normal damage applies.
       * Set at spawn time when the player has bought a wagon for this wave;
       * the first N spawned creeps inherit the field. takeDamage() decrements
       * and short-circuits while > 0. 0 / undefined = no shield.
       */
      this._wagonHits = 0;
      /**
       * The spawner's ordered waypoint list + exit. Set by SpawnManager
       * when the creep is created from a circle-co-op map with
       * `mapDef.spawners`. `waypointsVisited` tracks how many of those
       * waypoints the creep has physically reached, so on a reroute we
       * can re-run `findPathWithWaypoints` from the creep's current
       * position through ONLY the unvisited waypoints and end at the
       * right exit — no guessing, no U-turns.
       *
       * `null` on simple entry→exit maps (standard / gauntlet / hero)
       * where the creep just walks a flat path. On those maps, reroute
       * falls back to a plain `findPath(current, exit)`.
       */
      this.spawnerWaypoints = null;
      this.spawnerExit = null;
      this.waypointsVisited = 0;
      /** Optional sprite (used when creep faction sprites are loaded) */
      this.sprite = null;
      this._prevX = 0;
      this._creepTypeId = "standard";
      this._creepFaction = null;
      /** Cached on construct — lets the hot path (draw() called every
       *  tick) short-circuit with a single boolean check instead of
       *  going through the chain of Phaser graphics Proxy traps. Never
       *  set in the real game; always set in HeadlessScene. */
      this._isHeadless = false;
      this.id = _Creep._nextId++;
      /** Sub-1-hp damage accumulator. `Math.round`ing every individual hit
       *  used to floor anything below 0.5 hp to 0, which silently zeroed
       *  out tick-based traits (Firewall beam, burn DoT, poison) on high-
       *  refresh-rate displays where per-frame damage = `dps × delta/1000`
       *  fell below 0.5. We now flush only the integer part of the debt
       *  and carry the fractional remainder forward so net damage matches
       *  the requested DPS regardless of frame cadence. */
      this._dmgDebt = 0;
      this.creepType = CREEP_TYPES[creepTypeId] || CREEP_TYPES.standard;
      this.path = path;
      this.pathIndex = 0;
      this.hp = Math.round(hp * this.creepType.hpMultiplier);
      this.maxHp = this.hp;
      this.baseSpeed = CREEP_BASE_SPEED * speedMultiplier * this.creepType.speedMultiplier;
      this.speed = this.baseSpeed;
      this.alive = true;
      this.reached = false;
      this.isBoss = isBoss || creepTypeId === "boss";
      this.baseArmor = this.creepType.armor;
      this.armor = this.baseArmor;
      this.color = this.creepType.color;
      this.size = this.creepType.size;
      this.statusEffects = new StatusEffectManager();
      this.traits = this.creepType.traits.map((t) => ({ ...t }));
      const shieldTrait = getTrait(this.traits, "shield");
      if (shieldTrait) {
        shieldTrait._shieldHp = Math.floor(this.maxHp * (shieldTrait.hpPercent ?? 0.3));
        shieldTrait._active = true;
      }
      this.x = gridX(path[0].col);
      this.y = gridY(path[0].row);
      this.pathIndex = 1;
      this._scene = scene;
      this._creepTypeId = creepTypeId;
      this._creepFaction = creepFaction ?? null;
      this._isHeadless = scene.isHeadless === true;
      if (creepFaction && hasCreepSprites(creepFaction, scene)) {
        this.sprite = createCreepSprite(scene, creepFaction, creepTypeId, this.x, this.y);
        if (this.sprite) {
          const scale = getCreepSpriteScale(creepTypeId);
          this.sprite.setScale(scale);
          const casterTrait = this.traits.find((t) => t.id === "channel_caster");
          if (casterTrait) {
            const tints = {
              clear_towers_radius: 16729343,
              // Sigil — magenta
              buff_next_wave_hp: 16767334,
              // Scribe — gold
              meteor_drop: 16737826,
              // Meteora — hot orange
              chain_lightning_on_towers: 4491468,
              // Stormcaller — blue
              summon_creeps_at_position: 11158749,
              // Necromaster — purple
              warlord_reinforcements: 16746564,
              // Stalwart — orange
              warlord_heal_all: 4521864,
              // Healer — green
              warlord_shield_all: 15649928,
              // Champion — gold
              warlord_haste_all: 6737151,
              // Tactician — blue
              warlord_mass_summon: 16729258
              // Captain — magenta
            };
            const tint = tints[casterTrait.effectId] ?? 16729343;
            this.sprite.setTint(tint);
            this.sprite.setScale(scale * 1.2);
          }
        }
      }
      this._prevX = this.x;
    }
    /** @deprecated — use `ownerIndex !== 99` instead. Kept as a
     *  compatibility shim so older code paths don't crash mid-refactor;
     *  reads true when the creep is on a Player team. */
    get isFriendly() {
      return this.ownerIndex >= 0 && this.ownerIndex < 99;
    }
    static {
      /** Auto-incrementing instance id. Stable across the creep's
       *  lifetime; used by per-creep registries that can't carry the
       *  Creep instance directly (e.g. MercyWatcherTracker binds by
       *  numeric id so the controller stays Phaser-free in tests).
       *  Reset is unnecessary — overflow at 2^53 is functionally
       *  impossible within a single match. */
      this._nextId = 1;
    }
    /** The creep type ID (e.g. 'standard', 'fast', 'boss') */
    get creepTypeId() {
      return this._creepTypeId;
    }
    /** The faction this creep belongs to */
    get creepFaction() {
      return this._creepFaction;
    }
    update(delta, nearbyCreeps) {
      if (!this.alive || this.reached) return;
      this.statusEffects.update(delta);
      const shred = this.statusEffects.getArmorShred();
      const baseIdx = ARMOR_TIERS.indexOf(this.baseArmor);
      this.armor = ARMOR_TIERS[Math.max(0, baseIdx - shred)];
      const dotDmg = this.statusEffects.getDotDamage(delta, this.maxHp);
      if (dotDmg > 0) {
        this.hp -= dotDmg;
        if (this.hp <= 0) {
          this.alive = false;
          if (this.sprite) {
            playCreepDeath(this._scene, this.sprite, this._scene.creepFaction ?? "arcane", this._creepTypeId);
            this.sprite = null;
          }
          return;
        }
      }
      this.speed = this.baseSpeed * this.statusEffects.getSlowFactor();
      this._healSourcesThisTick = 0;
      if (!this.statusEffects.isMuted()) {
        resolveCreepUpdates(this.traits, this, delta, nearbyCreeps ?? []);
      }
      if (this.goalMode === "attacking" && this.getAttackTarget) {
        const cb = this.getAttackTarget;
        const candidate = cb(this);
        if (candidate && candidate.alive !== false) {
          const dx2 = candidate.x - this.x;
          const dy2 = candidate.y - this.y;
          const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
          if (dist2 <= this.attackRange) {
            this._attackLastFiredAt += delta;
            if (this._attackLastFiredAt >= this.attackCadenceMs) {
              this._attackLastFiredAt = 0;
              const dmg = this.attackDamage ?? Math.max(1, Math.floor(this.maxHp / 100));
              candidate.takeDamage(dmg);
            }
          } else if (candidate.path && candidate.path.length > 0) {
            const move2 = this.speed * (delta / 1e3);
            const wp = candidate.path[0];
            const wdx = wp.x - this.x, wdy = wp.y - this.y;
            const wdist = Math.sqrt(wdx * wdx + wdy * wdy);
            if (wdist <= move2) {
              this.x = wp.x;
              this.y = wp.y;
              candidate.path.shift();
            } else if (wdist > 0) {
              this.x += wdx / wdist * move2;
              this.y += wdy / wdist * move2;
            }
          } else {
            const move2 = this.speed * (delta / 1e3);
            if (dist2 > 0) {
              this.x += dx2 / dist2 * move2;
              this.y += dy2 / dist2 * move2;
            }
          }
          return;
        }
      }
      if (this.pathIndex >= this.path.length) {
        this.reached = true;
        this.sprite?.destroy();
        this.sprite = null;
        return;
      }
      const confused = this.statusEffects.isConfused();
      if (confused && this.pathIndex > 1) {
        const prev = this.path[this.pathIndex - 2];
        const bx = gridX(prev.col);
        const by = gridY(prev.row);
        const bdx = bx - this.x;
        const bdy = by - this.y;
        const bdist = Math.sqrt(bdx * bdx + bdy * bdy);
        const move2 = this.speed * (delta / 1e3);
        if (bdist <= move2) {
          this.x = bx;
          this.y = by;
          this.pathIndex = Math.max(1, this.pathIndex - 1);
        } else if (bdist > 0) {
          this.x += bdx / bdist * move2;
          this.y += bdy / bdist * move2;
        }
        return;
      }
      const target = this.path[this.pathIndex];
      const tx = gridX(target.col);
      const ty = gridY(target.row);
      const dx = tx - this.x;
      const dy = ty - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const move = this.speed * (delta / 1e3);
      if (dist <= move) {
        this.x = tx;
        this.y = ty;
        if (this.spawnerWaypoints && this.waypointsVisited < this.spawnerWaypoints.length) {
          const nextWp = this.spawnerWaypoints[this.waypointsVisited];
          if (target.col === nextWp.col && target.row === nextWp.row) {
            this.waypointsVisited++;
          }
        }
        this.pathIndex++;
      } else if (dist > 0) {
        this.x += dx / dist * move;
        this.y += dy / dist * move;
      }
    }
    /**
     * Regenerate this creep's path from its current position through
     * any remaining waypoints to the spawner exit. Used when a tower
     * placement invalidates the existing path mid-wave.
     *
     * Returns true if a valid path was found and applied. If the
     * caller's reroute fails (no path to any remaining waypoint),
     * returns false so the caller can fall back to a plain
     * destination-only A*.
     *
     * `currentCell` is the creep's current logical grid cell (pixel
     * position snapped to the grid). Passed in so the caller doesn't
     * have to duplicate the pixel→cell math.
     */
    rerouteViaWaypoints(grid, currentCell) {
      if (!this.spawnerExit) return false;
      const remaining = this.spawnerWaypoints ? this.spawnerWaypoints.slice(this.waypointsVisited) : [];
      const newPath = remaining.length > 0 ? findPathWithWaypoints(grid, currentCell, remaining, this.spawnerExit) : findPath(grid, currentCell, this.spawnerExit);
      if (!newPath || newPath.length === 0) return false;
      this.path = newPath;
      this.pathIndex = 1;
      return true;
    }
    takeDamage(amount, towerCol, towerRow) {
      if (towerCol !== void 0 && towerRow !== void 0) {
        this.lastHitCol = towerCol;
        this.lastHitRow = towerRow;
      }
      if (this._wagonHits > 0) {
        this._wagonHits--;
        return;
      }
      const auraEvasion = this.statusEffects.getEvasionChance();
      if (auraEvasion > 0 && rng() < auraEvasion) {
        return;
      }
      const amp = this.statusEffects.getDamageAmp();
      this._dmgDebt += amount * amp;
      const amped = Math.floor(this._dmgDebt);
      if (amped <= 0) return;
      this._dmgDebt -= amped;
      const finalDamage = resolveCreepDamage(this.traits, amped);
      if (finalDamage <= 0) return;
      this.hp -= finalDamage;
      if (this.hp <= 0) {
        this.alive = false;
        if (this.sprite) {
          playCreepDeath(this._scene, this.sprite, this._scene.creepFaction ?? "arcane", this._creepTypeId);
          this.sprite = null;
        }
      }
    }
    applySlow(duration, factor) {
      this.statusEffects.apply("slow", duration, factor);
    }
    /** Render this creep's HP bar / shadow / status overlays into a
     *  shared `Graphics` owned by CreepManager. The shared overlay is
     *  cleared once per frame before iterating creeps, so individual
     *  creeps just paint into it without their own clear/destroy
     *  bookkeeping. Headless: short-circuit (HeadlessScene's stubbed
     *  graphics are no-ops anyway, but avoiding the call keeps the
     *  hot loop free of Proxy traps). */
    drawInto(g) {
      if (this._isHeadless) return;
      const baseSize = this.isBoss ? TILE_SIZE2 * 0.45 : TILE_SIZE2 * 0.3;
      const drawSize = baseSize * this.size;
      resolveCreepDraw(this.traits, this, g);
      if (this.sprite) {
        this.sprite.setPosition(this.x, this.y);
        if (this.x < this._prevX) this.sprite.setFlipX(true);
        else if (this.x > this._prevX) this.sprite.setFlipX(false);
        this._prevX = this.x;
        const shadowW = drawSize * 1.6;
        const shadowH = drawSize * 0.5;
        g.fillStyle(0, 0.2);
        g.fillEllipse(this.x, this.y + drawSize * 0.8, shadowW, shadowH);
        if (this.statusEffects.has("confused")) this.sprite.setTint(16711935);
        else if (this.statusEffects.has("root")) this.sprite.setTint(16777215);
        else if (this.statusEffects.has("virus")) this.sprite.setTint(65416);
        else if (this.statusEffects.has("burn")) this.sprite.setTint(16737826);
        else if (this.statusEffects.has("poison")) this.sprite.setTint(4508706);
        else if (this.statusEffects.has("slow")) this.sprite.setTint(6719692);
        else this.sprite.clearTint();
      } else {
        let bodyColor = this.color;
        if (this.statusEffects.has("confused")) bodyColor = 16711935;
        else if (this.statusEffects.has("root")) bodyColor = 16777215;
        else if (this.statusEffects.has("virus")) bodyColor = 65416;
        else if (this.statusEffects.has("burn")) bodyColor = 16737826;
        else if (this.statusEffects.has("poison")) bodyColor = 4508706;
        else if (this.statusEffects.has("slow")) bodyColor = 6719692;
        g.fillStyle(bodyColor, 1);
        g.fillCircle(this.x, this.y, drawSize);
      }
      if (this.statusEffects.has("armor_shred")) {
        g.lineStyle(1, 8913032, 0.6);
        g.strokeCircle(this.x, this.y, drawSize + 2);
      }
      if (this.statusEffects.has("damage_amp")) {
        g.lineStyle(1, 16711680, 0.4);
        g.strokeCircle(this.x, this.y, drawSize + 4);
      }
      const barWidth = TILE_SIZE2 * 0.8;
      const barHeight = 3;
      const barX = this.x - barWidth / 2;
      const barY = this.y - drawSize - 6;
      const hpRatio = this.hp / this.maxHp;
      g.fillStyle(3355443, 1);
      g.fillRect(barX, barY, barWidth, barHeight);
      g.fillStyle(hpRatio > 0.5 ? 4521796 : hpRatio > 0.25 ? 16755200 : 16720418, 1);
      g.fillRect(barX, barY, barWidth * hpRatio, barHeight);
      const shieldTrait = getTrait(this.traits, "shield");
      if (shieldTrait && (shieldTrait._active || shieldTrait._shieldHp > 0)) {
        const shieldMax = Math.floor(this.maxHp * (shieldTrait.hpPercent ?? 0.3));
        const shieldRatio = (shieldTrait._shieldHp ?? 0) / shieldMax;
        g.fillStyle(2236996, 1);
        g.fillRect(barX, barY + barHeight + 1, barWidth, 2);
        g.fillStyle(4491519, 1);
        g.fillRect(barX, barY + barHeight + 1, barWidth * shieldRatio, 2);
      }
    }
  };

  // src/systems/SpawnManager.ts
  init_Rng();
  function seededRandom(seed) {
    let s = seed;
    return () => {
      s = s * 1664525 + 1013904223 & 4294967295;
      return (s >>> 0) / 4294967295;
    };
  }
  var SpawnManager = class {
    constructor(scene, events, difficulty, seed = 0) {
      this.spawnQueue = [];
      this.spawnTimer = 0;
      this.spawnInterval = 0;
      this.flyingPath = null;
      /**
       * Map's spawner list (Circle Co-op waypoint-chained maps) indexed
       * by pathIndex. Attached to every creep at spawn time so reroutes
       * can re-run `findPathWithWaypoints` through the correct remaining
       * waypoints instead of guessing a destination. Null on standard
       * entry→exit maps.
       */
      this.spawners = null;
      /**
       * Circle Co-op: each spawner belongs to a player (spawner index
       * = player index = zone index). Wave creeps that spawn from
       * spawner `i` carry `spawnOwnerIndex = i` so the shared-economy
       * death handler can pay the spawn-owner their half of the kill
       * gold. Disabled on non-Circle maps where spawnOwnerIndex has
       * no meaning (stays null on the creep).
       */
      this.trackSpawnOwnership = false;
      /**
       * Wave-count multiplier for co-op modes. In Circle Co-op we scale
       * creep counts with team size so defence stays challenging — a
       * 4-player match faces 4× the creeps a solo match would. Set
       * once at match start via `setCountMultiplier`; 1 by default so
       * non-co-op modes are unaffected.
       */
      this.countMultiplier = 1;
      /**
       * Per-wave HP ramp for Circle Co-op. Player DPS compounds fast
       * once zones have frontier-paid-for upgrades, so creep HP needs
       * its own additive ramp on top of difficulty + the natural
       * wave-count scaling to keep late game honest. Callback form so
       * the coop side can plug in `(wave) => 1 + wave * 0.035` without
       * SpawnManager caring about wave number at construction time.
       * Default returns 1 (no change) — non-coop modes stay identical.
       */
      this.hpWaveMultiplier = () => 1;
      this.scene = scene;
      this.events = events;
      this.difficulty = difficulty;
      this.seed = seed || Math.floor(Math.random() * 999999);
      this.rng = seededRandom(this.seed);
    }
    /** Attach the map's spawner list so new creeps carry their
     *  spawner's waypoint chain + exit. Call once per map change
     *  (null for non-waypoint maps). */
    setSpawners(spawners) {
      this.spawners = spawners;
    }
    /** Turn on Circle Co-op ownership tagging — every wave creep
     *  spawned from spawner `i` gets `spawnOwnerIndex = i` so the
     *  shared-economy death handler can credit that zone's player
     *  their half of the kill gold. Default off. */
    setTrackSpawnOwnership(enabled) {
      this.trackSpawnOwnership = enabled;
    }
    /** Global creep-count multiplier applied on top of per-creep
     *  difficulty scaling. Used by Circle Co-op to size waves against
     *  team size. 1 = no change. */
    setCountMultiplier(mult) {
      this.countMultiplier = Math.max(1, mult);
    }
    /** Callback that returns an extra HP multiplier per wave. Only
     *  wired in Circle Co-op today (solo / 1v1 leave it at the
     *  default `() => 1`). The callback is evaluated once per
     *  wave-start so the returned factor is stable across the whole
     *  wave's spawns. */
    setHpWaveMultiplier(fn) {
      this.hpWaveMultiplier = fn;
    }
    setFlyingPath(entry, exit) {
      this.flyingPath = [
        { col: entry.col, row: entry.row },
        { col: exit.col, row: exit.row }
      ];
    }
    startWave(waveDef, numPaths = 1) {
      this.spawnQueue = [];
      const difficultyWaveBoost = 1 + waveDef.wave * (this.difficulty.toughnessPerWave ?? 0);
      const coopWaveBoost = this.hpWaveMultiplier(waveDef.wave);
      const hpWaveBoost = difficultyWaveBoost * coopWaveBoost;
      for (const group of waveDef.groups) {
        const ct = CREEP_TYPES[group.creepType];
        if (!ct) continue;
        const resolved = ct.applyDifficulty(this.difficulty);
        const baseCount = group.count * (ct.count || 1);
        let actualCount = Math.round(baseCount * resolved.countMult * this.countMultiplier);
        if (group.creepType === "boss" && numPaths > 1) {
          actualCount = Math.max(actualCount, Math.min(numPaths, 4));
        }
        for (let i = 0; i < actualCount; i++) {
          const groupBurst = ct.spawnBehavior === "group" ? 4 : 1;
          const pathIndex = numPaths > 1 ? i % numPaths : 0;
          this.spawnQueue.push({
            creepType: group.creepType,
            hpScale: group.hpScale * resolved.hpMult * hpWaveBoost,
            speedScale: group.speedScale * resolved.speedMult,
            isBoss: waveDef.isBoss,
            groupBurst,
            pathIndex
          });
        }
      }
      for (let i = this.spawnQueue.length - 1; i > 0; i--) {
        const j = Math.floor(this.rng() * (i + 1));
        [this.spawnQueue[i], this.spawnQueue[j]] = [this.spawnQueue[j], this.spawnQueue[i]];
      }
      this.spawnQueue.sort((a, b) => {
        const ta = CREEP_TYPES[a.creepType]?.spawnOrder === "last" ? 1 : 0;
        const tb = CREEP_TYPES[b.creepType]?.spawnOrder === "last" ? 1 : 0;
        return ta - tb;
      });
      const interval = waveDef.spawnInterval > 0 ? Math.max(30, Math.round(waveDef.spawnInterval / this.countMultiplier)) : 0;
      this.spawnInterval = interval;
      this.spawnTimer = 0;
    }
    /** Pass all available paths. Creeps spawn from the path matching their pathIndex. */
    update(delta, allPaths, creeps) {
      if (this.spawnQueue.length === 0) return;
      if (!allPaths.some((p) => p !== null)) return;
      this.spawnTimer -= delta;
      if (this.spawnTimer <= 0) {
        const entry = this.spawnQueue.shift();
        const ct = CREEP_TYPES[entry.creepType];
        let path = null;
        if (ct?.spawnBehavior === "flying" && this.flyingPath) {
          path = this.flyingPath;
        } else {
          path = allPaths[entry.pathIndex] ?? allPaths.find((p) => p !== null) ?? null;
        }
        if (!path) return;
        const burstCount = entry.groupBurst;
        const spawner = this.spawners ? this.spawners[entry.pathIndex] ?? null : null;
        const channelHpBuff = this.scene._channelHpBuff ?? 0;
        const hpScaleWithBuff = entry.hpScale * (1 + channelHpBuff);
        const sceneAny = this.scene;
        for (let b = 0; b < burstCount; b++) {
          const creep = new Creep(
            this.scene,
            [...path],
            hpScaleWithBuff,
            entry.speedScale,
            entry.isBoss,
            entry.creepType,
            this.scene.creepFaction
          );
          if (channelHpBuff > 0) {
            creep._channelBuff = channelHpBuff;
          }
          if ((sceneAny._pendingWagonCount ?? 0) > 0) {
            creep._wagonHits = 2;
            sceneAny._pendingWagonCount = (sceneAny._pendingWagonCount ?? 0) - 1;
          }
          if (spawner) {
            creep.spawnerWaypoints = spawner.waypoints.map((p) => ({ col: p.col, row: p.row }));
            creep.spawnerExit = { col: spawner.exit.col, row: spawner.exit.row };
          }
          if (this.trackSpawnOwnership) creep.spawnOwnerIndex = entry.pathIndex;
          creeps.push(creep);
          this.events.emit("creepSpawned", entry.creepType);
        }
        if (this.spawnQueue.length > 0) {
          this.spawnTimer = this.spawnInterval;
        }
      }
      this.processSplits(allPaths, creeps);
    }
    processSplits(allPaths, creeps) {
      const newCreeps = [];
      for (const creep of creeps) {
        if (creep.alive || creep.reached) continue;
        if (creep.hp > -900) continue;
        for (const trait of creep.creepType.traits) {
          if (trait.id === "split_on_death") {
            const splitCount = trait.splitCount ?? 2;
            const splitType = trait.splitType ?? "splitter_child";
            const pathIdx = Math.max(0, creep.pathIndex - 1);
            const remainingPath = creep.path.slice(pathIdx);
            if (remainingPath.length < 2) continue;
            for (let s = 0; s < splitCount; s++) {
              const child = new Creep(
                this.scene,
                [...remainingPath],
                creep.maxHp * 0.4,
                creep.baseSpeed / 80,
                false,
                splitType,
                this.scene.creepFaction
              );
              child.x = creep.x + (rng() - 0.5) * TILE_SIZE2;
              child.y = creep.y + (rng() - 0.5) * TILE_SIZE2;
              newCreeps.push(child);
            }
            break;
          }
        }
      }
      creeps.push(...newCreeps);
    }
    /** Spawn a leaked creep mid-wave with specific HP. Used by Circle Co-op. */
    spawnLeakedCreep(scene, path, hp, speed, isBoss, creepType, creeps) {
      if (path.length < 2) return;
      const creep = new Creep(
        scene,
        [...path],
        1,
        // hpScale=1, we override HP directly
        speed / 80,
        // convert back to speed multiplier (CREEP_BASE_SPEED = 80)
        isBoss,
        creepType,
        scene.creepFaction
      );
      creep.hp = Math.round(hp);
      creep.maxHp = Math.round(hp);
      creeps.push(creep);
    }
    isSpawning() {
      return this.spawnQueue.length > 0;
    }
  };

  // src/systems/SendManager.ts
  var SendManager = class {
    constructor(scene, events) {
      this.queuedSends = [];
      this.spawnQueue = [];
      this.spawnTimer = 0;
      this.spawnInterval = 150;
      /** Straight-line path used by flying sends so they bypass the
       *  maze just like flying creeps in regular waves. Synced by
       *  GameScene alongside `SpawnManager.setFlyingPath`. */
      this.flyingPath = null;
      /** M10 finale: when set, sends use THIS path instead of the wave
       *  creep currentPath. Lets the player's sends walk right→left
       *  (into the CPU tower lattice) while wave creeps walk left→right
       *  on the standard path. Null = use whatever the caller passes. */
      this.sendPathOverride = null;
      this.scene = scene;
      this.events = events;
    }
    setFlyingPath(entry, exit) {
      this.flyingPath = [
        { col: entry.col, row: entry.row },
        { col: exit.col, row: exit.row }
      ];
    }
    /** M10 finale: set a per-send path override (right→left walker
     *  through the CPU tower lattice). Pass null to clear. */
    setSendPathOverride(path) {
      this.sendPathOverride = path;
    }
    /** Queue a send. `spawnOwnerIndex` lets the receiver credit the
     *  original sender later (Circle Co-op shared economy: 50% of
     *  the kill gold flows back to whoever's sent creep died). Null
     *  for local tests / standard solo where ownership is irrelevant. */
    queueSend(option, spawnOwnerIndex = null) {
      this.queuedSends.push({ option, spawnOwnerIndex });
    }
    // Called at wave start to generate extra creeps from sends
    activateSends(baseHp, baseSpeed) {
      this.spawnQueue = [];
      for (const send of this.queuedSends) {
        const ct = CREEP_TYPES[send.option.creepType];
        const actualCount = send.option.count * (ct?.count || 1);
        for (let i = 0; i < actualCount; i++) {
          this.spawnQueue.push({
            creepType: send.option.creepType,
            hp: baseHp,
            speed: baseSpeed,
            spawnOwnerIndex: send.spawnOwnerIndex
          });
        }
      }
      this.queuedSends = [];
      this.spawnTimer = 0;
      const count = this.spawnQueue.length;
      if (count <= 5) {
        this.spawnInterval = 200;
      } else if (count <= 15) {
        this.spawnInterval = 120;
      } else {
        this.spawnInterval = Math.max(50, Math.round(3e3 / count));
      }
    }
    update(delta, currentPath, creeps) {
      const effectivePath = this.sendPathOverride ?? currentPath;
      if (this.spawnQueue.length === 0 || !effectivePath) return;
      this.spawnTimer -= delta;
      if (this.spawnTimer <= 0) {
        const batchSize = this.spawnQueue.length > 20 ? 3 : this.spawnQueue.length > 10 ? 2 : 1;
        for (let b = 0; b < batchSize && this.spawnQueue.length > 0; b++) {
          const entry = this.spawnQueue.shift();
          const ct = CREEP_TYPES[entry.creepType];
          const path = ct?.spawnBehavior === "flying" && this.flyingPath ? this.flyingPath : effectivePath;
          const creep = new Creep(
            this.scene,
            [...path],
            entry.hp,
            entry.speed,
            false,
            entry.creepType,
            this.scene.creepFaction
          );
          creep.spawnOwnerIndex = entry.spawnOwnerIndex;
          creep.isSend = true;
          if (this.sendPathOverride) {
            creep.ownerIndex = entry.spawnOwnerIndex ?? 0;
            creep.goalMode = "attacking";
          }
          creeps.push(creep);
        }
        this.spawnTimer = this.spawnInterval;
      }
    }
    isSpawning() {
      return this.spawnQueue.length > 0;
    }
    getPendingSendCount() {
      return this.queuedSends.length;
    }
  };

  // src/systems/TowerManager.ts
  init_config();
  init_Grid();
  init_TowerTypes();
  init_Trait();

  // src/entities/Tower.ts
  init_config();
  init_TowerTypes();

  // src/systems/monetization/StorePersistence.ts
  var STORAGE_KEY = "td_store";
  var MAX_TRANSACTIONS = 200;
  function defaultState() {
    return {
      shards: 0,
      transactions: [],
      ownedSkins: [],
      equippedSkins: {},
      equippedTerrain: null,
      unlockedFactions: [],
      unlockedTerrains: [],
      battlePassPremium: false,
      battlePassSeason: "",
      battlePassXP: 0,
      claimedFreeRewards: [],
      claimedPremiumRewards: [],
      dailyChallenges: [],
      dailyResetDate: "",
      weeklyChallenges: [],
      weeklyResetDate: "",
      freeRollsRemaining: 0,
      freeRollResetDate: "",
      adFree: false,
      gamesPlayed: 0,
      gamesWon: 0,
      discoveredCreeps: [],
      firstWinFactions: []
    };
  }
  var StorePersistence = class _StorePersistence {
    /** Load the full store state, returning defaults for missing fields */
    static load() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return defaultState();
        const parsed = JSON.parse(raw);
        return { ...defaultState(), ...parsed };
      } catch {
        return defaultState();
      }
    }
    /** Save the full store state */
    static save(state2) {
      if (state2.transactions.length > MAX_TRANSACTIONS) {
        state2.transactions = state2.transactions.slice(0, MAX_TRANSACTIONS);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state2));
    }
    /** Load, apply a mutation, and save in one step */
    static update(mutate) {
      const state2 = _StorePersistence.load();
      mutate(state2);
      _StorePersistence.save(state2);
      return state2;
    }
    /** Reset all store data (for testing / debug) */
    static reset() {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  // src/systems/monetization/StoreDefinitions.ts
  init_Factions();
  init_TowerTypes();
  var TOWER_SKIN_THEMES = {
    arcane: [{ suffix: "corrupted", label: "Corrupted", description: "Green corruption theme", rarity: "epic" }, { suffix: "sandstone", label: "Sandstone", description: "Desert ruins", rarity: "common" }, { suffix: "moonstone", label: "Moonstone", description: "Silver-blue lunar", rarity: "rare" }, { suffix: "blood_magic", label: "Blood Magic", description: "Dark crimson", rarity: "epic" }],
    mechanical: [{ suffix: "gilded", label: "Gilded", description: "Bright gold", rarity: "epic" }, { suffix: "factory_fresh", label: "Factory Fresh", description: "Clean silver", rarity: "common" }],
    nature: [{ suffix: "autumn", label: "Autumn", description: "Fall fire colors", rarity: "common" }],
    void: [{ suffix: "whiteout", label: "Whiteout", description: "Bleached white", rarity: "common" }],
    military: [{ suffix: "desert_storm", label: "Desert Storm", description: "Desert camo", rarity: "rare" }, { suffix: "arctic", label: "Arctic", description: "Ice blue camo", rarity: "common" }],
    celestial: [{ suffix: "fallen", label: "Fallen", description: "Tarnished dark", rarity: "common" }],
    infernal: [{ suffix: "frostfire", label: "Frostfire", description: "Blue flames", rarity: "common" }],
    psionic: [{ suffix: "emerald", label: "Emerald", description: "Green glow", rarity: "common" }],
    aliens: [{ suffix: "albino", label: "Albino", description: "Pale pink/white", rarity: "common" }],
    cypherpunk: [{ suffix: "cyber_sakura", label: "Cyber Sakura", description: "Pink sakura theme", rarity: "epic" }, { suffix: "redline", label: "Redline", description: "Overheated red", rarity: "common" }, { suffix: "offline", label: "Offline", description: "Powered down gray", rarity: "common" }],
    harmonic: [{ suffix: "heavy_metal", label: "Heavy Metal", description: "Chrome/gunmetal", rarity: "common" }, { suffix: "neon_rave", label: "Neon Rave", description: "Neon rainbow chaos", rarity: "rare" }, { suffix: "synthwave", label: "Synthwave", description: "80s sunset pink/purple", rarity: "epic" }],
    // Meta-factions get no skins — chaos has no fixed tower set, random
    // resolves before any skin lookup. Empty arrays satisfy the
    // Record<FactionId, ...> exhaustiveness check.
    chaos: [],
    random: [],
    coalition: []
  };
  var RARITY_UP = {
    common: "rare",
    rare: "epic",
    epic: "legendary",
    legendary: "legendary"
  };
  function generateTowerSkins() {
    const skins = [];
    for (const [factionId, themes] of Object.entries(TOWER_SKIN_THEMES)) {
      if (factionId === "chaos" || factionId === "random" || !themes.length) continue;
      const faction = FACTIONS[factionId];
      if (!faction) continue;
      for (const theme of themes) {
        for (const towerId of faction.towerIds) {
          const towerName = towerId.split("_").slice(1).map((w) => w[0].toUpperCase() + w.slice(1)).join(" ") || towerId;
          const isUlt = TOWER_TYPES[towerId]?.ultimate === true;
          skins.push({
            id: `${towerId}_${theme.suffix}`,
            name: `${theme.label} ${towerName}`,
            description: theme.description,
            rarity: isUlt ? RARITY_UP[theme.rarity] : theme.rarity,
            target: "tower",
            faction: factionId,
            towerId,
            shardCost: 0,
            assetSuffix: `_${theme.suffix}`
          });
        }
      }
    }
    return skins;
  }
  var TOWER_SKINS = generateTowerSkins();
  var SKIN_DEFS = [
    // ── Faction-wide skins (direct purchase) — bundle the matching hero skin ──
    // Pricing: ~50% bump over old prices to reflect the bundled hero skin value.
    // Old common 400→600, rare 800→1200, epic 1200→1800.
    {
      id: "arcane_pack_corrupted",
      name: "Corrupted Arcane Pack",
      description: "All Arcane towers + Arcanist \u2014 green corruption",
      rarity: "epic",
      target: "tower_faction",
      faction: "arcane",
      shardCost: 1800,
      assetSuffix: "_corrupted",
      bundles: ["arcanist_skin_corrupted"],
      dockStyle: { borderColor: "#22aa44", glowColor: "#22aa4466", bgTint: "#0a1a0a" }
    },
    {
      id: "arcane_pack_sandstone",
      name: "Sandstone Arcane Pack",
      description: "All Arcane towers + Arcanist \u2014 desert ruins",
      rarity: "common",
      target: "tower_faction",
      faction: "arcane",
      shardCost: 600,
      assetSuffix: "_sandstone",
      bundles: ["arcanist_skin_sandstone"],
      dockStyle: { borderColor: "#bb8855", glowColor: "#bb885544", bgTint: "#140e08" }
    },
    {
      id: "arcane_pack_moonstone",
      name: "Moonstone Arcane Pack",
      description: "All Arcane towers + Arcanist \u2014 silver-blue lunar",
      rarity: "rare",
      target: "tower_faction",
      faction: "arcane",
      shardCost: 1200,
      assetSuffix: "_moonstone",
      bundles: ["arcanist_skin_moonstone"],
      dockStyle: { borderColor: "#99aacc", glowColor: "#99aacc55", bgTint: "#0a0e14" }
    },
    {
      id: "arcane_pack_blood",
      name: "Blood Magic Pack",
      description: "All Arcane towers + Arcanist \u2014 dark crimson",
      rarity: "epic",
      target: "tower_faction",
      faction: "arcane",
      shardCost: 1800,
      assetSuffix: "_blood_magic",
      bundles: ["arcanist_skin_blood_magic"],
      dockStyle: { borderColor: "#cc3344", glowColor: "#cc334466", bgTint: "#1a0808" }
    },
    {
      id: "mil_pack_desert_storm",
      name: "Desert Storm Pack",
      description: "All Military towers + Warden \u2014 desert camo",
      rarity: "rare",
      target: "tower_faction",
      faction: "military",
      shardCost: 1200,
      assetSuffix: "_desert_storm",
      bundles: ["warden_skin_desert_storm"],
      dockStyle: { borderColor: "#ccaa66", glowColor: "#ccaa6644", bgTint: "#1a1508" }
    },
    {
      id: "cyber_pack_sakura",
      name: "Cyber Sakura Pack",
      description: "All Cypherpunk towers + Duelist \u2014 pink sakura",
      rarity: "epic",
      target: "tower_faction",
      faction: "cypherpunk",
      shardCost: 1800,
      assetSuffix: "_cyber_sakura",
      bundles: ["duelist_skin_cyber_sakura"],
      dockStyle: { borderColor: "#ff0088", glowColor: "#ff008866", bgTint: "#1a0a1a" }
    },
    {
      id: "cyber_pack_redline",
      name: "Redline Pack",
      description: "All Cypherpunk towers + Duelist \u2014 overheated red",
      rarity: "common",
      target: "tower_faction",
      faction: "cypherpunk",
      shardCost: 600,
      assetSuffix: "_redline",
      bundles: ["duelist_skin_redline"],
      dockStyle: { borderColor: "#ff4422", glowColor: "#ff442266", bgTint: "#1a0804" }
    },
    {
      id: "cyber_pack_offline",
      name: "Offline Pack",
      description: "All Cypherpunk towers + Duelist \u2014 powered down",
      rarity: "common",
      target: "tower_faction",
      faction: "cypherpunk",
      shardCost: 600,
      assetSuffix: "_offline",
      bundles: ["duelist_skin_offline"],
      dockStyle: { borderColor: "#556677", glowColor: "#55667733", bgTint: "#0a0e14" }
    },
    {
      id: "mech_pack_gilded",
      name: "Gilded Mechanical Pack",
      description: "All Mechanical towers + Engineer \u2014 bright gold",
      rarity: "epic",
      target: "tower_faction",
      faction: "mechanical",
      shardCost: 1800,
      assetSuffix: "_gilded",
      bundles: ["engineer_skin_gilded"],
      dockStyle: { borderColor: "#ffdd22", glowColor: "#ffdd2288", bgTint: "#1a1200" }
    },
    {
      id: "mech_pack_factory",
      name: "Factory Fresh Pack",
      description: "All Mechanical towers + Engineer \u2014 clean silver",
      rarity: "common",
      target: "tower_faction",
      faction: "mechanical",
      shardCost: 600,
      assetSuffix: "_factory_fresh",
      bundles: ["engineer_skin_factory_fresh"],
      dockStyle: { borderColor: "#ccccee", glowColor: "#ccccee44", bgTint: "#0e0e14" }
    },
    {
      id: "nature_pack_autumn",
      name: "Autumn Nature Pack",
      description: "All Nature towers + Druid \u2014 fall fire colors",
      rarity: "common",
      target: "tower_faction",
      faction: "nature",
      shardCost: 600,
      assetSuffix: "_autumn",
      bundles: ["druid_skin_autumn"],
      dockStyle: { borderColor: "#dd4411", glowColor: "#dd441166", bgTint: "#1a0a02" }
    },
    {
      id: "mil_pack_arctic",
      name: "Arctic Military Pack",
      description: "All Military towers + Warden \u2014 ice blue camo",
      rarity: "common",
      target: "tower_faction",
      faction: "military",
      shardCost: 600,
      assetSuffix: "_arctic",
      bundles: ["warden_skin_arctic"],
      dockStyle: { borderColor: "#aabbdd", glowColor: "#aabbdd44", bgTint: "#0a0e1a" }
    },
    {
      id: "infernal_pack_frostfire",
      name: "Frostfire Infernal Pack",
      description: "All Infernal towers + Berserker \u2014 blue flames",
      rarity: "common",
      target: "tower_faction",
      faction: "infernal",
      shardCost: 600,
      assetSuffix: "_frostfire",
      bundles: ["berserker_skin_frostfire"],
      dockStyle: { borderColor: "#4488ff", glowColor: "#4488ff66", bgTint: "#0a0a1a" }
    },
    {
      id: "aliens_pack_albino",
      name: "Albino Aliens Pack",
      description: "All Alien towers + Necromancer \u2014 pale pink/white",
      rarity: "common",
      target: "tower_faction",
      faction: "aliens",
      shardCost: 600,
      assetSuffix: "_albino",
      bundles: ["necromancer_skin_albino"],
      dockStyle: { borderColor: "#ffcccc", glowColor: "#ffcccc44", bgTint: "#1a1215" }
    },
    {
      id: "void_pack_whiteout",
      name: "Whiteout Void Pack",
      description: "All Void towers + Shadow \u2014 bleached white",
      rarity: "common",
      target: "tower_faction",
      faction: "void",
      shardCost: 600,
      assetSuffix: "_whiteout",
      bundles: ["shadow_skin_whiteout"],
      dockStyle: { borderColor: "#ccccdd", glowColor: "#ccccdd55", bgTint: "#141418" }
    },
    {
      id: "celestial_pack_fallen",
      name: "Fallen Celestial Pack",
      description: "All Celestial towers + Paladin \u2014 tarnished dark",
      rarity: "common",
      target: "tower_faction",
      faction: "celestial",
      shardCost: 600,
      assetSuffix: "_fallen",
      bundles: ["paladin_skin_fallen"],
      dockStyle: { borderColor: "#886655", glowColor: "#88665544", bgTint: "#141010" }
    },
    {
      id: "psionic_pack_emerald",
      name: "Emerald Mind Pack",
      description: "All Psionic towers + Monk \u2014 green glow",
      rarity: "common",
      target: "tower_faction",
      faction: "psionic",
      shardCost: 600,
      assetSuffix: "_emerald",
      bundles: ["monk_skin_emerald"],
      dockStyle: { borderColor: "#44cc66", glowColor: "#44cc6666", bgTint: "#0a1a0e" }
    },
    {
      id: "harmonic_pack_heavy_metal",
      name: "Heavy Metal Pack",
      description: "All Harmonic towers + Ranger \u2014 chrome/gunmetal",
      rarity: "common",
      target: "tower_faction",
      faction: "harmonic",
      shardCost: 600,
      assetSuffix: "_heavy_metal",
      bundles: ["ranger_skin_heavy_metal"],
      dockStyle: { borderColor: "#888899", glowColor: "#88889944", bgTint: "#0e0e12" }
    },
    {
      id: "harmonic_pack_neon_rave",
      name: "Neon Rave Pack",
      description: "All Harmonic towers + Ranger \u2014 neon rainbow",
      rarity: "rare",
      target: "tower_faction",
      faction: "harmonic",
      shardCost: 1200,
      assetSuffix: "_neon_rave",
      bundles: ["ranger_skin_neon_rave"],
      dockStyle: { borderColor: "#ff00ff", glowColor: "#ff00ff88", bgTint: "#0a050a" }
    },
    {
      id: "harmonic_pack_synthwave",
      name: "Synthwave Pack",
      description: "All Harmonic towers + Ranger \u2014 80s sunset",
      rarity: "epic",
      target: "tower_faction",
      faction: "harmonic",
      shardCost: 1800,
      assetSuffix: "_synthwave",
      bundles: ["ranger_skin_synthwave"],
      dockStyle: { borderColor: "#ff6688", glowColor: "#ff668888", bgTint: "#1a0a11" }
    },
    // ── Hero skins ──
    // Rarity is bumped one tier above the matching tower-pack theme (common→rare,
    // rare→epic, epic→legendary) since one hero per faction is a more premium
    // drop than a tower-pack. Direct-purchase prices match the bumped tier.
    // Generated at runtime via palette-swap — see HeroSkinPalettes.ts.
    // Arcane — Arcanist
    { id: "arcanist_skin_corrupted", name: "Corrupted Arcanist", description: "Green corruption seeps through the robes", rarity: "legendary", target: "hero", heroId: "arcanist", shardCost: 1500, assetSuffix: "_corrupted", dockStyle: { borderColor: "#22aa44", glowColor: "#22aa4466", bgTint: "#0a1a0a" } },
    { id: "arcanist_skin_sandstone", name: "Sandstone Arcanist", description: "Desert-weathered wanderer", rarity: "rare", target: "hero", heroId: "arcanist", shardCost: 400, assetSuffix: "_sandstone", dockStyle: { borderColor: "#bb8855", glowColor: "#bb885544", bgTint: "#140e08" } },
    { id: "arcanist_skin_moonstone", name: "Moonstone Arcanist", description: "Silver-blue lunar mage", rarity: "epic", target: "hero", heroId: "arcanist", shardCost: 600, assetSuffix: "_moonstone", dockStyle: { borderColor: "#99aacc", glowColor: "#99aacc55", bgTint: "#0a0e14" } },
    { id: "arcanist_skin_blood_magic", name: "Blood Magic Arcanist", description: "Crimson dark magic adept", rarity: "legendary", target: "hero", heroId: "arcanist", shardCost: 1500, assetSuffix: "_blood_magic", dockStyle: { borderColor: "#cc3344", glowColor: "#cc334466", bgTint: "#1a0808" } },
    // Mechanical — Engineer
    { id: "engineer_skin_gilded", name: "Gilded Engineer", description: "Bright gold industrialist", rarity: "legendary", target: "hero", heroId: "engineer", shardCost: 1500, assetSuffix: "_gilded", dockStyle: { borderColor: "#ffdd22", glowColor: "#ffdd2288", bgTint: "#1a1200" } },
    { id: "engineer_skin_factory_fresh", name: "Factory Fresh Engineer", description: "Clean silver tinker", rarity: "rare", target: "hero", heroId: "engineer", shardCost: 400, assetSuffix: "_factory_fresh", dockStyle: { borderColor: "#ccccee", glowColor: "#ccccee44", bgTint: "#0e0e14" } },
    // Nature — Druid
    { id: "druid_skin_autumn", name: "Autumn Druid", description: "Fall fire colors", rarity: "rare", target: "hero", heroId: "druid", shardCost: 400, assetSuffix: "_autumn", dockStyle: { borderColor: "#dd4411", glowColor: "#dd441166", bgTint: "#1a0a02" } },
    // Void — Shadow
    { id: "shadow_skin_whiteout", name: "Whiteout Shadow", description: "Bleached to nothing", rarity: "rare", target: "hero", heroId: "shadow", shardCost: 400, assetSuffix: "_whiteout", dockStyle: { borderColor: "#ccccdd", glowColor: "#ccccdd55", bgTint: "#141418" } },
    // Military — Warden
    { id: "warden_skin_desert_storm", name: "Desert Storm Warden", description: "Desert camo commander", rarity: "epic", target: "hero", heroId: "warden", shardCost: 600, assetSuffix: "_desert_storm", dockStyle: { borderColor: "#ccaa66", glowColor: "#ccaa6644", bgTint: "#1a1508" } },
    { id: "warden_skin_arctic", name: "Arctic Warden", description: "Ice blue cold-weather loadout", rarity: "rare", target: "hero", heroId: "warden", shardCost: 400, assetSuffix: "_arctic", dockStyle: { borderColor: "#aabbdd", glowColor: "#aabbdd44", bgTint: "#0a0e1a" } },
    // Aliens — Necromancer
    { id: "necromancer_skin_albino", name: "Albino Necromancer", description: "Pale pink/white variant", rarity: "rare", target: "hero", heroId: "necromancer", shardCost: 400, assetSuffix: "_albino", dockStyle: { borderColor: "#ffcccc", glowColor: "#ffcccc44", bgTint: "#1a1215" } },
    // Cypherpunk — Duelist
    { id: "duelist_skin_cyber_sakura", name: "Cyber Sakura Duelist", description: "Pink sakura netrunner", rarity: "legendary", target: "hero", heroId: "duelist", shardCost: 1500, assetSuffix: "_cyber_sakura", dockStyle: { borderColor: "#ff0088", glowColor: "#ff008866", bgTint: "#1a0a1a" } },
    { id: "duelist_skin_redline", name: "Redline Duelist", description: "Overheated red", rarity: "rare", target: "hero", heroId: "duelist", shardCost: 400, assetSuffix: "_redline", dockStyle: { borderColor: "#ff4422", glowColor: "#ff442266", bgTint: "#1a0804" } },
    { id: "duelist_skin_offline", name: "Offline Duelist", description: "Powered down gray", rarity: "rare", target: "hero", heroId: "duelist", shardCost: 400, assetSuffix: "_offline", dockStyle: { borderColor: "#556677", glowColor: "#55667733", bgTint: "#0a0e14" } },
    // Infernal — Berserker
    { id: "berserker_skin_frostfire", name: "Frostfire Berserker", description: "Blue flames", rarity: "rare", target: "hero", heroId: "berserker", shardCost: 400, assetSuffix: "_frostfire", dockStyle: { borderColor: "#4488ff", glowColor: "#4488ff66", bgTint: "#0a0a1a" } },
    // Celestial — Paladin
    { id: "paladin_skin_fallen", name: "Fallen Paladin", description: "Tarnished dark armor", rarity: "rare", target: "hero", heroId: "paladin", shardCost: 400, assetSuffix: "_fallen", dockStyle: { borderColor: "#886655", glowColor: "#88665544", bgTint: "#141010" } },
    // Psionic — Monk
    { id: "monk_skin_emerald", name: "Emerald Monk", description: "Green glow psychic", rarity: "rare", target: "hero", heroId: "monk", shardCost: 400, assetSuffix: "_emerald", dockStyle: { borderColor: "#44cc66", glowColor: "#44cc6666", bgTint: "#0a1a0e" } },
    // Harmonic — Ranger
    { id: "ranger_skin_heavy_metal", name: "Heavy Metal Ranger", description: "Chrome/gunmetal", rarity: "rare", target: "hero", heroId: "ranger", shardCost: 400, assetSuffix: "_heavy_metal", dockStyle: { borderColor: "#888899", glowColor: "#88889944", bgTint: "#0e0e12" } },
    { id: "ranger_skin_neon_rave", name: "Neon Rave Ranger", description: "Neon rainbow chaos", rarity: "epic", target: "hero", heroId: "ranger", shardCost: 600, assetSuffix: "_neon_rave", dockStyle: { borderColor: "#ff00ff", glowColor: "#ff00ff88", bgTint: "#0a050a" } },
    { id: "ranger_skin_synthwave", name: "Synthwave Ranger", description: "80s sunset pink/purple", rarity: "legendary", target: "hero", heroId: "ranger", shardCost: 1500, assetSuffix: "_synthwave", dockStyle: { borderColor: "#ff6688", glowColor: "#ff668888", bgTint: "#1a0a11" } },
    // ── Per-tower skins (roll-only) ──
    ...TOWER_SKINS
  ];
  function getSkinDef(skinId) {
    return SKIN_DEFS.find((s) => s.id === skinId);
  }

  // src/systems/monetization/SkinManager.ts
  var FACTION_TOWER_SHEET = {
    void: "void_towers",
    arcane: "arcane_towers",
    mechanical: "mech_towers",
    nature: "nature_towers",
    military: "mil_towers",
    aliens: "alien_towers",
    cypherpunk: "cyber_towers",
    infernal: "infernal_towers",
    celestial: "celestial_towers",
    psionic: "psionic_towers",
    harmonic: "harmonic_towers"
  };
  var FACTION_PROJ_SHEET = {
    void: "void_proj",
    arcane: "arcane_proj",
    mechanical: "mech_proj",
    nature: "nature_proj",
    military: "mil_proj",
    aliens: "alien_proj",
    cypherpunk: "cyber_proj",
    infernal: "infernal_proj",
    celestial: "celestial_proj",
    psionic: "psionic_proj",
    harmonic: "harmonic_proj"
  };
  var FACTION_HERO_SHEET = {
    void: "void_hero",
    arcane: "arcane_hero",
    mechanical: "mech_hero",
    nature: "nature_hero",
    military: "mil_hero",
    aliens: "alien_hero",
    cypherpunk: "cyber_hero",
    infernal: "infernal_hero",
    celestial: "celestial_hero",
    psionic: "psionic_hero",
    harmonic: "harmonic_hero"
  };
  var FACTION_CREEP_SHEET = {
    void: "creeps_void",
    arcane: "creeps_arcane",
    mechanical: "creeps_mechanical",
    nature: "creeps_nature",
    military: "creeps_military",
    aliens: "creeps_aliens",
    cypherpunk: "creeps_cypherpunk",
    infernal: "creeps_infernal",
    celestial: "creeps_celestial",
    psionic: "creeps_psionic",
    harmonic: "creeps_harmonic"
  };
  var HERO_FACTION = {
    shadow: "void",
    arcanist: "arcane",
    engineer: "mechanical",
    druid: "nature",
    warden: "military",
    necromancer: "aliens",
    duelist: "cypherpunk",
    berserker: "infernal",
    paladin: "celestial",
    monk: "psionic",
    ranger: "harmonic"
  };
  var FACTION_TO_THEME_ID = {
    arcane: "arcane_crystal",
    mechanical: "factory",
    nature: "ancient_grove",
    void: "void_rift",
    military: "urban",
    aliens: "hive",
    cypherpunk: "circuit",
    infernal: "hellscape",
    celestial: "marble",
    psionic: "neural",
    harmonic: "concert",
    // Both meta-factions fall back to 'generic' — chaos rotates per
    // wave and has no fixed theme; random is resolved before any
    // theme lookup happens but is kept here for type completeness.
    chaos: "generic",
    random: "generic",
    coalition: "generic"
  };
  var OVERRIDE_SUPPRESSED_MODES = /* @__PURE__ */ new Set(["gauntlet"]);
  var SkinManagerClass = class {
    getSuffix(slotKey) {
      const state2 = StorePersistence.load();
      const skinId = state2.equippedSkins[slotKey];
      if (!skinId) return null;
      const def2 = getSkinDef(skinId);
      return def2?.assetSuffix ?? null;
    }
    /**
     * Resolve the tower spritesheet key. Checks per-tower skin first,
     * then faction-wide skin, then returns the default.
     */
    getTowerSheetKey(faction, towerId) {
      const base = FACTION_TOWER_SHEET[faction];
      if (!base) return "";
      if (towerId) {
        const towerSuffix = this.getSuffix(`tower:${towerId}`);
        if (towerSuffix) return base + towerSuffix;
      }
      const factionSuffix = this.getSuffix(`towerfaction:${faction}`);
      return factionSuffix ? base + factionSuffix : base;
    }
    /**
     * Resolve the projectile spritesheet key. Same priority as towers.
     */
    getProjectileSheetKey(faction, towerId) {
      const base = FACTION_PROJ_SHEET[faction];
      if (!base) return "";
      if (towerId) {
        const towerSuffix = this.getSuffix(`tower:${towerId}`);
        if (towerSuffix) return base + towerSuffix;
      }
      const factionSuffix = this.getSuffix(`towerfaction:${faction}`);
      return factionSuffix ? base + factionSuffix : base;
    }
    /**
     * Get the skin asset suffix for a tower (per-tower first, then faction-wide).
     * Returns the suffix string (e.g. '_desert_storm') or null if no skin equipped.
     * Used by mobile unit skin resolution.
     */
    getSkinSuffix(faction, towerId) {
      if (towerId) {
        const towerSuffix = this.getSuffix(`tower:${towerId}`);
        if (towerSuffix) return towerSuffix;
      }
      return this.getSuffix(`towerfaction:${faction}`);
    }
    getHeroSheetKey(heroId) {
      const base = FACTION_HERO_SHEET[HERO_FACTION[heroId] ?? ""];
      if (!base) return "";
      const heroSuffix = this.getSuffix(`hero:${heroId}`);
      if (heroSuffix) return base + heroSuffix;
      return base;
    }
    getCreepSheetKey(faction) {
      const base = FACTION_CREEP_SHEET[faction];
      if (!base) return "";
      const suffix = this.getSuffix(`creep:${faction}`);
      return suffix ? base + suffix : base;
    }
    getTerrainOverrideFaction() {
      const state2 = StorePersistence.load();
      if (!state2.equippedTerrain) return null;
      const THEME_TO_FACTION = {
        theme_arcane: "arcane",
        theme_mechanical: "mechanical",
        theme_nature: "nature",
        theme_void: "void",
        theme_military: "military",
        theme_celestial: "celestial",
        theme_infernal: "infernal",
        theme_psionic: "psionic",
        theme_aliens: "aliens",
        theme_cypherpunk: "cypherpunk",
        theme_harmonic: "harmonic"
      };
      return THEME_TO_FACTION[state2.equippedTerrain] ?? null;
    }
    /** Map a FactionId to its render-side themeId — the key used by
     *  THEMES (TerrainTheme.ts) and FACTION_TERRAINS (TerrainManager.ts).
     *  Used by the terrain override resolver and by the random map
     *  generator's theme picker. */
    factionToThemeId(faction) {
      return FACTION_TO_THEME_ID[faction] ?? "generic";
    }
    /** Resolve the active themeId for a scene about to render. Single
     *  source of truth: GameScene.drawGrid asks here, gets back the
     *  themeId to feed into TerrainManager.compute().
     *
     *  Resolution order:
     *    1. Faction Gauntlet  → ignore override; map default
     *    2. Custom maps       → ignore override; map default
     *    3. Coop guest        → host's broadcast theme; falls back to map default
     *    4. Coop host / 1v1 / single-player → local equipped override; falls back to map default
     *
     *  Multiplayer note: 1v1 Versus runs each player on their own
     *  grid, so each peer applies their own override independently —
     *  no host concept. Coop shares a grid, so only one theme can
     *  render; the host's choice wins (see #3 / #4).
     */
    getActiveTerrainTheme(ctx) {
      const fallback = ctx.mapTheme ?? "generic";
      if (OVERRIDE_SUPPRESSED_MODES.has(ctx.matchMode)) return fallback;
      if (ctx.isCustomMap) return fallback;
      if (ctx.matchMode === "circle_coop" && ctx.isCoopHost === false) {
        return ctx.hostOverrideTheme ?? fallback;
      }
      const faction = this.getTerrainOverrideFaction();
      if (!faction) return fallback;
      return this.factionToThemeId(faction);
    }
    isTextureLoaded(scene, key) {
      return scene.textures.exists(key);
    }
    resolveWithFallback(scene, skinnedKey, baseKey) {
      return scene.textures.exists(skinnedKey) ? skinnedKey : baseKey;
    }
  };
  var SkinManager = new SkinManagerClass();

  // src/systems/SpriteManager.ts
  function factionTowers(sheetKey2, towerIds, levels) {
    const cfg = {};
    for (let i = 0; i < towerIds.length; i++) {
      const maxLevel = levels?.[i] ?? 1;
      cfg[towerIds[i]] = {
        sheetKey: sheetKey2,
        column: i,
        totalCols: towerIds.length,
        rows: { idle: 0, charge: 1, fire: 2, cooldown: 3 },
        maxLevel,
        rowsPerLevel: 4
      };
    }
    return cfg;
  }
  function factionProj(sheetKey2, towerIds) {
    const cfg = {};
    for (let i = 0; i < towerIds.length; i++) {
      cfg[towerIds[i]] = {
        sheetKey: sheetKey2,
        column: i,
        totalCols: towerIds.length,
        travelRows: [0, 1, 2],
        impactRows: [3, 4, 5]
      };
    }
    return cfg;
  }
  var TOWER_SPRITE_CONFIGS = {
    // Level counts: how many upgrade levels each tower has (matches TowerTypes.ts)
    ...factionTowers(
      "void_towers",
      ["void_gambler", "void_spike", "void_siphon", "void_rift", "void_oblivion"],
      [4, 6, 6, 3, 1]
    ),
    ...factionTowers(
      "arcane_towers",
      ["arcane_bolt", "arcane_frost", "arcane_storm", "arcane_focus", "arcane_drain", "arcane_meteor", "arcane_nova", "arcane_conduit"],
      [4, 3, 5, 4, 4, 3, 1, 1]
    ),
    ...factionTowers(
      "mech_towers",
      [
        "mech_wall",
        "mech_turret",
        "mech_flamethrower",
        "mech_tesla",
        "mech_mortar",
        "mech_shredder",
        "mech_railgun",
        "mech_titan",
        "mech_piercer"
      ],
      [4, 6, 5, 4, 4, 5, 3, 3, 4]
    ),
    // NOTE: mech_piercer (9th col) is only reachable via Turret's L2
    // branch — not a dock-selectable starter. Column reserved here so
    // SpriteManager knows about it; the black-barrel art goes in
    // mech_towers.png col 9 when ready.
    // 9-tower Nature sprite layout, matching the regenerated
    // `nature_towers.png` (576×1536, 9 cols × 24 rows). The 9th
    // entry (`nature_razor_bramble`) is NOT a selectable starter —
    // it's only reachable via Bramble's L2 branch. Kept here so the
    // skin editor + SpriteManager know about its column.
    ...factionTowers(
      "nature_towers",
      [
        "nature_bramble",
        "nature_root",
        "nature_viper",
        "nature_blossom",
        "nature_spore",
        "nature_sunroot",
        "nature_vine",
        "nature_elder",
        "nature_razor_bramble"
      ],
      [5, 2, 3, 3, 3, 3, 3, 1, 3]
    ),
    ...factionTowers(
      "mil_towers",
      ["mil_sandbag", "mil_wire", "mil_rifleman", "mil_sniper", "mil_heavy", "mil_artillery", "mil_commander"],
      [2, 4, 5, 5, 3, 3]
    ),
    ...factionTowers(
      "alien_towers",
      ["alien_spitter", "alien_stinger", "alien_swarm_node", "alien_acid", "alien_hive_spire", "alien_brood_mother", "alien_swarmling", "alien_overmind"],
      [4, 3, 3, 4, 4, 3, 2, 3]
    ),
    ...factionTowers(
      "cyber_towers",
      ["cyber_ping", "cyber_firewall", "cyber_virus", "cyber_backdoor", "cyber_ddos", "cyber_rootkit", "cyber_zeroday"],
      [4, 4, 5, 4, 3, 2, 1]
    ),
    ...factionTowers(
      "infernal_towers",
      ["infernal_imp", "infernal_hellfire", "infernal_soul_drain", "infernal_bomber", "infernal_immolate", "infernal_apocalypse"],
      [3, 4, 3, 2, 2, 3]
    ),
    ...factionTowers(
      "celestial_towers",
      ["celestial_acolyte", "celestial_ward", "celestial_smite", "celestial_martyr", "celestial_prophet", "celestial_absolution"],
      [5, 5, 4, 3, 3, 2]
    ),
    ...factionTowers(
      "psionic_towers",
      ["psi_probe", "psi_mesmer", "psi_terror", "psi_mind_spike", "psi_overmind"],
      [5, 4, 4, 3, 4]
    ),
    ...factionTowers(
      "harmonic_towers",
      ["harmonic_resonator", "harmonic_amplifier", "harmonic_quickener", "harmonic_reach", "harmonic_critical_mass", "harmonic_conduit", "harmonic_crescendo"],
      [6, 4, 3, 3, 4, 3, 1]
    ),
    // Coalition (Arcane-campaign default kit) — 5 columns, 1 level each.
    // arrow / cannon / sniper currently fall back to Graphics primitives
    // when no faction-defaulted sprite exists; mapping them to the
    // Coalition sheet here means the Random faction roller also picks
    // up the Coalition art for these generics (acceptable — they're
    // visually neutral).
    ...factionTowers(
      "coalition_towers",
      ["arrow", "cannon", "sniper", "coalition_wall", "coalition_root"],
      [1, 1, 1, 1, 1]
    )
  };
  var PROJECTILE_SPRITE_CONFIGS = {
    ...factionProj("void_proj", ["void_gambler", "void_spike", "void_siphon", "void_rift", "void_oblivion"]),
    ...factionProj("arcane_proj", ["arcane_bolt", "arcane_frost", "arcane_storm", "arcane_focus", "arcane_drain", "arcane_meteor", "arcane_nova"]),
    ...factionProj("mech_proj", ["mech_wall", "mech_turret", "mech_flamethrower", "mech_tesla", "mech_mortar", "mech_shredder", "mech_railgun", "mech_titan"]),
    ...factionProj(
      "nature_proj",
      [
        "nature_bramble",
        "nature_root",
        "nature_viper",
        "nature_blossom",
        "nature_spore",
        "nature_sunroot",
        "nature_vine",
        "nature_elder",
        "nature_razor_bramble"
      ]
    ),
    ...factionProj("mil_proj", ["mil_sandbag", "mil_wire", "mil_rifleman", "mil_brawler", "mil_heavy", "mil_commander"]),
    ...factionProj("alien_proj", ["alien_spitter", "alien_stinger", "alien_swarm_node", "alien_acid", "alien_hive_spire", "alien_brood_mother", "alien_swarmling", "alien_overmind"]),
    ...factionProj("cyber_proj", ["cyber_ping", "cyber_firewall", "cyber_virus", "cyber_backdoor", "cyber_ddos", "cyber_rootkit", "cyber_zeroday"]),
    ...factionProj("infernal_proj", ["infernal_imp", "infernal_hellfire", "infernal_soul_drain", "infernal_bomber", "infernal_immolate", "infernal_apocalypse"]),
    ...factionProj("celestial_proj", ["celestial_acolyte", "celestial_ward", "celestial_smite", "celestial_martyr", "celestial_prophet", "celestial_absolution"]),
    ...factionProj("psionic_proj", ["psi_probe", "psi_mesmer", "psi_terror", "psi_mind_spike", "psi_overmind"]),
    ...factionProj("harmonic_proj", ["harmonic_resonator", "harmonic_amplifier", "harmonic_quickener", "harmonic_reach", "harmonic_critical_mass", "harmonic_conduit", "harmonic_crescendo"]),
    ...factionProj("coalition_proj", ["arrow", "cannon", "sniper", "coalition_wall", "coalition_root"])
  };
  var MOBILE_SPRITE_CONFIGS = {
    mil_rifleman: { sheetKey: "mobile_mil_rifleman", frameWidth: 32, frameHeight: 32, cols: 4 },
    mil_brawler: { sheetKey: "mobile_mil_brawler", frameWidth: 32, frameHeight: 32, cols: 4 },
    mil_heavy: { sheetKey: "mobile_mil_heavy", frameWidth: 32, frameHeight: 32, cols: 4 },
    mil_commander: { sheetKey: "mobile_mil_commander", frameWidth: 32, frameHeight: 32, cols: 4 },
    alien_swarmling: { sheetKey: "mobile_alien_swarmling", frameWidth: 32, frameHeight: 32, cols: 4 },
    infernal_bomber: { sheetKey: "mobile_infernal_fiend", frameWidth: 32, frameHeight: 32, cols: 4 },
    nature_viper: { sheetKey: "mobile_nature_viper", frameWidth: 32, frameHeight: 32, cols: 4 }
  };
  function hasTowerSprite(towerId) {
    return towerId in TOWER_SPRITE_CONFIGS || towerId in MOBILE_SPRITE_CONFIGS;
  }
  function isMobileTowerSprite(towerId) {
    return towerId in MOBILE_SPRITE_CONFIGS;
  }
  var ROTATING_TOWER_PREFIXES = /* @__PURE__ */ new Set([]);
  var NON_ROTATING_TOWERS = /* @__PURE__ */ new Set([]);
  function shouldTowerRotate(towerId) {
    if (NON_ROTATING_TOWERS.has(towerId)) return false;
    for (const prefix of ROTATING_TOWER_PREFIXES) {
      if (towerId.startsWith(prefix)) return true;
    }
    return false;
  }
  function hasProjectileSprite(towerId) {
    return towerId in PROJECTILE_SPRITE_CONFIGS;
  }
  function getTowerSpriteConfig(towerId) {
    return TOWER_SPRITE_CONFIGS[towerId];
  }
  function getProjectileSpriteConfig(towerId) {
    return PROJECTILE_SPRITE_CONFIGS[towerId];
  }
  var TOWER_PREFIX_TO_FACTION = {
    arcane: "arcane",
    mech: "mechanical",
    nature: "nature",
    void: "void",
    mil: "military",
    alien: "aliens",
    cyber: "cypherpunk",
    infernal: "infernal",
    celestial: "celestial",
    psi: "psionic",
    harmonic: "harmonic",
    coalition: "coalition"
  };
  function getTowerFaction(towerId) {
    return TOWER_PREFIX_TO_FACTION[towerId.split("_")[0]];
  }
  function createTowerSprite(scene, towerId, x, y) {
    const mobileCfg = MOBILE_SPRITE_CONFIGS[towerId];
    if (mobileCfg) {
      const mfid = getTowerFaction(towerId);
      let mobileKey = mobileCfg.sheetKey;
      let activeSuffix = "";
      if (mfid) {
        const suffix = SkinManager.getSkinSuffix(mfid, towerId);
        if (suffix) {
          const skinnedKey = mobileCfg.sheetKey + suffix;
          if (scene.textures.exists(skinnedKey)) {
            mobileKey = skinnedKey;
            activeSuffix = suffix;
          }
        }
      }
      if (scene.textures.exists(mobileKey)) {
        const sprite2 = scene.add.sprite(x, y, mobileKey, 0);
        sprite2.setDepth(5);
        sprite2.setScale(24 / 32);
        sprite2.texture.setFilter(Textures.FilterMode.NEAREST);
        sprite2.setData("skinSuffix", activeSuffix);
        const idleAnim = `mobile_${towerId}${activeSuffix}_down`;
        if (scene.anims.exists(idleAnim)) sprite2.play(idleAnim);
        return sprite2;
      }
    }
    const config = TOWER_SPRITE_CONFIGS[towerId];
    if (!config) return null;
    const fid = getTowerFaction(towerId);
    let sheetKey2 = config.sheetKey;
    if (fid) {
      const skinned = SkinManager.getTowerSheetKey(fid, towerId);
      if (skinned && skinned !== sheetKey2 && scene.textures.exists(skinned)) {
        sheetKey2 = skinned;
      }
    }
    const frameIndex = config.rows.idle * config.totalCols + config.column;
    const sprite = scene.add.sprite(x, y, sheetKey2, frameIndex);
    sprite.setDepth(5);
    const scale = 28 * 1.3 / 64;
    sprite.setScale(scale);
    sprite.texture.setFilter(Textures.FilterMode.NEAREST);
    return sprite;
  }
  function setTowerSpriteState(sprite, towerId, state2, level = 1) {
    const config = TOWER_SPRITE_CONFIGS[towerId];
    if (!config) return;
    const effectiveLevel = Math.min(level, config.maxLevel);
    const levelOffset = (effectiveLevel - 1) * config.rowsPerLevel;
    const stateRow = config.rows[state2];
    const frameIndex = (levelOffset + stateRow) * config.totalCols + config.column;
    sprite.setFrame(frameIndex);
  }
  function updateMobileTowerSprite(sprite, towerId, dx, dy, isAttacking) {
    if (!(towerId in MOBILE_SPRITE_CONFIGS)) return;
    const suffix = sprite.getData("skinSuffix") ?? "";
    const isMoving = Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5;
    if (isAttacking) {
      const key = `mobile_${towerId}${suffix}_attack`;
      if (sprite.anims.currentAnim?.key !== key) sprite.play(key);
      return;
    }
    if (isMoving) {
      let dir;
      sprite.setFlipX(false);
      if (Math.abs(dx) > Math.abs(dy)) {
        dir = "right";
        if (dx < 0) sprite.setFlipX(true);
      } else {
        dir = dy > 0 ? "down" : "up";
      }
      const key = `mobile_${towerId}${suffix}_${dir}`;
      if (sprite.anims.currentAnim?.key !== key) sprite.play(key);
    } else {
      const key = `mobile_${towerId}${suffix}_down`;
      if (sprite.anims.currentAnim?.key !== key) sprite.play(key);
    }
  }
  function createProjectileSprite(scene, towerId, x, y) {
    const config = PROJECTILE_SPRITE_CONFIGS[towerId];
    if (!config) return null;
    const pfid = getTowerFaction(towerId);
    let projSheetKey = config.sheetKey;
    if (pfid) {
      const skinned = SkinManager.getProjectileSheetKey(pfid, towerId);
      if (skinned && skinned !== projSheetKey && scene.textures.exists(skinned)) {
        projSheetKey = skinned;
      }
    }
    const frameIndex = config.travelRows[0] * config.totalCols + config.column;
    const sprite = scene.add.sprite(x, y, projSheetKey, frameIndex);
    sprite.setDepth(15);
    const isFlame = towerId.includes("flame");
    const isUltimate = towerId.includes("nova") || towerId.includes("elder") || towerId.includes("titan") || towerId.includes("oblivion") || towerId.includes("apocalypse") || towerId.includes("absolution") || towerId.includes("overmind") || towerId.includes("crescendo") || towerId.includes("zeroday");
    const scale = isFlame ? 38 / 32 : isUltimate ? 28 / 32 : 20 / 32;
    sprite.setScale(scale);
    let travelKey = `proj_${towerId}_travel`;
    if (projSheetKey !== config.sheetKey) {
      const skinnedTravelKey = `proj_${towerId}_${projSheetKey}_travel`;
      const skinnedImpactKey = `proj_${towerId}_${projSheetKey}_impact`;
      if (!scene.anims.exists(skinnedTravelKey)) {
        scene.anims.create({
          key: skinnedTravelKey,
          frames: config.travelRows.map((row) => ({ key: projSheetKey, frame: row * config.totalCols + config.column })),
          frameRate: 6,
          repeat: -1
        });
      }
      if (!scene.anims.exists(skinnedImpactKey)) {
        scene.anims.create({
          key: skinnedImpactKey,
          frames: config.impactRows.map((row) => ({ key: projSheetKey, frame: row * config.totalCols + config.column })),
          frameRate: 12,
          repeat: 0
        });
      }
      travelKey = skinnedTravelKey;
      sprite._skinnedImpactKey = skinnedImpactKey;
    }
    sprite.play(travelKey);
    return sprite;
  }
  function playProjectileImpact(sprite, towerId, splashRadius, scene) {
    const impactKey = sprite._skinnedImpactKey ?? `proj_${towerId}_impact`;
    sprite.texture.setFilter(Textures.FilterMode.NEAREST);
    if (splashRadius && splashRadius > 40) {
      const scale = splashRadius * 2 / 32;
      sprite.setScale(scale);
    } else {
      sprite.setScale(26 / 32);
    }
    sprite.play(impactKey);
    sprite.once("animationcomplete", () => {
      sprite.destroy();
    });
  }

  // src/entities/Damageable.ts
  function createAssailantLog() {
    const last = {};
    return {
      log(source, now) {
        last[source] = now;
      },
      lastBy(source) {
        return last[source] ?? -Infinity;
      }
    };
  }

  // src/entities/Tower.ts
  init_Trait();
  init_Trait();
  var Tower = class {
    constructor(scene, col, row, towerType) {
      this.goldEarned = 0;
      this.damageDealt = 0;
      this.hitStatsAccum = createHitStats();
      /** Live upgrade ladder — mutated on each upgrade. Initialised
       *  from `typeDef.upgrades` in the constructor and replaced with
       *  the target typeDef's upgrades array when a branch fires. */
      this._remainingUpgrades = [];
      this.homeX = 0;
      this.homeY = 0;
      this.isMobile = false;
      /** Optional sprite (for factions with art). When set, Graphics drawing is skipped. */
      this.sprite = null;
      /** Post-upgrade pre-aura range in px. TowerManager resets `range` to
       *  this each frame before harmonic auras stack onto it. Stays in sync
       *  with `range` on construct + on each upgrade. typeDef.range is the
       *  *base* level range so we can't use it after a linear upgrade. */
      this._basePxRange = 0;
      /** Mobile unit sprite — track previous position for direction detection */
      this._prevX = 0;
      this._prevY = 0;
      /** Last rotation applied to sprite (preserved when no target) */
      this._lastSpriteRotation = 0;
      /** Cached findTarget result for the current tick. Cleared at the
       *  top of every update(); rotation + fire both call findTarget
       *  with the same creeps array, so the cache saves one full scan
       *  per rotating tower per tick. Invalidated per call of update(). */
      this._frameTarget = null;
      this._frameTargetValid = false;
      /** Cached on construct — skips drawTower() entirely in headless.
       *  drawTower only mutates graphics/sprite state (all Phaser Proxy
       *  stubs in headless) plus _prevX/_prevY which are also read only
       *  inside drawTower, so short-circuiting is side-effect-free. */
      this._isHeadless = false;
      /** Plan A: Stormcaller's chain_lightning_on_towers cast disables
       *  towers for a few seconds. Decremented each frame in update();
       *  while > 0, fire logic is skipped and a stunned overlay draws. */
      this._disabledRemaining = 0;
      /** M10 finale: tower destructibility. Null = invincible (every
       *  player tower in every existing mission). Non-null only on M10
       *  CPU defender towers; the hero attacks them and they die when
       *  hp hits 0. Set via `setDestructible(maxHp)` at placement.
       *
       *  Holds hp / maxHp / lastHitAt — used to be three separate optional
       *  fields. Grouping reduces "is this destructible?" branching and
       *  lets Tower formally satisfy the Damageable interface once a
       *  later commit adds the remaining read-only conformance fields. */
      this.destructible = null;
      /** Per-source last-hit timestamps (hero / send / creep / tower /
       *  raider). Replaces the scattered `_lastHeroHitAt` / `_lastSendHitAt`
       *  pair (incoming damage log). Always present; on non-destructible
       *  towers it's just unused. */
      this.assailants = createAssailantLog();
      /** Outbound retaliation tracker — when this tower last *fired at*
       *  the hero (scene time ms). The hero's auto-attack priority bumps
       *  "towers that have been shooting me" to the top of the cascade
       *  so retaliation reads natural for the player. Distinct from the
       *  inbound `assailants` log: this is "I attacked X" not "X attacked
       *  me," so it stays as its own field rather than flipping into
       *  AssailantLog. */
      this._lastAttackedHeroAt = 0;
      this.col = col;
      this.row = row;
      this.x = gridX(col);
      this.y = gridY(row);
      this.homeX = this.x;
      this.homeY = this.y;
      this.typeDef = towerType;
      this.typeId = towerType.id;
      this.range = towerType.range * TILE_SIZE2;
      this.damage = towerType.damage;
      this.fireRate = towerType.fireRate;
      this.color = towerType.color;
      this.cost = towerType.cost;
      this.totalInvested = towerType.cost;
      this.sellRefundRatio = towerType.sellRefundRatio;
      this.damageType = towerType.damageType;
      this.projectileColor = towerType.projectileColor ?? COLOR_PROJECTILE;
      this.level = 1;
      this.lastFired = 0;
      this.projectiles = [];
      this.traits = towerType.traits.map((t) => ({ ...t }));
      this._remainingUpgrades = towerType.upgrades.slice();
      const rangeBonus = getTrait(this.traits, "range_bonus");
      if (rangeBonus) {
        this.range += (rangeBonus.bonus ?? 0) * TILE_SIZE2;
      }
      this._basePxRange = this.range;
      this._scene = scene;
      this._prevX = this.x;
      this._prevY = this.y;
      this._isHeadless = scene.isHeadless === true;
      this.graphics = scene.add.graphics();
      this.graphics.setDepth(5);
      if (hasTowerSprite(this.typeId)) {
        this.sprite = createTowerSprite(scene, this.typeId, this.x, this.y);
      }
      this.drawTower();
    }
    /** Structural conformance to `RaiderTarget` — raiders read `.alive`
     *  when scanning CPU towers for auto-targeting. Lets the duck-type
     *  resolve without `as unknown as` casts at the call sites. */
    get alive() {
      return !this._expired;
    }
    drawTower() {
      if (this._isHeadless) return;
      this.graphics.clear();
      if (this.sprite) {
        this.sprite.setPosition(this.x, this.y);
        if (!isMobileTowerSprite(this.typeId)) {
          setTowerSpriteState(this.sprite, this.typeId, "idle", this.level);
        }
        if (isMobileTowerSprite(this.typeId)) {
          const dx = this.x - this._prevX;
          const dy = this.y - this._prevY;
          const isAttacking = this.lastFired > 0 && Date.now() - this.lastFired < 300;
          updateMobileTowerSprite(this.sprite, this.typeId, dx, dy, isAttacking);
          this._prevX = this.x;
          this._prevY = this.y;
        }
      }
      const isMobile = hasTrait(this.traits, "mobile_unit");
      const s = TILE_SIZE2 * 0.35;
      if (!this.sprite) {
        this.graphics.fillStyle(this.color, 1);
        if (isMobile) {
          this.graphics.beginPath();
          this.graphics.moveTo(this.x, this.y - s);
          this.graphics.lineTo(this.x + s, this.y);
          this.graphics.lineTo(this.x, this.y + s);
          this.graphics.lineTo(this.x - s, this.y);
          this.graphics.closePath();
          this.graphics.fillPath();
          this.graphics.lineStyle(1, 16777215, 0.4);
          this.graphics.strokePath();
        } else {
          this.graphics.fillRect(this.x - s, this.y - s, s * 2, s * 2);
          this.graphics.lineStyle(1, 16777215, 0.3);
          this.graphics.strokeRect(this.x - s, this.y - s, s * 2, s * 2);
        }
      }
      if (isMobile) {
        const dx = this.x - this.homeX;
        const dy = this.y - this.homeY;
        if (Math.sqrt(dx * dx + dy * dy) > 4) {
          this.graphics.lineStyle(1, this.color, 0.2);
          this.graphics.strokeCircle(this.homeX, this.homeY, TILE_SIZE2 * 0.25);
        }
      }
      if (this.level > 1) {
        this.graphics.fillStyle(16777215, 0.8);
        for (let i = 0; i < this.level - 1; i++) {
          this.graphics.fillCircle(this.x - 4 + i * 8, this.y + s + 4, 2);
        }
      }
      if (hasTrait(this.traits, "_adj_damage_buff") || hasTrait(this.traits, "_adj_rate_buff") || hasTrait(this.traits, "_faction_rate_buff")) {
        this.graphics.lineStyle(1, 16746666, 0.4);
        this.graphics.strokeCircle(this.x, this.y, s + 3);
      }
      const fwTrait = getTrait(this.traits, "firewall_link");
      if (fwTrait && fwTrait._partnerX !== void 0) {
        this.graphics.lineStyle(2, 65484, 0.5);
        this.graphics.lineBetween(this.x, this.y, fwTrait._partnerX, fwTrait._partnerY);
      }
      const conduit = getTrait(this.traits, "conduit_link");
      if (conduit && conduit._links) {
        for (const link of conduit._links) {
          this.graphics.lineStyle(2, link.color ?? 16763972, 0.4);
          this.graphics.lineBetween(this.x, this.y, link.x, link.y);
        }
      }
      if (hasTrait(this.traits, "damage_aura")) {
        this.graphics.lineStyle(1, 16729156, 0.2);
        this.graphics.strokeCircle(this.x, this.y, this.range);
      }
      if (hasTrait(this.traits, "rate_aura")) {
        this.graphics.lineStyle(1, 4521796, 0.2);
        this.graphics.strokeCircle(this.x, this.y, this.range);
      }
      if (hasTrait(this.traits, "range_aura")) {
        this.graphics.lineStyle(1, 4491519, 0.2);
        this.graphics.strokeCircle(this.x, this.y, this.range);
      }
      if (hasTrait(this.traits, "crit_aura")) {
        this.graphics.lineStyle(1, 16729343, 0.2);
        this.graphics.strokeCircle(this.x, this.y, this.range);
      }
      if (this.destructible && this.destructible.maxHp > 0 && this.destructible.hp < this.destructible.maxHp) {
        const ratio = Math.max(0, Math.min(1, this.destructible.hp / this.destructible.maxHp));
        const w = TILE_SIZE2 * 0.8;
        const h = 3;
        const x = this.x - w / 2;
        const y = this.y - TILE_SIZE2 * 0.55;
        this.graphics.fillStyle(3355443, 1);
        this.graphics.fillRect(x, y, w, h);
        const fillColor = ratio > 0.5 ? 4521796 : ratio > 0.25 ? 16755200 : 16720418;
        this.graphics.fillStyle(fillColor, 1);
        this.graphics.fillRect(x, y, w * ratio, h);
      }
      if (this.destructible && this.sprite && this.destructible.lastHitAt > -Infinity) {
        const now = this._scene.time?.now ?? 0;
        if (now - this.destructible.lastHitAt < 80) {
          const s2 = this.sprite;
          if (typeof s2.setTintFill === "function") s2.setTintFill(16777215);
        }
      }
      resolveOverlayDraw(this.traits, this, this.graphics, this._scene);
    }
    canUpgrade() {
      return this._remainingUpgrades.length > 0;
    }
    /** Apply damage through the v2 damage pipeline:
     *
     *    veto → modifier chain → apply → onTakeDamage → onKill
     *
     *  - Veto runs first (OR semantics; any trait returning true vetoes
     *    the entire damage event). M10 throne's "invulnerable while
     *    generators alive" gate lives here as a trait handler (commit 4).
     *  - Modifier chain transforms the amount (resists, shields, etc.).
     *  - apply: hp -= final, log assailant, lastHitAt updated.
     *  - onKill fires once when hp hits 0; the caller (Hero / sends)
     *    reads the return value to grant rewards exactly once.
     *
     *  Non-destructible towers (every player tower in every existing
     *  mission) short-circuit — no traits run, no hp change. The vast
     *  majority of calls land here. */
    takeDamage(amount, source = "unknown") {
      if (!this.destructible) return false;
      const d = this.destructible;
      if (d.hp <= 0) return false;
      if (resolveDamageVeto(this.traits, amount, source, this)) return false;
      const final = resolveTowerDamageModifiers(this.traits, amount, source, this);
      if (final <= 0) {
        resolveOnTakeDamage(this.traits, 0, source, this);
        return false;
      }
      d.hp -= final;
      const now = this._scene.time?.now ?? 0;
      d.lastHitAt = now;
      this.assailants.log(source, now);
      resolveOnTakeDamage(this.traits, final, source, this);
      if (d.hp <= 0) {
        d.hp = 0;
        this._expired = true;
        resolveOnKill(this.traits, source, this);
        return true;
      }
      return false;
    }
    /** Cost of the DEFAULT next upgrade. Back-compat for code that
     *  only knows linear upgrades. Branches have their own cost
     *  exposed via `getUpgradeOptions`. */
    getUpgradeCost() {
      if (!this.canUpgrade()) return 0;
      return this._remainingUpgrades[0].cost;
    }
    /** Surface all upgrade choices currently available. Linear
     *  towers return a one-element array; towers at a branch point
     *  return the default + one option per branch. Empty when max
     *  level is reached. */
    getUpgradeOptions() {
      if (!this.canUpgrade()) return [];
      const next = this._remainingUpgrades[0];
      const options = [{
        branchId: null,
        label: next.branchLabel ?? "Upgrade",
        cost: next.cost,
        damage: next.damage,
        range: next.range,
        fireRate: next.fireRate,
        resolvedName: this.displayName ?? this.typeDef.name
      }];
      if (next.branches) {
        for (const b of next.branches) {
          const target = TOWER_TYPES[b.transformsTo];
          if (!target) continue;
          options.push({
            branchId: b.id,
            label: b.label,
            cost: target.cost,
            damage: target.damage,
            range: target.range,
            fireRate: target.fireRate,
            resolvedName: target.name
          });
        }
      }
      return options;
    }
    upgrade(branchId = null) {
      if (!this.canUpgrade()) return;
      const next = this._remainingUpgrades[0];
      if (branchId && next.branches) {
        const branch = next.branches.find((b) => b.id === branchId);
        if (!branch) return;
        const newDef = TOWER_TYPES[branch.transformsTo];
        if (!newDef) return;
        this.chosenBranch = branchId;
        this.displayName = newDef.name;
        this.typeDef = newDef;
        this.typeId = newDef.id;
        this.color = newDef.color;
        this.damageType = newDef.damageType;
        this.projectileColor = newDef.projectileColor ?? COLOR_PROJECTILE;
        this.level = next.level;
        this.damage = newDef.damage;
        this.range = newDef.range * TILE_SIZE2;
        this.fireRate = newDef.fireRate;
        this.traits = newDef.traits.map((t) => ({ ...t }));
        this.totalInvested += newDef.cost;
        this._remainingUpgrades = newDef.upgrades.slice();
        const rangeBonus2 = getTrait(this.traits, "range_bonus");
        if (rangeBonus2) {
          this.range += (rangeBonus2.bonus ?? 0) * TILE_SIZE2;
        }
        this._basePxRange = this.range;
        if (this.sprite) {
          this.sprite.destroy();
          this.sprite = null;
        }
        if (hasTowerSprite(this.typeId)) {
          this.sprite = createTowerSprite(this._scene, this.typeId, this.x, this.y);
        }
        this.drawTower();
        return;
      }
      this.level = next.level;
      this.damage = next.damage;
      this.range = next.range * TILE_SIZE2;
      this.fireRate = next.fireRate;
      this.totalInvested += next.cost;
      this._remainingUpgrades = this._remainingUpgrades.slice(1);
      const rangeBonus = getTrait(this.traits, "range_bonus");
      if (rangeBonus) {
        this.range += (rangeBonus.bonus ?? 0) * TILE_SIZE2;
      }
      this._basePxRange = this.range;
      this.drawTower();
    }
    getEffectiveFireRate() {
      return resolveFireRate(this.traits, this.fireRate, this);
    }
    runTraitUpdates(ctx) {
      resolveTowerUpdates(this.traits, this, ctx);
      cleanupExpiredTraits(this.traits);
      const needsRedraw = this.destructible || hasTrait(this.traits, "firewall_link") || hasTrait(this.traits, "conduit_link") || hasTrait(this.traits, "damage_aura") || hasTrait(this.traits, "rate_aura") || hasTrait(this.traits, "range_aura") || hasTrait(this.traits, "crit_aura");
      if (needsRedraw && this.graphics.visible) {
        this.drawTower();
      }
    }
    update(time, delta, creeps) {
      if (hasTrait(this.traits, "mobile_unit")) {
        if (this.graphics.visible) {
          this.drawTower();
        }
        return;
      }
      this._frameTargetValid = false;
      this._frameTarget = null;
      if (this.sprite && !isMobileTowerSprite(this.typeId) && shouldTowerRotate(this.typeId)) {
        const nearest = this.findTarget(creeps);
        if (nearest) {
          this._lastSpriteRotation = Math.atan2(nearest.y - this.y, nearest.x - this.x) + Math.PI / 2;
        }
        this.sprite.setRotation(this._lastSpriteRotation);
      }
      if (this._disabledRemaining > 0) {
        this._disabledRemaining = Math.max(0, this._disabledRemaining - delta / 1e3);
        if (this.sprite) this.sprite.setTint(4491468);
        return;
      } else if (this.sprite) {
        this.sprite.clearTint();
      }
      const effectiveRate = this.getEffectiveFireRate();
      if (time - this.lastFired >= effectiveRate) {
        const target = this.findTarget(creeps);
        if (target) {
          const targetIdx = creeps.indexOf(target);
          resolveOnFire(this.traits, this, targetIdx);
          this.fire(target);
          this.lastFired = time;
        } else if (hasTrait(this.traits, "siphons_pylons")) {
          const pylon = this.findPylonTarget(time);
          if (pylon) {
            this.firePylon(pylon);
            this.lastFired = time;
          }
        }
      }
      this.updateProjectiles(delta, creeps);
    }
    findTarget(creeps) {
      if (this._frameTargetValid) return this._frameTarget;
      const myOwner = this.ownerIndex ?? 0;
      const mode = this.typeDef.targeting ?? "first";
      const weakestMode = mode === "weakest";
      let best = null;
      let bestScore = weakestMode ? Infinity : -Infinity;
      for (const creep of creeps) {
        if (!creep.alive || creep.reached) continue;
        if (creep.ownerIndex === myOwner) continue;
        const dx = creep.x - this.x;
        const dy = creep.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > this.range) continue;
        let score;
        switch (mode) {
          case "first":
            score = creep.pathIndex;
            break;
          // highest pathIndex = closest to exit
          case "closest":
            score = -dist;
            break;
          // shortest distance to tower
          case "strongest":
            score = creep.hp;
            break;
          // highest current HP
          case "weakest":
            score = creep.hp;
            break;
          // lowest current HP (uses < below)
          case "fastest":
            score = creep.speed;
            break;
          // fastest current speed
          default:
            score = creep.pathIndex;
            break;
        }
        const isBetter = weakestMode ? score < bestScore : score > bestScore;
        if (isBetter) {
          best = creep;
          bestScore = score;
        }
      }
      this._frameTarget = best;
      this._frameTargetValid = true;
      return best;
    }
    /** Mana Drain fallback target acquisition. Reads the scene-attached
     *  SuppressionManager (set by GameScene during scene init when the
     *  map declares pylons). Returns the closest active pylon in range,
     *  or null if no pylons / none in range / no manager.
     *
     *  Range comparison uses pylon pixel center vs tower pixel position
     *  (this.range * TILE_SIZE), matching the creep-targeting rule. */
    findPylonTarget(now) {
      const mgr = this._scene._suppressionMgr;
      if (!mgr) return null;
      const candidates = mgr.getActivePylonsInRangeOf(this.x, this.y, this.range * TILE_SIZE2, now);
      if (candidates.length === 0) return null;
      let best = null;
      let bestDist = Infinity;
      for (const p of candidates) {
        const dx = gridX(p.col) - this.x;
        const dy = gridY(p.row) - this.y;
        const d = dx * dx + dy * dy;
        if (d < bestDist) {
          bestDist = d;
          best = p;
        }
      }
      return best;
    }
    /** Spawn a projectile aimed at a Suppression Pylon. On impact the
     *  projectile applies +1 siphon stack via SuppressionManager.
     *  Reuses the standard Mana Drain projectile sprite — visually the
     *  tower is "shooting the pylon," which is the entire point. */
    firePylon(pylon) {
      const scene = this._scene;
      const g = scene.add.graphics();
      g.setDepth(15);
      const destX = gridX(pylon.col);
      const destY = gridY(pylon.row);
      const projSprite = hasProjectileSprite(this.typeId) ? createProjectileSprite(scene, this.typeId, this.x, this.y) : null;
      this.projectiles.push({
        x: this.x,
        y: this.y,
        target: null,
        destX,
        destY,
        speed: this.typeDef.projectileSpeed,
        graphics: g,
        locationBased: true,
        age: 0,
        sprite: projSprite ?? void 0,
        towerId: this.typeId,
        pylonTarget: pylon
      });
      if (this.sprite) {
        setTowerSpriteState(this.sprite, this.typeId, "fire", this.level);
        scene.time.delayedCall(200, () => {
          if (this.sprite) setTowerSpriteState(this.sprite, this.typeId, "idle", this.level);
        });
      }
    }
    fire(target) {
      const scene = this._scene;
      const g = scene.add.graphics();
      g.setDepth(15);
      const isPierce = hasTrait(this.traits, "pierce_delivery");
      const isLocationBased = hasTrait(this.traits, "splash_damage") || isPierce || hasTrait(this.traits, "tower_aura_damage");
      let destX = target.x;
      let destY = target.y;
      let dirX = 0;
      let dirY = 0;
      if (isPierce) {
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 0) {
          dirX = dx / len;
          dirY = dy / len;
          destX = this.x + dirX * 2e3;
          destY = this.y + dirY * 2e3;
        }
      }
      const projSprite = hasProjectileSprite(this.typeId) ? createProjectileSprite(scene, this.typeId, this.x, this.y) : null;
      this.projectiles.push({
        x: this.x,
        y: this.y,
        target,
        destX,
        destY,
        speed: this.typeDef.projectileSpeed,
        graphics: g,
        locationBased: isLocationBased,
        age: 0,
        sprite: projSprite ?? void 0,
        isPierce,
        dirX,
        dirY,
        piercedCreeps: isPierce ? /* @__PURE__ */ new Set() : void 0,
        towerId: this.typeId
      });
      if (this.sprite) {
        setTowerSpriteState(this.sprite, this.typeId, "fire", this.level);
        scene.time.delayedCall(200, () => {
          if (this.sprite) setTowerSpriteState(this.sprite, this.typeId, "idle", this.level);
        });
      }
    }
    updateProjectiles(delta, allCreeps) {
      for (let i = this.projectiles.length - 1; i >= 0; i--) {
        const p = this.projectiles[i];
        if (p.target && !p.target.alive && !p.locationBased) {
          p.graphics.destroy();
          if (p.sprite) p.sprite.destroy();
          this.projectiles.splice(i, 1);
          continue;
        }
        const tx = p.target && p.target.alive && !p.locationBased ? p.target.x : p.destX;
        const ty = p.target && p.target.alive && !p.locationBased ? p.target.y : p.destY;
        if (p.target && p.target.alive && !p.locationBased) {
          p.destX = p.target.x;
          p.destY = p.target.y;
        }
        const dx = tx - p.x;
        const dy = ty - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        p.age += delta / 1e3;
        const effectiveSpeed = p.locationBased ? p.speed : p.speed * (1 + p.age * p.age * 2);
        const move = effectiveSpeed * (delta / 1e3);
        if (p.isPierce && p.piercedCreeps && p.dirX !== void 0 && p.dirY !== void 0) {
          const pierceTrait = getTrait(this.traits, "pierce_delivery");
          const lineWidth = (pierceTrait?.lineWidth ?? 24) / 2;
          for (const creep of allCreeps) {
            if (!creep.alive || creep.reached || p.piercedCreeps.has(creep)) continue;
            const cx = creep.x - this.x;
            const cy = creep.y - this.y;
            const proj = cx * p.dirX + cy * p.dirY;
            const beamFront = (p.x - this.x) * p.dirX + (p.y - this.y) * p.dirY;
            if (proj < 0 || proj > beamFront) continue;
            const perpX = cx - proj * p.dirX;
            const perpY = cy - proj * p.dirY;
            const perpDist = Math.sqrt(perpX * perpX + perpY * perpY);
            if (perpDist <= lineWidth) {
              const stats = createHitStats();
              const dmg = this.damage;
              creep.takeDamage(dmg);
              creep.lastHitCol = this.col;
              creep.lastHitRow = this.row;
              p.piercedCreeps.add(creep);
            }
          }
        }
        if (p.isPierce && (p.x < -100 || p.x > 2e3 || p.y < -100 || p.y > 2e3)) {
          p.graphics.destroy();
          if (p.sprite) p.sprite.destroy();
          this.projectiles.splice(i, 1);
          continue;
        }
        if (dist <= move) {
          if (p.isPierce) {
            p.x += dx / dist * move;
            p.y += dy / dist * move;
            if (p.sprite) {
              p.sprite.setPosition(p.x, p.y);
              if (!p.locationBased) p.sprite.setRotation(Math.atan2(dy, dx));
            }
            continue;
          }
          if (p.pylonTarget) {
            this.onProjectileHitPylon(p);
          } else if (p.target && p.target.alive) {
            this.onProjectileHit(p, allCreeps);
          } else {
            this.onProjectileHitLocation(p, allCreeps);
          }
          p.graphics.destroy();
          if (p.sprite && p.towerId) {
            const splashTrait = getTrait(this.traits, "splash_damage");
            const splashRadius = splashTrait?.radius;
            playProjectileImpact(p.sprite, p.towerId, splashRadius);
          } else if (p.sprite) {
            p.sprite.destroy();
          }
          this.projectiles.splice(i, 1);
        } else {
          p.x += dx / dist * move;
          p.y += dy / dist * move;
          if (p.sprite) {
            p.sprite.setPosition(p.x, p.y);
            if (!p.locationBased) {
              p.sprite.setRotation(Math.atan2(dy, dx));
            }
          } else {
            p.graphics.clear();
            const hasSplash = hasTrait(this.traits, "splash_damage");
            p.graphics.fillStyle(this.projectileColor, 1);
            p.graphics.fillCircle(p.x, p.y, hasSplash ? 4 : 3);
          }
        }
      }
    }
    onProjectileHit(p, allCreeps) {
      p.target.lastHitCol = this.col;
      p.target.lastHitRow = this.row;
      const stats = createHitStats();
      const ctx = {
        towerLevel: this.level,
        damage: this.damage,
        damageType: this.damageType,
        target: p.target,
        allTargets: allCreeps,
        hitTargets: [],
        goldEarned: 0,
        hitStats: stats,
        towerOwnerIndex: this.ownerIndex,
        tower: this,
        getLives: this._getLives,
        spendLives: this._spendLives
      };
      resolveDamageModifiers(this.traits, ctx);
      resolveDelivery(this.traits, ctx);
      resolveHitEffects(this.traits, ctx);
      this.goldEarned += ctx.goldEarned;
      this.damageDealt += ctx.damage * ctx.hitTargets.length;
      for (const key of Object.keys(stats)) {
        this.hitStatsAccum[key] = (this.hitStatsAccum[key] ?? 0) + stats[key];
      }
    }
    /** Mana Drain pylon impact — apply +1 siphon stack to the targeted
     *  pylon. SuppressionManager handles threshold/mute internally. No
     *  damage pipeline runs (no creep, no traits applied). */
    onProjectileHitPylon(p) {
      if (!p.pylonTarget) return;
      const mgr = this._scene._suppressionMgr;
      if (!mgr) return;
      const now = this._scene.time?.now ?? 0;
      mgr.applyStacks(p.pylonTarget, 1, now);
    }
    onProjectileHitLocation(p, allCreeps) {
      const phantom = {
        x: p.destX,
        y: p.destY,
        alive: false,
        reached: false,
        armor: "medium",
        isBoss: false,
        pathIndex: 0,
        path: [],
        takeDamage: () => {
        },
        applySlow: () => {
        }
      };
      const stats = createHitStats();
      const ctx = {
        towerLevel: this.level,
        damage: this.damage,
        damageType: this.damageType,
        target: phantom,
        allTargets: allCreeps,
        hitTargets: [],
        goldEarned: 0,
        hitStats: stats,
        towerOwnerIndex: this.ownerIndex,
        tower: this,
        getLives: this._getLives,
        spendLives: this._spendLives
      };
      resolveDamageModifiers(this.traits, ctx);
      resolveDelivery(this.traits, ctx);
      resolveHitEffects(this.traits, ctx);
      this.goldEarned += ctx.goldEarned;
      this.damageDealt += ctx.damage * ctx.hitTargets.length;
      for (const key of Object.keys(stats)) {
        this.hitStatsAccum[key] = (this.hitStatsAccum[key] ?? 0) + stats[key];
      }
    }
    getSellValue() {
      return Math.floor(this.totalInvested * this.sellRefundRatio);
    }
    destroy() {
      this.graphics.destroy();
      if (this.sprite) {
        this.sprite.destroy();
        this.sprite = null;
      }
      for (const p of this.projectiles) {
        p.graphics.destroy();
        if (p.sprite) p.sprite.destroy();
      }
      this.projectiles = [];
    }
  };

  // src/systems/TowerManager.ts
  var TowerManager = class {
    constructor(scene, grid, economy, statsTracker, eventLog, eventBus, modifier) {
      this.towers = [];
      this.totalTowersBuilt = 0;
      /** Circle Co-op gold router: called with per-hit gold earned by a
       *  bot-owned tower (gold_on_hit / jackpot / etc.) so it flows into
       *  the bot's private EconomyManager instead of the human's shared
       *  pool. Null outside co-op — TowerManager falls back to the
       *  shared economy for every tower. */
      this.botGoldRouter = null;
      /** Lives access for life-spending traits (Celestial Martyr). Set by GameScene/headless. */
      this.getLives = null;
      /** Immediate life spending. Set by GameScene/headless. */
      this.spendLives = null;
      /** M10 finale: read-and-clear flag set by cleanupExpired when a
       *  destructible tower dies this frame. GameScene polls this and
       *  recalcs paths + reroutes alive creeps. */
      this._lastDestructibleDeathFlag = false;
      this.scene = scene;
      this.grid = grid;
      this.economy = economy;
      this.statsTracker = statsTracker;
      this.eventLog = eventLog;
      this.eventBus = eventBus;
      this.modifier = modifier;
    }
    /** Place a tower. Returns the tower if successful, null if blocked. */
    /**
     * Place a tower on the grid. If `free` is true, skip economy checks
     * (used for remote tower placements in circle co-op).
     */
    placeTower(col, row, towerType, allPaths, recalcPaths, free = false) {
      const isMobile = towerType.traits.some((t) => t.id === "mobile_unit");
      const cost = this.getEffectiveCost(towerType.cost);
      if (!free && !this.economy.canAfford(cost)) return null;
      if (isMobile) {
        if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return null;
        const cell = this.grid.cells[row][col];
        if (cell === 4 /* Blocked */) return null;
        if (!free) {
          this.economy.spend(cost);
          this.statsTracker.recordGoldSpent(cost);
        }
        const tower2 = new Tower(this.scene, col, row, towerType);
        tower2.isMobile = true;
        tower2._getLives = this.getLives ?? void 0;
        tower2._spendLives = this.spendLives ?? void 0;
        this.applyModifierTraits(tower2);
        this.towers.push(tower2);
        this.totalTowersBuilt++;
        this.eventLog.towerBuilt(towerType.name, cost);
        this.statsTracker.recordTowerBuilt(towerType.id);
        return { tower: tower2, pathsChanged: false };
      }
      if (!this.grid.canPlaceTower(col, row)) return null;
      this.grid.placeTower(col, row);
      const newPaths = recalcPaths();
      const anyBlocked = newPaths.some((p) => p === null);
      if (anyBlocked) {
        this.grid.removeTower(col, row);
        recalcPaths();
        return null;
      }
      if (!free) {
        this.economy.spend(cost);
        this.statsTracker.recordGoldSpent(cost);
      }
      const tower = new Tower(this.scene, col, row, towerType);
      tower._getLives = this.getLives ?? void 0;
      tower._spendLives = this.spendLives ?? void 0;
      this.applyModifierTraits(tower);
      this.towers.push(tower);
      this.totalTowersBuilt++;
      this.eventLog.towerBuilt(towerType.name, cost);
      this.statsTracker.recordTowerBuilt(towerType.id);
      this.eventBus.emit("towerPlaced", col, row, towerType.id);
      return { tower, pathsChanged: true };
    }
    /** Sell tower at grid position. Returns refund amount or 0.
     *  `free=true` skips the shared-economy refund (and the event-log
     *  line) — used when a CPU bot is paying itself from its own
     *  EconomyManager, same pattern as `placeTower(free=true)`. */
    sellTower(col, row, free = false) {
      const idx = this.towers.findIndex((t) => t.col === col && t.row === row);
      if (idx === -1) return null;
      const tower = this.towers[idx];
      const refund = tower.getSellValue();
      if (!free) {
        this.economy.addGold(refund);
        this.eventLog.towerSold(tower.typeDef.name, refund);
      }
      tower.destroy();
      this.towers.splice(idx, 1);
      if (!tower.isMobile) {
        this.grid.removeTower(col, row);
        this.eventBus.emit("towerSold", col, row);
      }
      return { tower, refund };
    }
    /** Find tower at grid position */
    getTowerAt(col, row) {
      return this.towers.find((t) => t.col === col && t.row === row);
    }
    /** Per-frame tower updates: reset auras, run traits, collect gold/damage, fire */
    updateTowers(time, delta, creeps, justDiedCreeps = [], getLives) {
      const traitCtx = {
        allTowers: this.towers,
        allCreeps: creeps,
        justDiedCreeps,
        time,
        delta,
        getLives
      };
      for (const tower of this.towers) {
        removeTrait(tower.traits, "conduit_linked");
        for (const trait of tower.traits) {
          if (trait.id === "_harmonic_damage" || trait.id === "_harmonic_rate" || trait.id === "_harmonic_range") {
            trait.bonus = 1;
            if (trait.id === "_harmonic_range") {
              tower.range = tower._basePxRange;
            }
          } else if (trait.id === "_harmonic_crit") {
            trait.chance = 0;
          }
        }
      }
      for (const tower of this.towers) {
        tower.runTraitUpdates(traitCtx);
      }
      for (const tower of this.towers) {
        for (const trait of tower.traits) {
          if (trait.id === "_harmonic_range") {
            tower.range = tower._basePxRange * (trait.bonus ?? 1);
          }
        }
      }
      for (const tower of this.towers) {
        if (tower.goldEarned > 0) {
          if (tower.ownerIndex !== void 0 && this.botGoldRouter) {
            this.botGoldRouter(tower.ownerIndex, tower.goldEarned);
          } else {
            this.economy.addGold(tower.goldEarned);
            this.statsTracker.recordGoldEarned(tower.goldEarned);
            const goldAmount = tower.goldEarned;
            void Promise.resolve().then(() => (init_LiveCapture(), LiveCapture_exports)).then((m) => {
              if (m.isCaptureEnabled()) m.recordIncome("traits", goldAmount);
            }).catch(() => {
            });
          }
          this.statsTracker.recordTowerGold(tower.typeId, tower.goldEarned);
          tower.goldEarned = 0;
        }
        if (tower.damageDealt > 0) {
          this.statsTracker.recordDamage(tower.typeId, tower.damageDealt);
          this.statsTracker.recordHitStats(tower.typeId, tower.hitStatsAccum);
          tower.damageDealt = 0;
          for (const key of Object.keys(tower.hitStatsAccum)) {
            tower.hitStatsAccum[key] = 0;
          }
        }
      }
      for (const tower of this.towers) {
        tower.update(time, delta, creeps);
      }
      for (const tower of this.towers) {
        const ts = this.statsTracker.stats.towerStats[tower.typeId];
        if (ts) ts.timeAlive += delta;
      }
    }
    /** Clean up expired towers (kamikaze, expired Imps, etc.) */
    cleanupExpired() {
      let destructibleDied = false;
      for (let i = this.towers.length - 1; i >= 0; i--) {
        const tower = this.towers[i];
        if (tower._expired) {
          if (tower.destructible && !tower.isMobile) destructibleDied = true;
          tower.destroy();
          if (!tower.isMobile) {
            this.grid.removeTower(tower.col, tower.row);
          }
          this.towers.splice(i, 1);
        }
      }
      if (destructibleDied) this._lastDestructibleDeathFlag = true;
    }
    consumeDestructibleDeathFlag() {
      if (this._lastDestructibleDeathFlag) {
        this._lastDestructibleDeathFlag = false;
        return true;
      }
      return false;
    }
    /** Process wave-end tower effects: mobile reset, expiry, decay, life gain, leak absorb */
    onWaveEnd() {
      let livesGained = 0;
      for (const tower of this.towers) {
        if (tower.isMobile) {
          tower.x = tower.homeX;
          tower.y = tower.homeY;
          tower.drawTower();
        }
        for (const trait of tower.traits) {
          if (trait.id === "expires_after_waves") {
            if (trait._wavesRemaining === void 0) trait._wavesRemaining = trait.waves ?? 4;
            trait._wavesRemaining--;
            if (trait._wavesRemaining <= 0) {
              tower._expired = true;
              this.eventLog.gameMessage(`${tower.typeDef.name} expired!`);
            }
          }
          if (trait.id === "decay_per_wave") {
            const decayPercent = trait.decayPercent ?? 0.15;
            tower.damage = Math.max(1, Math.round(tower.damage * (1 - decayPercent)));
            tower.drawTower();
          }
          if (trait.id === "leak_absorb") {
            if (trait._rechargeCounter === void 0) trait._rechargeCounter = 0;
            trait._rechargeCounter++;
            if (trait._rechargeCounter >= (trait.rechargeWaves ?? 10)) {
              trait._charges = Math.min((trait._charges ?? 0) + 1, trait.maxCharges ?? 1);
              if (trait._shieldHpMax !== void 0) {
                trait._shieldHp = trait._shieldHpMax;
              }
              trait._rechargeCounter = 0;
            }
          }
        }
        if (tower._livesEarned > 0) {
          livesGained += tower._livesEarned;
          this.eventLog.gameMessage(`+${tower._livesEarned} life from ${tower.typeDef.name}!`);
          tower._livesEarned = 0;
        }
      }
      return livesGained;
    }
    /** Brood Mother: spawn temporary swarmlings */
    spawnBroodMotherSwarmlings() {
      const swarmlingType = getTowerType("alien_swarmling");
      for (const tower of this.towers) {
        const trait = tower.traits.find((t) => t.id === "spawn_swarmlings_per_wave");
        if (!trait) continue;
        const count = trait.count ?? 2;
        const offsets = [[0, -1], [0, 1], [-1, 0], [1, 0], [-1, -1], [1, -1], [-1, 1], [1, 1]];
        let spawned = 0;
        for (const [dc, dr] of offsets) {
          if (spawned >= count) break;
          const sc = tower.col + dc;
          const sr = tower.row + dr;
          if (sc < 0 || sc >= GRID_COLS || sr < 0 || sr >= GRID_ROWS) continue;
          const swarmling = new Tower(this.scene, sc, sr, swarmlingType);
          swarmling.isMobile = true;
          swarmling.traits.push({ id: "expires_after_waves", waves: 1, _wavesRemaining: 1 });
          this.towers.push(swarmling);
          spawned++;
        }
        if (spawned > 0) {
          this.eventLog.gameMessage(`Brood Mother spawned ${spawned} Swarmlings!`);
        }
      }
    }
    getEffectiveCost(baseCost) {
      return Math.round(baseCost * (this.modifier?.costMult ?? 1));
    }
    applyModifierTraits(tower) {
      if (this.modifier) {
        for (const t of this.modifier.towerTraits) {
          tower.traits.push({ ...t });
        }
      }
    }
  };

  // src/systems/CreepManager.ts
  var StandardLeakHandler = class {
    constructor(eventLog, statsTracker, getTowers = () => []) {
      this.eventLog = eventLog;
      this.statsTracker = statsTracker;
      this.getTowers = getTowers;
    }
    onCreepLeaked(creep) {
      if (creep.isFriendly) {
        this.eventLog.gameMessage("Send reached the cabal's line \u2014 fades into the spire.");
        return 0;
      }
      for (const tower of this.getTowers()) {
        for (const trait of tower.traits ?? []) {
          if (trait.id !== "leak_absorb") continue;
          if ((trait._charges ?? 0) <= 0) continue;
          trait._charges -= 1;
          this.eventLog.gameMessage(`${tower.typeDef?.name ?? "Sanctuary"} absorbed a leak!`);
          this.statsTracker.recordLeak();
          return 0;
        }
      }
      const damage = creep.isBoss ? 5 : 1;
      this.eventLog.gameMessage(damage > 1 ? `BOSS leaked! -${damage} lives` : "Creep reached exit! -1 life");
      this.statsTracker.recordLeak();
      return damage;
    }
  };
  var StandardDeathHandler = class {
    constructor(economy, statsTracker, eventBus, killGoldMult, goldTransform) {
      this.economy = economy;
      this.statsTracker = statsTracker;
      this.eventBus = eventBus;
      this.killGoldMult = killGoldMult;
      this.goldTransform = goldTransform;
    }
    onCreepKilled(creep) {
      const multGold = Math.round(this.economy.getKillGold() * this.killGoldMult);
      const killGold = this.goldTransform ? this.goldTransform(multGold) : multGold;
      this.eventBus.emit("creepKilled", 0, killGold);
      this.statsTracker.recordKill();
      this.statsTracker.recordGoldEarned(killGold);
    }
  };
  var CreepManager = class {
    constructor(leakHandler, deathHandler) {
      this.creeps = [];
      this.totalCreepsKilled = 0;
      /** Shared `Phaser.GameObjects.Graphics` for every creep's HP bar /
       *  shadow / status overlay. One render entry per frame instead of
       *  N. Set by GameScene via `setOverlay`; left null in headless. */
      this.overlay = null;
      /** Creeps killed during the most recent update tick. Consumed by
       *  kill-reactive tower traits (e.g. life_on_kill) on the NEXT tower
       *  update pass, then cleared at the top of the following update. */
      this.justDiedCreeps = [];
      this.leakHandler = leakHandler;
      this.deathHandler = deathHandler;
    }
    /** Wire in the shared overlay graphics. Called once by GameScene
     *  after `add.graphics()` is available. No-op in headless. */
    setOverlay(g) {
      this.overlay = g;
    }
    /** Clear the shared overlay and redraw every living creep into it
     *  in a single pass. Cheap because it's one Graphics → one render
     *  entry, regardless of creep count. */
    drawAll() {
      if (!this.overlay) return;
      this.overlay.clear();
      for (const creep of this.creeps) {
        if (!creep.alive || creep.reached) continue;
        creep.drawInto(this.overlay);
      }
    }
    /** Update all creeps, process leaks and kills. Returns leak damage. */
    update(delta) {
      this.justDiedCreeps.length = 0;
      for (const creep of this.creeps) {
        creep.update(delta, this.creeps);
      }
      let totalLeakDamage = 0;
      let leakCount = 0;
      const leakedTypes = /* @__PURE__ */ new Map();
      for (const creep of this.creeps) {
        if (creep.reached) {
          const damage = this.leakHandler.onCreepLeaked(creep);
          totalLeakDamage += damage;
          leakCount++;
          const ctype = creep.typeId ?? creep.creepType ?? "unknown";
          const entry = leakedTypes.get(ctype) ?? { count: 0, damage: 0 };
          entry.count++;
          entry.damage += damage;
          leakedTypes.set(ctype, entry);
          creep.reached = false;
          creep.alive = false;
          if (creep.sprite) {
            creep.sprite.destroy();
            creep.sprite = null;
          }
        }
      }
      for (const creep of this.creeps) {
        if (!creep.alive && !creep.reached && creep.hp <= 0) {
          this.deathHandler.onCreepKilled(creep);
          this.totalCreepsKilled++;
          this.justDiedCreeps.push(creep);
          creep.hp = -999;
        }
      }
      this.creeps = this.creeps.filter((c) => c.alive);
      return {
        totalLeakDamage,
        leakCount,
        leakedTypes: [...leakedTypes.entries()].map(([creepType, v]) => ({
          creepType,
          count: v.count,
          damage: v.damage
        }))
      };
    }
    /** Auto-recovery: mark every alive creep as `reached` so the next
     *  update tick processes them through the leak handler. Used by
     *  WaveController when a wave has been stuck past the force-clear
     *  threshold (typically a single creep mis-pathed after a tower
     *  placement and the wave-end gate is waiting for it to finish).
     *  Without this the entire match can hang on one stuck creep. */
    forceLeakAllAlive() {
      for (const creep of this.creeps) {
        if (creep.alive) creep.reached = true;
      }
    }
    /** Find nearest creep to a pixel position */
    findCreepNear(px, py, maxDist) {
      let closest = null;
      let closestDist = maxDist;
      for (const creep of this.creeps) {
        if (!creep.alive || creep.reached) continue;
        const dx = creep.x - px;
        const dy = creep.y - py;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < closestDist) {
          closest = creep;
          closestDist = dist;
        }
      }
      return closest;
    }
  };

  // src/systems/DebugFlags.ts
  var DEBUG = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("debug");
  var UNLOCK_ALL_FACTIONS = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("unlock") === "true";

  // src/systems/WaveController.ts
  var STUCK_LOG_INTERVAL = 3e3;
  var STUCK_THRESHOLD = 5e3;
  var STUCK_NO_PROGRESS_WINDOW = 15e3;
  var WaveController = class {
    constructor(waves, spawner, sendMgr, callbacks) {
      this.currentWave = 0;
      this.waveActive = false;
      this.betweenWaves = true;
      /** Per-wave latch — once auto-recovery has fired for this wave we
       *  don't fire it again, even if the recovery doesn't fully clear
       *  (e.g. extra creeps still spawning). Reset on each wave start. */
      this.forceClearFired = false;
      /** ms since the current wave started. Used to gate stuck logging. */
      this.waveElapsed = 0;
      /** ms since last stuck-log so we don't spam the console every frame. */
      this.lastStuckLog = 0;
      /** Last frame's max pathIndex among alive creeps. Compared against
       *  this frame's max — any change (up OR down due to a leader dying)
       *  counts as progress. Was previously a lifetime high; that broke
       *  M3 where archmages walked forward indefinitely after the leader
       *  died but never surpassed the leader's prior peak. */
      this.lastFrameMaxPathIndex = 0;
      /** waveElapsed at the last frame where progress was observed
       *  (path-advance, leader change, or death). Force-clear fires when
       *  (waveElapsed - lastProgressAt) exceeds STUCK_NO_PROGRESS_WINDOW. */
      this.lastProgressAt = 0;
      /** Last frame's alive-creep count. A drop counts as progress. */
      this.lastAliveCount = 0;
      /** Latch — onWaveSpawningComplete fires once per wave when spawn+
       *  send queues both first transition to empty. */
      this.spawningCompleteFired = false;
      this.waves = waves;
      this.spawner = spawner;
      this.sendMgr = sendMgr;
      this.callbacks = callbacks;
    }
    /** Start the next wave. Returns false if can't start. */
    startWave(allPaths) {
      if (!this.callbacks.canStartWave()) {
        if (DEBUG) console.warn("[wave] startWave rejected: canStartWave() === false (usually !currentPath)");
        return false;
      }
      if (this.currentWave >= this.waves.length) {
        if (DEBUG) console.warn(`[wave] startWave rejected: all waves exhausted (${this.currentWave}/${this.waves.length})`);
        return false;
      }
      this.betweenWaves = false;
      this.waveActive = true;
      this.waveElapsed = 0;
      this.forceClearFired = false;
      this.lastFrameMaxPathIndex = 0;
      this.lastProgressAt = 0;
      this.lastAliveCount = 0;
      this.spawningCompleteFired = false;
      this.lastStuckLog = 0;
      const wave = this.waves[this.currentWave];
      this.currentWave++;
      const numPaths = allPaths.filter((p) => p !== null).length;
      this.spawner.startWave(wave, numPaths);
      const baseHp = wave.groups[0]?.hpScale || 30;
      const baseSpeed = wave.groups[0]?.speedScale || 1;
      this.sendMgr.activateSends(baseHp, baseSpeed);
      this.callbacks.onWaveStart(wave, this.currentWave, this.waves.length);
      return true;
    }
    /** Check if the current wave is complete. Call each frame.
     *  `creeps` is optional; when provided, the controller tracks max
     *  pathIndex advancement to differentiate "slow but progressing"
     *  from "actually stuck" — only the latter triggers force-clear. */
    checkWaveComplete(creepCount, delta = 0, creeps) {
      if (!this.waveActive) return;
      this.waveElapsed += delta;
      const spawning = this.spawner.isSpawning();
      const sending = this.sendMgr.isSpawning();
      if (creeps) {
        let frameMax = 0;
        let frameAlive = 0;
        for (const c of creeps) {
          if (c.alive) {
            frameAlive++;
            if (c.pathIndex > frameMax) frameMax = c.pathIndex;
          }
        }
        if (frameMax !== this.lastFrameMaxPathIndex || frameAlive !== this.lastAliveCount) {
          this.lastProgressAt = this.waveElapsed;
        }
        this.lastFrameMaxPathIndex = frameMax;
        this.lastAliveCount = frameAlive;
      }
      if (!this.spawningCompleteFired && !spawning && !sending) {
        this.spawningCompleteFired = true;
        this.callbacks.onWaveSpawningComplete?.(this.currentWave);
      }
      if (spawning || sending || creepCount > 0) {
        if (DEBUG && this.waveElapsed > STUCK_THRESHOLD && this.waveElapsed - this.lastStuckLog > STUCK_LOG_INTERVAL) {
          this.lastStuckLog = this.waveElapsed;
          console.warn(
            `[wave] wave ${this.currentWave} stuck at ${Math.round(this.waveElapsed / 1e3)}s \u2014 spawning=${spawning} sending=${sending} creeps=${creepCount}`
          );
        }
        const noRecentProgress = creeps === void 0 ? this.waveElapsed > STUCK_NO_PROGRESS_WINDOW : this.waveElapsed - this.lastProgressAt > STUCK_NO_PROGRESS_WINDOW;
        if (!spawning && !sending && creepCount > 0 && noRecentProgress && !this.forceClearFired) {
          this.forceClearFired = true;
          if (DEBUG) {
            console.warn(`[wave] wave ${this.currentWave} auto-recovering after ${Math.round((this.waveElapsed - this.lastProgressAt) / 1e3)}s without progress \u2014 force-leaking ${creepCount} creep(s)`);
          }
          this.callbacks.onStuckForceClear?.();
        }
        return;
      }
      this.waveActive = false;
      this.betweenWaves = true;
      if (DEBUG) console.log(`[wave] wave ${this.currentWave} cleared in ${Math.round(this.waveElapsed / 1e3)}s`);
      this.callbacks.onWaveCleared(this.currentWave);
    }
    /** Update spawning each frame */
    updateSpawning(delta, allPaths, currentPath, creeps) {
      this.spawner.update(delta, allPaths, creeps);
      this.sendMgr.update(delta, currentPath, creeps);
    }
    hasMoreWaves() {
      return this.currentWave < this.waves.length;
    }
    isComplete() {
      return this.currentWave >= this.waves.length && !this.waveActive;
    }
  };

  // src/data/FrontierBuildings.ts
  var FRONTIER_BUILDINGS = {
    arcane: [
      {
        id: "leyline_nexus_1",
        name: "Leyline Nexus",
        faction: "arcane",
        cost: 55,
        baseIncome: 5,
        description: "Stable mana income. Can overcharge for 3x burst but goes dormant for 2 waves.",
        mechanic: "overcharge"
      },
      {
        id: "leyline_nexus_2",
        name: "Greater Nexus",
        faction: "arcane",
        cost: 250,
        baseIncome: 28,
        description: "Powerful leyline tap. Same overcharge mechanic, far better returns.",
        mechanic: "overcharge"
      }
    ],
    mechanical: [
      {
        id: "deep_mine_1",
        name: "Deep Mine",
        faction: "mechanical",
        cost: 44,
        baseIncome: 4,
        description: "Dig deeper each wave for +1 income, but 10% cave-in risk per level.",
        mechanic: "dig"
      },
      {
        id: "deep_mine_2",
        name: "Reinforced Mine",
        faction: "mechanical",
        cost: 225,
        baseIncome: 25,
        description: "Industrial-scale dig. Higher base, same mechanic with lower risk.",
        mechanic: "dig"
      }
    ],
    nature: [
      {
        id: "sacred_grove_1",
        name: "Sacred Grove",
        faction: "nature",
        cost: 55,
        baseIncome: 3,
        description: "Grows +2 income/wave. Harvest resets growth but gives big payout.",
        mechanic: "grow"
      },
      {
        id: "sacred_grove_2",
        name: "Ancient Grove",
        faction: "nature",
        cost: 225,
        baseIncome: 22,
        description: "Ancient roots. Faster payoff, bigger harvests.",
        mechanic: "grow"
      }
    ],
    void: [
      {
        id: "the_rift_1",
        name: "The Rift",
        faction: "void",
        cost: 35,
        baseIncome: 0,
        description: "Random income: 0-15g per wave. High variance.",
        mechanic: "gamble",
        gambleMax: 15
      },
      {
        id: "the_rift_2",
        name: "Abyssal Rift",
        faction: "void",
        cost: 160,
        baseIncome: 0,
        description: "Random income: 0-80g per wave. Maximum variance.",
        mechanic: "gamble",
        gambleMax: 80
      }
    ],
    military: [
      {
        id: "supply_depot_1",
        name: "Supply Depot",
        faction: "military",
        cost: 44,
        baseIncome: 4,
        description: "Steady supply income. Reliable.",
        mechanic: "steady"
      },
      {
        id: "supply_depot_2",
        name: "Forward Base",
        faction: "military",
        cost: 225,
        baseIncome: 25,
        description: "Upgraded supply chain. Far higher returns.",
        mechanic: "steady"
      }
    ],
    aliens: [
      {
        id: "breeding_pool",
        name: "Breeding Pool",
        faction: "aliens",
        cost: 35,
        baseIncome: 2,
        description: "Grows +2 income/wave. The swarm expands.",
        mechanic: "grow"
      },
      {
        id: "hive_queen",
        name: "Hive Queen",
        faction: "aliens",
        cost: 175,
        baseIncome: 18,
        description: "Deeper broodmother. Faster growth, massive harvest payouts.",
        mechanic: "grow"
      }
    ],
    cypherpunk: [
      {
        id: "crypto_mine",
        name: "Crypto Mine",
        faction: "cypherpunk",
        cost: 35,
        baseIncome: 0,
        description: "Mines volatile crypto: 0-25g per wave.",
        mechanic: "gamble",
        gambleMax: 25
      },
      {
        id: "data_broker",
        name: "Data Broker",
        faction: "cypherpunk",
        cost: 225,
        baseIncome: 25,
        description: "Overcharge to sell data: 3x burst, 2 wave cooldown.",
        mechanic: "overcharge"
      }
    ],
    infernal: [
      {
        id: "soul_well",
        name: "Soul Well",
        faction: "infernal",
        cost: 32,
        baseIncome: 0,
        description: "Chaotic souls: 0-25g per wave. High variance.",
        mechanic: "gamble",
        gambleMax: 25
      },
      {
        id: "blood_pact",
        name: "Blood Pact",
        faction: "infernal",
        cost: 185,
        baseIncome: 20,
        description: "Dig deeper into damnation. +1/wave but 15% collapse risk.",
        mechanic: "dig"
      }
    ],
    celestial: [
      {
        id: "tithe",
        name: "Tithe",
        faction: "celestial",
        cost: 55,
        baseIncome: 5,
        description: "Steady holy income. The faithful provide.",
        mechanic: "steady"
      },
      {
        id: "miracle",
        name: "Miracle",
        faction: "celestial",
        cost: 225,
        baseIncome: 20,
        description: "Grows steadily. Harvest for a divine payout.",
        mechanic: "grow"
      }
    ],
    psionic: [
      {
        id: "dream_tap",
        name: "Dream Tap",
        faction: "psionic",
        cost: 40,
        baseIncome: 0,
        description: "Harvest subconscious: 0-25g per wave.",
        mechanic: "gamble",
        gambleMax: 25
      },
      {
        id: "mind_prison",
        name: "Mind Prison",
        faction: "psionic",
        cost: 225,
        baseIncome: 25,
        description: "Overcharge for 3x psychic burst, dormant 2 waves.",
        mechanic: "overcharge"
      }
    ],
    harmonic: [
      {
        id: "resonance_chamber",
        name: "Resonance Chamber",
        faction: "harmonic",
        cost: 50,
        baseIncome: 4,
        description: "Grows +2 per wave. Harmonizes with your network.",
        mechanic: "grow"
      },
      {
        id: "symphony_hall",
        name: "Symphony Hall",
        faction: "harmonic",
        cost: 225,
        baseIncome: 25,
        description: "Overcharge for 3x crescendo, dormant 2 waves.",
        mechanic: "overcharge"
      }
    ],
    chaos: [],
    random: [],
    coalition: []
  };
  function getAllFactionFrontierBuildings() {
    const all = [];
    for (const [fid, buildings] of Object.entries(FRONTIER_BUILDINGS)) {
      if (fid === "chaos" || fid === "random" || fid === "military") continue;
      all.push(...buildings);
    }
    return all;
  }
  var GENERIC_OUTPOSTS = [
    {
      id: "outpost_1",
      name: "Outpost",
      faction: "arcane",
      // faction doesn't matter for generic
      cost: 44,
      baseIncome: 4,
      description: "Basic income structure. +4g per wave.",
      mechanic: "steady"
    },
    {
      id: "outpost_2",
      name: "Trading Post",
      faction: "arcane",
      cost: 225,
      baseIncome: 25,
      description: "Upgraded income structure. +25g per wave.",
      mechanic: "steady"
    }
  ];

  // src/systems/FrontierManager.ts
  init_Rng();
  var FrontierManager = class {
    constructor(events, incomeMgr, faction) {
      this.buildings = [];
      /**
       * Flat multiplier applied to every active building's baseIncome
       * when `recalculateBaseIncome` runs. Circle Co-op sets this to
       * 1.5× to encourage meta investment — the coop kill-gold nerf
       * shifts earning pressure onto frontier, so we buff the return.
       * 1× (no change) for every other mode.
       */
      this.incomeMultiplier = 1;
      this.events = events;
      this.incomeMgr = incomeMgr;
      this.faction = faction;
      if (faction === "chaos") {
        this.availableBuildings = this.rollRandomFrontier();
      } else if (faction) {
        this.availableBuildings = FRONTIER_BUILDINGS[faction] || [];
      } else {
        this.availableBuildings = GENERIC_OUTPOSTS;
      }
    }
    /** Roll 2 random frontier buildings from all faction pools */
    rollRandomFrontier() {
      const all = getAllFactionFrontierBuildings();
      const shuffled = [...all].sort(() => rng() - 0.5);
      return shuffled.slice(0, 2);
    }
    /** Rotate frontier for Chaos faction (called on wave clear) */
    rotateRandomFrontier() {
      if (this.faction === "chaos") {
        this.availableBuildings = this.rollRandomFrontier();
      }
    }
    purchaseBuilding(building) {
      const owned = {
        def: building,
        growthStacks: 0,
        digLevel: 0,
        dormantWaves: 0,
        destroyed: false
      };
      this.buildings.push(owned);
      this.recalculateBaseIncome();
      return owned;
    }
    /**
     * Called each wave end. Returns BONUS gold beyond base income.
     * Base income flows through IncomeManager.frontierIncome automatically.
     */
    onWaveEnd(waveNum) {
      let bonusGold = 0;
      for (const b of this.buildings) {
        if (b.destroyed) continue;
        if (b.dormantWaves > 0) {
          b.dormantWaves--;
          continue;
        }
        switch (b.def.mechanic) {
          case "steady":
          case "overcharge":
            break;
          case "dig":
            bonusGold += b.digLevel;
            break;
          case "grow":
            b.growthStacks++;
            bonusGold += b.growthStacks * 2;
            break;
          case "gamble": {
            const max = b.def.gambleMax ?? 15;
            bonusGold += Math.floor(rng() * (max + 1));
            break;
          }
        }
      }
      return Math.round(bonusGold * this.incomeMultiplier);
    }
    // Faction-specific actions - return gold earned
    overchargeBuilding(idx) {
      const building = this.getActiveBuildings()[idx];
      if (!building || building.def.mechanic !== "overcharge" || building.dormantWaves > 0) return 0;
      const burst = building.def.baseIncome * 3 * this.incomeMultiplier;
      building.dormantWaves = 2;
      return Math.round(burst);
    }
    digDeeper(idx) {
      const building = this.getActiveBuildings()[idx];
      if (!building || building.def.mechanic !== "dig") return { success: false, collapsed: false };
      building.digLevel++;
      const risk = building.def.id.includes("_2") ? 0.05 : 0.1;
      if (rng() < risk * building.digLevel) {
        this.destroyBuilding(building);
        return { success: false, collapsed: true };
      }
      return { success: true, collapsed: false };
    }
    harvestGrowth(idx) {
      const building = this.getActiveBuildings()[idx];
      if (!building || building.def.mechanic !== "grow") return 0;
      const payout = Math.round(building.growthStacks * 5 * this.incomeMultiplier);
      building.growthStacks = 0;
      return payout;
    }
    // Batch actions — operate on all active buildings of a given type
    overchargeAllOfType(defId) {
      let totalGold = 0;
      for (const b of this.buildings) {
        if (b.destroyed || b.def.id !== defId || b.def.mechanic !== "overcharge" || b.dormantWaves > 0) continue;
        totalGold += b.def.baseIncome * 3;
        b.dormantWaves = 2;
      }
      return Math.round(totalGold * this.incomeMultiplier);
    }
    digAllOfType(defId) {
      let successes = 0;
      let collapses = 0;
      for (const b of this.buildings) {
        if (b.destroyed || b.def.id !== defId || b.def.mechanic !== "dig") continue;
        b.digLevel++;
        const risk = b.def.id.includes("_2") ? 0.05 : 0.1;
        if (rng() < risk * b.digLevel) {
          this.destroyBuilding(b);
          collapses++;
        } else {
          successes++;
        }
      }
      return { successes, collapses };
    }
    harvestAllOfType(defId) {
      let totalGold = 0;
      for (const b of this.buildings) {
        if (b.destroyed || b.def.id !== defId || b.def.mechanic !== "grow") continue;
        totalGold += b.growthStacks * 5;
        b.growthStacks = 0;
      }
      return totalGold;
    }
    /** Mark a building as destroyed: remove its map doodad, null the
     *  handle, and recompute base income. Called from dig-collapse paths. */
    destroyBuilding(b) {
      b.destroyed = true;
      if (b._doodad) {
        try {
          b._doodad.destroy();
        } catch {
        }
        b._doodad = void 0;
      }
      this.recalculateBaseIncome();
    }
    recalculateBaseIncome() {
      let total = 0;
      for (const b of this.buildings) {
        if (!b.destroyed && b.dormantWaves === 0) {
          total += b.def.baseIncome;
        }
      }
      this.incomeMgr.frontierIncome = Math.round(total * this.incomeMultiplier);
    }
    getActiveBuildings() {
      return this.buildings.filter((b) => !b.destroyed);
    }
  };

  // src/data/Maps.ts
  init_config();

  // src/data/maps/circle/circle_2p.json
  var circle_2p_default = {
    id: "circle_2p",
    name: "Circle 2P \u2014 Classic",
    description: "2-player co-op. Creeps loop through both halves, circling the map before returning to their spawn.",
    playerCount: 2,
    theme: "forest",
    blocked: [
      [
        18,
        3
      ],
      [
        17,
        3
      ],
      [
        18,
        4
      ],
      [
        17,
        4
      ],
      [
        18,
        5
      ],
      [
        17,
        5
      ],
      [
        18,
        6
      ],
      [
        17,
        6
      ],
      [
        18,
        7
      ],
      [
        17,
        7
      ],
      [
        18,
        8
      ],
      [
        17,
        8
      ],
      [
        18,
        9
      ],
      [
        17,
        9
      ],
      [
        18,
        10
      ],
      [
        17,
        10
      ],
      [
        18,
        16
      ],
      [
        17,
        16
      ],
      [
        18,
        17
      ],
      [
        17,
        17
      ],
      [
        18,
        18
      ],
      [
        17,
        18
      ],
      [
        18,
        19
      ],
      [
        17,
        19
      ],
      [
        18,
        20
      ],
      [
        17,
        20
      ],
      [
        18,
        21
      ],
      [
        17,
        21
      ],
      [
        18,
        22
      ],
      [
        17,
        22
      ],
      [
        6,
        6
      ],
      [
        7,
        5
      ],
      [
        7,
        6
      ],
      [
        7,
        7
      ],
      [
        8,
        4
      ],
      [
        8,
        5
      ],
      [
        8,
        6
      ],
      [
        8,
        7
      ],
      [
        8,
        8
      ],
      [
        9,
        5
      ],
      [
        9,
        6
      ],
      [
        9,
        7
      ],
      [
        10,
        6
      ],
      [
        6,
        19
      ],
      [
        7,
        18
      ],
      [
        7,
        19
      ],
      [
        7,
        20
      ],
      [
        8,
        17
      ],
      [
        8,
        18
      ],
      [
        8,
        19
      ],
      [
        8,
        20
      ],
      [
        8,
        21
      ],
      [
        9,
        18
      ],
      [
        9,
        19
      ],
      [
        9,
        20
      ],
      [
        10,
        19
      ],
      [
        25,
        6
      ],
      [
        26,
        5
      ],
      [
        26,
        6
      ],
      [
        26,
        7
      ],
      [
        27,
        4
      ],
      [
        27,
        5
      ],
      [
        27,
        6
      ],
      [
        27,
        7
      ],
      [
        27,
        8
      ],
      [
        28,
        5
      ],
      [
        28,
        6
      ],
      [
        28,
        7
      ],
      [
        29,
        6
      ],
      [
        25,
        19
      ],
      [
        26,
        18
      ],
      [
        26,
        19
      ],
      [
        26,
        20
      ],
      [
        27,
        17
      ],
      [
        27,
        18
      ],
      [
        27,
        19
      ],
      [
        27,
        20
      ],
      [
        27,
        21
      ],
      [
        28,
        18
      ],
      [
        28,
        19
      ],
      [
        28,
        20
      ],
      [
        29,
        19
      ]
    ],
    animated: [],
    noBuild: [],
    zones: [
      [
        [
          0,
          0
        ],
        [
          0,
          1
        ],
        [
          0,
          2
        ],
        [
          0,
          3
        ],
        [
          0,
          4
        ],
        [
          0,
          5
        ],
        [
          0,
          6
        ],
        [
          0,
          7
        ],
        [
          0,
          8
        ],
        [
          0,
          9
        ],
        [
          0,
          10
        ],
        [
          0,
          11
        ],
        [
          0,
          12
        ],
        [
          0,
          13
        ],
        [
          0,
          14
        ],
        [
          0,
          15
        ],
        [
          0,
          16
        ],
        [
          0,
          17
        ],
        [
          0,
          18
        ],
        [
          0,
          19
        ],
        [
          0,
          20
        ],
        [
          0,
          21
        ],
        [
          0,
          22
        ],
        [
          0,
          23
        ],
        [
          0,
          24
        ],
        [
          0,
          25
        ],
        [
          1,
          0
        ],
        [
          1,
          1
        ],
        [
          1,
          2
        ],
        [
          1,
          3
        ],
        [
          1,
          4
        ],
        [
          1,
          5
        ],
        [
          1,
          6
        ],
        [
          1,
          7
        ],
        [
          1,
          8
        ],
        [
          1,
          9
        ],
        [
          1,
          10
        ],
        [
          1,
          11
        ],
        [
          1,
          12
        ],
        [
          1,
          13
        ],
        [
          1,
          14
        ],
        [
          1,
          15
        ],
        [
          1,
          16
        ],
        [
          1,
          17
        ],
        [
          1,
          18
        ],
        [
          1,
          19
        ],
        [
          1,
          20
        ],
        [
          1,
          21
        ],
        [
          1,
          22
        ],
        [
          1,
          23
        ],
        [
          1,
          24
        ],
        [
          1,
          25
        ],
        [
          2,
          0
        ],
        [
          2,
          1
        ],
        [
          2,
          2
        ],
        [
          2,
          3
        ],
        [
          2,
          4
        ],
        [
          2,
          5
        ],
        [
          2,
          6
        ],
        [
          2,
          7
        ],
        [
          2,
          8
        ],
        [
          2,
          9
        ],
        [
          2,
          10
        ],
        [
          2,
          11
        ],
        [
          2,
          12
        ],
        [
          2,
          13
        ],
        [
          2,
          14
        ],
        [
          2,
          15
        ],
        [
          2,
          16
        ],
        [
          2,
          17
        ],
        [
          2,
          18
        ],
        [
          2,
          19
        ],
        [
          2,
          20
        ],
        [
          2,
          21
        ],
        [
          2,
          22
        ],
        [
          2,
          23
        ],
        [
          2,
          24
        ],
        [
          2,
          25
        ],
        [
          3,
          0
        ],
        [
          3,
          1
        ],
        [
          3,
          2
        ],
        [
          3,
          3
        ],
        [
          3,
          4
        ],
        [
          3,
          5
        ],
        [
          3,
          6
        ],
        [
          3,
          7
        ],
        [
          3,
          8
        ],
        [
          3,
          9
        ],
        [
          3,
          10
        ],
        [
          3,
          11
        ],
        [
          3,
          12
        ],
        [
          3,
          13
        ],
        [
          3,
          14
        ],
        [
          3,
          15
        ],
        [
          3,
          16
        ],
        [
          3,
          17
        ],
        [
          3,
          18
        ],
        [
          3,
          19
        ],
        [
          3,
          20
        ],
        [
          3,
          21
        ],
        [
          3,
          22
        ],
        [
          3,
          23
        ],
        [
          3,
          24
        ],
        [
          3,
          25
        ],
        [
          4,
          0
        ],
        [
          4,
          1
        ],
        [
          4,
          2
        ],
        [
          4,
          3
        ],
        [
          4,
          4
        ],
        [
          4,
          5
        ],
        [
          4,
          6
        ],
        [
          4,
          7
        ],
        [
          4,
          8
        ],
        [
          4,
          9
        ],
        [
          4,
          10
        ],
        [
          4,
          11
        ],
        [
          4,
          12
        ],
        [
          4,
          13
        ],
        [
          4,
          14
        ],
        [
          4,
          15
        ],
        [
          4,
          16
        ],
        [
          4,
          17
        ],
        [
          4,
          18
        ],
        [
          4,
          19
        ],
        [
          4,
          20
        ],
        [
          4,
          21
        ],
        [
          4,
          22
        ],
        [
          4,
          23
        ],
        [
          4,
          24
        ],
        [
          4,
          25
        ],
        [
          5,
          0
        ],
        [
          5,
          1
        ],
        [
          5,
          2
        ],
        [
          5,
          3
        ],
        [
          5,
          4
        ],
        [
          5,
          5
        ],
        [
          5,
          6
        ],
        [
          5,
          7
        ],
        [
          5,
          8
        ],
        [
          5,
          9
        ],
        [
          5,
          10
        ],
        [
          5,
          11
        ],
        [
          5,
          12
        ],
        [
          5,
          13
        ],
        [
          5,
          14
        ],
        [
          5,
          15
        ],
        [
          5,
          16
        ],
        [
          5,
          17
        ],
        [
          5,
          18
        ],
        [
          5,
          19
        ],
        [
          5,
          20
        ],
        [
          5,
          21
        ],
        [
          5,
          22
        ],
        [
          5,
          23
        ],
        [
          5,
          24
        ],
        [
          5,
          25
        ],
        [
          6,
          0
        ],
        [
          6,
          1
        ],
        [
          6,
          2
        ],
        [
          6,
          3
        ],
        [
          6,
          4
        ],
        [
          6,
          5
        ],
        [
          6,
          7
        ],
        [
          6,
          8
        ],
        [
          6,
          9
        ],
        [
          6,
          10
        ],
        [
          6,
          11
        ],
        [
          6,
          12
        ],
        [
          6,
          13
        ],
        [
          6,
          14
        ],
        [
          6,
          15
        ],
        [
          6,
          16
        ],
        [
          6,
          17
        ],
        [
          6,
          18
        ],
        [
          6,
          20
        ],
        [
          6,
          21
        ],
        [
          6,
          22
        ],
        [
          6,
          23
        ],
        [
          6,
          24
        ],
        [
          6,
          25
        ],
        [
          7,
          0
        ],
        [
          7,
          1
        ],
        [
          7,
          2
        ],
        [
          7,
          3
        ],
        [
          7,
          4
        ],
        [
          7,
          8
        ],
        [
          7,
          9
        ],
        [
          7,
          10
        ],
        [
          7,
          11
        ],
        [
          7,
          12
        ],
        [
          7,
          13
        ],
        [
          7,
          14
        ],
        [
          7,
          15
        ],
        [
          7,
          16
        ],
        [
          7,
          17
        ],
        [
          7,
          21
        ],
        [
          7,
          22
        ],
        [
          7,
          23
        ],
        [
          7,
          24
        ],
        [
          7,
          25
        ],
        [
          8,
          0
        ],
        [
          8,
          1
        ],
        [
          8,
          2
        ],
        [
          8,
          3
        ],
        [
          8,
          9
        ],
        [
          8,
          10
        ],
        [
          8,
          11
        ],
        [
          8,
          12
        ],
        [
          8,
          13
        ],
        [
          8,
          14
        ],
        [
          8,
          15
        ],
        [
          8,
          16
        ],
        [
          8,
          22
        ],
        [
          8,
          23
        ],
        [
          8,
          24
        ],
        [
          8,
          25
        ],
        [
          9,
          0
        ],
        [
          9,
          1
        ],
        [
          9,
          2
        ],
        [
          9,
          3
        ],
        [
          9,
          4
        ],
        [
          9,
          8
        ],
        [
          9,
          9
        ],
        [
          9,
          10
        ],
        [
          9,
          11
        ],
        [
          9,
          12
        ],
        [
          9,
          13
        ],
        [
          9,
          14
        ],
        [
          9,
          15
        ],
        [
          9,
          16
        ],
        [
          9,
          17
        ],
        [
          9,
          21
        ],
        [
          9,
          22
        ],
        [
          9,
          23
        ],
        [
          9,
          24
        ],
        [
          9,
          25
        ],
        [
          10,
          0
        ],
        [
          10,
          1
        ],
        [
          10,
          2
        ],
        [
          10,
          3
        ],
        [
          10,
          4
        ],
        [
          10,
          5
        ],
        [
          10,
          7
        ],
        [
          10,
          8
        ],
        [
          10,
          9
        ],
        [
          10,
          10
        ],
        [
          10,
          11
        ],
        [
          10,
          12
        ],
        [
          10,
          13
        ],
        [
          10,
          14
        ],
        [
          10,
          15
        ],
        [
          10,
          16
        ],
        [
          10,
          17
        ],
        [
          10,
          18
        ],
        [
          10,
          20
        ],
        [
          10,
          21
        ],
        [
          10,
          22
        ],
        [
          10,
          23
        ],
        [
          10,
          24
        ],
        [
          10,
          25
        ],
        [
          11,
          0
        ],
        [
          11,
          1
        ],
        [
          11,
          2
        ],
        [
          11,
          3
        ],
        [
          11,
          4
        ],
        [
          11,
          5
        ],
        [
          11,
          6
        ],
        [
          11,
          7
        ],
        [
          11,
          8
        ],
        [
          11,
          9
        ],
        [
          11,
          10
        ],
        [
          11,
          11
        ],
        [
          11,
          12
        ],
        [
          11,
          13
        ],
        [
          11,
          14
        ],
        [
          11,
          15
        ],
        [
          11,
          16
        ],
        [
          11,
          17
        ],
        [
          11,
          18
        ],
        [
          11,
          19
        ],
        [
          11,
          20
        ],
        [
          11,
          21
        ],
        [
          11,
          22
        ],
        [
          11,
          23
        ],
        [
          11,
          24
        ],
        [
          11,
          25
        ],
        [
          12,
          0
        ],
        [
          12,
          1
        ],
        [
          12,
          2
        ],
        [
          12,
          3
        ],
        [
          12,
          4
        ],
        [
          12,
          5
        ],
        [
          12,
          6
        ],
        [
          12,
          7
        ],
        [
          12,
          8
        ],
        [
          12,
          9
        ],
        [
          12,
          10
        ],
        [
          12,
          11
        ],
        [
          12,
          12
        ],
        [
          12,
          13
        ],
        [
          12,
          14
        ],
        [
          12,
          15
        ],
        [
          12,
          16
        ],
        [
          12,
          17
        ],
        [
          12,
          18
        ],
        [
          12,
          19
        ],
        [
          12,
          20
        ],
        [
          12,
          21
        ],
        [
          12,
          22
        ],
        [
          12,
          23
        ],
        [
          12,
          24
        ],
        [
          12,
          25
        ],
        [
          13,
          0
        ],
        [
          13,
          1
        ],
        [
          13,
          2
        ],
        [
          13,
          3
        ],
        [
          13,
          4
        ],
        [
          13,
          5
        ],
        [
          13,
          6
        ],
        [
          13,
          7
        ],
        [
          13,
          8
        ],
        [
          13,
          9
        ],
        [
          13,
          10
        ],
        [
          13,
          11
        ],
        [
          13,
          12
        ],
        [
          13,
          13
        ],
        [
          13,
          14
        ],
        [
          13,
          15
        ],
        [
          13,
          16
        ],
        [
          13,
          17
        ],
        [
          13,
          18
        ],
        [
          13,
          19
        ],
        [
          13,
          20
        ],
        [
          13,
          21
        ],
        [
          13,
          22
        ],
        [
          13,
          23
        ],
        [
          13,
          24
        ],
        [
          13,
          25
        ],
        [
          14,
          0
        ],
        [
          14,
          1
        ],
        [
          14,
          2
        ],
        [
          14,
          3
        ],
        [
          14,
          4
        ],
        [
          14,
          5
        ],
        [
          14,
          6
        ],
        [
          14,
          7
        ],
        [
          14,
          8
        ],
        [
          14,
          9
        ],
        [
          14,
          10
        ],
        [
          14,
          11
        ],
        [
          14,
          12
        ],
        [
          14,
          13
        ],
        [
          14,
          14
        ],
        [
          14,
          15
        ],
        [
          14,
          16
        ],
        [
          14,
          17
        ],
        [
          14,
          18
        ],
        [
          14,
          19
        ],
        [
          14,
          20
        ],
        [
          14,
          21
        ],
        [
          14,
          22
        ],
        [
          14,
          23
        ],
        [
          14,
          24
        ],
        [
          14,
          25
        ],
        [
          15,
          0
        ],
        [
          15,
          1
        ],
        [
          15,
          2
        ],
        [
          15,
          3
        ],
        [
          15,
          4
        ],
        [
          15,
          5
        ],
        [
          15,
          6
        ],
        [
          15,
          7
        ],
        [
          15,
          8
        ],
        [
          15,
          9
        ],
        [
          15,
          10
        ],
        [
          15,
          11
        ],
        [
          15,
          12
        ],
        [
          15,
          13
        ],
        [
          15,
          14
        ],
        [
          15,
          15
        ],
        [
          15,
          16
        ],
        [
          15,
          17
        ],
        [
          15,
          18
        ],
        [
          15,
          19
        ],
        [
          15,
          20
        ],
        [
          15,
          21
        ],
        [
          15,
          22
        ],
        [
          15,
          23
        ],
        [
          15,
          24
        ],
        [
          15,
          25
        ],
        [
          16,
          0
        ],
        [
          16,
          1
        ],
        [
          16,
          2
        ],
        [
          16,
          3
        ],
        [
          16,
          4
        ],
        [
          16,
          5
        ],
        [
          16,
          6
        ],
        [
          16,
          7
        ],
        [
          16,
          8
        ],
        [
          16,
          9
        ],
        [
          16,
          10
        ],
        [
          16,
          11
        ],
        [
          16,
          12
        ],
        [
          16,
          13
        ],
        [
          16,
          14
        ],
        [
          16,
          15
        ],
        [
          16,
          16
        ],
        [
          16,
          17
        ],
        [
          16,
          18
        ],
        [
          16,
          19
        ],
        [
          16,
          20
        ],
        [
          16,
          21
        ],
        [
          16,
          22
        ],
        [
          16,
          23
        ],
        [
          16,
          24
        ],
        [
          16,
          25
        ]
      ],
      [
        [
          19,
          0
        ],
        [
          19,
          1
        ],
        [
          19,
          2
        ],
        [
          19,
          3
        ],
        [
          19,
          4
        ],
        [
          19,
          5
        ],
        [
          19,
          6
        ],
        [
          19,
          7
        ],
        [
          19,
          8
        ],
        [
          19,
          9
        ],
        [
          19,
          10
        ],
        [
          19,
          11
        ],
        [
          19,
          12
        ],
        [
          19,
          13
        ],
        [
          19,
          14
        ],
        [
          19,
          15
        ],
        [
          19,
          16
        ],
        [
          19,
          17
        ],
        [
          19,
          18
        ],
        [
          19,
          19
        ],
        [
          19,
          20
        ],
        [
          19,
          21
        ],
        [
          19,
          22
        ],
        [
          19,
          23
        ],
        [
          19,
          24
        ],
        [
          19,
          25
        ],
        [
          20,
          0
        ],
        [
          20,
          1
        ],
        [
          20,
          2
        ],
        [
          20,
          3
        ],
        [
          20,
          4
        ],
        [
          20,
          5
        ],
        [
          20,
          6
        ],
        [
          20,
          7
        ],
        [
          20,
          8
        ],
        [
          20,
          9
        ],
        [
          20,
          10
        ],
        [
          20,
          11
        ],
        [
          20,
          12
        ],
        [
          20,
          13
        ],
        [
          20,
          14
        ],
        [
          20,
          15
        ],
        [
          20,
          16
        ],
        [
          20,
          17
        ],
        [
          20,
          18
        ],
        [
          20,
          19
        ],
        [
          20,
          20
        ],
        [
          20,
          21
        ],
        [
          20,
          22
        ],
        [
          20,
          23
        ],
        [
          20,
          24
        ],
        [
          20,
          25
        ],
        [
          21,
          0
        ],
        [
          21,
          1
        ],
        [
          21,
          2
        ],
        [
          21,
          3
        ],
        [
          21,
          4
        ],
        [
          21,
          5
        ],
        [
          21,
          6
        ],
        [
          21,
          7
        ],
        [
          21,
          8
        ],
        [
          21,
          9
        ],
        [
          21,
          10
        ],
        [
          21,
          11
        ],
        [
          21,
          12
        ],
        [
          21,
          13
        ],
        [
          21,
          14
        ],
        [
          21,
          15
        ],
        [
          21,
          16
        ],
        [
          21,
          17
        ],
        [
          21,
          18
        ],
        [
          21,
          19
        ],
        [
          21,
          20
        ],
        [
          21,
          21
        ],
        [
          21,
          22
        ],
        [
          21,
          23
        ],
        [
          21,
          24
        ],
        [
          21,
          25
        ],
        [
          22,
          0
        ],
        [
          22,
          1
        ],
        [
          22,
          2
        ],
        [
          22,
          3
        ],
        [
          22,
          4
        ],
        [
          22,
          5
        ],
        [
          22,
          6
        ],
        [
          22,
          7
        ],
        [
          22,
          8
        ],
        [
          22,
          9
        ],
        [
          22,
          10
        ],
        [
          22,
          11
        ],
        [
          22,
          12
        ],
        [
          22,
          13
        ],
        [
          22,
          14
        ],
        [
          22,
          15
        ],
        [
          22,
          16
        ],
        [
          22,
          17
        ],
        [
          22,
          18
        ],
        [
          22,
          19
        ],
        [
          22,
          20
        ],
        [
          22,
          21
        ],
        [
          22,
          22
        ],
        [
          22,
          23
        ],
        [
          22,
          24
        ],
        [
          22,
          25
        ],
        [
          23,
          0
        ],
        [
          23,
          1
        ],
        [
          23,
          2
        ],
        [
          23,
          3
        ],
        [
          23,
          4
        ],
        [
          23,
          5
        ],
        [
          23,
          6
        ],
        [
          23,
          7
        ],
        [
          23,
          8
        ],
        [
          23,
          9
        ],
        [
          23,
          10
        ],
        [
          23,
          11
        ],
        [
          23,
          12
        ],
        [
          23,
          13
        ],
        [
          23,
          14
        ],
        [
          23,
          15
        ],
        [
          23,
          16
        ],
        [
          23,
          17
        ],
        [
          23,
          18
        ],
        [
          23,
          19
        ],
        [
          23,
          20
        ],
        [
          23,
          21
        ],
        [
          23,
          22
        ],
        [
          23,
          23
        ],
        [
          23,
          24
        ],
        [
          23,
          25
        ],
        [
          24,
          0
        ],
        [
          24,
          1
        ],
        [
          24,
          2
        ],
        [
          24,
          3
        ],
        [
          24,
          4
        ],
        [
          24,
          5
        ],
        [
          24,
          6
        ],
        [
          24,
          7
        ],
        [
          24,
          8
        ],
        [
          24,
          9
        ],
        [
          24,
          10
        ],
        [
          24,
          11
        ],
        [
          24,
          12
        ],
        [
          24,
          13
        ],
        [
          24,
          14
        ],
        [
          24,
          15
        ],
        [
          24,
          16
        ],
        [
          24,
          17
        ],
        [
          24,
          18
        ],
        [
          24,
          19
        ],
        [
          24,
          20
        ],
        [
          24,
          21
        ],
        [
          24,
          22
        ],
        [
          24,
          23
        ],
        [
          24,
          24
        ],
        [
          24,
          25
        ],
        [
          25,
          0
        ],
        [
          25,
          1
        ],
        [
          25,
          2
        ],
        [
          25,
          3
        ],
        [
          25,
          4
        ],
        [
          25,
          5
        ],
        [
          25,
          7
        ],
        [
          25,
          8
        ],
        [
          25,
          9
        ],
        [
          25,
          10
        ],
        [
          25,
          11
        ],
        [
          25,
          12
        ],
        [
          25,
          13
        ],
        [
          25,
          14
        ],
        [
          25,
          15
        ],
        [
          25,
          16
        ],
        [
          25,
          17
        ],
        [
          25,
          18
        ],
        [
          25,
          20
        ],
        [
          25,
          21
        ],
        [
          25,
          22
        ],
        [
          25,
          23
        ],
        [
          25,
          24
        ],
        [
          25,
          25
        ],
        [
          26,
          0
        ],
        [
          26,
          1
        ],
        [
          26,
          2
        ],
        [
          26,
          3
        ],
        [
          26,
          4
        ],
        [
          26,
          8
        ],
        [
          26,
          9
        ],
        [
          26,
          10
        ],
        [
          26,
          11
        ],
        [
          26,
          12
        ],
        [
          26,
          13
        ],
        [
          26,
          14
        ],
        [
          26,
          15
        ],
        [
          26,
          16
        ],
        [
          26,
          17
        ],
        [
          26,
          21
        ],
        [
          26,
          22
        ],
        [
          26,
          23
        ],
        [
          26,
          24
        ],
        [
          26,
          25
        ],
        [
          27,
          0
        ],
        [
          27,
          1
        ],
        [
          27,
          2
        ],
        [
          27,
          3
        ],
        [
          27,
          9
        ],
        [
          27,
          10
        ],
        [
          27,
          11
        ],
        [
          27,
          12
        ],
        [
          27,
          13
        ],
        [
          27,
          14
        ],
        [
          27,
          15
        ],
        [
          27,
          16
        ],
        [
          27,
          22
        ],
        [
          27,
          23
        ],
        [
          27,
          24
        ],
        [
          27,
          25
        ],
        [
          28,
          0
        ],
        [
          28,
          1
        ],
        [
          28,
          2
        ],
        [
          28,
          3
        ],
        [
          28,
          4
        ],
        [
          28,
          8
        ],
        [
          28,
          9
        ],
        [
          28,
          10
        ],
        [
          28,
          11
        ],
        [
          28,
          12
        ],
        [
          28,
          13
        ],
        [
          28,
          14
        ],
        [
          28,
          15
        ],
        [
          28,
          16
        ],
        [
          28,
          17
        ],
        [
          28,
          21
        ],
        [
          28,
          22
        ],
        [
          28,
          23
        ],
        [
          28,
          24
        ],
        [
          28,
          25
        ],
        [
          29,
          0
        ],
        [
          29,
          1
        ],
        [
          29,
          2
        ],
        [
          29,
          3
        ],
        [
          29,
          4
        ],
        [
          29,
          5
        ],
        [
          29,
          7
        ],
        [
          29,
          8
        ],
        [
          29,
          9
        ],
        [
          29,
          10
        ],
        [
          29,
          11
        ],
        [
          29,
          12
        ],
        [
          29,
          13
        ],
        [
          29,
          14
        ],
        [
          29,
          15
        ],
        [
          29,
          16
        ],
        [
          29,
          17
        ],
        [
          29,
          18
        ],
        [
          29,
          20
        ],
        [
          29,
          21
        ],
        [
          29,
          22
        ],
        [
          29,
          23
        ],
        [
          29,
          24
        ],
        [
          29,
          25
        ],
        [
          30,
          0
        ],
        [
          30,
          1
        ],
        [
          30,
          2
        ],
        [
          30,
          3
        ],
        [
          30,
          4
        ],
        [
          30,
          5
        ],
        [
          30,
          6
        ],
        [
          30,
          7
        ],
        [
          30,
          8
        ],
        [
          30,
          9
        ],
        [
          30,
          10
        ],
        [
          30,
          11
        ],
        [
          30,
          12
        ],
        [
          30,
          13
        ],
        [
          30,
          14
        ],
        [
          30,
          15
        ],
        [
          30,
          16
        ],
        [
          30,
          17
        ],
        [
          30,
          18
        ],
        [
          30,
          19
        ],
        [
          30,
          20
        ],
        [
          30,
          21
        ],
        [
          30,
          22
        ],
        [
          30,
          23
        ],
        [
          30,
          24
        ],
        [
          30,
          25
        ],
        [
          31,
          0
        ],
        [
          31,
          1
        ],
        [
          31,
          2
        ],
        [
          31,
          3
        ],
        [
          31,
          4
        ],
        [
          31,
          5
        ],
        [
          31,
          6
        ],
        [
          31,
          7
        ],
        [
          31,
          8
        ],
        [
          31,
          9
        ],
        [
          31,
          10
        ],
        [
          31,
          11
        ],
        [
          31,
          12
        ],
        [
          31,
          13
        ],
        [
          31,
          14
        ],
        [
          31,
          15
        ],
        [
          31,
          16
        ],
        [
          31,
          17
        ],
        [
          31,
          18
        ],
        [
          31,
          19
        ],
        [
          31,
          20
        ],
        [
          31,
          21
        ],
        [
          31,
          22
        ],
        [
          31,
          23
        ],
        [
          31,
          24
        ],
        [
          31,
          25
        ],
        [
          32,
          0
        ],
        [
          32,
          1
        ],
        [
          32,
          2
        ],
        [
          32,
          3
        ],
        [
          32,
          4
        ],
        [
          32,
          5
        ],
        [
          32,
          6
        ],
        [
          32,
          7
        ],
        [
          32,
          8
        ],
        [
          32,
          9
        ],
        [
          32,
          10
        ],
        [
          32,
          11
        ],
        [
          32,
          12
        ],
        [
          32,
          13
        ],
        [
          32,
          14
        ],
        [
          32,
          15
        ],
        [
          32,
          16
        ],
        [
          32,
          17
        ],
        [
          32,
          18
        ],
        [
          32,
          19
        ],
        [
          32,
          20
        ],
        [
          32,
          21
        ],
        [
          32,
          22
        ],
        [
          32,
          23
        ],
        [
          32,
          24
        ],
        [
          32,
          25
        ],
        [
          33,
          0
        ],
        [
          33,
          1
        ],
        [
          33,
          2
        ],
        [
          33,
          3
        ],
        [
          33,
          4
        ],
        [
          33,
          5
        ],
        [
          33,
          6
        ],
        [
          33,
          7
        ],
        [
          33,
          8
        ],
        [
          33,
          9
        ],
        [
          33,
          10
        ],
        [
          33,
          11
        ],
        [
          33,
          12
        ],
        [
          33,
          13
        ],
        [
          33,
          14
        ],
        [
          33,
          15
        ],
        [
          33,
          16
        ],
        [
          33,
          17
        ],
        [
          33,
          18
        ],
        [
          33,
          19
        ],
        [
          33,
          20
        ],
        [
          33,
          21
        ],
        [
          33,
          22
        ],
        [
          33,
          23
        ],
        [
          33,
          24
        ],
        [
          33,
          25
        ],
        [
          34,
          0
        ],
        [
          34,
          1
        ],
        [
          34,
          2
        ],
        [
          34,
          3
        ],
        [
          34,
          4
        ],
        [
          34,
          5
        ],
        [
          34,
          6
        ],
        [
          34,
          7
        ],
        [
          34,
          8
        ],
        [
          34,
          9
        ],
        [
          34,
          10
        ],
        [
          34,
          11
        ],
        [
          34,
          12
        ],
        [
          34,
          13
        ],
        [
          34,
          14
        ],
        [
          34,
          15
        ],
        [
          34,
          16
        ],
        [
          34,
          17
        ],
        [
          34,
          18
        ],
        [
          34,
          19
        ],
        [
          34,
          20
        ],
        [
          34,
          21
        ],
        [
          34,
          22
        ],
        [
          34,
          23
        ],
        [
          34,
          24
        ],
        [
          34,
          25
        ],
        [
          35,
          0
        ],
        [
          35,
          1
        ],
        [
          35,
          2
        ],
        [
          35,
          3
        ],
        [
          35,
          4
        ],
        [
          35,
          5
        ],
        [
          35,
          6
        ],
        [
          35,
          7
        ],
        [
          35,
          8
        ],
        [
          35,
          9
        ],
        [
          35,
          10
        ],
        [
          35,
          11
        ],
        [
          35,
          12
        ],
        [
          35,
          13
        ],
        [
          35,
          14
        ],
        [
          35,
          15
        ],
        [
          35,
          16
        ],
        [
          35,
          17
        ],
        [
          35,
          18
        ],
        [
          35,
          19
        ],
        [
          35,
          20
        ],
        [
          35,
          21
        ],
        [
          35,
          22
        ],
        [
          35,
          23
        ],
        [
          35,
          24
        ],
        [
          35,
          25
        ]
      ]
    ],
    zoneColors: [
      "#ff4444",
      "#4488ff"
    ],
    spawners: [
      {
        entry: [
          0,
          13
        ],
        waypoints: [
          [
            35,
            13
          ],
          [
            35,
            1
          ],
          [
            0,
            1
          ],
          [
            0,
            13
          ],
          [
            35,
            13
          ],
          [
            35,
            24
          ],
          [
            0,
            24
          ]
        ],
        exit: [
          0,
          13
        ]
      },
      {
        entry: [
          35,
          13
        ],
        waypoints: [
          [
            0,
            13
          ],
          [
            0,
            24
          ],
          [
            35,
            24
          ],
          [
            35,
            13
          ],
          [
            0,
            13
          ],
          [
            0,
            1
          ],
          [
            35,
            1
          ]
        ],
        exit: [
          35,
          13
        ]
      }
    ]
  };

  // src/data/maps/circle/circle_3p.json
  var circle_3p_default = {
    id: "circle_3p",
    name: "Circle 3P \u2014 Trinity",
    description: "3-player co-op on a Y-divided map. Creeps visit every zone before exiting.",
    playerCount: 3,
    theme: "forest",
    blocked: [
      [
        18,
        2
      ],
      [
        18,
        3
      ],
      [
        18,
        4
      ],
      [
        18,
        5
      ],
      [
        18,
        6
      ],
      [
        18,
        7
      ],
      [
        18,
        8
      ],
      [
        18,
        9
      ],
      [
        18,
        10
      ],
      [
        17,
        14
      ],
      [
        19,
        14
      ],
      [
        16,
        15
      ],
      [
        20,
        15
      ],
      [
        12,
        19
      ],
      [
        24,
        19
      ],
      [
        11,
        20
      ],
      [
        25,
        20
      ],
      [
        10,
        21
      ],
      [
        26,
        21
      ],
      [
        9,
        22
      ],
      [
        27,
        22
      ],
      [
        5,
        5
      ],
      [
        6,
        4
      ],
      [
        6,
        5
      ],
      [
        6,
        6
      ],
      [
        7,
        3
      ],
      [
        7,
        4
      ],
      [
        7,
        5
      ],
      [
        7,
        6
      ],
      [
        7,
        7
      ],
      [
        8,
        4
      ],
      [
        8,
        5
      ],
      [
        8,
        6
      ],
      [
        9,
        5
      ],
      [
        26,
        5
      ],
      [
        27,
        4
      ],
      [
        27,
        5
      ],
      [
        27,
        6
      ],
      [
        28,
        3
      ],
      [
        28,
        4
      ],
      [
        28,
        5
      ],
      [
        28,
        6
      ],
      [
        28,
        7
      ],
      [
        29,
        4
      ],
      [
        29,
        5
      ],
      [
        29,
        6
      ],
      [
        30,
        5
      ],
      [
        16,
        20
      ],
      [
        17,
        19
      ],
      [
        17,
        20
      ],
      [
        17,
        21
      ],
      [
        18,
        18
      ],
      [
        18,
        19
      ],
      [
        18,
        20
      ],
      [
        18,
        21
      ],
      [
        18,
        22
      ],
      [
        19,
        19
      ],
      [
        19,
        20
      ],
      [
        19,
        21
      ],
      [
        20,
        20
      ]
    ],
    animated: [],
    noBuild: [],
    zones: [
      [
        [
          0,
          0
        ],
        [
          0,
          1
        ],
        [
          0,
          2
        ],
        [
          0,
          3
        ],
        [
          0,
          4
        ],
        [
          0,
          5
        ],
        [
          0,
          6
        ],
        [
          0,
          7
        ],
        [
          0,
          8
        ],
        [
          0,
          9
        ],
        [
          0,
          10
        ],
        [
          0,
          11
        ],
        [
          0,
          12
        ],
        [
          1,
          0
        ],
        [
          1,
          1
        ],
        [
          1,
          2
        ],
        [
          1,
          3
        ],
        [
          1,
          4
        ],
        [
          1,
          5
        ],
        [
          1,
          6
        ],
        [
          1,
          7
        ],
        [
          1,
          8
        ],
        [
          1,
          9
        ],
        [
          1,
          10
        ],
        [
          1,
          11
        ],
        [
          1,
          12
        ],
        [
          2,
          0
        ],
        [
          2,
          1
        ],
        [
          2,
          2
        ],
        [
          2,
          3
        ],
        [
          2,
          4
        ],
        [
          2,
          5
        ],
        [
          2,
          6
        ],
        [
          2,
          7
        ],
        [
          2,
          8
        ],
        [
          2,
          9
        ],
        [
          2,
          10
        ],
        [
          2,
          11
        ],
        [
          2,
          12
        ],
        [
          3,
          0
        ],
        [
          3,
          1
        ],
        [
          3,
          2
        ],
        [
          3,
          3
        ],
        [
          3,
          4
        ],
        [
          3,
          5
        ],
        [
          3,
          6
        ],
        [
          3,
          7
        ],
        [
          3,
          8
        ],
        [
          3,
          9
        ],
        [
          3,
          10
        ],
        [
          3,
          11
        ],
        [
          3,
          12
        ],
        [
          4,
          0
        ],
        [
          4,
          1
        ],
        [
          4,
          2
        ],
        [
          4,
          3
        ],
        [
          4,
          4
        ],
        [
          4,
          5
        ],
        [
          4,
          6
        ],
        [
          4,
          7
        ],
        [
          4,
          8
        ],
        [
          4,
          9
        ],
        [
          4,
          10
        ],
        [
          4,
          11
        ],
        [
          4,
          12
        ],
        [
          5,
          0
        ],
        [
          5,
          1
        ],
        [
          5,
          2
        ],
        [
          5,
          3
        ],
        [
          5,
          4
        ],
        [
          5,
          6
        ],
        [
          5,
          7
        ],
        [
          5,
          8
        ],
        [
          5,
          9
        ],
        [
          5,
          10
        ],
        [
          5,
          11
        ],
        [
          5,
          12
        ],
        [
          6,
          0
        ],
        [
          6,
          1
        ],
        [
          6,
          2
        ],
        [
          6,
          3
        ],
        [
          6,
          7
        ],
        [
          6,
          8
        ],
        [
          6,
          9
        ],
        [
          6,
          10
        ],
        [
          6,
          11
        ],
        [
          6,
          12
        ],
        [
          7,
          0
        ],
        [
          7,
          1
        ],
        [
          7,
          2
        ],
        [
          7,
          8
        ],
        [
          7,
          9
        ],
        [
          7,
          10
        ],
        [
          7,
          11
        ],
        [
          7,
          12
        ],
        [
          8,
          0
        ],
        [
          8,
          1
        ],
        [
          8,
          2
        ],
        [
          8,
          3
        ],
        [
          8,
          7
        ],
        [
          8,
          8
        ],
        [
          8,
          9
        ],
        [
          8,
          10
        ],
        [
          8,
          11
        ],
        [
          8,
          12
        ],
        [
          9,
          0
        ],
        [
          9,
          1
        ],
        [
          9,
          2
        ],
        [
          9,
          3
        ],
        [
          9,
          4
        ],
        [
          9,
          6
        ],
        [
          9,
          7
        ],
        [
          9,
          8
        ],
        [
          9,
          9
        ],
        [
          9,
          10
        ],
        [
          9,
          11
        ],
        [
          9,
          12
        ],
        [
          10,
          0
        ],
        [
          10,
          1
        ],
        [
          10,
          2
        ],
        [
          10,
          3
        ],
        [
          10,
          4
        ],
        [
          10,
          5
        ],
        [
          10,
          6
        ],
        [
          10,
          7
        ],
        [
          10,
          8
        ],
        [
          10,
          9
        ],
        [
          10,
          10
        ],
        [
          10,
          11
        ],
        [
          10,
          12
        ],
        [
          11,
          0
        ],
        [
          11,
          1
        ],
        [
          11,
          2
        ],
        [
          11,
          3
        ],
        [
          11,
          4
        ],
        [
          11,
          5
        ],
        [
          11,
          6
        ],
        [
          11,
          7
        ],
        [
          11,
          8
        ],
        [
          11,
          9
        ],
        [
          11,
          10
        ],
        [
          11,
          11
        ],
        [
          11,
          12
        ],
        [
          12,
          0
        ],
        [
          12,
          1
        ],
        [
          12,
          2
        ],
        [
          12,
          3
        ],
        [
          12,
          4
        ],
        [
          12,
          5
        ],
        [
          12,
          6
        ],
        [
          12,
          7
        ],
        [
          12,
          8
        ],
        [
          12,
          9
        ],
        [
          12,
          10
        ],
        [
          12,
          11
        ],
        [
          12,
          12
        ],
        [
          13,
          0
        ],
        [
          13,
          1
        ],
        [
          13,
          2
        ],
        [
          13,
          3
        ],
        [
          13,
          4
        ],
        [
          13,
          5
        ],
        [
          13,
          6
        ],
        [
          13,
          7
        ],
        [
          13,
          8
        ],
        [
          13,
          9
        ],
        [
          13,
          10
        ],
        [
          13,
          11
        ],
        [
          13,
          12
        ],
        [
          14,
          0
        ],
        [
          14,
          1
        ],
        [
          14,
          2
        ],
        [
          14,
          3
        ],
        [
          14,
          4
        ],
        [
          14,
          5
        ],
        [
          14,
          6
        ],
        [
          14,
          7
        ],
        [
          14,
          8
        ],
        [
          14,
          9
        ],
        [
          14,
          10
        ],
        [
          14,
          11
        ],
        [
          14,
          12
        ],
        [
          15,
          0
        ],
        [
          15,
          1
        ],
        [
          15,
          2
        ],
        [
          15,
          3
        ],
        [
          15,
          4
        ],
        [
          15,
          5
        ],
        [
          15,
          6
        ],
        [
          15,
          7
        ],
        [
          15,
          8
        ],
        [
          15,
          9
        ],
        [
          15,
          10
        ],
        [
          15,
          11
        ],
        [
          15,
          12
        ],
        [
          16,
          0
        ],
        [
          16,
          1
        ],
        [
          16,
          2
        ],
        [
          16,
          3
        ],
        [
          16,
          4
        ],
        [
          16,
          5
        ],
        [
          16,
          6
        ],
        [
          16,
          7
        ],
        [
          16,
          8
        ],
        [
          16,
          9
        ],
        [
          16,
          10
        ],
        [
          16,
          11
        ],
        [
          16,
          12
        ],
        [
          17,
          0
        ],
        [
          17,
          1
        ],
        [
          17,
          2
        ],
        [
          17,
          3
        ],
        [
          17,
          4
        ],
        [
          17,
          5
        ],
        [
          17,
          6
        ],
        [
          17,
          7
        ],
        [
          17,
          8
        ],
        [
          17,
          9
        ],
        [
          17,
          10
        ],
        [
          17,
          11
        ],
        [
          17,
          12
        ]
      ],
      [
        [
          18,
          0
        ],
        [
          18,
          1
        ],
        [
          18,
          11
        ],
        [
          18,
          12
        ],
        [
          19,
          0
        ],
        [
          19,
          1
        ],
        [
          19,
          2
        ],
        [
          19,
          3
        ],
        [
          19,
          4
        ],
        [
          19,
          5
        ],
        [
          19,
          6
        ],
        [
          19,
          7
        ],
        [
          19,
          8
        ],
        [
          19,
          9
        ],
        [
          19,
          10
        ],
        [
          19,
          11
        ],
        [
          19,
          12
        ],
        [
          20,
          0
        ],
        [
          20,
          1
        ],
        [
          20,
          2
        ],
        [
          20,
          3
        ],
        [
          20,
          4
        ],
        [
          20,
          5
        ],
        [
          20,
          6
        ],
        [
          20,
          7
        ],
        [
          20,
          8
        ],
        [
          20,
          9
        ],
        [
          20,
          10
        ],
        [
          20,
          11
        ],
        [
          20,
          12
        ],
        [
          21,
          0
        ],
        [
          21,
          1
        ],
        [
          21,
          2
        ],
        [
          21,
          3
        ],
        [
          21,
          4
        ],
        [
          21,
          5
        ],
        [
          21,
          6
        ],
        [
          21,
          7
        ],
        [
          21,
          8
        ],
        [
          21,
          9
        ],
        [
          21,
          10
        ],
        [
          21,
          11
        ],
        [
          21,
          12
        ],
        [
          22,
          0
        ],
        [
          22,
          1
        ],
        [
          22,
          2
        ],
        [
          22,
          3
        ],
        [
          22,
          4
        ],
        [
          22,
          5
        ],
        [
          22,
          6
        ],
        [
          22,
          7
        ],
        [
          22,
          8
        ],
        [
          22,
          9
        ],
        [
          22,
          10
        ],
        [
          22,
          11
        ],
        [
          22,
          12
        ],
        [
          23,
          0
        ],
        [
          23,
          1
        ],
        [
          23,
          2
        ],
        [
          23,
          3
        ],
        [
          23,
          4
        ],
        [
          23,
          5
        ],
        [
          23,
          6
        ],
        [
          23,
          7
        ],
        [
          23,
          8
        ],
        [
          23,
          9
        ],
        [
          23,
          10
        ],
        [
          23,
          11
        ],
        [
          23,
          12
        ],
        [
          24,
          0
        ],
        [
          24,
          1
        ],
        [
          24,
          2
        ],
        [
          24,
          3
        ],
        [
          24,
          4
        ],
        [
          24,
          5
        ],
        [
          24,
          6
        ],
        [
          24,
          7
        ],
        [
          24,
          8
        ],
        [
          24,
          9
        ],
        [
          24,
          10
        ],
        [
          24,
          11
        ],
        [
          24,
          12
        ],
        [
          25,
          0
        ],
        [
          25,
          1
        ],
        [
          25,
          2
        ],
        [
          25,
          3
        ],
        [
          25,
          4
        ],
        [
          25,
          5
        ],
        [
          25,
          6
        ],
        [
          25,
          7
        ],
        [
          25,
          8
        ],
        [
          25,
          9
        ],
        [
          25,
          10
        ],
        [
          25,
          11
        ],
        [
          25,
          12
        ],
        [
          26,
          0
        ],
        [
          26,
          1
        ],
        [
          26,
          2
        ],
        [
          26,
          3
        ],
        [
          26,
          4
        ],
        [
          26,
          6
        ],
        [
          26,
          7
        ],
        [
          26,
          8
        ],
        [
          26,
          9
        ],
        [
          26,
          10
        ],
        [
          26,
          11
        ],
        [
          26,
          12
        ],
        [
          27,
          0
        ],
        [
          27,
          1
        ],
        [
          27,
          2
        ],
        [
          27,
          3
        ],
        [
          27,
          7
        ],
        [
          27,
          8
        ],
        [
          27,
          9
        ],
        [
          27,
          10
        ],
        [
          27,
          11
        ],
        [
          27,
          12
        ],
        [
          28,
          0
        ],
        [
          28,
          1
        ],
        [
          28,
          2
        ],
        [
          28,
          8
        ],
        [
          28,
          9
        ],
        [
          28,
          10
        ],
        [
          28,
          11
        ],
        [
          28,
          12
        ],
        [
          29,
          0
        ],
        [
          29,
          1
        ],
        [
          29,
          2
        ],
        [
          29,
          3
        ],
        [
          29,
          7
        ],
        [
          29,
          8
        ],
        [
          29,
          9
        ],
        [
          29,
          10
        ],
        [
          29,
          11
        ],
        [
          29,
          12
        ],
        [
          30,
          0
        ],
        [
          30,
          1
        ],
        [
          30,
          2
        ],
        [
          30,
          3
        ],
        [
          30,
          4
        ],
        [
          30,
          6
        ],
        [
          30,
          7
        ],
        [
          30,
          8
        ],
        [
          30,
          9
        ],
        [
          30,
          10
        ],
        [
          30,
          11
        ],
        [
          30,
          12
        ],
        [
          31,
          0
        ],
        [
          31,
          1
        ],
        [
          31,
          2
        ],
        [
          31,
          3
        ],
        [
          31,
          4
        ],
        [
          31,
          5
        ],
        [
          31,
          6
        ],
        [
          31,
          7
        ],
        [
          31,
          8
        ],
        [
          31,
          9
        ],
        [
          31,
          10
        ],
        [
          31,
          11
        ],
        [
          31,
          12
        ],
        [
          32,
          0
        ],
        [
          32,
          1
        ],
        [
          32,
          2
        ],
        [
          32,
          3
        ],
        [
          32,
          4
        ],
        [
          32,
          5
        ],
        [
          32,
          6
        ],
        [
          32,
          7
        ],
        [
          32,
          8
        ],
        [
          32,
          9
        ],
        [
          32,
          10
        ],
        [
          32,
          11
        ],
        [
          32,
          12
        ],
        [
          33,
          0
        ],
        [
          33,
          1
        ],
        [
          33,
          2
        ],
        [
          33,
          3
        ],
        [
          33,
          4
        ],
        [
          33,
          5
        ],
        [
          33,
          6
        ],
        [
          33,
          7
        ],
        [
          33,
          8
        ],
        [
          33,
          9
        ],
        [
          33,
          10
        ],
        [
          33,
          11
        ],
        [
          33,
          12
        ],
        [
          34,
          0
        ],
        [
          34,
          1
        ],
        [
          34,
          2
        ],
        [
          34,
          3
        ],
        [
          34,
          4
        ],
        [
          34,
          5
        ],
        [
          34,
          6
        ],
        [
          34,
          7
        ],
        [
          34,
          8
        ],
        [
          34,
          9
        ],
        [
          34,
          10
        ],
        [
          34,
          11
        ],
        [
          34,
          12
        ],
        [
          35,
          0
        ],
        [
          35,
          1
        ],
        [
          35,
          2
        ],
        [
          35,
          3
        ],
        [
          35,
          4
        ],
        [
          35,
          5
        ],
        [
          35,
          6
        ],
        [
          35,
          7
        ],
        [
          35,
          8
        ],
        [
          35,
          9
        ],
        [
          35,
          10
        ],
        [
          35,
          11
        ],
        [
          35,
          12
        ]
      ],
      [
        [
          0,
          13
        ],
        [
          0,
          14
        ],
        [
          0,
          15
        ],
        [
          0,
          16
        ],
        [
          0,
          17
        ],
        [
          0,
          18
        ],
        [
          0,
          19
        ],
        [
          0,
          20
        ],
        [
          0,
          21
        ],
        [
          0,
          22
        ],
        [
          0,
          23
        ],
        [
          0,
          24
        ],
        [
          0,
          25
        ],
        [
          1,
          13
        ],
        [
          1,
          14
        ],
        [
          1,
          15
        ],
        [
          1,
          16
        ],
        [
          1,
          17
        ],
        [
          1,
          18
        ],
        [
          1,
          19
        ],
        [
          1,
          20
        ],
        [
          1,
          21
        ],
        [
          1,
          22
        ],
        [
          1,
          23
        ],
        [
          1,
          24
        ],
        [
          1,
          25
        ],
        [
          2,
          13
        ],
        [
          2,
          14
        ],
        [
          2,
          15
        ],
        [
          2,
          16
        ],
        [
          2,
          17
        ],
        [
          2,
          18
        ],
        [
          2,
          19
        ],
        [
          2,
          20
        ],
        [
          2,
          21
        ],
        [
          2,
          22
        ],
        [
          2,
          23
        ],
        [
          2,
          24
        ],
        [
          2,
          25
        ],
        [
          3,
          13
        ],
        [
          3,
          14
        ],
        [
          3,
          15
        ],
        [
          3,
          16
        ],
        [
          3,
          17
        ],
        [
          3,
          18
        ],
        [
          3,
          19
        ],
        [
          3,
          20
        ],
        [
          3,
          21
        ],
        [
          3,
          22
        ],
        [
          3,
          23
        ],
        [
          3,
          24
        ],
        [
          3,
          25
        ],
        [
          4,
          13
        ],
        [
          4,
          14
        ],
        [
          4,
          15
        ],
        [
          4,
          16
        ],
        [
          4,
          17
        ],
        [
          4,
          18
        ],
        [
          4,
          19
        ],
        [
          4,
          20
        ],
        [
          4,
          21
        ],
        [
          4,
          22
        ],
        [
          4,
          23
        ],
        [
          4,
          24
        ],
        [
          4,
          25
        ],
        [
          5,
          13
        ],
        [
          5,
          14
        ],
        [
          5,
          15
        ],
        [
          5,
          16
        ],
        [
          5,
          17
        ],
        [
          5,
          18
        ],
        [
          5,
          19
        ],
        [
          5,
          20
        ],
        [
          5,
          21
        ],
        [
          5,
          22
        ],
        [
          5,
          23
        ],
        [
          5,
          24
        ],
        [
          5,
          25
        ],
        [
          6,
          13
        ],
        [
          6,
          14
        ],
        [
          6,
          15
        ],
        [
          6,
          16
        ],
        [
          6,
          17
        ],
        [
          6,
          18
        ],
        [
          6,
          19
        ],
        [
          6,
          20
        ],
        [
          6,
          21
        ],
        [
          6,
          22
        ],
        [
          6,
          23
        ],
        [
          6,
          24
        ],
        [
          6,
          25
        ],
        [
          7,
          13
        ],
        [
          7,
          14
        ],
        [
          7,
          15
        ],
        [
          7,
          16
        ],
        [
          7,
          17
        ],
        [
          7,
          18
        ],
        [
          7,
          19
        ],
        [
          7,
          20
        ],
        [
          7,
          21
        ],
        [
          7,
          22
        ],
        [
          7,
          23
        ],
        [
          7,
          24
        ],
        [
          7,
          25
        ],
        [
          8,
          13
        ],
        [
          8,
          14
        ],
        [
          8,
          15
        ],
        [
          8,
          16
        ],
        [
          8,
          17
        ],
        [
          8,
          18
        ],
        [
          8,
          19
        ],
        [
          8,
          20
        ],
        [
          8,
          21
        ],
        [
          8,
          22
        ],
        [
          8,
          23
        ],
        [
          8,
          24
        ],
        [
          8,
          25
        ],
        [
          9,
          13
        ],
        [
          9,
          14
        ],
        [
          9,
          15
        ],
        [
          9,
          16
        ],
        [
          9,
          17
        ],
        [
          9,
          18
        ],
        [
          9,
          19
        ],
        [
          9,
          20
        ],
        [
          9,
          21
        ],
        [
          9,
          23
        ],
        [
          9,
          24
        ],
        [
          9,
          25
        ],
        [
          10,
          13
        ],
        [
          10,
          14
        ],
        [
          10,
          15
        ],
        [
          10,
          16
        ],
        [
          10,
          17
        ],
        [
          10,
          18
        ],
        [
          10,
          19
        ],
        [
          10,
          20
        ],
        [
          10,
          22
        ],
        [
          10,
          23
        ],
        [
          10,
          24
        ],
        [
          10,
          25
        ],
        [
          11,
          13
        ],
        [
          11,
          14
        ],
        [
          11,
          15
        ],
        [
          11,
          16
        ],
        [
          11,
          17
        ],
        [
          11,
          18
        ],
        [
          11,
          19
        ],
        [
          11,
          21
        ],
        [
          11,
          22
        ],
        [
          11,
          23
        ],
        [
          11,
          24
        ],
        [
          11,
          25
        ],
        [
          12,
          13
        ],
        [
          12,
          14
        ],
        [
          12,
          15
        ],
        [
          12,
          16
        ],
        [
          12,
          17
        ],
        [
          12,
          18
        ],
        [
          12,
          20
        ],
        [
          12,
          21
        ],
        [
          12,
          22
        ],
        [
          12,
          23
        ],
        [
          12,
          24
        ],
        [
          12,
          25
        ],
        [
          13,
          13
        ],
        [
          13,
          14
        ],
        [
          13,
          15
        ],
        [
          13,
          16
        ],
        [
          13,
          17
        ],
        [
          13,
          18
        ],
        [
          13,
          19
        ],
        [
          13,
          20
        ],
        [
          13,
          21
        ],
        [
          13,
          22
        ],
        [
          13,
          23
        ],
        [
          13,
          24
        ],
        [
          13,
          25
        ],
        [
          14,
          13
        ],
        [
          14,
          14
        ],
        [
          14,
          15
        ],
        [
          14,
          16
        ],
        [
          14,
          17
        ],
        [
          14,
          18
        ],
        [
          14,
          19
        ],
        [
          14,
          20
        ],
        [
          14,
          21
        ],
        [
          14,
          22
        ],
        [
          14,
          23
        ],
        [
          14,
          24
        ],
        [
          14,
          25
        ],
        [
          15,
          13
        ],
        [
          15,
          14
        ],
        [
          15,
          15
        ],
        [
          15,
          16
        ],
        [
          15,
          17
        ],
        [
          15,
          18
        ],
        [
          15,
          19
        ],
        [
          15,
          20
        ],
        [
          15,
          21
        ],
        [
          15,
          22
        ],
        [
          15,
          23
        ],
        [
          15,
          24
        ],
        [
          15,
          25
        ],
        [
          16,
          13
        ],
        [
          16,
          14
        ],
        [
          16,
          16
        ],
        [
          16,
          17
        ],
        [
          16,
          18
        ],
        [
          16,
          19
        ],
        [
          16,
          21
        ],
        [
          16,
          22
        ],
        [
          16,
          23
        ],
        [
          16,
          24
        ],
        [
          16,
          25
        ],
        [
          17,
          13
        ],
        [
          17,
          15
        ],
        [
          17,
          16
        ],
        [
          17,
          17
        ],
        [
          17,
          18
        ],
        [
          17,
          22
        ],
        [
          17,
          23
        ],
        [
          17,
          24
        ],
        [
          17,
          25
        ],
        [
          18,
          13
        ],
        [
          18,
          14
        ],
        [
          18,
          15
        ],
        [
          18,
          16
        ],
        [
          18,
          17
        ],
        [
          18,
          23
        ],
        [
          18,
          24
        ],
        [
          18,
          25
        ],
        [
          19,
          13
        ],
        [
          19,
          15
        ],
        [
          19,
          16
        ],
        [
          19,
          17
        ],
        [
          19,
          18
        ],
        [
          19,
          22
        ],
        [
          19,
          23
        ],
        [
          19,
          24
        ],
        [
          19,
          25
        ],
        [
          20,
          13
        ],
        [
          20,
          14
        ],
        [
          20,
          16
        ],
        [
          20,
          17
        ],
        [
          20,
          18
        ],
        [
          20,
          19
        ],
        [
          20,
          21
        ],
        [
          20,
          22
        ],
        [
          20,
          23
        ],
        [
          20,
          24
        ],
        [
          20,
          25
        ],
        [
          21,
          13
        ],
        [
          21,
          14
        ],
        [
          21,
          15
        ],
        [
          21,
          16
        ],
        [
          21,
          17
        ],
        [
          21,
          18
        ],
        [
          21,
          19
        ],
        [
          21,
          20
        ],
        [
          21,
          21
        ],
        [
          21,
          22
        ],
        [
          21,
          23
        ],
        [
          21,
          24
        ],
        [
          21,
          25
        ],
        [
          22,
          13
        ],
        [
          22,
          14
        ],
        [
          22,
          15
        ],
        [
          22,
          16
        ],
        [
          22,
          17
        ],
        [
          22,
          18
        ],
        [
          22,
          19
        ],
        [
          22,
          20
        ],
        [
          22,
          21
        ],
        [
          22,
          22
        ],
        [
          22,
          23
        ],
        [
          22,
          24
        ],
        [
          22,
          25
        ],
        [
          23,
          13
        ],
        [
          23,
          14
        ],
        [
          23,
          15
        ],
        [
          23,
          16
        ],
        [
          23,
          17
        ],
        [
          23,
          18
        ],
        [
          23,
          19
        ],
        [
          23,
          20
        ],
        [
          23,
          21
        ],
        [
          23,
          22
        ],
        [
          23,
          23
        ],
        [
          23,
          24
        ],
        [
          23,
          25
        ],
        [
          24,
          13
        ],
        [
          24,
          14
        ],
        [
          24,
          15
        ],
        [
          24,
          16
        ],
        [
          24,
          17
        ],
        [
          24,
          18
        ],
        [
          24,
          20
        ],
        [
          24,
          21
        ],
        [
          24,
          22
        ],
        [
          24,
          23
        ],
        [
          24,
          24
        ],
        [
          24,
          25
        ],
        [
          25,
          13
        ],
        [
          25,
          14
        ],
        [
          25,
          15
        ],
        [
          25,
          16
        ],
        [
          25,
          17
        ],
        [
          25,
          18
        ],
        [
          25,
          19
        ],
        [
          25,
          21
        ],
        [
          25,
          22
        ],
        [
          25,
          23
        ],
        [
          25,
          24
        ],
        [
          25,
          25
        ],
        [
          26,
          13
        ],
        [
          26,
          14
        ],
        [
          26,
          15
        ],
        [
          26,
          16
        ],
        [
          26,
          17
        ],
        [
          26,
          18
        ],
        [
          26,
          19
        ],
        [
          26,
          20
        ],
        [
          26,
          22
        ],
        [
          26,
          23
        ],
        [
          26,
          24
        ],
        [
          26,
          25
        ],
        [
          27,
          13
        ],
        [
          27,
          14
        ],
        [
          27,
          15
        ],
        [
          27,
          16
        ],
        [
          27,
          17
        ],
        [
          27,
          18
        ],
        [
          27,
          19
        ],
        [
          27,
          20
        ],
        [
          27,
          21
        ],
        [
          27,
          23
        ],
        [
          27,
          24
        ],
        [
          27,
          25
        ],
        [
          28,
          13
        ],
        [
          28,
          14
        ],
        [
          28,
          15
        ],
        [
          28,
          16
        ],
        [
          28,
          17
        ],
        [
          28,
          18
        ],
        [
          28,
          19
        ],
        [
          28,
          20
        ],
        [
          28,
          21
        ],
        [
          28,
          22
        ],
        [
          28,
          23
        ],
        [
          28,
          24
        ],
        [
          28,
          25
        ],
        [
          29,
          13
        ],
        [
          29,
          14
        ],
        [
          29,
          15
        ],
        [
          29,
          16
        ],
        [
          29,
          17
        ],
        [
          29,
          18
        ],
        [
          29,
          19
        ],
        [
          29,
          20
        ],
        [
          29,
          21
        ],
        [
          29,
          22
        ],
        [
          29,
          23
        ],
        [
          29,
          24
        ],
        [
          29,
          25
        ],
        [
          30,
          13
        ],
        [
          30,
          14
        ],
        [
          30,
          15
        ],
        [
          30,
          16
        ],
        [
          30,
          17
        ],
        [
          30,
          18
        ],
        [
          30,
          19
        ],
        [
          30,
          20
        ],
        [
          30,
          21
        ],
        [
          30,
          22
        ],
        [
          30,
          23
        ],
        [
          30,
          24
        ],
        [
          30,
          25
        ],
        [
          31,
          13
        ],
        [
          31,
          14
        ],
        [
          31,
          15
        ],
        [
          31,
          16
        ],
        [
          31,
          17
        ],
        [
          31,
          18
        ],
        [
          31,
          19
        ],
        [
          31,
          20
        ],
        [
          31,
          21
        ],
        [
          31,
          22
        ],
        [
          31,
          23
        ],
        [
          31,
          24
        ],
        [
          31,
          25
        ],
        [
          32,
          13
        ],
        [
          32,
          14
        ],
        [
          32,
          15
        ],
        [
          32,
          16
        ],
        [
          32,
          17
        ],
        [
          32,
          18
        ],
        [
          32,
          19
        ],
        [
          32,
          20
        ],
        [
          32,
          21
        ],
        [
          32,
          22
        ],
        [
          32,
          23
        ],
        [
          32,
          24
        ],
        [
          32,
          25
        ],
        [
          33,
          13
        ],
        [
          33,
          14
        ],
        [
          33,
          15
        ],
        [
          33,
          16
        ],
        [
          33,
          17
        ],
        [
          33,
          18
        ],
        [
          33,
          19
        ],
        [
          33,
          20
        ],
        [
          33,
          21
        ],
        [
          33,
          22
        ],
        [
          33,
          23
        ],
        [
          33,
          24
        ],
        [
          33,
          25
        ],
        [
          34,
          13
        ],
        [
          34,
          14
        ],
        [
          34,
          15
        ],
        [
          34,
          16
        ],
        [
          34,
          17
        ],
        [
          34,
          18
        ],
        [
          34,
          19
        ],
        [
          34,
          20
        ],
        [
          34,
          21
        ],
        [
          34,
          22
        ],
        [
          34,
          23
        ],
        [
          34,
          24
        ],
        [
          34,
          25
        ],
        [
          35,
          13
        ],
        [
          35,
          14
        ],
        [
          35,
          15
        ],
        [
          35,
          16
        ],
        [
          35,
          17
        ],
        [
          35,
          18
        ],
        [
          35,
          19
        ],
        [
          35,
          20
        ],
        [
          35,
          21
        ],
        [
          35,
          22
        ],
        [
          35,
          23
        ],
        [
          35,
          24
        ],
        [
          35,
          25
        ]
      ]
    ],
    zoneColors: [
      "#ff4444",
      "#4488ff",
      "#44ff88"
    ],
    spawners: [
      {
        entry: [
          0,
          1
        ],
        waypoints: [
          [
            35,
            1
          ],
          [
            18,
            24
          ],
          [
            0,
            1
          ],
          [
            35,
            1
          ],
          [
            18,
            24
          ]
        ],
        exit: [
          0,
          1
        ]
      },
      {
        entry: [
          35,
          1
        ],
        waypoints: [
          [
            18,
            24
          ],
          [
            0,
            1
          ],
          [
            35,
            1
          ],
          [
            18,
            24
          ],
          [
            0,
            1
          ]
        ],
        exit: [
          35,
          1
        ]
      },
      {
        entry: [
          18,
          24
        ],
        waypoints: [
          [
            0,
            1
          ],
          [
            35,
            1
          ],
          [
            18,
            24
          ],
          [
            0,
            1
          ],
          [
            35,
            1
          ]
        ],
        exit: [
          18,
          24
        ]
      }
    ]
  };

  // src/data/maps/circle/circle_4p.json
  var circle_4p_default = {
    id: "circle_4p",
    name: "Circle 4P \u2014 Quadrants",
    description: "4-player co-op on a cross-divided map. Creeps rotate through all four quadrants.",
    playerCount: 4,
    theme: "forest",
    blocked: [
      [
        17,
        2
      ],
      [
        18,
        2
      ],
      [
        6,
        3
      ],
      [
        17,
        3
      ],
      [
        18,
        3
      ],
      [
        29,
        3
      ],
      [
        5,
        4
      ],
      [
        6,
        4
      ],
      [
        7,
        4
      ],
      [
        17,
        4
      ],
      [
        18,
        4
      ],
      [
        28,
        4
      ],
      [
        29,
        4
      ],
      [
        30,
        4
      ],
      [
        4,
        5
      ],
      [
        5,
        5
      ],
      [
        6,
        5
      ],
      [
        7,
        5
      ],
      [
        8,
        5
      ],
      [
        17,
        5
      ],
      [
        18,
        5
      ],
      [
        27,
        5
      ],
      [
        28,
        5
      ],
      [
        29,
        5
      ],
      [
        30,
        5
      ],
      [
        31,
        5
      ],
      [
        5,
        6
      ],
      [
        6,
        6
      ],
      [
        7,
        6
      ],
      [
        17,
        6
      ],
      [
        18,
        6
      ],
      [
        28,
        6
      ],
      [
        29,
        6
      ],
      [
        30,
        6
      ],
      [
        6,
        7
      ],
      [
        17,
        7
      ],
      [
        18,
        7
      ],
      [
        29,
        7
      ],
      [
        17,
        8
      ],
      [
        18,
        8
      ],
      [
        17,
        9
      ],
      [
        18,
        9
      ],
      [
        17,
        10
      ],
      [
        18,
        10
      ],
      [
        2,
        13
      ],
      [
        3,
        13
      ],
      [
        4,
        13
      ],
      [
        5,
        13
      ],
      [
        6,
        13
      ],
      [
        7,
        13
      ],
      [
        8,
        13
      ],
      [
        9,
        13
      ],
      [
        10,
        13
      ],
      [
        11,
        13
      ],
      [
        12,
        13
      ],
      [
        13,
        13
      ],
      [
        14,
        13
      ],
      [
        15,
        13
      ],
      [
        21,
        13
      ],
      [
        22,
        13
      ],
      [
        23,
        13
      ],
      [
        24,
        13
      ],
      [
        25,
        13
      ],
      [
        26,
        13
      ],
      [
        27,
        13
      ],
      [
        28,
        13
      ],
      [
        29,
        13
      ],
      [
        30,
        13
      ],
      [
        31,
        13
      ],
      [
        32,
        13
      ],
      [
        33,
        13
      ],
      [
        17,
        16
      ],
      [
        18,
        16
      ],
      [
        17,
        17
      ],
      [
        18,
        17
      ],
      [
        6,
        18
      ],
      [
        17,
        18
      ],
      [
        18,
        18
      ],
      [
        29,
        18
      ],
      [
        5,
        19
      ],
      [
        6,
        19
      ],
      [
        7,
        19
      ],
      [
        17,
        19
      ],
      [
        18,
        19
      ],
      [
        28,
        19
      ],
      [
        29,
        19
      ],
      [
        30,
        19
      ],
      [
        4,
        20
      ],
      [
        5,
        20
      ],
      [
        6,
        20
      ],
      [
        7,
        20
      ],
      [
        8,
        20
      ],
      [
        17,
        20
      ],
      [
        18,
        20
      ],
      [
        27,
        20
      ],
      [
        28,
        20
      ],
      [
        29,
        20
      ],
      [
        30,
        20
      ],
      [
        31,
        20
      ],
      [
        5,
        21
      ],
      [
        6,
        21
      ],
      [
        7,
        21
      ],
      [
        17,
        21
      ],
      [
        18,
        21
      ],
      [
        28,
        21
      ],
      [
        29,
        21
      ],
      [
        30,
        21
      ],
      [
        6,
        22
      ],
      [
        17,
        22
      ],
      [
        18,
        22
      ],
      [
        29,
        22
      ],
      [
        17,
        23
      ],
      [
        18,
        23
      ]
    ],
    animated: [],
    noBuild: [],
    zones: [
      [
        [
          0,
          0
        ],
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          4,
          0
        ],
        [
          5,
          0
        ],
        [
          6,
          0
        ],
        [
          7,
          0
        ],
        [
          8,
          0
        ],
        [
          9,
          0
        ],
        [
          10,
          0
        ],
        [
          11,
          0
        ],
        [
          12,
          0
        ],
        [
          13,
          0
        ],
        [
          14,
          0
        ],
        [
          15,
          0
        ],
        [
          16,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          4,
          1
        ],
        [
          5,
          1
        ],
        [
          6,
          1
        ],
        [
          7,
          1
        ],
        [
          8,
          1
        ],
        [
          9,
          1
        ],
        [
          10,
          1
        ],
        [
          11,
          1
        ],
        [
          12,
          1
        ],
        [
          13,
          1
        ],
        [
          14,
          1
        ],
        [
          15,
          1
        ],
        [
          16,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          4,
          2
        ],
        [
          5,
          2
        ],
        [
          6,
          2
        ],
        [
          7,
          2
        ],
        [
          8,
          2
        ],
        [
          9,
          2
        ],
        [
          10,
          2
        ],
        [
          11,
          2
        ],
        [
          12,
          2
        ],
        [
          13,
          2
        ],
        [
          14,
          2
        ],
        [
          15,
          2
        ],
        [
          16,
          2
        ],
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
          3
        ],
        [
          3,
          3
        ],
        [
          4,
          3
        ],
        [
          5,
          3
        ],
        [
          7,
          3
        ],
        [
          8,
          3
        ],
        [
          9,
          3
        ],
        [
          10,
          3
        ],
        [
          11,
          3
        ],
        [
          12,
          3
        ],
        [
          13,
          3
        ],
        [
          14,
          3
        ],
        [
          15,
          3
        ],
        [
          16,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          3,
          4
        ],
        [
          4,
          4
        ],
        [
          8,
          4
        ],
        [
          9,
          4
        ],
        [
          10,
          4
        ],
        [
          11,
          4
        ],
        [
          12,
          4
        ],
        [
          13,
          4
        ],
        [
          14,
          4
        ],
        [
          15,
          4
        ],
        [
          16,
          4
        ],
        [
          0,
          5
        ],
        [
          1,
          5
        ],
        [
          2,
          5
        ],
        [
          3,
          5
        ],
        [
          9,
          5
        ],
        [
          10,
          5
        ],
        [
          11,
          5
        ],
        [
          12,
          5
        ],
        [
          13,
          5
        ],
        [
          14,
          5
        ],
        [
          15,
          5
        ],
        [
          16,
          5
        ],
        [
          0,
          6
        ],
        [
          1,
          6
        ],
        [
          2,
          6
        ],
        [
          3,
          6
        ],
        [
          4,
          6
        ],
        [
          8,
          6
        ],
        [
          9,
          6
        ],
        [
          10,
          6
        ],
        [
          11,
          6
        ],
        [
          12,
          6
        ],
        [
          13,
          6
        ],
        [
          14,
          6
        ],
        [
          15,
          6
        ],
        [
          16,
          6
        ],
        [
          0,
          7
        ],
        [
          1,
          7
        ],
        [
          2,
          7
        ],
        [
          3,
          7
        ],
        [
          4,
          7
        ],
        [
          5,
          7
        ],
        [
          7,
          7
        ],
        [
          8,
          7
        ],
        [
          9,
          7
        ],
        [
          10,
          7
        ],
        [
          11,
          7
        ],
        [
          12,
          7
        ],
        [
          13,
          7
        ],
        [
          14,
          7
        ],
        [
          15,
          7
        ],
        [
          16,
          7
        ],
        [
          0,
          8
        ],
        [
          1,
          8
        ],
        [
          2,
          8
        ],
        [
          3,
          8
        ],
        [
          4,
          8
        ],
        [
          5,
          8
        ],
        [
          6,
          8
        ],
        [
          7,
          8
        ],
        [
          8,
          8
        ],
        [
          9,
          8
        ],
        [
          10,
          8
        ],
        [
          11,
          8
        ],
        [
          12,
          8
        ],
        [
          13,
          8
        ],
        [
          14,
          8
        ],
        [
          15,
          8
        ],
        [
          16,
          8
        ],
        [
          0,
          9
        ],
        [
          1,
          9
        ],
        [
          2,
          9
        ],
        [
          3,
          9
        ],
        [
          4,
          9
        ],
        [
          5,
          9
        ],
        [
          6,
          9
        ],
        [
          7,
          9
        ],
        [
          8,
          9
        ],
        [
          9,
          9
        ],
        [
          10,
          9
        ],
        [
          11,
          9
        ],
        [
          12,
          9
        ],
        [
          13,
          9
        ],
        [
          14,
          9
        ],
        [
          15,
          9
        ],
        [
          16,
          9
        ],
        [
          0,
          10
        ],
        [
          1,
          10
        ],
        [
          2,
          10
        ],
        [
          3,
          10
        ],
        [
          4,
          10
        ],
        [
          5,
          10
        ],
        [
          6,
          10
        ],
        [
          7,
          10
        ],
        [
          8,
          10
        ],
        [
          9,
          10
        ],
        [
          10,
          10
        ],
        [
          11,
          10
        ],
        [
          12,
          10
        ],
        [
          13,
          10
        ],
        [
          14,
          10
        ],
        [
          15,
          10
        ],
        [
          16,
          10
        ],
        [
          0,
          11
        ],
        [
          1,
          11
        ],
        [
          2,
          11
        ],
        [
          3,
          11
        ],
        [
          4,
          11
        ],
        [
          5,
          11
        ],
        [
          6,
          11
        ],
        [
          7,
          11
        ],
        [
          8,
          11
        ],
        [
          9,
          11
        ],
        [
          10,
          11
        ],
        [
          11,
          11
        ],
        [
          12,
          11
        ],
        [
          13,
          11
        ],
        [
          14,
          11
        ],
        [
          15,
          11
        ],
        [
          16,
          11
        ],
        [
          0,
          12
        ],
        [
          1,
          12
        ],
        [
          2,
          12
        ],
        [
          3,
          12
        ],
        [
          4,
          12
        ],
        [
          5,
          12
        ],
        [
          6,
          12
        ],
        [
          7,
          12
        ],
        [
          8,
          12
        ],
        [
          9,
          12
        ],
        [
          10,
          12
        ],
        [
          11,
          12
        ],
        [
          12,
          12
        ],
        [
          13,
          12
        ],
        [
          14,
          12
        ],
        [
          15,
          12
        ],
        [
          16,
          12
        ]
      ],
      [
        [
          19,
          0
        ],
        [
          20,
          0
        ],
        [
          21,
          0
        ],
        [
          22,
          0
        ],
        [
          23,
          0
        ],
        [
          24,
          0
        ],
        [
          25,
          0
        ],
        [
          26,
          0
        ],
        [
          27,
          0
        ],
        [
          28,
          0
        ],
        [
          29,
          0
        ],
        [
          30,
          0
        ],
        [
          31,
          0
        ],
        [
          32,
          0
        ],
        [
          33,
          0
        ],
        [
          34,
          0
        ],
        [
          35,
          0
        ],
        [
          19,
          1
        ],
        [
          20,
          1
        ],
        [
          21,
          1
        ],
        [
          22,
          1
        ],
        [
          23,
          1
        ],
        [
          24,
          1
        ],
        [
          25,
          1
        ],
        [
          26,
          1
        ],
        [
          27,
          1
        ],
        [
          28,
          1
        ],
        [
          29,
          1
        ],
        [
          30,
          1
        ],
        [
          31,
          1
        ],
        [
          32,
          1
        ],
        [
          33,
          1
        ],
        [
          34,
          1
        ],
        [
          35,
          1
        ],
        [
          19,
          2
        ],
        [
          20,
          2
        ],
        [
          21,
          2
        ],
        [
          22,
          2
        ],
        [
          23,
          2
        ],
        [
          24,
          2
        ],
        [
          25,
          2
        ],
        [
          26,
          2
        ],
        [
          27,
          2
        ],
        [
          28,
          2
        ],
        [
          29,
          2
        ],
        [
          30,
          2
        ],
        [
          31,
          2
        ],
        [
          32,
          2
        ],
        [
          33,
          2
        ],
        [
          34,
          2
        ],
        [
          35,
          2
        ],
        [
          19,
          3
        ],
        [
          20,
          3
        ],
        [
          21,
          3
        ],
        [
          22,
          3
        ],
        [
          23,
          3
        ],
        [
          24,
          3
        ],
        [
          25,
          3
        ],
        [
          26,
          3
        ],
        [
          27,
          3
        ],
        [
          28,
          3
        ],
        [
          30,
          3
        ],
        [
          31,
          3
        ],
        [
          32,
          3
        ],
        [
          33,
          3
        ],
        [
          34,
          3
        ],
        [
          35,
          3
        ],
        [
          19,
          4
        ],
        [
          20,
          4
        ],
        [
          21,
          4
        ],
        [
          22,
          4
        ],
        [
          23,
          4
        ],
        [
          24,
          4
        ],
        [
          25,
          4
        ],
        [
          26,
          4
        ],
        [
          27,
          4
        ],
        [
          31,
          4
        ],
        [
          32,
          4
        ],
        [
          33,
          4
        ],
        [
          34,
          4
        ],
        [
          35,
          4
        ],
        [
          19,
          5
        ],
        [
          20,
          5
        ],
        [
          21,
          5
        ],
        [
          22,
          5
        ],
        [
          23,
          5
        ],
        [
          24,
          5
        ],
        [
          25,
          5
        ],
        [
          26,
          5
        ],
        [
          32,
          5
        ],
        [
          33,
          5
        ],
        [
          34,
          5
        ],
        [
          35,
          5
        ],
        [
          19,
          6
        ],
        [
          20,
          6
        ],
        [
          21,
          6
        ],
        [
          22,
          6
        ],
        [
          23,
          6
        ],
        [
          24,
          6
        ],
        [
          25,
          6
        ],
        [
          26,
          6
        ],
        [
          27,
          6
        ],
        [
          31,
          6
        ],
        [
          32,
          6
        ],
        [
          33,
          6
        ],
        [
          34,
          6
        ],
        [
          35,
          6
        ],
        [
          19,
          7
        ],
        [
          20,
          7
        ],
        [
          21,
          7
        ],
        [
          22,
          7
        ],
        [
          23,
          7
        ],
        [
          24,
          7
        ],
        [
          25,
          7
        ],
        [
          26,
          7
        ],
        [
          27,
          7
        ],
        [
          28,
          7
        ],
        [
          30,
          7
        ],
        [
          31,
          7
        ],
        [
          32,
          7
        ],
        [
          33,
          7
        ],
        [
          34,
          7
        ],
        [
          35,
          7
        ],
        [
          19,
          8
        ],
        [
          20,
          8
        ],
        [
          21,
          8
        ],
        [
          22,
          8
        ],
        [
          23,
          8
        ],
        [
          24,
          8
        ],
        [
          25,
          8
        ],
        [
          26,
          8
        ],
        [
          27,
          8
        ],
        [
          28,
          8
        ],
        [
          29,
          8
        ],
        [
          30,
          8
        ],
        [
          31,
          8
        ],
        [
          32,
          8
        ],
        [
          33,
          8
        ],
        [
          34,
          8
        ],
        [
          35,
          8
        ],
        [
          19,
          9
        ],
        [
          20,
          9
        ],
        [
          21,
          9
        ],
        [
          22,
          9
        ],
        [
          23,
          9
        ],
        [
          24,
          9
        ],
        [
          25,
          9
        ],
        [
          26,
          9
        ],
        [
          27,
          9
        ],
        [
          28,
          9
        ],
        [
          29,
          9
        ],
        [
          30,
          9
        ],
        [
          31,
          9
        ],
        [
          32,
          9
        ],
        [
          33,
          9
        ],
        [
          34,
          9
        ],
        [
          35,
          9
        ],
        [
          19,
          10
        ],
        [
          20,
          10
        ],
        [
          21,
          10
        ],
        [
          22,
          10
        ],
        [
          23,
          10
        ],
        [
          24,
          10
        ],
        [
          25,
          10
        ],
        [
          26,
          10
        ],
        [
          27,
          10
        ],
        [
          28,
          10
        ],
        [
          29,
          10
        ],
        [
          30,
          10
        ],
        [
          31,
          10
        ],
        [
          32,
          10
        ],
        [
          33,
          10
        ],
        [
          34,
          10
        ],
        [
          35,
          10
        ],
        [
          19,
          11
        ],
        [
          20,
          11
        ],
        [
          21,
          11
        ],
        [
          22,
          11
        ],
        [
          23,
          11
        ],
        [
          24,
          11
        ],
        [
          25,
          11
        ],
        [
          26,
          11
        ],
        [
          27,
          11
        ],
        [
          28,
          11
        ],
        [
          29,
          11
        ],
        [
          30,
          11
        ],
        [
          31,
          11
        ],
        [
          32,
          11
        ],
        [
          33,
          11
        ],
        [
          34,
          11
        ],
        [
          35,
          11
        ],
        [
          19,
          12
        ],
        [
          20,
          12
        ],
        [
          21,
          12
        ],
        [
          22,
          12
        ],
        [
          23,
          12
        ],
        [
          24,
          12
        ],
        [
          25,
          12
        ],
        [
          26,
          12
        ],
        [
          27,
          12
        ],
        [
          28,
          12
        ],
        [
          29,
          12
        ],
        [
          30,
          12
        ],
        [
          31,
          12
        ],
        [
          32,
          12
        ],
        [
          33,
          12
        ],
        [
          34,
          12
        ],
        [
          35,
          12
        ]
      ],
      [
        [
          0,
          14
        ],
        [
          1,
          14
        ],
        [
          2,
          14
        ],
        [
          3,
          14
        ],
        [
          4,
          14
        ],
        [
          5,
          14
        ],
        [
          6,
          14
        ],
        [
          7,
          14
        ],
        [
          8,
          14
        ],
        [
          9,
          14
        ],
        [
          10,
          14
        ],
        [
          11,
          14
        ],
        [
          12,
          14
        ],
        [
          13,
          14
        ],
        [
          14,
          14
        ],
        [
          15,
          14
        ],
        [
          16,
          14
        ],
        [
          0,
          15
        ],
        [
          1,
          15
        ],
        [
          2,
          15
        ],
        [
          3,
          15
        ],
        [
          4,
          15
        ],
        [
          5,
          15
        ],
        [
          6,
          15
        ],
        [
          7,
          15
        ],
        [
          8,
          15
        ],
        [
          9,
          15
        ],
        [
          10,
          15
        ],
        [
          11,
          15
        ],
        [
          12,
          15
        ],
        [
          13,
          15
        ],
        [
          14,
          15
        ],
        [
          15,
          15
        ],
        [
          16,
          15
        ],
        [
          0,
          16
        ],
        [
          1,
          16
        ],
        [
          2,
          16
        ],
        [
          3,
          16
        ],
        [
          4,
          16
        ],
        [
          5,
          16
        ],
        [
          6,
          16
        ],
        [
          7,
          16
        ],
        [
          8,
          16
        ],
        [
          9,
          16
        ],
        [
          10,
          16
        ],
        [
          11,
          16
        ],
        [
          12,
          16
        ],
        [
          13,
          16
        ],
        [
          14,
          16
        ],
        [
          15,
          16
        ],
        [
          16,
          16
        ],
        [
          0,
          17
        ],
        [
          1,
          17
        ],
        [
          2,
          17
        ],
        [
          3,
          17
        ],
        [
          4,
          17
        ],
        [
          5,
          17
        ],
        [
          6,
          17
        ],
        [
          7,
          17
        ],
        [
          8,
          17
        ],
        [
          9,
          17
        ],
        [
          10,
          17
        ],
        [
          11,
          17
        ],
        [
          12,
          17
        ],
        [
          13,
          17
        ],
        [
          14,
          17
        ],
        [
          15,
          17
        ],
        [
          16,
          17
        ],
        [
          0,
          18
        ],
        [
          1,
          18
        ],
        [
          2,
          18
        ],
        [
          3,
          18
        ],
        [
          4,
          18
        ],
        [
          5,
          18
        ],
        [
          7,
          18
        ],
        [
          8,
          18
        ],
        [
          9,
          18
        ],
        [
          10,
          18
        ],
        [
          11,
          18
        ],
        [
          12,
          18
        ],
        [
          13,
          18
        ],
        [
          14,
          18
        ],
        [
          15,
          18
        ],
        [
          16,
          18
        ],
        [
          0,
          19
        ],
        [
          1,
          19
        ],
        [
          2,
          19
        ],
        [
          3,
          19
        ],
        [
          4,
          19
        ],
        [
          8,
          19
        ],
        [
          9,
          19
        ],
        [
          10,
          19
        ],
        [
          11,
          19
        ],
        [
          12,
          19
        ],
        [
          13,
          19
        ],
        [
          14,
          19
        ],
        [
          15,
          19
        ],
        [
          16,
          19
        ],
        [
          0,
          20
        ],
        [
          1,
          20
        ],
        [
          2,
          20
        ],
        [
          3,
          20
        ],
        [
          9,
          20
        ],
        [
          10,
          20
        ],
        [
          11,
          20
        ],
        [
          12,
          20
        ],
        [
          13,
          20
        ],
        [
          14,
          20
        ],
        [
          15,
          20
        ],
        [
          16,
          20
        ],
        [
          0,
          21
        ],
        [
          1,
          21
        ],
        [
          2,
          21
        ],
        [
          3,
          21
        ],
        [
          4,
          21
        ],
        [
          8,
          21
        ],
        [
          9,
          21
        ],
        [
          10,
          21
        ],
        [
          11,
          21
        ],
        [
          12,
          21
        ],
        [
          13,
          21
        ],
        [
          14,
          21
        ],
        [
          15,
          21
        ],
        [
          16,
          21
        ],
        [
          0,
          22
        ],
        [
          1,
          22
        ],
        [
          2,
          22
        ],
        [
          3,
          22
        ],
        [
          4,
          22
        ],
        [
          5,
          22
        ],
        [
          7,
          22
        ],
        [
          8,
          22
        ],
        [
          9,
          22
        ],
        [
          10,
          22
        ],
        [
          11,
          22
        ],
        [
          12,
          22
        ],
        [
          13,
          22
        ],
        [
          14,
          22
        ],
        [
          15,
          22
        ],
        [
          16,
          22
        ],
        [
          0,
          23
        ],
        [
          1,
          23
        ],
        [
          2,
          23
        ],
        [
          3,
          23
        ],
        [
          4,
          23
        ],
        [
          5,
          23
        ],
        [
          6,
          23
        ],
        [
          7,
          23
        ],
        [
          8,
          23
        ],
        [
          9,
          23
        ],
        [
          10,
          23
        ],
        [
          11,
          23
        ],
        [
          12,
          23
        ],
        [
          13,
          23
        ],
        [
          14,
          23
        ],
        [
          15,
          23
        ],
        [
          16,
          23
        ],
        [
          0,
          24
        ],
        [
          1,
          24
        ],
        [
          2,
          24
        ],
        [
          3,
          24
        ],
        [
          4,
          24
        ],
        [
          5,
          24
        ],
        [
          6,
          24
        ],
        [
          7,
          24
        ],
        [
          8,
          24
        ],
        [
          9,
          24
        ],
        [
          10,
          24
        ],
        [
          11,
          24
        ],
        [
          12,
          24
        ],
        [
          13,
          24
        ],
        [
          14,
          24
        ],
        [
          15,
          24
        ],
        [
          16,
          24
        ],
        [
          0,
          25
        ],
        [
          1,
          25
        ],
        [
          2,
          25
        ],
        [
          3,
          25
        ],
        [
          4,
          25
        ],
        [
          5,
          25
        ],
        [
          6,
          25
        ],
        [
          7,
          25
        ],
        [
          8,
          25
        ],
        [
          9,
          25
        ],
        [
          10,
          25
        ],
        [
          11,
          25
        ],
        [
          12,
          25
        ],
        [
          13,
          25
        ],
        [
          14,
          25
        ],
        [
          15,
          25
        ],
        [
          16,
          25
        ]
      ],
      [
        [
          19,
          14
        ],
        [
          20,
          14
        ],
        [
          21,
          14
        ],
        [
          22,
          14
        ],
        [
          23,
          14
        ],
        [
          24,
          14
        ],
        [
          25,
          14
        ],
        [
          26,
          14
        ],
        [
          27,
          14
        ],
        [
          28,
          14
        ],
        [
          29,
          14
        ],
        [
          30,
          14
        ],
        [
          31,
          14
        ],
        [
          32,
          14
        ],
        [
          33,
          14
        ],
        [
          34,
          14
        ],
        [
          35,
          14
        ],
        [
          19,
          15
        ],
        [
          20,
          15
        ],
        [
          21,
          15
        ],
        [
          22,
          15
        ],
        [
          23,
          15
        ],
        [
          24,
          15
        ],
        [
          25,
          15
        ],
        [
          26,
          15
        ],
        [
          27,
          15
        ],
        [
          28,
          15
        ],
        [
          29,
          15
        ],
        [
          30,
          15
        ],
        [
          31,
          15
        ],
        [
          32,
          15
        ],
        [
          33,
          15
        ],
        [
          34,
          15
        ],
        [
          35,
          15
        ],
        [
          19,
          16
        ],
        [
          20,
          16
        ],
        [
          21,
          16
        ],
        [
          22,
          16
        ],
        [
          23,
          16
        ],
        [
          24,
          16
        ],
        [
          25,
          16
        ],
        [
          26,
          16
        ],
        [
          27,
          16
        ],
        [
          28,
          16
        ],
        [
          29,
          16
        ],
        [
          30,
          16
        ],
        [
          31,
          16
        ],
        [
          32,
          16
        ],
        [
          33,
          16
        ],
        [
          34,
          16
        ],
        [
          35,
          16
        ],
        [
          19,
          17
        ],
        [
          20,
          17
        ],
        [
          21,
          17
        ],
        [
          22,
          17
        ],
        [
          23,
          17
        ],
        [
          24,
          17
        ],
        [
          25,
          17
        ],
        [
          26,
          17
        ],
        [
          27,
          17
        ],
        [
          28,
          17
        ],
        [
          29,
          17
        ],
        [
          30,
          17
        ],
        [
          31,
          17
        ],
        [
          32,
          17
        ],
        [
          33,
          17
        ],
        [
          34,
          17
        ],
        [
          35,
          17
        ],
        [
          19,
          18
        ],
        [
          20,
          18
        ],
        [
          21,
          18
        ],
        [
          22,
          18
        ],
        [
          23,
          18
        ],
        [
          24,
          18
        ],
        [
          25,
          18
        ],
        [
          26,
          18
        ],
        [
          27,
          18
        ],
        [
          28,
          18
        ],
        [
          30,
          18
        ],
        [
          31,
          18
        ],
        [
          32,
          18
        ],
        [
          33,
          18
        ],
        [
          34,
          18
        ],
        [
          35,
          18
        ],
        [
          19,
          19
        ],
        [
          20,
          19
        ],
        [
          21,
          19
        ],
        [
          22,
          19
        ],
        [
          23,
          19
        ],
        [
          24,
          19
        ],
        [
          25,
          19
        ],
        [
          26,
          19
        ],
        [
          27,
          19
        ],
        [
          31,
          19
        ],
        [
          32,
          19
        ],
        [
          33,
          19
        ],
        [
          34,
          19
        ],
        [
          35,
          19
        ],
        [
          19,
          20
        ],
        [
          20,
          20
        ],
        [
          21,
          20
        ],
        [
          22,
          20
        ],
        [
          23,
          20
        ],
        [
          24,
          20
        ],
        [
          25,
          20
        ],
        [
          26,
          20
        ],
        [
          32,
          20
        ],
        [
          33,
          20
        ],
        [
          34,
          20
        ],
        [
          35,
          20
        ],
        [
          19,
          21
        ],
        [
          20,
          21
        ],
        [
          21,
          21
        ],
        [
          22,
          21
        ],
        [
          23,
          21
        ],
        [
          24,
          21
        ],
        [
          25,
          21
        ],
        [
          26,
          21
        ],
        [
          27,
          21
        ],
        [
          31,
          21
        ],
        [
          32,
          21
        ],
        [
          33,
          21
        ],
        [
          34,
          21
        ],
        [
          35,
          21
        ],
        [
          19,
          22
        ],
        [
          20,
          22
        ],
        [
          21,
          22
        ],
        [
          22,
          22
        ],
        [
          23,
          22
        ],
        [
          24,
          22
        ],
        [
          25,
          22
        ],
        [
          26,
          22
        ],
        [
          27,
          22
        ],
        [
          28,
          22
        ],
        [
          30,
          22
        ],
        [
          31,
          22
        ],
        [
          32,
          22
        ],
        [
          33,
          22
        ],
        [
          34,
          22
        ],
        [
          35,
          22
        ],
        [
          19,
          23
        ],
        [
          20,
          23
        ],
        [
          21,
          23
        ],
        [
          22,
          23
        ],
        [
          23,
          23
        ],
        [
          24,
          23
        ],
        [
          25,
          23
        ],
        [
          26,
          23
        ],
        [
          27,
          23
        ],
        [
          28,
          23
        ],
        [
          29,
          23
        ],
        [
          30,
          23
        ],
        [
          31,
          23
        ],
        [
          32,
          23
        ],
        [
          33,
          23
        ],
        [
          34,
          23
        ],
        [
          35,
          23
        ],
        [
          19,
          24
        ],
        [
          20,
          24
        ],
        [
          21,
          24
        ],
        [
          22,
          24
        ],
        [
          23,
          24
        ],
        [
          24,
          24
        ],
        [
          25,
          24
        ],
        [
          26,
          24
        ],
        [
          27,
          24
        ],
        [
          28,
          24
        ],
        [
          29,
          24
        ],
        [
          30,
          24
        ],
        [
          31,
          24
        ],
        [
          32,
          24
        ],
        [
          33,
          24
        ],
        [
          34,
          24
        ],
        [
          35,
          24
        ],
        [
          19,
          25
        ],
        [
          20,
          25
        ],
        [
          21,
          25
        ],
        [
          22,
          25
        ],
        [
          23,
          25
        ],
        [
          24,
          25
        ],
        [
          25,
          25
        ],
        [
          26,
          25
        ],
        [
          27,
          25
        ],
        [
          28,
          25
        ],
        [
          29,
          25
        ],
        [
          30,
          25
        ],
        [
          31,
          25
        ],
        [
          32,
          25
        ],
        [
          33,
          25
        ],
        [
          34,
          25
        ],
        [
          35,
          25
        ]
      ]
    ],
    zoneColors: [
      "#ff4444",
      "#4488ff",
      "#44ff88",
      "#ffaa44"
    ],
    spawners: [
      {
        entry: [
          0,
          1
        ],
        waypoints: [
          [
            34,
            1
          ],
          [
            34,
            24
          ],
          [
            1,
            24
          ],
          [
            1,
            1
          ],
          [
            34,
            1
          ],
          [
            34,
            24
          ]
        ],
        exit: [
          0,
          24
        ]
      },
      {
        entry: [
          34,
          0
        ],
        waypoints: [
          [
            34,
            24
          ],
          [
            1,
            24
          ],
          [
            1,
            1
          ],
          [
            34,
            1
          ],
          [
            34,
            24
          ],
          [
            1,
            24
          ]
        ],
        exit: [
          1,
          0
        ]
      },
      {
        entry: [
          35,
          24
        ],
        waypoints: [
          [
            1,
            24
          ],
          [
            1,
            1
          ],
          [
            34,
            1
          ],
          [
            34,
            24
          ],
          [
            1,
            24
          ],
          [
            1,
            1
          ]
        ],
        exit: [
          35,
          1
        ]
      },
      {
        entry: [
          1,
          25
        ],
        waypoints: [
          [
            1,
            1
          ],
          [
            34,
            1
          ],
          [
            34,
            24
          ],
          [
            1,
            24
          ],
          [
            1,
            1
          ],
          [
            34,
            1
          ]
        ],
        exit: [
          34,
          25
        ]
      }
    ]
  };

  // src/data/maps/circle/circle_4p_hell_circle.json
  var circle_4p_hell_circle_default = {
    id: "circle_4p_hell_circle",
    name: "Circle 4P \u2014 Hell Circle",
    description: "4-player co-op map. Like Hell Circle TD",
    playerCount: 4,
    theme: "volcanic",
    blocked: [
      [
        3,
        0
      ],
      [
        32,
        0
      ],
      [
        3,
        1
      ],
      [
        32,
        1
      ],
      [
        0,
        3
      ],
      [
        1,
        3
      ],
      [
        34,
        3
      ],
      [
        35,
        3
      ],
      [
        4,
        4
      ],
      [
        5,
        4
      ],
      [
        6,
        4
      ],
      [
        7,
        4
      ],
      [
        8,
        4
      ],
      [
        9,
        4
      ],
      [
        10,
        4
      ],
      [
        11,
        4
      ],
      [
        12,
        4
      ],
      [
        13,
        4
      ],
      [
        14,
        4
      ],
      [
        15,
        4
      ],
      [
        16,
        4
      ],
      [
        17,
        4
      ],
      [
        18,
        4
      ],
      [
        19,
        4
      ],
      [
        20,
        4
      ],
      [
        21,
        4
      ],
      [
        22,
        4
      ],
      [
        23,
        4
      ],
      [
        24,
        4
      ],
      [
        25,
        4
      ],
      [
        26,
        4
      ],
      [
        27,
        4
      ],
      [
        28,
        4
      ],
      [
        29,
        4
      ],
      [
        30,
        4
      ],
      [
        31,
        4
      ],
      [
        4,
        5
      ],
      [
        31,
        5
      ],
      [
        4,
        6
      ],
      [
        31,
        6
      ],
      [
        4,
        7
      ],
      [
        31,
        7
      ],
      [
        4,
        8
      ],
      [
        31,
        8
      ],
      [
        4,
        9
      ],
      [
        31,
        9
      ],
      [
        4,
        10
      ],
      [
        31,
        10
      ],
      [
        4,
        11
      ],
      [
        31,
        11
      ],
      [
        4,
        12
      ],
      [
        31,
        12
      ],
      [
        4,
        13
      ],
      [
        31,
        13
      ],
      [
        4,
        14
      ],
      [
        31,
        14
      ],
      [
        4,
        15
      ],
      [
        31,
        15
      ],
      [
        4,
        16
      ],
      [
        31,
        16
      ],
      [
        4,
        17
      ],
      [
        31,
        17
      ],
      [
        4,
        18
      ],
      [
        31,
        18
      ],
      [
        4,
        19
      ],
      [
        31,
        19
      ],
      [
        4,
        20
      ],
      [
        31,
        20
      ],
      [
        4,
        21
      ],
      [
        5,
        21
      ],
      [
        6,
        21
      ],
      [
        7,
        21
      ],
      [
        8,
        21
      ],
      [
        9,
        21
      ],
      [
        10,
        21
      ],
      [
        11,
        21
      ],
      [
        12,
        21
      ],
      [
        13,
        21
      ],
      [
        14,
        21
      ],
      [
        15,
        21
      ],
      [
        16,
        21
      ],
      [
        17,
        21
      ],
      [
        18,
        21
      ],
      [
        19,
        21
      ],
      [
        20,
        21
      ],
      [
        21,
        21
      ],
      [
        22,
        21
      ],
      [
        23,
        21
      ],
      [
        24,
        21
      ],
      [
        25,
        21
      ],
      [
        26,
        21
      ],
      [
        27,
        21
      ],
      [
        28,
        21
      ],
      [
        29,
        21
      ],
      [
        30,
        21
      ],
      [
        31,
        21
      ],
      [
        0,
        22
      ],
      [
        1,
        22
      ],
      [
        34,
        22
      ],
      [
        35,
        22
      ],
      [
        3,
        24
      ],
      [
        32,
        24
      ],
      [
        3,
        25
      ],
      [
        32,
        25
      ]
    ],
    animated: [
      [
        4,
        0
      ],
      [
        5,
        0
      ],
      [
        6,
        0
      ],
      [
        7,
        0
      ],
      [
        8,
        0
      ],
      [
        9,
        0
      ],
      [
        10,
        0
      ],
      [
        11,
        0
      ],
      [
        12,
        0
      ],
      [
        13,
        0
      ],
      [
        14,
        0
      ],
      [
        15,
        0
      ],
      [
        16,
        0
      ],
      [
        17,
        0
      ],
      [
        18,
        0
      ],
      [
        19,
        0
      ],
      [
        20,
        0
      ],
      [
        21,
        0
      ],
      [
        22,
        0
      ],
      [
        23,
        0
      ],
      [
        24,
        0
      ],
      [
        25,
        0
      ],
      [
        26,
        0
      ],
      [
        27,
        0
      ],
      [
        28,
        0
      ],
      [
        29,
        0
      ],
      [
        30,
        0
      ],
      [
        31,
        0
      ],
      [
        4,
        1
      ],
      [
        5,
        1
      ],
      [
        6,
        1
      ],
      [
        7,
        1
      ],
      [
        8,
        1
      ],
      [
        9,
        1
      ],
      [
        10,
        1
      ],
      [
        11,
        1
      ],
      [
        12,
        1
      ],
      [
        13,
        1
      ],
      [
        14,
        1
      ],
      [
        15,
        1
      ],
      [
        16,
        1
      ],
      [
        17,
        1
      ],
      [
        18,
        1
      ],
      [
        19,
        1
      ],
      [
        20,
        1
      ],
      [
        21,
        1
      ],
      [
        22,
        1
      ],
      [
        23,
        1
      ],
      [
        24,
        1
      ],
      [
        25,
        1
      ],
      [
        26,
        1
      ],
      [
        27,
        1
      ],
      [
        28,
        1
      ],
      [
        29,
        1
      ],
      [
        30,
        1
      ],
      [
        31,
        1
      ],
      [
        0,
        4
      ],
      [
        1,
        4
      ],
      [
        34,
        4
      ],
      [
        35,
        4
      ],
      [
        0,
        5
      ],
      [
        1,
        5
      ],
      [
        34,
        5
      ],
      [
        35,
        5
      ],
      [
        0,
        6
      ],
      [
        1,
        6
      ],
      [
        34,
        6
      ],
      [
        35,
        6
      ],
      [
        0,
        7
      ],
      [
        1,
        7
      ],
      [
        34,
        7
      ],
      [
        35,
        7
      ],
      [
        0,
        8
      ],
      [
        1,
        8
      ],
      [
        34,
        8
      ],
      [
        35,
        8
      ],
      [
        0,
        9
      ],
      [
        1,
        9
      ],
      [
        34,
        9
      ],
      [
        35,
        9
      ],
      [
        0,
        10
      ],
      [
        1,
        10
      ],
      [
        34,
        10
      ],
      [
        35,
        10
      ],
      [
        0,
        11
      ],
      [
        1,
        11
      ],
      [
        34,
        11
      ],
      [
        35,
        11
      ],
      [
        0,
        12
      ],
      [
        1,
        12
      ],
      [
        34,
        12
      ],
      [
        35,
        12
      ],
      [
        0,
        13
      ],
      [
        1,
        13
      ],
      [
        34,
        13
      ],
      [
        35,
        13
      ],
      [
        0,
        14
      ],
      [
        1,
        14
      ],
      [
        34,
        14
      ],
      [
        35,
        14
      ],
      [
        0,
        15
      ],
      [
        1,
        15
      ],
      [
        34,
        15
      ],
      [
        35,
        15
      ],
      [
        0,
        16
      ],
      [
        1,
        16
      ],
      [
        34,
        16
      ],
      [
        35,
        16
      ],
      [
        0,
        17
      ],
      [
        1,
        17
      ],
      [
        34,
        17
      ],
      [
        35,
        17
      ],
      [
        0,
        18
      ],
      [
        1,
        18
      ],
      [
        34,
        18
      ],
      [
        35,
        18
      ],
      [
        0,
        19
      ],
      [
        1,
        19
      ],
      [
        34,
        19
      ],
      [
        35,
        19
      ],
      [
        0,
        20
      ],
      [
        1,
        20
      ],
      [
        34,
        20
      ],
      [
        35,
        20
      ],
      [
        0,
        21
      ],
      [
        1,
        21
      ],
      [
        34,
        21
      ],
      [
        35,
        21
      ],
      [
        4,
        24
      ],
      [
        5,
        24
      ],
      [
        6,
        24
      ],
      [
        7,
        24
      ],
      [
        8,
        24
      ],
      [
        9,
        24
      ],
      [
        10,
        24
      ],
      [
        11,
        24
      ],
      [
        12,
        24
      ],
      [
        13,
        24
      ],
      [
        14,
        24
      ],
      [
        15,
        24
      ],
      [
        16,
        24
      ],
      [
        17,
        24
      ],
      [
        18,
        24
      ],
      [
        19,
        24
      ],
      [
        20,
        24
      ],
      [
        21,
        24
      ],
      [
        22,
        24
      ],
      [
        23,
        24
      ],
      [
        24,
        24
      ],
      [
        25,
        24
      ],
      [
        26,
        24
      ],
      [
        27,
        24
      ],
      [
        28,
        24
      ],
      [
        29,
        24
      ],
      [
        30,
        24
      ],
      [
        31,
        24
      ],
      [
        4,
        25
      ],
      [
        5,
        25
      ],
      [
        6,
        25
      ],
      [
        7,
        25
      ],
      [
        8,
        25
      ],
      [
        9,
        25
      ],
      [
        10,
        25
      ],
      [
        11,
        25
      ],
      [
        12,
        25
      ],
      [
        13,
        25
      ],
      [
        14,
        25
      ],
      [
        15,
        25
      ],
      [
        16,
        25
      ],
      [
        17,
        25
      ],
      [
        18,
        25
      ],
      [
        19,
        25
      ],
      [
        20,
        25
      ],
      [
        21,
        25
      ],
      [
        22,
        25
      ],
      [
        23,
        25
      ],
      [
        24,
        25
      ],
      [
        25,
        25
      ],
      [
        26,
        25
      ],
      [
        27,
        25
      ],
      [
        28,
        25
      ],
      [
        29,
        25
      ],
      [
        30,
        25
      ],
      [
        31,
        25
      ]
    ],
    noBuild: [
      [
        0,
        0
      ],
      [
        1,
        0
      ],
      [
        2,
        0
      ],
      [
        33,
        0
      ],
      [
        34,
        0
      ],
      [
        35,
        0
      ],
      [
        0,
        1
      ],
      [
        1,
        1
      ],
      [
        2,
        1
      ],
      [
        33,
        1
      ],
      [
        34,
        1
      ],
      [
        35,
        1
      ],
      [
        0,
        2
      ],
      [
        1,
        2
      ],
      [
        2,
        2
      ],
      [
        3,
        2
      ],
      [
        4,
        2
      ],
      [
        5,
        2
      ],
      [
        6,
        2
      ],
      [
        7,
        2
      ],
      [
        8,
        2
      ],
      [
        9,
        2
      ],
      [
        10,
        2
      ],
      [
        11,
        2
      ],
      [
        12,
        2
      ],
      [
        13,
        2
      ],
      [
        14,
        2
      ],
      [
        15,
        2
      ],
      [
        16,
        2
      ],
      [
        17,
        2
      ],
      [
        18,
        2
      ],
      [
        19,
        2
      ],
      [
        20,
        2
      ],
      [
        21,
        2
      ],
      [
        22,
        2
      ],
      [
        23,
        2
      ],
      [
        24,
        2
      ],
      [
        25,
        2
      ],
      [
        26,
        2
      ],
      [
        27,
        2
      ],
      [
        28,
        2
      ],
      [
        29,
        2
      ],
      [
        30,
        2
      ],
      [
        31,
        2
      ],
      [
        32,
        2
      ],
      [
        33,
        2
      ],
      [
        34,
        2
      ],
      [
        35,
        2
      ],
      [
        2,
        3
      ],
      [
        3,
        3
      ],
      [
        4,
        3
      ],
      [
        5,
        3
      ],
      [
        6,
        3
      ],
      [
        7,
        3
      ],
      [
        8,
        3
      ],
      [
        9,
        3
      ],
      [
        10,
        3
      ],
      [
        11,
        3
      ],
      [
        12,
        3
      ],
      [
        13,
        3
      ],
      [
        14,
        3
      ],
      [
        15,
        3
      ],
      [
        16,
        3
      ],
      [
        17,
        3
      ],
      [
        18,
        3
      ],
      [
        19,
        3
      ],
      [
        20,
        3
      ],
      [
        21,
        3
      ],
      [
        22,
        3
      ],
      [
        23,
        3
      ],
      [
        24,
        3
      ],
      [
        25,
        3
      ],
      [
        26,
        3
      ],
      [
        27,
        3
      ],
      [
        28,
        3
      ],
      [
        29,
        3
      ],
      [
        30,
        3
      ],
      [
        31,
        3
      ],
      [
        32,
        3
      ],
      [
        33,
        3
      ],
      [
        2,
        4
      ],
      [
        3,
        4
      ],
      [
        32,
        4
      ],
      [
        33,
        4
      ],
      [
        2,
        5
      ],
      [
        3,
        5
      ],
      [
        32,
        5
      ],
      [
        33,
        5
      ],
      [
        2,
        6
      ],
      [
        3,
        6
      ],
      [
        32,
        6
      ],
      [
        33,
        6
      ],
      [
        2,
        7
      ],
      [
        3,
        7
      ],
      [
        32,
        7
      ],
      [
        33,
        7
      ],
      [
        2,
        8
      ],
      [
        3,
        8
      ],
      [
        32,
        8
      ],
      [
        33,
        8
      ],
      [
        2,
        9
      ],
      [
        3,
        9
      ],
      [
        32,
        9
      ],
      [
        33,
        9
      ],
      [
        2,
        10
      ],
      [
        3,
        10
      ],
      [
        32,
        10
      ],
      [
        33,
        10
      ],
      [
        2,
        11
      ],
      [
        3,
        11
      ],
      [
        32,
        11
      ],
      [
        33,
        11
      ],
      [
        2,
        12
      ],
      [
        3,
        12
      ],
      [
        32,
        12
      ],
      [
        33,
        12
      ],
      [
        2,
        13
      ],
      [
        3,
        13
      ],
      [
        32,
        13
      ],
      [
        33,
        13
      ],
      [
        2,
        14
      ],
      [
        3,
        14
      ],
      [
        32,
        14
      ],
      [
        33,
        14
      ],
      [
        2,
        15
      ],
      [
        3,
        15
      ],
      [
        32,
        15
      ],
      [
        33,
        15
      ],
      [
        2,
        16
      ],
      [
        3,
        16
      ],
      [
        32,
        16
      ],
      [
        33,
        16
      ],
      [
        2,
        17
      ],
      [
        3,
        17
      ],
      [
        32,
        17
      ],
      [
        33,
        17
      ],
      [
        2,
        18
      ],
      [
        3,
        18
      ],
      [
        32,
        18
      ],
      [
        33,
        18
      ],
      [
        2,
        19
      ],
      [
        3,
        19
      ],
      [
        32,
        19
      ],
      [
        33,
        19
      ],
      [
        2,
        20
      ],
      [
        3,
        20
      ],
      [
        32,
        20
      ],
      [
        33,
        20
      ],
      [
        2,
        21
      ],
      [
        3,
        21
      ],
      [
        32,
        21
      ],
      [
        33,
        21
      ],
      [
        2,
        22
      ],
      [
        3,
        22
      ],
      [
        4,
        22
      ],
      [
        5,
        22
      ],
      [
        6,
        22
      ],
      [
        7,
        22
      ],
      [
        8,
        22
      ],
      [
        9,
        22
      ],
      [
        10,
        22
      ],
      [
        11,
        22
      ],
      [
        12,
        22
      ],
      [
        13,
        22
      ],
      [
        14,
        22
      ],
      [
        15,
        22
      ],
      [
        16,
        22
      ],
      [
        17,
        22
      ],
      [
        18,
        22
      ],
      [
        19,
        22
      ],
      [
        20,
        22
      ],
      [
        21,
        22
      ],
      [
        22,
        22
      ],
      [
        23,
        22
      ],
      [
        24,
        22
      ],
      [
        25,
        22
      ],
      [
        26,
        22
      ],
      [
        27,
        22
      ],
      [
        28,
        22
      ],
      [
        29,
        22
      ],
      [
        30,
        22
      ],
      [
        31,
        22
      ],
      [
        32,
        22
      ],
      [
        33,
        22
      ],
      [
        0,
        23
      ],
      [
        1,
        23
      ],
      [
        2,
        23
      ],
      [
        3,
        23
      ],
      [
        4,
        23
      ],
      [
        5,
        23
      ],
      [
        6,
        23
      ],
      [
        7,
        23
      ],
      [
        8,
        23
      ],
      [
        9,
        23
      ],
      [
        10,
        23
      ],
      [
        11,
        23
      ],
      [
        12,
        23
      ],
      [
        13,
        23
      ],
      [
        14,
        23
      ],
      [
        15,
        23
      ],
      [
        16,
        23
      ],
      [
        17,
        23
      ],
      [
        18,
        23
      ],
      [
        19,
        23
      ],
      [
        20,
        23
      ],
      [
        21,
        23
      ],
      [
        22,
        23
      ],
      [
        23,
        23
      ],
      [
        24,
        23
      ],
      [
        25,
        23
      ],
      [
        26,
        23
      ],
      [
        27,
        23
      ],
      [
        28,
        23
      ],
      [
        29,
        23
      ],
      [
        30,
        23
      ],
      [
        31,
        23
      ],
      [
        32,
        23
      ],
      [
        33,
        23
      ],
      [
        34,
        23
      ],
      [
        35,
        23
      ],
      [
        0,
        24
      ],
      [
        1,
        24
      ],
      [
        2,
        24
      ],
      [
        33,
        24
      ],
      [
        34,
        24
      ],
      [
        35,
        24
      ],
      [
        0,
        25
      ],
      [
        1,
        25
      ],
      [
        2,
        25
      ],
      [
        33,
        25
      ],
      [
        34,
        25
      ],
      [
        35,
        25
      ]
    ],
    zones: [
      [
        [
          4,
          0
        ],
        [
          5,
          0
        ],
        [
          6,
          0
        ],
        [
          7,
          0
        ],
        [
          8,
          0
        ],
        [
          9,
          0
        ],
        [
          10,
          0
        ],
        [
          11,
          0
        ],
        [
          12,
          0
        ],
        [
          13,
          0
        ],
        [
          14,
          0
        ],
        [
          15,
          0
        ],
        [
          16,
          0
        ],
        [
          17,
          0
        ],
        [
          4,
          1
        ],
        [
          5,
          1
        ],
        [
          6,
          1
        ],
        [
          7,
          1
        ],
        [
          8,
          1
        ],
        [
          9,
          1
        ],
        [
          10,
          1
        ],
        [
          11,
          1
        ],
        [
          12,
          1
        ],
        [
          13,
          1
        ],
        [
          14,
          1
        ],
        [
          15,
          1
        ],
        [
          16,
          1
        ],
        [
          17,
          1
        ],
        [
          3,
          2
        ],
        [
          4,
          2
        ],
        [
          5,
          2
        ],
        [
          6,
          2
        ],
        [
          7,
          2
        ],
        [
          8,
          2
        ],
        [
          9,
          2
        ],
        [
          10,
          2
        ],
        [
          11,
          2
        ],
        [
          12,
          2
        ],
        [
          13,
          2
        ],
        [
          14,
          2
        ],
        [
          15,
          2
        ],
        [
          16,
          2
        ],
        [
          17,
          2
        ],
        [
          2,
          3
        ],
        [
          3,
          3
        ],
        [
          4,
          3
        ],
        [
          5,
          3
        ],
        [
          6,
          3
        ],
        [
          7,
          3
        ],
        [
          8,
          3
        ],
        [
          9,
          3
        ],
        [
          10,
          3
        ],
        [
          11,
          3
        ],
        [
          12,
          3
        ],
        [
          13,
          3
        ],
        [
          14,
          3
        ],
        [
          15,
          3
        ],
        [
          16,
          3
        ],
        [
          17,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          3,
          4
        ],
        [
          4,
          4
        ],
        [
          5,
          4
        ],
        [
          6,
          4
        ],
        [
          7,
          4
        ],
        [
          8,
          4
        ],
        [
          9,
          4
        ],
        [
          10,
          4
        ],
        [
          11,
          4
        ],
        [
          12,
          4
        ],
        [
          13,
          4
        ],
        [
          14,
          4
        ],
        [
          15,
          4
        ],
        [
          16,
          4
        ],
        [
          17,
          4
        ],
        [
          0,
          5
        ],
        [
          1,
          5
        ],
        [
          2,
          5
        ],
        [
          3,
          5
        ],
        [
          4,
          5
        ],
        [
          5,
          5
        ],
        [
          6,
          5
        ],
        [
          7,
          5
        ],
        [
          8,
          5
        ],
        [
          9,
          5
        ],
        [
          10,
          5
        ],
        [
          11,
          5
        ],
        [
          12,
          5
        ],
        [
          13,
          5
        ],
        [
          14,
          5
        ],
        [
          15,
          5
        ],
        [
          16,
          5
        ],
        [
          17,
          5
        ],
        [
          0,
          6
        ],
        [
          1,
          6
        ],
        [
          2,
          6
        ],
        [
          3,
          6
        ],
        [
          4,
          6
        ],
        [
          5,
          6
        ],
        [
          6,
          6
        ],
        [
          7,
          6
        ],
        [
          8,
          6
        ],
        [
          9,
          6
        ],
        [
          10,
          6
        ],
        [
          11,
          6
        ],
        [
          12,
          6
        ],
        [
          13,
          6
        ],
        [
          14,
          6
        ],
        [
          15,
          6
        ],
        [
          16,
          6
        ],
        [
          17,
          6
        ],
        [
          0,
          7
        ],
        [
          1,
          7
        ],
        [
          2,
          7
        ],
        [
          3,
          7
        ],
        [
          4,
          7
        ],
        [
          5,
          7
        ],
        [
          6,
          7
        ],
        [
          7,
          7
        ],
        [
          8,
          7
        ],
        [
          9,
          7
        ],
        [
          10,
          7
        ],
        [
          11,
          7
        ],
        [
          12,
          7
        ],
        [
          13,
          7
        ],
        [
          14,
          7
        ],
        [
          15,
          7
        ],
        [
          16,
          7
        ],
        [
          17,
          7
        ],
        [
          0,
          8
        ],
        [
          1,
          8
        ],
        [
          2,
          8
        ],
        [
          3,
          8
        ],
        [
          4,
          8
        ],
        [
          5,
          8
        ],
        [
          6,
          8
        ],
        [
          7,
          8
        ],
        [
          8,
          8
        ],
        [
          9,
          8
        ],
        [
          10,
          8
        ],
        [
          11,
          8
        ],
        [
          12,
          8
        ],
        [
          13,
          8
        ],
        [
          14,
          8
        ],
        [
          15,
          8
        ],
        [
          16,
          8
        ],
        [
          17,
          8
        ],
        [
          0,
          9
        ],
        [
          1,
          9
        ],
        [
          2,
          9
        ],
        [
          3,
          9
        ],
        [
          4,
          9
        ],
        [
          5,
          9
        ],
        [
          6,
          9
        ],
        [
          7,
          9
        ],
        [
          8,
          9
        ],
        [
          9,
          9
        ],
        [
          10,
          9
        ],
        [
          11,
          9
        ],
        [
          12,
          9
        ],
        [
          13,
          9
        ],
        [
          14,
          9
        ],
        [
          15,
          9
        ],
        [
          16,
          9
        ],
        [
          17,
          9
        ],
        [
          0,
          10
        ],
        [
          1,
          10
        ],
        [
          2,
          10
        ],
        [
          3,
          10
        ],
        [
          4,
          10
        ],
        [
          5,
          10
        ],
        [
          6,
          10
        ],
        [
          7,
          10
        ],
        [
          8,
          10
        ],
        [
          9,
          10
        ],
        [
          10,
          10
        ],
        [
          11,
          10
        ],
        [
          12,
          10
        ],
        [
          13,
          10
        ],
        [
          14,
          10
        ],
        [
          15,
          10
        ],
        [
          16,
          10
        ],
        [
          17,
          10
        ],
        [
          0,
          11
        ],
        [
          1,
          11
        ],
        [
          2,
          11
        ],
        [
          3,
          11
        ],
        [
          4,
          11
        ],
        [
          5,
          11
        ],
        [
          6,
          11
        ],
        [
          7,
          11
        ],
        [
          8,
          11
        ],
        [
          9,
          11
        ],
        [
          10,
          11
        ],
        [
          11,
          11
        ],
        [
          12,
          11
        ],
        [
          13,
          11
        ],
        [
          14,
          11
        ],
        [
          15,
          11
        ],
        [
          16,
          11
        ],
        [
          17,
          11
        ],
        [
          0,
          12
        ],
        [
          1,
          12
        ],
        [
          2,
          12
        ],
        [
          3,
          12
        ],
        [
          4,
          12
        ],
        [
          5,
          12
        ],
        [
          6,
          12
        ],
        [
          7,
          12
        ],
        [
          8,
          12
        ],
        [
          9,
          12
        ],
        [
          10,
          12
        ],
        [
          11,
          12
        ],
        [
          12,
          12
        ],
        [
          13,
          12
        ],
        [
          14,
          12
        ],
        [
          15,
          12
        ],
        [
          16,
          12
        ],
        [
          17,
          12
        ]
      ],
      [
        [
          18,
          0
        ],
        [
          19,
          0
        ],
        [
          20,
          0
        ],
        [
          21,
          0
        ],
        [
          22,
          0
        ],
        [
          23,
          0
        ],
        [
          24,
          0
        ],
        [
          25,
          0
        ],
        [
          26,
          0
        ],
        [
          27,
          0
        ],
        [
          28,
          0
        ],
        [
          29,
          0
        ],
        [
          30,
          0
        ],
        [
          31,
          0
        ],
        [
          32,
          0
        ],
        [
          33,
          0
        ],
        [
          34,
          0
        ],
        [
          35,
          0
        ],
        [
          18,
          1
        ],
        [
          19,
          1
        ],
        [
          20,
          1
        ],
        [
          21,
          1
        ],
        [
          22,
          1
        ],
        [
          23,
          1
        ],
        [
          24,
          1
        ],
        [
          25,
          1
        ],
        [
          26,
          1
        ],
        [
          27,
          1
        ],
        [
          28,
          1
        ],
        [
          29,
          1
        ],
        [
          30,
          1
        ],
        [
          31,
          1
        ],
        [
          32,
          1
        ],
        [
          33,
          1
        ],
        [
          34,
          1
        ],
        [
          35,
          1
        ],
        [
          18,
          2
        ],
        [
          19,
          2
        ],
        [
          20,
          2
        ],
        [
          21,
          2
        ],
        [
          22,
          2
        ],
        [
          23,
          2
        ],
        [
          24,
          2
        ],
        [
          25,
          2
        ],
        [
          26,
          2
        ],
        [
          27,
          2
        ],
        [
          28,
          2
        ],
        [
          29,
          2
        ],
        [
          30,
          2
        ],
        [
          31,
          2
        ],
        [
          32,
          2
        ],
        [
          33,
          2
        ],
        [
          34,
          2
        ],
        [
          35,
          2
        ],
        [
          18,
          3
        ],
        [
          19,
          3
        ],
        [
          20,
          3
        ],
        [
          21,
          3
        ],
        [
          22,
          3
        ],
        [
          23,
          3
        ],
        [
          24,
          3
        ],
        [
          25,
          3
        ],
        [
          26,
          3
        ],
        [
          27,
          3
        ],
        [
          28,
          3
        ],
        [
          29,
          3
        ],
        [
          30,
          3
        ],
        [
          31,
          3
        ],
        [
          32,
          3
        ],
        [
          33,
          3
        ],
        [
          34,
          3
        ],
        [
          35,
          3
        ],
        [
          18,
          4
        ],
        [
          19,
          4
        ],
        [
          20,
          4
        ],
        [
          21,
          4
        ],
        [
          22,
          4
        ],
        [
          23,
          4
        ],
        [
          24,
          4
        ],
        [
          25,
          4
        ],
        [
          26,
          4
        ],
        [
          27,
          4
        ],
        [
          28,
          4
        ],
        [
          29,
          4
        ],
        [
          30,
          4
        ],
        [
          31,
          4
        ],
        [
          32,
          4
        ],
        [
          33,
          4
        ],
        [
          34,
          4
        ],
        [
          35,
          4
        ],
        [
          18,
          5
        ],
        [
          19,
          5
        ],
        [
          20,
          5
        ],
        [
          21,
          5
        ],
        [
          22,
          5
        ],
        [
          23,
          5
        ],
        [
          24,
          5
        ],
        [
          25,
          5
        ],
        [
          26,
          5
        ],
        [
          27,
          5
        ],
        [
          28,
          5
        ],
        [
          29,
          5
        ],
        [
          30,
          5
        ],
        [
          31,
          5
        ],
        [
          32,
          5
        ],
        [
          33,
          5
        ],
        [
          34,
          5
        ],
        [
          35,
          5
        ],
        [
          18,
          6
        ],
        [
          19,
          6
        ],
        [
          20,
          6
        ],
        [
          21,
          6
        ],
        [
          22,
          6
        ],
        [
          23,
          6
        ],
        [
          24,
          6
        ],
        [
          25,
          6
        ],
        [
          26,
          6
        ],
        [
          27,
          6
        ],
        [
          28,
          6
        ],
        [
          29,
          6
        ],
        [
          30,
          6
        ],
        [
          31,
          6
        ],
        [
          32,
          6
        ],
        [
          33,
          6
        ],
        [
          34,
          6
        ],
        [
          35,
          6
        ],
        [
          18,
          7
        ],
        [
          19,
          7
        ],
        [
          20,
          7
        ],
        [
          21,
          7
        ],
        [
          22,
          7
        ],
        [
          23,
          7
        ],
        [
          24,
          7
        ],
        [
          25,
          7
        ],
        [
          26,
          7
        ],
        [
          27,
          7
        ],
        [
          28,
          7
        ],
        [
          29,
          7
        ],
        [
          30,
          7
        ],
        [
          31,
          7
        ],
        [
          32,
          7
        ],
        [
          33,
          7
        ],
        [
          34,
          7
        ],
        [
          35,
          7
        ],
        [
          18,
          8
        ],
        [
          19,
          8
        ],
        [
          20,
          8
        ],
        [
          21,
          8
        ],
        [
          22,
          8
        ],
        [
          23,
          8
        ],
        [
          24,
          8
        ],
        [
          25,
          8
        ],
        [
          26,
          8
        ],
        [
          27,
          8
        ],
        [
          28,
          8
        ],
        [
          29,
          8
        ],
        [
          30,
          8
        ],
        [
          31,
          8
        ],
        [
          32,
          8
        ],
        [
          33,
          8
        ],
        [
          34,
          8
        ],
        [
          35,
          8
        ],
        [
          18,
          9
        ],
        [
          19,
          9
        ],
        [
          20,
          9
        ],
        [
          21,
          9
        ],
        [
          22,
          9
        ],
        [
          23,
          9
        ],
        [
          24,
          9
        ],
        [
          25,
          9
        ],
        [
          26,
          9
        ],
        [
          27,
          9
        ],
        [
          28,
          9
        ],
        [
          29,
          9
        ],
        [
          30,
          9
        ],
        [
          31,
          9
        ],
        [
          32,
          9
        ],
        [
          33,
          9
        ],
        [
          34,
          9
        ],
        [
          35,
          9
        ],
        [
          18,
          10
        ],
        [
          19,
          10
        ],
        [
          20,
          10
        ],
        [
          21,
          10
        ],
        [
          22,
          10
        ],
        [
          23,
          10
        ],
        [
          24,
          10
        ],
        [
          25,
          10
        ],
        [
          26,
          10
        ],
        [
          27,
          10
        ],
        [
          28,
          10
        ],
        [
          29,
          10
        ],
        [
          30,
          10
        ],
        [
          31,
          10
        ],
        [
          32,
          10
        ],
        [
          33,
          10
        ],
        [
          34,
          10
        ],
        [
          35,
          10
        ],
        [
          18,
          11
        ],
        [
          19,
          11
        ],
        [
          20,
          11
        ],
        [
          21,
          11
        ],
        [
          22,
          11
        ],
        [
          23,
          11
        ],
        [
          24,
          11
        ],
        [
          25,
          11
        ],
        [
          26,
          11
        ],
        [
          27,
          11
        ],
        [
          28,
          11
        ],
        [
          29,
          11
        ],
        [
          30,
          11
        ],
        [
          31,
          11
        ],
        [
          32,
          11
        ],
        [
          33,
          11
        ],
        [
          34,
          11
        ],
        [
          35,
          11
        ],
        [
          18,
          12
        ],
        [
          19,
          12
        ],
        [
          20,
          12
        ],
        [
          21,
          12
        ],
        [
          22,
          12
        ],
        [
          23,
          12
        ],
        [
          24,
          12
        ],
        [
          25,
          12
        ],
        [
          26,
          12
        ],
        [
          27,
          12
        ],
        [
          28,
          12
        ],
        [
          29,
          12
        ],
        [
          30,
          12
        ],
        [
          31,
          12
        ],
        [
          32,
          12
        ],
        [
          33,
          12
        ],
        [
          34,
          12
        ],
        [
          35,
          12
        ]
      ],
      [
        [
          18,
          13
        ],
        [
          19,
          13
        ],
        [
          20,
          13
        ],
        [
          21,
          13
        ],
        [
          22,
          13
        ],
        [
          23,
          13
        ],
        [
          24,
          13
        ],
        [
          25,
          13
        ],
        [
          26,
          13
        ],
        [
          27,
          13
        ],
        [
          28,
          13
        ],
        [
          29,
          13
        ],
        [
          30,
          13
        ],
        [
          31,
          13
        ],
        [
          32,
          13
        ],
        [
          33,
          13
        ],
        [
          34,
          13
        ],
        [
          35,
          13
        ],
        [
          18,
          14
        ],
        [
          19,
          14
        ],
        [
          20,
          14
        ],
        [
          21,
          14
        ],
        [
          22,
          14
        ],
        [
          23,
          14
        ],
        [
          24,
          14
        ],
        [
          25,
          14
        ],
        [
          26,
          14
        ],
        [
          27,
          14
        ],
        [
          28,
          14
        ],
        [
          29,
          14
        ],
        [
          30,
          14
        ],
        [
          31,
          14
        ],
        [
          32,
          14
        ],
        [
          33,
          14
        ],
        [
          34,
          14
        ],
        [
          35,
          14
        ],
        [
          18,
          15
        ],
        [
          19,
          15
        ],
        [
          20,
          15
        ],
        [
          21,
          15
        ],
        [
          22,
          15
        ],
        [
          23,
          15
        ],
        [
          24,
          15
        ],
        [
          25,
          15
        ],
        [
          26,
          15
        ],
        [
          27,
          15
        ],
        [
          28,
          15
        ],
        [
          29,
          15
        ],
        [
          30,
          15
        ],
        [
          31,
          15
        ],
        [
          32,
          15
        ],
        [
          33,
          15
        ],
        [
          34,
          15
        ],
        [
          35,
          15
        ],
        [
          18,
          16
        ],
        [
          19,
          16
        ],
        [
          20,
          16
        ],
        [
          21,
          16
        ],
        [
          22,
          16
        ],
        [
          23,
          16
        ],
        [
          24,
          16
        ],
        [
          25,
          16
        ],
        [
          26,
          16
        ],
        [
          27,
          16
        ],
        [
          28,
          16
        ],
        [
          29,
          16
        ],
        [
          30,
          16
        ],
        [
          31,
          16
        ],
        [
          32,
          16
        ],
        [
          33,
          16
        ],
        [
          34,
          16
        ],
        [
          35,
          16
        ],
        [
          18,
          17
        ],
        [
          19,
          17
        ],
        [
          20,
          17
        ],
        [
          21,
          17
        ],
        [
          22,
          17
        ],
        [
          23,
          17
        ],
        [
          24,
          17
        ],
        [
          25,
          17
        ],
        [
          26,
          17
        ],
        [
          27,
          17
        ],
        [
          28,
          17
        ],
        [
          29,
          17
        ],
        [
          30,
          17
        ],
        [
          31,
          17
        ],
        [
          32,
          17
        ],
        [
          33,
          17
        ],
        [
          34,
          17
        ],
        [
          35,
          17
        ],
        [
          18,
          18
        ],
        [
          19,
          18
        ],
        [
          20,
          18
        ],
        [
          21,
          18
        ],
        [
          22,
          18
        ],
        [
          23,
          18
        ],
        [
          24,
          18
        ],
        [
          25,
          18
        ],
        [
          26,
          18
        ],
        [
          27,
          18
        ],
        [
          28,
          18
        ],
        [
          29,
          18
        ],
        [
          30,
          18
        ],
        [
          31,
          18
        ],
        [
          32,
          18
        ],
        [
          33,
          18
        ],
        [
          34,
          18
        ],
        [
          35,
          18
        ],
        [
          18,
          19
        ],
        [
          19,
          19
        ],
        [
          20,
          19
        ],
        [
          21,
          19
        ],
        [
          22,
          19
        ],
        [
          23,
          19
        ],
        [
          24,
          19
        ],
        [
          25,
          19
        ],
        [
          26,
          19
        ],
        [
          27,
          19
        ],
        [
          28,
          19
        ],
        [
          29,
          19
        ],
        [
          30,
          19
        ],
        [
          31,
          19
        ],
        [
          32,
          19
        ],
        [
          33,
          19
        ],
        [
          34,
          19
        ],
        [
          35,
          19
        ],
        [
          18,
          20
        ],
        [
          19,
          20
        ],
        [
          20,
          20
        ],
        [
          21,
          20
        ],
        [
          22,
          20
        ],
        [
          23,
          20
        ],
        [
          24,
          20
        ],
        [
          25,
          20
        ],
        [
          26,
          20
        ],
        [
          27,
          20
        ],
        [
          28,
          20
        ],
        [
          29,
          20
        ],
        [
          30,
          20
        ],
        [
          31,
          20
        ],
        [
          32,
          20
        ],
        [
          33,
          20
        ],
        [
          34,
          20
        ],
        [
          35,
          20
        ],
        [
          18,
          21
        ],
        [
          19,
          21
        ],
        [
          20,
          21
        ],
        [
          21,
          21
        ],
        [
          22,
          21
        ],
        [
          23,
          21
        ],
        [
          24,
          21
        ],
        [
          25,
          21
        ],
        [
          26,
          21
        ],
        [
          27,
          21
        ],
        [
          28,
          21
        ],
        [
          29,
          21
        ],
        [
          30,
          21
        ],
        [
          31,
          21
        ],
        [
          32,
          21
        ],
        [
          33,
          21
        ],
        [
          34,
          21
        ],
        [
          35,
          21
        ],
        [
          18,
          22
        ],
        [
          19,
          22
        ],
        [
          20,
          22
        ],
        [
          21,
          22
        ],
        [
          22,
          22
        ],
        [
          23,
          22
        ],
        [
          24,
          22
        ],
        [
          25,
          22
        ],
        [
          26,
          22
        ],
        [
          27,
          22
        ],
        [
          28,
          22
        ],
        [
          29,
          22
        ],
        [
          30,
          22
        ],
        [
          31,
          22
        ],
        [
          32,
          22
        ],
        [
          33,
          22
        ],
        [
          34,
          22
        ],
        [
          35,
          22
        ],
        [
          18,
          23
        ],
        [
          19,
          23
        ],
        [
          20,
          23
        ],
        [
          21,
          23
        ],
        [
          22,
          23
        ],
        [
          23,
          23
        ],
        [
          24,
          23
        ],
        [
          25,
          23
        ],
        [
          26,
          23
        ],
        [
          27,
          23
        ],
        [
          28,
          23
        ],
        [
          29,
          23
        ],
        [
          30,
          23
        ],
        [
          31,
          23
        ],
        [
          32,
          23
        ],
        [
          33,
          23
        ],
        [
          34,
          23
        ],
        [
          35,
          23
        ],
        [
          18,
          24
        ],
        [
          19,
          24
        ],
        [
          20,
          24
        ],
        [
          21,
          24
        ],
        [
          22,
          24
        ],
        [
          23,
          24
        ],
        [
          24,
          24
        ],
        [
          25,
          24
        ],
        [
          26,
          24
        ],
        [
          27,
          24
        ],
        [
          28,
          24
        ],
        [
          29,
          24
        ],
        [
          30,
          24
        ],
        [
          31,
          24
        ],
        [
          32,
          24
        ],
        [
          33,
          24
        ],
        [
          34,
          24
        ],
        [
          35,
          24
        ],
        [
          18,
          25
        ],
        [
          19,
          25
        ],
        [
          20,
          25
        ],
        [
          21,
          25
        ],
        [
          22,
          25
        ],
        [
          23,
          25
        ],
        [
          24,
          25
        ],
        [
          25,
          25
        ],
        [
          26,
          25
        ],
        [
          27,
          25
        ],
        [
          28,
          25
        ],
        [
          29,
          25
        ],
        [
          30,
          25
        ],
        [
          31,
          25
        ],
        [
          32,
          25
        ],
        [
          33,
          25
        ],
        [
          34,
          25
        ],
        [
          35,
          25
        ]
      ],
      [
        [
          0,
          13
        ],
        [
          1,
          13
        ],
        [
          2,
          13
        ],
        [
          3,
          13
        ],
        [
          4,
          13
        ],
        [
          5,
          13
        ],
        [
          6,
          13
        ],
        [
          7,
          13
        ],
        [
          8,
          13
        ],
        [
          9,
          13
        ],
        [
          10,
          13
        ],
        [
          11,
          13
        ],
        [
          12,
          13
        ],
        [
          13,
          13
        ],
        [
          14,
          13
        ],
        [
          15,
          13
        ],
        [
          16,
          13
        ],
        [
          17,
          13
        ],
        [
          0,
          14
        ],
        [
          1,
          14
        ],
        [
          2,
          14
        ],
        [
          3,
          14
        ],
        [
          4,
          14
        ],
        [
          5,
          14
        ],
        [
          6,
          14
        ],
        [
          7,
          14
        ],
        [
          8,
          14
        ],
        [
          9,
          14
        ],
        [
          10,
          14
        ],
        [
          11,
          14
        ],
        [
          12,
          14
        ],
        [
          13,
          14
        ],
        [
          14,
          14
        ],
        [
          15,
          14
        ],
        [
          16,
          14
        ],
        [
          17,
          14
        ],
        [
          0,
          15
        ],
        [
          1,
          15
        ],
        [
          2,
          15
        ],
        [
          3,
          15
        ],
        [
          4,
          15
        ],
        [
          5,
          15
        ],
        [
          6,
          15
        ],
        [
          7,
          15
        ],
        [
          8,
          15
        ],
        [
          9,
          15
        ],
        [
          10,
          15
        ],
        [
          11,
          15
        ],
        [
          12,
          15
        ],
        [
          13,
          15
        ],
        [
          14,
          15
        ],
        [
          15,
          15
        ],
        [
          16,
          15
        ],
        [
          17,
          15
        ],
        [
          0,
          16
        ],
        [
          1,
          16
        ],
        [
          2,
          16
        ],
        [
          3,
          16
        ],
        [
          4,
          16
        ],
        [
          5,
          16
        ],
        [
          6,
          16
        ],
        [
          7,
          16
        ],
        [
          8,
          16
        ],
        [
          9,
          16
        ],
        [
          10,
          16
        ],
        [
          11,
          16
        ],
        [
          12,
          16
        ],
        [
          13,
          16
        ],
        [
          14,
          16
        ],
        [
          15,
          16
        ],
        [
          16,
          16
        ],
        [
          17,
          16
        ],
        [
          0,
          17
        ],
        [
          1,
          17
        ],
        [
          2,
          17
        ],
        [
          3,
          17
        ],
        [
          4,
          17
        ],
        [
          5,
          17
        ],
        [
          6,
          17
        ],
        [
          7,
          17
        ],
        [
          8,
          17
        ],
        [
          9,
          17
        ],
        [
          10,
          17
        ],
        [
          11,
          17
        ],
        [
          12,
          17
        ],
        [
          13,
          17
        ],
        [
          14,
          17
        ],
        [
          15,
          17
        ],
        [
          16,
          17
        ],
        [
          17,
          17
        ],
        [
          0,
          18
        ],
        [
          1,
          18
        ],
        [
          2,
          18
        ],
        [
          3,
          18
        ],
        [
          4,
          18
        ],
        [
          5,
          18
        ],
        [
          6,
          18
        ],
        [
          7,
          18
        ],
        [
          8,
          18
        ],
        [
          9,
          18
        ],
        [
          10,
          18
        ],
        [
          11,
          18
        ],
        [
          12,
          18
        ],
        [
          13,
          18
        ],
        [
          14,
          18
        ],
        [
          15,
          18
        ],
        [
          16,
          18
        ],
        [
          17,
          18
        ],
        [
          0,
          19
        ],
        [
          1,
          19
        ],
        [
          2,
          19
        ],
        [
          3,
          19
        ],
        [
          4,
          19
        ],
        [
          5,
          19
        ],
        [
          6,
          19
        ],
        [
          7,
          19
        ],
        [
          8,
          19
        ],
        [
          9,
          19
        ],
        [
          10,
          19
        ],
        [
          11,
          19
        ],
        [
          12,
          19
        ],
        [
          13,
          19
        ],
        [
          14,
          19
        ],
        [
          15,
          19
        ],
        [
          16,
          19
        ],
        [
          17,
          19
        ],
        [
          0,
          20
        ],
        [
          1,
          20
        ],
        [
          2,
          20
        ],
        [
          3,
          20
        ],
        [
          4,
          20
        ],
        [
          5,
          20
        ],
        [
          6,
          20
        ],
        [
          7,
          20
        ],
        [
          8,
          20
        ],
        [
          9,
          20
        ],
        [
          10,
          20
        ],
        [
          11,
          20
        ],
        [
          12,
          20
        ],
        [
          13,
          20
        ],
        [
          14,
          20
        ],
        [
          15,
          20
        ],
        [
          16,
          20
        ],
        [
          17,
          20
        ],
        [
          0,
          21
        ],
        [
          1,
          21
        ],
        [
          2,
          21
        ],
        [
          3,
          21
        ],
        [
          4,
          21
        ],
        [
          5,
          21
        ],
        [
          6,
          21
        ],
        [
          7,
          21
        ],
        [
          8,
          21
        ],
        [
          9,
          21
        ],
        [
          10,
          21
        ],
        [
          11,
          21
        ],
        [
          12,
          21
        ],
        [
          13,
          21
        ],
        [
          14,
          21
        ],
        [
          15,
          21
        ],
        [
          16,
          21
        ],
        [
          17,
          21
        ],
        [
          0,
          22
        ],
        [
          1,
          22
        ],
        [
          2,
          22
        ],
        [
          3,
          22
        ],
        [
          4,
          22
        ],
        [
          5,
          22
        ],
        [
          6,
          22
        ],
        [
          7,
          22
        ],
        [
          8,
          22
        ],
        [
          9,
          22
        ],
        [
          10,
          22
        ],
        [
          11,
          22
        ],
        [
          12,
          22
        ],
        [
          13,
          22
        ],
        [
          14,
          22
        ],
        [
          15,
          22
        ],
        [
          16,
          22
        ],
        [
          17,
          22
        ],
        [
          0,
          23
        ],
        [
          1,
          23
        ],
        [
          2,
          23
        ],
        [
          3,
          23
        ],
        [
          4,
          23
        ],
        [
          5,
          23
        ],
        [
          6,
          23
        ],
        [
          7,
          23
        ],
        [
          8,
          23
        ],
        [
          9,
          23
        ],
        [
          10,
          23
        ],
        [
          11,
          23
        ],
        [
          12,
          23
        ],
        [
          13,
          23
        ],
        [
          14,
          23
        ],
        [
          15,
          23
        ],
        [
          16,
          23
        ],
        [
          17,
          23
        ],
        [
          0,
          24
        ],
        [
          1,
          24
        ],
        [
          2,
          24
        ],
        [
          3,
          24
        ],
        [
          4,
          24
        ],
        [
          5,
          24
        ],
        [
          6,
          24
        ],
        [
          7,
          24
        ],
        [
          8,
          24
        ],
        [
          9,
          24
        ],
        [
          10,
          24
        ],
        [
          11,
          24
        ],
        [
          12,
          24
        ],
        [
          13,
          24
        ],
        [
          14,
          24
        ],
        [
          15,
          24
        ],
        [
          16,
          24
        ],
        [
          17,
          24
        ],
        [
          0,
          25
        ],
        [
          1,
          25
        ],
        [
          2,
          25
        ],
        [
          3,
          25
        ],
        [
          4,
          25
        ],
        [
          5,
          25
        ],
        [
          6,
          25
        ],
        [
          7,
          25
        ],
        [
          8,
          25
        ],
        [
          9,
          25
        ],
        [
          10,
          25
        ],
        [
          11,
          25
        ],
        [
          12,
          25
        ],
        [
          13,
          25
        ],
        [
          14,
          25
        ],
        [
          15,
          25
        ],
        [
          16,
          25
        ],
        [
          17,
          25
        ]
      ]
    ],
    zoneColors: [
      "#ff4444",
      "#4488ff",
      "#44ff88",
      "#ffaa22"
    ],
    spawners: [
      {
        entry: [
          0,
          0
        ],
        waypoints: [
          [
            3,
            3
          ],
          [
            32,
            3
          ],
          [
            32,
            22
          ],
          [
            3,
            22
          ],
          [
            3,
            3
          ],
          [
            32,
            3
          ],
          [
            32,
            22
          ],
          [
            3,
            22
          ],
          [
            3,
            3
          ]
        ],
        exit: [
          1,
          1
        ]
      },
      {
        entry: [
          35,
          0
        ],
        waypoints: [
          [
            32,
            3
          ],
          [
            32,
            22
          ],
          [
            3,
            22
          ],
          [
            3,
            3
          ],
          [
            32,
            3
          ],
          [
            32,
            22
          ],
          [
            3,
            22
          ],
          [
            3,
            3
          ],
          [
            32,
            3
          ]
        ],
        exit: [
          34,
          1
        ]
      },
      {
        entry: [
          35,
          25
        ],
        waypoints: [
          [
            32,
            22
          ],
          [
            3,
            22
          ],
          [
            3,
            3
          ],
          [
            32,
            3
          ],
          [
            32,
            22
          ],
          [
            3,
            22
          ],
          [
            3,
            3
          ],
          [
            32,
            3
          ],
          [
            32,
            22
          ]
        ],
        exit: [
          34,
          24
        ]
      },
      {
        entry: [
          0,
          25
        ],
        waypoints: [
          [
            3,
            22
          ],
          [
            3,
            3
          ],
          [
            32,
            3
          ],
          [
            32,
            22
          ],
          [
            3,
            22
          ],
          [
            3,
            3
          ],
          [
            32,
            3
          ],
          [
            32,
            22
          ],
          [
            3,
            22
          ]
        ],
        exit: [
          1,
          24
        ]
      }
    ]
  };

  // src/data/CircleMaps.ts
  function toPos(t) {
    return { col: t[0], row: t[1] };
  }
  function toPosArray(arr) {
    return arr.map(toPos);
  }
  function hexToNum(hex) {
    const trimmed = hex.startsWith("#") ? hex.slice(1) : hex;
    return parseInt(trimmed, 16);
  }
  function toSpawner(j) {
    return {
      entry: toPos(j.entry),
      waypoints: j.waypoints.map(toPos),
      exit: toPos(j.exit)
    };
  }
  function fromJSON(json) {
    const spawners = json.spawners.map(toSpawner);
    return {
      id: json.id,
      name: json.name,
      description: json.description,
      theme: json.theme,
      entries: spawners.map((s) => s.entry),
      exits: spawners.map((s) => s.exit),
      blocked: toPosArray(json.blocked),
      animated: toPosArray(json.animated),
      noBuild: toPosArray(json.noBuild),
      zones: json.zones.map(toPosArray),
      zoneColors: json.zoneColors.map(hexToNum),
      circlePlayers: json.playerCount,
      spawners
    };
  }
  var ALL_CIRCLE_MAPS = [
    circle_2p_default,
    circle_3p_default,
    circle_4p_default,
    circle_4p_hell_circle_default
  ];
  var CIRCLE_MAPS = ALL_CIRCLE_MAPS.map(fromJSON);
  function getCircleMap(id) {
    return CIRCLE_MAPS.find((m) => m.id === id);
  }

  // src/data/Maps.ts
  var MID_COL = Math.floor(GRID_COLS / 2);
  var MID_ROW = Math.floor(GRID_ROWS / 2);
  function inBounds(c, r) {
    return c >= 0 && c < GRID_COLS && r >= 0 && r < GRID_ROWS;
  }
  function rect(c1, r1, c2, r2) {
    const ps = [];
    for (let c = c1; c <= c2; c++) {
      for (let r = r1; r <= r2; r++) {
        if (inBounds(c, r)) ps.push({ col: c, row: r });
      }
    }
    return ps;
  }
  function circle(cx, cy, radius) {
    const ps = [];
    for (let c = cx - radius; c <= cx + radius; c++) {
      for (let r = cy - radius; r <= cy + radius; r++) {
        const dx = c - cx, dy = r - cy;
        if (dx * dx + dy * dy <= radius * radius && inBounds(c, r)) {
          ps.push({ col: c, row: r });
        }
      }
    }
    return ps;
  }
  var MAPS_PLAINS_TEMPLATE = {
    description: "Greenward \u2014 stub map. Replaced by per-mission commit.",
    theme: "forest",
    entries: [{ col: 0, row: MID_ROW }],
    exits: [{ col: GRID_COLS - 1, row: MID_ROW }],
    blocked: [],
    noBuild: []
  };
  function greenwardForestEdge() {
    const ps = [];
    for (let c = 0; c < GRID_COLS; c++) {
      if (c % 3 === 0) {
        ps.push({ col: c, row: 1 });
        ps.push({ col: c, row: GRID_ROWS - 2 });
      }
    }
    return ps;
  }
  function greenwardSaltCairns() {
    return [
      { col: 14, row: 8 },
      { col: 14, row: 18 },
      { col: 22, row: 13 }
    ];
  }
  function greenwardEadwinBuildings() {
    const ps = [];
    for (let c = 16; c <= 20; c++) {
      for (let r = 7; r <= 9; r++) ps.push({ col: c, row: r });
    }
    for (let c = 10; c <= 26; c += 4) {
      ps.push({ col: c, row: 13 });
      ps.push({ col: c, row: 14 });
    }
    return ps;
  }
  function greenwardEadwinRuins() {
    return [
      { col: 18, row: 10 },
      // inn_hearth Mercy
      { col: 14, row: 15 }
      // village_square Siege
    ];
  }
  function greenwardMarshPatches() {
    const ps = [];
    for (let c = 4; c <= 10; c += 2) for (let r = 4; r <= 8; r += 2) ps.push({ col: c, row: r });
    for (let c = 24; c <= 30; c += 2) for (let r = 16; r <= 20; r += 2) ps.push({ col: c, row: r });
    for (let c = 4; c <= 8; c += 2) for (let r = 18; r <= 22; r += 2) ps.push({ col: c, row: r });
    return ps.filter((p) => Math.max(Math.abs(p.col - 18), Math.abs(p.row - 13)) > 2);
  }
  function greenwardRiverBanks() {
    const ps = [];
    for (let c = 0; c < GRID_COLS; c++) {
      ps.push({ col: c, row: 9 });
      ps.push({ col: c, row: 17 });
    }
    return ps;
  }
  function greenwardTarrenfordBuildings() {
    const ps = [];
    for (let c = 12; c <= 16; c++) for (let r = 6; r <= 9; r++) ps.push({ col: c, row: r });
    for (let c = 18; c <= 28; c += 2) ps.push({ col: c, row: 19 });
    for (let c = 18; c <= 28; c += 2) ps.push({ col: c, row: 21 });
    return ps;
  }
  function greenwardWeddingPavilion() {
    const ps = [];
    const pillars = [
      { col: 14, row: 8 },
      { col: 22, row: 8 },
      { col: 12, row: 11 },
      { col: 24, row: 11 },
      { col: 14, row: 14 },
      { col: 22, row: 14 }
    ];
    ps.push(...pillars);
    for (let c = 14; c <= 22; c += 2) ps.push({ col: c, row: 21 });
    return ps;
  }
  function greenwardCourtGeometry() {
    const ps = [];
    for (let c = 0; c < GRID_COLS; c++) {
      if (c !== 6 && c !== 18 && c !== 30) ps.push({ col: c, row: GRID_ROWS - 1 });
    }
    for (let r = 8; r <= 12; r += 2) {
      ps.push({ col: 12, row: r });
      ps.push({ col: 24, row: r });
    }
    return ps;
  }
  function greenwardWatchtowerDefenses() {
    return [
      { col: 8, row: 11 },
      { col: 10, row: 13 },
      { col: 8, row: 15 }
    ];
  }
  function greenwardCathedralGeometry() {
    const ps = [];
    for (let r = 0; r < GRID_ROWS; r++) {
      if (r !== MID_ROW) ps.push({ col: 11, row: r });
    }
    for (let r = 0; r < GRID_ROWS; r++) {
      if (r !== MID_ROW) ps.push({ col: 24, row: r });
    }
    for (let r = 9; r <= 17; r += 4) {
      ps.push({ col: 15, row: r });
      ps.push({ col: 21, row: r });
    }
    for (let c = 31; c <= 33; c++) {
      for (let r = 12; r <= 14; r++) ps.push({ col: c, row: r });
    }
    return ps;
  }
  var MAPS = {
    plains: {
      id: "plains",
      name: "Plains",
      description: "Open field. Two lakes force creative pathing.",
      theme: "forest",
      entries: [{ col: 0, row: MID_ROW }],
      exits: [{ col: GRID_COLS - 1, row: MID_ROW }],
      blocked: [
        // Lake in upper half
        ...circle(10, 5, 3),
        // Lake in lower half
        ...circle(GRID_COLS - 12, GRID_ROWS - 7, 3)
      ],
      noBuild: []
    },
    crossroads: {
      id: "crossroads",
      name: "Crossroads",
      description: "Two entries. Mountain range divides the map.",
      theme: "mountain",
      entries: [
        { col: 0, row: 4 },
        { col: 0, row: GRID_ROWS - 5 }
      ],
      exits: [{ col: GRID_COLS - 1, row: MID_ROW }],
      blocked: [
        // Mountain range across middle with 3-wide gaps
        ...Array.from({ length: GRID_COLS }, (_, c) => {
          if (c >= MID_COL - 1 && c <= MID_COL + 1) return null;
          if (c <= 2 || c >= GRID_COLS - 3) return null;
          return { col: c, row: MID_ROW };
        }).filter(Boolean),
        // Mountain pillars flanking the gaps
        ...rect(MID_COL - 3, MID_ROW - 2, MID_COL - 2, MID_ROW - 1),
        ...rect(MID_COL + 2, MID_ROW + 1, MID_COL + 3, MID_ROW + 2)
      ],
      noBuild: [
        // Small no-build near exit convergence
        ...rect(GRID_COLS - 4, MID_ROW - 1, GRID_COLS - 3, MID_ROW + 1)
      ]
    },
    fortress: {
      id: "fortress",
      name: "Fortress",
      description: "Three entries. Stone walls around the center exit.",
      theme: "stone",
      entries: [
        { col: 0, row: MID_ROW },
        { col: GRID_COLS - 1, row: MID_ROW },
        { col: MID_COL, row: 0 }
      ],
      exits: [{ col: MID_COL, row: MID_ROW }],
      blocked: (() => {
        const b = [];
        for (let dc = -4; dc <= 4; dc++) {
          for (let dr = -4; dr <= 4; dr++) {
            const c = MID_COL + dc, r = MID_ROW + dr;
            const isEdge = Math.abs(dc) >= 3 || Math.abs(dr) >= 3;
            const isCorner = Math.abs(dc) >= 3 && Math.abs(dr) >= 3;
            const isGap = dc === 0 && Math.abs(dr) >= 3 || dr === 0 && Math.abs(dc) >= 3;
            if (isEdge && !isCorner && !isGap && inBounds(c, r)) {
              b.push({ col: c, row: r });
            }
          }
        }
        b.push(...rect(MID_COL - 5, MID_ROW - 5, MID_COL - 4, MID_ROW - 4));
        b.push(...rect(MID_COL + 4, MID_ROW - 5, MID_COL + 5, MID_ROW - 4));
        b.push(...rect(MID_COL - 5, MID_ROW + 4, MID_COL - 4, MID_ROW + 5));
        b.push(...rect(MID_COL + 4, MID_ROW + 4, MID_COL + 5, MID_ROW + 5));
        return b.filter((p) => inBounds(p.col, p.row));
      })(),
      noBuild: []
    },
    serpentine: {
      id: "serpentine",
      name: "Serpentine",
      description: "Canyon walls force a winding path.",
      theme: "mountain",
      entries: [{ col: 0, row: 2 }],
      exits: [{ col: GRID_COLS - 1, row: GRID_ROWS - 3 }],
      blocked: (() => {
        const b = [];
        const wallRows = [5, 10, 15, 20];
        for (let i = 0; i < wallRows.length; i++) {
          const r = wallRows[i];
          if (r >= GRID_ROWS) continue;
          const startCol = i % 2 === 0 ? 5 : 0;
          const endCol = i % 2 === 0 ? GRID_COLS : GRID_COLS - 5;
          for (let c = startCol; c < endCol; c++) {
            if (inBounds(c, r)) b.push({ col: c, row: r });
            if (inBounds(c, r + 1)) b.push({ col: c, row: r + 1 });
          }
        }
        return b;
      })(),
      noBuild: []
    },
    islands: {
      id: "islands",
      name: "Islands",
      description: "Build zones separated by mountain ridges and lakes.",
      theme: "water",
      entries: [{ col: 0, row: MID_ROW }],
      exits: [{ col: GRID_COLS - 1, row: MID_ROW }],
      blocked: (() => {
        const b = [];
        const r1 = Math.floor(GRID_COLS / 3);
        const r2 = Math.floor(GRID_COLS * 2 / 3);
        for (let r = 0; r < GRID_ROWS; r++) {
          if (r >= MID_ROW - 1 && r <= MID_ROW + 1) continue;
          if (r >= 3 && r <= 5) continue;
          if (r >= GRID_ROWS - 6 && r <= GRID_ROWS - 4) continue;
          b.push({ col: r1, row: r });
          b.push({ col: r1 + 1, row: r });
          b.push({ col: r2, row: r });
          b.push({ col: r2 - 1, row: r });
        }
        b.push(...circle(5, 4, 2));
        b.push(...circle(GRID_COLS - 6, 4, 2));
        b.push(...circle(5, GRID_ROWS - 5, 2));
        b.push(...circle(GRID_COLS - 6, GRID_ROWS - 5, 2));
        return b.filter((p) => inBounds(p.col, p.row));
      })(),
      noBuild: []
    },
    gauntlet: {
      id: "gauntlet",
      name: "Gauntlet",
      description: "Four entries. Volcanic pillars block the field.",
      theme: "volcanic",
      entries: [
        { col: 0, row: MID_ROW },
        { col: GRID_COLS - 1, row: MID_ROW },
        { col: MID_COL, row: 0 },
        { col: MID_COL, row: GRID_ROWS - 1 }
      ],
      exits: [{ col: MID_COL, row: MID_ROW }],
      blocked: (() => {
        const b = [];
        const pillars = [
          [MID_COL - 7, MID_ROW - 5, 2],
          [MID_COL + 7, MID_ROW - 5, 2],
          [MID_COL - 7, MID_ROW + 5, 2],
          [MID_COL + 7, MID_ROW + 5, 2],
          [MID_COL - 4, MID_ROW - 8, 1],
          [MID_COL + 4, MID_ROW - 8, 1],
          [MID_COL - 4, MID_ROW + 8, 1],
          [MID_COL + 4, MID_ROW + 8, 1],
          [MID_COL - 12, MID_ROW, 2],
          [MID_COL + 12, MID_ROW, 2]
        ];
        for (const [pc, pr, rad] of pillars) {
          b.push(...circle(pc, pr, rad));
        }
        return b.filter((p) => inBounds(p.col, p.row));
      })(),
      noBuild: [
        // Small no-build around exit
        ...circle(MID_COL, MID_ROW, 2).filter((p) => !(p.col === MID_COL && p.row === MID_ROW))
      ]
    },
    spiral: {
      id: "spiral",
      name: "Spiral",
      description: "Concentric walls spiral to the center.",
      theme: "stone",
      entries: [{ col: 0, row: 0 }],
      exits: [{ col: MID_COL, row: MID_ROW }],
      blocked: (() => {
        const b = [];
        const margin = 2;
        let top = margin, bottom = GRID_ROWS - 1 - margin;
        let left = margin, right = GRID_COLS - 1 - margin;
        let layer = 0;
        while (top < bottom - 2 && left < right - 2) {
          for (let c = left; c <= right; c++) {
            if (layer % 2 === 0 && c >= right - 2) continue;
            if (layer % 2 === 1 && c <= left + 2) continue;
            b.push({ col: c, row: top });
          }
          for (let r = top + 1; r <= bottom; r++) {
            if (layer % 2 === 0 && r >= bottom - 2) continue;
            if (layer % 2 === 1 && r <= top + 3) continue;
            b.push({ col: right, row: r });
          }
          for (let c = left; c < right; c++) {
            if (layer % 2 === 0 && c <= left + 2) continue;
            if (layer % 2 === 1 && c >= right - 2) continue;
            b.push({ col: c, row: bottom });
          }
          for (let r = top + 1; r < bottom; r++) {
            if (layer % 2 === 0 && r <= top + 3) continue;
            if (layer % 2 === 1 && r >= bottom - 2) continue;
            b.push({ col: left, row: r });
          }
          top += 4;
          bottom -= 4;
          left += 4;
          right -= 4;
          layer++;
        }
        return b.filter((p) => inBounds(p.col, p.row));
      })(),
      noBuild: []
    },
    siege: {
      id: "siege",
      name: "Empty",
      description: "Wide open. No obstacles \u2014 pure mazing.",
      theme: "forest",
      entries: [{ col: 0, row: MID_ROW }],
      exits: [{ col: GRID_COLS - 1, row: MID_ROW }],
      blocked: [],
      noBuild: []
    },
    random: {
      id: "random",
      name: "Random",
      description: "Procedurally generated \u2014 unique every time.",
      theme: "generic",
      entries: [{ col: 0, row: MID_ROW }],
      exits: [{ col: GRID_COLS - 1, row: MID_ROW }],
      blocked: [],
      noBuild: []
    },
    custom: {
      id: "custom",
      name: "Custom",
      description: "User-created map loaded from JSON.",
      theme: "generic",
      entries: [{ col: 0, row: MID_ROW }],
      exits: [{ col: GRID_COLS - 1, row: MID_ROW }],
      blocked: [],
      noBuild: []
    },
    tutorial: {
      // Tutorial match map — single straight left-to-right path with generous
      // build space on both sides. Intentionally empty of obstacles so the
      // mazing moment is clean: placing the suggested tower on the path forces
      // an obvious detour the player can see. Not listed in MAP_ORDER.
      id: "tutorial",
      name: "Tutorial",
      description: "Onboarding map \u2014 simple straight path for your first match.",
      theme: "forest",
      entries: [{ col: 0, row: MID_ROW }],
      exits: [{ col: GRID_COLS - 1, row: MID_ROW }],
      blocked: [],
      noBuild: []
    },
    hero_plains: {
      id: "hero_plains",
      name: "Hero Plains",
      description: "Open field for Hero Defense. 12 rows.",
      theme: "forest",
      entries: [{ col: 0, row: 6 }],
      exits: [{ col: GRID_COLS - 1, row: 6 }],
      blocked: [
        // Two small lakes
        ...circle(10, 3, 2),
        ...circle(GRID_COLS - 12, 9, 2)
      ],
      noBuild: []
    },
    // === Arcane campaign maps (Plan 14 v1.1) ===
    // Plan 14 v1 launched the Arcane campaign on existing standard maps;
    // v1.1 adds 3 bespoke Arcane-tileset maps for the marquee missions
    // so the campaign feels like its own place. Crystal motifs (clusters
    // of blocked cells via `circle()`) render via the `arcane_crystal`
    // terrain theme. Layouts are intentionally kept on validated path
    // shapes rather than radically new geometry — first content pass.
    arcane_outskirts: {
      id: "arcane_outskirts",
      name: "Crystal Outskirts",
      description: "Wide corridor approaching the caverns. A central crystal cluster forces a single deflection.",
      theme: "arcane_crystal",
      entries: [{ col: 0, row: MID_ROW }],
      exits: [{ col: GRID_COLS - 1, row: MID_ROW }],
      blocked: [
        // Single central crystal cluster — visible obstacle, soft mazing
        // hint, but the player can route around either side.
        ...circle(MID_COL - 4, MID_ROW - 4, 3),
        ...circle(MID_COL + 4, MID_ROW + 4, 3)
      ],
      noBuild: []
    },
    arcane_pass: {
      id: "arcane_pass",
      name: "The Crystal Pass",
      description: "Long winding pass through crystal walls. Forces a serpentine route \u2014 built for speedruns.",
      theme: "arcane_crystal",
      entries: [{ col: 0, row: 4 }],
      exits: [{ col: GRID_COLS - 1, row: GRID_ROWS - 5 }],
      blocked: [
        // Two mirrored crystal walls force a long S-shape from top-left
        // entry down to bottom-right exit.
        // Top wall (forces creeps down)
        ...rect(8, 0, 12, 9),
        ...rect(8, 0, 22, 4),
        // Bottom wall (forces creeps back up to weave)
        ...rect(14, 12, 27, 17),
        // Final wall guarding the exit
        ...rect(24, 18, 28, 25)
      ],
      noBuild: []
    },
    // === Base Defense (Plan 11) ===
    // Open arena with 4 entries (one per edge) converging on a single
    // exit at the geometric center. The exit cell is the "base" — a
    // leak there costs lives. Player builds defensive structure
    // anywhere; pathfinder routes each spawner to the central exit so
    // a thoughtful maze can lengthen the walk for every direction.
    // Light decorative blockers in each corner stop the player from
    // fully ringing the base — they have to pick which lanes to wall.
    base_arena: {
      id: "base_arena",
      name: "Citadel Arena",
      description: "Spawns from every side converging on the base. The whole map is your maze.",
      theme: "stone",
      // Truly 360° threat — 32 spawn points distributed around the
      // entire perimeter (8 per edge). Creeps round-robin across
      // paths via the standard SpawnManager pathIndex split, so each
      // wave hits the player from many directions simultaneously.
      entries: [
        // North edge (8 points, row 0)
        { col: 2, row: 0 },
        { col: 6, row: 0 },
        { col: 11, row: 0 },
        { col: 15, row: 0 },
        { col: 20, row: 0 },
        { col: 24, row: 0 },
        { col: 29, row: 0 },
        { col: 33, row: 0 },
        // South edge (8 points, row GRID_ROWS - 1)
        { col: 2, row: GRID_ROWS - 1 },
        { col: 6, row: GRID_ROWS - 1 },
        { col: 11, row: GRID_ROWS - 1 },
        { col: 15, row: GRID_ROWS - 1 },
        { col: 20, row: GRID_ROWS - 1 },
        { col: 24, row: GRID_ROWS - 1 },
        { col: 29, row: GRID_ROWS - 1 },
        { col: 33, row: GRID_ROWS - 1 },
        // West edge (8 points, col 0)
        { col: 0, row: 1 },
        { col: 0, row: 4 },
        { col: 0, row: 8 },
        { col: 0, row: 11 },
        { col: 0, row: 14 },
        { col: 0, row: 17 },
        { col: 0, row: 21 },
        { col: 0, row: 24 },
        // East edge (8 points, col GRID_COLS - 1)
        { col: GRID_COLS - 1, row: 1 },
        { col: GRID_COLS - 1, row: 4 },
        { col: GRID_COLS - 1, row: 8 },
        { col: GRID_COLS - 1, row: 11 },
        { col: GRID_COLS - 1, row: 14 },
        { col: GRID_COLS - 1, row: 17 },
        { col: GRID_COLS - 1, row: 21 },
        { col: GRID_COLS - 1, row: 24 }
      ],
      // Single exit at the center — visualized as the "base."
      exits: [{ col: MID_COL, row: MID_ROW }],
      blocked: [
        // Corner pillars — decorative obstructions that prevent the
        // player from sealing the base behind a four-cell wall, and
        // anchor a sense of "arena" geometry.
        ...rect(4, 4, 5, 5),
        ...rect(GRID_COLS - 6, 4, GRID_COLS - 5, 5),
        ...rect(4, GRID_ROWS - 6, 5, GRID_ROWS - 5),
        ...rect(GRID_COLS - 6, GRID_ROWS - 6, GRID_COLS - 5, GRID_ROWS - 5)
      ],
      // No noBuild ring — the player can build right up to the base.
      // Pathfinder still prevents placement that would seal off any
      // spawn from the exit, so the base remains reachable.
      noBuild: []
    },
    // === Attacker (Plan 12 v1) ===
    // Long open assault corridor. The player commands the attacking
    // creeps; the defender (AI) is represented by a fixed lattice of
    // pre-placed towers along the path. Player can't build, can't
    // upgrade — they watch each wave try to break through and (in
    // future v2) buff their next wave with essence.
    //
    // Win: leak count >= mission threshold (set per-mission, default
    // around 5 of the wave creeps surviving the gauntlet).
    attacker_assault: {
      id: "attacker_assault",
      name: "The Assault Corridor",
      description: "You command the attack. The Arcane defender plays a full game \u2014 mazes, builds, upgrades.",
      theme: "stone",
      entries: [{ col: 0, row: MID_ROW }],
      exits: [{ col: GRID_COLS - 1, row: MID_ROW }],
      blocked: [
        // Outer arena walls — funnel the path through the central
        // corridor where the CPU defender mazes their towers.
        ...rect(0, 0, GRID_COLS - 1, 5),
        ...rect(0, GRID_ROWS - 6, GRID_COLS - 1, GRID_ROWS - 1)
      ],
      noBuild: []
      // Plan 12 v3 — no static lattice. The CPU defender plays this
      // map as a full game (BalancedBrain), placing + upgrading +
      // mazing with the Arcane kit from a starting gold seed and
      // kill-gold income. Removed the old pre-placed arrow / cannon /
      // sniper lattice + expansion sockets; both are obsolete now
      // that the brain owns the entire map.
    },
    // === Heist (Plan 13 v1) ===
    // Reverse-direction map: creeps spawn from a vault on the east
    // edge and try to escape west. v1 reuses the standard "creep
    // exits = lives lost" semantics; v2 adds gold-on-ground (carried
    // gold drops on death; surviving creeps absorb pickups) once the
    // creep base class gains a `carriedGold` field.
    //
    // Vault placement: east-side narrow opening so the spawn pours
    // out along a single column. Exit: west edge, full open. Two
    // diagonal walls force creeps through a central kill funnel.
    heist_vault: {
      id: "heist_vault",
      name: "The Vault Heist",
      description: "Loot pours from the eastern vault. Stop them before they reach the west exit.",
      theme: "stone",
      entries: [{ col: GRID_COLS - 1, row: MID_ROW }],
      exits: [{ col: 0, row: MID_ROW }],
      blocked: [
        // Vault structure on the east side — implies a heavy stone
        // building creeps stream out of.
        ...rect(GRID_COLS - 4, MID_ROW - 4, GRID_COLS - 2, MID_ROW - 2),
        ...rect(GRID_COLS - 4, MID_ROW + 2, GRID_COLS - 2, MID_ROW + 4),
        // Central diagonal walls forcing a serpentine kill zone.
        ...rect(MID_COL + 4, 4, MID_COL + 5, MID_ROW - 2),
        ...rect(MID_COL - 4, MID_ROW + 2, MID_COL - 3, GRID_ROWS - 5)
      ],
      noBuild: []
    },
    arcane_throne: {
      id: "arcane_throne",
      name: "The Arcane Throne",
      description: "The wizards' inner sanctum. Three approaches converge on the central nexus.",
      theme: "arcane_crystal",
      entries: [
        { col: 0, row: 4 },
        { col: 0, row: MID_ROW },
        { col: 0, row: GRID_ROWS - 5 }
      ],
      exits: [{ col: GRID_COLS - 1, row: MID_ROW }],
      blocked: [
        // Outer crystal pillars guard the throne's flanks.
        ...rect(8, 6, 9, 9),
        ...rect(8, GRID_ROWS - 10, 9, GRID_ROWS - 7),
        // Central crystal nexus — the throne itself, decorative + forces
        // attackers to thread around.
        ...circle(MID_COL + 6, MID_ROW, 3),
        // Funnel walls before the exit
        ...rect(GRID_COLS - 8, 6, GRID_COLS - 7, MID_ROW - 2),
        ...rect(GRID_COLS - 8, MID_ROW + 2, GRID_COLS - 7, GRID_ROWS - 7)
      ],
      noBuild: [
        // The throne dais itself — visually striking but unbuildable so
        // the player can't simply turtle on the central tile.
        ...rect(MID_COL + 4, MID_ROW - 1, MID_COL + 5, MID_ROW + 1)
      ]
    },
    // === Circle Co-op Maps ===
    // Loaded from JSON under src/data/maps/circle/*.json via the
    // `CircleMaps` loader. Each map declares per-player spawners with
    // ordered waypoint lists — GameScene stitches waypoint-chained
    // paths through them so creeps circumnavigate the map before
    // returning to their entry. The `CircleMaps` module owns schema
    // + load logic; these entries are thin re-exports so callers that
    // index `MAPS.circle_2p` etc. keep working.
    circle_2p: getCircleMapById("circle_2p"),
    circle_3p: getCircleMapById("circle_3p"),
    circle_4p: getCircleMapById("circle_4p"),
    circle_4p_hell_circle: getCircleMapById("circle_4p_hell_circle"),
    // === M10 Arcane finale siege ===
    // Layout matches the user's reference image:
    //   - Brown perimeter walls + central arrow-cross divider (col ~17).
    //   - LEFT half (cols 1-13): CPU territory. ~25 destructible Arcane
    //     towers in scattered clusters around the green exit. The Ult
    //     Throne sits behind the exit at (2, midRow).
    //   - RIGHT half (cols 19-34): Player territory. Two magenta build
    //     zones each ringing a 2x2 lavender Summoning Circle.
    //   - Red entry at the right edge mid-row, green exit at the left
    //     edge mid-row. Wave creeps walk right→left.
    arcane_throne_finale: (() => {
      const cols = GRID_COLS;
      const rowsTop = 0, rowsBot = GRID_ROWS - 1;
      const midRow = Math.floor(GRID_ROWS / 2);
      const outerWall = [];
      for (let c = 0; c < cols; c++) {
        outerWall.push({ col: c, row: rowsTop }, { col: c, row: rowsBot });
      }
      for (let r = 1; r < rowsBot; r++) {
        if (r !== midRow) {
          outerWall.push({ col: 0, row: r }, { col: cols - 1, row: r });
        }
      }
      const centerCross = [
        ...rect(17, 4, 17, 8),
        // top vertical spine
        ...rect(17, 14, 17, 20),
        // bottom vertical spine
        ...rect(15, 9, 19, 13),
        // central thick body
        { col: 18, row: 8 },
        { col: 16, row: 11 },
        { col: 20, row: 11 },
        // Two lone blocks above + below the central body (matches the
        // reference image's arrow-cross silhouette).
        { col: 17, row: 2 },
        { col: 17, row: 22 }
      ];
      const destructibleTowers = [
        // Top cluster (rows 4-7)
        { col: 2, row: 5, towerId: "arcane_bolt", hp: 500 },
        { col: 4, row: 4, towerId: "arcane_storm", hp: 600 },
        { col: 6, row: 6, towerId: "arcane_bolt", hp: 500 },
        { col: 8, row: 5, towerId: "arcane_focus", hp: 700 },
        { col: 10, row: 4, towerId: "arcane_storm", hp: 600 },
        { col: 12, row: 5, towerId: "arcane_bolt", hp: 500 },
        // Mid cluster (rows 9-15) — densest, around the green exit
        { col: 2, row: 10, towerId: "arcane_bolt", hp: 500 },
        { col: 5, row: 11, towerId: "arcane_storm", hp: 600 },
        { col: 7, row: 10, towerId: "arcane_bolt", hp: 500 },
        { col: 9, row: 12, towerId: "arcane_focus", hp: 700 },
        { col: 11, row: 11, towerId: "arcane_storm", hp: 600 },
        { col: 13, row: 10, towerId: "arcane_bolt", hp: 500 },
        // The Archmage Throne moved to `destructibleStructures` (PRD 06):
        // 3×3 boss structure with damage frames + win-target flag.
        { col: 4, row: 14, towerId: "arcane_drain", hp: 800 },
        { col: 6, row: 13, towerId: "arcane_storm", hp: 600 },
        { col: 9, row: 14, towerId: "arcane_bolt", hp: 500 },
        { col: 11, row: 13, towerId: "arcane_focus", hp: 700 },
        // Bottom cluster (rows 17-20)
        { col: 2, row: 17, towerId: "arcane_bolt", hp: 500 },
        { col: 4, row: 19, towerId: "arcane_storm", hp: 600 },
        { col: 6, row: 18, towerId: "arcane_bolt", hp: 500 },
        { col: 8, row: 17, towerId: "arcane_focus", hp: 700 },
        { col: 10, row: 19, towerId: "arcane_storm", hp: 600 },
        { col: 13, row: 18, towerId: "arcane_bolt", hp: 500 }
      ];
      const summoningCircles = [
        { col: 30, row: 5 },
        { col: 30, row: 17 }
      ];
      const playerBuildableCells = [];
      const buildableMinCol = 18;
      for (let c = buildableMinCol; c < cols - 1; c++) {
        for (let r = 1; r < GRID_ROWS - 1; r++) {
          playerBuildableCells.push({ col: c, row: r });
        }
      }
      const destructibleStructures = [
        { id: "arcane_archmage_throne", col: 2, row: midRow - 2, hp: 5e3, isMissionWinTarget: true }
      ];
      const noBuild = [];
      for (const c of summoningCircles) {
        for (let dc = 0; dc <= 1; dc++) for (let dr = 0; dr <= 1; dr++) {
          noBuild.push({ col: c.col + dc, row: c.row + dr });
        }
      }
      for (const s of destructibleStructures) {
        for (let dc = 0; dc < 3; dc++) for (let dr = 0; dr < 3; dr++) {
          noBuild.push({ col: s.col + dc, row: s.row + dr });
        }
      }
      return {
        id: "arcane_throne_finale",
        name: "The Reckoning",
        description: "Siege the Arcane archmage spire. Charge your summoning circles, summon the mage, destroy the cabal's lattice.",
        theme: "arcane_crystal",
        // Wave creeps are the cabal's own — they emerge from the spire
        // (left edge, near the CPU towers) and walk RIGHT toward the
        // player's home. CPU towers ignore them (same team). Player
        // sends walk the reverse direction (right→left, into the
        // tower lattice) and DO get shot at.
        entries: [{ col: 0, row: midRow }],
        exits: [{ col: cols - 1, row: midRow }],
        blocked: [...outerWall, ...centerCross],
        noBuild,
        playerBuildableCells,
        summoningCircles,
        destructibleTowers,
        destructibleStructures
      };
    })(),
    // === Mech M10 finale: The Overthrow ===
    //   - LEFT half (cols 1-13): Voss's foundry. Throne (col 2, midRow),
    //     four generators distributed vertically, each with 3-4 linked
    //     CPU defender towers nearby. Throne is invulnerable until every
    //     generator dies; SabotageController wires that gating.
    //   - RIGHT half (cols 18-34): player territory. Workshop pre-placed
    //     at (32, midRow); buildable zone covers the rest. Player trains
    //     Raiders at the Workshop and walks them across the map to chip
    //     down generators + the throne.
    //   - Wave creeps spawn from the throne side (col 0, midRow) and
    //     walk RIGHT toward the player's base. Sends walk reverse.
    mech_throne_finale: (() => {
      const cols = GRID_COLS;
      const rowsTop = 0, rowsBot = GRID_ROWS - 1;
      const midRow = Math.floor(GRID_ROWS / 2);
      const outerWall = [];
      for (let c = 0; c < cols; c++) outerWall.push({ col: c, row: rowsTop }, { col: c, row: rowsBot });
      for (let r = 1; r < rowsBot; r++) {
        if (r !== midRow) outerWall.push({ col: 0, row: r }, { col: cols - 1, row: r });
      }
      const centerCross = [
        ...rect(17, 4, 17, 8),
        ...rect(17, 14, 17, 20),
        ...rect(15, 9, 19, 13),
        { col: 18, row: 8 },
        { col: 16, row: 11 },
        { col: 20, row: 11 },
        { col: 17, row: 2 },
        { col: 17, row: 22 }
      ];
      const G = (col, row, linked) => ({
        col,
        row,
        towerId: "mech_mortar",
        hp: 1200,
        isGenerator: true,
        linkedTowers: linked
      });
      const T = (col, row, towerId = "mech_turret") => ({
        col,
        row,
        towerId,
        hp: 500
      });
      const generatorTopLinks = [{ col: 4, row: 4 }, { col: 6, row: 5 }, { col: 8, row: 4 }];
      const generatorMid1Links = [{ col: 4, row: 9 }, { col: 6, row: 10 }, { col: 8, row: 9 }];
      const generatorMid2Links = [{ col: 4, row: 14 }, { col: 6, row: 15 }, { col: 8, row: 14 }];
      const generatorBotLinks = [{ col: 4, row: 19 }, { col: 6, row: 20 }, { col: 8, row: 19 }];
      const destructibleTowers = [
        // Top cluster — generator + linked turrets.
        G(11, 4, generatorTopLinks),
        ...generatorTopLinks.map((c) => T(c.col, c.row)),
        // Mid-1 cluster.
        G(11, 9, generatorMid1Links),
        ...generatorMid1Links.map((c) => T(c.col, c.row)),
        // Mid-2 cluster.
        G(11, 14, generatorMid2Links),
        ...generatorMid2Links.map((c) => T(c.col, c.row)),
        // Bottom cluster.
        G(11, 19, generatorBotLinks),
        ...generatorBotLinks.map((c) => T(c.col, c.row))
      ];
      const destructibleStructures = [
        { id: "mech_voss_throne", col: 3, row: midRow - 1, hp: 5e3, isMissionWinTarget: true }
      ];
      const playerBuildableCells = [];
      for (let c = 18; c < cols - 1; c++) {
        for (let r = 1; r < GRID_ROWS - 1; r++) {
          playerBuildableCells.push({ col: c, row: r });
        }
      }
      return {
        id: "mech_throne_finale",
        name: "The Overthrow",
        description: "Storm Voss's foundry. Train raiders, drop the generators, end the tyrant.",
        theme: "factory",
        entries: [{ col: 0, row: midRow }],
        exits: [{ col: cols - 1, row: midRow }],
        blocked: [...outerWall, ...centerCross],
        noBuild: [],
        playerBuildableCells,
        destructibleTowers,
        destructibleStructures,
        workshop: { col: 32, row: midRow }
      };
    })(),
    // ── Campaign #3 — Greenward maps ───────────────────────────────
    // Act I — Border. Forest-edge wayshrine, salt meadow, inn-village.
    greenward_boundary: {
      id: "greenward_boundary",
      name: "The Boundary Stones",
      description: "A road leaving the Wildwood at sunrise. The wayshrine waits at the road's end.",
      theme: "forest",
      // Creeps approach from the east (the south kingdoms); they walk
      // toward the Wildwood (west exit).
      entries: [{ col: GRID_COLS - 1, row: MID_ROW }],
      exits: [{ col: 0, row: MID_ROW }],
      blocked: greenwardForestEdge(),
      // Wayshrine cell — noBuild so the player can't drop a tower
      // ON the shrine but mazes around it.
      noBuild: [{ col: 18, row: 13 }]
    },
    greenward_meadow: {
      id: "greenward_meadow",
      name: "The Salt Meadow",
      description: "A meadow turned saline. Two cairns + a barrow. Open and exposed.",
      theme: "generic",
      // Two entries (north + south) — Inheritors creep in from both
      // flanks, suggesting Marra is exposed in the middle of the field.
      entries: [
        { col: 17, row: 0 },
        { col: 17, row: GRID_ROWS - 1 }
      ],
      exits: [{ col: 0, row: MID_ROW }],
      blocked: [],
      // The meadow is OPEN by design — salt killed everything.
      noBuild: greenwardSaltCairns()
    },
    greenward_eadwin: {
      id: "greenward_eadwin",
      name: "The Circle at Eadwin",
      description: "An inn-village. Hearth still burning. Strange chants in the square.",
      theme: "stone",
      entries: [{ col: GRID_COLS - 1, row: MID_ROW }],
      exits: [{ col: 0, row: MID_ROW }],
      // Inn block (NE) + shop fronts in a central band create a
      // forced weave through the village.
      blocked: greenwardEadwinBuildings(),
      // The inn-hearth + village square ruins are noBuild.
      noBuild: greenwardEadwinRuins()
    },
    // Act II — Salt Roads. Marsh crossroads, dying river, still-alive
    // Tarrenford, frozen wedding pavilion.
    greenward_crows: {
      id: "greenward_crows",
      name: "The Road of Crows",
      description: "Marsh crossroads. Cethric sits cross-legged at the meeting of paths.",
      theme: "water",
      // Multi-path crossroads — two entries (N+S) and two exits (E+W).
      entries: [
        { col: 17, row: 0 },
        { col: 17, row: GRID_ROWS - 1 }
      ],
      exits: [
        { col: 0, row: 13 },
        { col: GRID_COLS - 1, row: 13 }
      ],
      blocked: greenwardMarshPatches(),
      // crossroads (Mercy — Cethric) + eastern_road (Ceremony)
      noBuild: [
        { col: 18, row: 13 },
        // crossroads
        { col: 26, row: 13 }
        // eastern_road
      ]
    },
    greenward_river: {
      id: "greenward_river",
      name: "The Dry River",
      description: "A river going salt as Marra watches. The headwater is upstream.",
      theme: "water",
      // Linear east-to-west river. The headwater is east; creeps
      // approach from the east, exit to the west toward the Wildwood.
      entries: [{ col: GRID_COLS - 1, row: 13 }],
      exits: [{ col: 0, row: 13 }],
      blocked: greenwardRiverBanks(),
      // headwater (Ceremony at east) + river_west + river_east (Siege).
      noBuild: [
        { col: 30, row: 13 },
        // headwater
        { col: 8, row: 13 },
        // river_west
        { col: 18, row: 13 }
        // river_east
      ]
    },
    greenward_tarrenford: {
      id: "greenward_tarrenford",
      name: "Tarrenford",
      description: "A village still alive. Chapel, well, wheat. Forty-seven people.",
      theme: "forest",
      // North entry, south exit — Inheritors approach the village from
      // above; civilians cross the path in both directions.
      entries: [{ col: MID_COL, row: 0 }],
      exits: [{ col: MID_COL, row: GRID_ROWS - 1 }],
      blocked: greenwardTarrenfordBuildings(),
      // chapel + well + wheat_field — three Ceremony ruins.
      noBuild: [
        { col: 14, row: 8 },
        // chapel
        { col: 18, row: 13 },
        // well
        { col: 22, row: 18 }
        // wheat_field
      ]
    },
    greenward_weddingstone: {
      id: "greenward_weddingstone",
      name: "Wedding-Stone",
      description: "A wedding turned to stone. The bride still stands at the altar.",
      theme: "stone",
      // Two entries (E+W, the wedding party approaches from both
      // sides) + one north exit (the cleared path the bride was
      // meant to walk).
      entries: [
        { col: 0, row: 13 },
        { col: GRID_COLS - 1, row: 13 }
      ],
      exits: [{ col: MID_COL, row: 0 }],
      blocked: greenwardWeddingPavilion(),
      noBuild: [
        { col: 18, row: 10 },
        // altar (Mercy)
        { col: 18, row: 18 }
        // pavilion (Siege)
      ]
    },
    // Act III pre-finale — Stillborn Court + Last Garden.
    greenward_court: {
      id: "greenward_court",
      name: "The Stillborn Court",
      description: "A courtyard with three doors. The Inheritor host enters; the Child watches.",
      theme: "stone",
      // Three doors at the south edge — Knight, Herald, Child cycle.
      entries: [
        { col: 6, row: GRID_ROWS - 1 },
        { col: 18, row: GRID_ROWS - 1 },
        { col: 30, row: GRID_ROWS - 1 }
      ],
      // Single north exit — leak path toward Caer Lythen.
      exits: [{ col: MID_COL, row: 0 }],
      blocked: greenwardCourtGeometry(),
      // court_grounds Siege + the_child Mercy.
      noBuild: [
        { col: 14, row: 13 },
        // court_grounds
        { col: 22, row: 13 }
        // the_child
      ]
    },
    greenward_lastgarden: {
      id: "greenward_lastgarden",
      name: "The Last Garden",
      description: "An Inheritor watchtower on the road to Caer Lythen. Built of grove-wood.",
      theme: "mountain",
      // Attacker mode: Marra SENDS from the east toward the watchtower
      // at the west. Reversed entry/exit semantics — entry is where
      // the player's creeps start (east), exit is the Inheritor
      // territory (west) the watchtower defends.
      entries: [{ col: GRID_COLS - 1, row: 13 }],
      exits: [{ col: 0, row: 13 }],
      blocked: greenwardWatchtowerDefenses(),
      noBuild: [{ col: 6, row: 13 }]
      // watchtower
    },
    // M10 — Caer Lythen, the Sun-Cathedral. Three-section setpiece
    // map: Courtyard / Nave / Throne. Dense Blocked-cell barriers
    // create the visual zoning while preserving pathfind through
    // chokepoint gaps at the mid-row.
    greenward_cathedral: {
      id: "greenward_cathedral",
      name: "Caer Lythen, the Sun-Cathedral",
      description: "Three setpieces. Courtyard, Nave, Throne. The Heron waits at the altar.",
      theme: "arcane_crystal",
      // West entry (Courtyard) → east exit (Throne consequence wave).
      entries: [{ col: 0, row: MID_ROW }],
      exits: [{ col: GRID_COLS - 1, row: MID_ROW }],
      blocked: greenwardCathedralGeometry(),
      // Three setpiece ruins — courtyard (Siege), nave (mode resolved
      // at runtime by GreenwardFinaleController), throne (Siege).
      noBuild: [
        { col: 6, row: 13 },
        // courtyard
        { col: 18, row: 13 },
        // nave
        { col: 30, row: 13 }
        // throne
      ]
    }
  };
  function getCircleMapById(id) {
    const map = getCircleMap(id);
    if (!map) throw new Error(`CircleMaps registry is missing ${id}`);
    return map;
  }

  // src/data/Difficulty.ts
  var DIFFICULTIES = {
    easy: {
      toughness: 0.8,
      count: 0.8,
      speed: 0.9,
      goldMult: 1.2,
      toughnessPerWave: 0
    },
    normal: {
      toughness: 0.95,
      count: 1,
      speed: 1,
      goldMult: 1,
      toughnessPerWave: 5e-3
      // +0.5%/wave — wave 20 = 1.10×, wave 40 = 1.20×
    },
    hard: {
      toughness: 1,
      count: 1.3,
      speed: 1.05,
      goldMult: 0.6,
      // +5%/wave — wave 10 = 1.50×, wave 20 = 2.00×, wave 30 = 2.50×.
      // Lowered from 0.13 (wave 10 = 2.30×) which the brain-search loop
      // showed produced 0% wins across every BalancedBrain config tested
      // — i.e. unwinnable, not "hard". Default brains still 0% at 0.05;
      // tuned brain reaches wave 14.8 of 20 (no wins), giving the
      // search a real optimisation target without trivialising the band.
      toughnessPerWave: 0.05
    },
    insane: {
      toughness: 1.15,
      count: 1.5,
      speed: 1.1,
      goldMult: 0.4,
      toughnessPerWave: 0.24
      // +24%/wave — wave 10 = 4.38× (matches old insane), wave 20 = 7.54×, wave 30 = 10.66×
    }
  };

  // src/data/WaveDefinitions.ts
  function generateStandardWaves(count) {
    const waves = [];
    for (let i = 0; i < count; i++) {
      const waveNum = i + 1;
      const baseHp = Math.round(20 + waveNum * 8 + waveNum * waveNum * 0.4);
      const baseSpeed = 1 + waveNum * 0.02;
      const interval = Math.max(150, 600 - waveNum * 12);
      if (waveNum % 10 === 0) {
        waves.push({
          wave: waveNum,
          groups: [{ creepType: "boss", count: 1, hpScale: baseHp, speedScale: 1 }],
          spawnInterval: 0,
          isBoss: true
        });
        continue;
      }
      const groups = [];
      if (waveNum <= 3) {
        groups.push({ creepType: "standard", count: 5 + waveNum, hpScale: baseHp, speedScale: baseSpeed });
      } else if (waveNum <= 6) {
        groups.push({ creepType: "standard", count: 4 + waveNum, hpScale: baseHp, speedScale: baseSpeed });
        groups.push({ creepType: "fast", count: 2, hpScale: baseHp, speedScale: baseSpeed });
      } else if (waveNum <= 9) {
        groups.push({ creepType: "standard", count: 3 + waveNum, hpScale: baseHp, speedScale: baseSpeed });
        groups.push({ creepType: "fast", count: 3, hpScale: baseHp, speedScale: baseSpeed });
        groups.push({ creepType: "armored", count: 1, hpScale: baseHp, speedScale: baseSpeed });
        if (waveNum >= 8) {
          groups.push({ creepType: "group", count: 2, hpScale: baseHp, speedScale: baseSpeed });
        }
      } else if (waveNum <= 15) {
        groups.push({ creepType: "standard", count: Math.floor(waveNum * 0.7), hpScale: baseHp, speedScale: baseSpeed });
        groups.push({ creepType: "fast", count: 3, hpScale: baseHp, speedScale: baseSpeed });
        groups.push({ creepType: "armored", count: 2, hpScale: baseHp, speedScale: baseSpeed });
        groups.push({ creepType: "swarm", count: 2, hpScale: baseHp, speedScale: baseSpeed });
        if (waveNum >= 12) {
          groups.push({ creepType: "evasive", count: 2, hpScale: baseHp, speedScale: baseSpeed });
        }
        if (waveNum >= 13) {
          groups.push({ creepType: "shielded", count: 1, hpScale: baseHp, speedScale: baseSpeed });
        }
        if (waveNum >= 14) {
          groups.push({ creepType: "splitter", count: 1, hpScale: baseHp, speedScale: baseSpeed });
        }
      } else if (waveNum <= 20) {
        groups.push({ creepType: "standard", count: Math.floor(waveNum * 0.5), hpScale: baseHp, speedScale: baseSpeed });
        groups.push({ creepType: "fast", count: 4, hpScale: baseHp, speedScale: baseSpeed });
        groups.push({ creepType: "armored", count: 3, hpScale: baseHp, speedScale: baseSpeed });
        groups.push({ creepType: "swarm", count: 3, hpScale: baseHp, speedScale: baseSpeed });
        groups.push({ creepType: "evasive", count: 2, hpScale: baseHp, speedScale: baseSpeed });
        groups.push({ creepType: "splitter", count: 2, hpScale: baseHp, speedScale: baseSpeed });
        groups.push({ creepType: "shielded", count: 2, hpScale: baseHp, speedScale: baseSpeed });
        if (waveNum >= 18) {
          groups.push({ creepType: "healer", count: 1, hpScale: baseHp, speedScale: baseSpeed });
          const mageTypes = ["mage_armor", "mage_speed", "mage_evasion", "mage_heal"];
          groups.push({ creepType: mageTypes[waveNum % mageTypes.length], count: 1, hpScale: baseHp, speedScale: baseSpeed });
        }
        if (waveNum >= 19) {
          groups.push({ creepType: "flying", count: 2, hpScale: baseHp, speedScale: baseSpeed });
        }
      } else if (waveNum <= 22) {
        groups.push({ creepType: "armored", count: 6, hpScale: baseHp, speedScale: baseSpeed });
        groups.push({ creepType: "healer", count: 2, hpScale: baseHp, speedScale: baseSpeed });
        groups.push({ creepType: "standard", count: Math.floor(waveNum * 0.4), hpScale: baseHp, speedScale: baseSpeed });
        groups.push({ creepType: "shielded", count: 2, hpScale: baseHp, speedScale: baseSpeed });
        groups.push({ creepType: "mage_armor", count: 1, hpScale: baseHp, speedScale: baseSpeed });
        groups.push({ creepType: "mage_heal", count: 1, hpScale: baseHp, speedScale: baseSpeed });
      } else if (waveNum <= 24) {
        groups.push({ creepType: "fast", count: 8, hpScale: baseHp, speedScale: baseSpeed });
        groups.push({ creepType: "swarm", count: 6, hpScale: baseHp, speedScale: baseSpeed });
        groups.push({ creepType: "evasive", count: 4, hpScale: baseHp, speedScale: baseSpeed });
        groups.push({ creepType: "mage_speed", count: 1, hpScale: baseHp, speedScale: baseSpeed });
        groups.push({ creepType: "group", count: 3, hpScale: baseHp, speedScale: baseSpeed });
      } else if (waveNum <= 26) {
        groups.push({ creepType: "shielded", count: 4, hpScale: baseHp, speedScale: baseSpeed });
        groups.push({ creepType: "regenerator", count: 3, hpScale: baseHp, speedScale: baseSpeed });
        groups.push({ creepType: "healer", count: 2, hpScale: baseHp, speedScale: baseSpeed });
        groups.push({ creepType: "mage_heal", count: 1, hpScale: baseHp, speedScale: baseSpeed });
        groups.push({ creepType: "armored", count: 3, hpScale: baseHp, speedScale: baseSpeed });
        groups.push({ creepType: "splitter", count: 2, hpScale: baseHp, speedScale: baseSpeed });
      } else if (waveNum <= 28) {
        groups.push({ creepType: "flying", count: 5, hpScale: baseHp, speedScale: baseSpeed });
        groups.push({ creepType: "healer", count: 2, hpScale: baseHp, speedScale: baseSpeed });
        groups.push({ creepType: "evasive", count: 4, hpScale: baseHp, speedScale: baseSpeed });
        groups.push({ creepType: "mage_evasion", count: 1, hpScale: baseHp, speedScale: baseSpeed });
        groups.push({ creepType: "fast", count: 5, hpScale: baseHp, speedScale: baseSpeed });
        groups.push({ creepType: "regenerator", count: 2, hpScale: baseHp, speedScale: baseSpeed });
      } else {
        groups.push({ creepType: "armored", count: 5, hpScale: baseHp, speedScale: baseSpeed });
        groups.push({ creepType: "fast", count: 6, hpScale: baseHp, speedScale: baseSpeed });
        groups.push({ creepType: "swarm", count: 5, hpScale: baseHp, speedScale: baseSpeed });
        groups.push({ creepType: "shielded", count: 4, hpScale: baseHp, speedScale: baseSpeed });
        groups.push({ creepType: "regenerator", count: 3, hpScale: baseHp, speedScale: baseSpeed });
        groups.push({ creepType: "healer", count: 2, hpScale: baseHp, speedScale: baseSpeed });
        groups.push({ creepType: "flying", count: 4, hpScale: baseHp, speedScale: baseSpeed });
        groups.push({ creepType: "evasive", count: 3, hpScale: baseHp, speedScale: baseSpeed });
        groups.push({ creepType: "splitter", count: 2, hpScale: baseHp, speedScale: baseSpeed });
        groups.push({ creepType: "group", count: 3, hpScale: baseHp, speedScale: baseSpeed });
        const mageTypes = ["mage_armor", "mage_speed", "mage_evasion", "mage_heal"];
        groups.push({ creepType: mageTypes[waveNum % mageTypes.length], count: 1, hpScale: baseHp, speedScale: baseSpeed });
      }
      waves.push({ wave: waveNum, groups, spawnInterval: interval, isBoss: false });
    }
    return waves;
  }
  function generateEndlessWaves(startWave, count) {
    const waves = [];
    const creepTypes = ["standard", "fast", "armored", "swarm", "evasive", "shielded", "splitter", "regenerator", "healer", "flying", "group"];
    const mageTypes = ["mage_armor", "mage_speed", "mage_evasion", "mage_heal"];
    for (let i = 0; i < count; i++) {
      const waveNum = startWave + i;
      const baseHp = Math.round(20 + waveNum * 10 + waveNum * waveNum * 0.5 + Math.max(0, waveNum - 50) ** 2 * 0.3);
      const baseSpeed = Math.min(3, 1 + waveNum * 0.015);
      const creepCount = Math.min(30, 5 + Math.floor(waveNum * 0.5));
      const interval = Math.max(100, 600 - waveNum * 8);
      if (waveNum % 10 === 0) {
        waves.push({
          wave: waveNum,
          groups: [{ creepType: "boss", count: 1, hpScale: baseHp * 2, speedScale: 1 }],
          spawnInterval: 0,
          isBoss: true
        });
        continue;
      }
      const groups = [];
      const availableTypes = creepTypes.slice(0, Math.min(creepTypes.length, 3 + Math.floor(waveNum / 5)));
      for (const ct of availableTypes) {
        const count2 = Math.max(1, Math.floor(creepCount / availableTypes.length));
        groups.push({ creepType: ct, count: count2, hpScale: baseHp, speedScale: baseSpeed });
      }
      if (waveNum >= 15) {
        groups.push({ creepType: mageTypes[waveNum % mageTypes.length], count: 1 + Math.floor(waveNum / 30), hpScale: baseHp, speedScale: baseSpeed });
      }
      waves.push({ wave: waveNum, groups, spawnInterval: interval, isBoss: false });
    }
    return waves;
  }
  function getWavesForMode(mode, waveCount) {
    switch (mode) {
      case "standard":
        return generateStandardWaves(waveCount ?? 30);
      case "endless":
        return generateEndlessWaves(1, 20);
      // initial batch; more appended at runtime
      case "battle":
        return generateStandardWaves(waveCount ?? 30);
      // same wave structure, different economy
      case "hero_defense":
        return generateStandardWaves(waveCount ?? 30).map((w) => ({
          ...w,
          groups: w.groups.map((g) => ({ ...g, count: g.count * 10 })),
          spawnInterval: Math.max(80, Math.round(w.spawnInterval * 0.4))
        }));
      // 10x creeps, faster spawns — flood the arena
      case "circle_coop":
        return generateStandardWaves(waveCount ?? 30);
      // same structure, leaked creeps forward to next player
      case "gauntlet":
        return generateStandardWaves(10);
      // placeholder — actual waves come from GauntletMode.getStageWaves()
      case "tutorial":
        return generateTutorialWaves();
      case "attacker":
        return generateStandardWaves(waveCount ?? 10);
    }
  }
  function generateTutorialWaves() {
    return [
      {
        wave: 1,
        groups: [{ creepType: "standard", count: 5, hpScale: 24, speedScale: 0.85 }],
        spawnInterval: 650,
        isBoss: false
      },
      {
        // Wave 2 leans into fast creeps so the tutorial's Frost slow
        // effect is visibly useful — you can actually see the fast
        // units crawl through the slow zone.
        wave: 2,
        groups: [
          { creepType: "standard", count: 6, hpScale: 32, speedScale: 0.9 },
          { creepType: "fast", count: 5, hpScale: 24, speedScale: 1 }
        ],
        spawnInterval: 520,
        isBoss: false
      },
      {
        wave: 3,
        groups: [
          { creepType: "standard", count: 12, hpScale: 44, speedScale: 0.95 },
          { creepType: "armored", count: 1, hpScale: 90, speedScale: 0.8 }
        ],
        spawnInterval: 480,
        isBoss: false
      }
    ];
  }

  // ml/desktop/replay_sim_entry.ts
  init_TowerTypes();
  init_config();

  // src/ui/GameUIStore.ts
  function creepStatsEqual(a, b) {
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
  function circleRosterEqual(a, b) {
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
  function cooldownEq(a, b) {
    return Math.round(a * 10) === Math.round(b * 10);
  }
  function abilityInfoEqual(a, b) {
    if (a.ready !== b.ready || a.upgrades !== b.upgrades) return false;
    if (a.key !== b.key || a.name !== b.name) return false;
    return cooldownEq(a.cooldown, b.cooldown);
  }
  function heroShopEqual(a, b) {
    if (a.heroName !== b.heroName || a.level !== b.level || a.maxLevel !== b.maxLevel) return false;
    if (a.xp !== b.xp || a.xpNeeded !== b.xpNeeded) return false;
    if (a.hp !== b.hp || a.maxHp !== b.maxHp) return false;
    if (a.damage !== b.damage || a.attackSpeed !== b.attackSpeed) return false;
    if (a.pendingUpgrades !== b.pendingUpgrades || a.nextRotationWave !== b.nextRotationWave) return false;
    if (a.items.length !== b.items.length) return false;
    for (let i = 0; i < a.items.length; i++) {
      const x = a.items[i], y = b.items[i];
      if (x.tier !== y.tier || x.cost !== y.cost || x.owned !== y.owned) return false;
    }
    if (a.tomes.length !== b.tomes.length) return false;
    for (let i = 0; i < a.tomes.length; i++) {
      if (a.tomes[i].id !== b.tomes[i].id || a.tomes[i].cost !== b.tomes[i].cost) return false;
    }
    if (a.equippedAccessories.length !== b.equippedAccessories.length) return false;
    for (let i = 0; i < a.equippedAccessories.length; i++) {
      const x = a.equippedAccessories[i], y = b.equippedAccessories[i];
      if (x.id !== y.id || x.equipped !== y.equipped) return false;
      if (!cooldownEq(x.cooldown ?? 0, y.cooldown ?? 0)) return false;
    }
    if (a.accessoryOffers.length !== b.accessoryOffers.length) return false;
    for (let i = 0; i < a.accessoryOffers.length; i++) {
      const x = a.accessoryOffers[i], y = b.accessoryOffers[i];
      if (x.id !== y.id || x.cost !== y.cost || x.equipped !== y.equipped) return false;
    }
    if (a.upgradeOptions.length !== b.upgradeOptions.length) return false;
    for (let i = 0; i < a.upgradeOptions.length; i++) {
      const x = a.upgradeOptions[i], y = b.upgradeOptions[i];
      if (x.id !== y.id || x.label !== y.label || x.desc !== y.desc) return false;
    }
    if (a.abilities.length !== b.abilities.length) return false;
    for (let i = 0; i < a.abilities.length; i++) {
      if (!abilityInfoEqual(a.abilities[i], b.abilities[i])) return false;
    }
    if (a.ultimate === null !== (b.ultimate === null)) return false;
    if (a.ultimate && b.ultimate && !abilityInfoEqual(a.ultimate, b.ultimate)) return false;
    return true;
  }
  var GameUIStoreClass = class {
    constructor() {
      this.state = this.defaultState();
      this.listeners = /* @__PURE__ */ new Set();
      this.callbacks = {};
      /** Add an event log message */
      this._logId = 0;
    }
    /** Place-and-approve handlers used by PlacementGateOverlay. */
    onPlacementCommit() {
      this.callbacks.onPlacementCommit?.();
    }
    onPlacementCancel() {
      this.callbacks.onPlacementCancel?.();
    }
    onPlacementMove(col, row) {
      this.callbacks.onPlacementMove?.(col, row);
    }
    defaultState() {
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
        matchMode: "standard",
        speed: 1,
        paused: false,
        encyclopediaOpen: false,
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
        finaleHud: null,
        sabotageHud: null,
        placementGhost: null,
        advisorActive: false,
        advisorSave: false,
        advisorTower: null
      };
    }
    /** Place-and-approve: GameScene mirrors its pending-ghost state
     *  here. Null = no pending placement. Shallow-equal skip on the
     *  same cell+type avoids per-frame churn (the setter is called
     *  from the controller's lifecycle, not per-frame, but tests +
     *  drag pointermove can re-fire with the same value). */
    setPlacementGhost(ghost) {
      const prev = this.state.placementGhost;
      if (prev === ghost) return;
      if (prev && ghost && prev.col === ghost.col && prev.row === ghost.row && prev.towerTypeId === ghost.towerTypeId) {
        return;
      }
      this.state = { ...this.state, placementGhost: ghost };
      this.notify();
    }
    /** Mech M10: push Workshop / squad state. Skips notify when nothing
     *  meaningful changed (per-frame pump). */
    setSabotageHud(next) {
      const prev = this.state.sabotageHud;
      if (prev === next) return;
      if (prev && next && Math.abs(prev.workshopCooldownMs - next.workshopCooldownMs) < 50 && prev.trainCost === next.trainCost && prev.upgradeLevels.plate === next.upgradeLevels.plate && prev.upgradeLevels.edge === next.upgradeLevels.edge && prev.upgradeLevels.tread === next.upgradeLevels.tread && prev.raidersAlive === next.raidersAlive && prev.generatorsAlive === next.generatorsAlive && prev.generatorsTotal === next.generatorsTotal && prev.nextUpgradeCost.plate === next.nextUpgradeCost.plate && prev.nextUpgradeCost.edge === next.nextUpgradeCost.edge && prev.nextUpgradeCost.tread === next.nextUpgradeCost.tread && prev.workshopPanelOpen === next.workshopPanelOpen && prev.queueCount === next.queueCount && prev.queueMax === next.queueMax) {
        return;
      }
      this.state = { ...this.state, sabotageHud: next };
      this.notify();
    }
    /** M10 finale: push charge + hero state for the DOM HUD. Pass null
     *  to hide. Skips notify when nothing changed (per-frame pump). */
    setFinaleHud(next) {
      const prev = this.state.finaleHud;
      if (prev === next) return;
      if (prev && next && Math.abs(prev.charge - next.charge) < 1e-3 && prev.heroSummoned === next.heroSummoned && prev.cpuTowersRemaining === next.cpuTowersRemaining && prev.cpuTowersTotal === next.cpuTowersTotal && !prev.heroHp === !next.heroHp && (!prev.heroHp || !next.heroHp || prev.heroHp.hp === next.heroHp.hp && prev.heroHp.alive === next.heroHp.alive && Math.abs(prev.heroHp.respawnIn - next.heroHp.respawnIn) < 0.5)) {
        return;
      }
      this.state = { ...this.state, finaleHud: next };
      this.notify();
    }
    /** Replace the circle roster snapshot. Shallow-compares each row
     *  so a frame-for-frame identical snapshot doesn't cost a re-
     *  render. Pass `null` to hide the panel (non-Circle matches). */
    setCircleRoster(next) {
      const prev = this.state.circleRoster;
      if (prev === next) return;
      if (prev && next && circleRosterEqual(prev, next)) return;
      this.state = { ...this.state, circleRoster: next };
      this.notify();
    }
    /** Plan 12: push attacker-mode breakthrough progress for the HUD.
     *  Pass null on non-attacker matches so StatusBarDOM falls back to
     *  the regular Lives readout. Skips notify when nothing changed. */
    setAttackerProgress(next) {
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
    setMissionPanel(next) {
      const prev = this.state.missionPanel;
      if (prev === next) return;
      if (prev && next && prev.missionName === next.missionName && prev.objectives.length === next.objectives.length && prev.objectives.every((o, i) => o.met === next.objectives[i].met)) return;
      this.state = { ...this.state, missionPanel: next };
      this.notify();
    }
    /** Plan 12 v2: push the attacker-composer snapshot. Pass null to
     *  hide the overlay (e.g. while a wave is in flight). Skips notify
     *  when nothing changed so the per-frame push is cheap. */
    setAttackerComposer(next) {
      const prev = this.state.attackerComposer;
      if (prev === next) return;
      if (prev && next && prev.spent === next.spent && prev.budget === next.budget && prev.waveNum === next.waveNum && prev.canSend === next.canSend && prev.entries.length === next.entries.length && prev.entries.every((e, i) => e.count === next.entries[i].count && e.creepType === next.entries[i].creepType && e.prepMult === next.entries[i].prepMult) && (prev.prep?.id ?? null) === (next.prep?.id ?? null) && prev.camps.count === next.camps.count && prev.camps.max === next.camps.max && prev.carryover === next.carryover && prev.thisWaveIncome === next.thisWaveIncome && prev.abilities.length === next.abilities.length && prev.abilities.every((a, i) => a.cooldownRemaining === next.abilities[i].cooldownRemaining && a.queued === next.abilities[i].queued) && prev.wagon.count === next.wagon.count && prev.wagon.max === next.wagon.max) {
        return;
      }
      this.state = { ...this.state, attackerComposer: next };
      this.notify();
    }
    /** Surface the continue-ad offer. GameScene calls this on lives→0
     *  (outside tutorial / versus / already-used cases) and pauses its
     *  update loop until one of the callbacks fires. */
    offerContinue(offer) {
      this.state = { ...this.state, continueOffer: offer };
      this.notify();
    }
    /** Clear the offer — called by the modal's action handlers after
     *  they invoke onAccept / onDecline. */
    clearContinueOffer() {
      if (this.state.continueOffer === null) return;
      this.state = { ...this.state, continueOffer: null };
      this.notify();
    }
    // ─── Getters ────────────────────────────────────────
    getState() {
      return this.state;
    }
    // ─── Mutations (called by GameScene) ────────────────
    /** Activate the game sidebar (called when GameScene starts) */
    activate(matchMode, totalWaves) {
      this.state = { ...this.defaultState(), active: true, matchMode, totalWaves };
      this.notify();
    }
    /** Replace totalWaves after activate. Phaser scene reuse keeps the
     *  GameScene instance alive across matches, so `this.waves` from a
     *  prior run can be stale at activate-time — without a follow-up
     *  push the wave HUD shows the previous match's count (e.g. /20
     *  bleeding into a 5-wave Hero Duel mission). GameScene calls this
     *  immediately after `this.waves = getWavesForMode(...)`. */
    setTotalWaves(totalWaves) {
      if (this.state.totalWaves === totalWaves) return;
      this.state = { ...this.state, totalWaves };
      this.notify();
    }
    /** Deactivate (called when game ends) */
    deactivate() {
      this.state = this.defaultState();
      this.notify();
    }
    /** Select a tower — shows the tower info panel */
    selectTower(stats) {
      this.state = { ...this.state, selectedTower: stats };
      this.notify();
    }
    /** Deselect tower — hides the tower info panel */
    deselectTower() {
      this.state = { ...this.state, selectedTower: null };
      this.notify();
    }
    /** Start inspecting a creep — shows the creep info panel */
    selectCreep(stats) {
      this.state = { ...this.state, selectedCreep: stats };
      this.notify();
    }
    /** Push an updated snapshot for the inspected creep. No-op (and no
     *  re-render) when the new stats are observationally equal to the
     *  previous snapshot — prevents a 60Hz flood of setState calls while
     *  a creep walks uncontested. */
    updateSelectedCreep(stats) {
      const prev = this.state.selectedCreep;
      if (prev && prev._creep === stats._creep && creepStatsEqual(prev, stats)) return;
      this.state = { ...this.state, selectedCreep: stats };
      this.notify();
    }
    /** Hide the creep info panel */
    deselectCreep() {
      if (this.state.selectedCreep === null) return;
      this.state = { ...this.state, selectedCreep: null };
      this.notify();
    }
    /** Update economy display */
    updateEconomy(gold, lives, income) {
      if (this.state.gold === gold && this.state.lives === lives && (income === void 0 || this.state.income === income)) return;
      this.state = { ...this.state, gold, lives, income: income ?? this.state.income };
      this.notify();
    }
    /** Update wave info */
    updateWaves(currentWave, upcomingWaves) {
      this.state = { ...this.state, currentWave, upcomingWaves };
      this.notify();
    }
    /** Update auto-play state */
    setAutoPlay(active) {
      this.state = { ...this.state, autoPlay: active };
      this.notify();
    }
    /** Update game speed */
    setSpeed(speed) {
      this.state = { ...this.state, speed };
      this.notify();
    }
    /** Update paused state */
    setPaused(paused) {
      this.state = { ...this.state, paused };
      this.notify();
    }
    /** Open/close the in-game faction encyclopedia modal */
    setEncyclopediaOpen(open) {
      this.state = { ...this.state, encyclopediaOpen: open };
      this.notify();
    }
    /** Update wave/game state for status bar */
    updateGameState(waveActive, betweenWaves, speed, versusTimer = -1, speedBoostRemainingSec = 0) {
      if (this.state.waveActive === waveActive && this.state.betweenWaves === betweenWaves && this.state.speed === speed && this.state.versusTimer === versusTimer && this.state.speedBoostRemainingSec === speedBoostRemainingSec) return;
      this.state = { ...this.state, waveActive, betweenWaves, speed, versusTimer, speedBoostRemainingSec };
      this.notify();
    }
    /** Set tower bar towers */
    setTowerBar(towers) {
      this.state = { ...this.state, towerBar: { ...this.state.towerBar, towers } };
      this.notify();
    }
    /** Update selected tower in dock */
    selectDockTower(index) {
      if (this.state.towerBar.selectedIndex === index) return;
      this.state = { ...this.state, towerBar: { ...this.state.towerBar, selectedIndex: index } };
      this.notify();
    }
    /** Update essence state (Battle mode) */
    updateEssence(essence) {
      this.state = { ...this.state, essence };
      this.notify();
    }
    /** Update hero shop state (Hero Defense + M10 finale). Bailout when
     *  the new snapshot is visually equivalent to the previous — the
     *  controllers push every frame and ability cooldowns tick
     *  continuously, so the naive `{...state, heroShop}` would force a
     *  Preact re-render of EconomyPanelDOM + HeroItemsDOM 60+×/sec even
     *  when nothing visible changed. */
    updateHeroShop(heroShop) {
      const prev = this.state.heroShop;
      if (prev && heroShopEqual(prev, heroShop)) return;
      this.state = { ...this.state, heroShop };
      this.notify();
    }
    /** Update frontier state */
    updateFrontier(frontier) {
      this.state = { ...this.state, frontier };
      this.notify();
    }
    /** Update send panel options */
    updateSendOptions(options) {
      this.state = { ...this.state, sendOptions: options };
      this.notify();
    }
    addLogEntry(text, color = "#ccc") {
      const entry = { id: this._logId++, text, color, time: Date.now() };
      const log = [entry, ...this.state.eventLog].slice(0, 100);
      this.state = { ...this.state, eventLog: log };
      this.notify();
    }
    /** Toggle sidebar overlay (mobile) */
    toggleSidebar() {
      this.state = { ...this.state, sidebarOpen: !this.state.sidebarOpen };
      this.notify();
      this.callbacks.onToggleSidebar?.();
    }
    // ─── Callbacks (registered by GameScene) ────────────
    registerCallbacks(cbs) {
      this.callbacks = { ...this.callbacks, ...cbs };
    }
    /** Called by DOM panel when user clicks upgrade */
    requestUpgrade(tower, branchId = null) {
      this.callbacks.onUpgrade?.(tower, branchId);
    }
    /** Called by DOM panel when user clicks sell */
    requestSell(tower) {
      this.callbacks.onSell?.(tower);
    }
    requestStartWave() {
      this.callbacks.onStartWave?.();
    }
    requestToggleAutoPlay() {
      this.callbacks.onToggleAutoPlay?.();
    }
    requestSetSpeed(speed) {
      this.callbacks.onSetSpeed?.(speed);
    }
    requestCycleSpeed() {
      this.callbacks.onCycleSpeed?.();
    }
    requestSpeedBoost() {
      this.callbacks.onRequestSpeedBoost?.();
    }
    requestPause() {
      this.callbacks.onPause?.();
    }
    /** Placement Advisor toggle — DOM status-bar button / G key. */
    requestToggleAdvisor() {
      this.callbacks.onToggleAdvisor?.();
    }
    /** GameScene mirrors its internal advisor toggle here. */
    setAdvisorActive(active) {
      if (this.state.advisorActive === active) return;
      this.state = { ...this.state, advisorActive: active };
      this.notify();
    }
    /** GameScene mirrors the advisor's SAVE recommendation here.
     *  Idempotent — called every frame from GameScene.update. */
    setAdvisorSave(save) {
      if (this.state.advisorSave === save) return;
      this.state = { ...this.state, advisorSave: save };
      this.notify();
    }
    /** GameScene mirrors the tower the advisor scores for here.
     *  Idempotent on name+cost — called every frame. */
    setAdvisorTower(tower) {
      const prev = this.state.advisorTower;
      if (prev?.name === tower?.name && prev?.cost === tower?.cost) return;
      this.state = { ...this.state, advisorTower: tower };
      this.notify();
    }
    placeFrontierDoodad(color = 16755268, buildingId = "generic", factionFallback) {
      return this.callbacks.onFrontierDoodad?.(color, buildingId, factionFallback) ?? null;
    }
    requestSend(sendId) {
      this.callbacks.onSend?.(sendId);
    }
    requestFrontierPurchase(buildingId) {
      this.callbacks.onFrontierPurchase?.(buildingId);
    }
    requestFrontierAction(action, buildingIdx) {
      this.callbacks.onFrontierAction?.(action, buildingIdx);
    }
    requestFrontierBatchAction(action, defId) {
      this.callbacks.onFrontierBatchAction?.(action, defId);
    }
    requestBuyEssenceGenerator(genId) {
      this.callbacks.onBuyEssenceGenerator?.(genId);
    }
    requestEssenceSend(sendId) {
      this.callbacks.onEssenceSend?.(sendId);
    }
    requestBuyHeroItem(slotId) {
      this.callbacks.onBuyHeroItem?.(slotId);
    }
    requestBuyTome(tomeId) {
      this.callbacks.onBuyTome?.(tomeId);
    }
    requestBuyAccessory(index) {
      this.callbacks.onBuyAccessory?.(index);
    }
    requestHeroUpgrade(optionId) {
      this.callbacks.onHeroUpgrade?.(optionId);
    }
    requestUpgradeAbility(abilityIndex) {
      this.callbacks.onUpgradeAbility?.(abilityIndex);
    }
    requestSelectDockTower(index) {
      this.callbacks.onSelectDockTower?.(index);
    }
    /** Full deselect — clears the GameScene's inspected tower as well as
     *  the DOM's `selectedTower`, so the per-frame refresh in GameScene
     *  doesn't immediately re-push the snapshot back into the store. The
     *  raw `deselectTower()` only clears the DOM state; for user-driven
     *  dismissals (X button, panel collapse) always go through this. */
    requestDeselectTower() {
      if (this.callbacks.onDeselectTower) this.callbacks.onDeselectTower();
      else this.deselectTower();
    }
    /** Plan 12 v2: composer pick adjust (called by overlay +/- buttons). */
    requestAttackerAdjust(creepTypeId, delta) {
      this.callbacks.onAttackerAdjust?.(creepTypeId, delta);
    }
    /** Plan 12 v2: clear all picks. */
    requestAttackerClear() {
      this.callbacks.onAttackerClear?.();
    }
    /** Plan 12 v2: lock picks and start the wave. */
    requestAttackerSendWave() {
      this.callbacks.onAttackerSendWave?.();
    }
    /** Plan 12 v2 Phase 2: toggle an ability armed/disarmed for next Send. */
    requestAttackerAbilityToggle(abilityId) {
      this.callbacks.onAttackerAbilityToggle?.(abilityId);
    }
    /** Plan 12 v2 Phase 2: adjust the wagon count by ±1. */
    requestAttackerWagonAdjust(delta) {
      this.callbacks.onAttackerWagonAdjust?.(delta);
    }
    /** Economy v3: build a Reinforcement Camp (+1, irreversible). */
    requestAttackerCampsBuy() {
      this.callbacks.onAttackerCampsBuy?.();
    }
    // ─── Subscription ───────────────────────────────────
    subscribe(listener) {
      this.listeners.add(listener);
      return () => this.listeners.delete(listener);
    }
    notify() {
      for (const fn of this.listeners) fn();
    }
  };
  var GameUIStore = new GameUIStoreClass();

  // src/ui/EventLog.ts
  var MAX_LINES = 12;
  var EventLog = class {
    constructor(_scene, _topY) {
      this.lines = [];
    }
    log(message, color) {
      this.lines.push(message);
      if (this.lines.length > MAX_LINES) this.lines.shift();
      GameUIStore.addLogEntry(message, color ?? "#999");
    }
    waveStarted(waveNum, totalWaves, creepTypes) {
      const types = creepTypes.length > 0 ? `: ${creepTypes.join(", ")}` : "";
      this.log(`Wave ${waveNum}/${totalWaves} started${types}`);
    }
    waveCleared(waveNum, income) {
      this.log(`Wave ${waveNum} cleared! +${income}g income`);
    }
    frontierIncome(buildingName, amount) {
      this.log(`${buildingName}: +${amount}g`);
    }
    towerBuilt(name, cost) {
      this.log(`Built ${name} (-${cost}g)`);
    }
    towerSold(name, refund) {
      this.log(`Sold ${name} (+${refund}g)`);
    }
    sendQueued(name, cost) {
      this.log(`Send: ${name} (-${cost}g)`);
    }
    frontierPurchased(name, cost) {
      this.log(`Frontier: ${name} (-${cost}g)`);
    }
    frontierAction(action, result) {
      this.log(`${action}: ${result}`);
    }
    creepReached() {
      this.log("Creep reached exit! -1 life");
    }
    gameMessage(msg) {
      this.log(msg);
    }
    /** No-op — kept for call-site compat */
    getContainer() {
      return { setVisible() {
      } };
    }
  };

  // ml/desktop/replay_sim_entry.ts
  var import_TowerTraitHandlers = __toESM(require_TowerTraitHandlers());
  var import_CreepTraitHandlers = __toESM(require_CreepTraitHandlers());

  // src/headless/SimClock.ts
  var SimClock = class {
    constructor() {
      this.now = 0;
      this.queue = [];
    }
    delayedCall(ms, callback) {
      const entry = {
        fireAt: this.now + ms,
        interval: 0,
        remainingFires: 1,
        callback,
        destroyed: false
      };
      this.queue.push(entry);
      return { destroy: () => {
        entry.destroyed = true;
      } };
    }
    addEvent(opts) {
      const repeat = opts.repeat ?? 0;
      const entry = {
        fireAt: this.now + opts.delay,
        interval: opts.delay,
        remainingFires: repeat + 1,
        callback: opts.callback,
        destroyed: false
      };
      this.queue.push(entry);
      return { destroy: () => {
        entry.destroyed = true;
      } };
    }
    /** Advance sim time by `delta` ms. Fires every registered timer
     *  whose `fireAt` is now in the past. Callbacks may register more
     *  timers; those with a future `fireAt` won't fire this tick
     *  because the loop iterates the current queue length.
     *
     *  Firing order within a single tick is insertion order — good
     *  enough for the visual-effect timers that are the main users. */
    tick(delta) {
      this.now += delta;
      const n = this.queue.length;
      for (let i = 0; i < n; i++) {
        const e = this.queue[i];
        while (!e.destroyed && e.remainingFires > 0 && e.fireAt <= this.now) {
          e.callback();
          e.remainingFires--;
          if (e.remainingFires > 0 && e.interval > 0) {
            e.fireAt += e.interval;
          } else {
            e.destroyed = true;
          }
        }
      }
      this.queue = this.queue.filter((e) => !e.destroyed);
    }
  };

  // src/headless/HeadlessScene.ts
  function makeChainingStub(label = "stub") {
    const state2 = { __label: label };
    const base = function() {
      return proxy;
    };
    const proxy = new Proxy(base, {
      get(_target, prop) {
        if (prop === "visible") return state2.visible ?? true;
        if (prop === "alpha") return state2.alpha ?? 1;
        if (prop === "x") return state2.x ?? 0;
        if (prop === "y") return state2.y ?? 0;
        if (prop === "rotation") return state2.rotation ?? 0;
        if (prop === "scene") return state2.scene ?? void 0;
        if (prop === "active") return state2.active ?? true;
        if (prop === "destroyed") return state2.destroyed ?? false;
        if (prop === Symbol.toPrimitive) {
          return (_hint) => "";
        }
        if (prop === "toString") return () => "";
        if (prop === "valueOf") return () => 0;
        if (prop in state2) return state2[prop];
        return proxy;
      },
      set(_target, prop, value) {
        state2[prop] = value;
        return true;
      },
      apply() {
        return proxy;
      }
    });
    return proxy;
  }
  var HeadlessScene = class {
    constructor() {
      this.sim = new SimClock();
      /** Marker for entity code to detect headless mode and skip
       *  purely-visual work (Creep.draw, Tower.drawTower). Read once
       *  at entity construction time and cached on the instance — the
       *  hot path only pays a single boolean check per tick. */
      this.isHeadless = true;
      /** `scene.add.*` factory — returns chaining stubs. */
      this.add = {
        graphics: () => makeChainingStub("graphics"),
        sprite: () => makeChainingStub("sprite"),
        text: () => makeChainingStub("text"),
        image: () => makeChainingStub("image"),
        container: (_x, _y) => {
          const c = makeChainingStub("container");
          return c;
        },
        rectangle: () => makeChainingStub("rectangle"),
        circle: () => makeChainingStub("circle"),
        existing: (obj) => obj
      };
      /** Timer surface — backed by SimClock. */
      this.time = {
        get now() {
          return headlessTime.get(this)?.now ?? 0;
        },
        delayedCall: (ms, fn) => this.sim.delayedCall(ms, fn),
        addEvent: (opts) => this.sim.addEvent(opts)
      };
      /** Tweens — no-op factory. Real tweens are purely cosmetic. */
      this.tweens = {
        add: (_opts) => makeChainingStub("tween"),
        create: (_opts) => makeChainingStub("tween")
      };
      /** Animations registry — we never play sprite anims in headless. */
      this.anims = {
        exists: (_key) => false,
        create: (_opts) => null,
        play: (_key) => null
      };
      /** Texture cache — always empty; sprite-creation code paths that
       *  require a loaded texture should bail early (see `createTowerSprite`
       *  in `SpriteManager.ts` which returns null when `textures.exists`
       *  is false). */
      this.textures = {
        exists: (_key) => false,
        get: (_key) => null,
        setFilter: () => {
        }
      };
      /** Loader surface — headless never loads assets. Match setup calls
       *  `preloadSprites` which bails harmlessly on each missing texture. */
      this.load = {
        spritesheet: () => {
        },
        image: () => {
        },
        audio: () => {
        }
      };
      /** Camera controller's update path expects cameras.main — return
       *  a chaining stub so .setZoom / .setScroll / .fadeOut etc. no-op. */
      this.cameras = {
        main: makeChainingStub("camera")
      };
      /** Phaser registry — game code stashes the VersusManager /
       *  CircleManager here. We expose a real Map so get/set work. */
      this.registry = {
        _store: /* @__PURE__ */ new Map(),
        get(key) {
          return this._store.get(key);
        },
        set(key, value) {
          this._store.set(key, value);
        }
      };
      /** Scene-level event emitter (not to be confused with game-level
       *  EventBus). Gameplay code never hits this in the headless path;
       *  kept as a stub for defensive type compatibility. */
      this.events = {
        on: (_e, _fn) => {
        },
        off: (_e, _fn) => {
        },
        emit: (_e, ..._args) => {
        },
        once: (_e, _fn) => {
        }
      };
    }
    /** Advance sim time by `delta` ms — fires due timers then lets the
     *  caller run their own per-tick game logic. */
    tick(delta) {
      headlessTime.set(this.time, this.sim);
      this.sim.tick(delta);
    }
    /** Cast to `Phaser.Scene` for the many game-code call sites that
     *  type their scene parameter strictly. Structural typing means
     *  only the members we actually use are ever accessed — the rest
     *  of Phaser.Scene's surface is never read. */
    asScene() {
      return this;
    }
  };
  var headlessTime = /* @__PURE__ */ new WeakMap();

  // ml/desktop/replay_sim_entry.ts
  init_Rng();

  // src/systems/TerrainTheme.ts
  function autoTileIndex(col, row, terrainMap, myType) {
    const n = terrainMap.get(`${col},${row - 1}`) === myType ? 8 : 0;
    const e = terrainMap.get(`${col + 1},${row}`) === myType ? 4 : 0;
    const s = terrainMap.get(`${col},${row + 1}`) === myType ? 2 : 0;
    const w = terrainMap.get(`${col - 1},${row}`) === myType ? 1 : 0;
    return n | e | s | w;
  }

  // ml/desktop/replay_sim_entry.ts
  var LiveReplaySession = class {
    constructor(replay) {
      this.allPaths = [];
      this.currentPath = null;
      this.currentWave = 0;
      this.lives = STARTING_LIVES;
      this.simTime = 0;
      this.placementCursor = 0;
      this.outcome = "running";
      this.brainTicksSinceProgress = 0;
      this.recalcPaths = () => {
        this.allPaths.length = 0;
        for (const entry of this.grid.entries) {
          for (const exit of this.grid.exits) {
            this.allPaths.push(findPath(this.grid, entry, exit));
          }
        }
        this.currentPath = this.allPaths.find((p) => p !== null) ?? null;
        return this.allPaths;
      };
      this.replay = replay;
      seedRng(replay.seed);
      this.scene = new HeadlessScene();
      const sceneAs = this.scene.asScene();
      const mapDef = MAPS["plains"];
      this.grid = new Grid(mapDef);
      const eventBus = new EventBus();
      this.statsTracker = new StatsTracker();
      this.economy = new EconomyManager(eventBus);
      const incomeMgr = new IncomeManager(eventBus);
      const eventLog = new EventLog(sceneAs, 0);
      const diffKey = replay.difficulty in DIFFICULTIES ? replay.difficulty : "hard";
      const spawner = new SpawnManager(sceneAs, eventBus, DIFFICULTIES[diffKey], replay.seed);
      spawner.setSpawners(mapDef.spawners ?? null);
      const sendMgr = new SendManager(sceneAs, eventBus);
      if (this.grid.entries.length > 0 && this.grid.exits.length > 0) {
        spawner.setFlyingPath(this.grid.entries[0], this.grid.exits[0]);
        sendMgr.setFlyingPath(this.grid.entries[0], this.grid.exits[0]);
      }
      const leakHandler = new StandardLeakHandler(eventLog, this.statsTracker, () => this.towerMgr.towers);
      const deathHandler = new StandardDeathHandler(this.economy, this.statsTracker, eventBus, 1);
      this.creepMgr = new CreepManager(leakHandler, deathHandler);
      this.towerMgr = new TowerManager(sceneAs, this.grid, this.economy, this.statsTracker, eventLog, eventBus, null);
      const frontierMgr = new FrontierManager(eventBus, incomeMgr, replay.faction);
      const waves = getWavesForMode("standard", 20);
      this.towerMgr.getLives = () => this.lives;
      this.towerMgr.spendLives = (n) => {
        this.lives = Math.max(0, this.lives - n);
      };
      this.recalcPaths();
      this.waveMgr = new WaveController(waves, spawner, sendMgr, {
        onWaveStart: (_wave, waveNum) => {
          this.currentWave = waveNum;
          eventBus.emit("waveStarted", waveNum);
        },
        onWaveCleared: (waveNum) => {
          eventBus.emit("waveCleared", waveNum);
          this.statsTracker.recordWaveCompleted();
          const bonus = frontierMgr.onWaveEnd(waveNum);
          if (bonus > 0) this.economy.addGold(bonus);
          const income = incomeMgr.getWaveIncome();
          if (income > 0) this.economy.addGold(income);
        },
        canStartWave: () => this.currentPath !== null
      });
    }
    applyRecordedPlacement(p) {
      if (p.kind === "place") {
        const tt = getTowerType(p.towerId);
        if (!tt) return false;
        const res = this.towerMgr.placeTower(p.col, p.row, tt, this.allPaths, this.recalcPaths);
        if (!res) return false;
        if (res.pathsChanged) this.recalcPaths();
        return true;
      }
      if (p.kind === "upgrade") {
        const t = this.towerMgr.towers.find((tw) => tw.col === p.col && tw.row === p.row);
        if (!t || !t.canUpgrade()) return false;
        const cost = p.branch ? TOWER_TYPES[t.typeDef.upgrades[0]?.branches?.find((b) => b.id === p.branch)?.transformsTo ?? ""]?.cost ?? 9999 : t.getUpgradeCost();
        if (!this.economy.spend(cost)) return false;
        t.upgrade(p.branch ?? null);
        return true;
      }
      if (p.kind === "sell") {
        const res = this.towerMgr.sellTower(p.col, p.row);
        if (!res) return false;
        this.recalcPaths();
        return true;
      }
      return false;
    }
    /** Step one 32ms simulation tick — identical to HeadlessMatch main loop. */
    tick(stepMs = 32) {
      if (this.outcome !== "running") return;
      while (this.waveMgr.betweenWaves && this.placementCursor < this.replay.placements.length) {
        const nextP = this.replay.placements[this.placementCursor];
        if (nextP.wave > this.currentWave) break;
        this.placementCursor++;
        if (nextP.kind === "place" && !this.grid.canPlaceTower(nextP.col, nextP.row)) {
          continue;
        }
        const applied = this.applyRecordedPlacement(nextP);
        if (applied) {
          this.brainTicksSinceProgress = 0;
        }
      }
      if (!this.waveMgr.hasMoreWaves() && this.creepMgr.creeps.length === 0) {
        this.outcome = "win";
        return;
      }
      if (this.waveMgr.betweenWaves) {
        const started = this.waveMgr.startWave(this.allPaths);
        if (!started) {
          this.recalcPaths();
          if (!this.currentPath) {
            this.outcome = "loss";
            return;
          }
        }
      }
      this.scene.tick(stepMs);
      this.towerMgr.updateTowers(this.simTime, stepMs, this.creepMgr.creeps, this.creepMgr.justDiedCreeps, () => this.lives);
      this.towerMgr.cleanupExpired();
      const leak = this.creepMgr.update(stepMs);
      this.lives -= leak.totalLeakDamage;
      if (this.lives <= 0) {
        this.lives = 0;
        this.outcome = "loss";
        return;
      }
      this.waveMgr.updateSpawning(stepMs, this.allPaths, this.currentPath, this.creepMgr.creeps);
      this.waveMgr.checkWaveComplete(this.creepMgr.creeps.length, stepMs);
      this.simTime += stepMs;
      this.brainTicksSinceProgress++;
      if (this.brainTicksSinceProgress % 30 === 0 && this.placementCursor < this.replay.placements.length) {
        const nextP = this.replay.placements[this.placementCursor];
        if (nextP.wave === this.currentWave && (nextP.kind === "upgrade" || nextP.kind === "sell")) {
          if (this.applyRecordedPlacement(nextP)) {
            this.placementCursor++;
          }
        }
      }
    }
    /** Fast-forward until the simulation reaches targetWave or targetPlacementIndex. */
    skipToWave(targetWave) {
      let guard = 0;
      while (this.outcome === "running" && this.currentWave < targetWave && guard < 1e5) {
        this.tick(32);
        guard++;
      }
    }
    /** Convert internal pixel coordinates (which include gridOffsetX) to 0..36 tile coordinates. */
    getRenderState() {
      const offX = getGridOffsetX();
      const offY = getGridOffsetY();
      const towers = this.towerMgr.towers.map((t) => ({
        col: t.col,
        row: t.row,
        typeId: t.typeId,
        level: t.level,
        rangeTiles: t.range / TILE_SIZE2,
        lastFired: t.lastFired,
        fireRate: t.fireRate,
        damageDealt: t.damageDealt,
        projectiles: t.projectiles.map((p) => ({
          col: (p.x - offX) / TILE_SIZE2,
          row: (p.y - offY) / TILE_SIZE2,
          destCol: (p.destX - offX) / TILE_SIZE2,
          destRow: (p.destY - offY) / TILE_SIZE2,
          towerId: p.towerId || t.typeId,
          isPierce: !!p.isPierce
        }))
      }));
      const creeps = this.creepMgr.creeps.filter((c) => c.alive && !c.reached).map((c) => ({
        col: (c.x - offX) / TILE_SIZE2,
        row: (c.y - offY) / TILE_SIZE2,
        hp: c.hp,
        maxHp: c.maxHp,
        typeId: c.creepType.id,
        isBoss: c.isBoss,
        size: c.size,
        slowed: c.speed < c.baseSpeed * 0.95
      }));
      return {
        simTime: this.simTime,
        wave: this.currentWave,
        lives: this.lives,
        gold: this.economy.gold,
        killed: this.statsTracker.stats.creepsKilled,
        placementCursor: this.placementCursor,
        outcome: this.outcome,
        path: this.currentPath ?? [],
        towers,
        creeps
      };
    }
  };
  var CREEP_TYPE_TO_COL2 = {
    standard: 0,
    fast: 1,
    armored: 2,
    swarm: 3,
    healer: 4,
    boss: 5,
    group: 6,
    splitter: 7,
    shielded: 8,
    evasive: 9,
    regenerator: 10,
    flying: 11,
    mage_armor: 12,
    mage_speed: 13,
    mage_evasion: 14,
    mage_heal: 15,
    splitter_child: 3,
    arcane_sigil: 12,
    arcane_scribe: 15,
    arcane_archmage_meteor: 12,
    arcane_archmage_storm: 13,
    arcane_archmage_necro: 14,
    warlord_stalwart: 5,
    warlord_healer: 5,
    warlord_champion: 5,
    warlord_tactician: 5,
    warlord_captain: 5,
    void_counterfactual: 5,
    mech_scout: 1,
    mech_skiff: 3,
    mech_light_walker: 0,
    mech_armored_walker: 2,
    mech_flagship_walker: 5,
    mech_ace_pilot: 8
  };
  globalThis.ReplaySim = {
    LiveReplaySession,
    getTowerSpriteConfig,
    getProjectileSpriteConfig,
    CREEP_TYPE_TO_COL: CREEP_TYPE_TO_COL2,
    autoTileIndex
  };
})();
