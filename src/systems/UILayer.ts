/**
 * UILayer — Centralized UI object factory with correct camera filters.
 *
 * Solves the camera filter bug: when panels rebuild by calling scene.add.*()
 * followed by container.add(), the addedtoscene handler marks new objects as
 * game objects (ignored by UI camera) because they start at depth 0. The
 * per-frame fixUiContainerChildren() was a brittle band-aid.
 *
 * UILayer provides factory methods that create Phaser objects AND immediately
 * set the correct camera filters. Panels use uiLayer.text() instead of
 * scene.add.text(). No deferred fix, no per-frame scan, no depth threshold.
 *
 * Usage:
 *   const uiLayer = scene.uiLayer; // set up in GameScene.setupUiCamera()
 *   const label = uiLayer.text(10, 20, 'Hello', { fontSize: '14px' });
 *   container.add(label);
 */
import * as Phaser from 'phaser';

export class UILayer {
  private scene: Phaser.Scene;
  private _uiCamera: Phaser.Cameras.Scene2D.Camera;
  private mainCamId: number;
  private uiCamId: number;

  constructor(scene: Phaser.Scene, uiCamera: Phaser.Cameras.Scene2D.Camera) {
    this.scene = scene;
    this._uiCamera = uiCamera;
    this.mainCamId = scene.cameras.main.id;
    this.uiCamId = uiCamera.id;
  }

  get camera(): Phaser.Cameras.Scene2D.Camera {
    return this._uiCamera;
  }

  /** Apply UI camera filters: visible on UI camera, hidden from main camera */
  register(obj: Phaser.GameObjects.GameObject): void {
    obj.cameraFilter |= this.mainCamId;    // hide from main (zoom) camera
    obj.cameraFilter &= ~this.uiCamId;     // show on UI camera
  }

  /** Apply game camera filters: visible on main camera, hidden from UI camera */
  registerGame(obj: Phaser.GameObjects.GameObject): void {
    obj.cameraFilter &= ~this.mainCamId;   // show on main camera
    obj.cameraFilter |= this.uiCamId;      // hide from UI camera
  }

  /** Create a text object registered with the UI camera */
  text(x: number, y: number, text: string | string[], style?: Phaser.Types.GameObjects.Text.TextStyle): Phaser.GameObjects.Text {
    const obj = this.scene.add.text(x, y, text, style);
    this.register(obj);
    return obj;
  }

  /** Create a graphics object registered with the UI camera */
  graphics(config?: Phaser.Types.GameObjects.Graphics.Options): Phaser.GameObjects.Graphics {
    const obj = this.scene.add.graphics(config);
    this.register(obj);
    return obj;
  }

  /** Create a container registered with the UI camera */
  container(x?: number, y?: number, children?: Phaser.GameObjects.GameObject[]): Phaser.GameObjects.Container {
    const obj = this.scene.add.container(x, y, children);
    this.register(obj);
    return obj;
  }

  /** Create a zone registered with the UI camera */
  zone(x: number, y: number, width: number, height: number): Phaser.GameObjects.Zone {
    const obj = this.scene.add.zone(x, y, width, height);
    this.register(obj);
    return obj;
  }

  /** Create a sprite registered with the UI camera */
  sprite(x: number, y: number, texture: string, frame?: string | number): Phaser.GameObjects.Sprite {
    const obj = this.scene.add.sprite(x, y, texture, frame);
    this.register(obj);
    return obj;
  }

  /** Register all children of a container with the UI camera.
   *  Use after container.add() for objects not created via UILayer methods. */
  registerChildren(container: Phaser.GameObjects.Container): void {
    for (const child of container.list) {
      this.register(child);
    }
  }

  destroy(): void {
    // Camera is cleaned up by the scene
  }
}

/** Get the UILayer from a scene (if it's a GameScene with one set up).
 *  Returns null for non-game scenes (menus, encyclopedia, etc.) */
export function getUILayer(scene: Phaser.Scene): UILayer | null {
  return (scene as any).uiLayer ?? null;
}

/** Create a UI-aware text object. Uses UILayer if available, falls back to scene.add. */
export function uiText(scene: Phaser.Scene, x: number, y: number, text: string | string[], style?: Phaser.Types.GameObjects.Text.TextStyle): Phaser.GameObjects.Text {
  const layer = getUILayer(scene);
  return layer ? layer.text(x, y, text, style) : scene.add.text(x, y, text, style);
}

/** Create a UI-aware graphics object. Uses UILayer if available, falls back to scene.add. */
export function uiGraphics(scene: Phaser.Scene, config?: Phaser.Types.GameObjects.Graphics.Options): Phaser.GameObjects.Graphics {
  const layer = getUILayer(scene);
  return layer ? layer.graphics(config) : scene.add.graphics(config);
}

/** Create a UI-aware sprite. Uses UILayer if available, falls back to scene.add. */
export function uiSprite(scene: Phaser.Scene, x: number, y: number, texture: string, frame?: string | number): Phaser.GameObjects.Sprite {
  const layer = getUILayer(scene);
  return layer ? layer.sprite(x, y, texture, frame) : scene.add.sprite(x, y, texture, frame);
}

/** Create a UI-aware zone. Uses UILayer if available, falls back to scene.add. */
export function uiZone(scene: Phaser.Scene, x: number, y: number, width: number, height: number): Phaser.GameObjects.Zone {
  const layer = getUILayer(scene);
  return layer ? layer.zone(x, y, width, height) : scene.add.zone(x, y, width, height);
}

