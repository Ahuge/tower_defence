/**
 * GauntletPreviewScene — shows the full stage order before starting the gauntlet.
 * Displays all 10 enemy factions in order with their homeworld names.
 * Player clicks "BEGIN GAUNTLET" to start.
 */
import Phaser from 'phaser';
import { getCanvasWidth } from '../config';
import { FACTIONS, FactionId } from '../data/Factions';
import { UIScale } from '../systems/UIScale';
import { ResponsiveManager } from '../systems/ResponsiveManager';
import { getGauntletFactions, shuffleArray, getGauntletMap } from '../data/GauntletMaps';

export class GauntletPreviewScene extends Phaser.Scene {
  constructor() {
    super('GauntletPreviewScene');
  }

  create(data: any): void {
    const cx = getCanvasWidth() / 2;
    const totalH = ResponsiveManager.canvasHeight();
    const s = UIScale.current;
    const playerFaction = data.faction as FactionId;

    this.add.graphics().fillStyle(0x0a0a0f, 1).fillRect(0, 0, getCanvasWidth(), totalH);

    // Title
    this.add.text(cx, UIScale.y(16), 'FACTION GAUNTLET', {
      fontSize: UIScale.font(22), color: '#ff4444', fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.text(cx, UIScale.y(38), `Playing as ${FACTIONS[playerFaction]?.name ?? playerFaction}`, {
      fontSize: UIScale.font(11), color: '#888888', fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Generate the stage order
    const stageOrder = shuffleArray(getGauntletFactions(playerFaction));

    // Store order in data to pass through (so GameScene uses same order)
    data.gauntletOrder = stageOrder;

    // Stage list
    this.add.text(cx, UIScale.y(56), '10 STAGES — DEFEAT ALL FACTIONS', {
      fontSize: UIScale.font(10), color: '#666666', fontFamily: 'monospace',
    }).setOrigin(0.5);

    const startY = UIScale.y(72);
    const rowH = UIScale.space(22);
    const listW = Math.min(getCanvasWidth() - 40, 600);
    const listX = cx - listW / 2;

    for (let i = 0; i < stageOrder.length; i++) {
      const fid = stageOrder[i];
      const faction = FACTIONS[fid];
      const mapDef = getGauntletMap(fid);
      const y = startY + i * rowH;

      // Stage number
      const numColor = i === 0 ? '#ff4444' : '#555555';
      this.add.text(listX, y, `${i + 1}.`, {
        fontSize: UIScale.font(12), color: numColor, fontFamily: 'monospace',
      });

      // Faction color bar
      const barX = listX + UIScale.space(20);
      const barG = this.add.graphics();
      barG.fillStyle(faction.primaryColor, i === 0 ? 1 : 0.5);
      barG.fillRect(barX, y + 2, 4, UIScale.space(14));

      // Faction name
      const nameColor = i === 0 ? '#ffffff' : '#aaaaaa';
      this.add.text(barX + UIScale.space(10), y, faction.name, {
        fontSize: UIScale.font(12), color: nameColor, fontFamily: 'monospace',
      });

      // Map name
      this.add.text(barX + UIScale.space(90), y, `— ${mapDef.name}`, {
        fontSize: UIScale.font(10), color: '#666666', fontFamily: 'monospace',
      });

      // Waves label
      const wavesLabel = i === 0 ? 'Waves 1-10' : `Waves ${i * 10 + 1}-${(i + 1) * 10}`;
      this.add.text(listX + listW, y, wavesLabel, {
        fontSize: UIScale.font(9), color: '#555555', fontFamily: 'monospace',
      }).setOrigin(1, 0);

      // First stage highlight
      if (i === 0) {
        const highlight = this.add.graphics();
        highlight.lineStyle(1, 0xff4444, 0.3);
        highlight.strokeRect(listX - 4, y - 2, listW + 8, rowH - 2);
        this.add.text(listX + listW, y + UIScale.space(10), '◄ FIRST', {
          fontSize: UIScale.font(8), color: '#ff4444', fontFamily: 'monospace',
        }).setOrigin(1, 0);
      }
    }

    // Summary
    const summaryY = startY + stageOrder.length * rowH + UIScale.space(10);
    this.add.text(cx, summaryY, `100 waves • 10 lives per stage • Frontier persists`, {
      fontSize: UIScale.font(9), color: '#555555', fontFamily: 'monospace',
    }).setOrigin(0.5);

    // BEGIN button
    const btnY = summaryY + UIScale.space(24);
    const btnW = UIScale.space(100);
    const btnH = UIScale.space(24);
    const btnG = this.add.graphics();
    btnG.fillStyle(0x881111, 1);
    btnG.fillRect(cx - btnW / 2, btnY, btnW, btnH);
    btnG.lineStyle(2, 0xff4444, 1);
    btnG.strokeRect(cx - btnW / 2, btnY, btnW, btnH);

    const btnText = this.add.text(cx, btnY + btnH / 2, 'BEGIN GAUNTLET', {
      fontSize: UIScale.font(14), color: '#ff4444', fontFamily: 'monospace',
    }).setOrigin(0.5);

    const btnZone = this.add.zone(cx, btnY + btnH / 2, btnW, btnH).setInteractive({ useHandCursor: true });
    btnZone.on('pointerdown', () => {
      this.scene.start('GameScene', data);
    });
    btnZone.on('pointerover', () => {
      btnG.clear();
      btnG.fillStyle(0xaa2222, 1);
      btnG.fillRect(cx - btnW / 2, btnY, btnW, btnH);
      btnG.lineStyle(2, 0xff6666, 1);
      btnG.strokeRect(cx - btnW / 2, btnY, btnW, btnH);
      btnText.setColor('#ffffff');
    });
    btnZone.on('pointerout', () => {
      btnG.clear();
      btnG.fillStyle(0x881111, 1);
      btnG.fillRect(cx - btnW / 2, btnY, btnW, btnH);
      btnG.lineStyle(2, 0xff4444, 1);
      btnG.strokeRect(cx - btnW / 2, btnY, btnW, btnH);
      btnText.setColor('#ff4444');
    });

    // Back button
    this.add.text(UIScale.space(20), totalH - UIScale.space(20), '[ Back ]', {
      fontSize: UIScale.font(11), color: '#888888', fontFamily: 'monospace',
    }).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('DraftScene', data));
  }
}
