import { ResponsiveManager } from './ResponsiveManager';
import { getGridOffsetX, getCanvasWidth } from '../config';

const MIN_ZOOM = 1.0;
const MAX_ZOOM = 8.0;
const DEFAULT_PHONE_ZOOM = 1.8;
const PAN_THRESHOLD = 12;       // screen pixels moved before it counts as a pan
const MOMENTUM_FRICTION = 0.92; // velocity multiplier per frame (< 1 = deceleration)
const MOMENTUM_MIN = 0.5;       // stop momentum below this velocity
const ELASTIC_FACTOR = 0.3;     // how far past bounds you can drag (0-1)
const ELASTIC_SNAP = 0.15;      // snap-back speed per frame
const DOUBLE_TAP_MS = 300;      // max ms between taps for double-tap
const ZOOM_STEP = 0.15;         // scroll wheel zoom increment (multiplicative)

/**
 * Handles pinch-to-zoom, drag-to-pan, momentum, elastic bounds,
 * double-tap-to-zoom (phone), scroll-wheel zoom + middle-drag pan (desktop),
 * and +/- zoom buttons (desktop).
 */
export class CameraController {
  private scene: Phaser.Scene;
  camera: Phaser.Cameras.Scene2D.Camera;
  private worldW: number;
  private worldH: number;

  // Pinch state
  private pinchStartDist: number = 0;
  private pinchStartZoom: number = 1;
  private pinchMidX: number = 0;
  private pinchMidY: number = 0;
  private pinchStartScrollX: number = 0;
  private pinchStartScrollY: number = 0;

  // Pan state
  private isPanning: boolean = false;
  private panStartX: number = 0;
  private panStartY: number = 0;
  private panStartScrollX: number = 0;
  private panStartScrollY: number = 0;
  private prevPointerX: number = 0;
  private prevPointerY: number = 0;
  private movedDist: number = 0;

  // Momentum
  private velocityX: number = 0;
  private velocityY: number = 0;

  // Double-tap
  private lastTapTime: number = 0;

  // Desktop zoom buttons
  private zoomInBtn: Phaser.GameObjects.Text | null = null;
  private zoomOutBtn: Phaser.GameObjects.Text | null = null;
  private zoomResetBtn: Phaser.GameObjects.Text | null = null;

  /** True if the last pointer interaction was a pan (suppress click) */
  wasPan: boolean = false;
  /** True if currently in a pinch gesture */
  pinching: boolean = false;

  constructor(scene: Phaser.Scene, worldWidth: number, worldHeight: number, viewportHeight?: number) {
    this.scene = scene;
    this.camera = scene.cameras.main;
    this.worldW = worldWidth;
    this.worldH = worldHeight;

    if (ResponsiveManager.isPhone()) {
      // Clip the main camera viewport to the area above the UI bars.
      if (viewportHeight) {
        this.camera.setViewport(0, 0, worldWidth, viewportHeight);
      }
      this.camera.setZoom(DEFAULT_PHONE_ZOOM);
      this.camera.centerOn(worldWidth / 2, worldHeight / 2);
    }

    this.setupInput();
  }

  private setupInput(): void {
    const scene = this.scene;
    const isPhone = ResponsiveManager.isPhone();

    if (isPhone) {
      this.setupPhoneInput();
    } else {
      this.setupDesktopInput();
    }
  }

  // ===================== PHONE INPUT =====================

  private setupPhoneInput(): void {
    const scene = this.scene;

    scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const pointers = scene.input.manager.pointers;
      const activeCount = pointers.filter(p => p.isDown).length;
      if (activeCount >= 2) return;

      this.isPanning = true;
      this.wasPan = false;
      this.movedDist = 0;
      this.velocityX = 0;
      this.velocityY = 0;
      this.panStartX = pointer.x;
      this.panStartY = pointer.y;
      this.prevPointerX = pointer.x;
      this.prevPointerY = pointer.y;
      this.panStartScrollX = this.camera.scrollX;
      this.panStartScrollY = this.camera.scrollY;
    });

    scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      // Pinch-to-zoom: two fingers
      const pointers = scene.input.manager.pointers;
      const downPointers = pointers.filter(p => p.isDown);
      if (downPointers.length >= 2) {
        this.isPanning = false;
        this.pinching = true;
        this.wasPan = true;
        const p1 = downPointers[0];
        const p2 = downPointers[1];
        const dist = Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);

        if (this.pinchStartDist === 0) {
          this.pinchStartDist = dist;
          this.pinchStartZoom = this.camera.zoom;
          this.pinchMidX = (p1.x + p2.x) / 2;
          this.pinchMidY = (p1.y + p2.y) / 2;
          const wp = this.camera.getWorldPoint(this.pinchMidX, this.pinchMidY);
          this.pinchStartScrollX = wp.x;
          this.pinchStartScrollY = wp.y;
        } else {
          const scale = dist / this.pinchStartDist;
          const newZoom = Phaser.Math.Clamp(this.pinchStartZoom * scale, MIN_ZOOM, MAX_ZOOM);
          this.camera.setZoom(newZoom);
          const wp = this.camera.getWorldPoint(this.pinchMidX, this.pinchMidY);
          this.camera.scrollX += this.pinchStartScrollX - wp.x;
          this.camera.scrollY += this.pinchStartScrollY - wp.y;
        }
        return;
      }

      // Single-finger pan
      if (this.isPanning && pointer.isDown) {
        const dx = pointer.x - this.panStartX;
        const dy = pointer.y - this.panStartY;
        this.movedDist = Math.sqrt(dx * dx + dy * dy);

        this.velocityX = (pointer.x - this.prevPointerX) / this.camera.zoom;
        this.velocityY = (pointer.y - this.prevPointerY) / this.camera.zoom;
        this.prevPointerX = pointer.x;
        this.prevPointerY = pointer.y;

        if (this.movedDist > PAN_THRESHOLD) {
          this.wasPan = true;
          this.camera.scrollX = this.panStartScrollX - dx / this.camera.zoom;
          this.camera.scrollY = this.panStartScrollY - dy / this.camera.zoom;
        }
      }
    });

    scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (this.isPanning && !this.wasPan) {
        const now = Date.now();
        if (now - this.lastTapTime < DOUBLE_TAP_MS) {
          this.doubleTapZoom(pointer.x, pointer.y);
          this.lastTapTime = 0;
        } else {
          this.lastTapTime = now;
        }
      }
      this.isPanning = false;
      this.pinchStartDist = 0;
      this.pinching = false;
    });
  }

  // ===================== DESKTOP INPUT =====================

  private setupDesktopInput(): void {
    const scene = this.scene;

    // Scroll wheel zoom — zoom toward cursor position
    scene.input.on('wheel', (_p: any, _g: any, _dx: number, dy: number, _dz: number) => {
      const pointer = scene.input.activePointer;
      const wpBefore = this.camera.getWorldPoint(pointer.x, pointer.y);
      const factor = dy > 0 ? (1 - ZOOM_STEP) : (1 + ZOOM_STEP);
      const newZoom = Phaser.Math.Clamp(this.camera.zoom * factor, MIN_ZOOM, MAX_ZOOM);
      this.camera.setZoom(newZoom);
      // Keep the world point under the cursor stable
      const wpAfter = this.camera.getWorldPoint(pointer.x, pointer.y);
      this.camera.scrollX += wpBefore.x - wpAfter.x;
      this.camera.scrollY += wpBefore.y - wpAfter.y;
    });

    // Middle-mouse-button drag to pan
    scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.middleButtonDown()) {
        this.isPanning = true;
        this.wasPan = false;
        this.movedDist = 0;
        this.panStartX = pointer.x;
        this.panStartY = pointer.y;
        this.panStartScrollX = this.camera.scrollX;
        this.panStartScrollY = this.camera.scrollY;
      }
    });

    scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isPanning && pointer.isDown) {
        const dx = pointer.x - this.panStartX;
        const dy = pointer.y - this.panStartY;
        this.movedDist = Math.sqrt(dx * dx + dy * dy);
        if (this.movedDist > 4) {
          this.wasPan = true;
          this.camera.scrollX = this.panStartScrollX - dx / this.camera.zoom;
          this.camera.scrollY = this.panStartScrollY - dy / this.camera.zoom;
        }
      }
    });

    scene.input.on('pointerup', () => {
      this.isPanning = false;
    });

    // +/- zoom buttons
    this.createZoomButtons();
  }

  private createZoomButtons(): void {
    const scene = this.scene;
    const x = getCanvasWidth() - 50;
    const y = 10;
    const btnStyle = {
      fontSize: '18px', color: '#aaaaaa', fontFamily: 'monospace',
      backgroundColor: '#222233', padding: { x: 8, y: 4 },
    };

    this.zoomInBtn = scene.add.text(x, y, ' + ', btnStyle)
      .setDepth(30).setScrollFactor(0)
      .setInteractive({ useHandCursor: true });
    this.zoomInBtn.on('pointerdown', () => this.zoomBy(1 + ZOOM_STEP * 2));

    this.zoomOutBtn = scene.add.text(x, y + 32, ' – ', btnStyle)
      .setDepth(30).setScrollFactor(0)
      .setInteractive({ useHandCursor: true });
    this.zoomOutBtn.on('pointerdown', () => this.zoomBy(1 - ZOOM_STEP * 2));

    this.zoomResetBtn = scene.add.text(x, y + 64, ' ⊙ ', { ...btnStyle, fontSize: '14px' })
      .setDepth(30).setScrollFactor(0)
      .setInteractive({ useHandCursor: true });
    this.zoomResetBtn.on('pointerdown', () => {
      this.camera.setZoom(1);
      this.camera.setScroll(0, 0);
    });
  }

  /** Zoom by a multiplicative factor, centered on screen center */
  private zoomBy(factor: number): void {
    const cx = this.camera.width / 2;
    const cy = this.camera.height / 2;
    const wpBefore = this.camera.getWorldPoint(cx, cy);
    const newZoom = Phaser.Math.Clamp(this.camera.zoom * factor, MIN_ZOOM, MAX_ZOOM);
    this.camera.setZoom(newZoom);
    const wpAfter = this.camera.getWorldPoint(cx, cy);
    this.camera.scrollX += wpBefore.x - wpAfter.x;
    this.camera.scrollY += wpBefore.y - wpAfter.y;
  }

  /** Double-tap: toggle between default zoom and 1x */
  private doubleTapZoom(screenX: number, screenY: number): void {
    const targetZoom = this.camera.zoom > 1.2 ? 1.0 : DEFAULT_PHONE_ZOOM;
    const wp = this.camera.getWorldPoint(screenX, screenY);
    this.camera.setZoom(targetZoom);
    const wpAfter = this.camera.getWorldPoint(screenX, screenY);
    this.camera.scrollX += wp.x - wpAfter.x;
    this.camera.scrollY += wp.y - wpAfter.y;
    this.velocityX = 0;
    this.velocityY = 0;
    this.wasPan = true;
  }

  /** Call each frame to apply momentum and elastic bounds */
  update(_delta: number): void {
    const isPhone = ResponsiveManager.isPhone();

    // Phone: momentum when not panning
    if (isPhone && !this.isPanning && (Math.abs(this.velocityX) > MOMENTUM_MIN || Math.abs(this.velocityY) > MOMENTUM_MIN)) {
      this.camera.scrollX -= this.velocityX;
      this.camera.scrollY -= this.velocityY;
      this.velocityX *= MOMENTUM_FRICTION;
      this.velocityY *= MOMENTUM_FRICTION;
    }

    // Elastic bounds (phone only — desktop uses hard clamp)
    if (isPhone) {
      this.applyElasticBounds();
    } else if (this.camera.zoom > 1.01) {
      this.applyDesktopBounds();
    }
  }

  private applyElasticBounds(): void {
    const cam = this.camera;
    const viewW = cam.width / cam.zoom;
    const viewH = cam.height / cam.zoom;
    const marginX = this.worldW * 0.5;
    const marginY = this.worldH * 0.5;
    const minX = -marginX;
    const minY = -marginY;
    const maxX = Math.max(this.worldW - viewW + marginX, minX);
    const maxY = Math.max(this.worldH - viewH + marginY, minY);

    if (this.isPanning) {
      if (cam.scrollX < minX) cam.scrollX = minX - (minX - cam.scrollX) * (1 - ELASTIC_FACTOR);
      else if (cam.scrollX > maxX) cam.scrollX = maxX + (cam.scrollX - maxX) * ELASTIC_FACTOR;
      if (cam.scrollY < minY) cam.scrollY = minY - (minY - cam.scrollY) * (1 - ELASTIC_FACTOR);
      else if (cam.scrollY > maxY) cam.scrollY = maxY + (cam.scrollY - maxY) * ELASTIC_FACTOR;
    } else {
      if (cam.scrollX < minX) cam.scrollX += (minX - cam.scrollX) * ELASTIC_SNAP;
      else if (cam.scrollX > maxX) cam.scrollX -= (cam.scrollX - maxX) * ELASTIC_SNAP;
      if (cam.scrollY < minY) cam.scrollY += (minY - cam.scrollY) * ELASTIC_SNAP;
      else if (cam.scrollY > maxY) cam.scrollY -= (cam.scrollY - maxY) * ELASTIC_SNAP;
    }
  }

  private applyDesktopBounds(): void {
    const cam = this.camera;
    const viewW = cam.width / cam.zoom;
    const viewH = cam.height / cam.zoom;
    // Hard clamp — don't let viewport go past world + small margin
    const margin = 50;
    const minX = -margin;
    const minY = -margin;
    const maxX = Math.max(this.worldW - viewW + margin, minX);
    const maxY = Math.max(this.worldH - viewH + margin, minY);
    cam.scrollX = Phaser.Math.Clamp(cam.scrollX, minX, maxX);
    cam.scrollY = Phaser.Math.Clamp(cam.scrollY, minY, maxY);
  }

  get zoom(): number {
    return this.camera.zoom;
  }

  destroy(): void {
    // Phaser cleans up input listeners with the scene
  }
}
