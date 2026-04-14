import { useState, useEffect, useRef, useCallback } from 'react';
import { FACTION_SPRITES, FactionSpriteInfo } from './FactionModules';
import { createColorProxy, normalizeHex } from './ColorProxyContext';

// ─── Types ──────────────────────────────────────────────

interface PaletteEntry { original: string; current: string; }
interface FactionDrawFns {
  drawTowers: (ctx: CanvasRenderingContext2D) => { cols: number; rows: number; cell: number };
  drawProjectiles: (ctx: CanvasRenderingContext2D) => any;
  drawHero: (ctx: CanvasRenderingContext2D) => any;
  C: Record<string, string>;
}
type TowerPalettes = Record<number, Record<string, string>>;

// ─── Dynamic faction loader ─────────────────────────────

async function loadFactionModule(id: string): Promise<FactionDrawFns> {
  const modules: Record<string, () => Promise<any>> = {
    // @ts-expect-error
    arcane: () => import('../../arcane_sprites.tsx'),
    // @ts-expect-error
    void: () => import('../../void_sprites.tsx'),
    // @ts-expect-error
    mechanical: () => import('../../mechanical_sprites.tsx'),
    // @ts-expect-error
    nature: () => import('../../nature_sprites.tsx'),
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
  const mod = await modules[id]!();
  return { drawTowers: mod.drawTowers, drawProjectiles: mod.drawProjectiles, drawHero: mod.drawHero, C: mod.C };
}

// ─── Helpers ────────────────────────────────────────────

function hexLum(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/** Scan a canvas region and return all unique non-transparent hex colors */
function scanCanvasColors(canvas: HTMLCanvasElement, x: number, y: number, w: number, h: number): Set<string> {
  const ctx = canvas.getContext('2d')!;
  const data = ctx.getImageData(x, y, w, h).data;
  const colors = new Set<string>();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    colors.add('#' + [data[i], data[i + 1], data[i + 2]].map(v => v.toString(16).padStart(2, '0')).join(''));
  }
  return colors;
}

// ─── Main App ───────────────────────────────────────────

export default function SkinEditorApp() {
  const [factionId, setFactionId] = useState<string | null>(null);
  const [factionInfo, setFactionInfo] = useState<FactionSpriteInfo | null>(null);
  const [drawFns, setDrawFns] = useState<FactionDrawFns | null>(null);
  const [allColors, setAllColors] = useState<string[]>([]);            // all unique colors sorted
  const [towerColorSets, setTowerColorSets] = useState<Set<string>[]>([]); // colors per tower column
  const [towerPalettes, setTowerPalettes] = useState<TowerPalettes>({});
  const [selectedTower, setSelectedTower] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [skinName, setSkinName] = useState('');
  const [highlightedColor, setHighlightedColor] = useState<string | null>(null);
  const origRef = useRef<HTMLCanvasElement>(null);
  const skinRef = useRef<HTMLCanvasElement>(null);
  const zoomRef = useRef<HTMLCanvasElement>(null);

  const faction = factionInfo;

  // ─── Load faction ──────────────────────────────────

  const selectFaction = useCallback(async (id: string) => {
    setLoading(true);
    setFactionId(id);
    const info = FACTION_SPRITES.find(f => f.id === id)!;
    setFactionInfo(info);
    setSelectedTower(-1);
    setTowerPalettes({});
    setHighlightedColor(null);

    try {
      const fns = await loadFactionModule(id);
      setDrawFns(fns);

      // Render to a temp canvas to extract all colors + per-tower colors
      const tmpCanvas = document.createElement('canvas');
      tmpCanvas.width = info.towerCols * info.towerCell;
      tmpCanvas.height = info.towerRows * info.towerCell;
      const tmpCtx = tmpCanvas.getContext('2d')!;
      tmpCtx.imageSmoothingEnabled = false;
      const { proxy, usedColors } = createColorProxy(tmpCtx);
      fns.drawTowers(proxy);

      // All colors sorted by luminance
      const sorted = Array.from(usedColors).sort((a, b) => hexLum(a) - hexLum(b));
      setAllColors(sorted);

      // Per-tower: scan pixel data for each column region
      const perTower: Set<string>[] = [];
      for (let col = 0; col < info.towerCols; col++) {
        perTower.push(scanCanvasColors(tmpCanvas, col * info.towerCell, 0, info.towerCell, tmpCanvas.height));
      }
      setTowerColorSets(perTower);

      renderOriginal(fns, info);
    } catch (err) {
      console.error('Failed to load faction:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Render ────────────────────────────────────────

  const renderOriginal = (fns: FactionDrawFns, info: FactionSpriteInfo) => {
    const canvas = origRef.current;
    if (!canvas) return;
    canvas.width = info.towerCols * info.towerCell;
    canvas.height = info.towerRows * info.towerCell;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    fns.drawTowers(ctx);
  };

  const buildColorMap = (towerCol: number): Map<string, string> => {
    const map = new Map<string, string>();
    const global = towerPalettes[-1];
    if (global) for (const [o, r] of Object.entries(global)) map.set(o, r);
    const perTower = towerPalettes[towerCol];
    if (perTower) for (const [o, r] of Object.entries(perTower)) map.set(o, r);
    return map;
  };

  const renderSkin = useCallback(() => {
    if (!drawFns || !factionInfo) return;
    const canvas = skinRef.current;
    if (!canvas) return;
    const { towerCols, towerRows, towerCell } = factionInfo;
    canvas.width = towerCols * towerCell;
    canvas.height = towerRows * towerCell;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let col = 0; col < towerCols; col++) {
      const colorMap = buildColorMap(col);
      if (colorMap.size === 0) {
        ctx.save(); ctx.beginPath(); ctx.rect(col * towerCell, 0, towerCell, towerRows * towerCell); ctx.clip();
        drawFns.drawTowers(ctx); ctx.restore();
      } else {
        const { proxy, colorMap: proxyMap } = createColorProxy(ctx);
        for (const [k, v] of colorMap) proxyMap.set(k, v);
        ctx.save(); ctx.beginPath(); ctx.rect(col * towerCell, 0, towerCell, towerRows * towerCell); ctx.clip();
        drawFns.drawTowers(proxy); ctx.restore();
      }
    }
  }, [drawFns, factionInfo, towerPalettes]);

  useEffect(() => {
    if (!drawFns || !factionInfo) return;
    const timer = setTimeout(renderSkin, 80);
    return () => clearTimeout(timer);
  }, [towerPalettes, renderSkin]);

  useEffect(() => {
    if (drawFns && factionInfo) renderOriginal(drawFns, factionInfo);
  }, [drawFns, factionInfo]);

  // ─── Zoom view — render selected tower column large ──

  useEffect(() => {
    const zc = zoomRef.current;
    if (!zc || !factionInfo || selectedTower < 0) return;
    // Source from the skinned canvas (or original if no mods)
    const src = skinRef.current || origRef.current;
    if (!src) return;

    const cell = factionInfo.towerCell;
    const rows = factionInfo.towerRows;
    const scale = 5;  // 5x zoom
    const colsToShow = 1;
    zc.width = cell * scale * colsToShow;
    zc.height = rows * cell * scale;
    const ctx = zc.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#08080f';
    ctx.fillRect(0, 0, zc.width, zc.height);
    ctx.save();
    ctx.scale(scale, scale);
    ctx.drawImage(src, selectedTower * cell, 0, cell, rows * cell, 0, 0, cell, rows * cell);
    ctx.restore();
    // Grid lines for each frame
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    for (let r = 1; r < rows; r++) {
      const y = r * cell * scale;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(zc.width, y); ctx.stroke();
    }
  }, [selectedTower, factionInfo, towerPalettes]);

  // ─── Palette display — filtered by tower ───────────

  const getDisplayColors = (): string[] => {
    if (selectedTower === -1) return allColors;
    const towerSet = towerColorSets[selectedTower];
    if (!towerSet) return allColors;
    return allColors.filter(c => towerSet.has(c));
  };

  const getDisplayPalette = (): PaletteEntry[] => {
    const overrides = towerPalettes[selectedTower] ?? {};
    return getDisplayColors().map(c => ({
      original: c,
      current: overrides[c] ?? c,
    }));
  };

  // ─── Color editing ─────────────────────────────────

  const setColor = (original: string, newColor: string) => {
    setTowerPalettes(prev => {
      const copy = { ...prev };
      const existing = { ...(copy[selectedTower] ?? {}) };
      if (newColor === original) delete existing[original];
      else existing[original] = newColor;
      if (Object.keys(existing).length === 0) delete copy[selectedTower];
      else copy[selectedTower] = existing;
      return copy;
    });
  };

  const resetTower = () => {
    setTowerPalettes(prev => { const c = { ...prev }; delete c[selectedTower]; return c; });
  };
  const resetAll = () => setTowerPalettes({});

  // ─── Eyedropper ────────────────────────────────────

  const handleCanvasClick = (e: MouseEvent, canvasRef: React.RefObject<HTMLCanvasElement | null>, isOriginal: boolean) => {
    const canvas = canvasRef.current;
    if (!canvas || !factionInfo) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const px = Math.floor((e.clientX - rect.left) * scaleX);
    const py = Math.floor((e.clientY - rect.top) * scaleY);
    const ctx = canvas.getContext('2d')!;
    const pixel = ctx.getImageData(px, py, 1, 1).data;
    if (pixel[3] === 0) return;
    const hex = '#' + [pixel[0], pixel[1], pixel[2]].map(v => v.toString(16).padStart(2, '0')).join('');

    const col = Math.floor(px / factionInfo.towerCell);
    if (col >= 0 && col < factionInfo.towerCols) setSelectedTower(col);

    if (isOriginal) {
      setHighlightedColor(hex);
    } else {
      const overrides = towerPalettes[col] ?? towerPalettes[-1] ?? {};
      const found = Object.entries(overrides).find(([, v]) => v === hex);
      setHighlightedColor(found ? found[0] : hex);
    }
  };

  // ─── Zoom eyedropper (click on zoomed canvas) ──────

  const handleZoomClick = (e: MouseEvent) => {
    const zc = zoomRef.current;
    if (!zc || !factionInfo || selectedTower < 0) return;
    // The zoom canvas shows one column at 5x scale
    // Map click to the original canvas pixel, then read from the source
    const rect = zc.getBoundingClientRect();
    const sx = zc.width / rect.width;
    const sy = zc.height / rect.height;
    const zpx = Math.floor((e.clientX - rect.left) * sx);
    const zpy = Math.floor((e.clientY - rect.top) * sy);
    // Zoom canvas pixel → source pixel
    const scale = 5;
    const srcX = selectedTower * factionInfo.towerCell + Math.floor(zpx / scale);
    const srcY = Math.floor(zpy / scale);
    // Read from original canvas
    const src = origRef.current;
    if (!src) return;
    const ctx = src.getContext('2d')!;
    const pixel = ctx.getImageData(srcX, srcY, 1, 1).data;
    if (pixel[3] === 0) return;
    const hex = '#' + [pixel[0], pixel[1], pixel[2]].map(v => v.toString(16).padStart(2, '0')).join('');
    setHighlightedColor(hex);
  };

  // ─── Stats ─────────────────────────────────────────

  const totalMods = Object.values(towerPalettes).reduce((sum, m) => sum + Object.keys(m).length, 0);
  const towerModCount = Object.keys(towerPalettes[selectedTower] ?? {}).length;
  const displayPalette = factionId ? getDisplayPalette() : [];

  // ─── Export / Import ───────────────────────────────

  const exportSkin = () => {
    const canvas = skinRef.current || origRef.current;
    if (!canvas || !factionId) return;
    const suffix = skinName.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'custom';
    const a = document.createElement('a'); a.download = `${factionId}_towers_${suffix}.png`; a.href = canvas.toDataURL('image/png'); a.click();
    const data = { factionId, skinName: skinName || 'Custom Skin', suffix, towerPalettes };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const b = document.createElement('a'); b.download = `${factionId}_skin_${suffix}.json`; b.href = URL.createObjectURL(blob); b.click();
  };

  const importPalette = () => {
    const input = document.createElement('input'); input.type = 'file'; input.accept = '.json';
    input.onchange = async () => {
      const file = input.files?.[0]; if (!file) return;
      const data = JSON.parse(await file.text());
      if (data.factionId && data.factionId !== factionId) await selectFaction(data.factionId);
      if (data.towerPalettes) setTowerPalettes(data.towerPalettes);
      if (data.skinName) setSkinName(data.skinName);
    };
    input.click();
  };

  // ─── Render ────────────────────────────────────────

  return (
    <div style={{ background: '#0a0a14', color: '#ccc', fontFamily: 'Courier New, monospace', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ padding: '16px 24px', background: '#111122', borderBottom: '1px solid #2a2a44', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '20px', color: '#ffaa44', letterSpacing: '2px' }}>SKIN EDITOR</h1>
        <button onClick={importPalette} style={btn}>Import Palette</button>
      </div>

      {/* Faction picker */}
      {!factionId && (
        <div style={{ padding: '40px 24px', textAlign: 'center' }}>
          <h2 style={{ color: '#888', marginBottom: '24px' }}>Select a faction to edit</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
            {FACTION_SPRITES.map(f => (
              <button key={f.id} onClick={() => selectFaction(f.id)}
                style={{ ...btn, padding: '16px 24px', fontSize: '14px', minWidth: '140px' }}>
                {f.name}
                <div style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>{f.towerCols} towers</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Editor */}
      {factionId && faction && (
        <div style={{ display: 'flex', height: 'calc(100vh - 60px)' }}>
          {/* Left panel — palette */}
          <div style={{ width: '340px', borderRight: '1px solid #2a2a44', overflow: 'auto', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #1a1a2a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: '#ffaa44', fontSize: '14px' }}>{faction.name}</h3>
              <button onClick={() => { setFactionId(null); setAllColors([]); setDrawFns(null); setTowerPalettes({}); }} style={{ ...btn, fontSize: '11px', padding: '3px 8px' }}>Change</button>
            </div>

            {/* Tower tabs */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px', padding: '8px 12px', borderBottom: '1px solid #1a1a2a', background: '#0d0d18' }}>
              <button onClick={() => setSelectedTower(-1)}
                style={{ ...btn, fontSize: '10px', padding: '4px 8px', background: selectedTower === -1 ? '#2a2040' : undefined, borderColor: selectedTower === -1 ? '#aa88ff' : undefined, color: selectedTower === -1 ? '#aa88ff' : '#666' }}>
                All ({allColors.length}) {Object.keys(towerPalettes[-1] ?? {}).length > 0 && '*'}
              </button>
              {faction.towerNames.map((name, i) => (
                <button key={i} onClick={() => setSelectedTower(i)}
                  style={{ ...btn, fontSize: '10px', padding: '4px 8px', background: selectedTower === i ? '#2a2010' : undefined, borderColor: selectedTower === i ? '#ffaa44' : undefined, color: selectedTower === i ? '#ffaa44' : '#666' }}>
                  {name} ({towerColorSets[i]?.size ?? '?'}) {Object.keys(towerPalettes[i] ?? {}).length > 0 && '*'}
                </button>
              ))}
            </div>

            {/* Palette content */}
            <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px' }}>
              <input type="text" placeholder="Skin name..." value={skinName}
                onInput={(e: any) => setSkinName(e.target.value)}
                style={{ width: '100%', padding: '8px', background: '#1a1a28', border: '1px solid #333', color: '#fff', fontFamily: 'inherit', fontSize: '12px', borderRadius: '4px', marginBottom: '10px' }} />

              <div style={{ fontSize: '10px', color: '#666', marginBottom: '8px' }}>
                {selectedTower === -1 ? 'All towers' : faction.towerNames[selectedTower]}
                {' — '}{displayPalette.length} colors{towerModCount > 0 && `, ${towerModCount} changed`}
                {totalMods > 0 && ` (${totalMods} total)`}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '3px' }}>
                {displayPalette.map((entry) => {
                  const isHighlighted = highlightedColor === entry.original;
                  const isModified = entry.original !== entry.current;
                  return (
                    <div key={entry.original} style={{ position: 'relative' }}
                      onClick={() => setHighlightedColor(entry.original)}>
                      <input type="color" value={entry.current}
                        ref={(el: HTMLInputElement | null) => { if (el && isHighlighted) el.click(); }}
                        onChange={(e: any) => setColor(entry.original, e.target.value)}
                        style={{
                          width: '100%', height: '28px', border: 'none', cursor: 'pointer', borderRadius: '3px', padding: 0,
                          outline: isHighlighted ? '3px solid #ffffff' : isModified ? '2px solid #ffaa44' : 'none',
                          boxShadow: isHighlighted ? '0 0 8px #ffffff88' : 'none',
                        }} />
                      {isModified && (
                        <div onClick={(e: any) => { e.stopPropagation(); setColor(entry.original, entry.original); }}
                          style={{ position: 'absolute', top: '-3px', right: '-3px', width: '12px', height: '12px', background: '#ff4444', borderRadius: '50%', cursor: 'pointer', fontSize: '8px', textAlign: 'center', lineHeight: '12px', color: '#fff' }}>×</div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button onClick={resetTower} style={btn}>Reset {selectedTower === -1 ? 'Global' : faction.towerNames[selectedTower]}</button>
                <button onClick={resetAll} style={btn}>Reset All Towers</button>
                <button onClick={exportSkin} style={{ ...btn, background: '#1a2a1a', borderColor: '#44ff44', color: '#44ff44', padding: '10px', fontSize: '13px' }}>Export Skin</button>
              </div>
            </div>
          </div>

          {/* Right panel — preview */}
          <div style={{ flex: 1, overflow: 'auto', padding: '16px', background: '#08080f' }}>
            {loading && <div style={{ textAlign: 'center', padding: '60px', color: '#666' }}>Rendering...</div>}

            {/* Zoomed single tower view (when a tower is selected) */}
            {selectedTower >= 0 && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', color: '#ffaa44', marginBottom: '6px', fontWeight: 'bold' }}>
                  {faction.towerNames[selectedTower]} — 5x zoom (click pixel to pick)
                </div>
                <div style={{ maxHeight: '400px', overflow: 'auto', border: '1px solid #2a2a44', borderRadius: '4px', display: 'inline-block' }}>
                  <canvas ref={zoomRef}
                    onClick={(e: any) => handleZoomClick(e)}
                    style={{ imageRendering: 'pixelated' as any, cursor: 'crosshair', display: 'block' }} />
                </div>
              </div>
            )}

            {/* Full spritesheet comparison */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
              {faction.towerNames.map((name, i) => (
                <span key={i} onClick={() => setSelectedTower(i)}
                  style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer',
                    color: selectedTower === i ? '#ffaa44' : '#666', background: selectedTower === i ? '#2a2010' : '#1a1a28',
                    border: Object.keys(towerPalettes[i] ?? {}).length > 0 ? '1px solid #ffaa44' : '1px solid transparent' }}>
                  {name}
                </span>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>Original</div>
                <canvas ref={origRef} onClick={(e: any) => handleCanvasClick(e, origRef, true)}
                  style={{ imageRendering: 'pixelated' as any, maxWidth: '100%', border: '1px solid #1a1a2a', borderRadius: '4px', cursor: 'crosshair' }} />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#ffaa44', marginBottom: '4px' }}>Modified {totalMods > 0 ? `(${totalMods})` : ''}</div>
                <canvas ref={skinRef} onClick={(e: any) => handleCanvasClick(e, skinRef, false)}
                  style={{ imageRendering: 'pixelated' as any, maxWidth: '100%', border: '1px solid #1a1a2a', borderRadius: '4px', cursor: 'crosshair' }} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const btn: Record<string, string | number> = {
  fontFamily: 'Courier New, monospace', fontSize: '12px', padding: '6px 14px',
  borderRadius: '4px', border: '1px solid #2a2a44', background: '#1a1a28', color: '#ccc', cursor: 'pointer',
};
