/**
 * ArcaneStepDefs — Arcane tower draw functions decomposed into DrawSteps.
 *
 * Each tower's visual is an ordered list of steps that the editor can
 * inspect, toggle, reorder, and modify. This is the template for
 * converting other factions.
 *
 * The 'custom' step type wraps logic too complex for the step system
 * (like level-dependent loops). Over time these can be decomposed further.
 */
import { DrawStep } from './DrawSteps';

/** Bolt tower — decomposed into named steps */
export function getBoltSteps(level: number, state: number): DrawStep[] {
  const glow = level >= 3 ? 2 : level >= 2 ? 1 : 0;
  const cy = 12 - Math.min(level, 4);
  const cSize = 4 + level;
  const BOLT_DK = '#2255aa', BOLT_MD = '#4488ff', BOLT_LT = '#88bbff', BOLT_PL = '#ccddff', BOLT_BR = '#aaccff';

  const steps: DrawStep[] = [
    {
      id: 'base', label: 'Crystal Pedestal', type: 'base',
      params: { topY: 23, width: 18, glow },
    },
    {
      id: 'body', label: 'Crystal Body (Diamond)', type: 'diamond',
      params: { x: 16, y: cy, size: cSize, colors: [BOLT_PL, BOLT_LT, BOLT_MD] },
    },
    {
      id: 'core', label: 'Inner Core Glow', type: 'box',
      params: { x: 15, y: cy - 1, w: 2, h: 2, color: level >= 4 ? '#ffffff' : level >= 3 ? BOLT_PL : BOLT_LT },
    },
    {
      id: 'core_center', label: 'Core Center Pixel', type: 'pixel',
      params: { x: 16, y: cy, color: level >= 3 ? '#ffffff' : BOLT_LT },
    },
    {
      id: 'tendril_left', label: 'Left Tendril', type: 'tendril',
      params: { x1: 14, y1: cy + 3, x2: 13, y2: 23, color: level >= 3 ? BOLT_LT : BOLT_MD, brightColor: level >= 4 ? '#eeccff' : undefined },
    },
    {
      id: 'tendril_right', label: 'Right Tendril', type: 'tendril',
      params: { x1: 18, y1: cy + 3, x2: 19, y2: 23, color: level >= 3 ? BOLT_LT : BOLT_MD, brightColor: level >= 4 ? '#eeccff' : undefined },
    },
    {
      id: 'tendril_outer_left', label: 'Outer Left Tendril', type: 'tendril',
      params: { x1: 12, y1: cy + 4, x2: 10, y2: 23, color: BOLT_DK, brightColor: level >= 4 ? '#eeccff' : undefined },
      minLevel: 3,
    },
    {
      id: 'tendril_outer_right', label: 'Outer Right Tendril', type: 'tendril',
      params: { x1: 20, y1: cy + 4, x2: 22, y2: 23, color: BOLT_DK, brightColor: level >= 4 ? '#eeccff' : undefined },
      minLevel: 3,
    },
    {
      id: 'orbit_main', label: 'Main Orbiting Crystal', type: 'orbit',
      params: { x: 16, y: cy - 5, phase: 1.5, color: BOLT_BR, trailColor: '#eeccff' },
    },
    {
      id: 'orbit_left', label: 'Left Orbit', type: 'orbit',
      params: { x: 12, y: cy - 3, phase: 1.5, color: BOLT_PL, trailColor: '#eeccff' },
      minLevel: 2,
    },
    {
      id: 'orbit_right', label: 'Right Orbit', type: 'orbit',
      params: { x: 20, y: cy - 3, phase: 1.5, color: BOLT_LT, trailColor: '#eeccff' },
      minLevel: 3,
    },
    {
      id: 'orbit_top', label: 'Top Orbit', type: 'orbit',
      params: { x: 16, y: cy - 7, phase: 1.0, color: '#ffffff', trailColor: '#eeccff' },
      minLevel: 4,
    },
    {
      id: 'pulse_inner', label: 'Inner Pulse Particles', type: 'custom',
      params: { fn: (p: any, _b: any, lvl: number) => {
        if (lvl >= 2) { p(10, cy - 1, BOLT_BR); p(22, cy, BOLT_BR); }
        if (lvl >= 3) { p(8, cy + 1, BOLT_PL); p(24, cy - 1, BOLT_PL); }
      }},
      minLevel: 2,
    },
    {
      id: 'pulse_ring', label: 'Pulse Ring', type: 'ring',
      params: { x: 16, y: cy, radius: 6, count: 6, colors: [BOLT_PL] },
      minLevel: 4,
    },
    {
      id: 'glow_aura', label: 'Glow Aura Ring', type: 'ring',
      params: { x: 16, y: cy, radius: level >= 4 ? 8 : 6, count: 8, colors: [level >= 4 ? BOLT_LT : BOLT_DK] },
      minLevel: 3,
    },
    {
      id: 'base_runes', label: 'Base Rune Accents', type: 'custom',
      params: { fn: (p: any, _b: any, lvl: number) => {
        if (lvl >= 2) { p(10, 22, BOLT_MD); p(22, 22, BOLT_MD); }
        if (lvl >= 3) { p(8, 21, BOLT_BR); p(24, 21, BOLT_BR); }
      }},
      minLevel: 2,
    },
    {
      id: 'cooldown_dim', label: 'Cooldown Dim', type: 'custom',
      params: { fn: (p: any) => { p(15, cy, BOLT_DK); p(17, cy, BOLT_DK); }},
      animState: 3,
    },
  ];

  return steps;
}

/** Get step definitions for all Arcane towers */
export const ARCANE_TOWER_STEPS: Record<string, (level: number, state: number) => DrawStep[]> = {
  arcane_bolt: getBoltSteps,
  // Other Arcane towers will be added as they're decomposed
};
