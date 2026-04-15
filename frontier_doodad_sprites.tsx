// @ts-nocheck
/**
 * Frontier Doodad Sprites — tiny pixel art buildings placed on blocked terrain
 * when frontier/essence buildings are purchased.
 *
 * Registry lookup order (see GameScene.placeFrontierDoodad):
 *   1. DOODAD_DRAW[buildingId]   — unique art per frontier building (preferred)
 *   2. DOODAD_DRAW[factionId]    — faction fallback while per-building art is unfinished
 *   3. DOODAD_DRAW.generic       — outpost fallback for non-faction play
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

// ═══════════════════════════════════════════════════════════════
// ░░ Per-building tier art ░░
// Each entry is keyed by FrontierBuilding.id so tier 1 and tier 2
// can read as different structures. Tier 1 = humble/small. Tier 2
// = scaled-up and visually distinct, mechanic-reading.
// ═══════════════════════════════════════════════════════════════

// ─── MECHANICAL ────────────────────────────────────────────────
// deep_mine_1 — Deep Mine (tier 1, 40g, dig)
// Small wooden mine entrance cut into a dirt mound; a pickaxe leans beside it.
export function drawDeepMine1(c: CanvasRenderingContext2D, ox: number, oy: number) {
  const { p, b } = mk(c, [ox, oy], G, G, PX);
  // Dirt mound
  b(1, 8, 12, 4, '#664422');
  b(2, 7, 10, 1, '#886644');
  b(1, 12, 12, 1, '#3a2211');
  p(0, 11, '#3a2211'); p(13, 11, '#3a2211');
  // Wooden frame (U shape)
  b(4, 5, 1, 7, '#442211');   // left post
  b(9, 5, 1, 7, '#442211');   // right post
  b(4, 4, 6, 1, '#553322');   // top beam
  p(4, 4, '#664422'); p(9, 4, '#664422'); // cap highlights
  p(6, 4, '#442211'); p(8, 4, '#442211'); // plank seams
  // Dark opening
  b(5, 5, 4, 7, '#000000');
  p(5, 5, '#1a0a00'); p(8, 5, '#1a0a00'); // entry shadow
  // Pickaxe leaning right of the frame
  p(11, 5, '#cccccc'); p(12, 5, '#aaaaaa'); p(10, 6, '#888888'); // head
  b(11, 6, 1, 6, '#774422');  // handle
  p(11, 11, '#553322');
  // Pebbles
  p(2, 11, '#886644'); p(1, 10, '#443322'); p(12, 11, '#886644');
  // Wood grain
  p(4, 8, '#553322'); p(9, 9, '#553322');
}

// deep_mine_2 — Reinforced Mine (tier 2, 100g, dig)
// Same mine-entrance silhouette as tier 1, but wider/taller, wrapped in riveted
// steel bracing with a lit lantern hanging just inside the mouth.
export function drawDeepMine2(c: CanvasRenderingContext2D, ox: number, oy: number) {
  const { p, b } = mk(c, [ox, oy], G, G, PX);
  // Wider dirt mound
  b(0, 8, 14, 4, '#664422');
  b(1, 7, 12, 1, '#886644');
  b(0, 12, 14, 1, '#3a2211');
  p(0, 11, '#3a2211'); p(13, 11, '#3a2211');
  // Wooden frame — posts wider apart than tier 1
  b(3, 3, 1, 9, '#442211');    // left post
  b(10, 3, 1, 9, '#442211');   // right post
  b(3, 2, 8, 1, '#553322');    // top beam
  p(3, 2, '#664422'); p(10, 2, '#664422');
  p(6, 2, '#442211'); p(7, 2, '#442211'); // plank seams
  // Bigger dark opening
  b(4, 3, 6, 9, '#000000');
  p(4, 3, '#1a0a00'); p(9, 3, '#1a0a00');
  // Steel top reinforcement band
  b(2, 1, 10, 1, '#777777');
  p(2, 1, '#999999'); p(11, 1, '#999999');
  p(4, 1, '#aaaaaa'); p(7, 1, '#aaaaaa'); p(9, 1, '#aaaaaa'); // rivets
  // Steel corner L-brackets
  b(2, 2, 1, 2, '#777777');
  b(11, 2, 1, 2, '#777777');
  p(2, 2, '#999999'); p(11, 2, '#999999');
  p(2, 3, '#aaaaaa'); p(11, 3, '#aaaaaa'); // corner rivets
  // Steel horizontal straps across posts (two bands)
  p(3, 6, '#777777'); p(10, 6, '#777777');
  p(3, 9, '#777777'); p(10, 9, '#777777');
  p(3, 5, '#aaaaaa'); p(10, 5, '#aaaaaa');  // rivets above upper strap
  p(3, 10, '#aaaaaa'); p(10, 10, '#aaaaaa'); // rivets below lower strap
  // Hanging lantern inside the mouth
  p(6, 4, '#886633');            // chain
  b(5, 5, 3, 2, '#553322');      // lantern body
  p(6, 5, '#ffdd44'); p(6, 6, '#ffbb22'); // glow
  p(5, 6, '#aa6622'); p(7, 6, '#aa6622');
  // Upgraded pickaxe (steel head, thicker handle) leaning right
  p(12, 4, '#cccccc'); p(13, 4, '#aaaaaa'); p(12, 5, '#888888');
  b(12, 5, 1, 7, '#885533');
  // Ore pile — tier-2 vein hint (gold fleck) at base
  p(1, 11, '#aaaa44'); p(2, 11, '#886644');
  p(12, 11, '#886644');
}

// ─── NATURE ────────────────────────────────────────────────────
// sacred_grove_1 — Sacred Grove (tier 1, 45g, grow)
// Young sapling sprouting from a small soil mound with a leaf cluster on top.
export function drawSacredGrove1(c: CanvasRenderingContext2D, ox: number, oy: number) {
  const { p, b } = mk(c, [ox, oy], G, G, PX);
  // Soil mound
  b(3, 10, 8, 2, '#442211');
  b(4, 9, 6, 1, '#664422');
  b(3, 12, 8, 1, '#2a1408');
  p(2, 11, '#3a2211'); p(11, 11, '#3a2211');
  // Thin young trunk
  b(6, 5, 2, 5, '#553322');
  p(6, 5, '#664422'); p(7, 7, '#442211');
  // Leaf cluster (heart-shaped)
  p(6, 2, '#3faa3f'); p(7, 2, '#3faa3f');
  p(5, 3, '#2d7d32'); p(6, 3, '#66cc66'); p(7, 3, '#66cc66'); p(8, 3, '#2d7d32');
  p(4, 4, '#3faa3f'); p(5, 4, '#66cc66'); p(6, 4, '#88ee88'); p(7, 4, '#88ee88'); p(8, 4, '#66cc66'); p(9, 4, '#3faa3f');
  p(5, 5, '#2d7d32'); p(8, 5, '#2d7d32');
  // Bud highlight
  p(7, 1, '#aaff88');
  // Tiny flower / mushroom accents at base
  p(3, 9, '#ff88cc'); p(10, 10, '#ffee44');
  // Moss on soil
  p(5, 10, '#446633'); p(8, 10, '#446633');
}

// sacred_grove_2 — Ancient Grove (tier 2, 110g, grow)
// Mighty old oak: thick gnarled trunk, broad glowing canopy, spreading roots.
export function drawSacredGrove2(c: CanvasRenderingContext2D, ox: number, oy: number) {
  const { p, b } = mk(c, [ox, oy], G, G, PX);
  // Spreading roots
  p(1, 11, '#3a2211'); p(2, 10, '#442211'); p(3, 11, '#553322');
  p(12, 11, '#3a2211'); p(11, 10, '#442211'); p(10, 11, '#553322');
  b(3, 12, 8, 1, '#2a1408');
  p(2, 12, '#2a1408'); p(11, 12, '#2a1408');
  // Thick gnarled trunk
  b(5, 6, 4, 6, '#3a2211');
  b(6, 6, 2, 6, '#553322');
  p(5, 7, '#442211'); p(8, 7, '#442211');
  p(5, 9, '#442211'); p(8, 10, '#442211');
  // Knothole
  p(6, 9, '#1a0a00'); p(7, 9, '#2a1408');
  // Root flare
  p(4, 11, '#442211'); p(9, 11, '#442211');
  // Broad canopy
  p(5, 0, '#2d7d32'); p(6, 0, '#3faa3f'); p(7, 0, '#3faa3f'); p(8, 0, '#2d7d32');
  b(3, 1, 8, 1, '#2d7d32');
  p(4, 1, '#3faa3f'); p(5, 1, '#66cc66'); p(6, 1, '#88ee88'); p(7, 1, '#88ee88'); p(8, 1, '#3faa3f');
  b(2, 2, 10, 1, '#3faa3f');
  p(3, 2, '#66cc66'); p(5, 2, '#88ee88'); p(8, 2, '#66cc66'); p(10, 2, '#2d7d32');
  b(2, 3, 10, 1, '#2d7d32');
  p(4, 3, '#66cc66'); p(7, 3, '#66cc66'); p(9, 3, '#3faa3f');
  b(3, 4, 8, 1, '#3faa3f');
  p(4, 4, '#2d7d32'); p(9, 4, '#2d7d32');
  p(5, 5, '#2d7d32'); p(8, 5, '#2d7d32');
  // Ancient-golden specks in canopy
  p(5, 3, '#ffcc44'); p(9, 2, '#ffcc44');
  // Glowing motes outside canopy
  p(1, 3, '#eeffaa'); p(12, 3, '#ccff88');
  p(0, 5, '#eeffaa'); p(13, 6, '#ccff88');
  p(2, 5, '#ccff88');
}

// ─── ARCANE ────────────────────────────────────────────────────
// leyline_nexus_1 — Leyline Nexus (tier 1, 50g, overcharge)
// Single crystal shard on a small stone pedestal, faint glow.
export function drawLeylineNexus1(c: CanvasRenderingContext2D, ox: number, oy: number) {
  const { p, b } = mk(c, [ox, oy], G, G, PX);
  // Pedestal
  b(5, 10, 4, 2, '#443366');
  b(4, 11, 6, 1, '#332255');
  b(3, 12, 8, 1, '#221144');
  p(5, 10, '#554477'); p(8, 10, '#554477');
  // Crystal shard
  b(6, 5, 2, 5, '#6644ff');
  p(6, 4, '#8866ff'); p(7, 4, '#aa88ff');
  p(7, 5, '#bbaaff'); // highlight
  p(6, 9, '#442288'); p(7, 9, '#442288');
  // Glow
  p(5, 6, '#cc88ff'); p(8, 7, '#cc88ff');
  p(4, 8, '#9977dd'); p(9, 5, '#eeccff');
}

// leyline_nexus_2 — Greater Nexus (tier 2, 120g, overcharge)
// Three-crystal cluster on a rune-etched pedestal, heavier glow.
export function drawLeylineNexus2(c: CanvasRenderingContext2D, ox: number, oy: number) {
  const { p, b } = mk(c, [ox, oy], G, G, PX);
  // Rune-etched pedestal
  b(2, 10, 10, 2, '#442288');
  b(3, 9, 8, 1, '#553399');
  b(1, 12, 12, 1, '#221144');
  // Rune glyphs
  p(4, 10, '#cc88ff'); p(6, 10, '#cc88ff'); p(9, 10, '#cc88ff');
  p(5, 11, '#9966ee'); p(8, 11, '#9966ee');
  // Central tall crystal
  b(6, 2, 2, 8, '#6644ff');
  p(7, 1, '#aa88ff'); p(6, 1, '#8866ff');
  p(7, 3, '#bbaaff'); p(6, 5, '#bbaaff'); // highlights
  // Left crystal (shorter)
  b(3, 5, 2, 5, '#8855ee');
  p(4, 4, '#aa88ff'); p(3, 6, '#bbaaff');
  // Right crystal (medium)
  b(9, 4, 2, 6, '#8855ee');
  p(10, 3, '#aa88ff'); p(10, 5, '#bbaaff');
  // Sparks
  p(2, 4, '#eeccff'); p(11, 2, '#eeccff');
  p(1, 7, '#cc88ff'); p(12, 8, '#cc88ff');
  p(0, 9, '#9966ee');
}

// ─── VOID ──────────────────────────────────────────────────────
// the_rift_1 — The Rift (tier 1, 35g, gamble)
// Hairline crack in the ground leaking purple light and wisps.
export function drawTheRift1(c: CanvasRenderingContext2D, ox: number, oy: number) {
  const { p, b } = mk(c, [ox, oy], G, G, PX);
  // Ground shadow
  b(2, 10, 10, 2, '#1a0033');
  b(2, 12, 10, 1, '#08000f');
  // Jagged crack
  p(5, 8, '#1a0033'); p(6, 8, '#2a1155');
  b(4, 9, 6, 1, '#2a1155');
  b(3, 10, 8, 1, '#442288');
  // Crack glow
  p(5, 10, '#6644cc'); p(7, 10, '#6644cc');
  p(6, 9, '#8866ee');
  // Drifting wisps and sparks
  p(4, 7, '#ff4488'); p(9, 6, '#00ffcc');
  p(2, 9, '#cc88ff'); p(11, 9, '#cc88ff');
  p(3, 5, '#ff77bb');
}

// the_rift_2 — Abyssal Rift (tier 2, 90g, gamble)
// Full swirling vortex — concentric rings with a cosmic eye at the center.
export function drawTheRift2(c: CanvasRenderingContext2D, ox: number, oy: number) {
  const { p, b } = mk(c, [ox, oy], G, G, PX);
  // Warped ground
  b(1, 10, 12, 2, '#08000f');
  b(1, 12, 12, 1, '#050008');
  p(0, 11, '#1a0033'); p(13, 11, '#1a0033');
  // Outer ring
  b(4, 2, 6, 1, '#442288');
  b(3, 3, 8, 1, '#2a1155');
  b(2, 4, 10, 1, '#442288');
  b(2, 9, 10, 1, '#442288');
  b(3, 10, 8, 1, '#2a1155');
  p(2, 5, '#6644cc'); p(11, 5, '#6644cc');
  p(2, 7, '#6644cc'); p(11, 7, '#6644cc');
  p(2, 8, '#442288'); p(11, 8, '#442288');
  // Vortex inner rings
  b(4, 5, 6, 4, '#2a1155');
  b(5, 5, 4, 4, '#442288');
  b(5, 6, 4, 2, '#6644cc');
  // Cosmic eye
  p(6, 6, '#8866ee'); p(7, 6, '#bb99ff');
  p(6, 7, '#bb99ff'); p(7, 7, '#8866ee');
  // Swirl tails
  p(3, 5, '#8866ee'); p(10, 8, '#8866ee');
  p(9, 4, '#6644cc'); p(4, 9, '#6644cc');
  // Cosmic sparks
  p(1, 3, '#ff4488'); p(12, 2, '#00ffcc');
  p(0, 7, '#ff77bb'); p(13, 9, '#66ffe6');
  p(6, 0, '#eeccff'); p(8, 1, '#cc88ff');
}

// ─── MILITARY ──────────────────────────────────────────────────
// supply_depot_1 — Supply Depot (tier 1, 45g, steady)
// Stack of crates beside a simple lean-to tent.
export function drawSupplyDepot1(c: CanvasRenderingContext2D, ox: number, oy: number) {
  const { p, b } = mk(c, [ox, oy], G, G, PX);
  // Ground
  b(1, 12, 12, 1, '#4a5533');
  // Big crate
  b(2, 8, 4, 4, '#886644');
  b(2, 8, 4, 1, '#aa8866');
  p(3, 10, '#443322'); p(4, 10, '#443322');
  p(2, 9, '#aa8866'); p(5, 9, '#aa8866');
  p(3, 9, '#cc8833'); // stencil mark
  // Small crate on top
  b(6, 9, 3, 3, '#886644');
  p(6, 9, '#aa8866'); p(8, 9, '#aa8866');
  p(7, 11, '#443322');
  // Lean-to tent (canvas)
  b(9, 6, 4, 1, '#556b2f');
  p(9, 7, '#556b2f'); p(12, 7, '#556b2f');
  b(10, 7, 2, 5, '#3a4a22');
  b(10, 9, 2, 1, '#2a3a1a'); // opening shadow
  p(10, 11, '#2a3a1a');
  // Tent guy rope
  p(9, 11, '#666666');
}

// supply_depot_2 — Forward Base (tier 2, 100g, steady)
// Sandbag bunker with gun-slit, radio antenna, and red flag.
export function drawSupplyDepot2(c: CanvasRenderingContext2D, ox: number, oy: number) {
  const { p, b } = mk(c, [ox, oy], G, G, PX);
  // Sandbag wall
  b(1, 10, 12, 3, '#c2b280');
  b(2, 9, 10, 1, '#d4c8a0');
  b(1, 12, 12, 1, '#5c4033');
  p(3, 10, '#8a7a50'); p(5, 10, '#8a7a50'); p(7, 10, '#8a7a50'); p(9, 10, '#8a7a50'); p(11, 10, '#8a7a50');
  p(2, 11, '#d4c8a0'); p(6, 11, '#d4c8a0'); p(10, 11, '#d4c8a0');
  // Bunker body
  b(3, 6, 8, 3, '#667744');
  b(4, 5, 6, 1, '#779955');
  p(3, 6, '#556633'); p(10, 6, '#556633');
  // Slit window
  b(5, 7, 4, 1, '#1a1a1a');
  p(5, 7, '#333333'); p(8, 7, '#333333');
  // Radio antenna
  b(11, 2, 1, 4, '#666666');
  p(11, 1, '#aaaaaa');
  p(12, 2, '#888888'); p(10, 3, '#888888');
  // Flag pole
  b(2, 2, 1, 5, '#555555');
  b(3, 2, 3, 2, '#cc3333');
  p(3, 3, '#ff6644'); p(5, 2, '#ff6644');
  // Ammo crate in front
  b(5, 11, 3, 1, '#4a5533');
  p(6, 11, '#886633');
}

// ─── ALIENS ────────────────────────────────────────────────────
// breeding_pool — Breeding Pool (tier 1, 30g, grow)
// Slimy green pool with eggs clustered at the edge, tendril rim.
export function drawBreedingPool(c: CanvasRenderingContext2D, ox: number, oy: number) {
  const { p, b } = mk(c, [ox, oy], G, G, PX);
  // Pool shadow & rim
  b(3, 9, 8, 3, '#445522');
  b(2, 10, 10, 2, '#556633');
  b(3, 11, 8, 1, '#77aa33');
  b(2, 12, 10, 1, '#2a3a11');
  p(2, 9, '#334411'); p(11, 9, '#334411');
  p(1, 10, '#334411'); p(12, 10, '#334411');
  // Eggs peeking
  b(4, 8, 2, 2, '#88cc44');
  p(4, 8, '#aaff66');
  b(8, 7, 2, 3, '#88cc44');
  p(8, 7, '#aaff66');
  // Bubbles on surface
  p(6, 10, '#aaff66'); p(7, 11, '#88cc44');
  p(5, 11, '#77cc22');
  // Drip at base
  p(3, 12, '#77cc22'); p(10, 12, '#77cc22');
}

// hive_queen — Hive Queen (tier 2, 85g, grow)
// Towering queen pod with a pulsing heart, root-tendrils spreading.
export function drawHiveQueen(c: CanvasRenderingContext2D, ox: number, oy: number) {
  const { p, b } = mk(c, [ox, oy], G, G, PX);
  // Spreading tendrils at base
  p(2, 12, '#334411'); p(4, 12, '#334411'); p(9, 12, '#334411'); p(11, 12, '#334411');
  p(1, 11, '#445522'); p(12, 11, '#445522');
  b(2, 12, 10, 1, '#2a3a11');
  // Queen pod body (tall egg)
  b(4, 3, 6, 9, '#445522');
  b(5, 2, 4, 10, '#556633');
  b(5, 3, 4, 8, '#667744');
  // Pod highlights
  b(6, 3, 2, 2, '#88ff44');
  p(6, 5, '#aaff66'); p(7, 4, '#aaff66');
  // Pulsing heart
  b(6, 7, 2, 2, '#ff4488');
  p(6, 7, '#ff88cc'); p(7, 8, '#ff88cc');
  // Top nub
  p(6, 1, '#667744'); p(7, 1, '#445522');
  // Slime drips
  p(4, 11, '#77cc22'); p(9, 12, '#77cc22');
  p(5, 11, '#aaff66');
  // Ambient glow motes
  p(2, 5, '#88ff44'); p(11, 5, '#88ff44');
  p(3, 8, '#aaff66'); p(10, 8, '#aaff66');
}

// ─── CYPHERPUNK ────────────────────────────────────────────────
// crypto_mine — Crypto Mine (tier 1, 35g, gamble)
// Stacked GPU rig with blinking fan LEDs and trailing cables.
export function drawCryptoMine(c: CanvasRenderingContext2D, ox: number, oy: number) {
  const { p, b } = mk(c, [ox, oy], G, G, PX);
  // Desk surface
  b(1, 11, 12, 1, '#222222');
  b(1, 12, 12, 1, '#111111');
  // Three GPU shelves
  b(3, 5, 8, 2, '#003333');
  b(3, 7, 8, 2, '#003333');
  b(3, 9, 8, 2, '#003333');
  // GPU fan dots
  p(4, 5, '#00ffcc'); p(7, 5, '#00ff88'); p(10, 5, '#00ffcc');
  p(4, 7, '#00ffcc'); p(7, 7, '#00ff88'); p(10, 7, '#00ffcc');
  p(4, 9, '#00ff88'); p(7, 9, '#00ffcc'); p(10, 9, '#00ff88');
  // Shelf rails
  b(2, 5, 1, 6, '#001a1a');
  b(11, 5, 1, 6, '#001a1a');
  // LED strip on top
  p(4, 4, '#00ffcc'); p(7, 4, '#ffee44'); p(10, 4, '#00ff88');
  // Cables trailing
  p(2, 10, '#005544'); p(1, 11, '#005544');
  p(11, 10, '#005544'); p(12, 11, '#005544');
  // Antenna poking out
  p(6, 3, '#00ffcc'); p(6, 2, '#00ff88');
}

// data_broker — Data Broker (tier 2, 90g, overcharge)
// Satellite dish mounted on a server pedestal with a scrolling terminal.
export function drawDataBroker(c: CanvasRenderingContext2D, ox: number, oy: number) {
  const { p, b } = mk(c, [ox, oy], G, G, PX);
  // Pedestal / server tower
  b(3, 9, 8, 3, '#002a2a');
  b(4, 8, 6, 1, '#003333');
  b(3, 12, 8, 1, '#001a1a');
  // Terminal screen
  b(4, 9, 6, 2, '#005544');
  p(4, 9, '#00ffcc'); p(9, 9, '#00ffcc');
  // Scrolling text
  p(5, 9, '#00ffcc'); p(7, 9, '#00ffcc'); p(8, 9, '#00ffcc');
  p(5, 10, '#009955'); p(6, 10, '#00ffcc'); p(8, 10, '#009955');
  // Satellite dish
  b(5, 4, 4, 3, '#888888');
  b(6, 3, 2, 4, '#aaaaaa');
  p(5, 4, '#666666'); p(8, 4, '#666666');
  // Feed arm
  p(7, 2, '#666666'); p(7, 1, '#888888');
  // Dish pole
  b(6, 7, 2, 2, '#555555');
  // LEDs
  p(4, 11, '#00ffcc'); p(9, 11, '#ffee44');
  // Signal waves out
  p(2, 3, '#00ffcc'); p(1, 2, '#009955');
  p(12, 3, '#00ffcc'); p(13, 2, '#009955');
  p(0, 5, '#005544'); p(13, 5, '#005544');
}

// ─── INFERNAL ──────────────────────────────────────────────────
// soul_well — Soul Well (tier 1, 25g, gamble)
// Stone pit with a ghostly wisp emerging, embers rising from within.
export function drawSoulWell(c: CanvasRenderingContext2D, ox: number, oy: number) {
  const { p, b } = mk(c, [ox, oy], G, G, PX);
  // Ground
  b(3, 11, 8, 1, '#332211');
  b(2, 12, 10, 1, '#1a0800');
  p(2, 11, '#443322'); p(11, 11, '#443322');
  // Cobblestone rim
  p(3, 10, '#555555'); p(5, 10, '#666666'); p(7, 10, '#555555'); p(9, 10, '#666666');
  p(4, 10, '#333333'); p(6, 10, '#333333'); p(8, 10, '#333333'); p(10, 10, '#333333');
  // Dark pit
  b(3, 8, 8, 2, '#1a0800');
  b(4, 7, 6, 1, '#0a0400');
  // Ghost wisp
  b(6, 4, 2, 4, '#aaccff');
  p(6, 3, '#88aadd'); p(7, 3, '#88aadd');
  p(5, 5, '#ccddee'); p(8, 5, '#ccddee'); // arms
  p(5, 6, '#aaccff'); p(8, 6, '#aaccff');
  // Hollow eyes
  p(6, 4, '#000000'); p(7, 4, '#000000');
  // Wisp trails
  p(4, 8, '#88aadd'); p(9, 8, '#88aadd');
  // Ember glow
  p(5, 9, '#ff6600'); p(8, 9, '#ff6600');
  // Rising embers
  p(3, 6, '#ffcc00'); p(10, 5, '#ff8844');
}

// blood_pact — Blood Pact (tier 2, 70g, dig)
// Stone altar with a chalice of blood overflowing, flanked by red candles.
export function drawBloodPact(c: CanvasRenderingContext2D, ox: number, oy: number) {
  const { p, b } = mk(c, [ox, oy], G, G, PX);
  // Ground
  b(1, 12, 12, 1, '#1a0800');
  // Altar base
  b(2, 8, 10, 4, '#555555');
  b(3, 7, 8, 1, '#666666');
  b(2, 11, 10, 1, '#333333');
  // Altar top slab
  b(2, 6, 10, 2, '#777777');
  b(3, 6, 8, 1, '#888888');
  // Blood runes
  p(4, 9, '#cc0000'); p(7, 9, '#cc0000'); p(9, 9, '#cc0000');
  p(3, 10, '#880000'); p(8, 10, '#880000');
  // Chalice
  b(6, 4, 2, 2, '#888888');
  b(5, 3, 4, 1, '#aaaaaa');
  p(5, 4, '#666666'); p(8, 4, '#666666');
  // Blood in chalice
  b(6, 3, 2, 1, '#cc0000');
  p(6, 3, '#ff2200'); p(7, 3, '#ff2200');
  // Blood dripping
  p(7, 5, '#cc0000'); p(6, 6, '#cc0000'); p(6, 7, '#880000');
  p(5, 8, '#cc0000'); p(5, 9, '#880000');
  // Candles
  p(3, 5, '#eecc88'); p(10, 5, '#eecc88');
  p(3, 4, '#ff8844'); p(10, 4, '#ff8844');
  p(3, 3, '#ffcc00'); p(10, 3, '#ffcc00');
  // Smoke
  p(3, 2, '#553344'); p(10, 2, '#553344');
}

// ─── CELESTIAL ─────────────────────────────────────────────────
// tithe — Tithe (tier 1, 50g, steady)
// Marble pedestal with a golden basin full of coins.
export function drawTithe(c: CanvasRenderingContext2D, ox: number, oy: number) {
  const { p, b } = mk(c, [ox, oy], G, G, PX);
  // Pedestal
  b(5, 9, 4, 3, '#eeeedd');
  b(6, 9, 2, 3, '#fffff0');
  b(4, 11, 6, 1, '#eeeedd');
  b(4, 12, 6, 1, '#ccccaa');
  // Golden basin rim
  b(3, 7, 8, 1, '#ffdd44');
  b(4, 8, 6, 1, '#ccaa33');
  p(3, 8, '#aa8822'); p(10, 8, '#aa8822');
  // Coins in basin
  p(5, 7, '#ffee88'); p(6, 7, '#ffcc44'); p(7, 7, '#ffee88'); p(8, 7, '#ffcc44');
  // Floating coin glints
  p(6, 5, '#ffffaa'); p(8, 4, '#ffffaa');
  p(5, 6, '#ffee88');
  // Light rays
  p(2, 6, '#ffee88'); p(11, 6, '#ffee88');
  p(2, 8, '#ffffaa');
}

// miracle — Miracle (tier 2, 130g, grow)
// Stepped marble shrine with a glowing angelic figure and radiating light.
export function drawMiracle(c: CanvasRenderingContext2D, ox: number, oy: number) {
  const { p, b } = mk(c, [ox, oy], G, G, PX);
  // Stepped base
  b(1, 12, 12, 1, '#aaaaaa');
  b(2, 11, 10, 1, '#ccccaa');
  b(3, 10, 8, 1, '#eeeedd');
  // Shrine body
  b(4, 4, 6, 6, '#eeeedd');
  b(5, 4, 4, 6, '#fffff0');
  // Pillars
  b(4, 4, 1, 6, '#ccccaa');
  b(9, 4, 1, 6, '#ccccaa');
  // Roof / pediment
  b(3, 3, 8, 1, '#ccccaa');
  p(5, 2, '#ffdd44'); p(6, 2, '#ffdd44'); p(7, 2, '#ffdd44'); p(8, 2, '#ffdd44');
  p(6, 1, '#ffee88'); p(7, 1, '#ffee88');
  // Halo cap
  p(5, 0, '#ffffaa'); p(8, 0, '#ffffaa');
  // Angelic figure
  b(6, 6, 2, 3, '#ffdd44');
  p(6, 5, '#ffee88'); p(7, 5, '#ffee88'); // head
  p(5, 7, '#ffee88'); p(8, 7, '#ffee88'); // wings
  // Radiating light
  p(2, 5, '#ffffaa'); p(11, 5, '#ffffaa');
  p(1, 7, '#ffee88'); p(12, 7, '#ffee88');
  p(0, 4, '#ffdd44'); p(13, 4, '#ffdd44');
  p(2, 9, '#ffee88'); p(11, 9, '#ffee88');
}

// ─── PSIONIC ───────────────────────────────────────────────────
// dream_tap — Dream Tap (tier 1, 40g, gamble)
// Meditation cushion with a levitating figure and a floating dream orb.
export function drawDreamTap(c: CanvasRenderingContext2D, ox: number, oy: number) {
  const { p, b } = mk(c, [ox, oy], G, G, PX);
  // Cushion
  b(3, 11, 8, 2, '#553388');
  b(4, 10, 6, 1, '#6644aa');
  b(3, 12, 8, 1, '#2a1544');
  p(3, 10, '#442277'); p(10, 10, '#442277'); // tassels
  p(5, 11, '#aa66cc'); p(7, 11, '#aa66cc'); p(9, 11, '#aa66cc');
  // Levitating figure (seated)
  b(6, 6, 2, 3, '#3d2255');
  p(6, 5, '#553388'); p(7, 5, '#553388'); // head
  p(5, 7, '#553388'); p(8, 7, '#553388'); // crossed-leg hint
  p(6, 6, '#8855bb');
  // Dream orb floating above head
  p(6, 2, '#cc88ee'); p(7, 2, '#ddaaff');
  p(6, 3, '#ddaaff'); p(7, 3, '#cc88ee');
  // Psi waves
  p(3, 4, '#aa66cc'); p(4, 3, '#aa66cc');
  p(10, 4, '#aa66cc'); p(9, 3, '#aa66cc');
  // Dream sparkles
  p(2, 2, '#eeccff'); p(11, 2, '#eeccff');
  p(1, 6, '#cc88ee'); p(12, 6, '#cc88ee');
  p(0, 8, '#aa66cc'); p(13, 8, '#aa66cc');
}

// mind_prison — Mind Prison (tier 2, 95g, overcharge)
// A caged brain suspended between iron bars, crackling with psi energy.
export function drawMindPrison(c: CanvasRenderingContext2D, ox: number, oy: number) {
  const { p, b } = mk(c, [ox, oy], G, G, PX);
  // Base platform
  b(2, 11, 10, 1, '#2a1544');
  b(3, 12, 8, 1, '#1a0a33');
  b(2, 10, 10, 1, '#3d2255');
  // Cage bars
  b(3, 4, 1, 7, '#888888');
  b(6, 3, 1, 8, '#888888');
  b(7, 3, 1, 8, '#888888');
  b(10, 4, 1, 7, '#888888');
  // Cage caps
  b(2, 3, 10, 1, '#666666');
  b(3, 2, 8, 1, '#aaaaaa');
  b(2, 10, 10, 1, '#666666');
  // Brain suspended inside
  b(5, 6, 4, 3, '#cc88ee');
  b(6, 5, 2, 3, '#ddaaff');
  p(5, 6, '#aa66cc'); p(8, 6, '#aa66cc');
  p(5, 8, '#aa66cc'); p(8, 8, '#aa66cc');
  // Brain folds
  p(6, 6, '#eeccff'); p(7, 7, '#eeccff');
  // Psi crackle
  p(4, 5, '#cc88ff'); p(9, 5, '#cc88ff');
  p(4, 9, '#cc88ff'); p(9, 9, '#cc88ff');
  p(2, 7, '#eeccff'); p(11, 7, '#eeccff');
  // Antenna tip
  p(6, 1, '#cc88ee'); p(7, 0, '#eeccff');
}

// ─── HARMONIC ──────────────────────────────────────────────────
// resonance_chamber — Resonance Chamber (tier 1, 45g, grow)
// Giant tuning fork on a pedestal with a small chime bell alongside.
export function drawResonanceChamber(c: CanvasRenderingContext2D, ox: number, oy: number) {
  const { p, b } = mk(c, [ox, oy], G, G, PX);
  // Pedestal
  b(5, 10, 4, 2, '#332200');
  b(4, 11, 6, 1, '#664400');
  b(4, 12, 6, 1, '#221100');
  // Tuning fork handle
  b(6, 8, 2, 2, '#aa8822');
  // Fork tines
  b(5, 2, 1, 6, '#ccaa44');
  b(8, 2, 1, 6, '#ccaa44');
  p(5, 1, '#ffdd88'); p(8, 1, '#ffdd88');
  // Crossbar
  b(5, 7, 4, 1, '#aa8822');
  // Resonance waves
  p(3, 3, '#ffee88'); p(2, 4, '#ffcc44'); p(3, 5, '#ffee88');
  p(10, 3, '#ffee88'); p(11, 4, '#ffcc44'); p(10, 5, '#ffee88');
  p(1, 2, '#ffee88'); p(12, 2, '#ffee88');
  // Chime bell beside pedestal
  p(11, 10, '#ffcc44'); p(10, 11, '#aa8822');
  p(12, 9, '#ffee88');
}

// symphony_hall — Symphony Hall (tier 2, 110g, overcharge)
// Double-speaker amplifier tower radiating sound waves.
export function drawSymphonyHall(c: CanvasRenderingContext2D, ox: number, oy: number) {
  const { p, b } = mk(c, [ox, oy], G, G, PX);
  // Ground
  b(2, 11, 10, 1, '#332200');
  b(2, 12, 10, 1, '#1a1100');
  // Amp cabinet
  b(3, 2, 8, 10, '#332200');
  b(4, 2, 6, 9, '#664400');
  b(3, 11, 8, 1, '#221100');
  // Upper speaker cone
  b(5, 3, 4, 3, '#aa8822');
  b(6, 4, 2, 1, '#332200');
  p(6, 4, '#ffcc44'); p(7, 4, '#ffcc44');
  // Lower speaker cone
  b(5, 7, 4, 3, '#aa8822');
  b(6, 8, 2, 1, '#332200');
  p(6, 8, '#ffcc44'); p(7, 8, '#ffcc44');
  // Control knobs
  p(4, 10, '#ffcc44'); p(9, 10, '#ffcc44');
  // Sound waves — right
  p(12, 3, '#ffee88'); p(13, 4, '#ffcc44');
  p(12, 6, '#ffee88'); p(13, 7, '#ffcc44');
  p(12, 9, '#ffee88'); p(13, 10, '#ffcc44');
  // Sound waves — left
  p(1, 3, '#ffee88'); p(0, 4, '#aa8822');
  p(1, 7, '#ffee88'); p(0, 8, '#aa8822');
  // Blinking top antenna
  p(7, 1, '#ffcc44'); p(7, 0, '#ffee88');
}

// ─── GENERIC OUTPOSTS (non-faction play) ───────────────────────
// outpost_1 — Outpost (40g, steady)
// Pup tent with guy-ropes and a tiny campfire ember.
export function drawOutpost1(c: CanvasRenderingContext2D, ox: number, oy: number) {
  const { p, b } = mk(c, [ox, oy], G, G, PX);
  // Tent body
  b(4, 10, 6, 2, '#886644');
  b(3, 12, 8, 1, '#443322');
  // Peak
  p(7, 5, '#aa8866');
  b(6, 6, 3, 1, '#886644');
  b(5, 7, 5, 1, '#aa8866');
  b(4, 8, 7, 1, '#886644');
  b(4, 9, 7, 1, '#aa8866');
  // Entrance
  b(6, 10, 2, 2, '#443322');
  // Guy ropes
  p(3, 11, '#666666'); p(10, 11, '#666666');
  // Campfire ember
  p(11, 11, '#ff6600'); p(11, 10, '#ffcc00'); p(12, 11, '#ff8844');
}

// outpost_2 — Trading Post (80g, steady)
// Wooden storefront with lit windows, a red banner, and a smoking chimney.
export function drawOutpost2(c: CanvasRenderingContext2D, ox: number, oy: number) {
  const { p, b } = mk(c, [ox, oy], G, G, PX);
  // Building body
  b(2, 7, 10, 5, '#886644');
  b(3, 7, 8, 4, '#aa8866');
  b(2, 12, 10, 1, '#443322');
  // Roof overhang
  b(1, 6, 12, 1, '#664422');
  b(2, 5, 10, 1, '#885533');
  p(1, 7, '#664422'); p(12, 7, '#664422');
  // Door
  b(6, 9, 2, 3, '#443322');
  p(7, 10, '#ffcc44');
  // Lit windows
  b(3, 8, 2, 2, '#ffdd44');
  b(9, 8, 2, 2, '#ffdd44');
  p(4, 8, '#aa8822'); p(9, 9, '#aa8822');
  // Hanging banner
  b(4, 4, 6, 1, '#cc3333');
  p(4, 4, '#ff6644'); p(9, 4, '#ff6644');
  p(6, 4, '#ffee88'); p(7, 4, '#ffee88');
  // Chimney with smoke
  b(3, 3, 1, 3, '#555555');
  p(3, 2, '#888888'); p(3, 1, '#aaaaaa');
}

// ═══ Registry ═══
export const DOODAD_DRAW: Record<string, (c: CanvasRenderingContext2D, ox: number, oy: number) => void> = {
  // ── Per-building tier art (preferred lookup) ──
  // Arcane
  leyline_nexus_1: drawLeylineNexus1,
  leyline_nexus_2: drawLeylineNexus2,
  // Mechanical
  deep_mine_1: drawDeepMine1,
  deep_mine_2: drawDeepMine2,
  // Nature
  sacred_grove_1: drawSacredGrove1,
  sacred_grove_2: drawSacredGrove2,
  // Void
  the_rift_1: drawTheRift1,
  the_rift_2: drawTheRift2,
  // Military
  supply_depot_1: drawSupplyDepot1,
  supply_depot_2: drawSupplyDepot2,
  // Aliens
  breeding_pool: drawBreedingPool,
  hive_queen: drawHiveQueen,
  // Cypherpunk
  crypto_mine: drawCryptoMine,
  data_broker: drawDataBroker,
  // Infernal
  soul_well: drawSoulWell,
  blood_pact: drawBloodPact,
  // Celestial
  tithe: drawTithe,
  miracle: drawMiracle,
  // Psionic
  dream_tap: drawDreamTap,
  mind_prison: drawMindPrison,
  // Harmonic
  resonance_chamber: drawResonanceChamber,
  symphony_hall: drawSymphonyHall,
  // Generic outposts
  outpost_1: drawOutpost1,
  outpost_2: drawOutpost2,
  // ── Faction fallbacks (safety net if a new building ID ships without art) ──
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
