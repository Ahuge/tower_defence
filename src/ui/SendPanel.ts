import { SIDEBAR_WIDTH } from '../config';
import { SEND_OPTIONS, SendCreepOption } from '../data/SendCreepTypes';

export class SendPanel {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private onSend: (option: SendCreepOption) => void;

  static readonly HEIGHT = 100;

  constructor(scene: Phaser.Scene, onSend: (option: SendCreepOption) => void) {
    this.scene = scene;
    this.onSend = onSend;
    this.container = scene.add.container(0, 0).setDepth(28);

    this.buildPanel();
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
      const y = 24 + i * 17;

      const text = this.scene.add.text(8, y, `${opt.name} (${opt.cost}g) +${opt.incomeReward}/w`, {
        fontSize: '10px', color: '#cccccc', fontFamily: 'monospace',
      });

      // Add to container FIRST, then set interactive
      this.container.add(text);
      text.setInteractive({ useHandCursor: true });
      text.on('pointerdown', () => this.onSend(opt));
      text.on('pointerover', () => text.setColor('#ffffff'));
      text.on('pointerout', () => text.setColor('#cccccc'));
    }
  }
}
