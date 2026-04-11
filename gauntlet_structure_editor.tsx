/**
 * Gauntlet Map Structure Editor — Full Visual Map Painter
 *
 * Shows actual terrain tiles + structure textures on the map.
 * Structures auto-create blocked footprint.
 * Terrain palette: paint ground, blocked, animated, noBuild cells.
 * Structure palette: click to place, drag to move, right-click to remove.
 */
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { GAUNTLET_MAP_CONFIGS } from './src/data/GauntletMaps';
import { LARGE_STRUCTURES, getStructureDef } from './src/data/LargeStructures';
import { structures as spriteDefs } from './large_structure_sprites';

const COLS = 36;
const ROWS = 26;
const TS = 28; // sprite tile size
const CELL = 26; // editor cell size
const TILE_COLS = 16; // auto-tile variants per row in tileset

// Theme → tileset path mapping
const THEME_TILESET: Record<string, { path: string; doodadPath: string; groundRow: number; blockedRow: number; animatedRow: number; noBuildRow: number }> = {
  circuit:       { path: 'assets/terrain/cypherpunk_terrain_tileset.png', doodadPath: 'assets/terrain/cypherpunk_terrain_doodads.png', groundRow: 0, blockedRow: 1, animatedRow: 2, noBuildRow: 5 },
  hellscape:     { path: 'assets/terrain/infernal_terrain_tileset.png',  doodadPath: 'assets/terrain/infernal_terrain_doodads.png',  groundRow: 0, blockedRow: 1, animatedRow: 2, noBuildRow: 5 },
  ancient_grove: { path: 'assets/terrain/nature_terrain_tileset.png',    doodadPath: 'assets/terrain/nature_terrain_doodads.png',    groundRow: 0, blockedRow: 1, animatedRow: 2, noBuildRow: 5 },
  arcane_crystal: { path: 'assets/terrain/arcane_terrain_tileset.png',   doodadPath: 'assets/terrain/arcane_terrain_doodads.png',   groundRow: 0, blockedRow: 1, animatedRow: 2, noBuildRow: 5 },
  factory:       { path: 'assets/terrain/mechanical_terrain_tileset.png', doodadPath: 'assets/terrain/mechanical_terrain_doodads.png', groundRow: 0, blockedRow: 1, animatedRow: 2, noBuildRow: 5 },
  void_rift:     { path: 'assets/terrain/void_terrain_tileset.png',      doodadPath: 'assets/terrain/void_terrain_doodads.png',      groundRow: 0, blockedRow: 1, animatedRow: 2, noBuildRow: 5 },
  urban:         { path: 'assets/terrain/military_terrain_tileset.png',   doodadPath: 'assets/terrain/military_terrain_doodads.png',  groundRow: 0, blockedRow: 1, animatedRow: 2, noBuildRow: 5 },
  hive:          { path: 'assets/terrain/aliens_terrain_tileset.png',     doodadPath: 'assets/terrain/aliens_terrain_doodads.png',    groundRow: 0, blockedRow: 1, animatedRow: 2, noBuildRow: 5 },
  neural:        { path: 'assets/terrain/psionic_terrain_tileset.png',    doodadPath: 'assets/terrain/psionic_terrain_doodads.png',   groundRow: 0, blockedRow: 1, animatedRow: 2, noBuildRow: 5 },
  concert:       { path: 'assets/terrain/harmonic_terrain_tileset.png',   doodadPath: 'assets/terrain/harmonic_terrain_doodads.png',  groundRow: 0, blockedRow: 1, animatedRow: 2, noBuildRow: 5 },
  marble:        { path: 'assets/terrain/celestial_terrain_tileset.png',  doodadPath: 'assets/terrain/celestial_terrain_doodads.png', groundRow: 0, blockedRow: 1, animatedRow: 2, noBuildRow: 5 },
};

// Terrain type labels per theme
const TERRAIN_LABELS: Record<string, { blocked: string; animated: string; noBuild: string }> = {
  circuit:       { blocked: 'Processor Block', animated: 'Data Pit', noBuild: 'Cable Run' },
  hellscape:     { blocked: 'Obsidian', animated: 'Lava Pool', noBuild: 'Scorched Ground' },
  ancient_grove: { blocked: 'Dense Trees', animated: 'Sacred Water', noBuild: 'Mushroom Patch' },
  arcane_crystal: { blocked: 'Crystal Wall', animated: 'Arcane Pool', noBuild: 'Arcane Circle' },
  factory:       { blocked: 'Steel Block', animated: 'Cooling Tank', noBuild: 'Conveyor' },
  void_rift:     { blocked: 'Void Stone', animated: 'Rift Energy', noBuild: 'Unstable Ground' },
  urban:         { blocked: 'Concrete', animated: 'Rubble', noBuild: 'Barbed Wire' },
  hive:          { blocked: 'Chitin Wall', animated: 'Acid Pool', noBuild: 'Slime Trail' },
  neural:        { blocked: 'Neural Block', animated: 'Thought Pool', noBuild: 'Synapse Path' },
  concert:       { blocked: 'Stage Block', animated: 'Sound Pool', noBuild: 'Orchestra Pit' },
  marble:        { blocked: 'Marble Block', animated: 'Holy Water', noBuild: 'Cloud Gap' },
};

// Cell terrain types
type TerrainCell = 'empty' | 'blocked' | 'animated' | 'noBuild';
type BrushMode = 'select' | 'blocked' | 'animated' | 'noBuild' | 'clear' | 'entry' | 'exit';

interface Placement {
  structureId: string;
  col: number;
  row: number;
}

// Pre-render structure textures
function buildTextureCache(): Map<string, HTMLCanvasElement> {
  const cache = new Map<string, HTMLCanvasElement>();
  for (const s of spriteDefs) {
    const pw = s.widthCells * TS;
    const ph = s.heightCells * TS;
    const c = document.createElement('canvas');
    c.width = pw; c.height = ph;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    s.draw(ctx, 0);
    cache.set(s.key, c);
  }
  return cache;
}

// Auto-tile index: checks NESW neighbors of same type
function autoTileIdx(col: number, row: number, grid: TerrainCell[][], matchType: TerrainCell): number {
  const match = (c: number, r: number) => {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return true; // edges count as same
    return grid[r][c] === matchType;
  };
  let idx = 0;
  if (match(col, row - 1)) idx |= 8; // N
  if (match(col + 1, row)) idx |= 4; // E
  if (match(col, row + 1)) idx |= 2; // S
  if (match(col - 1, row)) idx |= 1; // W
  return idx;
}

export default function GauntletStructureEditor() {
  const [mapIdx, setMapIdx] = useState(0);
  const [cells, setCells] = useState<TerrainCell[][]>(() => makeGrid('empty'));
  const [entries, setEntries] = useState<Set<string>>(new Set());
  const [exits, setExits] = useState<Set<string>>(new Set());
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [brush, setBrush] = useState<BrushMode>('select');
  const [selectedPalette, setSelectedPalette] = useState<string | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState({ col: 0, row: 0 });
  const [hoveredCell, setHoveredCell] = useState<{ col: number; row: number } | null>(null);
  const [mouseDown, setMouseDown] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [textureCache, setTextureCache] = useState<Map<string, HTMLCanvasElement>>(new Map());
  const [tilesetImg, setTilesetImg] = useState<HTMLImageElement | null>(null);
  const [doodadImg, setDoodadImg] = useState<HTMLImageElement | null>(null);

  // Build structure texture cache once
  useEffect(() => { setTextureCache(buildTextureCache()); }, []);

  function makeGrid(fill: TerrainCell): TerrainCell[][] {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(fill));
  }

  const config = GAUNTLET_MAP_CONFIGS[mapIdx];
  const themeInfo = THEME_TILESET[config.theme];
  const terrainLabels = TERRAIN_LABELS[config.theme] || { blocked: 'Blocked', animated: 'Animated', noBuild: 'NoBuild' };

  // Load tileset image when theme changes
  useEffect(() => {
    if (!themeInfo) { setTilesetImg(null); setDoodadImg(null); return; }
    const img = new Image();
    img.onload = () => setTilesetImg(img);
    img.onerror = () => setTilesetImg(null);
    img.src = themeInfo.path;
    const dImg = new Image();
    dImg.onload = () => setDoodadImg(dImg);
    dImg.onerror = () => setDoodadImg(null);
    dImg.src = themeInfo.doodadPath;
  }, [config.theme]);

  // Load map data when map changes
  useEffect(() => {
    const data = config.builder();
    const grid = makeGrid('empty');
    // We don't know which blocked cells are "animated" vs "blocked" from the builder
    // (it just returns blocked[]). For now, mark all as 'blocked'.
    // The theme's TerrainTheme rules determine which clusters become which type at runtime.
    // In the editor, user can manually switch cells to 'animated' type.
    for (const p of data.blocked) {
      if (p.row >= 0 && p.row < ROWS && p.col >= 0 && p.col < COLS) grid[p.row][p.col] = 'blocked';
    }
    for (const p of (data.noBuild || [])) {
      if (p.row >= 0 && p.row < ROWS && p.col >= 0 && p.col < COLS) grid[p.row][p.col] = 'noBuild';
    }
    setCells(grid);
    setEntries(new Set(config.entries.map(p => `${p.col},${p.row}`)));
    setExits(new Set(config.exits.map(p => `${p.col},${p.row}`)));
    setPlacements((data.structures || []).map(s => ({ ...s })));
    setSelectedPalette(null); setDragIdx(null); setShowExport(false); setBrush('select');
  }, [mapIdx]);

  const themeStructures = LARGE_STRUCTURES[config.theme] || [];

  const structFootprint = useMemo(() => {
    const set = new Set<string>();
    for (const p of placements) {
      const def = getStructureDef(p.structureId);
      if (!def) continue;
      for (let dc = 0; dc < def.widthCells; dc++)
        for (let dr = 0; dr < def.heightCells; dr++)
          set.add(`${p.col + dc},${p.row + dr}`);
    }
    return set;
  }, [placements]);

  const isOverlapping = useCallback((idx: number): boolean => {
    const a = placements[idx];
    const ad = getStructureDef(a.structureId);
    if (!ad) return false;
    for (let i = 0; i < placements.length; i++) {
      if (i === idx) continue;
      const b = placements[i];
      const bd = getStructureDef(b.structureId);
      if (!bd) continue;
      if (a.col < b.col + bd.widthCells && a.col + ad.widthCells > b.col &&
          a.row < b.row + bd.heightCells && a.row + ad.heightCells > b.row) return true;
    }
    return false;
  }, [placements]);

  const paintCell = useCallback((col: number, row: number) => {
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return;
    if (brush === 'blocked' || brush === 'animated' || brush === 'noBuild') {
      setCells(prev => { const n = prev.map(r => [...r]); n[row][col] = brush as TerrainCell; return n; });
    } else if (brush === 'clear') {
      setCells(prev => { const n = prev.map(r => [...r]); n[row][col] = 'empty'; return n; });
      const key = `${col},${row}`;
      setEntries(prev => { const n = new Set(prev); n.delete(key); return n; });
      setExits(prev => { const n = new Set(prev); n.delete(key); return n; });
    } else if (brush === 'entry') {
      setEntries(prev => { const n = new Set(prev); n.add(`${col},${row}`); return n; });
    } else if (brush === 'exit') {
      setExits(prev => { const n = new Set(prev); n.add(`${col},${row}`); return n; });
    }
  }, [brush]);

  const ensureBlocked = useCallback((p: Placement) => {
    const def = getStructureDef(p.structureId);
    if (!def) return;
    setCells(prev => {
      const n = prev.map(r => [...r]);
      for (let dc = 0; dc < def.widthCells; dc++)
        for (let dr = 0; dr < def.heightCells; dr++) {
          const c = p.col + dc, r = p.row + dr;
          if (c >= 0 && c < COLS && r >= 0 && r < ROWS) n[r][c] = 'blocked';
        }
      return n;
    });
  }, []);

  const clearFootprint = useCallback((p: Placement) => {
    const def = getStructureDef(p.structureId);
    if (!def) return;
    setCells(prev => {
      const n = prev.map(r => [...r]);
      for (let dc = 0; dc < def.widthCells; dc++)
        for (let dr = 0; dr < def.heightCells; dr++) {
          const c = p.col + dc, r = p.row + dr;
          if (c >= 0 && c < COLS && r >= 0 && r < ROWS) n[r][c] = 'empty';
        }
      return n;
    });
  }, []);

  // Draw the map
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const w = COLS * CELL, h = ROWS * CELL;
    canvas.width = w; canvas.height = h;
    ctx.imageSmoothingEnabled = false;

    // Draw terrain tiles
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = c * CELL, y = r * CELL;
        const cell = cells[r]?.[c] || 'empty';

        // Structure footprint cells: draw ground tile (structure sprite covers them)
        const isStructCell = structFootprint.has(`${c},${r}`);

        if (tilesetImg && themeInfo) {
          let tileRow = -1;
          let tileIdx = 15;

          if (isStructCell || cell === 'empty') {
            tileRow = themeInfo.groundRow;
            tileIdx = 15;
          } else if (cell === 'blocked') {
            tileRow = themeInfo.blockedRow;
            tileIdx = autoTileIdx(c, r, cells, 'blocked');
          } else if (cell === 'animated') {
            tileRow = themeInfo.animatedRow;
            tileIdx = autoTileIdx(c, r, cells, 'animated');
          } else if (cell === 'noBuild') {
            tileRow = themeInfo.noBuildRow;
            tileIdx = 15;
          }

          if (tileRow >= 0) {
            const sx = tileIdx * TS, sy = tileRow * TS;
            ctx.drawImage(tilesetImg, sx, sy, TS, TS, x, y, CELL, CELL);
          }
        } else {
          const colors: Record<TerrainCell, string> = { empty: '#1a1a1a', blocked: '#333340', animated: '#222244', noBuild: '#2a2222' };
          ctx.fillStyle = isStructCell ? '#1a1a1a' : colors[cell];
          ctx.fillRect(x, y, CELL, CELL);
        }
      }
    }

    // Subtle grid lines
    ctx.strokeStyle = '#ffffff06';
    ctx.lineWidth = 0.5;
    for (let c = 0; c <= COLS; c++) { ctx.beginPath(); ctx.moveTo(c * CELL, 0); ctx.lineTo(c * CELL, h); ctx.stroke(); }
    for (let r = 0; r <= ROWS; r++) { ctx.beginPath(); ctx.moveTo(0, r * CELL); ctx.lineTo(w, r * CELL); ctx.stroke(); }

    // Entry/exit markers
    for (const key of entries) {
      const [c, r] = key.split(',').map(Number);
      ctx.fillStyle = '#44ff4455'; ctx.fillRect(c * CELL, r * CELL, CELL, CELL);
      ctx.strokeStyle = '#44ff44'; ctx.lineWidth = 1.5; ctx.strokeRect(c * CELL + 1, r * CELL + 1, CELL - 2, CELL - 2);
    }
    for (const key of exits) {
      const [c, r] = key.split(',').map(Number);
      ctx.fillStyle = '#ff444455'; ctx.fillRect(c * CELL, r * CELL, CELL, CELL);
      ctx.strokeStyle = '#ff4444'; ctx.lineWidth = 1.5; ctx.strokeRect(c * CELL + 1, r * CELL + 1, CELL - 2, CELL - 2);
    }

    // Structure placements
    for (let i = 0; i < placements.length; i++) {
      const p = placements[i];
      const def = getStructureDef(p.structureId);
      if (!def) continue;
      const x = p.col * CELL, y = p.row * CELL;
      const pw = def.widthCells * CELL, ph = def.heightCells * CELL;
      const overlap = isOverlapping(i);

      const tex = textureCache.get(p.structureId);
      if (tex) ctx.drawImage(tex, 0, 0, tex.width, tex.height, x, y, pw, ph);

      ctx.strokeStyle = dragIdx === i ? '#ffcc44' : overlap ? '#ff4444' : '#44aaff55';
      ctx.lineWidth = dragIdx === i ? 2 : 1;
      ctx.strokeRect(x + 0.5, y + 0.5, pw - 1, ph - 1);

      if (overlap) { ctx.fillStyle = '#ff000022'; ctx.fillRect(x, y, pw, ph); }

      // Label
      ctx.fillStyle = '#ffffffbb';
      ctx.font = '8px monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      const label = p.structureId.replace(/^(military_|psionic_|infernal_|arcane_|mech_|nature_|cyber_|celestial_|alien_|harmonic_|void_)/, '');
      ctx.fillText(label, x + pw / 2, y + ph - 1, pw - 2);
    }

    // Ghost preview
    if (selectedPalette && hoveredCell && brush === 'select') {
      const def = getStructureDef(selectedPalette);
      if (def) {
        const x = hoveredCell.col * CELL, y = hoveredCell.row * CELL;
        const pw = def.widthCells * CELL, ph = def.heightCells * CELL;
        const tex = textureCache.get(selectedPalette);
        if (tex) { ctx.globalAlpha = 0.5; ctx.drawImage(tex, 0, 0, tex.width, tex.height, x, y, pw, ph); ctx.globalAlpha = 1; }
        ctx.strokeStyle = '#44ff44'; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
        ctx.strokeRect(x + 0.5, y + 0.5, pw - 1, ph - 1); ctx.setLineDash([]);
      }
    }

    // Brush cursor
    if (hoveredCell && brush !== 'select' && !selectedPalette) {
      const x = hoveredCell.col * CELL, y = hoveredCell.row * CELL;
      ctx.strokeStyle = '#ffffff66'; ctx.lineWidth = 1.5; ctx.strokeRect(x + 0.5, y + 0.5, CELL - 1, CELL - 1);
    }
  });

  // Mouse handlers
  const getCellFromEvent = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const sx = (COLS * CELL) / rect.width, sy = (ROWS * CELL) / rect.height;
    return { col: Math.floor((e.clientX - rect.left) * sx / CELL), row: Math.floor((e.clientY - rect.top) * sy / CELL) };
  };

  const findStructureAt = (col: number, row: number): number => {
    for (let i = placements.length - 1; i >= 0; i--) {
      const p = placements[i]; const def = getStructureDef(p.structureId);
      if (!def) continue;
      if (col >= p.col && col < p.col + def.widthCells && row >= p.row && row < p.row + def.heightCells) return i;
    }
    return -1;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { col, row } = getCellFromEvent(e);
    setMouseDown(true);
    if (e.button === 2) {
      e.preventDefault();
      const idx = findStructureAt(col, row);
      if (idx >= 0) { clearFootprint(placements[idx]); setPlacements(prev => prev.filter((_, i) => i !== idx)); }
      else { setEntries(prev => { const n = new Set(prev); n.delete(`${col},${row}`); return n; }); setExits(prev => { const n = new Set(prev); n.delete(`${col},${row}`); return n; }); }
      return;
    }
    if (selectedPalette && brush === 'select') {
      const newP: Placement = { structureId: selectedPalette, col, row };
      ensureBlocked(newP); setPlacements(prev => [...prev, newP]); return;
    }
    if (brush !== 'select') { paintCell(col, row); return; }
    const idx = findStructureAt(col, row);
    if (idx >= 0) { setDragIdx(idx); setDragOffset({ col: col - placements[idx].col, row: row - placements[idx].row }); }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { col, row } = getCellFromEvent(e);
    setHoveredCell({ col, row });
    if (mouseDown && brush !== 'select' && !selectedPalette && dragIdx === null) { paintCell(col, row); return; }
    if (dragIdx !== null) { setPlacements(prev => prev.map((p, i) => i === dragIdx ? { ...p, col: col - dragOffset.col, row: row - dragOffset.row } : p)); }
  };

  const handleMouseUp = () => {
    if (dragIdx !== null) ensureBlocked(placements[dragIdx]);
    setDragIdx(null); setMouseDown(false);
  };

  // Export
  const exportCode = () => {
    const structLines = placements.map(p => `    { structureId: '${p.structureId}', col: ${p.col}, row: ${p.row} },`);
    return `  // ${config.faction} — ${config.name}\n  const structures: LargeStructurePlacement[] = [\n${structLines.join('\n')}\n  ];`;
  };

  // Full JSON export — everything needed to reconstruct the map
  const exportFullJSON = () => {
    const blocked: { col: number; row: number }[] = [];
    const animated: { col: number; row: number }[] = [];
    const noBuild: { col: number; row: number }[] = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (cells[r][c] === 'blocked') blocked.push({ col: c, row: r });
        else if (cells[r][c] === 'animated') animated.push({ col: c, row: r });
        else if (cells[r][c] === 'noBuild') noBuild.push({ col: c, row: r });
      }
    }
    return JSON.stringify({
      faction: config.faction,
      theme: config.theme,
      name: config.name,
      entries: [...entries].map(k => { const [c, r] = k.split(',').map(Number); return { col: c, row: r }; }),
      exits: [...exits].map(k => { const [c, r] = k.split(',').map(Number); return { col: c, row: r }; }),
      blocked,
      animated,
      noBuild,
      structures: placements,
    }, null, 2);
  };

  const overlapCount = placements.filter((_, i) => isOverlapping(i)).length;

  const btnStyle: React.CSSProperties = {
    background: '#2a2828', color: '#aa8844', border: '1px solid #aa8844',
    padding: '5px 12px', cursor: 'pointer', fontFamily: 'monospace', marginRight: 4, fontSize: 12,
  };
  const activeBtnStyle: React.CSSProperties = { ...btnStyle, background: '#aa8844', color: '#111' };
  const brushBtn = (mode: BrushMode, label: string, extra?: string) => (
    <button
      onClick={() => { setBrush(mode); setSelectedPalette(null); }}
      style={brush === mode && !selectedPalette ? activeBtnStyle : btnStyle}
      title={extra}
    >{label}</button>
  );

  // Terrain tile preview helper
  const TilePreview = ({ tileRow, size = 28 }: { tileRow: number; size?: number }) => (
    <canvas
      ref={el => {
        if (!el || !tilesetImg) return;
        el.width = size; el.height = size;
        const c = el.getContext('2d')!;
        c.imageSmoothingEnabled = false;
        c.drawImage(tilesetImg, 15 * TS, tileRow * TS, TS, TS, 0, 0, size, size);
      }}
      style={{ imageRendering: 'pixelated', flexShrink: 0, border: '1px solid #333', display: 'inline-block', verticalAlign: 'middle' }}
    />
  );

  return (
    <div style={{ padding: 16, fontFamily: 'monospace', color: '#aa8844', background: '#111110', minHeight: '100vh' }}>
      <h2 style={{ margin: '0 0 8px 0', fontSize: 16 }}>Gauntlet Map Structure Editor</h2>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
        <select value={mapIdx} onChange={e => setMapIdx(Number(e.target.value))}
          style={{ background: '#222', color: '#aa8844', border: '1px solid #aa8844', padding: '5px 10px', fontFamily: 'monospace', fontSize: 12 }}>
          {GAUNTLET_MAP_CONFIGS.map((c, i) => <option key={i} value={i}>{c.faction} — {c.name}</option>)}
        </select>
        <span style={{ color: '#555' }}>|</span>
        {brushBtn('select', '🖱 Select')}
        {brushBtn('clear', '✕ Erase')}
        {brushBtn('entry', '▶ Entry')}
        {brushBtn('exit', '◼ Exit')}
        <span style={{ color: '#555' }}>|</span>
        <span style={{ fontSize: 11, color: '#888' }}>
          {placements.length} structures | {overlapCount > 0 ? <span style={{ color: '#ff4444' }}>{overlapCount} overlaps</span> : <span style={{ color: '#44aa44' }}>OK</span>}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        {/* Canvas */}
        <div style={{ flexShrink: 0 }}>
          <canvas ref={canvasRef}
            style={{
              border: '1px solid #aa884433', imageRendering: 'pixelated',
              width: COLS * CELL, height: ROWS * CELL,
              cursor: selectedPalette ? 'crosshair' : brush !== 'select' ? 'cell' : dragIdx !== null ? 'grabbing' : 'default',
            }}
            onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}
            onMouseLeave={() => { handleMouseUp(); setHoveredCell(null); }}
            onContextMenu={e => e.preventDefault()}
          />
          <div style={{ fontSize: 9, color: '#555', marginTop: 2, display: 'flex', justifyContent: 'space-between' }}>
            <span>
              {hoveredCell ? `(${hoveredCell.col}, ${hoveredCell.row})` : ''}
              {hoveredCell && cells[hoveredCell.row]?.[hoveredCell.col] && cells[hoveredCell.row][hoveredCell.col] !== 'empty' ? ` ${cells[hoveredCell.row][hoveredCell.col]}` : ''}
            </span>
            <span>{selectedPalette ? `Placing: ${selectedPalette}` : ''}</span>
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ minWidth: 320, maxWidth: 400, flex: 1 }}>
          {/* Terrain palette */}
          <div style={{ fontSize: 13, color: '#888', marginBottom: 6, fontWeight: 'bold' }}>Terrain — {config.theme}</div>
          <div style={{ border: '1px solid #333', padding: 6, marginBottom: 10 }}>
            {themeInfo && tilesetImg ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div
                  onClick={() => { setBrush('blocked'); setSelectedPalette(null); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px', cursor: 'pointer',
                    background: brush === 'blocked' ? '#aa884433' : 'transparent', border: brush === 'blocked' ? '1px solid #aa8844' : '1px solid transparent', borderRadius: 2 }}
                >
                  <TilePreview tileRow={themeInfo.blockedRow} size={32} />
                  <div>
                    <div style={{ fontSize: 12, color: '#aa8844' }}>{terrainLabels.blocked}</div>
                    <div style={{ fontSize: 9, color: '#666' }}>Blocked — impassable</div>
                  </div>
                </div>
                <div
                  onClick={() => { setBrush('animated'); setSelectedPalette(null); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px', cursor: 'pointer',
                    background: brush === 'animated' ? '#aa884433' : 'transparent', border: brush === 'animated' ? '1px solid #aa8844' : '1px solid transparent', borderRadius: 2 }}
                >
                  <TilePreview tileRow={themeInfo.animatedRow} size={32} />
                  <div>
                    <div style={{ fontSize: 12, color: '#aa8844' }}>{terrainLabels.animated}</div>
                    <div style={{ fontSize: 9, color: '#666' }}>Blocked — animated</div>
                  </div>
                </div>
                <div
                  onClick={() => { setBrush('noBuild'); setSelectedPalette(null); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px', cursor: 'pointer',
                    background: brush === 'noBuild' ? '#aa884433' : 'transparent', border: brush === 'noBuild' ? '1px solid #aa8844' : '1px solid transparent', borderRadius: 2 }}
                >
                  <TilePreview tileRow={themeInfo.noBuildRow} size={32} />
                  <div>
                    <div style={{ fontSize: 12, color: '#aa8844' }}>{terrainLabels.noBuild}</div>
                    <div style={{ fontSize: 9, color: '#666' }}>Walkable — can't build</div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 10, color: '#666' }}>No tileset loaded for {config.theme}</div>
            )}
          </div>

          {/* Structure palette */}
          <div style={{ fontSize: 13, color: '#888', marginBottom: 6, fontWeight: 'bold' }}>Structures — {config.theme}</div>
          <div style={{ maxHeight: 340, overflowY: 'auto', border: '1px solid #333', padding: 4, marginBottom: 10 }}>
            {themeStructures.map(def => {
              const isSelected = selectedPalette === def.id;
              const placed = placements.filter(p => p.structureId === def.id).length;
              return (
                <div key={def.id}
                  onClick={() => { setSelectedPalette(isSelected ? null : def.id); setBrush('select'); }}
                  style={{
                    padding: '5px 8px', marginBottom: 2, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                    background: isSelected ? '#aa884433' : '#1a1a1a', borderRadius: 2,
                    border: isSelected ? '1px solid #aa8844' : '1px solid transparent',
                  }}>
                  <canvas ref={el => {
                    if (!el || !textureCache.has(def.id)) return;
                    const tex = textureCache.get(def.id)!;
                    const maxW = 48, maxH = 36;
                    const scale = Math.min(maxW / (def.widthCells * TS), maxH / (def.heightCells * TS));
                    el.width = Math.ceil(def.widthCells * TS * scale); el.height = Math.ceil(def.heightCells * TS * scale);
                    const c = el.getContext('2d')!; c.imageSmoothingEnabled = false;
                    c.drawImage(tex, 0, 0, el.width, el.height);
                  }} style={{ imageRendering: 'pixelated', flexShrink: 0, border: '1px solid #333' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: '#aa8844', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {def.id.replace(/^.*?_/, '')}
                    </div>
                    <div style={{ fontSize: 10, color: '#666' }}>
                      {def.widthCells}×{def.heightCells} cells
                      {placed > 0 && <span style={{ color: '#44aa44', marginLeft: 6 }}>×{placed}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Placed structures list */}
          <div style={{ fontSize: 12, color: '#888', marginBottom: 4, fontWeight: 'bold' }}>Placed ({placements.length})</div>
          <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid #333', padding: 4, marginBottom: 8 }}>
            {placements.map((p, i) => (
              <div key={i} style={{ fontSize: 11, padding: '2px 6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: isOverlapping(i) ? '#ff6644' : '#999' }}>
                <span>{p.structureId.replace(/^.*?_/, '')} <span style={{ color: '#666' }}>({p.col},{p.row})</span></span>
                <span style={{ cursor: 'pointer', color: '#ff4444', fontSize: 13, padding: '0 4px' }}
                  onClick={() => { clearFootprint(p); setPlacements(prev => prev.filter((_, j) => j !== i)); }}>✕</span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            <button onClick={() => setShowExport(!showExport)} style={btnStyle}>{showExport ? 'Hide' : 'Export'}</button>
            <button onClick={() => { const data = config.builder(); const grid = makeGrid('empty');
              for (const p of data.blocked) { if (p.row >= 0 && p.row < ROWS && p.col >= 0 && p.col < COLS) grid[p.row][p.col] = 'blocked'; }
              for (const p of (data.noBuild || [])) { if (p.row >= 0 && p.row < ROWS && p.col >= 0 && p.col < COLS) grid[p.row][p.col] = 'noBuild'; }
              setCells(grid); setPlacements((data.structures || []).map(s => ({ ...s })));
            }} style={btnStyle}>Reset</button>
            <button onClick={() => {
              setCells(makeGrid('empty'));
              setPlacements([]);
              setEntries(new Set());
              setExits(new Set());
            }} style={{ ...btnStyle, color: '#ff6644', borderColor: '#ff6644' }}>Clear All</button>
            <button onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = '.json';
              input.onchange = () => {
                const file = input.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                  try {
                    const json = JSON.parse(reader.result as string);
                    const grid = makeGrid('empty');
                    const toPos = (arr: any[]) => arr.map((item: any) =>
                      Array.isArray(item) ? { col: item[0], row: item[1] } : item
                    );
                    for (const p of toPos(json.blocked || [])) {
                      if (p.row >= 0 && p.row < ROWS && p.col >= 0 && p.col < COLS) grid[p.row][p.col] = 'blocked';
                    }
                    for (const p of toPos(json.animated || [])) {
                      if (p.row >= 0 && p.row < ROWS && p.col >= 0 && p.col < COLS) grid[p.row][p.col] = 'animated';
                    }
                    for (const p of toPos(json.noBuild || [])) {
                      if (p.row >= 0 && p.row < ROWS && p.col >= 0 && p.col < COLS) grid[p.row][p.col] = 'noBuild';
                    }
                    setCells(grid);
                    setEntries(new Set((json.entries || []).map((p: any) => `${p.col},${p.row}`)));
                    setExits(new Set((json.exits || []).map((p: any) => `${p.col},${p.row}`)));
                    setPlacements((json.structures || []).map((s: any) => ({ structureId: s.structureId, col: s.col, row: s.row })));
                  } catch (e) {
                    alert('Invalid JSON: ' + (e as Error).message);
                  }
                };
                reader.readAsText(file);
              };
              input.click();
            }} style={btnStyle}>Import JSON</button>
            <button onClick={() => {
              const json = exportFullJSON();
              const blob = new Blob([json], { type: 'application/json' });
              const a = document.createElement('a');
              a.download = `${config.faction}.json`;
              a.href = URL.createObjectURL(blob);
              a.click();
              URL.revokeObjectURL(a.href);
            }} style={{ ...btnStyle, color: '#44cc88', borderColor: '#44cc88' }}>Save JSON</button>
            <button onClick={() => {
              navigator.clipboard.writeText(exportFullJSON()).then(
                () => alert('Map JSON copied to clipboard! Paste in Custom Maps → Import from Clipboard.'),
                () => alert('Failed to copy — check clipboard permissions.')
              );
            }} style={{ ...btnStyle, color: '#88aaff', borderColor: '#88aaff' }}>Copy to Clipboard</button>
          </div>
        </div>
      </div>

      {showExport && (
        <div style={{ marginTop: 8 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Structure Placements (paste into build function)</div>
              <textarea readOnly value={exportCode()}
                style={{ width: '100%', height: 160, background: '#1a1a1a', color: '#44cc88', border: '1px solid #333', fontFamily: 'monospace', fontSize: 10, padding: 8 }}
                onClick={e => (e.target as HTMLTextAreaElement).select()} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Full Map JSON (terrain + structures — paste to Claude)</div>
              <textarea readOnly value={exportFullJSON()}
                style={{ width: '100%', height: 160, background: '#1a1a1a', color: '#88aacc', border: '1px solid #333', fontFamily: 'monospace', fontSize: 10, padding: 8 }}
                onClick={e => (e.target as HTMLTextAreaElement).select()} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
