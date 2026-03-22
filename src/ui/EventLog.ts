import { SIDEBAR_WIDTH, GAME_HEIGHT } from '../config';
import { UIScale } from '../systems/UIScale';
import { TowerSelectBar } from './TowerSelectBar';

const MAX_LINES = 12;

export class EventLog {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private lines: string[] = [];
  private textObj: Phaser.GameObjects.Text;
  private panelY: number;
  private panelH: number;

  constructor(scene: Phaser.Scene, topY: number) {
    this.scene = scene;
    this.panelY = topY;
    this.panelH = GAME_HEIGHT + 28 + TowerSelectBar.BAR_HEIGHT - topY;

    this.container = scene.add.container(0, topY).setDepth(28);

    // Background
    const bg = scene.add.graphics();
    bg.fillStyle(0x0a0a10, 1);
    bg.fillRect(0, 0, SIDEBAR_WIDTH, this.panelH);
    bg.lineStyle(1, 0x333333, 1);
    bg.strokeRect(0, 0, SIDEBAR_WIDTH, this.panelH);
    this.container.add(bg);

    // Title
    const title = scene.add.text(8, 4, 'EVENT LOG', {
      fontSize: UIScale.font(10), color: '#666688', fontFamily: 'monospace',
    });
    this.container.add(title);

    // Log text
    this.textObj = scene.add.text(8, 20, '', {
      fontSize: UIScale.font(10), color: '#999999', fontFamily: 'monospace',
      lineSpacing: UIScale.isPhone ? 4 : 2,
      wordWrap: { width: SIDEBAR_WIDTH - 16 },
    });
    this.container.add(this.textObj);
  }

  log(message: string, color?: string): void {
    const prefix = color ? `[color=${color}]` : '';
    this.lines.push(message);
    if (this.lines.length > MAX_LINES) {
      this.lines.shift();
    }
    this.textObj.setText(this.lines.join('\n'));
  }

  /** Convenience loggers with consistent formatting */
  waveStarted(waveNum: number, totalWaves: number, creepTypes: string[]): void {
    const types = creepTypes.length > 0 ? `: ${creepTypes.join(', ')}` : '';
    this.log(`Wave ${waveNum}/${totalWaves} started${types}`);
  }

  waveCleared(waveNum: number, income: number): void {
    this.log(`Wave ${waveNum} cleared! +${income}g income`);
  }

  frontierIncome(buildingName: string, amount: number): void {
    this.log(`${buildingName}: +${amount}g`);
  }

  towerBuilt(name: string, cost: number): void {
    this.log(`Built ${name} (-${cost}g)`);
  }

  towerSold(name: string, refund: number): void {
    this.log(`Sold ${name} (+${refund}g)`);
  }

  sendQueued(name: string, cost: number): void {
    this.log(`Send: ${name} (-${cost}g)`);
  }

  frontierPurchased(name: string, cost: number): void {
    this.log(`Frontier: ${name} (-${cost}g)`);
  }

  frontierAction(action: string, result: string): void {
    this.log(`${action}: ${result}`);
  }

  creepReached(): void {
    this.log(`Creep reached exit! -1 life`);
  }

  gameMessage(msg: string): void {
    this.log(msg);
  }

  getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }
}
