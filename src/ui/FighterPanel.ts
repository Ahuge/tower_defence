import { CANVAS_WIDTH, GAME_HEIGHT } from '../config';
import { FighterType, getFighterTypesForFaction } from '../data/FighterTypes';
import { FactionId } from '../data/Factions';
import { TowerSelectBar } from './TowerSelectBar';

export class FighterPanel {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private fighterTypes: FighterType[];
  private onPurchase: (fighterType: FighterType) => void;

  constructor(scene: Phaser.Scene, faction: FactionId, onPurchase: (fighterType: FighterType) => void) {
    this.scene = scene;
    this.onPurchase = onPurchase;
    this.fighterTypes = getFighterTypesForFaction(faction);
    this.container = scene.add.container(CANVAS_WIDTH - 180, GAME_HEIGHT + 28).setDepth(30);

    this.buildPanel();
  }

  private buildPanel(): void {
    if (this.fighterTypes.length === 0) return;

    const label = this.scene.add.text(0, 8, 'Fighters:', {
      fontSize: '10px', color: '#888888', fontFamily: 'monospace',
    });
    this.container.add(label);

    for (let i = 0; i < this.fighterTypes.length; i++) {
      const ft = this.fighterTypes[i];
      const y = 22 + i * 14;

      const text = this.scene.add.text(0, y, `[F${i + 1}] ${ft.name} (${ft.cost}g)`, {
        fontSize: '10px', color: '#cccccc', fontFamily: 'monospace',
      }).setInteractive({ useHandCursor: true });

      text.on('pointerdown', () => this.onPurchase(ft));
      text.on('pointerover', () => text.setColor('#ffffff'));
      text.on('pointerout', () => text.setColor('#cccccc'));

      this.container.add(text);
    }

    for (let i = 0; i < this.fighterTypes.length; i++) {
      const ft = this.fighterTypes[i];
      this.scene.input.keyboard!.on(`keydown-F${i + 1}`, () => {
        this.onPurchase(ft);
      });
    }
  }
}
