import { SIDEBAR_WIDTH, getSidebarWidth } from '../config';
import { SEND_OPTIONS, SendCreepOption, getSendCost, getSendIncome } from '../data/SendCreepTypes';
import { UIScale } from '../systems/UIScale';

const SEND_HOTKEYS = ['Z', 'X', 'C', 'V', '1', '2', '3', '4'];

export class SendPanel {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private onSend: (option: SendCreepOption, scaledCost: number, scaledIncome: number) => void;
  private currentWave: number = 0;
  private labels: { text: Phaser.GameObjects.Text; opt: SendCreepOption; hotkey: string }[] = [];
  private hotkeyListeners: (() => void)[] = [];

  static readonly HEIGHT = UIScale.isPhone ? 260 : 100;

  constructor(
    scene: Phaser.Scene,
    onSend: (option: SendCreepOption, scaledCost: number, scaledIncome: number) => void,
    yOffset: number = 0,
  ) {
    this.scene = scene;
    this.onSend = onSend;
    this.container = scene.add.container(0, yOffset).setDepth(28);

    this.buildPanel();
    this.registerHotkeys();
  }

  /** Call when wave changes to update send availability and costs */
  setWave(wave: number): void {
    if (wave === this.currentWave) return;
    this.currentWave = wave;
    this.updateLabels();
  }

  private buildPanel(): void {
    const panelW = getSidebarWidth();
    const panelH = SendPanel.HEIGHT;

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x151515, 1);
    bg.fillRect(0, 0, panelW, panelH);
    bg.lineStyle(1, 0x333333, 1);
    bg.strokeRect(0, 0, panelW, panelH);
    this.container.add(bg);

    const title = this.scene.add.text(8, 6, 'SENDS', {
      fontSize: UIScale.font(13), color: '#ff8844', fontFamily: 'monospace',
    });
    this.container.add(title);

    const subtitle = this.scene.add.text(UIScale.isPhone ? 80 : 60, 7, '(between waves)', {
      fontSize: UIScale.font(13), color: '#666666', fontFamily: 'monospace',
    });
    this.container.add(subtitle);

    this.labels = [];
    const rowH = UIScale.current.rowHeight;
    const fontSize = UIScale.font(10);
    for (let i = 0; i < SEND_OPTIONS.length; i++) {
      const opt = SEND_OPTIONS[i];
      const hotkey = SEND_HOTKEYS[i] || '';
      const y = 24 + i * rowH;

      const text = this.scene.add.text(8, y, '', {
        fontSize, color: '#cccccc', fontFamily: 'monospace',
      });

      this.container.add(text);
      text.setInteractive({ useHandCursor: true });
      text.on('pointerdown', () => {
        const cost = getSendCost(opt.cost, this.currentWave);
        const income = getSendIncome(opt.incomeReward, this.currentWave);
        this.onSend(opt, cost, income);
      });
      text.on('pointerover', () => {
        if (this.currentWave >= opt.unlockWave) text.setColor('#ffffff');
      });
      text.on('pointerout', () => {
        this.updateLabelColor(text, opt);
      });

      this.labels.push({ text, opt, hotkey });
    }

    this.updateLabels();
  }

  private updateLabels(): void {
    // Partition into unlocked and locked
    const unlocked = this.labels.filter(l => this.currentWave >= l.opt.unlockWave);
    const locked = this.labels.filter(l => this.currentWave < l.opt.unlockWave);
    const rh = UIScale.current.rowHeight;

    // Position unlocked sends first
    let idx = 0;
    for (const l of unlocked) {
      const y = 24 + idx * rh;
      const cost = getSendCost(l.opt.cost, this.currentWave);
      const income = getSendIncome(l.opt.incomeReward, this.currentWave);
      const tierTag = l.opt.tier >= 2 ? ' T2' : '';
      const label = l.hotkey
        ? `[${l.hotkey}] ${l.opt.name} (${cost}g) +${income}/w${tierTag}`
        : `${l.opt.name} (${cost}g) +${income}/w${tierTag}`;
      l.text.setText(label);
      l.text.setY(y);
      l.text.setVisible(true);
      this.updateLabelColor(l.text, l.opt);
      idx++;
    }

    // Show next unlock hint if any locked sends exist
    for (const l of locked) {
      const y = 24 + idx * rh;
      l.text.setText(`  ${l.opt.name} — unlocks wave ${l.opt.unlockWave}`);
      l.text.setY(y);
      l.text.setVisible(true);
      l.text.setColor('#444444');
      idx++;
    }

    // Resize panel height dynamically
    const neededH = Math.max(SendPanel.HEIGHT, 28 + idx * rh);
    if (neededH !== this._currentH) {
      this._currentH = neededH;
      // Redraw background
      const bg = this.container.getAt(0) as Phaser.GameObjects.Graphics;
      bg.clear();
      bg.fillStyle(0x151515, 1);
      bg.fillRect(0, 0, getSidebarWidth(), neededH);
      bg.lineStyle(1, 0x333333, 1);
      bg.strokeRect(0, 0, getSidebarWidth(), neededH);
    }
  }

  private _currentH = SendPanel.HEIGHT;

  private updateLabelColor(text: Phaser.GameObjects.Text, opt: SendCreepOption): void {
    if (this.currentWave < opt.unlockWave) {
      text.setColor('#444444');
    } else if (opt.tier >= 2) {
      text.setColor('#88aaff');
    } else {
      text.setColor('#cccccc');
    }
  }

  private registerHotkeys(): void {
    // Clean up old listeners
    for (const cleanup of this.hotkeyListeners) cleanup();
    this.hotkeyListeners = [];

    for (let i = 0; i < SEND_OPTIONS.length && i < SEND_HOTKEYS.length; i++) {
      const opt = SEND_OPTIONS[i];
      const key = SEND_HOTKEYS[i];
      const handler = () => {
        if (this.currentWave < opt.unlockWave) return;
        const cost = getSendCost(opt.cost, this.currentWave);
        const income = getSendIncome(opt.incomeReward, this.currentWave);
        this.onSend(opt, cost, income);
      };
      this.scene.input.keyboard!.on(`keydown-${key}`, handler);
      this.hotkeyListeners.push(() => {
        this.scene.input.keyboard!.off(`keydown-${key}`, handler);
      });
    }
  }

  getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }

  getHeight(): number {
    return this._currentH;
  }
}
