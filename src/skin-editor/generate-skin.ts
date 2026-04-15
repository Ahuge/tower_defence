/**
 * Headless skin generator — renders a skin from a palette JSON.
 * Run from the skin editor page console or import as a module.
 *
 * Usage: generateSkin('mechanical', paletteJson) → downloads PNGs
 */
import { createColorProxy, normalizeHex } from './ColorProxyContext';

export async function generateSkin(factionId: string, towerPalettes: Record<number, Record<string, string>>): Promise<{ towers: HTMLCanvasElement; proj: HTMLCanvasElement }> {
  const modules: Record<string, () => Promise<any>> = {
    // @ts-expect-error
    arcane: () => import('../../arcane_sprites.tsx'),
    // @ts-expect-error
    mechanical: () => import('../../mechanical_sprites.tsx'),
    // @ts-expect-error
    nature: () => import('../../nature_sprites.tsx'),
    // @ts-expect-error
    void: () => import('../../void_sprites.tsx'),
    // @ts-expect-error
    military: () => import('../../military_sprites.tsx'),
    // @ts-expect-error
    aliens: () => import('../../aliens_sprites.tsx'),
    // @ts-expect-error
    cypherpunk: () => import('../../cypherpunk_sprites.tsx'),
    // @ts-expect-error
    infernal: () => import('../../infernal_sprites.tsx'),
    // @ts-expect-error
    celestial: () => import('../../celestial_sprites.tsx'),
    // @ts-expect-error
    psionic: () => import('../../psionic_sprites.tsx'),
    // @ts-expect-error
    harmonic: () => import('../../harmonic_sprites.tsx'),
  };

  const mod = await modules[factionId]!();
  const { drawTowers, drawProjectiles } = mod;

  // Get dimensions from drawTowers
  const tmpC = document.createElement('canvas');
  tmpC.width = 2000; tmpC.height = 2000;
  const tmpCtx = tmpC.getContext('2d')!;
  const info = drawTowers(tmpCtx);

  // Build global color map from -1 key
  const globalMap = towerPalettes[-1] ?? towerPalettes['-1' as any] ?? {};

  // Render towers with per-column color maps
  const towerCanvas = document.createElement('canvas');
  towerCanvas.width = info.cols * info.cell;
  towerCanvas.height = info.rows * info.cell;
  const tCtx = towerCanvas.getContext('2d')!;
  tCtx.imageSmoothingEnabled = false;

  for (let col = 0; col < info.cols; col++) {
    const colorMap = new Map<string, string>();
    for (const [k, v] of Object.entries(globalMap)) colorMap.set(normalizeHex(k), normalizeHex(v as string));
    const perTower = towerPalettes[col] ?? towerPalettes[String(col) as any] ?? {};
    for (const [k, v] of Object.entries(perTower)) colorMap.set(normalizeHex(k), normalizeHex(v as string));

    if (colorMap.size === 0) {
      tCtx.save(); tCtx.beginPath(); tCtx.rect(col * info.cell, 0, info.cell, info.rows * info.cell); tCtx.clip();
      drawTowers(tCtx); tCtx.restore();
    } else {
      const { proxy, colorMap: pm } = createColorProxy(tCtx);
      for (const [k, v] of colorMap) pm.set(k, v);
      tCtx.save(); tCtx.beginPath(); tCtx.rect(col * info.cell, 0, info.cell, info.rows * info.cell); tCtx.clip();
      drawTowers(proxy); tCtx.restore();
    }
  }

  // Render projectiles similarly
  const projCanvas = document.createElement('canvas');
  const pInfo = drawProjectiles(document.createElement('canvas').getContext('2d')!);
  // Re-render with actual dimensions
  projCanvas.width = info.cols * 32; // projCell = 32
  projCanvas.height = 6 * 32;
  const pCtx = projCanvas.getContext('2d')!;
  pCtx.imageSmoothingEnabled = false;

  for (let col = 0; col < info.cols; col++) {
    const colorMap = new Map<string, string>();
    for (const [k, v] of Object.entries(globalMap)) colorMap.set(normalizeHex(k), normalizeHex(v as string));
    const perTower = towerPalettes[col] ?? towerPalettes[String(col) as any] ?? {};
    for (const [k, v] of Object.entries(perTower)) colorMap.set(normalizeHex(k), normalizeHex(v as string));

    if (colorMap.size === 0) {
      pCtx.save(); pCtx.beginPath(); pCtx.rect(col * 32, 0, 32, 6 * 32); pCtx.clip();
      drawProjectiles(pCtx); pCtx.restore();
    } else {
      const { proxy, colorMap: pm } = createColorProxy(pCtx);
      for (const [k, v] of colorMap) pm.set(k, v);
      pCtx.save(); pCtx.beginPath(); pCtx.rect(col * 32, 0, 32, 6 * 32); pCtx.clip();
      drawProjectiles(proxy); pCtx.restore();
    }
  }

  return { towers: towerCanvas, proj: projCanvas };
}
