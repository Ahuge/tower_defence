import Phaser from 'phaser';
import { getCanvasWidth, GAME_HEIGHT } from '../config';
import { HeroId, HERO_ORDER, HERO_TYPES } from '../data/HeroTypes';
import { MatchMode } from '../data/WaveDefinitions';
import { FactionId } from '../data/Factions';
import { MapId } from '../data/Maps';
import { DifficultyLevel } from '../data/Difficulty';
import { TowerSelectBar } from '../ui/TowerSelectBar';

export class HeroSelectScene extends Phaser.Scene {
  private matchMode: MatchMode = 'hero_defense';
  private faction: FactionId | null = null;
  private mapId: MapId = 'hero_plains';
  private difficulty: DifficultyLevel = 'normal';

  constructor() {
    super('HeroSelectScene');
  }

  init(data: { mode: MatchMode; faction: FactionId | null; map?: MapId; difficulty?: DifficultyLevel }): void {
    this.matchMode = data.mode;
    this.faction = data.faction;
    this.mapId = data.map || 'hero_plains';
    this.difficulty = data.difficulty || 'normal';
  }

  create(): void {
    const cx = getCanvasWidth() / 2;
    const totalH = GAME_HEIGHT + 28 + TowerSelectBar.BAR_HEIGHT;

    this.add.graphics().fillStyle(0x0a0a0f, 1).fillRect(0, 0, getCanvasWidth(), totalH);

    this.add.text(cx, 35, 'Choose Your Hero', {
      fontSize: '28px', color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.text(cx, 65, 'Your hero fights leaked creeps in the arena', {
      fontSize: '13px', color: '#888888', fontFamily: 'monospace',
    }).setOrigin(0.5);

    const cardW = 260;
    const cardH = 420;
    const gap = 20;
    const totalW = HERO_ORDER.length * cardW + (HERO_ORDER.length - 1) * gap;
    const startX = cx - totalW / 2;

    for (let i = 0; i < HERO_ORDER.length; i++) {
      const heroId = HERO_ORDER[i];
      const hero = HERO_TYPES[heroId];
      const x = startX + i * (cardW + gap);
      const y = 90;

      const card = this.add.graphics();
      card.fillStyle(0x1a1a22, 1);
      card.fillRect(x, y, cardW, cardH);
      card.lineStyle(2, hero.color, 0.8);
      card.strokeRect(x, y, cardW, cardH);

      // Color strip
      card.fillStyle(hero.color, 0.6);
      card.fillRect(x, y, cardW, 6);

      // Hero icon (diamond)
      const iconX = x + cardW / 2;
      const iconY = y + 40;
      const iconSize = 18;
      card.fillStyle(hero.color, 1);
      card.beginPath();
      card.moveTo(iconX, iconY - iconSize);
      card.lineTo(iconX + iconSize, iconY);
      card.lineTo(iconX, iconY + iconSize);
      card.lineTo(iconX - iconSize, iconY);
      card.closePath();
      card.fillPath();

      // Name
      this.add.text(x + cardW / 2, y + 70, hero.name, {
        fontSize: '20px', color: '#ffffff', fontFamily: 'monospace',
      }).setOrigin(0.5);

      // Description
      this.add.text(x + cardW / 2, y + 92, hero.description, {
        fontSize: '10px', color: '#aaaaaa', fontFamily: 'monospace',
        wordWrap: { width: cardW - 20 }, align: 'center',
      }).setOrigin(0.5, 0);

      // Stats
      const statsY = y + 130;
      const statsLines = [
        `HP: ${hero.hp}`,
        `Damage: ${hero.damage}`,
        `Attack Speed: ${hero.attackSpeed}/s`,
        `Range: ${hero.attackRange === 36 ? 'Melee' : `${hero.attackRange}px`}`,
        `Move Speed: ${hero.moveSpeed}`,
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

      // Click zone
      const zone = this.add.zone(x + cardW / 2, y + cardH / 2, cardW, cardH).setInteractive({ useHandCursor: true });
      zone.on('pointerover', () => {
        card.clear();
        card.fillStyle(0x252530, 1);
        card.fillRect(x, y, cardW, cardH);
        card.lineStyle(3, hero.color, 1);
        card.strokeRect(x, y, cardW, cardH);
        card.fillStyle(hero.color, 0.8);
        card.fillRect(x, y, cardW, 6);
        // Redraw icon
        card.fillStyle(hero.color, 1);
        card.beginPath();
        card.moveTo(iconX, iconY - iconSize);
        card.lineTo(iconX + iconSize, iconY);
        card.lineTo(iconX, iconY + iconSize);
        card.lineTo(iconX - iconSize, iconY);
        card.closePath();
        card.fillPath();
      });
      zone.on('pointerout', () => {
        card.clear();
        card.fillStyle(0x1a1a22, 1);
        card.fillRect(x, y, cardW, cardH);
        card.lineStyle(2, hero.color, 0.8);
        card.strokeRect(x, y, cardW, cardH);
        card.fillStyle(hero.color, 0.6);
        card.fillRect(x, y, cardW, 6);
        card.fillStyle(hero.color, 1);
        card.beginPath();
        card.moveTo(iconX, iconY - iconSize);
        card.lineTo(iconX + iconSize, iconY);
        card.lineTo(iconX, iconY + iconSize);
        card.lineTo(iconX - iconSize, iconY);
        card.closePath();
        card.fillPath();
      });
      zone.on('pointerdown', () => {
        this.selectHero(heroId);
      });
    }

    // Back button
    const backBtn = this.add.text(50, 25, '[ Back ]', {
      fontSize: '14px', color: '#888888', fontFamily: 'monospace',
    }).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.scene.start('FactionSelectScene', {
      mode: this.matchMode,
      map: this.mapId,
      difficulty: this.difficulty,
    }));
    backBtn.on('pointerover', () => backBtn.setColor('#ffffff'));
    backBtn.on('pointerout', () => backBtn.setColor('#888888'));
  }

  private selectHero(heroId: HeroId): void {
    this.scene.start('DraftScene', {
      mode: this.matchMode,
      faction: this.faction,
      map: this.mapId,
      difficulty: this.difficulty,
      heroId,
    });
  }
}
