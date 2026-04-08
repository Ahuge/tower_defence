import { SIDEBAR_WIDTH, GAME_HEIGHT, getSidebarWidth } from '../config';
import { UIScale } from '../systems/UIScale';
import { ResourceManager } from '../systems/ResourceManager';
import { EssenceGenerator, ESSENCE_GENERATORS, EssenceSendOption, ESSENCE_SENDS } from '../data/EssenceGenerators';
import { UpcomingWaves } from './UpcomingWaves';
import { SendPanel } from './SendPanel';
import { uiText, uiGraphics } from '../systems/UILayer';

/**
 * Dual Economy mode UI panel — replaces Sends + Frontier panels.
 * Shows essence counter, generator purchases, and essence-cost sends.
 */
export class EssencePanel {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private resources: ResourceManager;
  private onBuyGenerator: (gen: EssenceGenerator) => void;
  private onSend: (send: EssenceSendOption) => void;

  private essenceText!: Phaser.GameObjects.Text;
  private rateText!: Phaser.GameObjects.Text;
  private ownedText!: Phaser.GameObjects.Text;
  private ownedItems: Phaser.GameObjects.GameObject[] = [];
  private ownedStartY: number = 0;

  // Track owned generators
  generators: { def: EssenceGenerator; count: number }[] = [];

  constructor(
    scene: Phaser.Scene,
    resources: ResourceManager,
    onBuyGenerator: (gen: EssenceGenerator) => void,
    onSend: (send: EssenceSendOption) => void,
  ) {
    this.scene = scene;
    this.resources = resources;
    this.onBuyGenerator = onBuyGenerator;
    this.onSend = onSend;

    const topY = UpcomingWaves.HEIGHT;
    this.container = scene.add.container(0, topY).setDepth(28);
    this.buildPanel();
  }

  private buildPanel(): void {
    const panelW = getSidebarWidth();
    const panelH = GAME_HEIGHT - UpcomingWaves.HEIGHT - 200; // leave room for event log

    const bg = uiGraphics(this.scene);
    bg.fillStyle(0x0e1118, 1);
    bg.fillRect(0, 0, panelW, panelH);
    bg.lineStyle(1, 0x334455, 1);
    bg.strokeRect(0, 0, panelW, panelH);
    this.container.add(bg);

    // Essence counter (updates each frame)
    this.essenceText = uiText(this.scene,8, 6, '', {
      fontSize: UIScale.font(14), color: '#44ddff', fontFamily: 'monospace',
    });
    this.container.add(this.essenceText);

    this.rateText = uiText(this.scene,panelW - 8, 6, '', {
      fontSize: UIScale.font(10), color: '#44aacc', fontFamily: 'monospace',
    }).setOrigin(1, 0);
    this.container.add(this.rateText);

    let y = 28;

    // Generator purchases
    const genLabel = uiText(this.scene,8, y, 'GENERATORS (buy with Gold)', {
      fontSize: UIScale.font(10), color: '#ffaa44', fontFamily: 'monospace',
    });
    this.container.add(genLabel);
    y += 16;

    for (const gen of ESSENCE_GENERATORS) {
      const text = uiText(this.scene,8, y, `[Buy] ${gen.name} (${gen.cost}g) +${gen.essencePerSec}/s`, {
        fontSize: UIScale.font(10), color: '#cccccc', fontFamily: 'monospace',
      });
      this.container.add(text);
      text.setInteractive({ useHandCursor: true });
      text.on('pointerdown', () => this.onBuyGenerator(gen));
      text.on('pointerover', () => text.setColor('#ffffff'));
      text.on('pointerout', () => text.setColor('#cccccc'));
      y += 14;

      const desc = uiText(this.scene,16, y, gen.description, {
        fontSize: UIScale.font(9), color: '#666666', fontFamily: 'monospace',
      });
      this.container.add(desc);
      y += 14;
    }

    y += 8;

    // Divider
    const div1 = uiGraphics(this.scene);
    div1.lineStyle(1, 0x334455, 0.5);
    div1.lineBetween(8, y, panelW - 8, y);
    this.container.add(div1);
    y += 6;

    // Essence sends
    const sendLabel = uiText(this.scene,8, y, 'SENDS (cost Essence → Gold income)', {
      fontSize: UIScale.font(10), color: '#ff8844', fontFamily: 'monospace',
    });
    this.container.add(sendLabel);
    y += 16;

    const hotkeys = ['Z', 'X', 'C', 'V'];
    for (let i = 0; i < ESSENCE_SENDS.length; i++) {
      const send = ESSENCE_SENDS[i];
      const hk = i < hotkeys.length ? `[${hotkeys[i]}] ` : '';
      const text = uiText(this.scene,8, y, `${hk}${send.name} (${send.essenceCost}e) +${send.incomeReward}g/w`, {
        fontSize: UIScale.font(10), color: '#cccccc', fontFamily: 'monospace',
      });
      this.container.add(text);
      text.setInteractive({ useHandCursor: true });
      text.on('pointerdown', () => this.onSend(send));
      text.on('pointerover', () => text.setColor('#ffffff'));
      text.on('pointerout', () => text.setColor('#cccccc'));
      y += 14;
    }

    // Register send hotkeys (first 4 only)
    for (let i = 0; i < ESSENCE_SENDS.length && i < hotkeys.length; i++) {
      const send = ESSENCE_SENDS[i];
      this.scene.input.keyboard!.on(`keydown-${hotkeys[i]}`, () => {
        this.onSend(send);
      });
    }

    y += 8;

    // Divider
    const div2 = uiGraphics(this.scene);
    div2.lineStyle(1, 0x334455, 0.5);
    div2.lineBetween(8, y, panelW - 8, y);
    this.container.add(div2);
    y += 6;

    // Owned generators section
    const ownedLabel = uiText(this.scene,8, y, 'Owned Generators:', {
      fontSize: UIScale.font(10), color: '#88ff88', fontFamily: 'monospace',
    });
    this.container.add(ownedLabel);
    this.ownedStartY = y + 16;
  }

  /** Call each frame to update essence display */
  update(): void {
    const essence = this.resources.get('essence');
    const state = this.resources.getState('essence');
    const rate = state?.tickRate ?? 0;

    this.essenceText.setText(`Essence: ${Math.floor(essence)}`);
    this.rateText.setText(`${rate.toFixed(1)}/s`);
  }

  /** Rebuild owned generators display */
  updateOwned(): void {
    for (const obj of this.ownedItems) {
      this.container.remove(obj, true);
    }
    this.ownedItems = [];

    let y = this.ownedStartY;

    if (this.generators.length === 0) {
      const empty = uiText(this.scene,12, y, '(none)', {
        fontSize: UIScale.font(9), color: '#555555', fontFamily: 'monospace',
      });
      this.container.add(empty);
      this.ownedItems.push(empty);
      return;
    }

    for (const g of this.generators) {
      const text = uiText(this.scene,12, y, `${g.def.name} x${g.count} (+${(g.def.essencePerSec * g.count).toFixed(1)}/s)`, {
        fontSize: UIScale.font(10), color: '#aaffaa', fontFamily: 'monospace',
      });
      this.container.add(text);
      this.ownedItems.push(text);
      y += 14;
    }

    const totalRate = this.generators.reduce((s, g) => s + g.def.essencePerSec * g.count, 0);
    const summary = uiText(this.scene,12, y + 4, `Total: +${totalRate.toFixed(1)} essence/s`, {
      fontSize: UIScale.font(9), color: '#666666', fontFamily: 'monospace',
    });
    this.container.add(summary);
    this.ownedItems.push(summary);
  }

  getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }
}
