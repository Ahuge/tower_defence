import * as Phaser from 'phaser';
import { getCanvasWidth } from '../config';
import { MapId } from '../data/Maps';
import { ResponsiveManager } from '../systems/ResponsiveManager';
import { UIScale } from '../systems/UIScale';
import { MapStorage, StoredCustomMap } from '../systems/MapStorage';
import { goToMenu } from '../ui/navigation';

export class CustomMapScene extends Phaser.Scene {
  private scrollY: number = 0;
  private contentHeight: number = 0;
  private isDragging: boolean = false;
  private dragStartY: number = 0;
  private dragStartScrollY: number = 0;
  private container!: Phaser.GameObjects.Container;
  private contentY: number = 0;
  private contentH: number = 0;

  constructor() {
    super('CustomMapScene');
  }

  create(): void {
    const cx = getCanvasWidth() / 2;
    const totalH = ResponsiveManager.canvasHeight();

    this.add.graphics().fillStyle(0x0a0a0f, 1).fillRect(0, 0, getCanvasWidth(), totalH);

    this.add.text(cx, UIScale.space(25), 'CUSTOM MAPS', {
      fontSize: UIScale.font(28), color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Back button
    const backBtn = this.add.text(UIScale.space(50), UIScale.space(25), '[ Back ]', {
      fontSize: UIScale.font(14), color: '#888888', fontFamily: 'monospace',
    }).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => goToMenu());
    backBtn.on('pointerover', () => backBtn.setColor('#cccccc'));
    backBtn.on('pointerout', () => backBtn.setColor('#888888'));

    // Action buttons row
    const btnY = UIScale.space(60);
    const importBtn = this.add.text(cx - UIScale.space(100), btnY, '[ Import from Clipboard ]', {
      fontSize: UIScale.font(13), color: '#aa8844', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    importBtn.on('pointerdown', () => this.importFromClipboard());
    importBtn.on('pointerover', () => importBtn.setColor('#ddbb66'));
    importBtn.on('pointerout', () => importBtn.setColor('#aa8844'));

    const editorBtn = this.add.text(cx + UIScale.space(100), btnY, '[ Open Map Editor ]', {
      fontSize: UIScale.font(13), color: '#aa8844', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    editorBtn.on('pointerdown', () => {
      window.open('editor.html', '_blank');
    });
    editorBtn.on('pointerover', () => editorBtn.setColor('#ddbb66'));
    editorBtn.on('pointerout', () => editorBtn.setColor('#aa8844'));

    // Scrollable map list
    this.contentY = UIScale.space(90);
    this.contentH = totalH - UIScale.space(100);

    const mask = this.add.graphics();
    mask.fillRect(0, this.contentY, getCanvasWidth(), this.contentH);
    const maskGeo = mask.createGeometryMask();

    this.container = this.add.container(0, this.contentY);
    this.container.setMask(maskGeo);

    this.buildMapList();

    // Scroll with mouse wheel
    this.input.on('wheel', (_pointer: any, _gameObjects: any, _deltaX: number, deltaY: number) => {
      this.scrollY = Phaser.Math.Clamp(
        this.scrollY - deltaY * 0.5,
        -(this.contentHeight - this.contentH + 20),
        0,
      );
      this.container.setY(this.contentY + this.scrollY);
    });

    // Touch drag scrolling
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.isDragging = true;
      this.dragStartY = pointer.y;
      this.dragStartScrollY = this.scrollY;
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isDragging) return;
      const dy = pointer.y - this.dragStartY;
      this.scrollY = Phaser.Math.Clamp(
        this.dragStartScrollY + dy,
        -(this.contentHeight - this.contentH + 20),
        0,
      );
      this.container.setY(this.contentY + this.scrollY);
    });
    this.input.on('pointerup', () => { this.isDragging = false; });
  }

  private buildMapList(): void {
    // Clear existing children
    this.container.removeAll(true);
    this.scrollY = 0;
    this.container.setY(this.contentY);

    const cx = getCanvasWidth() / 2;
    const maps = MapStorage.list();
    const marginL = UIScale.space(60);
    const cardW = getCanvasWidth() - UIScale.space(120);

    let y = UIScale.space(10);

    if (maps.length === 0) {
      const emptyText = this.add.text(cx, y + UIScale.space(30), 'No custom maps yet.\nImport a map from clipboard or create one in the editor.', {
        fontSize: UIScale.font(12), color: '#666666', fontFamily: 'monospace',
        align: 'center',
      }).setOrigin(0.5);
      this.container.add(emptyText);
      this.contentHeight = UIScale.space(100);
      return;
    }

    for (const map of maps) {
      const cardH = UIScale.space(50);
      const cardX = marginL;
      const cardY = y;

      // Card background
      const card = this.add.graphics();
      card.fillStyle(0x2a2a33, 1);
      card.fillRect(cardX, cardY, cardW, cardH);
      card.lineStyle(1, 0x555555, 0.6);
      card.strokeRect(cardX, cardY, cardW, cardH);
      // Gold accent strip
      card.fillStyle(0xaa8844, 0.5);
      card.fillRect(cardX, cardY, 4, cardH);
      this.container.add(card);

      // Map name
      const nameText = this.add.text(cardX + UIScale.space(14), cardY + UIScale.space(10), map.name, {
        fontSize: UIScale.font(14), color: '#ffffff', fontFamily: 'monospace',
      });
      this.container.add(nameText);

      // Theme + structure count
      const structCount = map.json.structures?.length ?? 0;
      const infoStr = `Theme: ${map.theme}` + (structCount > 0 ? ` | ${structCount} structures` : '');
      const infoText = this.add.text(cardX + UIScale.space(14), cardY + UIScale.space(30), infoStr, {
        fontSize: UIScale.font(10), color: '#888888', fontFamily: 'monospace',
      });
      this.container.add(infoText);

      // Play button
      const playBtnW = UIScale.space(50);
      const btnH = UIScale.space(24);
      const playX = cardX + cardW - UIScale.space(120);
      const playY = cardY + (cardH - btnH) / 2;

      const playGfx = this.add.graphics();
      const drawPlay = (hover: boolean) => {
        playGfx.clear();
        playGfx.fillStyle(hover ? 0x447744 : 0x335533, 1);
        playGfx.fillRect(playX, playY, playBtnW, btnH);
        playGfx.lineStyle(1, hover ? 0x88ff88 : 0x44aa44, 1);
        playGfx.strokeRect(playX, playY, playBtnW, btnH);
      };
      drawPlay(false);
      this.container.add(playGfx);

      const playLabel = this.add.text(playX + playBtnW / 2, playY + btnH / 2, 'Play', {
        fontSize: UIScale.font(12), color: '#44ff44', fontFamily: 'monospace',
      }).setOrigin(0.5);
      this.container.add(playLabel);

      const playZone = this.add.zone(playX + playBtnW / 2, playY + btnH / 2, playBtnW, btnH).setInteractive({ useHandCursor: true });
      playZone.on('pointerover', () => drawPlay(true));
      playZone.on('pointerout', () => drawPlay(false));
      playZone.on('pointerdown', () => this.playMap(map));
      this.container.add(playZone);

      // Delete button
      const delBtnW = UIScale.space(50);
      const delX = cardX + cardW - UIScale.space(55);
      const delY = playY;

      const delGfx = this.add.graphics();
      const drawDel = (hover: boolean) => {
        delGfx.clear();
        delGfx.fillStyle(hover ? 0x774444 : 0x553333, 1);
        delGfx.fillRect(delX, delY, delBtnW, btnH);
        delGfx.lineStyle(1, hover ? 0xff8888 : 0xaa4444, 1);
        delGfx.strokeRect(delX, delY, delBtnW, btnH);
      };
      drawDel(false);
      this.container.add(delGfx);

      const delLabel = this.add.text(delX + delBtnW / 2, delY + btnH / 2, 'Delete', {
        fontSize: UIScale.font(10), color: '#ff4444', fontFamily: 'monospace',
      }).setOrigin(0.5);
      this.container.add(delLabel);

      const delZone = this.add.zone(delX + delBtnW / 2, delY + btnH / 2, delBtnW, btnH).setInteractive({ useHandCursor: true });
      delZone.on('pointerover', () => drawDel(true));
      delZone.on('pointerout', () => drawDel(false));
      delZone.on('pointerdown', () => {
        MapStorage.delete(map.id);
        this.buildMapList();
      });
      this.container.add(delZone);

      y += cardH + UIScale.space(8);
    }

    this.contentHeight = y;
  }

  private playMap(map: StoredCustomMap): void {
    const customMapDef = MapStorage.toMapDefinition(map);
    this.scene.start('FactionSelectScene', {
      mode: 'standard',
      map: 'custom' as MapId,
      difficulty: 'normal',
      customMapDef,
    });
  }

  private async importFromClipboard(): Promise<void> {
    try {
      const text = await navigator.clipboard.readText();
      const stored = MapStorage.fromClipboard(text);
      if (stored) {
        MapStorage.save(stored);
        this.buildMapList();
      } else {
        // Show error briefly
        const cx = getCanvasWidth() / 2;
        const errText = this.add.text(cx, UIScale.space(80), 'Invalid map JSON in clipboard', {
          fontSize: UIScale.font(12), color: '#ff4444', fontFamily: 'monospace',
        }).setOrigin(0.5);
        this.time.delayedCall(2000, () => errText.destroy());
      }
    } catch {
      const cx = getCanvasWidth() / 2;
      const errText = this.add.text(cx, UIScale.space(80), 'Could not read clipboard (check permissions)', {
        fontSize: UIScale.font(12), color: '#ff4444', fontFamily: 'monospace',
      }).setOrigin(0.5);
      this.time.delayedCall(2000, () => errText.destroy());
    }
  }
}
