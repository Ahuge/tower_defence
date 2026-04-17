/**
 * PanelBase — Reusable base class for sidebar panels.
 *
 * Provides:
 * - A container with proper depth for the UI camera
 * - Factory methods (dText, dGraphics, dSprite, dZone) that create objects,
 *   add them to the container, and track them as dynamic in one call
 * - Snapshot-based rebuild: rebuildIfChanged(snapshot, builder) clears
 *   dynamic items and runs the builder only when the snapshot changes
 * - Divider helper
 *
 * Panels extend PanelBase and implement their layout in the rebuild builder.
 * This eliminates the repetitive 3-line pattern:
 *   const obj = uiText(scene, ...);
 *   this.container.add(obj);
 *   this.dynamicItems.push(obj);
 * → replaced with:
 *   this.dText(x, y, text, style);
 */
import * as Phaser from 'phaser';
import { uiText, uiGraphics, uiSprite, uiZone } from '../systems/UILayer';
import { getSidebarWidth } from '../config';

export class PanelBase {
  protected scene: Phaser.Scene;
  protected container: Phaser.GameObjects.Container;
  private _dynamicItems: Phaser.GameObjects.GameObject[] = [];
  private _lastSnapshot: string = '';

  constructor(scene: Phaser.Scene, x: number, y: number, depth: number = 28) {
    this.scene = scene;
    this.container = scene.add.container(x, y).setDepth(depth);
  }

  // ===================== Dynamic Item Factories =====================
  // Each creates an object, adds to container, and tracks it for cleanup.

  /** Create a dynamic text object inside this panel's container */
  protected dText(x: number, y: number, text: string | string[], style?: Phaser.Types.GameObjects.Text.TextStyle): Phaser.GameObjects.Text {
    const obj = uiText(this.scene, x, y, text, style);
    this.container.add(obj);
    this._dynamicItems.push(obj);
    return obj;
  }

  /** Create a dynamic graphics object inside this panel's container */
  protected dGraphics(): Phaser.GameObjects.Graphics {
    const obj = uiGraphics(this.scene);
    this.container.add(obj);
    this._dynamicItems.push(obj);
    return obj;
  }

  /** Create a dynamic sprite inside this panel's container */
  protected dSprite(x: number, y: number, texture: string, frame?: string | number): Phaser.GameObjects.Sprite {
    const obj = uiSprite(this.scene, x, y, texture, frame);
    this.container.add(obj);
    this._dynamicItems.push(obj);
    return obj;
  }

  /** Create a dynamic zone inside this panel's container */
  protected dZone(x: number, y: number, width: number, height: number): Phaser.GameObjects.Zone {
    const obj = uiZone(this.scene, x, y, width, height);
    this.container.add(obj);
    this._dynamicItems.push(obj);
    return obj;
  }

  /** Add a horizontal divider line */
  protected dDivider(y: number, marginX: number = 8): void {
    const g = this.dGraphics();
    g.lineStyle(1, 0x444444, 0.5);
    g.lineBetween(marginX, y, getSidebarWidth() - marginX, y);
  }

  // ===================== Snapshot Rebuild =====================

  /** Clear all dynamic items and run the builder if the snapshot changed.
   *  Returns true if a rebuild occurred. */
  protected rebuildIfChanged(snapshot: string, builder: () => void): boolean {
    if (snapshot === this._lastSnapshot) return false;
    this.clearDynamic();
    builder();
    this._lastSnapshot = snapshot;
    return true;
  }

  /** Force a rebuild on next check by clearing the snapshot */
  protected invalidate(): void {
    this._lastSnapshot = '';
  }

  /** Remove and destroy all dynamic items */
  protected clearDynamic(): void {
    for (const obj of this._dynamicItems) {
      this.container.remove(obj, true);
    }
    this._dynamicItems = [];
  }

  // ===================== Lifecycle =====================

  getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }

  destroy(): void {
    this.clearDynamic();
    this.container.destroy();
  }
}
