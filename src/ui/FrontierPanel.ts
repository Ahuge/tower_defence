import { SIDEBAR_WIDTH, GAME_HEIGHT } from '../config';
import { FrontierBuilding } from '../data/FrontierBuildings';
import { FrontierManager } from '../systems/FrontierManager';
import { SendPanel } from './SendPanel';

export class FrontierPanel {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private frontier: FrontierManager;
  private onPurchase: (building: FrontierBuilding) => void;
  private onAction: (action: string, buildingIdx: number) => void;
  private ownedContainer: Phaser.GameObjects.Container;
  private ownedTexts: Phaser.GameObjects.GameObject[] = [];

  constructor(
    scene: Phaser.Scene,
    frontier: FrontierManager,
    onPurchase: (building: FrontierBuilding) => void,
    onAction: (action: string, buildingIdx: number) => void,
  ) {
    this.scene = scene;
    this.frontier = frontier;
    this.onPurchase = onPurchase;
    this.onAction = onAction;

    const topY = SendPanel.HEIGHT;
    this.container = scene.add.container(0, topY).setDepth(28);
    this.ownedContainer = scene.add.container(0, 0).setDepth(28);
    this.container.add(this.ownedContainer);

    this.buildPanel();
  }

  private buildPanel(): void {
    const panelW = SIDEBAR_WIDTH;
    const panelH = GAME_HEIGHT - SendPanel.HEIGHT;

    // Background
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x111118, 1);
    bg.fillRect(0, 0, panelW, panelH);
    bg.lineStyle(1, 0x333333, 1);
    bg.strokeRect(0, 0, panelW, panelH);
    this.container.add(bg);

    const title = this.scene.add.text(8, 6, 'FRONTIER', {
      fontSize: '11px', color: '#ffaa44', fontFamily: 'monospace',
    });
    this.container.add(title);

    // Available buildings to purchase
    let y = 26;
    for (const building of this.frontier.availableBuildings) {
      const text = this.scene.add.text(8, y, `[Buy] ${building.name} (${building.cost}g)`, {
        fontSize: '10px', color: '#cccccc', fontFamily: 'monospace',
      }).setInteractive({ useHandCursor: true });

      text.on('pointerdown', () => this.onPurchase(building));
      text.on('pointerover', () => text.setColor('#ffffff'));
      text.on('pointerout', () => text.setColor('#cccccc'));
      this.container.add(text);
      y += 14;

      const desc = this.scene.add.text(12, y, building.description, {
        fontSize: '8px', color: '#666666', fontFamily: 'monospace',
        wordWrap: { width: panelW - 20 },
      });
      this.container.add(desc);
      y += desc.height + 8;
    }

    // Divider
    const divider = this.scene.add.graphics();
    divider.lineStyle(1, 0x444444, 0.5);
    divider.lineBetween(8, y, panelW - 8, y);
    this.container.add(divider);
    y += 6;

    // "Owned" label
    const ownedLabel = this.scene.add.text(8, y, 'Owned Buildings:', {
      fontSize: '10px', color: '#88ff88', fontFamily: 'monospace',
    });
    this.container.add(ownedLabel);

    // The owned container starts below the "Owned" label
    this.ownedContainer.setPosition(0, y + 16);
  }

  updateOwned(): void {
    // Clear old
    for (const obj of this.ownedTexts) obj.destroy();
    this.ownedTexts = [];

    const active = this.frontier.getActiveBuildings();

    if (active.length === 0) {
      const empty = this.scene.add.text(12, 0, '(none)', {
        fontSize: '9px', color: '#555555', fontFamily: 'monospace',
      });
      this.ownedContainer.add(empty);
      this.ownedTexts.push(empty);
      return;
    }

    let y = 0;
    for (let i = 0; i < active.length; i++) {
      const b = active[i];

      // Building name + status
      let status = '';
      let statusColor = '#aaffaa';
      if (b.dormantWaves > 0) {
        status = ` [dormant ${b.dormantWaves}w]`;
        statusColor = '#888844';
      }
      if (b.def.mechanic === 'grow') status = ` (growth: ${b.growthStacks})`;
      if (b.def.mechanic === 'dig') status = ` (depth: ${b.digLevel})`;

      const nameText = this.scene.add.text(12, y, `${b.def.name}${status}`, {
        fontSize: '9px', color: statusColor, fontFamily: 'monospace',
      });
      this.ownedContainer.add(nameText);
      this.ownedTexts.push(nameText);
      y += 14;

      // Action button based on mechanic
      const idx = i;
      if (b.def.mechanic === 'overcharge' && b.dormantWaves === 0) {
        const btn = this.createActionButton(16, y, '[Overcharge 3x]', '#ffaa44', () => {
          this.onAction('overcharge', idx);
        });
        y += btn.height + 4;
      } else if (b.def.mechanic === 'dig') {
        const btn = this.createActionButton(16, y, '[Dig Deeper]', '#cc8833', () => {
          this.onAction('dig', idx);
        });
        y += btn.height + 4;
      } else if (b.def.mechanic === 'grow' && b.growthStacks > 0) {
        const payout = b.growthStacks * 5;
        const btn = this.createActionButton(16, y, `[Harvest ${payout}g]`, '#44dd44', () => {
          this.onAction('harvest', idx);
        });
        y += btn.height + 4;
      }

      y += 2;
    }

    // Frontier income summary
    const totalIncome = active.reduce((sum, b) => sum + b.def.baseIncome, 0);
    const summary = this.scene.add.text(8, y + 4, `Frontier base income: +${totalIncome}/w`, {
      fontSize: '9px', color: '#888888', fontFamily: 'monospace',
    });
    this.ownedContainer.add(summary);
    this.ownedTexts.push(summary);
  }

  private createActionButton(x: number, y: number, label: string, color: string, onClick: () => void): Phaser.GameObjects.Text {
    const btn = this.scene.add.text(x, y, label, {
      fontSize: '9px', color, fontFamily: 'monospace',
    }).setInteractive({ useHandCursor: true });

    btn.on('pointerdown', onClick);
    btn.on('pointerover', () => btn.setColor('#ffffff'));
    btn.on('pointerout', () => btn.setColor(color));

    this.ownedContainer.add(btn);
    this.ownedTexts.push(btn);
    return btn;
  }
}
