import { ResponsiveManager } from './ResponsiveManager';

const MIN_ZOOM = 1.0;
const MAX_ZOOM = 3.0;
const DEFAULT_PHONE_ZOOM = 1.8;
const PAN_THRESHOLD = 8; // pixels moved before it counts as a pan (vs tap)

/**
 * Handles pinch-to-zoom and drag-to-pan for the game camera on phone.
 * UI elements should be on a separate camera (uiCamera) that doesn't zoom.
 */
export class CameraController {
  private scene: Phaser.Scene;
  private camera: Phaser.Cameras.Scene2D.Camera;

  // Pinch state
  private pinchStartDist: number = 0;
  private pinchStartZoom: number = 1;

  // Pan state
  private isPanning: boolean = false;
  private panStartX: number = 0;
  private panStartY: number = 0;
  private panStartScrollX: number = 0;
  private panStartScrollY: number = 0;
  private totalMoved: number = 0;

  /** True if the last pointer interaction was a pan (suppress click) */
  wasPan: boolean = false;

  constructor(scene: Phaser.Scene, worldWidth: number, worldHeight: number) {
    this.scene = scene;
    this.camera = scene.cameras.main;

    // Set camera bounds to the game world
    this.camera.setBounds(0, 0, worldWidth, worldHeight);

    if (ResponsiveManager.isPhone()) {
      this.camera.setZoom(DEFAULT_PHONE_ZOOM);
      // Center camera on the middle of the grid
      this.camera.centerOn(worldWidth / 2, worldHeight / 2);
    }

    this.setupInput();
  }

  private setupInput(): void {
    if (!ResponsiveManager.isPhone()) return;

    const input = this.scene.input;

    input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Only handle single-finger for panning (pinch handled separately)
      if (input.pointer1.isDown && input.pointer2.isDown) return;

      this.isPanning = true;
      this.wasPan = false;
      this.totalMoved = 0;
      this.panStartX = pointer.x;
      this.panStartY = pointer.y;
      this.panStartScrollX = this.camera.scrollX;
      this.panStartScrollY = this.camera.scrollY;
    });

    input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      // Pinch-to-zoom: two fingers
      if (input.pointer1.isDown && input.pointer2.isDown) {
        this.isPanning = false;
        const p1 = input.pointer1;
        const p2 = input.pointer2;
        const dist = Math.sqrt(
          (p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2,
        );

        if (this.pinchStartDist === 0) {
          this.pinchStartDist = dist;
          this.pinchStartZoom = this.camera.zoom;
        } else {
          const scale = dist / this.pinchStartDist;
          const newZoom = Phaser.Math.Clamp(
            this.pinchStartZoom * scale,
            MIN_ZOOM, MAX_ZOOM,
          );
          this.camera.setZoom(newZoom);
        }
        return;
      }

      // Single-finger pan
      if (this.isPanning && pointer.isDown) {
        const dx = pointer.x - this.panStartX;
        const dy = pointer.y - this.panStartY;
        this.totalMoved += Math.abs(dx) + Math.abs(dy);

        if (this.totalMoved > PAN_THRESHOLD) {
          this.wasPan = true;
          // Pan inversely to zoom (moving finger 10px at 2x zoom = 5px scroll)
          this.camera.scrollX = this.panStartScrollX - dx / this.camera.zoom;
          this.camera.scrollY = this.panStartScrollY - dy / this.camera.zoom;
        }
      }
    });

    input.on('pointerup', () => {
      this.isPanning = false;
      this.pinchStartDist = 0;
    });
  }

  /** Get current zoom level */
  get zoom(): number {
    return this.camera.zoom;
  }

  /** Convert screen coords to world coords (for input handling) */
  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    const cam = this.camera;
    return {
      x: screenX / cam.zoom + cam.scrollX,
      y: screenY / cam.zoom + cam.scrollY,
    };
  }

  destroy(): void {
    // Phaser cleans up input listeners with the scene
  }
}
