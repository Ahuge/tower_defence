import { CANVAS_WIDTH, GRID_COLS, GRID_ROWS, TILE_SIZE, GAME_HEIGHT, GRID_OFFSET_X } from '../config';
import { VersusManager } from '../systems/multiplayer/VersusManager';
import { TOWER_TYPES } from '../data/TowerTypes';

/**
 * Renders a minimap of the opponent's game board.
 * Shows tower placements, lives, and wave count.
 */
export class OpponentMinimap {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private boardGraphics: Phaser.GameObjects.Graphics;
  private statusText: Phaser.GameObjects.Text;
  private timerText: Phaser.GameObjects.Text;
  private versus: VersusManager;

  // Minimap dimensions
  private readonly mapW = 200;
  private readonly mapH = 130;
  private readonly cellW: number;
  private readonly cellH: number;

  constructor(scene: Phaser.Scene, versus: VersusManager) {
    this.scene = scene;
    this.versus = versus;
    this.cellW = this.mapW / GRID_COLS;
    this.cellH = this.mapH / GRID_ROWS;

    // Position in top-right of game area
    const x = CANVAS_WIDTH - this.mapW - 10;
    const y = 6;

    this.container = scene.add.container(x, y).setDepth(29);

    // Background
    const bg = scene.add.graphics();
    bg.fillStyle(0x111111, 0.9);
    bg.fillRect(0, 0, this.mapW, this.mapH + 30);
    bg.lineStyle(1, 0xff4444, 0.6);
    bg.strokeRect(0, 0, this.mapW, this.mapH + 30);
    this.container.add(bg);

    // Label
    const label = scene.add.text(4, 2, 'OPPONENT', {
      fontSize: '8px', color: '#ff6666', fontFamily: 'monospace',
    });
    this.container.add(label);

    // Board graphics
    this.boardGraphics = scene.add.graphics();
    this.container.add(this.boardGraphics);

    // Status
    this.statusText = scene.add.text(4, this.mapH + 14, '', {
      fontSize: '9px', color: '#cccccc', fontFamily: 'monospace',
    });
    this.container.add(this.statusText);

    // Wave timer
    this.timerText = scene.add.text(this.mapW - 4, 2, '', {
      fontSize: '9px', color: '#ffdd44', fontFamily: 'monospace',
    }).setOrigin(1, 0);
    this.container.add(this.timerText);
  }

  update(): void {
    const g = this.boardGraphics;
    g.clear();

    const offsetY = 12;

    // Draw grid background
    g.fillStyle(0x2d2d2d, 1);
    g.fillRect(0, offsetY, this.mapW, this.mapH);

    // Draw opponent's towers
    for (const t of this.versus.opponentTowers) {
      const towerDef = TOWER_TYPES[t.towerId];
      const color = towerDef?.color ?? 0xffffff;
      const x = t.col * this.cellW;
      const y = t.row * this.cellH + offsetY;
      g.fillStyle(color, 0.8);
      g.fillRect(x, y, this.cellW, this.cellH);
    }

    // Status text
    this.statusText.setText(`Lives: ${this.versus.opponentLives}  Wave: ${this.versus.opponentWave}`);

    // Timer
    if (this.versus.waveTimerActive) {
      const secs = this.versus.getWaveTimerSeconds();
      const readyStr = this.versus.opponentReady ? ' [READY]' : '';
      this.timerText.setText(`${secs}s${readyStr}`);
    } else {
      this.timerText.setText('');
    }
  }
}
