/**
 * CreepFactionSelectScene — pick which faction's creatures you'll face.
 * Appears after tower faction select, before draft.
 * Pass-through data: mode, faction (tower), map, difficulty, heroId, etc.
 */
import Phaser from 'phaser';
import { getCanvasWidth } from '../config';
import { FACTIONS, FACTION_ORDER, FactionId } from '../data/Factions';
import { UIScale } from '../systems/UIScale';
import { ResponsiveManager } from '../systems/ResponsiveManager';

export class CreepFactionSelectScene extends Phaser.Scene {
  constructor() {
    super('CreepFactionSelectScene');
  }

  create(data: any): void {
    const cx = getCanvasWidth() / 2;
    const totalH = ResponsiveManager.canvasHeight();
    const s = UIScale.current;

    this.add.graphics().fillStyle(0x0a0a0f, 1).fillRect(0, 0, getCanvasWidth(), totalH);

    this.add.text(cx, UIScale.y(20), 'CHOOSE YOUR ENEMY', {
      fontSize: UIScale.font(22), color: '#ff4444', fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.text(cx, UIScale.y(44), 'Which faction will you face?', {
      fontSize: UIScale.font(10), color: '#888888', fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Random option
    const randomBtn = this.add.text(cx, UIScale.y(62), '[ Random Enemy ]', {
      fontSize: UIScale.font(12), color: '#ff44ff', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    randomBtn.on('pointerdown', () => {
      const playable = FACTION_ORDER.filter(f => f !== 'random');
      const pick = playable[Math.floor(Math.random() * playable.length)];
      this.launchNext(data, pick);
    });
    randomBtn.on('pointerover', () => randomBtn.setColor('#ff88ff'));
    randomBtn.on('pointerout', () => randomBtn.setColor('#ff44ff'));

    // Faction grid
    const playable = FACTION_ORDER.filter(f => f !== 'random');
    const fCols = s.factionCols;
    const cardW = s.compactCardW;
    const cardH = s.compactCardH;
    const gap = s.cardGap;
    const rows = Math.ceil(playable.length / fCols);
    const startY = UIScale.y(80);

    for (let i = 0; i < playable.length; i++) {
      const fid = playable[i];
      const faction = FACTIONS[fid];
      const col = i % fCols;
      const row = Math.floor(i / fCols);
      const rowCount = row < rows - 1 ? fCols : playable.length - (rows - 1) * fCols;
      const rowW = rowCount * cardW + (rowCount - 1) * gap;
      const rowStartX = cx - rowW / 2;
      const x = rowStartX + col * (cardW + gap);
      const y = startY + row * (cardH + gap);

      // Compact card
      const card = this.add.graphics();
      card.fillStyle(0x1a1a22, 1);
      card.fillRect(x, y, cardW, cardH);
      card.fillStyle(faction.primaryColor, 1);
      card.fillRect(x, y, cardW, 3);
      card.lineStyle(1, 0x333344, 0.6);
      card.strokeRect(x, y, cardW, cardH);

      // Faction name centered
      this.add.text(x + cardW / 2, y + cardH / 2, faction.name, {
        fontSize: UIScale.font(11), color: '#ffffff', fontFamily: 'monospace',
      }).setOrigin(0.5);

      // Click zone
      const zone = this.add.zone(x + cardW / 2, y + cardH / 2, cardW, cardH)
        .setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => this.launchNext(data, fid));
      zone.on('pointerover', () => {
        card.clear();
        card.fillStyle(0x222233, 1);
        card.fillRect(x, y, cardW, cardH);
        card.fillStyle(faction.primaryColor, 1);
        card.fillRect(x, y, cardW, 4);
        card.lineStyle(2, faction.primaryColor, 0.8);
        card.strokeRect(x, y, cardW, cardH);
      });
      zone.on('pointerout', () => {
        card.clear();
        card.fillStyle(0x1a1a22, 1);
        card.fillRect(x, y, cardW, cardH);
        card.fillStyle(faction.primaryColor, 1);
        card.fillRect(x, y, cardW, 4);
        card.lineStyle(1, 0x333344, 0.6);
        card.strokeRect(x, y, cardW, cardH);
      });
    }

    // Back button
    const backBtn = this.add.text(UIScale.space(30), totalH - UIScale.space(20), '[ Back ]', {
      fontSize: UIScale.font(12), color: '#888888', fontFamily: 'monospace',
    }).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.scene.start('FactionSelectScene', data));
  }

  private launchNext(data: any, creepFaction: FactionId): void {
    this.scene.start('DraftScene', {
      ...data,
      creepFaction,
    });
  }
}
