/**
 * Sprite Preview — view, animate, and download all faction spritesheets.
 * Run: npm run dev, then open /tower_defence/sprites.html
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import JSZip from 'jszip';

// Import all sprite generators
const modules: Record<string, () => Promise<{ default: React.ComponentType }>> = {
  void: () => import('../void_sprites'),
  arcane: () => import('../arcane_sprites'),
  mechanical: () => import('../mechanical_sprites'),
  nature: () => import('../nature_sprites'),
  military: () => import('../military_sprites'),
  aliens: () => import('../aliens_sprites'),
  cypherpunk: () => import('../cypherpunk_sprites'),
  infernal: () => import('../infernal_sprites'),
  celestial: () => import('../celestial_sprites'),
  psionic: () => import('../psionic_sprites'),
  harmonic: () => import('../harmonic_sprites'),
  mobile_units: () => import('../mobile_unit_sprites'),
  terrain: () => import('../terrain_sprites'),
  'terrain-cypherpunk': () => import('../cypherpunk_terrain_sprites'),
  'terrain-infernal': () => import('../infernal_terrain_sprites'),
  'creeps-arcane': () => import('../arcane_creep_sprites'),
  'creeps-mechanical': () => import('../mechanical_creep_sprites'),
  'creeps-nature': () => import('../nature_creep_sprites'),
  'creeps-void': () => import('../void_creep_sprites'),
  'creeps-military': () => import('../military_creep_sprites'),
  'creeps-aliens': () => import('../aliens_creep_sprites'),
  'creeps-cypherpunk': () => import('../cypherpunk_creep_sprites'),
  'creeps-infernal': () => import('../infernal_creep_sprites'),
  'creeps-celestial': () => import('../celestial_creep_sprites'),
  'creeps-psionic': () => import('../psionic_creep_sprites'),
  'creeps-harmonic': () => import('../harmonic_creep_sprites'),
};

/** Maps module → directory name and expected canvas names (for ZIP download) */
const FACTION_FILE_MAP: Record<string, { dir: string; canvases: string[] }> = {
  // Tower/projectile/hero sheets
  void:       { dir: 'void',       canvases: ['void_towers', 'void_projectiles', 'void_hero'] },
  arcane:     { dir: 'arcane',     canvases: ['arcane_towers', 'arcane_projectiles', 'arcane_hero'] },
  mechanical: { dir: 'mechanical', canvases: ['mechanical_towers', 'mechanical_projectiles', 'mechanical_hero'] },
  nature:     { dir: 'nature',     canvases: ['nature_towers', 'nature_projectiles', 'nature_hero'] },
  military:   { dir: 'military',   canvases: ['military_towers', 'military_projectiles', 'military_hero'] },
  aliens:     { dir: 'aliens',     canvases: ['aliens_towers', 'aliens_projectiles', 'aliens_hero'] },
  cypherpunk: { dir: 'cypherpunk', canvases: ['cypherpunk_towers', 'cypherpunk_projectiles', 'cypherpunk_hero'] },
  infernal:   { dir: 'infernal',   canvases: ['infernal_towers', 'infernal_projectiles', 'infernal_hero'] },
  celestial:  { dir: 'celestial',  canvases: ['celestial_towers', 'celestial_projectiles', 'celestial_hero'] },
  psionic:    { dir: 'psionic',    canvases: ['psionic_towers', 'psionic_projectiles', 'psionic_hero'] },
  harmonic:   { dir: 'harmonic',   canvases: ['harmonic_towers', 'harmonic_projectiles', 'harmonic_hero'] },
  // Creep sheets (1 actual canvas each)
  'creeps-arcane':      { dir: 'creeps', canvases: ['arcane_creeps'] },
  'creeps-mechanical':  { dir: 'creeps', canvases: ['mechanical_creeps'] },
  'creeps-nature':      { dir: 'creeps', canvases: ['nature_creeps'] },
  'creeps-void':        { dir: 'creeps', canvases: ['void_creeps'] },
  'creeps-military':    { dir: 'creeps', canvases: ['military_creeps'] },
  'creeps-aliens':      { dir: 'creeps', canvases: ['aliens_creeps'] },
  'creeps-cypherpunk':  { dir: 'creeps', canvases: ['cypherpunk_creeps'] },
  'creeps-infernal':    { dir: 'creeps', canvases: ['infernal_creeps'] },
  'creeps-celestial':   { dir: 'creeps', canvases: ['celestial_creeps'] },
  'creeps-psionic':     { dir: 'creeps', canvases: ['psionic_creeps'] },
  'creeps-harmonic':    { dir: 'creeps', canvases: ['harmonic_creeps'] },
  // Terrain sheets
  terrain:              { dir: 'terrain', canvases: ['terrain_tileset', 'terrain_doodads'] },
  'terrain-cypherpunk': { dir: 'terrain', canvases: ['cypherpunk_terrain_tileset', 'cypherpunk_terrain_doodads'] },
  'terrain-infernal':   { dir: 'terrain', canvases: ['infernal_terrain_tileset', 'infernal_terrain_doodads'] },
};

/** Mobile unit file mapping */
const MOBILE_FILES: Record<string, string> = {
  'rifleman': 'military/rifleman_mobile',
  'brawler': 'military/brawler_mobile',
  'heavy': 'military/heavy_mobile',
  'commander': 'military/commander_mobile',
  'swarmling': 'aliens/swarmling_mobile',
  'fiend': 'infernal/fiend_mobile',
};

// ===================== Animation Preview Component =====================

function AnimationPreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [sourceCanvas, setSourceCanvas] = useState<HTMLCanvasElement | null>(null);
  const [detectedSheets, setDetectedSheets] = useState<{ canvas: HTMLCanvasElement; label: string }[]>([]);
  const [colNames, setColNames] = useState<string[]>([]);
  const [rowNames, setRowNames] = useState<string[]>([]);
  const [frameW, setFrameW] = useState(32);
  const [frameH, setFrameH] = useState(32);
  const [cols, setCols] = useState(1);
  const [rows, setRows] = useState(1);
  const [selectedCol, setSelectedCol] = useState(0);
  const [startRow, setStartRow] = useState(0);
  const [endRow, setEndRow] = useState(3);
  const [fps, setFps] = useState(4);
  const [scale, setScale] = useState(4);
  const [playing, setPlaying] = useState(true);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [loop, setLoop] = useState(true);

  const [presets, setPresets] = useState<{ name: string; startRow: number; endRow: number }[]>([]);
  const [flipped, setFlipped] = useState(false);

  const pickSheet = useCallback((sheet: HTMLCanvasElement) => {
    setSourceCanvas(sheet);
    // Read metadata from data attributes
    try { setColNames(JSON.parse(sheet.getAttribute('data-columns') ?? '[]')); } catch { setColNames([]); }
    try { setRowNames(JSON.parse(sheet.getAttribute('data-rows') ?? '[]')); } catch { setRowNames([]); }
    try { setPresets(JSON.parse(sheet.getAttribute('data-presets') ?? '[]')); } catch { setPresets([]); }
    setFlipped(sheet.getAttribute('data-direction') === 'left');

    // Frame size: prefer explicit, then auto-detect
    const w = sheet.width, h = sheet.height;
    const explicit = sheet.getAttribute('data-frame-size');
    let fw: number, fh: number;
    if (explicit) {
      const parts = explicit.split('x').map(Number);
      fw = parts[0] || 32; fh = parts[1] || fw;
    } else {
      fw = 32; fh = 32;
      for (const trySize of [64, 32, 128, 28]) {
        if (w % trySize === 0 && h % trySize === 0) {
          fw = trySize; fh = trySize; break;
        }
      }
    }
    setFrameW(fw); setFrameH(fh);
    const c = Math.floor(w / fw), r = Math.floor(h / fh);
    setCols(c); setRows(r);
    setSelectedCol(0); setStartRow(0);
    // Use first preset if available
    const parsed = (() => { try { return JSON.parse(sheet.getAttribute('data-presets') ?? '[]'); } catch { return []; } })();
    if (parsed.length > 0) {
      setStartRow(parsed[0].startRow); setEndRow(parsed[0].endRow);
    } else {
      setEndRow(Math.min(3, r - 1));
    }
    setCurrentFrame(0);
  }, []);

  // Scan for spritesheets in the page
  const scanSheets = useCallback(() => {
    const allCanvases = document.querySelectorAll('canvas');
    const sheets: { canvas: HTMLCanvasElement; label: string }[] = [];
    allCanvases.forEach(c => {
      if (c === canvasRef.current) return;
      if (c.width > 0 && c.height > 0) {
        // Get label: prefer data-label attribute, then nearby heading, then dimensions
        let label = c.getAttribute('data-label') ?? '';
        if (!label) {
          let el: Element | null = c;
          while (el && !label) {
            const prev = el.previousElementSibling;
            if (prev && /^H[1-6]$/.test(prev.tagName)) {
              label = prev.textContent?.trim() ?? '';
              break;
            }
            el = el.parentElement;
          }
        }
        if (!label) label = `${c.width}×${c.height}`;
        else label += ` (${c.width}×${c.height})`;
        sheets.push({ canvas: c, label });
      }
    });
    setDetectedSheets(sheets);
    // Auto-pick: prefer the smallest canvas (actual size, not preview)
    if (sheets.length > 0) {
      const sorted = [...sheets].sort((a, b) => (a.canvas.width * a.canvas.height) - (b.canvas.width * b.canvas.height));
      pickSheet(sorted[0].canvas);
    }
  }, [pickSheet]);

  // Animation loop
  useEffect(() => {
    if (!playing || !sourceCanvas) return;
    const totalFrames = endRow - startRow + 1;
    if (totalFrames <= 0) return;

    const interval = setInterval(() => {
      setCurrentFrame(prev => {
        const next = prev + 1;
        if (next >= totalFrames) return loop ? 0 : totalFrames - 1;
        return next;
      });
    }, 1000 / fps);

    return () => clearInterval(interval);
  }, [playing, fps, startRow, endRow, sourceCanvas, loop]);

  // Render current frame
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !sourceCanvas) return;
    const ctx = canvas.getContext('2d')!;
    const sw = frameW * scale;
    const sh = frameH * scale;
    canvas.width = sw;
    canvas.height = sh;
    ctx.imageSmoothingEnabled = false;

    ctx.clearRect(0, 0, sw, sh);

    // Background
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, sw, sh);

    // Draw the current frame from spritesheet (flip if direction is left)
    const srcX = selectedCol * frameW;
    const srcY = (startRow + currentFrame) * frameH;
    if (flipped) {
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(sourceCanvas, srcX, srcY, frameW, frameH, -sw, 0, sw, sh);
      ctx.restore();
    } else {
      ctx.drawImage(sourceCanvas, srcX, srcY, frameW, frameH, 0, 0, sw, sh);
    }
  }, [sourceCanvas, selectedCol, startRow, currentFrame, frameW, frameH, scale]);

  const frameCount = Math.max(1, endRow - startRow + 1);

  return (
    <div style={{ background: '#1a1a22', border: '1px solid #333', borderRadius: 6, padding: 16, marginTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ color: '#ffaa44', margin: 0, fontSize: 14 }}>Animation Preview</h3>
        <button onClick={scanSheets} style={btnStyle}>Scan Sheets</button>
      </div>

      {/* Sheet picker */}
      {detectedSheets.length > 1 && (
        <div style={{ marginBottom: 8, display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ color: '#888', fontSize: 11 }}>Sheets found:</span>
          {detectedSheets.map((s, i) => (
            <button key={i} onClick={() => pickSheet(s.canvas)}
              style={{ ...btnStyle, border: s.canvas === sourceCanvas ? '1px solid #ffaa44' : '1px solid #555' }}>
              {s.label}
            </button>
          ))}
        </div>
      )}

      {!sourceCanvas ? (
        <p style={{ color: '#666', fontSize: 12 }}>Click "Scan Sheets" after loading a sprite tab above</p>
      ) : (
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {/* Preview canvas */}
          <div style={{ textAlign: 'center' }}>
            <canvas
              ref={canvasRef}
              style={{ border: '1px solid #444', imageRendering: 'pixelated', background: '#0a0a0f' }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#ffaa44', fontWeight: 'bold' }}>
              {colNames[selectedCol] ?? `Column ${selectedCol}`}
            </div>
            <div style={{ fontSize: 11, color: '#888' }}>
              {rowNames[startRow + currentFrame] ?? `Row ${startRow + currentFrame}`} | Frame {currentFrame + 1}/{frameCount}
            </div>
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button onClick={() => setPlaying(!playing)} style={btnStyle}>
                {playing ? '⏸ Pause' : '▶ Play'}
              </button>
              <button onClick={() => setLoop(!loop)} style={{ ...btnStyle, color: loop ? '#44ff44' : '#888' }}>
                Loop: {loop ? 'On' : 'Off'}
              </button>
              <button onClick={() => { setCurrentFrame(0); }} style={btnStyle}>⏮ Reset</button>
            </div>

            <label style={{ color: '#aaa' }}>
              {colNames.length > 0 ? 'Creature' : 'Column'}:
              <input type="range" min={0} max={Math.max(0, cols - 1)} value={selectedCol}
                onChange={e => { setSelectedCol(parseInt(e.target.value)); setCurrentFrame(0); }} />
              <span style={{ color: '#fff', marginLeft: 4 }}>{colNames[selectedCol] ?? selectedCol}</span>
            </label>

            <label style={{ color: '#aaa' }}>
              Start Row: <input type="range" min={0} max={Math.max(0, rows - 1)} value={startRow}
                onChange={e => { setStartRow(parseInt(e.target.value)); setCurrentFrame(0); }} />
              <span style={{ color: '#fff', marginLeft: 4 }}>{startRow}</span>
            </label>

            <label style={{ color: '#aaa' }}>
              End Row: <input type="range" min={startRow} max={Math.max(startRow, rows - 1)} value={endRow}
                onChange={e => { setEndRow(parseInt(e.target.value)); setCurrentFrame(0); }} />
              <span style={{ color: '#fff', marginLeft: 4 }}>{endRow}</span>
            </label>

            <label style={{ color: '#aaa' }}>
              FPS: <input type="range" min={1} max={12} value={fps}
                onChange={e => setFps(parseInt(e.target.value))} />
              <span style={{ color: '#fff', marginLeft: 4 }}>{fps}</span>
            </label>

            <label style={{ color: '#aaa' }}>
              Scale: <input type="range" min={2} max={8} value={scale}
                onChange={e => setScale(parseInt(e.target.value))} />
              <span style={{ color: '#fff', marginLeft: 4 }}>{scale}x</span>
            </label>

            <label style={{ color: '#aaa' }}>
              Frame Size:
              <select value={frameW} onChange={e => {
                const v = parseInt(e.target.value);
                setFrameW(v); setFrameH(v);
                setCols(Math.floor(sourceCanvas!.width / v));
                setRows(Math.floor(sourceCanvas!.height / v));
                setSelectedCol(0); setStartRow(0);
                setEndRow(Math.min(3, Math.floor(sourceCanvas!.height / v) - 1));
                setCurrentFrame(0);
              }} style={{ marginLeft: 4, background: '#222', color: '#fff', border: '1px solid #444', padding: 2 }}>
                <option value={28}>28×28</option>
                <option value={32}>32×32</option>
                <option value={64}>64×64</option>
                <option value={128}>128×128</option>
              </select>
            </label>

            <div style={{ color: '#666', fontSize: 11, marginTop: 4 }}>
              Sheet: {sourceCanvas.width}×{sourceCanvas.height} | Grid: {cols}×{rows}
            </div>

            {/* Animation presets (from generator or fallback) */}
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
              {presets.length > 0 ? presets.map((p, i) => (
                <button key={i} onClick={() => { setStartRow(p.startRow); setEndRow(p.endRow); setCurrentFrame(0); }} style={presetStyle}>
                  {p.name} ({p.startRow}-{p.endRow})
                </button>
              )) : (
                <>
                  <button onClick={() => { setStartRow(0); setEndRow(Math.min(3, rows - 1)); setCurrentFrame(0); }} style={presetStyle}>First 4</button>
                  <button onClick={() => { setStartRow(4); setEndRow(Math.min(6, rows - 1)); setCurrentFrame(0); }} style={presetStyle}>Rows 4-6</button>
                </>
              )}
              <button onClick={() => { setStartRow(0); setEndRow(Math.max(0, rows - 1)); setCurrentFrame(0); }} style={presetStyle}>All</button>
              <button onClick={() => setFlipped(!flipped)} style={{ ...presetStyle, color: flipped ? '#ffaa44' : '#888' }}>
                Flip: {flipped ? 'Yes' : 'No'}
              </button>
            </div>
          </div>

          {/* All columns preview strip */}
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>All columns (click to select):</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {Array.from({ length: cols }, (_, i) => (
                <div key={i} style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => { setSelectedCol(i); setCurrentFrame(0); }}>
                  <canvas
                    width={frameW * 2}
                    height={frameH * 2}
                    style={{
                      imageRendering: 'pixelated',
                      border: i === selectedCol ? '2px solid #ffaa44' : '1px solid #333',
                      background: '#0a0a0f',
                      display: 'block',
                    }}
                    ref={el => {
                      if (!el || !sourceCanvas) return;
                      const ctx = el.getContext('2d')!;
                      ctx.imageSmoothingEnabled = false;
                      ctx.clearRect(0, 0, frameW * 2, frameH * 2);
                      ctx.drawImage(sourceCanvas, i * frameW, 0, frameW, frameH, 0, 0, frameW * 2, frameH * 2);
                    }}
                  />
                  <div style={{ fontSize: 9, color: i === selectedCol ? '#ffaa44' : '#666', marginTop: 2, maxWidth: frameW * 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {colNames[i] ?? i}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: '4px 10px', background: '#333', color: '#ccc', border: '1px solid #555',
  borderRadius: 3, cursor: 'pointer', fontFamily: 'monospace', fontSize: 11,
};
const presetStyle: React.CSSProperties = {
  ...btnStyle, fontSize: 10, padding: '2px 8px',
};

// ===================== Main Component =====================

export default function SpritePreview() {
  const [selected, setSelected] = useState<string>('void');
  const [Component, setComponent] = useState<React.ComponentType | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState('');

  const load = async (name: string) => {
    setSelected(name);
    setLoading(true);
    try {
      const mod = await modules[name]();
      setComponent(() => mod.default);
    } catch (e) {
      console.error('Failed to load', name, e);
      setComponent(null);
    }
    setLoading(false);
  };

  const downloadAll = useCallback(async () => {
    setDownloadStatus('Starting...');
    const zip = new JSZip();
    const factionNames = Object.keys(FACTION_FILE_MAP);

    for (let fi = 0; fi < factionNames.length; fi++) {
      const faction = factionNames[fi];
      const mapping = FACTION_FILE_MAP[faction];
      setDownloadStatus(`Rendering ${faction} (${fi + 1}/${factionNames.length})...`);

      try {
        const mod = await modules[faction]();
        const Comp = mod.default;
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        document.body.appendChild(container);
        const { createRoot } = await import('react-dom/client');
        const root = createRoot(container);
        root.render(<Comp />);
        await new Promise(r => setTimeout(r, 500));

        const allCanvases = Array.from(container.querySelectorAll('canvas'));
        const canvases = allCanvases.filter((_, i) => i % 2 === 1);
        if (canvases.length === 0) canvases.push(...allCanvases);
        for (let ci = 0; ci < canvases.length && ci < mapping.canvases.length; ci++) {
          const blob = await new Promise<Blob | null>(resolve =>
            canvases[ci].toBlob(resolve, 'image/png')
          );
          if (blob) zip.file(`${mapping.dir}/${mapping.canvases[ci]}.png`, blob);
        }
        root.unmount();
        document.body.removeChild(container);
      } catch (e) {
        console.error(`Failed to render ${faction}:`, e);
      }
    }

    // Mobile units
    setDownloadStatus('Rendering mobile units...');
    try {
      const mod = await modules.mobile_units();
      const Comp = mod.default;
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      document.body.appendChild(container);
      const { createRoot } = await import('react-dom/client');
      const root = createRoot(container);
      root.render(<Comp />);
      await new Promise(r => setTimeout(r, 500));
      const allMobileCanvases = Array.from(container.querySelectorAll('canvas'));
      // Mobile units have 1 canvas per unit (no preview/actual pairs)
      const canvases = allMobileCanvases;
      const mobileNames = Object.keys(MOBILE_FILES);
      for (let ci = 0; ci < canvases.length && ci < mobileNames.length; ci++) {
        const blob = await new Promise<Blob | null>(resolve =>
          canvases[ci].toBlob(resolve, 'image/png')
        );
        if (blob) zip.file(`${MOBILE_FILES[mobileNames[ci]]}.png`, blob);
      }
      root.unmount();
      document.body.removeChild(container);
    } catch (e) {
      console.error('Failed mobile units:', e);
    }

    setDownloadStatus('Creating zip...');
    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tower_defence_sprites.zip';
    a.click();
    URL.revokeObjectURL(url);
    setDownloadStatus('Done! Check your downloads.');
  }, []);

  return (
    <div style={{ background: '#111', color: '#fff', fontFamily: 'monospace', minHeight: '100vh', padding: 20 }}>
      <h1>Sprite Sheet Renderer</h1>

      <div style={{ marginBottom: 16, padding: 12, background: '#222', border: '1px solid #444' }}>
        <button
          onClick={downloadAll}
          disabled={!!downloadStatus && downloadStatus !== 'Done! Check your downloads.'}
          style={{
            padding: '12px 24px', fontSize: 16, cursor: 'pointer',
            background: '#448844', color: '#fff', border: '2px solid #66aa66',
            fontFamily: 'monospace', fontWeight: 'bold',
          }}
        >
          Download All Sprites (ZIP)
        </button>
        {downloadStatus && (
          <span style={{ marginLeft: 16, color: '#aaa' }}>{downloadStatus}</span>
        )}
        <p style={{ color: '#666', fontSize: 12, marginTop: 8 }}>
          Downloads a zip with correct directory structure: assets/faction/faction_towers.png etc.
          <br/>Unzip into <code>public/assets/</code> to replace all sprite PNGs.
        </p>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        {Object.keys(modules).map(name => (
          <button
            key={name}
            onClick={() => load(name)}
            style={{
              padding: '8px 16px',
              background: selected === name ? '#555' : '#333',
              color: '#fff',
              border: selected === name ? '2px solid #ff8' : '1px solid #666',
              cursor: 'pointer',
              fontFamily: 'monospace',
            }}
          >
            {name}
          </button>
        ))}
      </div>

      {/* Animation preview — always visible */}
      <AnimationPreview />

      <div style={{ marginTop: 16 }}>
        {loading && <p>Loading...</p>}
        {Component && <Component />}
      </div>
    </div>
  );
}
