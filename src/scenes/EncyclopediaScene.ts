import Phaser from 'phaser';
import { getCanvasWidth, TILE_SIZE } from '../config';
import { TOWER_TYPES, TowerType } from '../data/TowerTypes';
import { CREEP_TYPES } from '../data/CreepTypes';
import { FACTIONS, FACTION_ORDER, FactionId } from '../data/Factions';
import { FRONTIER_BUILDINGS } from '../data/FrontierBuildings';
import { FACTION_LORE, TOWER_LORE, CREEP_LORE } from '../data/Lore';
import { HERO_ORDER, HERO_TYPES, HeroId } from '../data/HeroTypes';
import { UIScale } from '../systems/UIScale';
import { ResponsiveManager } from '../systems/ResponsiveManager';
import { hasTowerSprite, getTowerSpriteConfig, getHeroSheetKey, preloadSprites } from '../systems/SpriteManager';

type Tab = 'factions' | 'towers' | 'creeps' | 'heroes';

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
  private heroIndex: number = 0;
  private playableFactions: FactionId[] = [];
  // Touch drag scrolling
  private isDragging: boolean = false;
  private dragStartY: number = 0;
  private dragStartScrollY: number = 0;

  constructor() {
    super('EncyclopediaScene');
  }

  preload(): void {
    preloadSprites(this);
  }

  create(): void {
    const cx = getCanvasWidth() / 2;
    const totalH = ResponsiveManager.canvasHeight();
    const phone = UIScale.isPhone;

    this.add.graphics().fillStyle(0x0a0a0f, 1).fillRect(0, 0, getCanvasWidth(), totalH);

    this.add.text(cx, UIScale.y(20), 'ENCYCLOPEDIA', {
      fontSize: UIScale.font(24), color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5);

    const backBtn = this.add.text(UIScale.isPhone ? 20 : 50, UIScale.y(20), '[ Back ]', {
      fontSize: UIScale.font(14), color: '#888888', fontFamily: 'monospace',
    }).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.scene.start('MenuScene'));

    const tabs: { label: string; tab: Tab }[] = [
      { label: 'Factions', tab: 'factions' },
      { label: 'Towers', tab: 'towers' },
      { label: 'Creeps', tab: 'creeps' },
      { label: 'Heroes', tab: 'heroes' },
    ];

    const tabY = UIScale.isPhone ? 110 : 48;
    const tabW = UIScale.isPhone ? getCanvasWidth() / tabs.length : 130;
    const tabH = UIScale.current.minTouchTarget;
    const tabStartX = cx - (tabs.length * tabW) / 2;
    for (let i = 0; i < tabs.length; i++) {
      const t = tabs[i];
      const tx = tabStartX + i * tabW + tabW / 2;
      // Draw tab background on phone for bigger touch target
      if (phone) {
        const bg = this.add.graphics();
        bg.fillStyle(t.tab === this.activeTab ? 0x332211 : 0x111118, 1);
        bg.fillRect(tabStartX + i * tabW, tabY - tabH / 2, tabW - 2, tabH);
        bg.lineStyle(1, 0x333344, 0.5);
        bg.strokeRect(tabStartX + i * tabW, tabY - tabH / 2, tabW - 2, tabH);
      }
      const text = this.add.text(tx, tabY, `[ ${t.label} ]`, {
        fontSize: UIScale.font(14), color: t.tab === this.activeTab ? '#ffaa44' : '#666666',
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

    const contentY = UIScale.isPhone ? tabY + tabH / 2 + 10 : 68;
    const contentH = totalH - contentY - 10;
    const mask = this.add.graphics();
    mask.fillRect(0, contentY, getCanvasWidth(), contentH);
    const maskGeo = mask.createGeometryMask();

    this.contentContainer = this.add.container(0, contentY);
    this.contentContainer.setMask(maskGeo);

    this.rebuildContent();

    this.input.on('wheel', (_p: any, _g: any, _dx: number, dy: number) => {
      if (this.activeTab === 'towers' || this.activeTab === 'factions' || this.activeTab === 'heroes') return; // carousels
      this.scrollY = Phaser.Math.Clamp(
        this.scrollY - dy * 0.5,
        -(this.contentHeight - contentH + 40),
        0,
      );
      this.contentContainer.setY(contentY + this.scrollY);
    });

    // Touch drag scrolling (for non-carousel tabs)
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.activeTab === 'towers' || this.activeTab === 'factions' || this.activeTab === 'heroes') return;
      this.isDragging = true;
      this.dragStartY = pointer.y;
      this.dragStartScrollY = this.scrollY;
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isDragging) return;
      const dy = pointer.y - this.dragStartY;
      this.scrollY = Phaser.Math.Clamp(
        this.dragStartScrollY + dy,
        -(this.contentHeight - contentH + 40),
        0,
      );
      this.contentContainer.setY(contentY + this.scrollY);
    });
    this.input.on('pointerup', () => { this.isDragging = false; });
  }

  private updateTabColors(): void {
    for (const tb of this.tabButtons) {
      tb.text.setColor(tb.tab === this.activeTab ? '#ffaa44' : '#666666');
    }
  }

  private getContentY(): number {
    const tabH = UIScale.current.minTouchTarget;
    return UIScale.isPhone ? (70 + tabH / 2 + 10) : 68;
  }

  private rebuildContent(): void {
    this.contentContainer.removeAll(true);
    this.scrollY = 0;
    this.contentContainer.setY(this.getContentY());

    switch (this.activeTab) {
      case 'factions': this.buildFactionsTab(); break;
      case 'towers': this.buildTowersCarousel(); break;
      case 'creeps': this.buildCreepsTab(); break;
      case 'heroes': this.buildHeroesCarousel(); break;
    }
  }

  // ===================== FACTIONS TAB (CAROUSEL) =====================
  private buildFactionsTab(): void {
    const cx = getCanvasWidth() / 2;
    const phone = UIScale.isPhone;
    const fid = this.playableFactions[this.factionIndex];
    const faction = FACTIONS[fid];
    if (!faction) return;

    // Navigation
    const navMargin = UIScale.isPhone ? 20 : 40;
    const prevBtn = this.add.text(navMargin, 10, '< Prev', {
      fontSize: UIScale.font(14), color: '#888888', fontFamily: 'monospace',
    }).setInteractive({ useHandCursor: true });
    prevBtn.on('pointerdown', () => {
      this.factionIndex = (this.factionIndex - 1 + this.playableFactions.length) % this.playableFactions.length;
      this.rebuildContent();
    });
    this.contentContainer.add(prevBtn);

    const nextBtn = this.add.text(getCanvasWidth() - navMargin, 10, 'Next >', {
      fontSize: UIScale.font(14), color: '#888888', fontFamily: 'monospace',
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    nextBtn.on('pointerdown', () => {
      this.factionIndex = (this.factionIndex + 1) % this.playableFactions.length;
      this.rebuildContent();
    });
    this.contentContainer.add(nextBtn);

    const counter = this.add.text(cx, 12, `${this.factionIndex + 1} / ${this.playableFactions.length}`, {
      fontSize: UIScale.font(12), color: '#666666', fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.contentContainer.add(counter);

    let y = 35;

    // Faction name + tower count
    const header = this.add.text(cx, y, faction.name, {
      fontSize: UIScale.font(22), color: '#ffaa44', fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.contentContainer.add(header);
    y += UIScale.space(24);

    const tCount = this.add.text(cx, y, `${faction.towerIds.length} towers`, {
      fontSize: UIScale.font(10), color: '#888888', fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.contentContainer.add(tCount);
    y += UIScale.space(18);

    // Content margins — narrower centered card (much smaller margins on phone)
    const marginL = UIScale.current.encyclopediaMargin;
    const marginR = UIScale.current.encyclopediaMargin;
    const contentW = getCanvasWidth() - marginL - marginR;

    // Lore paragraph
    const lore = FACTION_LORE[fid] ?? faction.description;
    const loreText = this.add.text(marginL, y, lore, {
      fontSize: UIScale.font(10), color: '#999999', fontFamily: 'monospace',
      wordWrap: { width: contentW },
      lineSpacing: UIScale.isPhone ? 8 : 3,
    });
    this.contentContainer.add(loreText);
    y += loreText.height + UIScale.space(16);

    // Tower table — on phone show simplified stacked layout
    if (phone) {
      // Stacked layout for phone: each tower as a mini card
      for (const tid of faction.towerIds) {
        const t = TOWER_TYPES[tid];
        if (!t) continue;
        const traits = this.summarizeTraits(t);
        const upgCount = t.upgrades.length > 0 ? `${t.upgrades.length} lvl` : 'none';

        const nameStr = t.name + (t.ultimate ? ' *' : '');
        const nameT = this.add.text(marginL, y, nameStr, {
          fontSize: UIScale.font(12), color: t.ultimate ? '#ffdd44' : '#ffffff', fontFamily: 'monospace',
        });
        this.contentContainer.add(nameT);
        y += 32;

        const statsStr = `${t.cost}g | DMG: ${t.damage > 0 ? t.damage : '-'} | RNG: ${t.range} | Upg: ${upgCount}`;
        const statsT = this.add.text(marginL + 10, y, statsStr, {
          fontSize: UIScale.font(9), color: '#aaaaaa', fontFamily: 'monospace',
        });
        this.contentContainer.add(statsT);
        y += 26;

        if (traits && traits !== '-') {
          const traitsT = this.add.text(marginL + 10, y, traits, {
            fontSize: UIScale.font(9), color: '#888888', fontFamily: 'monospace',
            wordWrap: { width: contentW - 20 },
          });
          this.contentContainer.add(traitsT);
          y += traitsT.height + 8;
        }

        const tLore = TOWER_LORE[tid];
        if (tLore) {
          const fl = this.add.text(marginL + 10, y, tLore, {
            fontSize: UIScale.font(9), color: '#666666', fontFamily: 'monospace',
            fontStyle: 'italic',
            wordWrap: { width: contentW - 20 },
          });
          this.contentContainer.add(fl);
          y += fl.height + 12;
        } else {
          y += 8;
        }
      }
    } else {
      // Desktop: table layout
      const colX = [marginL, marginL + 120, marginL + 170, marginL + 220, marginL + 280, marginL + 350];
      const headers = ['Tower', 'Cost', 'DMG', 'Range', 'Upgrades', 'Key Traits'];
      for (let i = 0; i < headers.length; i++) {
        const h = this.add.text(colX[i], y, headers[i], {
          fontSize: UIScale.font(10), color: '#666666', fontFamily: 'monospace',
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
            fontSize: UIScale.font(10), color: t.ultimate ? '#ffdd44' : '#cccccc',
            fontFamily: 'monospace',
            wordWrap: i === 5 ? { width: getCanvasWidth() - marginR - colX[5] } : undefined,
          });
          this.contentContainer.add(txt);
        }

        // Tower flavor text on next line
        const tLore = TOWER_LORE[tid];
        if (tLore) {
          y += 14;
          const fl = this.add.text(colX[0] + 10, y, tLore, {
            fontSize: UIScale.font(10), color: '#666666', fontFamily: 'monospace',
            fontStyle: 'italic',
            wordWrap: { width: contentW - 20 },
          });
          this.contentContainer.add(fl);
          y += fl.height + 4;
        } else {
          y += 15;
        }
      }
    }

    // Frontier buildings
    const buildings = FRONTIER_BUILDINGS[fid];
    if (buildings && buildings.length > 0) {
      y += UIScale.space(8);
      const fLabel = this.add.text(marginL, y, 'FRONTIER BUILDINGS', {
        fontSize: UIScale.font(11), color: '#888844', fontFamily: 'monospace',
      });
      this.contentContainer.add(fLabel);
      y += UIScale.space(16);
      const indent = UIScale.space(10);
      for (const b of buildings) {
        const bText = this.add.text(marginL + indent, y, `${b.name} (${b.cost}g) — ${b.mechanic}`, {
          fontSize: UIScale.font(10), color: '#aaaaaa', fontFamily: 'monospace',
          wordWrap: phone ? { width: contentW - 20 } : undefined,
        });
        this.contentContainer.add(bText);
        y += phone ? bText.height + 8 : 14;
        const bDesc = this.add.text(marginL + UIScale.space(20), y, b.description, {
          fontSize: UIScale.font(9), color: '#777777', fontFamily: 'monospace',
          wordWrap: { width: contentW - UIScale.space(30) },
        });
        this.contentContainer.add(bDesc);
        y += bDesc.height + UIScale.space(6);
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
    const cx = getCanvasWidth() / 2;
    const phone = UIScale.isPhone;
    const tid = this.allTowerIds[this.towerIndex];
    const t = TOWER_TYPES[tid];
    if (!t) return;

    const faction = FACTIONS[t.faction as FactionId];
    const navMargin = UIScale.isPhone ? 20 : 40;

    // Navigation
    const prevBtn = this.add.text(navMargin, 10, '< Prev', {
      fontSize: UIScale.font(14), color: '#888888', fontFamily: 'monospace',
    }).setInteractive({ useHandCursor: true });
    prevBtn.on('pointerdown', () => {
      this.towerIndex = (this.towerIndex - 1 + this.allTowerIds.length) % this.allTowerIds.length;
      this.rebuildContent();
    });
    this.contentContainer.add(prevBtn);

    const nextBtn = this.add.text(getCanvasWidth() - navMargin, 10, 'Next >', {
      fontSize: UIScale.font(14), color: '#888888', fontFamily: 'monospace',
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    nextBtn.on('pointerdown', () => {
      this.towerIndex = (this.towerIndex + 1) % this.allTowerIds.length;
      this.rebuildContent();
    });
    this.contentContainer.add(nextBtn);

    const counter = this.add.text(cx, 12, `${this.towerIndex + 1} / ${this.allTowerIds.length}`, {
      fontSize: UIScale.font(12), color: '#666666', fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.contentContainer.add(counter);

    // Tower title card
    let y = 35;
    const factionLabel = this.add.text(cx, y, faction?.name ?? '', {
      fontSize: UIScale.font(10), color: '#888888', fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.contentContainer.add(factionLabel);
    y += UIScale.space(16);

    const nameText = this.add.text(cx, y, t.name + (t.ultimate ? ' [ULTIMATE]' : ''), {
      fontSize: UIScale.font(22), color: t.ultimate ? '#ffdd44' : '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.contentContainer.add(nameText);
    y += UIScale.space(28);

    // Tower icon — sprite if available, colored square fallback
    const iconSz = UIScale.isPhone ? 50 : 30;
    const towerCfg = getTowerSpriteConfig(t.id);
    if (towerCfg && this.textures.exists(towerCfg.sheetKey)) {
      const frameIdx = towerCfg.rows.idle * towerCfg.totalCols + towerCfg.column;
      const icon = this.add.sprite(cx, y + iconSz / 2, towerCfg.sheetKey, frameIdx);
      icon.setScale(iconSz / 64);
      icon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      this.contentContainer.add(icon);
    } else {
      const iconG = this.add.graphics();
      iconG.fillStyle(t.color, 1);
      iconG.fillRect(cx - iconSz / 2, y, iconSz, iconSz);
      iconG.lineStyle(2, 0xffffff, 0.3);
      iconG.strokeRect(cx - iconSz / 2, y, iconSz, iconSz);
      this.contentContainer.add(iconG);
    }
    y += iconSz + 10;

    // Flavor text
    const lore = TOWER_LORE[tid] ?? t.description;
    const loreWrapW = UIScale.isPhone ? getCanvasWidth() - 80 : getCanvasWidth() - 560;
    const loreText = this.add.text(cx, y, `"${lore}"`, {
      fontSize: UIScale.font(10), color: '#999999', fontFamily: 'monospace',
      fontStyle: 'italic',
      wordWrap: { width: loreWrapW },
      align: 'center',
    }).setOrigin(0.5, 0);
    this.contentContainer.add(loreText);
    y += loreText.height + UIScale.space(16);

    // Stats — on phone, stack vertically instead of long single lines
    const lineGap = UIScale.space(16);
    if (phone) {
      const statPairs = [
        `Cost: ${t.cost}g  |  Damage: ${t.damage}`,
        `Range: ${t.range}  |  Fire Rate: ${t.fireRate < 90000 ? t.fireRate + 'ms' : 'N/A'}`,
        `Damage Type: ${t.damageType}  |  Proj Speed: ${t.projectileSpeed || 'N/A'}`,
        `Traits: ${this.summarizeTraits(t) || 'None'}`,
      ];
      for (const line of statPairs) {
        const st = this.add.text(cx, y, line, {
          fontSize: UIScale.font(11), color: '#cccccc', fontFamily: 'monospace',
          wordWrap: { width: getCanvasWidth() - 80 }, align: 'center',
        }).setOrigin(0.5, 0);
        this.contentContainer.add(st);
        y += st.height + 8;
      }
    } else {
      const statsLines = [
        `Cost: ${t.cost}g  |  Damage: ${t.damage}  |  Range: ${t.range}  |  Fire Rate: ${t.fireRate < 90000 ? t.fireRate + 'ms' : 'N/A'}`,
        `Damage Type: ${t.damageType}  |  Projectile Speed: ${t.projectileSpeed || 'N/A'}`,
        `Traits: ${this.summarizeTraits(t) || 'None'}`,
      ];
      for (const line of statsLines) {
        const st = this.add.text(cx, y, line, {
          fontSize: UIScale.font(11), color: '#cccccc', fontFamily: 'monospace',
        }).setOrigin(0.5);
        this.contentContainer.add(st);
        y += lineGap;
      }
    }
    y += UIScale.space(8);

    // Upgrades
    if (t.upgrades.length > 0) {
      const upgHeader = this.add.text(cx, y, `UPGRADES (${t.upgrades.length} levels)`, {
        fontSize: UIScale.font(13), color: '#ffaa44', fontFamily: 'monospace',
      }).setOrigin(0.5);
      this.contentContainer.add(upgHeader);
      y += UIScale.space(18);

      let prevDmg = t.damage, prevRange = t.range, prevRate = t.fireRate;
      for (const upg of t.upgrades) {
        const diffs: string[] = [];
        if (upg.damage !== prevDmg) diffs.push(`DMG: ${prevDmg}→${upg.damage}`);
        if (upg.range !== prevRange) diffs.push(`RNG: ${prevRange}→${upg.range}`);
        if (upg.fireRate !== prevRate) diffs.push(`SPD: ${prevRate}→${upg.fireRate}ms`);
        const diffStr = diffs.length > 0 ? diffs.join(', ') : 'No stat change';

        const upgText = this.add.text(cx, y, `Lv${upg.level} (${upg.cost}g): ${diffStr}`, {
          fontSize: UIScale.font(10), color: '#aaaaaa', fontFamily: 'monospace',
        }).setOrigin(0.5, 0);
        this.contentContainer.add(upgText);
        y += UIScale.space(14);

        prevDmg = upg.damage; prevRange = upg.range; prevRate = upg.fireRate;
      }
    } else {
      const noUpg = this.add.text(cx, y, 'No upgrades available', {
        fontSize: UIScale.font(10), color: '#666666', fontFamily: 'monospace',
      }).setOrigin(0.5);
      this.contentContainer.add(noUpg);
      y += UIScale.space(14);
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
    const phone = UIScale.isPhone;
    let y = 0;
    const marginL = UIScale.isPhone ? 20 : 280;
    const marginR = UIScale.isPhone ? 20 : 280;
    const cardW = getCanvasWidth() - marginL - marginR;
    // Card padding extends beyond margins for visual bleed
    const cardPad = UIScale.isPhone ? 10 : 40;

    for (const [id, ct] of Object.entries(CREEP_TYPES)) {
      const cardH = UIScale.current.creepCardH;
      const cardY = y;

      // Background card
      const cardBg = this.add.graphics();
      cardBg.fillStyle(0x151520, 1);
      cardBg.fillRect(marginL - cardPad, cardY, cardW + cardPad * 2, cardH);
      cardBg.lineStyle(1, 0x333344, 0.6);
      cardBg.strokeRect(marginL - cardPad, cardY, cardW + cardPad * 2, cardH);
      this.contentContainer.add(cardBg);

      // Creep icon (colored circle)
      const iconX = marginL + (UIScale.isPhone ? 20 : -10);
      const iconY = cardY + (UIScale.isPhone ? 30 : cardH / 2);
      const iconSize = ct.id === 'boss' ? UIScale.space(18) : (ct.size ?? 1) * UIScale.space(14);
      const iconG = this.add.graphics();
      iconG.fillStyle(ct.color, 1);
      iconG.fillCircle(iconX, iconY, iconSize);
      this.contentContainer.add(iconG);

      // Stats
      const statsX = marginL + (UIScale.isPhone ? 50 : 20);
      const nameText = this.add.text(statsX, cardY + (UIScale.isPhone ? 10 : 6), ct.name, {
        fontSize: UIScale.font(14), color: '#ffffff', fontFamily: 'monospace',
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
          case 'regeneration': return `Regen(${Math.round((t.regenPercent ?? 0.02) * 100)}%hp/s)`;
          default: return t.id;
        }
      }).join(', ') || 'None';

      const spawn = ct.spawnBehavior === 'flying' ? 'Flying (ignores maze)' :
        ct.spawnBehavior === 'group' ? 'Group burst (x4)' :
        ct.count > 1 ? `Swarm (x${ct.count})` : 'Normal';

      const statsStr = `HP: ${ct.hpMultiplier}x  |  SPD: ${ct.speedMultiplier}x  |  Armor: ${ct.armor}  |  ${spawn}`;
      const statsYOff = UIScale.space(24);
      const statsText = this.add.text(phone ? marginL + 10 : statsX, cardY + statsYOff, statsStr, {
        fontSize: UIScale.font(11), color: '#aaaaaa', fontFamily: 'monospace',
        wordWrap: phone ? { width: cardW - 20 } : undefined,
      });
      this.contentContainer.add(statsText);

      const traitsYOff = UIScale.space(40);
      const traitsText = this.add.text(phone ? marginL + 10 : statsX, cardY + traitsYOff, `Traits: ${traits}`, {
        fontSize: UIScale.font(10), color: '#888888', fontFamily: 'monospace',
        wordWrap: { width: phone ? cardW - 20 : cardW * 0.45 },
      });
      this.contentContainer.add(traitsText);

      // Flavor text — on phone below traits, on desktop right side
      const lore = CREEP_LORE[id] ?? ct.description;
      if (phone) {
        const flavorYOff = traitsYOff + traitsText.height + 12;
        const flavor = this.add.text(marginL + 10, cardY + flavorYOff, lore, {
          fontSize: UIScale.font(9), color: '#777777', fontFamily: 'monospace',
          fontStyle: 'italic',
          wordWrap: { width: cardW - 20 },
          lineSpacing: 6,
        });
        this.contentContainer.add(flavor);
        // Adjust card height to fit content
        const actualH = flavorYOff + flavor.height + 16;
        if (actualH > cardH) {
          cardBg.clear();
          cardBg.fillStyle(0x151520, 1);
          cardBg.fillRect(marginL - cardPad, cardY, cardW + cardPad * 2, actualH);
          cardBg.lineStyle(1, 0x333344, 0.6);
          cardBg.strokeRect(marginL - cardPad, cardY, cardW + cardPad * 2, actualH);
          y += actualH + 12;
        } else {
          y += cardH + 12;
        }
      } else {
        const flavorX = marginL + cardW * 0.5;
        const flavor = this.add.text(flavorX, cardY + 8, lore, {
          fontSize: UIScale.font(10), color: '#777777', fontFamily: 'monospace',
          fontStyle: 'italic',
          wordWrap: { width: cardW * 0.45 },
          lineSpacing: 3,
        });
        this.contentContainer.add(flavor);
        y += cardH + 8;
      }
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

  // ===================== HEROES TAB (CAROUSEL) =====================

  private buildHeroesCarousel(): void {
    const cx = getCanvasWidth() / 2;
    const phone = UIScale.isPhone;
    const heroId = HERO_ORDER[this.heroIndex];
    const hero = HERO_TYPES[heroId];
    const navMargin = UIScale.isPhone ? 20 : 60;

    // Navigation arrows
    const arrowY = UIScale.isPhone ? 160 : 200;
    const leftArr = this.add.text(navMargin, arrowY, '<', {
      fontSize: UIScale.font(40), color: '#888888', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    leftArr.on('pointerdown', () => {
      this.heroIndex = (this.heroIndex - 1 + HERO_ORDER.length) % HERO_ORDER.length;
      this.rebuildContent();
    });
    this.contentContainer.add(leftArr);

    const rightArr = this.add.text(getCanvasWidth() - navMargin, arrowY, '>', {
      fontSize: UIScale.font(40), color: '#888888', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    rightArr.on('pointerdown', () => {
      this.heroIndex = (this.heroIndex + 1) % HERO_ORDER.length;
      this.rebuildContent();
    });
    this.contentContainer.add(rightArr);

    // Counter
    this.contentContainer.add(this.add.text(cx, 8, `${this.heroIndex + 1} / ${HERO_ORDER.length}`, {
      fontSize: UIScale.font(12), color: '#666666', fontFamily: 'monospace',
    }).setOrigin(0.5));

    // Hero icon — sprite if available, diamond fallback
    const iconY = UIScale.y(50);
    const iconSize = UIScale.isPhone ? 32 : 22;
    const heroSheetKey = getHeroSheetKey(heroId);
    if (heroSheetKey && this.textures.exists(heroSheetKey)) {
      const icon = this.add.sprite(cx, iconY, heroSheetKey, 0);
      icon.setScale((iconSize * 2) / 64);
      icon.setOrigin(0.5, 0.5);
      icon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      this.contentContainer.add(icon);
    }
    const g = this.add.graphics();
    if (!heroSheetKey || !this.textures.exists(heroSheetKey)) {
      g.fillStyle(hero.color, 1);
      g.beginPath();
      g.moveTo(cx, iconY - iconSize);
      g.lineTo(cx + iconSize, iconY);
      g.lineTo(cx, iconY + iconSize);
      g.lineTo(cx - iconSize, iconY);
      g.closePath();
      g.fillPath();
    }
    g.lineStyle(2, 0xffffff, 0.4);
    g.beginPath();
    g.moveTo(cx, iconY - iconSize);
    g.lineTo(cx + iconSize, iconY);
    g.lineTo(cx, iconY + iconSize);
    g.lineTo(cx - iconSize, iconY);
    g.closePath();
    g.strokePath();
    this.contentContainer.add(g);

    // Name
    const nameYOff = UIScale.space(30);
    this.contentContainer.add(this.add.text(cx, iconY + nameYOff, hero.name, {
      fontSize: UIScale.font(22), color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5));

    // Description
    const descYOff = UIScale.space(55);
    const descWrap = UIScale.isPhone ? getCanvasWidth() - 80 : 500;
    this.contentContainer.add(this.add.text(cx, iconY + descYOff, hero.description, {
      fontSize: UIScale.font(12), color: '#aaaaaa', fontFamily: 'monospace',
      wordWrap: { width: descWrap }, align: 'center',
    }).setOrigin(0.5, 0));

    // Stats block
    const statsX = UIScale.isPhone ? 40 : cx - 200;
    const valOffset = UIScale.isPhone ? 250 : 150;
    let y = iconY + UIScale.space(85);

    const statLines = [
      ['HP', String(hero.hp), '#44ff44'],
      ['Damage', String(hero.damage), '#ff6644'],
      ['Attack Speed', `${hero.attackSpeed}/s`, '#ffaa44'],
      ['Range', hero.attackRange <= 50 ? 'Melee' : `${hero.attackRange}px`, '#44aaff'],
      ['Move Speed', String(hero.moveSpeed), '#44ff88'],
    ];

    const statRowH = UIScale.space(18);
    for (const [label, val, col] of statLines) {
      this.contentContainer.add(this.add.text(statsX, y, `${label}:`, {
        fontSize: UIScale.font(13), color: '#888888', fontFamily: 'monospace',
      }));
      this.contentContainer.add(this.add.text(statsX + valOffset, y, val, {
        fontSize: UIScale.font(13), color: col, fontFamily: 'monospace',
      }));
      y += statRowH;
    }

    // Abilities
    y += UIScale.space(10);
    this.contentContainer.add(this.add.text(statsX, y, 'ABILITIES', {
      fontSize: UIScale.font(14), color: '#ffaa44', fontFamily: 'monospace',
    }));
    y += UIScale.space(22);

    const cdOffset = UIScale.isPhone ? getCanvasWidth() - 200 : statsX + 350;
    const indent = UIScale.space(8);
    for (const ab of hero.abilities) {
      this.contentContainer.add(this.add.text(statsX, y, `[${ab.key}] ${ab.name}`, {
        fontSize: UIScale.font(13), color: '#ffffff', fontFamily: 'monospace',
      }));
      y += UIScale.space(16);
      const descText = this.add.text(statsX + indent, y, `${ab.description}`, {
        fontSize: UIScale.font(11), color: '#aaaaaa', fontFamily: 'monospace',
        wordWrap: phone ? { width: getCanvasWidth() - 100 } : undefined,
      });
      this.contentContainer.add(descText);
      if (!phone) {
        this.contentContainer.add(this.add.text(cdOffset, y, `${ab.cooldown}s cd`, {
          fontSize: UIScale.font(11), color: '#666666', fontFamily: 'monospace',
        }));
      } else {
        y += descText.height + 4;
        this.contentContainer.add(this.add.text(statsX + 20, y, `${ab.cooldown}s cooldown`, {
          fontSize: UIScale.font(10), color: '#666666', fontFamily: 'monospace',
        }));
      }
      y += UIScale.space(18);
    }

    // Ultimate
    if (hero.ultimate) {
      y += UIScale.space(6);
      this.contentContainer.add(this.add.text(statsX, y, 'ULTIMATE (unlocks Lv.6)', {
        fontSize: UIScale.font(14), color: '#cc66ff', fontFamily: 'monospace',
      }));
      y += UIScale.space(22);
      this.contentContainer.add(this.add.text(statsX, y, `[R] ${hero.ultimate.name}`, {
        fontSize: UIScale.font(13), color: '#cc66ff', fontFamily: 'monospace',
      }));
      y += UIScale.space(16);
      const ultDesc = this.add.text(statsX + indent, y, hero.ultimate.description, {
        fontSize: UIScale.font(11), color: '#aa88aa', fontFamily: 'monospace',
        wordWrap: phone ? { width: getCanvasWidth() - 100 } : undefined,
      });
      this.contentContainer.add(ultDesc);
      if (!phone) {
        this.contentContainer.add(this.add.text(cdOffset, y, `${hero.ultimate.cooldown}s cd`, {
          fontSize: UIScale.font(11), color: '#666666', fontFamily: 'monospace',
        }));
      } else {
        y += ultDesc.height + 4;
        this.contentContainer.add(this.add.text(statsX + 20, y, `${hero.ultimate.cooldown}s cooldown`, {
          fontSize: UIScale.font(10), color: '#666666', fontFamily: 'monospace',
        }));
      }
      y += UIScale.space(18);
    }

    // Playstyle hint
    y += UIScale.space(12);
    const rangeType = hero.attackRange <= 50 ? 'Melee' : 'Ranged';
    const speedTier = hero.moveSpeed >= 170 ? 'Fast' : hero.moveSpeed >= 140 ? 'Medium' : 'Slow';
    const hpTier = hero.hp >= 400 ? 'Tanky' : hero.hp >= 300 ? 'Medium' : 'Squishy';
    this.contentContainer.add(this.add.text(cx, y, `${rangeType} | ${speedTier} | ${hpTier}`, {
      fontSize: UIScale.font(12), color: '#555555', fontFamily: 'monospace',
    }).setOrigin(0.5));
  }
}
