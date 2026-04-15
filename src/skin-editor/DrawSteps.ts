/**
 * DrawSteps — Introspectable drawing operation format.
 *
 * A tower's visual is decomposed into an ordered list of DrawSteps.
 * Each step has a type, parameters, and conditions (min level, anim state).
 * The skin editor can toggle, reorder, modify, and add steps.
 *
 * Steps are rendered sequentially onto the canvas using the standard
 * mk() helper (p for pixels, b for boxes).
 */

// ─── Step types ─────────────────────────────────────

export type DrawStepType =
  | 'base'           // Faction pedestal (arcaneBase, mechBase, etc.)
  | 'crystal_spire'  // Tapered crystal column
  | 'diamond'        // Diamond/rhombus shape
  | 'orb'            // Circular energy orb
  | 'box'            // Filled rectangle
  | 'pixel'          // Single pixel
  | 'tendril'        // Wavy line connecting two points
  | 'orbit'          // Floating orbiting dot
  | 'ring'           // Circle of dots
  | 'burst'          // Radial particle burst
  | 'line'           // Straight pixel line
  | 'custom';        // Raw draw function (escape hatch)

export interface DrawStep {
  /** Unique ID for this step (for editing/toggling) */
  id: string;
  /** Human-readable label */
  label: string;
  /** Step type determines the renderer */
  type: DrawStepType;
  /** Parameters vary by type */
  params: Record<string, any>;
  /** Minimum level required (1 = always, 2+ = conditional) */
  minLevel?: number;
  /** Animation state condition: 0=idle, 1=charge, 2=fire, 3=cooldown, -1=any */
  animState?: number;
  /** Whether this step is enabled (for toggling in editor) */
  enabled?: boolean;
}

// ─── Step renderer ──────────────────────────────────

type PixelFn = (x: number, y: number, color: string) => void;
type BoxFn = (x: number, y: number, w: number, h: number, color: string) => void;

export interface StepContext {
  p: PixelFn;
  b: BoxFn;
  level: number;
  state: number;   // 0-3 animation state
  cx: number;      // center X (usually 16)
  cy: number;      // computed center Y (varies with level)
}

/** Render a single step */
export function renderStep(step: DrawStep, ctx: StepContext): void {
  if (step.enabled === false) return;
  if (step.minLevel && ctx.level < step.minLevel) return;
  if (step.animState !== undefined && step.animState !== -1 && step.animState !== ctx.state) return;

  const { p, b, level, state, cx, cy } = ctx;
  const params = step.params;

  switch (step.type) {
    case 'crystal_spire': {
      // Tapered crystal column
      const { x = cx, y: sy = cy, h = 10, w = 3, c1, c2, ct } = params;
      for (let i = 0; i < h; i++) {
        const pr = i / h;
        const cw = Math.max(1, Math.round(w * (1 - pr * 0.85)));
        b(x + Math.floor((w - cw) / 2), sy + h - 1 - i, cw, 1,
          pr < 0.15 ? ct : pr < 0.5 ? c2 : c1);
      }
      break;
    }

    case 'diamond': {
      // Diamond/rhombus shape
      const { x = cx, y: dy = cy, size = 4, colors } = params;
      const colArr = Array.isArray(colors) ? colors : [colors];
      for (let i = 0; i < size; i++) {
        const hw = i < Math.ceil(size / 2) ? i + 1 : size - i;
        const colorIdx = Math.min(Math.floor(i / (size / colArr.length)), colArr.length - 1);
        b(x - hw, dy - Math.floor(size / 2) + i, hw * 2, 1, colArr[colorIdx]);
      }
      break;
    }

    case 'orb': {
      // Circular energy orb
      const { x = cx, y: oy = cy, radius = 3, colors } = params;
      const { inner, mid, outer } = colors;
      for (let r = radius; r > 0; r--) {
        for (let i = 0; i < 8; i++) {
          const a = i * Math.PI / 4;
          const color = r > radius - 1 ? outer : r > radius * 0.5 ? mid : inner;
          p(x + Math.round(Math.cos(a) * r), oy + Math.round(Math.sin(a) * r), color);
        }
      }
      b(x - 1, oy - 1, 2, 2, colors.core ?? inner);
      break;
    }

    case 'box': {
      const { x, y, w, h, color } = params;
      b(x, y, w, h, color);
      break;
    }

    case 'pixel': {
      const { x, y, color } = params;
      p(x, y, color);
      break;
    }

    case 'orbit': {
      // Floating dot at animated position
      const { x = cx, y: oy = cy, phase = 0, radiusX = 3, radiusY = 1.5, color, trailColor } = params;
      const ox = x + Math.round(Math.cos(state * phase) * radiusX);
      const ooy = oy + Math.round(Math.sin(state * phase) * radiusY);
      p(ox, ooy, color);
      if (trailColor) p(ox, ooy - 1, trailColor);
      break;
    }

    case 'ring': {
      // Circle of dots
      const { x = cx, y: ry = cy, radius = 6, count = 8, colors } = params;
      const colArr = Array.isArray(colors) ? colors : [colors];
      for (let i = 0; i < count; i++) {
        const a = i * Math.PI * 2 / count;
        p(x + Math.round(Math.cos(a) * radius), ry + Math.round(Math.sin(a) * (radius - 1)),
          colArr[i % colArr.length]);
      }
      break;
    }

    case 'burst': {
      // Radial particle burst
      const { x = cx, y: by = cy, count = 8, minR = 3, maxR = 6, colors } = params;
      const colArr = Array.isArray(colors) ? colors : [colors];
      for (let i = 0; i < count; i++) {
        const a = i * Math.PI * 2 / count;
        const r = minR + (i % 2) * (maxR - minR) / 2;
        p(x + Math.round(Math.cos(a) * r), by + Math.round(Math.sin(a) * r),
          colArr[i % colArr.length]);
      }
      break;
    }

    case 'tendril': {
      // Wavy line between two points
      const { x1, y1, x2, y2, color, brightColor, amplitude = 1.2, frequency = 3 } = params;
      const dy = y2 - y1, dx = x2 - x1;
      for (let i = 0; i <= Math.abs(dy); i++) {
        const t = i / Math.max(1, Math.abs(dy));
        const yy = y1 + Math.round(i * Math.sign(dy));
        const xx = Math.round(x1 + dx * t + Math.sin(t * Math.PI * frequency) * amplitude);
        p(xx, yy, brightColor && i % 2 === 0 ? brightColor : color);
      }
      break;
    }

    case 'line': {
      // Straight pixel line
      const { x1, y1, x2, y2, color } = params;
      const dx = Math.abs(x2 - x1), dy = Math.abs(y2 - y1);
      const steps = Math.max(dx, dy);
      for (let i = 0; i <= steps; i++) {
        const t = steps === 0 ? 0 : i / steps;
        p(Math.round(x1 + (x2 - x1) * t), Math.round(y1 + (y2 - y1) * t), color);
      }
      break;
    }

    case 'custom': {
      // Raw function call — escape hatch for complex logic
      if (typeof params.fn === 'function') {
        params.fn(p, b, level, state, cx, cy);
      }
      break;
    }
  }
}

/** Render all steps in order */
export function renderSteps(steps: DrawStep[], ctx: StepContext): void {
  for (const step of steps) {
    renderStep(step, ctx);
  }
}

// ─── Shape library for adding new steps ─────────────

export interface ShapeTemplate {
  type: DrawStepType;
  label: string;
  description: string;
  defaultParams: Record<string, any>;
}

export const SHAPE_LIBRARY: ShapeTemplate[] = [
  {
    type: 'crystal_spire',
    label: 'Crystal Spire',
    description: 'Tapered crystal column, taller = more imposing',
    defaultParams: { x: 16, y: 5, h: 12, w: 3, c1: '#442288', c2: '#6644ff', ct: '#9988ff' },
  },
  {
    type: 'diamond',
    label: 'Diamond',
    description: 'Diamond/rhombus shape, multi-color gradient',
    defaultParams: { x: 16, y: 10, size: 6, colors: ['#bbaaff', '#9988ff', '#6644ff'] },
  },
  {
    type: 'orb',
    label: 'Energy Orb',
    description: 'Glowing circular orb with layered colors',
    defaultParams: { x: 16, y: 8, radius: 4, colors: { core: '#ffffff', inner: '#ffee88', mid: '#ffdd44', outer: '#ccaa22' } },
  },
  {
    type: 'ring',
    label: 'Particle Ring',
    description: 'Circle of dots around a point',
    defaultParams: { x: 16, y: 10, radius: 6, count: 8, colors: ['#9988ff', '#6644ff'] },
  },
  {
    type: 'burst',
    label: 'Radial Burst',
    description: 'Explosion of particles outward',
    defaultParams: { x: 16, y: 10, count: 10, minR: 3, maxR: 7, colors: ['#ffffff', '#ffee88', '#ffdd44'] },
  },
  {
    type: 'tendril',
    label: 'Energy Tendril',
    description: 'Wavy connecting line between two points',
    defaultParams: { x1: 14, y1: 12, x2: 13, y2: 23, color: '#6644ff', brightColor: '#eeccff', amplitude: 1.2, frequency: 3 },
  },
  {
    type: 'orbit',
    label: 'Orbiting Dot',
    description: 'Floating dot that moves with animation state',
    defaultParams: { x: 16, y: 5, phase: 1.5, radiusX: 3, radiusY: 1.5, color: '#9988ff', trailColor: '#eeccff' },
  },
  {
    type: 'box',
    label: 'Filled Box',
    description: 'Simple filled rectangle',
    defaultParams: { x: 14, y: 8, w: 4, h: 4, color: '#6644ff' },
  },
  {
    type: 'pixel',
    label: 'Single Pixel',
    description: 'One dot of color',
    defaultParams: { x: 16, y: 8, color: '#ffffff' },
  },
  {
    type: 'line',
    label: 'Pixel Line',
    description: 'Straight line between two points',
    defaultParams: { x1: 14, y1: 5, x2: 18, y2: 5, color: '#9988ff' },
  },
];
