import { GAME_HEIGHT } from '../config';
import { SEND_OPTIONS, SendCreepOption } from '../data/SendCreepTypes';

export class SendPanel {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private onSend: (option: SendCreepOption) => void;
  private texts: Phaser.GameObjects.Text[] = [];

  constructor(scene: Phaser.Scene, onSend: (option: SendCreepOption) => void) {
    this.scene = scene;
    this.onSend = onSend;
    this.container = scene.add.container(0, 0).setDepth(28);

    this.buildPanel();
  }

  private buildPanel(): void {
    // Position on right side of the game area
    const panelX = 580;
    const panelY = 4;
    const panelW = 210;
    const panelH = 14 + SEND_OPTIONS.length * 16;

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x1a1a1a, 0.85);
    bg.fillRect(panelX, panelY, panelW, panelH);
    bg.lineStyle(1, 0x444444, 0.6);
    bg.strokeRect(panelX, panelY, panelW, panelH);
    this.container.add(bg);

    const title = this.scene.add.text(panelX + 4, panelY + 2, 'Send (between waves):', {
      fontSize: '9px', color: '#ff8844', fontFamily: 'monospace',
    });
    this.container.add(title);

    for (let i = 0; i < SEND_OPTIONS.length; i++) {
      const opt = SEND_OPTIONS[i];
      const y = panelY + 14 + i * 16;

      const text = this.scene.add.text(panelX + 4, y, `${opt.name} (${opt.cost}g) +${opt.incomeReward}/w`, {
        fontSize: '9px', color: '#cccccc', fontFamily: 'monospace',
      }).setInteractive({ useHandCursor: true });

      text.on('pointerdown', () => this.onSend(opt));
      text.on('pointerover', () => text.setColor('#ffffff'));
      text.on('pointerout', () => text.setColor('#cccccc'));

      this.container.add(text);
      this.texts.push(text);
    }
  }
}
