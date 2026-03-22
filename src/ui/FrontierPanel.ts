import { SIDEBAR_WIDTH, GAME_HEIGHT, getSidebarWidth } from '../config';
import { UIScale } from '../systems/UIScale';
import { ResponsiveManager } from '../systems/ResponsiveManager';
import { FrontierBuilding } from '../data/FrontierBuildings';
import { FrontierManager, OwnedBuilding } from '../systems/FrontierManager';
import { SendPanel } from './SendPanel';
import { UpcomingWaves } from './UpcomingWaves';

export class FrontierPanel {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private frontier: FrontierManager;
  private onPurchase: (building: FrontierBuilding) => void;
  private onAction: (action: string, buildingIdx: number) => void;
  private onBatchAction: (action: string, defId: string) => void;
  private ownedItems: Phaser.GameObjects.GameObject[] = [];
  private ownedStartY: number = 0;
  private grouped: boolean = true;
  private groupToggle!: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    frontier: FrontierManager,
    onPurchase: (building: FrontierBuilding) => void,
    onAction: (action: string, buildingIdx: number) => void,
    onBatchAction: (action: string, defId: string) => void,
  ) {
    this.scene = scene;
    this.frontier = frontier;
    this.onPurchase = onPurchase;
    this.onAction = onAction;
    this.onBatchAction = onBatchAction;

    const topY = UpcomingWaves.HEIGHT + SendPanel.HEIGHT;
    this.container = scene.add.container(0, topY).setDepth(28);

    this.buildPanel();
    this.updateOwned();
  }

  /** Rebuild purchase list (for Random faction rotation) */
  rebuildPurchaseList(): void {
    // Clear and rebuild entire container
    this.container.removeAll(true);
    this.ownedItems = [];
    this.buildPanel();
    this.updateOwned();
  }

  private buildPanel(): void {
    const panelW = getSidebarWidth();
    const totalSidebarH = ResponsiveManager.canvasHeight();
    const panelH = totalSidebarH - SendPanel.HEIGHT - UpcomingWaves.HEIGHT - UIScale.space(200);

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x111118, 1);
    bg.fillRect(0, 0, panelW, panelH);
    bg.lineStyle(1, 0x333333, 1);
    bg.strokeRect(0, 0, panelW, panelH);
    this.container.add(bg);

    const title = this.scene.add.text(8, 6, 'FRONTIER', {
      fontSize: UIScale.font(13), color: '#ffaa44', fontFamily: 'monospace',
    });
    this.container.add(title);

    const rh = UIScale.current.rowHeight;
    let y = UIScale.current.panelContentY;
    for (const building of this.frontier.availableBuildings) {
      const text = this.scene.add.text(8, y, `[Buy] ${building.name} (${building.cost}g)`, {
        fontSize: UIScale.font(12), color: '#cccccc', fontFamily: 'monospace',
      });
      this.container.add(text);
      text.setInteractive({ useHandCursor: true });
      text.on('pointerdown', () => this.onPurchase(building));
      text.on('pointerover', () => text.setColor('#ffffff'));
      text.on('pointerout', () => text.setColor('#cccccc'));
      y += rh;

      const desc = this.scene.add.text(12, y, building.description, {
        fontSize: UIScale.font(10), color: '#666666', fontFamily: 'monospace',
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

    // "Owned Buildings:" label + group toggle
    const ownedLabel = this.scene.add.text(8, y, 'Owned Buildings:', {
      fontSize: UIScale.font(13), color: '#88ff88', fontFamily: 'monospace',
    });
    this.container.add(ownedLabel);

    this.groupToggle = this.scene.add.text(panelW - 8, y, this.grouped ? '[v] Group' : '[ ] Group', {
      fontSize: UIScale.font(13), color: '#888888', fontFamily: 'monospace',
    }).setOrigin(1, 0);
    this.container.add(this.groupToggle);
    this.groupToggle.setInteractive({ useHandCursor: true });
    this.groupToggle.on('pointerdown', () => {
      this.grouped = !this.grouped;
      this.groupToggle.setText(this.grouped ? '[v] Group' : '[ ] Group');
      this.updateOwned();
    });
    this.groupToggle.on('pointerover', () => this.groupToggle.setColor('#ffffff'));
    this.groupToggle.on('pointerout', () => this.groupToggle.setColor('#888888'));

    this.ownedStartY = y + 16;
  }

  updateOwned(): void {
    for (const obj of this.ownedItems) {
      this.container.remove(obj, true);
    }
    this.ownedItems = [];

    const active = this.frontier.getActiveBuildings();
    let y = this.ownedStartY;

    if (active.length === 0) {
      const empty = this.scene.add.text(12, y, '(none)', {
        fontSize: UIScale.font(13), color: '#555555', fontFamily: 'monospace',
      });
      this.container.add(empty);
      this.ownedItems.push(empty);
      return;
    }

    if (this.grouped) {
      y = this.renderGrouped(active, y);
    } else {
      y = this.renderIndividual(active, y);
    }

    const totalIncome = active.reduce((sum, b) => sum + b.def.baseIncome, 0);
    const summary = this.scene.add.text(8, y + 4, `Frontier base income: +${totalIncome}/w`, {
      fontSize: UIScale.font(13), color: '#888888', fontFamily: 'monospace',
    });
    this.container.add(summary);
    this.ownedItems.push(summary);
  }

  private renderGrouped(active: OwnedBuilding[], startY: number): number {
    let y = startY;

    // Group by building def id
    const groups = new Map<string, OwnedBuilding[]>();
    for (const b of active) {
      const key = b.def.id;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(b);
    }

    for (const [defId, buildings] of groups) {
      const first = buildings[0];
      const count = buildings.length;
      const dormantCount = buildings.filter(b => b.dormantWaves > 0).length;
      const activeCount = count - dormantCount;

      // Name with count
      let label = `${first.def.name}`;
      if (count > 1) label += ` (x${count})`;

      let statusColor = '#aaffaa';
      let status = '';

      if (first.def.mechanic === 'overcharge' && dormantCount > 0) {
        status = dormantCount === count
          ? ' [all dormant]'
          : ` [${dormantCount} dormant]`;
        if (dormantCount === count) statusColor = '#888844';
      }
      if (first.def.mechanic === 'grow') {
        const totalGrowth = buildings.reduce((s, b) => s + b.growthStacks, 0);
        status = ` (total growth: ${totalGrowth})`;
      }
      if (first.def.mechanic === 'dig') {
        const avgDepth = Math.round(buildings.reduce((s, b) => s + b.digLevel, 0) / count);
        status = ` (avg depth: ${avgDepth})`;
      }

      const nameText = this.scene.add.text(12, y, `${label}${status}`, {
        fontSize: UIScale.font(13), color: statusColor, fontFamily: 'monospace',
      });
      this.container.add(nameText);
      this.ownedItems.push(nameText);
      y += UIScale.current.rowHeight;

      // Batch action button
      if (first.def.mechanic === 'overcharge' && activeCount > 0) {
        const btnLabel = activeCount > 1 ? `[Overcharge All (${activeCount})]` : '[Overcharge 3x]';
        y += this.createBatchButton(16, y, btnLabel, '#ffaa44', () => {
          this.onBatchAction('overcharge', defId);
        });
      } else if (first.def.mechanic === 'dig') {
        const btnLabel = count > 1 ? `[Dig All Deeper (${count})]` : '[Dig Deeper]';
        y += this.createBatchButton(16, y, btnLabel, '#cc8833', () => {
          this.onBatchAction('dig', defId);
        });
      } else if (first.def.mechanic === 'grow') {
        const totalPayout = buildings.reduce((s, b) => s + b.growthStacks * 5, 0);
        if (totalPayout > 0) {
          const btnLabel = count > 1 ? `[Harvest All (${totalPayout}g)]` : `[Harvest ${totalPayout}g]`;
          y += this.createBatchButton(16, y, btnLabel, '#44dd44', () => {
            this.onBatchAction('harvest', defId);
          });
        }
      }

      y += 2;
    }

    return y;
  }

  private renderIndividual(active: OwnedBuilding[], startY: number): number {
    let y = startY;

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
        fontSize: UIScale.font(13), color: statusColor, fontFamily: 'monospace',
      });
      this.container.add(nameText);
      this.ownedItems.push(nameText);
      y += UIScale.current.rowHeight;

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

    return y;
  }

  private createActionButton(x: number, y: number, label: string, color: string, onClick: () => void): number {
    const btn = this.scene.add.text(x, y, label, {
      fontSize: UIScale.font(13), color, fontFamily: 'monospace',
    });
    this.container.add(btn);
    btn.setInteractive({ useHandCursor: true });
    btn.on('pointerdown', onClick);
    btn.on('pointerover', () => btn.setColor('#ffffff'));
    btn.on('pointerout', () => btn.setColor(color));
    this.ownedItems.push(btn);
    return btn.height + 4;
  }

  private createBatchButton(x: number, y: number, label: string, color: string, onClick: () => void): number {
    return this.createActionButton(x, y, label, color, onClick);
  }

  getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }
}
