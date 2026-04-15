// @ts-nocheck
/**
 * Frontier Doodad Sprites — tiny pixel art buildings placed on blocked terrain
 * when frontier/essence buildings are purchased. One design per faction.
 *
 * Each doodad is 14x14 grid units (28x28 pixels at PX=2).
 * Uses faction C_base colors for terrain consistency.
 */

const PX = 2, G = 14, CELL = G * PX;

const mk = (c: CanvasRenderingContext2D, o: number[], gw: number, gh: number, ps: number) => {
  const p = (x: number, y: number, cl: string) => { if (!cl || x < 0 || x >= gw || y < 0 || y >= gh) return; c.fillStyle = cl; c.fillRect(o[0] + x * ps, o[1] + y * ps, ps, ps); };
  const b = (x: number, y: number, w: number, h: number, cl: string) => { if (!cl) return; c.fillStyle = cl; c.fillRect(o[0] + x * ps, o[1] + y * ps, w * ps, h * ps); };
  return { p, b };
};

// ═══ ARCANE — Leyline Crystal ═══
// Floating crystal on a small pedestal with rune glow
export function drawArcane(c: CanvasRenderingContext2D, ox: number, oy: number) {
  const { p, b } = mk(c, [ox, oy], G, G, PX);
  // Pedestal
  b(4, 11, 6, 2, '#442288'); b(5, 10, 4, 1, '#331166');
  b(3, 12, 8, 1, '#220044'); p(3, 13, '#110022');p(10, 13, '#110022');
  // Crystal
  b(6, 3, 2, 6, '#6644ff'); p(6, 2, '#9988ff'); p(7, 2, '#9988ff');
  p(5, 4, '#442288'); p(8, 4, '#442288');
  p(6, 3, '#bbaaff'); // highlight
  // Glow particles
  p(4, 5, '#cc88ff'); p(9, 6, '#cc88ff');
  p(3, 8, '#eeccff'); p(10, 3, '#eeccff');
}

// ═══ MECHANICAL — Gear Shed ═══
// Small industrial building with smokestack and gear
export function drawMechanical(c: CanvasRenderingContext2D, ox: number, oy: number) {
  const { p, b } = mk(c, [ox, oy], G, G, PX);
  // Building body
  b(2, 7, 8, 5, '#664411'); b(3, 7, 6, 4, '#885511');
  b(2, 12, 10, 1, '#332211');
  // Roof
  b(1, 6, 10, 1, '#aa6622'); b(2, 5, 8, 1, '#cc8833');
  // Smokestack
  b(8, 2, 2, 4, '#888888'); b(8, 1, 2, 1, '#aaaaaa');
  // Smoke puffs
  p(9, 0, '#bbbbbb'); p(8, 0, '#999999');
  // Gear on wall
  p(4, 8, '#888888'); p(5, 9, '#888888'); p(3, 9, '#888888'); p(4, 10, '#888888');
  p(4, 9, '#aaaaaa'); // gear center
  // Door
  b(6, 9, 2, 3, '#332211');
}

// ═══ NATURE — Tree Stump Garden ═══
// Cut stump with mushrooms and small plants growing
export function drawNature(c: CanvasRenderingContext2D, ox: number, oy: number) {
  const { p, b } = mk(c, [ox, oy], G, G, PX);
  // Stump
  b(4, 8, 6, 4, '#664422'); b(5, 7, 4, 1, '#885533');
  b(5, 8, 4, 2, '#aa7744'); // light face
  b(3, 12, 8, 1, '#3a2211');
  // Rings on top
  p(6, 7, '#aa7744'); p(7, 7, '#664422');
  // Mushrooms left
  p(1, 10, '#ee55aa'); b(1, 11, 1, 1, '#cc2288'); p(0, 10, '#ff88cc');
  p(2, 9, '#ee55aa'); p(2, 10, '#885533');
  // Small plant right
  p(11, 9, '#33aa44'); p(11, 10, '#226633'); p(10, 8, '#66dd77');
  p(12, 8, '#33aa44');
  // Moss on stump
  p(4, 7, '#446633'); p(9, 8, '#446633');
}

// ═══ VOID — Rift Portal ═══
// Small swirling portal on the ground
export function drawVoid(c: CanvasRenderingContext2D, ox: number, oy: number) {
  const { p, b } = mk(c, [ox, oy], G, G, PX);
  // Ground crack
  b(3, 10, 8, 2, '#1a0033'); b(4, 9, 6, 1, '#0f0019');
  b(2, 12, 10, 1, '#08000f');
  // Portal ring
  p(4, 6, '#442288'); p(9, 6, '#442288');
  p(3, 7, '#6644cc'); p(10, 7, '#6644cc');
  p(3, 9, '#6644cc'); p(10, 9, '#6644cc');
  p(4, 10, '#442288'); p(9, 10, '#442288');
  // Portal center glow
  b(5, 7, 4, 3, '#2a1155'); b(6, 7, 2, 3, '#442288');
  p(6, 8, '#8866ee'); p(7, 8, '#6644cc');
  // Floating sparks
  p(5, 4, '#ff4488'); p(8, 3, '#00ffcc');
  p(2, 5, '#ff77bb'); p(11, 4, '#66ffe6');
}

// ═══ MILITARY — Sandbag Bunker ═══
// Small fortified position with flag
export function drawMilitary(c: CanvasRenderingContext2D, ox: number, oy: number) {
  const { p, b } = mk(c, [ox, oy], G, G, PX);
  // Sandbags
  b(2, 9, 10, 3, '#c2b280'); b(3, 8, 8, 1, '#d4c8a0');
  b(1, 11, 12, 1, '#8a7a50'); b(2, 12, 10, 1, '#5c4033');
  // Sandbag detail
  p(4, 9, '#8a7a50'); p(7, 9, '#8a7a50'); p(10, 10, '#8a7a50');
  p(3, 10, '#d4c8a0'); p(6, 10, '#d4c8a0'); p(9, 10, '#d4c8a0');
  // Opening
  b(5, 8, 4, 2, '#3a2820');
  // Flag pole
  b(10, 2, 1, 7, '#555555');
  // Flag
  b(7, 2, 3, 2, '#556b2f'); p(7, 3, '#8fbc8f');
}

// ═══ ALIENS — Organic Pod ═══
// Bulbous alien growth pod with tendrils
export function drawAliens(c: CanvasRenderingContext2D, ox: number, oy: number) {
  const { p, b } = mk(c, [ox, oy], G, G, PX);
  // Base tendrils
  p(3, 12, '#445522'); p(10, 12, '#445522');
  p(2, 11, '#334411'); p(11, 11, '#334411');
  // Pod body
  b(4, 7, 6, 5, '#445522'); b(5, 6, 4, 5, '#667744');
  b(5, 7, 4, 4, '#556633');
  // Pod highlight
  b(6, 7, 2, 2, '#88ff44'); p(6, 6, '#aaff66');
  // Top nub
  p(6, 5, '#667744'); p(7, 5, '#445522');
  // Slime drip
  p(4, 11, '#77cc22'); p(9, 12, '#77cc22');
  // Glow
  p(5, 9, '#88ff44');
}

// ═══ CYPHERPUNK — Server Rack ═══
// Small server with blinking lights
export function drawCypherpunk(c: CanvasRenderingContext2D, ox: number, oy: number) {
  const { p, b } = mk(c, [ox, oy], G, G, PX);
  // Case
  b(3, 4, 8, 8, '#002a2a'); b(4, 4, 6, 7, '#003333');
  b(3, 12, 8, 1, '#001a1a');
  // Top
  b(3, 3, 8, 1, '#005544');
  // LED lights
  p(5, 5, '#00ffcc'); p(8, 5, '#00ff88');
  p(5, 7, '#44ffdd'); p(8, 7, '#00ffcc');
  p(5, 9, '#009955'); p(8, 9, '#44ff66');
  // Ventilation slots
  b(4, 6, 5, 1, '#001a1a');
  b(4, 8, 5, 1, '#001a1a');
  // Cable
  p(3, 10, '#005544'); p(2, 11, '#005544'); p(2, 12, '#003333');
  // Antenna
  p(9, 2, '#009955'); p(9, 1, '#00ffcc');
}

// ═══ INFERNAL — Brazier ═══
// Small fire pit with skull
export function drawInfernal(c: CanvasRenderingContext2D, ox: number, oy: number) {
  const { p, b } = mk(c, [ox, oy], G, G, PX);
  // Bowl/pit
  b(3, 9, 8, 2, '#332211'); b(2, 10, 10, 2, '#1a0800');
  b(2, 12, 10, 1, '#110400');
  // Rim
  b(3, 8, 8, 1, '#443322'); p(2, 9, '#221100'); p(11, 9, '#221100');
  // Fire
  p(5, 5, '#ffcc00'); p(6, 4, '#ff8844'); p(7, 5, '#ffcc00'); p(8, 4, '#ff6600');
  p(6, 6, '#ff4422'); p(7, 6, '#ff8844'); p(5, 7, '#cc2200'); p(8, 7, '#ff4422');
  b(5, 7, 4, 1, '#ff6600');
  // Embers
  p(4, 3, '#ffee44'); p(9, 2, '#ff8844');
  // Skull
  p(6, 10, '#ddccaa'); p(7, 10, '#ddccaa');
  p(6, 11, '#aa9977'); p(7, 11, '#665544');
}

// ═══ CELESTIAL — Small Shrine ═══
// Marble pillar with golden light
export function drawCelestial(c: CanvasRenderingContext2D, ox: number, oy: number) {
  const { p, b } = mk(c, [ox, oy], G, G, PX);
  // Base
  b(3, 11, 8, 1, '#ccccaa'); b(2, 12, 10, 1, '#aaaaaa');
  // Pillar
  b(5, 5, 4, 6, '#eeeedd'); b(6, 5, 2, 6, '#fffff0');
  // Capital
  b(4, 4, 6, 1, '#eeeedd'); b(5, 3, 4, 1, '#ffdd44');
  // Golden orb on top
  p(6, 2, '#ffdd44'); p(7, 2, '#ffee88');
  p(6, 1, '#ffee88');
  // Light rays
  p(4, 1, '#ffffaa'); p(9, 1, '#ffffaa');
  p(3, 2, '#ffee88'); p(10, 2, '#ffee88');
  // Shadow
  p(5, 10, '#ccccaa');
}

// ═══ PSIONIC — Brain Jar ═══
// Glowing brain in a containment vessel
export function drawPsionic(c: CanvasRenderingContext2D, ox: number, oy: number) {
  const { p, b } = mk(c, [ox, oy], G, G, PX);
  // Jar base
  b(4, 11, 6, 1, '#553388'); b(3, 12, 8, 1, '#2a1544');
  // Jar body (glass)
  b(4, 5, 6, 6, '#3d2255'); b(5, 5, 4, 5, '#553388');
  // Glass highlight
  p(4, 6, '#aa66cc'); p(4, 7, '#8855bb');
  // Brain
  b(5, 7, 4, 2, '#cc88ee'); b(6, 6, 2, 3, '#ddaaff');
  p(5, 7, '#eeccff'); // brain fold
  p(8, 8, '#aa66cc');
  // Lid
  b(4, 4, 6, 1, '#aa66cc'); b(5, 3, 4, 1, '#8855bb');
  // Psi glow
  p(3, 3, '#eeccff'); p(10, 4, '#eeccff');
  p(6, 1, '#ddaaff'); p(7, 2, '#cc88ee');
}

// ═══ HARMONIC — Speaker ═══
// Small amplifier/speaker with sound waves
export function drawHarmonic(c: CanvasRenderingContext2D, ox: number, oy: number) {
  const { p, b } = mk(c, [ox, oy], G, G, PX);
  // Cabinet
  b(3, 5, 8, 7, '#332200'); b(4, 5, 6, 6, '#664400');
  b(3, 12, 8, 1, '#1a1100');
  // Speaker cone
  b(5, 7, 4, 4, '#aa8822'); b(6, 8, 2, 2, '#332200');
  p(6, 8, '#ffcc44'); // center cap
  // Top panel
  b(4, 5, 5, 1, '#aa8822');
  // Knobs
  p(5, 6, '#ffcc44'); p(7, 6, '#ffcc44');
  // Sound waves
  p(11, 7, '#ffee88'); p(12, 8, '#ffcc44');
  p(11, 9, '#ffee88'); p(12, 10, '#aa8822');
  // Top detail
  p(3, 4, '#aa8822'); p(10, 4, '#664400');
}

// ═══ ESSENCE — Crystal Orb ═══
// Generic essence generator — glowing orb on a stand
export function drawEssence(c: CanvasRenderingContext2D, ox: number, oy: number) {
  const { p, b } = mk(c, [ox, oy], G, G, PX);
  // Stand
  b(5, 10, 4, 2, '#334455'); b(4, 11, 6, 1, '#223344');
  b(3, 12, 8, 1, '#112233');
  // Orb
  b(5, 5, 4, 4, '#2288aa'); b(6, 4, 2, 5, '#44bbdd');
  p(5, 4, '#2288aa'); p(8, 4, '#2288aa');
  p(5, 8, '#2288aa'); p(8, 8, '#2288aa');
  // Orb highlight
  p(6, 5, '#88ddff'); p(6, 4, '#aaeeff');
  // Inner glow
  p(6, 6, '#44ddff'); p(7, 6, '#88ddff');
  // Floating sparks
  p(3, 3, '#44ddff'); p(10, 2, '#88ddff');
  p(4, 6, '#aaeeff'); p(9, 7, '#44ddff');
}

// ═══ GENERIC OUTPOST ═══
// Simple tent/hut for factionless frontier
export function drawGeneric(c: CanvasRenderingContext2D, ox: number, oy: number) {
  const { p, b } = mk(c, [ox, oy], G, G, PX);
  // Tent body
  b(3, 8, 8, 4, '#886644'); b(2, 12, 10, 1, '#554422');
  // Tent peak
  p(7, 4, '#aa8866'); p(6, 5, '#886644'); p(8, 5, '#886644');
  b(5, 6, 4, 1, '#886644'); b(4, 7, 6, 1, '#aa8866');
  // Opening
  b(5, 9, 4, 3, '#443322');
  // Flag
  b(7, 2, 1, 3, '#666666');
  b(8, 2, 2, 1, '#cc4444'); p(8, 3, '#cc4444');
}

// ═══ Registry ═══
export const DOODAD_DRAW: Record<string, (c: CanvasRenderingContext2D, ox: number, oy: number) => void> = {
  arcane: drawArcane,
  mechanical: drawMechanical,
  nature: drawNature,
  void: drawVoid,
  military: drawMilitary,
  aliens: drawAliens,
  cypherpunk: drawCypherpunk,
  infernal: drawInfernal,
  celestial: drawCelestial,
  psionic: drawPsionic,
  harmonic: drawHarmonic,
  essence: drawEssence,
  generic: drawGeneric,
};

export const DOODAD_CELL = CELL;
