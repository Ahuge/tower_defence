import Phaser from 'phaser';
import { CANVAS_WIDTH, GAME_HEIGHT } from '../config';
import { FACTION_ORDER, FACTIONS, FactionId } from '../data/Factions';
import { MatchMode } from '../data/WaveDefinitions';
import { MapId } from '../data/Maps';
import { TowerSelectBar } from '../ui/TowerSelectBar';

export class FactionSelectScene extends Phaser.Scene {
  private matchMode: MatchMode = 'standard';
  private mapId: MapId = 'plains';

  constructor() {
    super('FactionSelectScene');
  }

  init(data: { mode: MatchMode; map?: MapId }): void {
    this.matchMode = data.mode;
    this.mapId = data.map || 'plains';
  }

  create(): void {
    const totalH = GAME_HEIGHT + 28 + TowerSelectBar.BAR_HEIGHT;
    const cx = CANVAS_WIDTH / 2;

    this.add.text(cx, 50, 'Choose Your Faction', {
      fontSize: '28px', color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5);

    const cardW = 170;
    const cardH = 200;
    const gap = 12;
    const totalW = FACTION_ORDER.length * cardW + (FACTION_ORDER.length - 1) * gap;
    const startX = cx - totalW / 2;

    for (let i = 0; i < FACTION_ORDER.length; i++) {
      const factionId = FACTION_ORDER[i];
      const faction = FACTIONS[factionId];
      const x = startX + i * (cardW + gap);
      const y = 100;

      const card = this.add.graphics();
      card.fillStyle(0x222222, 1);
      card.fillRect(x, y, cardW, cardH);
      card.lineStyle(2, faction.primaryColor, 0.8);
      card.strokeRect(x, y, cardW, cardH);

      // Color strip
      card.fillStyle(faction.primaryColor, 0.6);
      card.fillRect(x, y, cardW, 8);

      this.add.text(x + cardW / 2, y + 30, faction.name, {
        fontSize: '18px', color: '#ffffff', fontFamily: 'monospace',
      }).setOrigin(0.5);

      // Description wrapped
      this.add.text(x + 8, y + 55, faction.description, {
        fontSize: '10px', color: '#aaaaaa', fontFamily: 'monospace',
        wordWrap: { width: cardW - 16 },
      });

      // Tower names
      const towerNames = faction.towerIds.map(id => {
        const t = this.getTowerName(id);
        return t;
      }).join('\n');

      this.add.text(x + 8, y + 110, 'Towers:', {
        fontSize: '10px', color: '#888888', fontFamily: 'monospace',
      });
      this.add.text(x + 8, y + 125, towerNames, {
        fontSize: '10px', color: '#dddddd', fontFamily: 'monospace',
      });

      // Interactive zone
      const zone = this.add.zone(x + cardW / 2, y + cardH / 2, cardW, cardH).setInteractive({ useHandCursor: true });
      zone.on('pointerover', () => {
        card.clear();
        card.fillStyle(0x333333, 1);
        card.fillRect(x, y, cardW, cardH);
        card.lineStyle(3, faction.primaryColor, 1);
        card.strokeRect(x, y, cardW, cardH);
        card.fillStyle(faction.primaryColor, 0.8);
        card.fillRect(x, y, cardW, 8);
      });
      zone.on('pointerout', () => {
        card.clear();
        card.fillStyle(0x222222, 1);
        card.fillRect(x, y, cardW, cardH);
        card.lineStyle(2, faction.primaryColor, 0.8);
        card.strokeRect(x, y, cardW, cardH);
        card.fillStyle(faction.primaryColor, 0.6);
        card.fillRect(x, y, cardW, 8);
      });
      zone.on('pointerdown', () => {
        this.scene.start('DraftScene', { mode: this.matchMode, faction: factionId, map: this.mapId });
      });
    }

    // "No faction" option
    this.add.text(cx, 330, '[ Play Generic (no faction) ]', {
      fontSize: '14px', color: '#666666', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.scene.start('DraftScene', { mode: this.matchMode, faction: null, map: this.mapId });
      })
      .on('pointerover', function(this: Phaser.GameObjects.Text) { this.setColor('#aaaaaa'); })
      .on('pointerout', function(this: Phaser.GameObjects.Text) { this.setColor('#666666'); });
  }

  private getTowerName(id: string): string {
    // Import would be circular-ish, just extract name from id
    const names: Record<string, string> = {
      arcane_bolt: 'Bolt (single)',
      arcane_storm: 'Storm (AoE)',
      arcane_frost: 'Frost (slow)',
      mech_turret: 'Turret (ramp DPS)',
      mech_tesla: 'Tesla (chain)',
      mech_wall: 'Wall (blocker)',
      nature_thorn: 'Thorn (DPS)',
      nature_root: 'Root (CC)',
      nature_blossom: 'Blossom (buff)',
      void_spike: 'Spike (variance)',
      void_siphon: 'Siphon (gold)',
      void_rift: 'Rift (teleport)',
    };
    return names[id] || id;
  }
}
