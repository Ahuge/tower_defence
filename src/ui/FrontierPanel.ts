import { getSidebarWidth } from '../config';
import { UIScale } from '../systems/UIScale';
import { ResponsiveManager } from '../systems/ResponsiveManager';
import { uiText, uiGraphics } from '../systems/UILayer';
import { FrontierBuilding } from '../data/FrontierBuildings';
import { FrontierManager, OwnedBuilding } from '../systems/FrontierManager';
import { SendPanel } from './SendPanel';
import { UpcomingWaves } from './UpcomingWaves';
import { PanelBase } from './PanelBase';

export class FrontierPanel extends PanelBase {
  private frontier: FrontierManager;
  private onPurchase: (building: FrontierBuilding) => void;
  private onAction: (action: string, buildingIdx: number) => void;
  private onBatchAction: (action: string, defId: string) => void;
  // Static items that persist across owned-section rebuilds
  private staticItems: Phaser.GameObjects.GameObject[] = [];
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
    super(scene, 0, UpcomingWaves.HEIGHT + SendPanel.HEIGHT, 28);
    this.frontier = frontier;
    this.onPurchase = onPurchase;
    this.onAction = onAction;
    this.onBatchAction = onBatchAction;

    this.buildStatic();
    this.updateOwned();
  }

  /** Rebuild purchase list (for Random faction rotation) */
  rebuildPurchaseList(): void {
    // Clear everything and rebuild
    for (const obj of this.staticItems) this.container.remove(obj, true);
    this.staticItems = [];
    this.clearDynamic();
    this.buildStatic();
    this.updateOwned();
  }

  private buildStatic(): void {
    const panelW = getSidebarWidth();
    const totalSidebarH = ResponsiveManager.canvasHeight();
    const panelH = totalSidebarH - SendPanel.HEIGHT - UpcomingWaves.HEIGHT - UIScale.space(200);

    const bg = uiGraphics(this.scene);
    bg.fillStyle(0x111118, 1);
    bg.fillRect(0, 0, panelW, panelH);
    bg.lineStyle(1, 0x333333, 1);
    bg.strokeRect(0, 0, panelW, panelH);
    this.container.add(bg);
    this.staticItems.push(bg);

    const title = uiText(this.scene, 8, 6, 'FRONTIER', {
      fontSize: UIScale.font(13), color: '#ffaa44', fontFamily: 'monospace',
    });
    this.container.add(title);
    this.staticItems.push(title);

    const rh = UIScale.current.rowHeight;
    let y = UIScale.current.panelContentY;
    for (const building of this.frontier.availableBuildings) {
      const text = uiText(this.scene, 8, y, `[Buy] ${building.name} (${building.cost}g)`, {
        fontSize: UIScale.font(12), color: '#cccccc', fontFamily: 'monospace',
      });
      this.container.add(text);
      this.staticItems.push(text);
      text.setInteractive({ useHandCursor: true });
      text.on('pointerdown', () => this.onPurchase(building));
      text.on('pointerover', () => text.setColor('#ffffff'));
      text.on('pointerout', () => text.setColor('#cccccc'));
      y += rh;

      const desc = uiText(this.scene, 12, y, building.description, {
        fontSize: UIScale.font(10), color: '#666666', fontFamily: 'monospace',
        wordWrap: { width: panelW - 20 },
      });
      this.container.add(desc);
      this.staticItems.push(desc);
      y += desc.height + 8;
    }

    const divider = uiGraphics(this.scene);
    divider.lineStyle(1, 0x444444, 0.5);
    divider.lineBetween(8, y, panelW - 8, y);
    this.container.add(divider);
    this.staticItems.push(divider);
    y += 6;

    const ownedLabel = uiText(this.scene, 8, y, 'Owned Buildings:', {
      fontSize: UIScale.font(13), color: '#88ff88', fontFamily: 'monospace',
    });
    this.container.add(ownedLabel);
    this.staticItems.push(ownedLabel);

    this.groupToggle = uiText(this.scene, panelW - 8, y, this.grouped ? '[v] Group' : '[ ] Group', {
      fontSize: UIScale.font(13), color: '#888888', fontFamily: 'monospace',
    }).setOrigin(1, 0);
    this.container.add(this.groupToggle);
    this.staticItems.push(this.groupToggle);
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

  /** Rebuild the owned buildings section (uses PanelBase dynamic items) */
  updateOwned(): void {
    this.clearDynamic();
    const active = this.frontier.getActiveBuildings();
    let y = this.ownedStartY;

    if (active.length === 0) {
      this.dText(12, y, '(none)', { fontSize: UIScale.font(13), color: '#555555', fontFamily: 'monospace' });
      return;
    }

    if (this.grouped) {
      y = this.renderGrouped(active, y);
    } else {
      y = this.renderIndividual(active, y);
    }

    const totalIncome = active.reduce((sum, b) => sum + b.def.baseIncome, 0);
    this.dText(8, y + 4, `Frontier base income: +${totalIncome}/w`, {
      fontSize: UIScale.font(13), color: '#888888', fontFamily: 'monospace',
    });
  }

  private renderGrouped(active: OwnedBuilding[], startY: number): number {
    let y = startY;
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

      let label = first.def.name;
      if (count > 1) label += ` (x${count})`;

      let statusColor = '#aaffaa';
      let status = '';
      if (first.def.mechanic === 'overcharge' && dormantCount > 0) {
        status = dormantCount === count ? ' [all dormant]' : ` [${dormantCount} dormant]`;
        if (dormantCount === count) statusColor = '#888844';
      }
      if (first.def.mechanic === 'grow') {
        status = ` (total growth: ${buildings.reduce((s, b) => s + b.growthStacks, 0)})`;
      }
      if (first.def.mechanic === 'dig') {
        status = ` (avg depth: ${Math.round(buildings.reduce((s, b) => s + b.digLevel, 0) / count)})`;
      }

      this.dText(12, y, `${label}${status}`, { fontSize: UIScale.font(13), color: statusColor, fontFamily: 'monospace' });
      y += UIScale.current.rowHeight;

      if (first.def.mechanic === 'overcharge' && activeCount > 0) {
        y += this.createButton(16, y, activeCount > 1 ? `[Overcharge All (${activeCount})]` : '[Overcharge 3x]', '#ffaa44',
          () => this.onBatchAction('overcharge', defId));
      } else if (first.def.mechanic === 'dig') {
        y += this.createButton(16, y, count > 1 ? `[Dig All Deeper (${count})]` : '[Dig Deeper]', '#cc8833',
          () => this.onBatchAction('dig', defId));
      } else if (first.def.mechanic === 'grow') {
        const totalPayout = buildings.reduce((s, b) => s + b.growthStacks * 5, 0);
        if (totalPayout > 0) {
          y += this.createButton(16, y, count > 1 ? `[Harvest All (${totalPayout}g)]` : `[Harvest ${totalPayout}g]`, '#44dd44',
            () => this.onBatchAction('harvest', defId));
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
      let status = '', statusColor = '#aaffaa';
      if (b.dormantWaves > 0) { status = ` [dormant ${b.dormantWaves}w]`; statusColor = '#888844'; }
      if (b.def.mechanic === 'grow') status = ` (growth: ${b.growthStacks})`;
      if (b.def.mechanic === 'dig') status = ` (depth: ${b.digLevel})`;

      this.dText(12, y, `${b.def.name}${status}`, { fontSize: UIScale.font(13), color: statusColor, fontFamily: 'monospace' });
      y += UIScale.current.rowHeight;

      const idx = i;
      if (b.def.mechanic === 'overcharge' && b.dormantWaves === 0) {
        y += this.createButton(16, y, '[Overcharge 3x]', '#ffaa44', () => this.onAction('overcharge', idx));
      } else if (b.def.mechanic === 'dig') {
        y += this.createButton(16, y, '[Dig Deeper]', '#cc8833', () => this.onAction('dig', idx));
      } else if (b.def.mechanic === 'grow' && b.growthStacks > 0) {
        y += this.createButton(16, y, `[Harvest ${b.growthStacks * 5}g]`, '#44dd44', () => this.onAction('harvest', idx));
      }
      y += 2;
    }
    return y;
  }

  private createButton(x: number, y: number, label: string, color: string, onClick: () => void): number {
    const btn = this.dText(x, y, label, { fontSize: UIScale.font(13), color, fontFamily: 'monospace' });
    btn.setInteractive({ useHandCursor: true });
    btn.on('pointerdown', onClick);
    btn.on('pointerover', () => btn.setColor('#ffffff'));
    btn.on('pointerout', () => btn.setColor(color));
    return btn.height + 4;
  }
}
