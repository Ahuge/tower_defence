import { useState, useEffect, useRef, useCallback } from 'react';
import { FACTION_SPRITES, FactionSpriteInfo } from './FactionModules';
import { createColorProxy, normalizeHex, extractPalette } from './ColorProxyContext';

// ─── Types ──────────────────────────────────────────────

interface PaletteEntry {
  original: string;
  current: string;
}

// ─── Main App ───────────────────────────────────────────

export default function SkinEditorApp() {
  const [factionId, setFactionId] = useState<string | null>(null);
  const [palette, setPalette] = useState<PaletteEntry[]>([]);
  const [originalCanvas, setOriginalCanvas] = useState<HTMLCanvasElement | null>(null);
  const [skinnedCanvas, setSkinnedCanvas] = useState<HTMLCanvasElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [skinName, setSkinName] = useState('');
  const [tab, setTab] = useState<'towers' | 'projectiles' | 'hero'>('towers');
  const previewRef = useRef<HTMLCanvasElement>(null);

  const faction = FACTION_SPRITES.find(f => f.id === factionId);

  // Load faction sprites by rendering the React component to a hidden container
  const loadFaction = useCallback(async (id: string) => {
    setLoading(true);
    setFactionId(id);
    setPalette([]);
    setOriginalCanvas(null);
    setSkinnedCanvas(null);

    try {
      // Dynamically import the faction sprite module
      const info = FACTION_SPRITES.find(f => f.id === id);
      if (!info) return;

      // The sprite modules are React components. We need to render them
      // to get the canvas output. Create a hidden container.
      const container = document.createElement('div');
      container.style.cssText = 'position:absolute;left:-9999px;top:-9999px;';
      document.body.appendChild(container);

      const React = await import('react');
      const ReactDOM = await import('react-dom/client');

      // Dynamic import of the sprite module
      const mod = await import(/* @vite-ignore */ `../../${id}_sprites.tsx`);
      const Component = mod.default;

      const root = ReactDOM.createRoot(container);
      root.render(React.createElement(Component));

      // Wait for the component to render and populate canvases
      await new Promise(r => setTimeout(r, 500));

      // Grab the first canvas (towers spritesheet)
      const canvases = container.querySelectorAll('canvas');
      if (canvases.length > 0) {
        // Canvas 0 = towers actual, 1 = towers preview
        // Canvas 2 = projectiles actual, 3 = projectiles preview
        // Canvas 4 = hero actual, 5 = hero preview
        const towersCanvas = canvases[0] as HTMLCanvasElement;

        // Extract palette by scanning all pixel colors
        const colors = extractCanvasPalette(towersCanvas);
        setPalette(colors.map(c => ({ original: c, current: c })));
        setOriginalCanvas(cloneCanvas(towersCanvas));
      }

      // Clean up
      root.unmount();
      document.body.removeChild(container);
    } catch (err) {
      console.error('Failed to load faction sprites:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Re-render with modified palette
  const rerenderSkin = useCallback(async () => {
    if (!factionId || !originalCanvas || palette.length === 0) return;

    setLoading(true);
    try {
      const container = document.createElement('div');
      container.style.cssText = 'position:absolute;left:-9999px;top:-9999px;';
      document.body.appendChild(container);

      const React = await import('react');
      const ReactDOM = await import('react-dom/client');
      const mod = await import(/* @vite-ignore */ `../../${factionId}_sprites.tsx`);
      const Component = mod.default;

      // Intercept canvas creation to inject color proxy
      const origGetContext = HTMLCanvasElement.prototype.getContext;
      const colorMap = new Map<string, string>();
      for (const entry of palette) {
        if (entry.original !== entry.current) {
          colorMap.set(normalizeHex(entry.original), normalizeHex(entry.current));
        }
      }

      const hijack = function(this: HTMLCanvasElement, type: string, ...args: any[]) {
        const ctx = origGetContext.call(this, type, ...args) as any;
        if (type === '2d' && ctx) {
          const proxyResult = createColorProxy(ctx);
          for (const [k, v] of colorMap) proxyResult.colorMap.set(k, v);
          return proxyResult.proxy;
        }
        return ctx;
      };
      HTMLCanvasElement.prototype.getContext = hijack as any;

      const root = ReactDOM.createRoot(container);
      root.render(React.createElement(Component));

      await new Promise(r => setTimeout(r, 500));

      // Restore original getContext
      HTMLCanvasElement.prototype.getContext = origGetContext;

      const canvases = container.querySelectorAll('canvas');
      if (canvases.length > 0) {
        setSkinnedCanvas(cloneCanvas(canvases[0] as HTMLCanvasElement));
      }

      root.unmount();
      document.body.removeChild(container);
    } catch (err) {
      console.error('Failed to re-render skin:', err);
    } finally {
      setLoading(false);
    }
  }, [factionId, originalCanvas, palette]);

  // Draw preview whenever skinned canvas changes
  useEffect(() => {
    const canvas = previewRef.current;
    if (!canvas) return;
    const src = skinnedCanvas || originalCanvas;
    if (!src) return;

    const scale = 2;
    canvas.width = src.width * scale;
    canvas.height = Math.min(src.height * scale, 800);
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(scale, scale);
    ctx.drawImage(src, 0, 0);
    ctx.restore();

    // Grid lines
    const info = FACTION_SPRITES.find(f => f.id === factionId);
    if (info) {
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= src.width; x += info.towerCell) {
        ctx.beginPath(); ctx.moveTo(x * scale, 0); ctx.lineTo(x * scale, canvas.height); ctx.stroke();
      }
      for (let y = 0; y <= src.height; y += info.towerCell) {
        ctx.beginPath(); ctx.moveTo(0, y * scale); ctx.lineTo(canvas.width, y * scale); ctx.stroke();
      }
    }
  }, [skinnedCanvas, originalCanvas, factionId]);

  // Export skin
  const exportSkin = () => {
    const src = skinnedCanvas || originalCanvas;
    if (!src || !factionId) return;

    const suffix = skinName.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'custom';

    // Download spritesheet PNG
    const a = document.createElement('a');
    a.download = `${factionId}_towers_${suffix}.png`;
    a.href = src.toDataURL('image/png');
    a.click();

    // Download palette JSON
    const paletteData = {
      factionId,
      skinName: skinName || 'Custom Skin',
      suffix,
      colorMap: Object.fromEntries(
        palette.filter(e => e.original !== e.current).map(e => [e.original, e.current])
      ),
    };
    const blob = new Blob([JSON.stringify(paletteData, null, 2)], { type: 'application/json' });
    const b = document.createElement('a');
    b.download = `${factionId}_skin_${suffix}.json`;
    b.href = URL.createObjectURL(blob);
    b.click();
  };

  // Import palette JSON
  const importPalette = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();
      const data = JSON.parse(text);
      if (data.factionId && data.factionId !== factionId) {
        await loadFaction(data.factionId);
      }
      if (data.colorMap) {
        setPalette(prev => prev.map(e => ({
          ...e,
          current: data.colorMap[e.original] ?? e.current,
        })));
        if (data.skinName) setSkinName(data.skinName);
      }
    };
    input.click();
  };

  return (
    <div style={{ background: '#0a0a14', color: '#ccc', fontFamily: 'Courier New, monospace', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ padding: '16px 24px', background: '#111122', borderBottom: '1px solid #2a2a44', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '20px', color: '#ffaa44', letterSpacing: '2px' }}>SKIN EDITOR</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={importPalette} style={btnStyle}>Import Palette</button>
        </div>
      </div>

      {/* Faction picker */}
      {!factionId && (
        <div style={{ padding: '40px 24px', textAlign: 'center' }}>
          <h2 style={{ color: '#888', marginBottom: '24px' }}>Select a faction to edit</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
            {FACTION_SPRITES.map(f => (
              <button
                key={f.id}
                onClick={() => loadFaction(f.id)}
                style={{
                  ...btnStyle,
                  padding: '16px 24px',
                  fontSize: '14px',
                  minWidth: '140px',
                }}
              >
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
          {/* Left panel — palette editor */}
          <div style={{ width: '320px', borderRight: '1px solid #2a2a44', overflow: 'auto', flexShrink: 0, padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, color: '#ffaa44', fontSize: '14px' }}>{faction.name} Palette</h3>
              <button onClick={() => { setFactionId(null); setPalette([]); }} style={{ ...btnStyle, fontSize: '11px', padding: '3px 8px' }}>
                Change
              </button>
            </div>

            {/* Skin name */}
            <input
              type="text"
              placeholder="Skin name..."
              value={skinName}
              onInput={(e) => setSkinName((e.target as HTMLInputElement).value)}
              style={{ width: '100%', padding: '8px', background: '#1a1a28', border: '1px solid #333', color: '#fff', fontFamily: 'inherit', fontSize: '12px', borderRadius: '4px', marginBottom: '12px' }}
            />

            {/* Color swatches */}
            <div style={{ fontSize: '10px', color: '#666', marginBottom: '8px' }}>
              {palette.length} colors — click to edit
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
              {palette.map((entry, i) => (
                <div key={i} style={{ position: 'relative' }}>
                  <input
                    type="color"
                    value={entry.current}
                    onChange={(e) => {
                      const newPalette = [...palette];
                      newPalette[i] = { ...entry, current: (e.target as HTMLInputElement).value };
                      setPalette(newPalette);
                    }}
                    style={{
                      width: '100%', height: '32px', border: 'none', cursor: 'pointer',
                      borderRadius: '4px', padding: 0,
                      outline: entry.original !== entry.current ? '2px solid #ffaa44' : 'none',
                    }}
                  />
                  {entry.original !== entry.current && (
                    <div
                      onClick={() => {
                        const newPalette = [...palette];
                        newPalette[i] = { ...entry, current: entry.original };
                        setPalette(newPalette);
                      }}
                      style={{ position: 'absolute', top: '-2px', right: '-2px', width: '12px', height: '12px', background: '#ff4444', borderRadius: '50%', cursor: 'pointer', fontSize: '8px', textAlign: 'center', lineHeight: '12px', color: '#fff' }}
                    >
                      ×
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Actions */}
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={rerenderSkin}
                disabled={loading}
                style={{ ...btnStyle, background: '#2a2040', borderColor: '#aa88ff', color: '#aa88ff', padding: '10px', fontSize: '13px' }}
              >
                {loading ? 'Rendering...' : 'Preview Skin'}
              </button>
              <button onClick={() => setPalette(p => p.map(e => ({ ...e, current: e.original })))} style={btnStyle}>
                Reset All Colors
              </button>
              <button
                onClick={exportSkin}
                disabled={!skinnedCanvas && !originalCanvas}
                style={{ ...btnStyle, background: '#1a2a1a', borderColor: '#44ff44', color: '#44ff44', padding: '10px', fontSize: '13px' }}
              >
                Export Skin
              </button>
            </div>

            {/* Modified count */}
            <div style={{ marginTop: '12px', fontSize: '10px', color: '#666' }}>
              {palette.filter(e => e.original !== e.current).length} colors modified
            </div>
          </div>

          {/* Right panel — preview */}
          <div style={{ flex: 1, overflow: 'auto', padding: '16px', background: '#08080f' }}>
            {/* Tower names legend */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
              {faction.towerNames.map((name, i) => (
                <span key={i} style={{ fontSize: '10px', color: '#888', background: '#1a1a28', padding: '2px 8px', borderRadius: '4px' }}>
                  Col {i}: {name}
                </span>
              ))}
            </div>

            {loading && (
              <div style={{ textAlign: 'center', padding: '60px', color: '#666' }}>
                Rendering sprites...
              </div>
            )}

            <canvas
              ref={previewRef}
              style={{ maxWidth: '100%', imageRendering: 'pixelated', borderRadius: '8px' }}
            />

            {/* Side by side comparison */}
            {skinnedCanvas && originalCanvas && (
              <div style={{ marginTop: '24px' }}>
                <h3 style={{ color: '#888', fontSize: '12px', marginBottom: '8px' }}>Comparison (first row)</h3>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <div>
                    <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px' }}>Original</div>
                    <ComparisonRow canvas={originalCanvas} cols={faction.towerCols} cell={faction.towerCell} />
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: '#ffaa44', marginBottom: '4px' }}>Modified</div>
                    <ComparisonRow canvas={skinnedCanvas} cols={faction.towerCols} cell={faction.towerCell} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helper components ──────────────────────────────────

function ComparisonRow({ canvas, cols, cell }: { canvas: HTMLCanvasElement; cols: number; cell: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const scale = 3;
    c.width = cols * cell * scale;
    c.height = cell * scale;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.save();
    ctx.scale(scale, scale);
    // Draw first row (idle, level 1)
    ctx.drawImage(canvas, 0, 0, cols * cell, cell, 0, 0, cols * cell, cell);
    ctx.restore();
  }, [canvas, cols, cell]);

  return <canvas ref={ref} style={{ imageRendering: 'pixelated', borderRadius: '4px', border: '1px solid #2a2a44' }} />;
}

// ─── Utilities ──────────────────────────────────────────

function cloneCanvas(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = src.width;
  c.height = src.height;
  c.getContext('2d')!.drawImage(src, 0, 0);
  return c;
}

function extractCanvasPalette(canvas: HTMLCanvasElement): string[] {
  const ctx = canvas.getContext('2d')!;
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const colors = new Set<string>();
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a === 0) continue; // skip transparent
    const hex = '#' + [data[i], data[i + 1], data[i + 2]].map(v => v.toString(16).padStart(2, '0')).join('');
    colors.add(hex);
  }
  // Sort dark to light
  return Array.from(colors).sort((a, b) => {
    const lum = (h: string) => {
      const r = parseInt(h.slice(1, 3), 16), g = parseInt(h.slice(3, 5), 16), bl = parseInt(h.slice(5, 7), 16);
      return 0.299 * r + 0.587 * g + 0.114 * bl;
    };
    return lum(a) - lum(b);
  });
}

const btnStyle = {
  fontFamily: 'Courier New, monospace',
  fontSize: '12px',
  padding: '6px 14px',
  borderRadius: '4px',
  border: '1px solid #2a2a44',
  background: '#1a1a28',
  color: '#ccc',
  cursor: 'pointer',
} as const;
