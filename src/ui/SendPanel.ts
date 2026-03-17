import { SIDEBAR_WIDTH } from '../config';
import { SEND_OPTIONS, SendCreepOption } from '../data/SendCreepTypes';

const SEND_HOTKEYS = ['Z', 'X', 'C', 'V'];

export class SendPanel {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private onSend: (option: SendCreepOption) => void;

  static readonly HEIGHT = 100;

  constructor(scene: Phaser.Scene, onSend: (option: SendCreepOption) => void, yOffset: number = 0) {
    this.scene = scene;
    this.onSend = onSend;
    this.container = scene.add.container(0, yOffset).setDepth(28);

    this.buildPanel();
    this.registerHotkeys();
  }

  private buildPanel(): void {
    const panelW = SIDEBAR_WIDTH;
    const panelH = SendPanel.HEIGHT;

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x151515, 1);
    bg.fillRect(0, 0, panelW, panelH);
    bg.lineStyle(1, 0x333333, 1);
    bg.strokeRect(0, 0, panelW, panelH);
    this.container.add(bg);

    const title = this.scene.add.text(8, 6, 'SENDS', {
      fontSize: '11px', color: '#ff8844', fontFamily: 'monospace',
    });
    this.container.add(title);

    const subtitle = this.scene.add.text(60, 7, '(between waves)', {
      fontSize: '9px', color: '#666666', fontFamily: 'monospace',
    });
    this.container.add(subtitle);

    for (let i = 0; i < SEND_OPTIONS.length; i++) {
      const opt = SEND_OPTIONS[i];
      const hotkey = SEND_HOTKEYS[i] || '';
      const y = 24 + i * 17;

      const label = hotkey
        ? `[${hotkey}] ${opt.name} (${opt.cost}g) +${opt.incomeReward}/w`
        : `${opt.name} (${opt.cost}g) +${opt.incomeReward}/w`;

      const text = this.scene.add.text(8, y, label, {
        fontSize: '10px', color: '#cccccc', fontFamily: 'monospace',
      });

      this.container.add(text);
      text.setInteractive({ useHandCursor: true });
      text.on('pointerdown', () => this.onSend(opt));
      text.on('pointerover', () => text.setColor('#ffffff'));
      text.on('pointerout', () => text.setColor('#cccccc'));
    }
  }

  private registerHotkeys(): void {
    for (let i = 0; i < SEND_OPTIONS.length && i < SEND_HOTKEYS.length; i++) {
      const opt = SEND_OPTIONS[i];
      this.scene.input.keyboard!.on(`keydown-${SEND_HOTKEYS[i]}`, () => {
        this.onSend(opt);
      });
    }
  }
}
