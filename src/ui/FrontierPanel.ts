import { GAME_WIDTH } from '../config';
import { FrontierBuilding } from '../data/FrontierBuildings';
import { FrontierManager } from '../systems/FrontierManager';

export class FrontierPanel {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private frontier: FrontierManager;
  private onPurchase: (building: FrontierBuilding) => void;
  private visible: boolean = false;
  private contentTexts: Phaser.GameObjects.Text[] = [];
  private bg: Phaser.GameObjects.Graphics;
  private toggleBtn: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, frontier: FrontierManager, onPurchase: (building: FrontierBuilding) => void) {
    this.scene = scene;
    this.frontier = frontier;
    this.onPurchase = onPurchase;

    this.container = scene.add.container(0, 0).setDepth(26).setVisible(false);

    const panelX = GAME_WIDTH - 220;
    const panelY = 80;
    const panelW = 210;
    const panelH = 240;

    this.bg = scene.add.graphics();
    this.bg.fillStyle(0x111111, 0.95);
    this.bg.fillRect(panelX, panelY, panelW, panelH);
    this.bg.lineStyle(1, 0x666666, 1);
    this.bg.strokeRect(panelX, panelY, panelW, panelH);
    this.container.add(this.bg);

    scene.add.text(panelX + 4, panelY + 4, 'FRONTIER', {
      fontSize: '12px', color: '#ffaa44', fontFamily: 'monospace',
    }).setDepth(26);
    this.container.add(scene.children.getAt(scene.children.length - 1) as Phaser.GameObjects.Text);

    // Available buildings
    let y = panelY + 24;
    for (const building of frontier.availableBuildings) {
      const text = scene.add.text(panelX + 4, y, `${building.name} (${building.cost}g) +${building.baseIncome}/w`, {
        fontSize: '9px', color: '#cccccc', fontFamily: 'monospace',
      }).setInteractive({ useHandCursor: true }).setDepth(26);

      text.on('pointerdown', () => this.onPurchase(building));
      text.on('pointerover', () => text.setColor('#ffffff'));
      text.on('pointerout', () => text.setColor('#cccccc'));

      this.container.add(text);
      y += 14;

      const desc = scene.add.text(panelX + 8, y, building.description, {
        fontSize: '8px', color: '#888888', fontFamily: 'monospace',
        wordWrap: { width: panelW - 16 },
      }).setDepth(26);
      this.container.add(desc);
      y += desc.height + 6;
    }

    // Owned buildings section
    const ownedLabel = scene.add.text(panelX + 4, y + 4, 'Owned:', {
      fontSize: '10px', color: '#88ff88', fontFamily: 'monospace',
    }).setDepth(26);
    this.container.add(ownedLabel);

    // Toggle button
    this.toggleBtn = scene.add.text(GAME_WIDTH - 80, 60, '[Frontier]', {
      fontSize: '10px', color: '#ffaa44', fontFamily: 'monospace',
    }).setDepth(27).setInteractive({ useHandCursor: true });

    this.toggleBtn.on('pointerdown', () => this.toggle());
  }

  toggle(): void {
    this.visible = !this.visible;
    this.container.setVisible(this.visible);
  }

  updateOwned(): void {
    // Clear old owned texts
    for (const t of this.contentTexts) t.destroy();
    this.contentTexts = [];

    const active = this.frontier.getActiveBuildings();
    const panelX = GAME_WIDTH - 220;
    let y = 80 + 24 + this.frontier.availableBuildings.length * 30 + 20;

    for (const b of active) {
      let status = '';
      if (b.dormantWaves > 0) status = ` (dormant ${b.dormantWaves}w)`;
      if (b.def.mechanic === 'grow') status = ` (growth: ${b.growthStacks})`;
      if (b.def.mechanic === 'dig') status = ` (depth: ${b.digLevel})`;

      const t = this.scene.add.text(panelX + 8, y, `${b.def.name}${status}`, {
        fontSize: '9px', color: '#aaffaa', fontFamily: 'monospace',
      }).setDepth(26);
      this.container.add(t);
      this.contentTexts.push(t);
      y += 14;
    }
  }
}
