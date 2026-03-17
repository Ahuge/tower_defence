import Phaser from 'phaser';
import { CANVAS_WIDTH, GAME_HEIGHT, TILE_SIZE } from '../config';
import { TowerSelectBar } from '../ui/TowerSelectBar';
import { TOWER_TYPES, TowerType } from '../data/TowerTypes';
import { CREEP_TYPES, CreepType } from '../data/CreepTypes';
import { FACTIONS, FACTION_ORDER, FactionId } from '../data/Factions';
import { FRONTIER_BUILDINGS, FrontierBuilding } from '../data/FrontierBuildings';

type Tab = 'towers' | 'creeps' | 'frontier';

export class EncyclopediaScene extends Phaser.Scene {
  private activeTab: Tab = 'towers';
  private scrollY: number = 0;
  private contentContainer!: Phaser.GameObjects.Container;
  private contentHeight: number = 0;
  private tabButtons: { text: Phaser.GameObjects.Text; tab: Tab }[] = [];

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

    // Back button
    const backBtn = this.add.text(50, 20, '[ Back ]', {
      fontSize: '14px', color: '#888888', fontFamily: 'monospace',
    }).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.scene.start('MenuScene'));

    // Tabs
    const tabs: { label: string; tab: Tab }[] = [
      { label: 'Towers', tab: 'towers' },
      { label: 'Creeps', tab: 'creeps' },
      { label: 'Frontier', tab: 'frontier' },
    ];

    const tabY = 48;
    const tabW = 120;
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

    // Content area with mask for scrolling
    const contentY = 70;
    const contentH = totalH - 80;
    const mask = this.add.graphics();
    mask.fillRect(0, contentY, CANVAS_WIDTH, contentH);
    const maskGeo = mask.createGeometryMask();

    this.contentContainer = this.add.container(0, contentY);
    this.contentContainer.setMask(maskGeo);

    this.rebuildContent();

    // Scroll
    this.input.on('wheel', (_p: any, _g: any, _dx: number, dy: number) => {
      const contentH2 = GAME_HEIGHT + 28 + TowerSelectBar.BAR_HEIGHT - 80;
      this.scrollY = Phaser.Math.Clamp(
        this.scrollY - dy * 0.5,
        -(this.contentHeight - contentH2 + 40),
        0,
      );
      this.contentContainer.setY(70 + this.scrollY);
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
    this.contentContainer.setY(70);

    switch (this.activeTab) {
      case 'towers': this.buildTowersTab(); break;
      case 'creeps': this.buildCreepsTab(); break;
      case 'frontier': this.buildFrontierTab(); break;
    }
  }

  private buildTowersTab(): void {
    let y = 0;
    const cx = CANVAS_WIDTH / 2;

    for (const fid of FACTION_ORDER) {
      if (fid === 'random') continue;
      const faction = FACTIONS[fid];

      // Faction header
      const header = this.add.text(cx, y, `${faction.name}`, {
        fontSize: '16px', color: '#ffaa44', fontFamily: 'monospace',
      }).setOrigin(0.5);
      this.contentContainer.add(header);
      y += 6;

      const desc = this.add.text(cx, y + 14, faction.description, {
        fontSize: '10px', color: '#888888', fontFamily: 'monospace',
      }).setOrigin(0.5);
      this.contentContainer.add(desc);
      y += 32;

      // Tower table header
      const colX = [30, 160, 220, 290, 360, 460];
      const headers = ['Tower', 'Cost', 'DMG', 'Range', 'Rate', 'Traits'];
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

        const ultTag = t.ultimate ? ' *' : '';
        const nameColor = t.ultimate ? '#ffdd44' : '#cccccc';

        const traitSummary = this.summarizeTraits(t);

        const vals = [
          t.name + ultTag,
          `${t.cost}g`,
          t.damage > 0 ? `${t.damage}` : '-',
          `${t.range}`,
          t.fireRate < 90000 ? `${t.fireRate}ms` : '-',
          traitSummary,
        ];

        for (let i = 0; i < vals.length; i++) {
          const txt = this.add.text(colX[i], y, vals[i], {
            fontSize: '10px', color: i === 0 ? nameColor : '#aaaaaa',
            fontFamily: 'monospace',
            wordWrap: i === 5 ? { width: CANVAS_WIDTH - colX[5] - 20 } : undefined,
          });
          this.contentContainer.add(txt);
        }
        y += 15;
      }
      y += 12;
    }

    this.contentHeight = y;
  }

  private buildCreepsTab(): void {
    let y = 0;
    const cx = CANVAS_WIDTH / 2;

    this.add.text(cx, y, 'Creep Types', {
      fontSize: '16px', color: '#ffaa44', fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.contentContainer.add(this.contentContainer.getAt(this.contentContainer.length - 1));
    y += 24;

    const colX = [30, 150, 220, 290, 360, 460];
    const headers = ['Name', 'HP Mult', 'Speed', 'Armor', 'Spawn', 'Abilities'];
    for (let i = 0; i < headers.length; i++) {
      const h = this.add.text(colX[i], y, headers[i], {
        fontSize: '10px', color: '#666666', fontFamily: 'monospace',
      });
      this.contentContainer.add(h);
    }
    y += 14;

    for (const [id, ct] of Object.entries(CREEP_TYPES)) {
      const traitDesc = ct.traits.map(t => {
        switch (t.id) {
          case 'shield': return 'Shield';
          case 'damage_cap_shield': return `DmgCap(${t.shieldHits} hits)`;
          case 'heal_aura': return 'Heal Aura';
          case 'flat_heal_aura': return 'Flat Heal';
          case 'armor_aura': return 'Armor Aura';
          case 'speed_aura': return 'Speed Aura';
          case 'evasion_aura': return 'Evasion Aura';
          case 'evasion': return `Evasion(${Math.round((t.chance ?? 0.25) * 100)}%)`;
          case 'split_on_death': return `Splits(${t.splitCount})`;
          default: return t.id;
        }
      }).join(', ') || '-';

      const spawnBehavior = ct.spawnBehavior === 'flying' ? 'Flying' :
        ct.spawnBehavior === 'group' ? 'Group(4)' :
        ct.count > 1 ? `x${ct.count}` : '1';

      const vals = [
        ct.name,
        `${ct.hpMultiplier}x`,
        `${ct.speedMultiplier}x`,
        ct.armor,
        spawnBehavior,
        traitDesc,
      ];

      for (let i = 0; i < vals.length; i++) {
        const txt = this.add.text(colX[i], y, vals[i], {
          fontSize: '10px', color: '#cccccc', fontFamily: 'monospace',
          wordWrap: i === 5 ? { width: CANVAS_WIDTH - colX[5] - 20 } : undefined,
        });
        this.contentContainer.add(txt);
      }
      y += 15;

      // Description
      const desc = this.add.text(50, y, ct.description, {
        fontSize: '9px', color: '#777777', fontFamily: 'monospace',
      });
      this.contentContainer.add(desc);
      y += 14;
    }

    this.contentHeight = y;
  }

  private buildFrontierTab(): void {
    let y = 0;
    const cx = CANVAS_WIDTH / 2;

    this.add.text(cx, y, 'Frontier Buildings', {
      fontSize: '16px', color: '#ffaa44', fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.contentContainer.add(this.contentContainer.getAt(this.contentContainer.length - 1));
    y += 24;

    for (const fid of FACTION_ORDER) {
      if (fid === 'random') continue;
      const faction = FACTIONS[fid];
      const buildings = FRONTIER_BUILDINGS[fid];
      if (!buildings || buildings.length === 0) continue;

      const header = this.add.text(30, y, faction.name, {
        fontSize: '13px', color: '#ffaa44', fontFamily: 'monospace',
      });
      this.contentContainer.add(header);
      y += 18;

      for (const b of buildings) {
        const mechColor: Record<string, string> = {
          steady: '#44ff44', overcharge: '#ffaa44', dig: '#cc8833',
          grow: '#33aa44', gamble: '#dd44ff',
        };

        const line = this.add.text(50, y, `${b.name} (${b.cost}g) — ${b.mechanic} — base: +${b.baseIncome}g/w`, {
          fontSize: '11px', color: mechColor[b.mechanic] ?? '#cccccc', fontFamily: 'monospace',
        });
        this.contentContainer.add(line);
        y += 14;

        const desc = this.add.text(70, y, b.description, {
          fontSize: '9px', color: '#777777', fontFamily: 'monospace',
          wordWrap: { width: CANVAS_WIDTH - 100 },
        });
        this.contentContainer.add(desc);
        y += desc.height + 8;
      }
      y += 8;
    }

    this.contentHeight = y;
  }

  private summarizeTraits(t: TowerType): string {
    const parts: string[] = [];
    for (const trait of t.traits) {
      switch (trait.id) {
        case 'direct_damage': break;
        case 'splash_damage': parts.push(`Splash(${((trait.radius ?? 0) / TILE_SIZE).toFixed(1)})`); break;
        case 'chain_damage': parts.push(`Chain(${(trait.chainCount ?? 2) + 1})`); break;
        case 'pierce_delivery': parts.push('Pierce'); break;
        case 'teleport_delivery': parts.push('Teleport'); break;
        case 'tower_aura_damage': parts.push('Tower AoE'); break;
        case 'true_damage': parts.push('True DMG'); break;
        case 'slow_on_hit': parts.push(`Slow(${Math.round((1 - (trait.factor ?? 1)) * 100)}%)`); break;
        case 'burn_dot': parts.push(`Burn(${trait.dps}dps)`); break;
        case 'poison_dot': parts.push(`Poison(${Math.round((trait.percentPerSec ?? 0.02) * 100)}%/s)`); break;
        case 'gold_on_hit': parts.push(`+${trait.amount}g/hit`); break;
        case 'crit_chance': parts.push(`Crit(${Math.round((trait.chance ?? 0.25) * 100)}%)`); break;
        case 'jackpot': parts.push(`Kill(${Math.round((trait.killChance ?? 0.08) * 100)}%)`); break;
        case 'damage_variance': parts.push('Variance'); break;
        case 'ramp_up': parts.push('Ramp-up'); break;
        case 'strip_shield': parts.push('Strip Shield'); break;
        case 'armor_shred_on_hit': parts.push('Armor Shred'); break;
        case 'damage_amp_on_hit': parts.push('Dmg Amp'); break;
        case 'root_on_hit': parts.push(`Root(${Math.round((trait.chance ?? 0.2) * 100)}%)`); break;
        case 'confuse_on_hit': parts.push('Confuse'); break;
        case 'hack_reverse': parts.push('Hack'); break;
        case 'virus_spread': parts.push('Virus'); break;
        case 'adjacency_buff': parts.push('Adj Buff'); break;
        case 'damage_aura': parts.push(`+${Math.round((trait.percent ?? 0.2) * 100)}% DMG Aura`); break;
        case 'rate_aura': parts.push(`+${Math.round((trait.percent ?? 0.15) * 100)}% SPD Aura`); break;
        case 'range_aura': parts.push(`+${trait.tiles ?? 1.5} RNG Aura`); break;
        case 'crit_aura': parts.push('Crit Aura'); break;
        case 'conduit_link': parts.push(`Conduit(${trait.maxLinks})`); break;
        case 'mobile_unit': parts.push('Mobile'); break;
        case 'slow_aura': parts.push('Slow Aura'); break;
        case 'growth_scaling': parts.push('Grows'); break;
        case 'firewall_link': parts.push('Firewall Link'); break;
        case 'mute_mage_aura': parts.push('Mute Mages'); break;
        case 'life_on_kill': parts.push(`Life(${Math.round((trait.chance ?? 0.05) * 100)}%)`); break;
        case 'leak_absorb': parts.push('Absorb Leak'); break;
        case 'bonus_vs_boss': parts.push('+50% vs Boss'); break;
        case 'bonus_vs_mage': parts.push('+50% vs Mage'); break;
        case 'faction_speed_aura': parts.push('Faction SPD'); break;
        case 'expires_after_waves': parts.push(`Expires(${trait.waves}w)`); break;
        case 'decay_per_wave': parts.push('Decays'); break;
        case 'gold_per_kill_range': parts.push(`+${trait.goldPerKill}g/kill`); break;
        case 'spawn_swarmlings_per_wave': parts.push(`Spawn(${trait.count})`); break;
        default: parts.push(trait.id); break;
      }
    }
    return parts.join(', ') || '-';
  }
}
