import { describe, it, expect } from 'vitest';
import { Tower } from './Tower';
import { HeadlessScene } from '../headless/HeadlessScene';
import { getTowerType } from '../data/TowerTypes';

/** Minimal display-object double that records visibility, since the
 *  headless Phaser stubs no-op setVisible. */
function fakeDisplay() {
  const d = {
    visible: true,
    setVisible(v: boolean) { d.visible = v; return d; },
  };
  return d;
}

/** Headless scene whose `add.graphics()` returns recording doubles, so
 *  visibility changes on projectiles (created inside Tower.fire) are
 *  observable. Every other Graphics method chains as a no-op. */
function makeScene(): HeadlessScene {
  const scene = new HeadlessScene();
  const created: ReturnType<typeof fakeDisplay>[] = [];
  (scene.add as any).graphics = () => {
    const d: any = fakeDisplay();
    for (const m of ['setDepth', 'clear', 'fillStyle', 'fillCircle', 'lineStyle', 'strokeCircle', 'destroy']) {
      d[m] = () => d;
    }
    created.push(d);
    return d;
  };
  (scene as any)._createdGraphics = created;
  return scene;
}

function makeTower(): Tower {
  const scene = makeScene();
  const tower = new Tower(scene as any, 5, 5, getTowerType('arcane_bolt'));
  // Constructor-created body graphics: swap for a recording double.
  (tower as unknown as { graphics: any }).graphics = (scene.add as any).graphics();
  return tower;
}

function attachSprite(tower: Tower) {
  const sprite = fakeDisplay();
  (tower as unknown as { sprite: typeof sprite }).sprite = sprite as any;
  return sprite;
}

describe('Tower.setVisible (versus board swap)', () => {
  it('hides and restores the tower graphics body', () => {
    const tower = makeTower();
    tower.setVisible(false);
    expect(tower.graphics.visible).toBe(false);
    tower.setVisible(true);
    expect(tower.graphics.visible).toBe(true);
  });

  it('hides and restores the tower sprite when the faction has art', () => {
    const tower = makeTower();
    // Sprite-backed towers draw nothing into `graphics`; the sprite is
    // what is actually on screen, so it must be hidden as well.
    const sprite = attachSprite(tower);
    tower.setVisible(false);
    expect(sprite.visible).toBe(false);
    tower.setVisible(true);
    expect(sprite.visible).toBe(true);
  });

  it('keeps projectiles spawned while hidden invisible', () => {
    const tower = makeTower();
    tower.setVisible(false);

    const target = {
      alive: true, reached: false, x: 400, y: 400,
      lastHitCol: 0, lastHitRow: 0, takeDamage: () => {},
    };
    tower.fire(target as any);
    expect(tower.projectiles).toHaveLength(1);
    expect(tower.projectiles[0].graphics.visible).toBe(false);

    // Coming back to your board reveals the shots still in flight.
    tower.setVisible(true);
    expect(tower.projectiles[0].graphics.visible).toBe(true);
  });
});
