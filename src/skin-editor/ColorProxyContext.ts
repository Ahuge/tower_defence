/**
 * ColorProxyContext — wraps a CanvasRenderingContext2D to intercept fillStyle
 * assignments and remap colors on the fly. This enables skin editing without
 * modifying any existing sprite generator code.
 *
 * Usage:
 *   const { proxy, colorMap } = createColorProxy(realCtx);
 *   colorMap.set('#220044', '#441100');  // remap dark violet to dark red
 *   drawTowers(proxy);  // all #220044 fills become #441100
 */

/** Normalize hex color to lowercase 7-char format (#rrggbb) */
export function normalizeHex(color: string): string {
  const c = color.trim().toLowerCase();
  // Handle 4-char hex (#rgb → #rrggbb)
  if (c.length === 4 && c[0] === '#') {
    return '#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3];
  }
  return c;
}

export interface ColorProxyResult {
  /** Proxied context — pass this to draw functions instead of the real ctx */
  proxy: CanvasRenderingContext2D;
  /** Map of original hex → replacement hex. Modify to change colors. */
  colorMap: Map<string, string>;
  /** Set of all unique colors encountered during drawing (for palette extraction) */
  usedColors: Set<string>;
}

export function createColorProxy(ctx: CanvasRenderingContext2D): ColorProxyResult {
  const colorMap = new Map<string, string>();
  const usedColors = new Set<string>();

  const proxy = new Proxy(ctx, {
    set(target: any, prop: string | symbol, value: any): boolean {
      if (prop === 'fillStyle' && typeof value === 'string') {
        const norm = normalizeHex(value);
        usedColors.add(norm);
        const replacement = colorMap.get(norm);
        if (replacement) {
          target[prop] = replacement;
          return true;
        }
      }
      target[prop] = value;
      return true;
    },
    get(target: any, prop: string | symbol): any {
      const val = target[prop];
      if (typeof val === 'function') {
        return val.bind(target);
      }
      return val;
    },
  });

  return { proxy: proxy as CanvasRenderingContext2D, colorMap, usedColors };
}

/**
 * Extract the color palette from a sprite generator by rendering it once
 * with a proxy context and collecting all fillStyle assignments.
 */
export function extractPalette(
  drawFn: (ctx: CanvasRenderingContext2D) => void,
  width: number,
  height: number,
): string[] {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const { proxy, usedColors } = createColorProxy(ctx);
  drawFn(proxy);

  // Sort by luminance (dark to light) for nice display
  return Array.from(usedColors).sort((a, b) => {
    return hexLuminance(a) - hexLuminance(b);
  });
}

function hexLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}
