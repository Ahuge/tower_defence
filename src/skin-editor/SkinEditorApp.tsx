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

// ─── Dynamic faction loader ─────────────────────────────

async function loadFactionModule(id: string): Promise<FactionDrawFns> {
  // Vite static import map — dynamic import() with string interpolation
  // doesn't work well, so we map each faction to a static import
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
  return {
    drawTowers: mod.drawTowers,
    drawProjectiles: mod.drawProjectiles,
    drawHero: mod.drawHero,
    C: mod.C,
  };
}

// ─── Main App ───────────────────────────────────────────

export default function SkinEditorApp() {
  const [factionId, setFactionId] = useState<string | null>(null);
  const [factionInfo, setFactionInfo] = useState<FactionSpriteInfo | null>(null);
  const [drawFns, setDrawFns] = useState<FactionDrawFns | null>(null);
  const [palette, setPalette] = useState<PaletteEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [skinName, setSkinName] = useState('');
  const origRef = useRef<HTMLCanvasElement>(null);
  const skinRef = useRef<HTMLCanvasElement>(null);

  // Load faction
  const selectFaction = useCallback(async (id: string) => {
    setLoading(true);
    setFactionId(id);
    const info = FACTION_SPRITES.find(f => f.id === id)!;
    setFactionInfo(info);

    try {
      const fns = await loadFactionModule(id);
      setDrawFns(fns);

      // Build palette from the exported C object
      const entries: PaletteEntry[] = Object.entries(fns.C).map(([, hex]) => ({
        original: normalizeHex(hex),
        current: normalizeHex(hex),
      }));
      // Deduplicate by original color
      const seen = new Set<string>();
      const deduped = entries.filter(e => {
        if (seen.has(e.original)) return false;
        seen.add(e.original);
        return true;
      });
      setPalette(deduped);

      // Render original
      renderOriginal(fns, info);
    } catch (err) {
      console.error('Failed to load faction:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Render original (no color changes)
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

  // Render skinned version with color proxy
  const renderSkin = useCallback(() => {
    if (!drawFns || !factionInfo) return;
    setLoading(true);

    const canvas = skinRef.current;
    if (!canvas) { setLoading(false); return; }
    canvas.width = factionInfo.towerCols * factionInfo.towerCell;
    canvas.height = factionInfo.towerRows * factionInfo.towerCell;
    const realCtx = canvas.getContext('2d')!;
    realCtx.imageSmoothingEnabled = false;
    realCtx.clearRect(0, 0, canvas.width, canvas.height);

    // Create proxy with color map
    const { proxy, colorMap } = createColorProxy(realCtx);
    for (const entry of palette) {
      if (entry.original !== entry.current) {
        colorMap.set(entry.original, entry.current);
      }
    }

    drawFns.drawTowers(proxy);
    setLoading(false);
  }, [drawFns, factionInfo, palette]);

  // Auto-render skin when palette changes (debounced)
  useEffect(() => {
    if (!drawFns || !factionInfo) return;
    const timer = setTimeout(renderSkin, 100);
    return () => clearTimeout(timer);
  }, [palette, renderSkin]);

  // Render original when drawFns loads
  useEffect(() => {
    if (drawFns && factionInfo) {
      renderOriginal(drawFns, factionInfo);
    }
  }, [drawFns, factionInfo]);

  // Export
  const exportSkin = () => {
    const canvas = skinRef.current || origRef.current;
    if (!canvas || !factionId) return;
    const suffix = skinName.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'custom';

    // PNG
    const a = document.createElement('a');
    a.download = `${factionId}_towers_${suffix}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();

    // Palette JSON
    const data = {
      factionId, skinName: skinName || 'Custom Skin', suffix,
      colorMap: Object.fromEntries(palette.filter(e => e.original !== e.current).map(e => [e.original, e.current])),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const b = document.createElement('a');
    b.download = `${factionId}_skin_${suffix}.json`;
    b.href = URL.createObjectURL(blob);
    b.click();
  };

  // Import
  const importPalette = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const data = JSON.parse(await file.text());
      if (data.factionId && data.factionId !== factionId) {
        await selectFaction(data.factionId);
      }
      if (data.colorMap) {
        setPalette(prev => prev.map(e => ({
          ...e, current: data.colorMap[e.original] ?? e.current,
        })));
        if (data.skinName) setSkinName(data.skinName);
      }
    };
    input.click();
  };

  const modifiedCount = palette.filter(e => e.original !== e.current).length;

  return (
    <div style={{ background: '#0a0a14', color: '#ccc', fontFamily: 'Courier New, monospace', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ padding: '16px 24px', background: '#111122', borderBottom: '1px solid #2a2a44', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '20px', color: '#ffaa44', letterSpacing: '2px' }}>SKIN EDITOR</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={importPalette} style={btn}>Import Palette</button>
        </div>
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
      {factionId && factionInfo && (
        <div style={{ display: 'flex', height: 'calc(100vh - 60px)' }}>
          {/* Left — palette */}
          <div style={{ width: '320px', borderRight: '1px solid #2a2a44', overflow: 'auto', flexShrink: 0, padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, color: '#ffaa44', fontSize: '14px' }}>{factionInfo.name} Palette</h3>
              <button onClick={() => { setFactionId(null); setPalette([]); setDrawFns(null); }} style={{ ...btn, fontSize: '11px', padding: '3px 8px' }}>
                Change
              </button>
            </div>

            <input type="text" placeholder="Skin name..." value={skinName}
              onInput={(e: any) => setSkinName(e.target.value)}
              style={{ width: '100%', padding: '8px', background: '#1a1a28', border: '1px solid #333', color: '#fff', fontFamily: 'inherit', fontSize: '12px', borderRadius: '4px', marginBottom: '12px' }}
            />

            <div style={{ fontSize: '10px', color: '#666', marginBottom: '8px' }}>
              {palette.length} colors — click to edit, {modifiedCount} modified
            </div>

            {/* Color grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
              {palette.map((entry, i) => (
                <div key={i} style={{ position: 'relative' }}>
                  <input type="color" value={entry.current}
                    onChange={(e: any) => {
                      const np = [...palette];
                      np[i] = { ...entry, current: e.target.value };
                      setPalette(np);
                    }}
                    style={{
                      width: '100%', height: '32px', border: 'none', cursor: 'pointer',
                      borderRadius: '4px', padding: 0,
                      outline: entry.original !== entry.current ? '2px solid #ffaa44' : 'none',
                    }}
                  />
                  {entry.original !== entry.current && (
                    <div onClick={() => {
                        const np = [...palette];
                        np[i] = { ...entry, current: entry.original };
                        setPalette(np);
                      }}
                      style={{ position: 'absolute', top: '-4px', right: '-4px', width: '14px', height: '14px', background: '#ff4444', borderRadius: '50%', cursor: 'pointer', fontSize: '9px', textAlign: 'center', lineHeight: '14px', color: '#fff' }}>
                      ×
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Actions */}
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button onClick={() => setPalette(p => p.map(e => ({ ...e, current: e.original })))} style={btn}>
                Reset All Colors
              </button>
              <button onClick={exportSkin} disabled={!skinRef.current && !origRef.current}
                style={{ ...btn, background: '#1a2a1a', borderColor: '#44ff44', color: '#44ff44', padding: '10px', fontSize: '13px' }}>
                Export Skin
              </button>
            </div>
          </div>

          {/* Right — preview */}
          <div style={{ flex: 1, overflow: 'auto', padding: '16px', background: '#08080f' }}>
            {loading && <div style={{ textAlign: 'center', padding: '60px', color: '#666' }}>Rendering...</div>}

            {/* Tower names */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
              {factionInfo.towerNames.map((name, i) => (
                <span key={i} style={{ fontSize: '10px', color: '#888', background: '#1a1a28', padding: '2px 8px', borderRadius: '4px' }}>
                  {i}: {name}
                </span>
              ))}
            </div>

            {/* Side-by-side: original + skinned */}
            <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>Original</div>
                <canvas ref={origRef} style={{ imageRendering: 'pixelated', maxWidth: '100%', border: '1px solid #1a1a2a', borderRadius: '4px' }} />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#ffaa44', marginBottom: '4px' }}>
                  Modified {modifiedCount > 0 ? `(${modifiedCount} colors)` : ''}
                </div>
                <canvas ref={skinRef} style={{ imageRendering: 'pixelated', maxWidth: '100%', border: '1px solid #1a1a2a', borderRadius: '4px' }} />
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
