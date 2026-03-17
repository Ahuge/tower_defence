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
  private ownedItems: Phaser.GameObjects.GameObject[] = [];
  private ownedStartY: number = 0;

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

    this.buildPanel();
    this.updateOwned();
  }

  private buildPanel(): void {
    const panelW = SIDEBAR_WIDTH;
    const panelH = GAME_HEIGHT - SendPanel.HEIGHT;

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

    let y = 26;
    for (const building of this.frontier.availableBuildings) {
      const text = this.scene.add.text(8, y, `[Buy] ${building.name} (${building.cost}g)`, {
        fontSize: '10px', color: '#cccccc', fontFamily: 'monospace',
      });
      this.container.add(text);
      text.setInteractive({ useHandCursor: true });
      text.on('pointerdown', () => this.onPurchase(building));
      text.on('pointerover', () => text.setColor('#ffffff'));
      text.on('pointerout', () => text.setColor('#cccccc'));
      y += 14;

      const desc = this.scene.add.text(12, y, building.description, {
        fontSize: '8px', color: '#666666', fontFamily: 'monospace',
        wordWrap: { width: panelW - 20 },
      });
      this.container.add(desc);
      y += desc.height + 8;
    }

    const divider = this.scene.add.graphics();
    divider.lineStyle(1, 0x444444, 0.5);
    divider.lineBetween(8, y, panelW - 8, y);
    this.container.add(divider);
    y += 6;

    const ownedLabel = this.scene.add.text(8, y, 'Owned Buildings:', {
      fontSize: '10px', color: '#88ff88', fontFamily: 'monospace',
    });
    this.container.add(ownedLabel);

    this.ownedStartY = y + 16;
  }

  updateOwned(): void {
    // Remove old owned items from container and destroy
    for (const obj of this.ownedItems) {
      this.container.remove(obj, true);
    }
    this.ownedItems = [];

    const active = this.frontier.getActiveBuildings();
    let y = this.ownedStartY;

    if (active.length === 0) {
      const empty = this.scene.add.text(12, y, '(none)', {
        fontSize: '9px', color: '#555555', fontFamily: 'monospace',
      });
      this.container.add(empty);
      this.ownedItems.push(empty);
      return;
    }

    for (let i = 0; i < active.length; i++) {
      const b = active[i];

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
      this.container.add(nameText);
      this.ownedItems.push(nameText);
      y += 14;

      const idx = i;
      if (b.def.mechanic === 'overcharge' && b.dormantWaves === 0) {
        y += this.createActionButton(16, y, '[Overcharge 3x]', '#ffaa44', () => {
          this.onAction('overcharge', idx);
        });
      } else if (b.def.mechanic === 'dig') {
        y += this.createActionButton(16, y, '[Dig Deeper]', '#cc8833', () => {
          this.onAction('dig', idx);
        });
      } else if (b.def.mechanic === 'grow' && b.growthStacks > 0) {
        const payout = b.growthStacks * 5;
        y += this.createActionButton(16, y, `[Harvest ${payout}g]`, '#44dd44', () => {
          this.onAction('harvest', idx);
        });
      }

      y += 2;
    }

    const totalIncome = active.reduce((sum, b) => sum + b.def.baseIncome, 0);
    const summary = this.scene.add.text(8, y + 4, `Frontier base income: +${totalIncome}/w`, {
      fontSize: '9px', color: '#888888', fontFamily: 'monospace',
    });
    this.container.add(summary);
    this.ownedItems.push(summary);
  }

  private createActionButton(x: number, y: number, label: string, color: string, onClick: () => void): number {
    const btn = this.scene.add.text(x, y, label, {
      fontSize: '9px', color, fontFamily: 'monospace',
    });
    this.container.add(btn);
    btn.setInteractive({ useHandCursor: true });
    btn.on('pointerdown', onClick);
    btn.on('pointerover', () => btn.setColor('#ffffff'));
    btn.on('pointerout', () => btn.setColor(color));

    this.ownedItems.push(btn);
    return btn.height + 4;
  }
}
