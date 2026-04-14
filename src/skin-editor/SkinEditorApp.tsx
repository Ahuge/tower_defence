import { useState, useEffect, useRef, useCallback } from 'react';
import { FACTION_SPRITES, FactionSpriteInfo } from './FactionModules';
import { createColorProxy, normalizeHex } from './ColorProxyContext';

// ─── Types ──────────────────────────────────────────────

interface PaletteEntry {
  original: string;
  current: string;
}

interface FactionDrawFns {
  drawTowers: (ctx: CanvasRenderingContext2D) => { cols: number; rows: number; cell: number };
  drawProjectiles: (ctx: CanvasRenderingContext2D) => any;
  drawHero: (ctx: CanvasRenderingContext2D) => any;
  C: Record<string, string>;
}

// Per-tower palette: index -1 = global overrides, 0..N = per tower column
type TowerPalettes = Record<number, Record<string, string>>;

// ─── Dynamic faction loader ─────────────────────────────

async function loadFactionModule(id: string): Promise<FactionDrawFns> {
  const modules: Record<string, () => Promise<any>> = {
    // @ts-expect-error — sprite generators are untyped root TSX files
    arcane:     () => import('../../arcane_sprites.tsx'),
    // @ts-expect-error
    void:       () => import('../../void_sprites.tsx'),
    // @ts-expect-error
    mechanical: () => import('../../mechanical_sprites.tsx'),
    // @ts-expect-error
    nature:     () => import('../../nature_sprites.tsx'),
    // @ts-expect-error
    military:   () => import('../../military_sprites.tsx'),
    // @ts-expect-error
    aliens:     () => import('../../aliens_sprites.tsx'),
    // @ts-expect-error
    cypherpunk: () => import('../../cypherpunk_sprites.tsx'),
    // @ts-expect-error
    infernal:   () => import('../../infernal_sprites.tsx'),
    // @ts-expect-error
    celestial:  () => import('../../celestial_sprites.tsx'),
    // @ts-expect-error
    psionic:    () => import('../../psionic_sprites.tsx'),
    // @ts-expect-error
    harmonic:   () => import('../../harmonic_sprites.tsx'),
  };
  const loader = modules[id];
  if (!loader) throw new Error(`Unknown faction: ${id}`);
  const mod = await loader();
  return { drawTowers: mod.drawTowers, drawProjectiles: mod.drawProjectiles, drawHero: mod.drawHero, C: mod.C };
}

// ─── Main App ───────────────────────────────────────────

export default function SkinEditorApp() {
  const [factionId, setFactionId] = useState<string | null>(null);
  const [factionInfo, setFactionInfo] = useState<FactionSpriteInfo | null>(null);
  const [drawFns, setDrawFns] = useState<FactionDrawFns | null>(null);
  const [basePalette, setBasePalette] = useState<PaletteEntry[]>([]); // deduped C colors
  const [towerPalettes, setTowerPalettes] = useState<TowerPalettes>({}); // per-tower overrides
  const [selectedTower, setSelectedTower] = useState(-1); // -1 = all towers
  const [loading, setLoading] = useState(false);
  const [skinName, setSkinName] = useState('');
  const [highlightedColor, setHighlightedColor] = useState<string | null>(null);
  const origRef = useRef<HTMLCanvasElement>(null);
  const skinRef = useRef<HTMLCanvasElement>(null);

  const faction = factionInfo;

  // Load faction
  const selectFaction = useCallback(async (id: string) => {
    setLoading(true);
    setFactionId(id);
    const info = FACTION_SPRITES.find(f => f.id === id)!;
    setFactionInfo(info);
    setSelectedTower(-1);
    setTowerPalettes({});

    try {
      const fns = await loadFactionModule(id);
      setDrawFns(fns);

      const entries: PaletteEntry[] = [];
      const seen = new Set<string>();
      for (const [, hex] of Object.entries(fns.C)) {
        const norm = normalizeHex(hex);
        if (seen.has(norm)) continue;
        seen.add(norm);
        entries.push({ original: norm, current: norm });
      }
      setBasePalette(entries);
      renderOriginal(fns, info);
    } catch (err) {
      console.error('Failed to load faction:', err);
    } finally {
      setLoading(false);
    }
  }, []);

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

  // Build the effective color map for a specific tower column
  const buildColorMap = (towerCol: number): Map<string, string> => {
    const map = new Map<string, string>();
    // Apply global overrides first (from "All towers" tab, stored at key -1)
    const global = towerPalettes[-1];
    if (global) {
      for (const [orig, rep] of Object.entries(global)) map.set(orig, rep);
    }
    // Apply per-tower overrides (override global)
    const perTower = towerPalettes[towerCol];
    if (perTower) {
      for (const [orig, rep] of Object.entries(perTower)) map.set(orig, rep);
    }
    return map;
  };

  // Render skinned version — per-tower color maps via clipping
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

    // Draw each tower column with its own color map
    for (let col = 0; col < towerCols; col++) {
      const colorMap = buildColorMap(col);
      if (colorMap.size === 0) {
        // No modifications — draw normally (fast path)
        ctx.save();
        ctx.beginPath();
        ctx.rect(col * towerCell, 0, towerCell, towerRows * towerCell);
        ctx.clip();
        drawFns.drawTowers(ctx);
        ctx.restore();
      } else {
        // Draw through color proxy, clipped to this column
        const { proxy, colorMap: proxyMap } = createColorProxy(ctx);
        for (const [k, v] of colorMap) proxyMap.set(k, v);
        ctx.save();
        ctx.beginPath();
        ctx.rect(col * towerCell, 0, towerCell, towerRows * towerCell);
        ctx.clip();
        drawFns.drawTowers(proxy);
        ctx.restore();
      }
    }
  }, [drawFns, factionInfo, towerPalettes]);

  // Auto-render when palettes change
  useEffect(() => {
    if (!drawFns || !factionInfo) return;
    const timer = setTimeout(renderSkin, 80);
    return () => clearTimeout(timer);
  }, [towerPalettes, renderSkin]);

  useEffect(() => {
    if (drawFns && factionInfo) renderOriginal(drawFns, factionInfo);
  }, [drawFns, factionInfo]);

  // Get the current palette for the selected tower tab
  const getDisplayPalette = (): PaletteEntry[] => {
    const overrides = towerPalettes[selectedTower] ?? {};
    return basePalette.map(e => ({
      original: e.original,
      current: overrides[e.original] ?? e.original,
    }));
  };

  const setColor = (original: string, newColor: string) => {
    setTowerPalettes(prev => {
      const copy = { ...prev };
      const existing = { ...(copy[selectedTower] ?? {}) };
      if (newColor === original) {
        delete existing[original];
      } else {
        existing[original] = newColor;
      }
      if (Object.keys(existing).length === 0) {
        delete copy[selectedTower];
      } else {
        copy[selectedTower] = existing;
      }
      return copy;
    });
  };

  const resetTower = () => {
    setTowerPalettes(prev => {
      const copy = { ...prev };
      delete copy[selectedTower];
      return copy;
    });
  };

  const resetAll = () => setTowerPalettes({});

  // Eyedropper: click canvas pixel → find palette color → highlight it
  const handleCanvasClick = (e: MouseEvent, canvasRef: React.RefObject<HTMLCanvasElement | null>, isOriginal: boolean) => {
    const canvas = canvasRef.current;
    if (!canvas || !factionInfo) return;
    const rect = canvas.getBoundingClientRect();
    // Map click position to canvas pixel (accounting for CSS scaling)
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const px = Math.floor((e.clientX - rect.left) * scaleX);
    const py = Math.floor((e.clientY - rect.top) * scaleY);
    const ctx = canvas.getContext('2d')!;
    const pixel = ctx.getImageData(px, py, 1, 1).data;
    if (pixel[3] === 0) return; // transparent
    const hex = '#' + [pixel[0], pixel[1], pixel[2]].map(v => v.toString(16).padStart(2, '0')).join('');

    // Also detect which tower column was clicked
    const col = Math.floor(px / factionInfo.towerCell);
    if (col >= 0 && col < factionInfo.towerCols && selectedTower !== col) {
      setSelectedTower(col);
    }

    // If clicking original canvas, the hex IS the original palette color
    // If clicking modified canvas, we need to reverse-lookup to find the original
    if (isOriginal) {
      setHighlightedColor(hex);
    } else {
      // Find which original color maps to this modified color
      const overrides = towerPalettes[col] ?? towerPalettes[-1] ?? {};
      const found = Object.entries(overrides).find(([, v]) => v === hex);
      setHighlightedColor(found ? found[0] : hex);
    }
  };

  // Count total modifications
  const totalMods = Object.values(towerPalettes).reduce((sum, m) => sum + Object.keys(m).length, 0);

  // Export
  const exportSkin = () => {
    const canvas = skinRef.current || origRef.current;
    if (!canvas || !factionId) return;
    const suffix = skinName.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'custom';
    const a = document.createElement('a');
    a.download = `${factionId}_towers_${suffix}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();

    const data = { factionId, skinName: skinName || 'Custom Skin', suffix, towerPalettes };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const b = document.createElement('a');
    b.download = `${factionId}_skin_${suffix}.json`;
    b.href = URL.createObjectURL(blob);
    b.click();
  };

  const importPalette = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const data = JSON.parse(await file.text());
      if (data.factionId && data.factionId !== factionId) await selectFaction(data.factionId);
      if (data.towerPalettes) setTowerPalettes(data.towerPalettes);
      if (data.skinName) setSkinName(data.skinName);
    };
    input.click();
  };

  const displayPalette = factionId ? getDisplayPalette() : [];
  const towerModCount = Object.keys(towerPalettes[selectedTower] ?? {}).length;

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
            {/* Faction header */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #1a1a2a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: '#ffaa44', fontSize: '14px' }}>{faction.name}</h3>
              <button onClick={() => { setFactionId(null); setBasePalette([]); setDrawFns(null); setTowerPalettes({}); }} style={{ ...btn, fontSize: '11px', padding: '3px 8px' }}>
                Change
              </button>
            </div>

            {/* Tower tabs */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px', padding: '8px 12px', borderBottom: '1px solid #1a1a2a', background: '#0d0d18' }}>
              <button
                onClick={() => setSelectedTower(-1)}
                style={{
                  ...btn, fontSize: '10px', padding: '4px 8px',
                  background: selectedTower === -1 ? '#2a2040' : undefined,
                  borderColor: selectedTower === -1 ? '#aa88ff' : undefined,
                  color: selectedTower === -1 ? '#aa88ff' : '#666',
                }}>
                All {Object.keys(towerPalettes[-1] ?? {}).length > 0 && '*'}
              </button>
              {faction.towerNames.map((name, i) => (
                <button key={i}
                  onClick={() => setSelectedTower(i)}
                  style={{
                    ...btn, fontSize: '10px', padding: '4px 8px',
                    background: selectedTower === i ? '#2a2010' : undefined,
                    borderColor: selectedTower === i ? '#ffaa44' : undefined,
                    color: selectedTower === i ? '#ffaa44' : '#666',
                  }}>
                  {name} {Object.keys(towerPalettes[i] ?? {}).length > 0 && '*'}
                </button>
              ))}
            </div>

            {/* Palette content */}
            <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px' }}>
              <input type="text" placeholder="Skin name..." value={skinName}
                onInput={(e: any) => setSkinName(e.target.value)}
                style={{ width: '100%', padding: '8px', background: '#1a1a28', border: '1px solid #333', color: '#fff', fontFamily: 'inherit', fontSize: '12px', borderRadius: '4px', marginBottom: '10px' }}
              />

              <div style={{ fontSize: '10px', color: '#666', marginBottom: '8px' }}>
                {selectedTower === -1 ? 'Editing: ALL towers' : `Editing: ${faction.towerNames[selectedTower]}`}
                {' — '}{towerModCount} color{towerModCount !== 1 ? 's' : ''} changed
                {totalMods > 0 && ` (${totalMods} total)`}
              </div>

              {/* Color grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
                {displayPalette.map((entry) => {
                  const isHighlighted = highlightedColor === entry.original;
                  const isModified = entry.original !== entry.current;
                  return (
                    <div key={entry.original} style={{ position: 'relative' }}
                      onClick={() => setHighlightedColor(entry.original)}>
                      <input type="color" value={entry.current}
                        id={`color-${entry.original}`}
                        ref={(el: HTMLInputElement | null) => {
                          // Auto-open the native color picker when this color is eyedropper-selected
                          if (el && isHighlighted) el.click();
                        }}
                        onChange={(e: any) => setColor(entry.original, e.target.value)}
                        style={{
                          width: '100%', height: '32px', border: 'none', cursor: 'pointer',
                          borderRadius: '4px', padding: 0,
                          outline: isHighlighted ? '3px solid #ffffff'
                            : isModified ? '2px solid #ffaa44' : 'none',
                          boxShadow: isHighlighted ? '0 0 8px #ffffff88' : 'none',
                        }}
                      />
                      {isModified && (
                        <div onClick={(e: any) => { e.stopPropagation(); setColor(entry.original, entry.original); }}
                          style={{ position: 'absolute', top: '-4px', right: '-4px', width: '14px', height: '14px', background: '#ff4444', borderRadius: '50%', cursor: 'pointer', fontSize: '9px', textAlign: 'center', lineHeight: '14px', color: '#fff' }}>
                          ×
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Actions */}
              <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button onClick={resetTower} style={btn}>
                  Reset {selectedTower === -1 ? 'Global' : faction.towerNames[selectedTower]}
                </button>
                <button onClick={resetAll} style={btn}>Reset All Towers</button>
                <button onClick={exportSkin} disabled={!skinRef.current && !origRef.current}
                  style={{ ...btn, background: '#1a2a1a', borderColor: '#44ff44', color: '#44ff44', padding: '10px', fontSize: '13px' }}>
                  Export Skin
                </button>
              </div>
            </div>
          </div>

          {/* Right panel — preview */}
          <div style={{ flex: 1, overflow: 'auto', padding: '16px', background: '#08080f' }}>
            {loading && <div style={{ textAlign: 'center', padding: '60px', color: '#666' }}>Rendering...</div>}

            {/* Tower column labels */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
              {faction.towerNames.map((name, i) => (
                <span key={i}
                  onClick={() => setSelectedTower(i)}
                  style={{
                    fontSize: '10px', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer',
                    color: selectedTower === i ? '#ffaa44' : '#666',
                    background: selectedTower === i ? '#2a2010' : '#1a1a28',
                    border: Object.keys(towerPalettes[i] ?? {}).length > 0 ? '1px solid #ffaa44' : '1px solid transparent',
                  }}>
                  {name}
                </span>
              ))}
            </div>

            {/* Side-by-side */}
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>Original (click to pick color)</div>
                <canvas ref={origRef}
                  onClick={(e: any) => handleCanvasClick(e, origRef, true)}
                  style={{ imageRendering: 'pixelated' as any, maxWidth: '100%', border: '1px solid #1a1a2a', borderRadius: '4px', cursor: 'crosshair' }} />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#ffaa44', marginBottom: '4px' }}>
                  Modified {totalMods > 0 ? `(${totalMods} colors)` : '— click original to pick a color'}
                </div>
                <canvas ref={skinRef}
                  onClick={(e: any) => handleCanvasClick(e, skinRef, false)}
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
  borderRadius: '4px', border: '1px solid #2a2a44', background: '#1a1a28',
  color: '#ccc', cursor: 'pointer',
};
