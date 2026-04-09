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
  'creeps-arcane': () => import('../arcane_creep_sprites'),
  'creeps-military': () => import('../military_creep_sprites'),
};

/** Maps faction → directory name and expected canvas names */
const FACTION_FILE_MAP: Record<string, { dir: string; canvases: string[] }> = {
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

  // Scan for spritesheets in the page
  const scanSheets = useCallback(() => {
    const allCanvases = document.querySelectorAll('canvas');
    // Find actual-size canvases (not preview, not our animation canvas)
    const sheets: HTMLCanvasElement[] = [];
    allCanvases.forEach(c => {
      if (c === canvasRef.current) return;
      if (c.width > 0 && c.height > 0 && c.width <= 2048) {
        sheets.push(c);
      }
    });
    if (sheets.length > 0) {
      const sheet = sheets[0]; // pick the first actual-size one
      setSourceCanvas(sheet);
      // Auto-detect frame size for creep sheets (32×32)
      const fw = sheet.width >= 512 ? 32 : 64;
      const fh = sheet.height >= 224 ? 32 : 64;
      setFrameW(fw);
      setFrameH(fh);
      setCols(Math.floor(sheet.width / fw));
      setRows(Math.floor(sheet.height / fh));
      setEndRow(Math.min(3, Math.floor(sheet.height / fh) - 1));
    }
  }, []);

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

    // Draw the current frame from spritesheet
    const srcX = selectedCol * frameW;
    const srcY = (startRow + currentFrame) * frameH;
    ctx.drawImage(sourceCanvas, srcX, srcY, frameW, frameH, 0, 0, sw, sh);
  }, [sourceCanvas, selectedCol, startRow, currentFrame, frameW, frameH, scale]);

  const frameCount = Math.max(1, endRow - startRow + 1);

  return (
    <div style={{ background: '#1a1a22', border: '1px solid #333', borderRadius: 6, padding: 16, marginTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ color: '#ffaa44', margin: 0, fontSize: 14 }}>Animation Preview</h3>
        <button onClick={scanSheets} style={btnStyle}>Scan Sheets</button>
      </div>

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
            <div style={{ marginTop: 8, fontSize: 11, color: '#888' }}>
              Col {selectedCol} | Row {startRow + currentFrame} | Frame {currentFrame + 1}/{frameCount}
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
              Column (creature): <input type="range" min={0} max={Math.max(0, cols - 1)} value={selectedCol}
                onChange={e => { setSelectedCol(parseInt(e.target.value)); setCurrentFrame(0); }} />
              <span style={{ color: '#fff', marginLeft: 4 }}>{selectedCol}</span>
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

            {/* Quick presets */}
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
              <button onClick={() => { setStartRow(0); setEndRow(3); setCurrentFrame(0); }} style={presetStyle}>Walk (0-3)</button>
              <button onClick={() => { setStartRow(4); setEndRow(6); setCurrentFrame(0); }} style={presetStyle}>Death (4-6)</button>
              <button onClick={() => { setStartRow(0); setEndRow(Math.max(0, rows - 1)); setCurrentFrame(0); }} style={presetStyle}>All Rows</button>
            </div>
          </div>

          {/* All columns preview strip */}
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>All columns (click to select):</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              {Array.from({ length: cols }, (_, i) => (
                <canvas
                  key={i}
                  width={frameW * 2}
                  height={frameH * 2}
                  style={{
                    imageRendering: 'pixelated',
                    border: i === selectedCol ? '2px solid #ffaa44' : '1px solid #333',
                    cursor: 'pointer',
                    background: '#0a0a0f',
                  }}
                  onClick={() => { setSelectedCol(i); setCurrentFrame(0); }}
                  ref={el => {
                    if (!el || !sourceCanvas) return;
                    const ctx = el.getContext('2d')!;
                    ctx.imageSmoothingEnabled = false;
                    ctx.clearRect(0, 0, frameW * 2, frameH * 2);
                    ctx.drawImage(sourceCanvas, i * frameW, 0, frameW, frameH, 0, 0, frameW * 2, frameH * 2);
                  }}
                />
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
      const canvases = allMobileCanvases.filter((_, i) => i % 2 === 1);
      if (canvases.length === 0) canvases.push(...allMobileCanvases);
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
