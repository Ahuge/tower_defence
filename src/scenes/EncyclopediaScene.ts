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
  // Carousel state
  private allTowerIds: string[] = [];
  private towerIndex: number = 0;
  private factionIndex: number = 0;
  private playableFactions: FactionId[] = [];

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

    // Build lists for carousels
    this.playableFactions = FACTION_ORDER.filter(f => f !== 'random');
    this.allTowerIds = [];
    for (const fid of this.playableFactions) {
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
      if (this.activeTab === 'towers' || this.activeTab === 'factions') return; // carousels
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

  // ===================== FACTIONS TAB (CAROUSEL) =====================
  private buildFactionsTab(): void {
    const cx = CANVAS_WIDTH / 2;
    const fid = this.playableFactions[this.factionIndex];
    const faction = FACTIONS[fid];
    if (!faction) return;

    // Navigation
    const prevBtn = this.add.text(40, 10, '< Prev', {
      fontSize: '14px', color: '#888888', fontFamily: 'monospace',
    }).setInteractive({ useHandCursor: true });
    prevBtn.on('pointerdown', () => {
      this.factionIndex = (this.factionIndex - 1 + this.playableFactions.length) % this.playableFactions.length;
      this.rebuildContent();
    });
    this.contentContainer.add(prevBtn);

    const nextBtn = this.add.text(CANVAS_WIDTH - 40, 10, 'Next >', {
      fontSize: '14px', color: '#888888', fontFamily: 'monospace',
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    nextBtn.on('pointerdown', () => {
      this.factionIndex = (this.factionIndex + 1) % this.playableFactions.length;
      this.rebuildContent();
    });
    this.contentContainer.add(nextBtn);

    const counter = this.add.text(cx, 12, `${this.factionIndex + 1} / ${this.playableFactions.length}`, {
      fontSize: '10px', color: '#666666', fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.contentContainer.add(counter);

    let y = 35;

    // Faction name + tower count
    const header = this.add.text(cx, y, faction.name, {
      fontSize: '22px', color: '#ffaa44', fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.contentContainer.add(header);
    y += 24;

    const tCount = this.add.text(cx, y, `${faction.towerIds.length} towers`, {
      fontSize: '10px', color: '#888888', fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.contentContainer.add(tCount);
    y += 18;

    // Content margins — narrower centered card
    const marginL = 280;
    const marginR = 280;
    const contentW = CANVAS_WIDTH - marginL - marginR;

    // Lore paragraph
    const lore = FACTION_LORE[fid] ?? faction.description;
    const loreText = this.add.text(marginL, y, lore, {
      fontSize: '10px', color: '#999999', fontFamily: 'monospace',
      wordWrap: { width: contentW },
      lineSpacing: 3,
    });
    this.contentContainer.add(loreText);
    y += loreText.height + 16;

    // Tower table
    const colX = [marginL, marginL + 120, marginL + 170, marginL + 220, marginL + 280, marginL + 350];
    const headers = ['Tower', 'Cost', 'DMG', 'Range', 'Upgrades', 'Key Traits'];
    for (let i = 0; i < headers.length; i++) {
      const h = this.add.text(colX[i], y, headers[i], {
        fontSize: '10px', color: '#666666', fontFamily: 'monospace',
      });
      this.contentContainer.add(h);
    }
    y += 14;

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
          fontSize: '10px', color: t.ultimate ? '#ffdd44' : '#cccccc',
          fontFamily: 'monospace',
          wordWrap: i === 5 ? { width: CANVAS_WIDTH - marginR - colX[5] } : undefined,
        });
        this.contentContainer.add(txt);
      }

      // Tower flavor text on next line
      const tLore = TOWER_LORE[tid];
      if (tLore) {
        y += 14;
        const fl = this.add.text(colX[0] + 10, y, tLore, {
          fontSize: '10px', color: '#666666', fontFamily: 'monospace',
          fontStyle: 'italic',
          wordWrap: { width: contentW - 20 },
        });
        this.contentContainer.add(fl);
        y += fl.height + 4;
      } else {
        y += 15;
      }
    }

    // Frontier buildings
    const buildings = FRONTIER_BUILDINGS[fid];
    if (buildings && buildings.length > 0) {
      y += 8;
      const fLabel = this.add.text(marginL, y, 'FRONTIER BUILDINGS', {
        fontSize: '11px', color: '#888844', fontFamily: 'monospace',
      });
      this.contentContainer.add(fLabel);
      y += 16;
      for (const b of buildings) {
        const bText = this.add.text(marginL + 20, y, `${b.name} (${b.cost}g) — ${b.mechanic}`, {
          fontSize: '10px', color: '#aaaaaa', fontFamily: 'monospace',
        });
        this.contentContainer.add(bText);
        y += 14;
        const bDesc = this.add.text(marginL + 40, y, b.description, {
          fontSize: '9px', color: '#777777', fontFamily: 'monospace',
          wordWrap: { width: contentW - 60 },
        });
        this.contentContainer.add(bDesc);
        y += bDesc.height + 6;
      }
    }

    this.contentHeight = y;

    // Keyboard nav
    this.input.keyboard!.removeAllListeners('keydown-LEFT');
    this.input.keyboard!.removeAllListeners('keydown-RIGHT');
    this.input.keyboard!.on('keydown-LEFT', () => {
      this.factionIndex = (this.factionIndex - 1 + this.playableFactions.length) % this.playableFactions.length;
      this.rebuildContent();
    });
    this.input.keyboard!.on('keydown-RIGHT', () => {
      this.factionIndex = (this.factionIndex + 1) % this.playableFactions.length;
      this.rebuildContent();
    });
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
      wordWrap: { width: CANVAS_WIDTH - 560 },
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

        const upgText = this.add.text(cx, y, `Lv${upg.level} (${upg.cost}g): ${diffStr}`, {
          fontSize: '10px', color: '#aaaaaa', fontFamily: 'monospace',
        }).setOrigin(0.5, 0);
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
    const marginL = 280;
    const marginR = 280;
    const cardW = CANVAS_WIDTH - marginL - marginR;

    for (const [id, ct] of Object.entries(CREEP_TYPES)) {
      const cardH = 80;
      const cardY = y;

      // Background card
      const cardBg = this.add.graphics();
      cardBg.fillStyle(0x151520, 1);
      cardBg.fillRect(marginL - 40, cardY, cardW + 80, cardH);
      cardBg.lineStyle(1, 0x333344, 0.6);
      cardBg.strokeRect(marginL - 40, cardY, cardW + 80, cardH);
      this.contentContainer.add(cardBg);

      // Creep icon (colored circle)
      const iconX = marginL - 10;
      const iconY = cardY + cardH / 2;
      const iconSize = ct.id === 'boss' ? 18 : (ct.size ?? 1) * 14;
      const iconG = this.add.graphics();
      iconG.fillStyle(ct.color, 1);
      iconG.fillCircle(iconX, iconY, iconSize);
      this.contentContainer.add(iconG);

      // Stats (left of center)
      const statsX = marginL + 20;
      const nameText = this.add.text(statsX, cardY + 6, ct.name, {
        fontSize: '14px', color: '#ffffff', fontFamily: 'monospace',
      });
      this.contentContainer.add(nameText);

      const traits = ct.traits.map(t => {
        switch (t.id) {
          case 'shield': return `Shield(${Math.round((t.hpPercent ?? 0.3) * 100)}% HP)`;
          case 'damage_cap_shield': return `DmgCap(${t.shieldHits} hits)`;
          case 'heal_aura': return `Heal(${Math.round((t.healPercent ?? 0.03) * 100)}%/s)`;
          case 'flat_heal_aura': return `Heal(${t.healAmount ?? 15}hp)`;
          case 'armor_aura': return '+1 Armor Aura';
          case 'speed_aura': return `+${Math.round((t.speedBonus ?? 0.3) * 100)}% Speed Aura`;
          case 'evasion_aura': return `${Math.round((t.evasionBonus ?? 0.15) * 100)}% Evasion Aura`;
          case 'evasion': return `${Math.round((t.chance ?? 0.25) * 100)}% Evasion`;
          case 'split_on_death': return `Splits into ${t.splitCount}`;
          default: return t.id;
        }
      }).join(', ') || 'None';

      const spawn = ct.spawnBehavior === 'flying' ? 'Flying (ignores maze)' :
        ct.spawnBehavior === 'group' ? 'Group burst (x4)' :
        ct.count > 1 ? `Swarm (x${ct.count})` : 'Normal';

      const statsStr = `HP: ${ct.hpMultiplier}x  |  SPD: ${ct.speedMultiplier}x  |  Armor: ${ct.armor}  |  ${spawn}`;
      const statsText = this.add.text(statsX, cardY + 24, statsStr, {
        fontSize: '11px', color: '#aaaaaa', fontFamily: 'monospace',
      });
      this.contentContainer.add(statsText);

      const traitsText = this.add.text(statsX, cardY + 40, `Traits: ${traits}`, {
        fontSize: '10px', color: '#888888', fontFamily: 'monospace',
        wordWrap: { width: cardW * 0.45 },
      });
      this.contentContainer.add(traitsText);

      // Flavor text (right side of card)
      const lore = CREEP_LORE[id] ?? ct.description;
      const flavorX = marginL + cardW * 0.5;
      const flavor = this.add.text(flavorX, cardY + 8, lore, {
        fontSize: '10px', color: '#777777', fontFamily: 'monospace',
        fontStyle: 'italic',
        wordWrap: { width: cardW * 0.45 },
        lineSpacing: 3,
      });
      this.contentContainer.add(flavor);

      y += cardH + 8;
    }

    this.contentHeight = y;
  }

  // ===================== HELPERS =====================
  private summarizeTraits(t: TowerType): string {
    const parts: string[] = [];
    for (const trait of t.traits) {
      switch (trait.id) {
        case 'direct_damage': break;
        case 'splash_damage': parts.push(`Splash(${((trait.radius ?? 48) / TILE_SIZE).toFixed(1)} tiles)`); break;
        case 'chain_damage': parts.push(`Chain(${(trait.chainCount ?? 2) + 1} targets)`); break;
        case 'pierce_delivery': parts.push('Pierce(line)'); break;
        case 'teleport_delivery': parts.push(`Teleport(${trait.stepsBase ?? 3}+ steps)`); break;
        case 'tower_aura_damage': parts.push(`Tower AoE(${((trait.radius ?? 96) / TILE_SIZE).toFixed(1)} tiles)`); break;
        case 'true_damage': parts.push('True DMG(ignores armor)'); break;
        case 'slow_on_hit': parts.push(`Slow(${Math.round((1 - (trait.factor ?? 0.5)) * 100)}% for ${((trait.duration ?? 2000) / 1000).toFixed(1)}s)`); break;
        case 'burn_dot': parts.push(`Burn(${trait.dps ?? 8}dps/${((trait.duration ?? 3000) / 1000).toFixed(0)}s)`); break;
        case 'poison_dot': parts.push(`Poison(${Math.round((trait.percentPerSec ?? 0.02) * 100)}%hp/s)`); break;
        case 'gold_on_hit': parts.push(`+${trait.amount ?? 1}g/hit`); break;
        case 'crit_chance': parts.push(`Crit(${Math.round((trait.chance ?? 0.25) * 100)}% for ${trait.multiplier ?? 3}x)`); break;
        case 'jackpot': parts.push(`${Math.round((trait.killChance ?? 0.08) * 100)}% kill / ${Math.round((trait.missChance ?? 0.25) * 100)}% miss`); break;
        case 'damage_variance': parts.push(`${Math.round((trait.min ?? 0.5) * 100)}-${Math.round((trait.max ?? 1.5) * 100)}% dmg`); break;
        case 'ramp_up': parts.push(`Ramp(+${Math.round((trait.reductionPerStack ?? 0.08) * 100)}%spd/stack, max ${trait.maxStacks ?? 5})`); break;
        case 'strip_shield': parts.push('Strip all shields'); break;
        case 'armor_shred_on_hit': parts.push(`Shred(${trait.shredAmount ?? 1} tier/${((trait.duration ?? 4000) / 1000).toFixed(0)}s)`); break;
        case 'damage_amp_on_hit': parts.push(`Vuln(+${Math.round((trait.ampAmount ?? 0.15) * 100)}% taken/${((trait.duration ?? 3000) / 1000).toFixed(0)}s)`); break;
        case 'root_on_hit': parts.push(`Root(${Math.round((trait.chance ?? 0.2) * 100)}% for ${((trait.duration ?? 800) / 1000).toFixed(1)}s)`); break;
        case 'confuse_on_hit': parts.push(`Confuse(${((trait.duration ?? 1200) / 1000).toFixed(1)}s backward)`); break;
        case 'hack_reverse': parts.push(`Hack(${((trait.duration ?? 1500) / 1000).toFixed(1)}s backward)`); break;
        case 'virus_spread': parts.push(`Virus(${trait.dps ?? 10}dps, spreads)`); break;
        case 'mobile_unit': {
          const range = ((trait.engageRange ?? 0.8)).toFixed(1);
          parts.push(`Mobile(spd:${trait.moveSpeed ?? 100}, rng:${range}${trait.selfDestruct ? ', kamikaze' : ''})`);
          break;
        }
        case 'damage_aura': parts.push(`+${Math.round((trait.percent ?? 0.2) * 100)}% DMG aura`); break;
        case 'rate_aura': parts.push(`+${Math.round((trait.percent ?? 0.15) * 100)}% SPD aura`); break;
        case 'range_aura': parts.push(`+${trait.tiles ?? 1.5} tile RNG aura`); break;
        case 'crit_aura': parts.push(`${Math.round((trait.chance ?? 0.15) * 100)}% crit(${trait.multiplier ?? 2}x) aura`); break;
        case 'conduit_link': parts.push(`Conduit(link ${trait.maxLinks ?? 2} auras)`); break;
        case 'adjacency_buff': parts.push(`Adj(+${Math.round((trait.damagePercent ?? 0.15) * 100)}%dmg, +${Math.round((trait.ratePercent ?? 0.08) * 100)}%spd)`); break;
        case 'slow_aura': parts.push(`Slow aura(${Math.round((1 - (trait.factor ?? 0.7)) * 100)}%)`); break;
        case 'growth_scaling': parts.push(`Grows(+${Math.round((trait.growthPercent ?? 0.08) * 100)}%/cycle)`); break;
        case 'firewall_link': parts.push(`Firewall(${trait.dps ?? 20}dps beam)`); break;
        case 'mute_mage_aura': parts.push('Mute mage abilities'); break;
        case 'life_on_kill': parts.push(`+1 life(${Math.round((trait.chance ?? 0.05) * 100)}% on kill)`); break;
        case 'leak_absorb': parts.push(`Absorb ${trait.maxCharges ?? 1} leak(s)`); break;
        case 'bonus_vs_boss': parts.push(`+${Math.round((trait.bonus ?? 0.5) * 100)}% vs boss/shield`); break;
        case 'bonus_vs_mage': parts.push(`+${Math.round((trait.bonus ?? 0.5) * 100)}% vs mages`); break;
        case 'faction_speed_aura': parts.push(`Faction +${Math.round((trait.ratePercent ?? 0.2) * 100)}% SPD`); break;
        case 'expires_after_waves': parts.push(`Expires(${trait.waves ?? 4} waves)`); break;
        case 'decay_per_wave': parts.push(`Decays(${Math.round((trait.decayPercent ?? 0.15) * 100)}%/wave)`); break;
        case 'gold_per_kill_range': parts.push(`+${trait.goldPerKill ?? 2}g per nearby kill`); break;
        case 'spawn_swarmlings_per_wave': parts.push(`Spawns ${trait.count ?? 2} units/wave`); break;
        case 'barbed_wire': parts.push(`Slow adj(${Math.round((1 - (trait.factor ?? 0.6)) * 100)}%)`); break;
        default: break;
      }
    }
    return parts.join(', ') || '-';
  }
}
