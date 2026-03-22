import { ResponsiveManager } from './ResponsiveManager';

const MIN_ZOOM = 1.0;
const MAX_ZOOM = 3.0;
const DEFAULT_PHONE_ZOOM = 1.8;
const PAN_THRESHOLD = 12;       // screen pixels moved before it counts as a pan
const MOMENTUM_FRICTION = 0.92; // velocity multiplier per frame (< 1 = deceleration)
const MOMENTUM_MIN = 0.5;       // stop momentum below this velocity
const ELASTIC_FACTOR = 0.3;     // how far past bounds you can drag (0-1)
const ELASTIC_SNAP = 0.15;      // snap-back speed per frame
const DOUBLE_TAP_MS = 300;      // max ms between taps for double-tap

/**
 * Handles pinch-to-zoom, drag-to-pan, momentum, elastic bounds,
 * and double-tap-to-zoom for the game camera on phone.
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
  private movedDist: number = 0; // total distance moved from start (not accumulated per frame)

  // Momentum
  private velocityX: number = 0;
  private velocityY: number = 0;

  // Double-tap
  private lastTapTime: number = 0;

  /** True if the last pointer interaction was a pan (suppress click) */
  wasPan: boolean = false;
  /** True if currently in a pinch gesture */
  pinching: boolean = false;

  constructor(scene: Phaser.Scene, worldWidth: number, worldHeight: number) {
    this.scene = scene;
    this.camera = scene.cameras.main;
    this.worldW = worldWidth;
    this.worldH = worldHeight;

    // Don't use setBounds — we handle elastic bounds manually
    if (ResponsiveManager.isPhone()) {
      this.camera.setZoom(DEFAULT_PHONE_ZOOM);
      this.camera.centerOn(worldWidth / 2, worldHeight / 2);
    }

    this.setupInput();
  }

  private setupInput(): void {
    if (!ResponsiveManager.isPhone()) return;

    const scene = this.scene;

    scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // If two pointers are down, let pointermove handle pinch
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
        this.wasPan = true; // suppress click after pinch
        const p1 = downPointers[0];
        const p2 = downPointers[1];
        const dist = Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);

        if (this.pinchStartDist === 0) {
          this.pinchStartDist = dist;
          this.pinchStartZoom = this.camera.zoom;
          // Record midpoint in world coords for centered zoom
          this.pinchMidX = (p1.x + p2.x) / 2;
          this.pinchMidY = (p1.y + p2.y) / 2;
          this.pinchStartScrollX = this.camera.scrollX;
          this.pinchStartScrollY = this.camera.scrollY;
        } else {
          const scale = dist / this.pinchStartDist;
          const newZoom = Phaser.Math.Clamp(this.pinchStartZoom * scale, MIN_ZOOM, MAX_ZOOM);
          // Zoom centered on pinch midpoint
          const midWorldX = this.pinchMidX / this.pinchStartZoom + this.pinchStartScrollX;
          const midWorldY = this.pinchMidY / this.pinchStartZoom + this.pinchStartScrollY;
          this.camera.setZoom(newZoom);
          this.camera.scrollX = midWorldX - this.pinchMidX / newZoom;
          this.camera.scrollY = midWorldY - this.pinchMidY / newZoom;
        }
        return;
      }

      // Single-finger pan
      if (this.isPanning && pointer.isDown) {
        const dx = pointer.x - this.panStartX;
        const dy = pointer.y - this.panStartY;
        this.movedDist = Math.sqrt(dx * dx + dy * dy);

        // Track velocity from frame-to-frame movement
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
        // Check double-tap
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
      // Momentum continues in update()
    });
  }

  /** Double-tap: toggle between default zoom and 1x */
  private doubleTapZoom(screenX: number, screenY: number): void {
    const targetZoom = this.camera.zoom > 1.2 ? 1.0 : DEFAULT_PHONE_ZOOM;
    // Zoom toward tap point
    const worldX = screenX / this.camera.zoom + this.camera.scrollX;
    const worldY = screenY / this.camera.zoom + this.camera.scrollY;
    this.camera.setZoom(targetZoom);
    this.camera.scrollX = worldX - screenX / targetZoom;
    this.camera.scrollY = worldY - screenY / targetZoom;
    this.velocityX = 0;
    this.velocityY = 0;
    this.wasPan = true; // suppress the tap click
  }

  /** Call each frame to apply momentum and elastic bounds */
  update(delta: number): void {
    if (!ResponsiveManager.isPhone()) return;

    // Apply momentum when not actively panning
    if (!this.isPanning && (Math.abs(this.velocityX) > MOMENTUM_MIN || Math.abs(this.velocityY) > MOMENTUM_MIN)) {
      this.camera.scrollX -= this.velocityX;
      this.camera.scrollY -= this.velocityY;
      this.velocityX *= MOMENTUM_FRICTION;
      this.velocityY *= MOMENTUM_FRICTION;
    }

    // Elastic bounds: generous overscroll — any part of map reachable
    const cam = this.camera;
    const viewW = cam.width / cam.zoom;
    const viewH = cam.height / cam.zoom;
    // Allow full viewport of overscroll past each world edge
    const minX = -viewW * 0.8;
    const minY = -viewH * 0.5;
    const maxX = this.worldW - viewW * 0.2;
    const maxY = this.worldH - viewH * 0.5;

    // If actively dragging, allow elastic overscroll
    if (this.isPanning) {
      // Soft clamp: resist going past bounds
      if (cam.scrollX < minX) {
        cam.scrollX = minX - (minX - cam.scrollX) * (1 - ELASTIC_FACTOR);
      } else if (cam.scrollX > maxX) {
        cam.scrollX = maxX + (cam.scrollX - maxX) * ELASTIC_FACTOR;
      }
      if (cam.scrollY < minY) {
        cam.scrollY = minY - (minY - cam.scrollY) * (1 - ELASTIC_FACTOR);
      } else if (cam.scrollY > maxY) {
        cam.scrollY = maxY + (cam.scrollY - maxY) * ELASTIC_FACTOR;
      }
    } else {
      // Snap back to bounds
      if (cam.scrollX < minX) cam.scrollX += (minX - cam.scrollX) * ELASTIC_SNAP;
      else if (cam.scrollX > maxX) cam.scrollX -= (cam.scrollX - maxX) * ELASTIC_SNAP;
      if (cam.scrollY < minY) cam.scrollY += (minY - cam.scrollY) * ELASTIC_SNAP;
      else if (cam.scrollY > maxY) cam.scrollY -= (cam.scrollY - maxY) * ELASTIC_SNAP;
    }
  }

  get zoom(): number {
    return this.camera.zoom;
  }

  destroy(): void {
    // Phaser cleans up input listeners with the scene
  }
}
