/**
 * phaser_shim.ts — Minimal Phaser runtime stub for browser replay simulation.
 * HeadlessScene provides all the scene methods via Proxy; entities only need
 * Phaser.Math.Clamp / Distance / Between if referenced at runtime.
 */
export const Math = {
  Clamp: (v: number, min: number, max: number) => globalThis.Math.min(max, globalThis.Math.max(min, v)),
  Between: (min: number, max: number) => globalThis.Math.floor(globalThis.Math.random() * (max - min + 1)) + min,
  Distance: {
    Between: (x1: number, y1: number, x2: number, y2: number) => globalThis.Math.hypot(x2 - x1, y2 - y1),
  },
};
export const GameObjects = {
  Container: class {},
  Graphics: class {},
  Sprite: class {},
  Text: class {},
};
export const Scene = class {};
export const Textures = { FilterMode: { NEAREST: 0, LINEAR: 1 } };
export default { Math, GameObjects, Scene, Textures };
