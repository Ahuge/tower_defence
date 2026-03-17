import Phaser from 'phaser';
import { CANVAS_WIDTH, GAME_HEIGHT, TILE_SIZE } from '../config';
import { TowerSelectBar } from '../ui/TowerSelectBar';
import { TOWER_TYPES, TowerType } from '../data/TowerTypes';
import { CREEP_TYPES } from '../data/CreepTypes';
import { FACTIONS, FACTION_ORDER, FactionId } from '../data/Factions';
import { FRONTIER_BUILDINGS } from '../data/FrontierBuildings';
import { FACTION_LORE, TOWER_LORE, CREEP_LORE } from '../data/Lore';

type Tab = 'factions' | 'towers' | 'creeps';

export class EncyclopediaScene extends Phaser.Scene {
  private activeTab: Tab = 'factions';
  private scrollY: number = 0;
  private contentContainer!: Phaser.GameObjects.Container;
  private contentHeight: number = 0;
  private tabButtons: { text: Phaser.GameObjects.Text; tab: Tab }[] = [];
  // Tower carousel state
  private allTowerIds: string[] = [];
  private towerIndex: number = 0;

  constructor() {
    super('EncyclopediaScene');
  }

  create(): void {
    const cx = CANVAS_WIDTH / 2;
    const totalH = GAME_HEIGHT + 28 + TowerSelectBar.BAR_HEIGHT;

    this.add.graphics().fillStyle(0x0a0a0f, 1).fillRect(0, 0, CANVAS_WIDTH, totalH);

    this.add.text(cx, 20, 'ENCYCLOPEDIA', {
      fontSize: '24px', color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5);

    const backBtn = this.add.text(50, 20, '[ Back ]', {
      fontSize: '14px', color: '#888888', fontFamily: 'monospace',
    }).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.scene.start('MenuScene'));

    const tabs: { label: string; tab: Tab }[] = [
      { label: 'Factions', tab: 'factions' },
      { label: 'Towers', tab: 'towers' },
      { label: 'Creeps', tab: 'creeps' },
    ];

    const tabY = 48;
    const tabW = 130;
    const tabStartX = cx - (tabs.length * tabW) / 2;
    for (let i = 0; i < tabs.length; i++) {
      const t = tabs[i];
      const tx = tabStartX + i * tabW + tabW / 2;
      const text = this.add.text(tx, tabY, `[ ${t.label} ]`, {
        fontSize: '14px', color: t.tab === this.activeTab ? '#ffaa44' : '#666666',
        fontFamily: 'monospace',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      text.on('pointerdown', () => {
        this.activeTab = t.tab;
        this.scrollY = 0;
        this.rebuildContent();
        this.updateTabColors();
      });
      this.tabButtons.push({ text, tab: t.tab });
    }

    // Build tower ID list for carousel
    this.allTowerIds = [];
    for (const fid of FACTION_ORDER) {
      if (fid === 'random') continue;
      for (const tid of FACTIONS[fid].towerIds) this.allTowerIds.push(tid);
    }

    const contentY = 68;
    const contentH = totalH - 78;
    const mask = this.add.graphics();
    mask.fillRect(0, contentY, CANVAS_WIDTH, contentH);
    const maskGeo = mask.createGeometryMask();

    this.contentContainer = this.add.container(0, contentY);
    this.contentContainer.setMask(maskGeo);

    this.rebuildContent();

    this.input.on('wheel', (_p: any, _g: any, _dx: number, dy: number) => {
      if (this.activeTab === 'towers') return; // towers use carousel
      this.scrollY = Phaser.Math.Clamp(
        this.scrollY - dy * 0.5,
        -(this.contentHeight - contentH + 40),
        0,
      );
      this.contentContainer.setY(68 + this.scrollY);
    });
  }

  private updateTabColors(): void {
    for (const tb of this.tabButtons) {
      tb.text.setColor(tb.tab === this.activeTab ? '#ffaa44' : '#666666');
    }
  }

  private rebuildContent(): void {
    this.contentContainer.removeAll(true);
    this.scrollY = 0;
    this.contentContainer.setY(68);

    switch (this.activeTab) {
      case 'factions': this.buildFactionsTab(); break;
      case 'towers': this.buildTowersCarousel(); break;
      case 'creeps': this.buildCreepsTab(); break;
    }
  }

  // ===================== FACTIONS TAB =====================
  private buildFactionsTab(): void {
    let y = 0;
    const cx = CANVAS_WIDTH / 2;

    for (const fid of FACTION_ORDER) {
      if (fid === 'random') continue;
      const faction = FACTIONS[fid];

      // Faction name
      const header = this.add.text(cx, y, faction.name, {
        fontSize: '18px', color: '#ffaa44', fontFamily: 'monospace',
      }).setOrigin(0.5);
      this.contentContainer.add(header);
      y += 22;

      // Lore paragraph
      const lore = FACTION_LORE[fid] ?? '';
      const loreText = this.add.text(60, y, lore, {
        fontSize: '10px', color: '#999999', fontFamily: 'monospace',
        wordWrap: { width: CANVAS_WIDTH - 120 },
        lineSpacing: 2,
      });
      this.contentContainer.add(loreText);
      y += loreText.height + 10;

      // Tower table
      const colX = [60, 180, 240, 310, 380, 480];
      const headers = ['Tower', 'Cost', 'DMG', 'Range', 'Upgrades', 'Key Traits'];
      for (let i = 0; i < headers.length; i++) {
        const h = this.add.text(colX[i], y, headers[i], {
          fontSize: '9px', color: '#666666', fontFamily: 'monospace',
        });
        this.contentContainer.add(h);
      }
      y += 13;

      for (const tid of faction.towerIds) {
        const t = TOWER_TYPES[tid];
        if (!t) continue;
        const traits = this.summarizeTraits(t);
        const upgCount = t.upgrades.length > 0 ? `${t.upgrades.length} lvl` : 'none';
        const vals = [
          t.name + (t.ultimate ? ' *' : ''),
          `${t.cost}g`,
          t.damage > 0 ? `${t.damage}` : '-',
          `${t.range}`,
          upgCount,
          traits,
        ];
        for (let i = 0; i < vals.length; i++) {
          const txt = this.add.text(colX[i], y, vals[i], {
            fontSize: '9px', color: t.ultimate ? '#ffdd44' : '#cccccc',
            fontFamily: 'monospace',
            wordWrap: i === 5 ? { width: CANVAS_WIDTH - colX[5] - 20 } : undefined,
          });
          this.contentContainer.add(txt);
        }
        y += 13;
      }

      // Frontier buildings
      const buildings = FRONTIER_BUILDINGS[fid];
      if (buildings && buildings.length > 0) {
        y += 4;
        const fLabel = this.add.text(60, y, 'Frontier:', {
          fontSize: '9px', color: '#888844', fontFamily: 'monospace',
        });
        this.contentContainer.add(fLabel);
        y += 12;
        for (const b of buildings) {
          const bText = this.add.text(80, y, `${b.name} (${b.cost}g) — ${b.mechanic} — ${b.description}`, {
            fontSize: '9px', color: '#777777', fontFamily: 'monospace',
            wordWrap: { width: CANVAS_WIDTH - 100 },
          });
          this.contentContainer.add(bText);
          y += bText.height + 4;
        }
      }

      y += 16;
    }
    this.contentHeight = y;
  }

  // ===================== TOWERS CAROUSEL =====================
  private buildTowersCarousel(): void {
    const cx = CANVAS_WIDTH / 2;
    const tid = this.allTowerIds[this.towerIndex];
    const t = TOWER_TYPES[tid];
    if (!t) return;

    const faction = FACTIONS[t.faction as FactionId];

    // Navigation
    const prevBtn = this.add.text(40, 10, '< Prev', {
      fontSize: '14px', color: '#888888', fontFamily: 'monospace',
    }).setInteractive({ useHandCursor: true });
    prevBtn.on('pointerdown', () => {
      this.towerIndex = (this.towerIndex - 1 + this.allTowerIds.length) % this.allTowerIds.length;
      this.rebuildContent();
    });
    this.contentContainer.add(prevBtn);

    const nextBtn = this.add.text(CANVAS_WIDTH - 40, 10, 'Next >', {
      fontSize: '14px', color: '#888888', fontFamily: 'monospace',
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    nextBtn.on('pointerdown', () => {
      this.towerIndex = (this.towerIndex + 1) % this.allTowerIds.length;
      this.rebuildContent();
    });
    this.contentContainer.add(nextBtn);

    const counter = this.add.text(cx, 12, `${this.towerIndex + 1} / ${this.allTowerIds.length}`, {
      fontSize: '10px', color: '#666666', fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.contentContainer.add(counter);

    // Tower title card
    let y = 35;
    const factionLabel = this.add.text(cx, y, faction?.name ?? '', {
      fontSize: '10px', color: '#888888', fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.contentContainer.add(factionLabel);
    y += 16;

    const nameText = this.add.text(cx, y, t.name + (t.ultimate ? ' [ULTIMATE]' : ''), {
      fontSize: '22px', color: t.ultimate ? '#ffdd44' : '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.contentContainer.add(nameText);
    y += 28;

    // Tower icon (colored square)
    const iconG = this.add.graphics();
    iconG.fillStyle(t.color, 1);
    iconG.fillRect(cx - 15, y, 30, 30);
    iconG.lineStyle(2, 0xffffff, 0.3);
    iconG.strokeRect(cx - 15, y, 30, 30);
    this.contentContainer.add(iconG);
    y += 40;

    // Flavor text
    const lore = TOWER_LORE[tid] ?? t.description;
    const loreText = this.add.text(cx, y, `"${lore}"`, {
      fontSize: '10px', color: '#999999', fontFamily: 'monospace',
      fontStyle: 'italic',
      wordWrap: { width: CANVAS_WIDTH - 160 },
      align: 'center',
    }).setOrigin(0.5, 0);
    this.contentContainer.add(loreText);
    y += loreText.height + 16;

    // Stats
    const statsLines = [
      `Cost: ${t.cost}g  |  Damage: ${t.damage}  |  Range: ${t.range}  |  Fire Rate: ${t.fireRate < 90000 ? t.fireRate + 'ms' : 'N/A'}`,
      `Damage Type: ${t.damageType}  |  Projectile Speed: ${t.projectileSpeed || 'N/A'}`,
      `Traits: ${this.summarizeTraits(t) || 'None'}`,
    ];
    for (const line of statsLines) {
      const st = this.add.text(cx, y, line, {
        fontSize: '11px', color: '#cccccc', fontFamily: 'monospace',
      }).setOrigin(0.5);
      this.contentContainer.add(st);
      y += 16;
    }
    y += 8;

    // Upgrades
    if (t.upgrades.length > 0) {
      const upgHeader = this.add.text(cx, y, `UPGRADES (${t.upgrades.length} levels)`, {
        fontSize: '13px', color: '#ffaa44', fontFamily: 'monospace',
      }).setOrigin(0.5);
      this.contentContainer.add(upgHeader);
      y += 18;

      let prevDmg = t.damage, prevRange = t.range, prevRate = t.fireRate;
      for (const upg of t.upgrades) {
        const diffs: string[] = [];
        if (upg.damage !== prevDmg) diffs.push(`DMG: ${prevDmg}→${upg.damage}`);
        if (upg.range !== prevRange) diffs.push(`RNG: ${prevRange}→${upg.range}`);
        if (upg.fireRate !== prevRate) diffs.push(`SPD: ${prevRate}→${upg.fireRate}ms`);
        const diffStr = diffs.length > 0 ? diffs.join(', ') : 'No stat change';

        const upgText = this.add.text(100, y, `Lv${upg.level} (${upg.cost}g): ${diffStr}`, {
          fontSize: '10px', color: '#aaaaaa', fontFamily: 'monospace',
        });
        this.contentContainer.add(upgText);
        y += 14;

        prevDmg = upg.damage; prevRange = upg.range; prevRate = upg.fireRate;
      }
    } else {
      const noUpg = this.add.text(cx, y, 'No upgrades available', {
        fontSize: '10px', color: '#666666', fontFamily: 'monospace',
      }).setOrigin(0.5);
      this.contentContainer.add(noUpg);
      y += 14;
    }

    // Keyboard navigation
    this.input.keyboard!.removeAllListeners('keydown-LEFT');
    this.input.keyboard!.removeAllListeners('keydown-RIGHT');
    this.input.keyboard!.on('keydown-LEFT', () => {
      this.towerIndex = (this.towerIndex - 1 + this.allTowerIds.length) % this.allTowerIds.length;
      this.rebuildContent();
    });
    this.input.keyboard!.on('keydown-RIGHT', () => {
      this.towerIndex = (this.towerIndex + 1) % this.allTowerIds.length;
      this.rebuildContent();
    });

    this.contentHeight = y;
  }

  // ===================== CREEPS TAB =====================
  private buildCreepsTab(): void {
    let y = 0;

    for (const [id, ct] of Object.entries(CREEP_TYPES)) {
      const cardH = 70;
      const cardY = y;

      // Background card
      const cardBg = this.add.graphics();
      cardBg.fillStyle(0x151520, 1);
      cardBg.fillRect(30, cardY, CANVAS_WIDTH - 60, cardH);
      cardBg.lineStyle(1, 0x333344, 0.6);
      cardBg.strokeRect(30, cardY, CANVAS_WIDTH - 60, cardH);
      this.contentContainer.add(cardBg);

      // Creep icon (colored circle)
      const iconX = 65;
      const iconY = cardY + cardH / 2;
      const iconSize = ct.id === 'boss' ? 18 : (ct.size ?? 1) * 12;
      const iconG = this.add.graphics();
      iconG.fillStyle(ct.color, 1);
      iconG.fillCircle(iconX, iconY, iconSize);
      this.contentContainer.add(iconG);

      // Stats table (center)
      const statsX = 100;
      const nameText = this.add.text(statsX, cardY + 5, ct.name, {
        fontSize: '13px', color: '#ffffff', fontFamily: 'monospace',
      });
      this.contentContainer.add(nameText);

      const traits = ct.traits.map(t => {
        switch (t.id) {
          case 'shield': return 'Shield';
          case 'damage_cap_shield': return `DmgCap(${t.shieldHits})`;
          case 'heal_aura': return 'Heal Aura';
          case 'flat_heal_aura': return 'Flat Heal';
          case 'armor_aura': return '+Armor Aura';
          case 'speed_aura': return '+Speed Aura';
          case 'evasion_aura': return 'Evasion Aura';
          case 'evasion': return `Evasion(${Math.round((t.chance ?? 0.25) * 100)}%)`;
          case 'split_on_death': return `Splits(${t.splitCount})`;
          default: return t.id;
        }
      }).join(', ') || 'None';

      const spawn = ct.spawnBehavior === 'flying' ? 'Flying' :
        ct.spawnBehavior === 'group' ? 'Group(4)' :
        ct.count > 1 ? `x${ct.count}` : 'Normal';

      const statsStr = `HP: ${ct.hpMultiplier}x  SPD: ${ct.speedMultiplier}x  Armor: ${ct.armor}  Spawn: ${spawn}`;
      const statsText = this.add.text(statsX, cardY + 22, statsStr, {
        fontSize: '9px', color: '#aaaaaa', fontFamily: 'monospace',
      });
      this.contentContainer.add(statsText);

      const traitsText = this.add.text(statsX, cardY + 36, `Traits: ${traits}`, {
        fontSize: '9px', color: '#888888', fontFamily: 'monospace',
      });
      this.contentContainer.add(traitsText);

      // Flavor text (right side)
      const lore = CREEP_LORE[id] ?? ct.description;
      const flavorX = 580;
      const flavor = this.add.text(flavorX, cardY + 8, lore, {
        fontSize: '9px', color: '#777777', fontFamily: 'monospace',
        fontStyle: 'italic',
        wordWrap: { width: CANVAS_WIDTH - flavorX - 50 },
        lineSpacing: 2,
      });
      this.contentContainer.add(flavor);

      y += cardH + 6;
    }

    this.contentHeight = y;
  }

  // ===================== HELPERS =====================
  private summarizeTraits(t: TowerType): string {
    const parts: string[] = [];
    for (const trait of t.traits) {
      switch (trait.id) {
        case 'direct_damage': break;
        case 'splash_damage': parts.push(`Splash`); break;
        case 'chain_damage': parts.push(`Chain(${(trait.chainCount ?? 2) + 1})`); break;
        case 'pierce_delivery': parts.push('Pierce'); break;
        case 'teleport_delivery': parts.push('Teleport'); break;
        case 'tower_aura_damage': parts.push('Tower AoE'); break;
        case 'true_damage': parts.push('True DMG'); break;
        case 'slow_on_hit': parts.push('Slow'); break;
        case 'burn_dot': parts.push('Burn'); break;
        case 'poison_dot': parts.push('Poison'); break;
        case 'gold_on_hit': parts.push(`+${trait.amount}g/hit`); break;
        case 'crit_chance': parts.push(`Crit(${Math.round((trait.chance ?? 0.25) * 100)}%)`); break;
        case 'jackpot': parts.push(`Kill/Miss`); break;
        case 'damage_variance': parts.push('Variance'); break;
        case 'ramp_up': parts.push('Ramp-up'); break;
        case 'strip_shield': parts.push('Strip Shield'); break;
        case 'armor_shred_on_hit': parts.push('Shred'); break;
        case 'damage_amp_on_hit': parts.push('Vuln'); break;
        case 'root_on_hit': parts.push('Root'); break;
        case 'confuse_on_hit': parts.push('Confuse'); break;
        case 'hack_reverse': parts.push('Hack'); break;
        case 'virus_spread': parts.push('Virus'); break;
        case 'mobile_unit': parts.push('Mobile'); break;
        case 'damage_aura': parts.push('+DMG Aura'); break;
        case 'rate_aura': parts.push('+SPD Aura'); break;
        case 'range_aura': parts.push('+RNG Aura'); break;
        case 'crit_aura': parts.push('Crit Aura'); break;
        case 'conduit_link': parts.push('Conduit'); break;
        case 'adjacency_buff': parts.push('Adj Buff'); break;
        case 'slow_aura': parts.push('Slow Aura'); break;
        case 'growth_scaling': parts.push('Grows'); break;
        case 'firewall_link': parts.push('Firewall'); break;
        case 'mute_mage_aura': parts.push('Mute'); break;
        case 'life_on_kill': parts.push('+Life'); break;
        case 'leak_absorb': parts.push('Absorb'); break;
        case 'bonus_vs_boss': parts.push('+vsBoss'); break;
        case 'bonus_vs_mage': parts.push('+vsMage'); break;
        case 'faction_speed_aura': parts.push('Faction SPD'); break;
        case 'expires_after_waves': parts.push(`Expires(${trait.waves}w)`); break;
        case 'decay_per_wave': parts.push('Decays'); break;
        case 'gold_per_kill_range': parts.push(`+${trait.goldPerKill}g/kill`); break;
        case 'spawn_swarmlings_per_wave': parts.push(`Spawn(${trait.count})`); break;
        case 'barbed_wire': parts.push('Slow Adj'); break;
        default: break;
      }
    }
    return parts.join(', ') || '-';
  }
}
