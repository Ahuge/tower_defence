/**
 * Reusable scrollable container for Phaser scenes.
 * Uses a graphics mask to clip content, with touch drag + mouse wheel scrolling.
 *
 * Usage:
 *   const panel = new ScrollablePanel(scene, x, y, width, height);
 *   panel.addContent(someGameObject); // add items to the scroll content
 *   panel.setContentHeight(totalH);   // tell it how tall the content is
 *   // In scene update: panel.update() if needed
 *   // Cleanup: panel.destroy()
 */
export class ScrollablePanel {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private content: Phaser.GameObjects.Container;
  private maskGraphics: Phaser.GameObjects.Graphics;
  private scrollY: number = 0;
  private contentHeight: number = 0;
  private readonly viewWidth: number;
  private readonly viewHeight: number;
  private readonly viewX: number;
  private readonly viewY: number;

  // Drag state
  private isDragging: boolean = false;
  private dragStartY: number = 0;
  private dragStartScroll: number = 0;
  private velocity: number = 0;

  private static readonly FRICTION = 0.92;
  private static readonly MIN_VELOCITY = 0.5;

  constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number, depth: number = 0) {
    this.scene = scene;
    this.viewX = x;
    this.viewY = y;
    this.viewWidth = width;
    this.viewHeight = height;

    // Outer container positioned at x, y
    this.container = scene.add.container(x, y).setDepth(depth);

    // Content container — this moves up/down inside the mask
    this.content = scene.add.container(0, 0);
    this.container.add(this.content);

    // Mask to clip content to the visible area
    this.maskGraphics = scene.add.graphics();
    this.maskGraphics.fillRect(x, y, width, height);
    const mask = this.maskGraphics.createGeometryMask();
    this.container.setMask(mask);

    // Touch drag scrolling
    const hitZone = scene.add.zone(width / 2, height / 2, width, height)
      .setInteractive({ draggable: false, useHandCursor: false });
    this.container.add(hitZone);

    scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Check if pointer is within our bounds
      if (pointer.x >= x && pointer.x <= x + width &&
          pointer.y >= y && pointer.y <= y + height) {
        this.isDragging = true;
        this.dragStartY = pointer.y;
        this.dragStartScroll = this.scrollY;
        this.velocity = 0;
      }
    });

    scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isDragging || !pointer.isDown) return;
      const dy = pointer.y - this.dragStartY;
      this.scrollY = this.dragStartScroll + dy;
      this.velocity = pointer.y - (pointer.prevPosition?.y ?? pointer.y);
      this.clampScroll();
      this.content.setY(this.scrollY);
    });

    scene.input.on('pointerup', () => {
      this.isDragging = false;
    });

    // Mouse wheel scrolling
    scene.input.on('wheel', (_p: unknown, _g: unknown, _dx: number, dy: number) => {
      this.scrollY -= dy * 0.5;
      this.clampScroll();
      this.content.setY(this.scrollY);
    });
  }

  /** Add a game object to the scrollable content */
  addContent(obj: Phaser.GameObjects.GameObject): void {
    this.content.add(obj);
  }

  /** Set the total height of the content (for scroll bounds) */
  setContentHeight(h: number): void {
    this.contentHeight = h;
  }

  /** Call each frame to apply momentum */
  update(): void {
    if (!this.isDragging && Math.abs(this.velocity) > ScrollablePanel.MIN_VELOCITY) {
      this.scrollY += this.velocity;
      this.velocity *= ScrollablePanel.FRICTION;
      this.clampScroll();
      this.content.setY(this.scrollY);
    }
  }

  private clampScroll(): void {
    const maxScroll = Math.min(0, -(this.contentHeight - this.viewHeight));
    this.scrollY = Phaser.Math.Clamp(this.scrollY, maxScroll, 0);
  }

  /** Get the content container (for adding children directly) */
  getContent(): Phaser.GameObjects.Container {
    return this.content;
  }

  /** Get the outer container */
  getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }

  destroy(): void {
    this.maskGraphics.destroy();
    this.container.destroy(true);
  }
}
