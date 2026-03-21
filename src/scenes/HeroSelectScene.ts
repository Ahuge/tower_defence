import Phaser from 'phaser';
import { getCanvasWidth, GAME_HEIGHT } from '../config';
import { HeroId, HERO_ORDER, HERO_TYPES, getHeroForFaction } from '../data/HeroTypes';
import { MatchMode } from '../data/WaveDefinitions';
import { FactionId, FACTIONS } from '../data/Factions';
import { MapId } from '../data/Maps';
import { DifficultyLevel } from '../data/Difficulty';
import { TowerSelectBar } from '../ui/TowerSelectBar';
import { ResponsiveManager } from '../systems/ResponsiveManager';

/** Pick N random unique elements from an array */
function pickRandom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

export class HeroSelectScene extends Phaser.Scene {
  private matchMode: MatchMode = 'hero_defense';
  private faction: FactionId | null = null;
  private mapId: MapId = 'hero_plains';
  private difficulty: DifficultyLevel = 'normal';
  private randomSeed: number = 0;
  private dailySeed: boolean = false;
  private phoneCardIndex: number = 0;
  private phoneOffered: HeroId[] = [];

  constructor() {
    super('HeroSelectScene');
  }

  init(data: { mode: MatchMode; faction: FactionId | null; map?: MapId; difficulty?: DifficultyLevel; randomSeed?: number; dailySeed?: boolean }): void {
    this.matchMode = data.mode;
    this.faction = data.faction;
    this.mapId = data.map || 'hero_plains';
    this.difficulty = data.difficulty || 'normal';
    this.randomSeed = data.randomSeed ?? 0;
    this.dailySeed = data.dailySeed ?? false;
  }

  create(): void {
    const cx = getCanvasWidth() / 2;
    const totalH = GAME_HEIGHT + 28 + TowerSelectBar.BAR_HEIGHT;

    this.add.graphics().fillStyle(0x0a0a0f, 1).fillRect(0, 0, getCanvasWidth(), totalH);

    this.add.text(cx, 35, 'Choose Your Hero', {
      fontSize: '28px', color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.text(cx, 65, 'Three heroes offered at random — pick wisely', {
      fontSize: '13px', color: '#888888', fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Pick 3 heroes: guarantee faction hero if non-random faction selected
    let offered: HeroId[];
    const factionHero = this.faction && this.faction !== 'random'
      ? getHeroForFaction(this.faction) : null;

    if (factionHero) {
      // Faction hero guaranteed + 2 random others
      const others = HERO_ORDER.filter(h => h !== factionHero);
      const randomOthers = pickRandom(others, 2);
      // Put faction hero first
      offered = [factionHero, ...randomOthers];
    } else {
      offered = pickRandom(HERO_ORDER, 3);
    }

    const isPhone = ResponsiveManager.isPhone();

    if (isPhone) {
      this.phoneOffered = offered;
      this.phoneCardIndex = 0;
      this.buildPhoneCard(cx);
      return;
    }

    const cardW = 260;
    const cardH = 420;
    const gap = 20;
    const totalW = 3 * cardW + 2 * gap;
    const startX = cx - totalW / 2;

    for (let i = 0; i < offered.length; i++) {
      const heroId = offered[i];
      const hero = HERO_TYPES[heroId];
      const x = startX + i * (cardW + gap);
      const y = 90;

      const card = this.add.graphics();
      this.drawCard(card, x, y, cardW, cardH, hero.color, false);

      // Hero icon (diamond)
      const iconX = x + cardW / 2;
      const iconY = y + 40;
      const iconSize = 18;
      this.drawDiamond(card, iconX, iconY, iconSize, hero.color);

      // Faction tag
      const factionName = FACTIONS[hero.faction as FactionId]?.name ?? hero.faction;
      const isFactionHero = heroId === factionHero;
      this.add.text(x + cardW / 2, y + 63, factionName.toUpperCase(), {
        fontSize: '9px', color: isFactionHero ? '#ffaa44' : '#555555', fontFamily: 'monospace',
      }).setOrigin(0.5);

      // Name
      this.add.text(x + cardW / 2, y + 76, hero.name, {
        fontSize: '20px', color: '#ffffff', fontFamily: 'monospace',
      }).setOrigin(0.5);

      // Description
      this.add.text(x + cardW / 2, y + 98, hero.description, {
        fontSize: '10px', color: '#aaaaaa', fontFamily: 'monospace',
        wordWrap: { width: cardW - 20 }, align: 'center',
      }).setOrigin(0.5, 0);

      // Stats
      const statsY = y + 138;
      const statsLines = [
        `HP: ${hero.hp}`,
        `Damage: ${hero.damage}`,
        `Attack Speed: ${hero.attackSpeed}/s`,
        `Range: ${hero.attackRange <= 50 ? 'Melee' : `${hero.attackRange}px`}`,
        `Move Speed: ${hero.moveSpeed}`,
        ...(hero.baseArmor ? [`Armor: ${hero.baseArmor}`] : []),
      ];
      this.add.text(x + 16, statsY, statsLines.join('\n'), {
        fontSize: '12px', color: '#cccccc', fontFamily: 'monospace',
        lineSpacing: 4,
      });

      // Abilities
      const abY = statsY + 95;
      this.add.text(x + 16, abY, 'Abilities:', {
        fontSize: '12px', color: '#ffaa44', fontFamily: 'monospace',
      });

      let ay = abY + 18;
      for (const ab of hero.abilities) {
        this.add.text(x + 16, ay, `[${ab.key}] ${ab.name}`, {
          fontSize: '12px', color: '#ffffff', fontFamily: 'monospace',
        });
        ay += 16;
        this.add.text(x + 28, ay, `${ab.description} (${ab.cooldown}s cd)`, {
          fontSize: '10px', color: '#888888', fontFamily: 'monospace',
          wordWrap: { width: cardW - 40 },
        });
        ay += 20;
      }

      // Ultimate
      if (hero.ultimate) {
        this.add.text(x + 16, ay, `[R] ${hero.ultimate.name}`, {
          fontSize: '12px', color: '#cc66ff', fontFamily: 'monospace',
        });
        ay += 16;
        this.add.text(x + 28, ay, `${hero.ultimate.description} (${hero.ultimate.cooldown}s cd)`, {
          fontSize: '10px', color: '#886688', fontFamily: 'monospace',
          wordWrap: { width: cardW - 40 },
        });
      }

      // Click zone
      const zone = this.add.zone(x + cardW / 2, y + cardH / 2, cardW, cardH).setInteractive({ useHandCursor: true });
      zone.on('pointerover', () => {
        card.clear();
        this.drawCard(card, x, y, cardW, cardH, hero.color, true);
        this.drawDiamond(card, iconX, iconY, iconSize, hero.color);
      });
      zone.on('pointerout', () => {
        card.clear();
        this.drawCard(card, x, y, cardW, cardH, hero.color, false);
        this.drawDiamond(card, iconX, iconY, iconSize, hero.color);
      });
      zone.on('pointerdown', () => {
        this.selectHero(heroId);
      });
    }

    // Reroll button
    const rerollBtn = this.add.text(cx, totalH - 40, '[ Reroll Heroes ]', {
      fontSize: '14px', color: '#888888', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    rerollBtn.on('pointerdown', () => this.scene.restart());
    rerollBtn.on('pointerover', () => rerollBtn.setColor('#ffffff'));
    rerollBtn.on('pointerout', () => rerollBtn.setColor('#888888'));

    // Back button
    const backBtn = this.add.text(50, 25, '[ Back ]', {
      fontSize: '14px', color: '#888888', fontFamily: 'monospace',
    }).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.scene.start('FactionSelectScene', {
      mode: this.matchMode,
      map: this.mapId,
      difficulty: this.difficulty,
      randomSeed: this.randomSeed,
      dailySeed: this.dailySeed,
    }));
    backBtn.on('pointerover', () => backBtn.setColor('#ffffff'));
    backBtn.on('pointerout', () => backBtn.setColor('#888888'));
  }

  private buildPhoneCard(cx: number): void {
    const cw = getCanvasWidth();
    const heroId = this.phoneOffered[this.phoneCardIndex];
    const hero = HERO_TYPES[heroId];
    const factionHero = this.faction && this.faction !== 'random'
      ? getHeroForFaction(this.faction) : null;
    const isFactionHero = heroId === factionHero;

    const cardW = cw - 40;
    const cardH = 380;
    const x = 20;
    const y = 80;

    const card = this.add.graphics();
    this.drawCard(card, x, y, cardW, cardH, hero.color, false);
    this.drawDiamond(card, x + cardW / 2, y + 30, 14, hero.color);

    // Faction tag
    const factionName = FACTIONS[hero.faction as FactionId]?.name ?? hero.faction;
    this.add.text(x + cardW / 2, y + 50, factionName.toUpperCase(), {
      fontSize: '9px', color: isFactionHero ? '#ffaa44' : '#555555', fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Name
    this.add.text(x + cardW / 2, y + 62, hero.name, {
      fontSize: '18px', color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Description
    this.add.text(x + cardW / 2, y + 82, hero.description, {
      fontSize: '10px', color: '#aaaaaa', fontFamily: 'monospace',
      wordWrap: { width: cardW - 20 }, align: 'center',
    }).setOrigin(0.5, 0);

    // Stats (compact)
    const statsY = y + 110;
    const lines = [
      `HP:${hero.hp}  DMG:${hero.damage}  AS:${hero.attackSpeed}/s`,
      `Range:${hero.attackRange <= 50 ? 'Melee' : hero.attackRange + 'px'}  SPD:${hero.moveSpeed}${hero.baseArmor ? '  ARM:' + hero.baseArmor : ''}`,
    ];
    this.add.text(x + 12, statsY, lines.join('\n'), {
      fontSize: '11px', color: '#cccccc', fontFamily: 'monospace', lineSpacing: 4,
    });

    // Abilities (compact)
    let ay = statsY + 38;
    for (const ab of hero.abilities) {
      this.add.text(x + 12, ay, `[${ab.key}] ${ab.name} — ${ab.description} (${ab.cooldown}s)`, {
        fontSize: '10px', color: '#ffffff', fontFamily: 'monospace',
        wordWrap: { width: cardW - 24 },
      });
      ay += 24;
    }
    if (hero.ultimate) {
      this.add.text(x + 12, ay, `[R] ${hero.ultimate.name} — ${hero.ultimate.description} (${hero.ultimate.cooldown}s)`, {
        fontSize: '10px', color: '#cc66ff', fontFamily: 'monospace',
        wordWrap: { width: cardW - 24 },
      });
    }

    // Select button
    const selBtn = this.add.text(x + cardW / 2, y + cardH - 30, '[ SELECT ]', {
      fontSize: '16px', color: '#44ff44', fontFamily: 'monospace',
      backgroundColor: '#1a2a1a', padding: { x: 20, y: 6 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    selBtn.on('pointerdown', () => this.selectHero(heroId));
    selBtn.on('pointerover', () => selBtn.setColor('#ffffff'));
    selBtn.on('pointerout', () => selBtn.setColor('#44ff44'));

    // Prev/Next arrows
    const totalH = GAME_HEIGHT + 28 + TowerSelectBar.BAR_HEIGHT;
    if (this.phoneOffered.length > 1) {
      const prevBtn = this.add.text(20, y + cardH / 2, '<', {
        fontSize: '30px', color: '#888888', fontFamily: 'monospace',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      prevBtn.on('pointerdown', () => {
        this.phoneCardIndex = (this.phoneCardIndex - 1 + this.phoneOffered.length) % this.phoneOffered.length;
        this.scene.restart();
      });

      const nextBtn = this.add.text(cw - 20, y + cardH / 2, '>', {
        fontSize: '30px', color: '#888888', fontFamily: 'monospace',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      nextBtn.on('pointerdown', () => {
        this.phoneCardIndex = (this.phoneCardIndex + 1) % this.phoneOffered.length;
        this.scene.restart();
      });

      // Dots indicator
      for (let i = 0; i < this.phoneOffered.length; i++) {
        const dotColor = i === this.phoneCardIndex ? '#ffffff' : '#444444';
        this.add.text(cx - 10 + i * 15, totalH - 30, '●', {
          fontSize: '12px', color: dotColor, fontFamily: 'monospace',
        }).setOrigin(0.5);
      }
    }

    // Back button
    const backBtn = this.add.text(50, 25, '[ Back ]', {
      fontSize: '14px', color: '#888888', fontFamily: 'monospace',
    }).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.scene.start('FactionSelectScene', {
      mode: this.matchMode, map: this.mapId, difficulty: this.difficulty,
      randomSeed: this.randomSeed, dailySeed: this.dailySeed,
    }));
  }

  private drawCard(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, color: number, hovered: boolean): void {
    g.fillStyle(hovered ? 0x252530 : 0x1a1a22, 1);
    g.fillRect(x, y, w, h);
    g.lineStyle(hovered ? 3 : 2, color, hovered ? 1 : 0.8);
    g.strokeRect(x, y, w, h);
    g.fillStyle(color, hovered ? 0.8 : 0.6);
    g.fillRect(x, y, w, 6);
  }

  private drawDiamond(g: Phaser.GameObjects.Graphics, x: number, y: number, size: number, color: number): void {
    g.fillStyle(color, 1);
    g.beginPath();
    g.moveTo(x, y - size);
    g.lineTo(x + size, y);
    g.lineTo(x, y + size);
    g.lineTo(x - size, y);
    g.closePath();
    g.fillPath();
  }

  private selectHero(heroId: HeroId): void {
    this.scene.start('DraftScene', {
      mode: this.matchMode,
      faction: this.faction,
      map: this.mapId,
      difficulty: this.difficulty,
      heroId,
      randomSeed: this.randomSeed,
      dailySeed: this.dailySeed,
    });
  }
}
