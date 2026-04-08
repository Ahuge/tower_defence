/**
 * Sprite Preview — view and download all faction spritesheets.
 * Run: npm run dev, then open /tower_defence/sprites.html
 */
import { useState, useRef, useCallback } from 'react';
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
  // canvas index in mobile_units component → dir/filename
  'rifleman': 'military/rifleman_mobile',
  'brawler': 'military/brawler_mobile',
  'heavy': 'military/heavy_mobile',
  'commander': 'military/commander_mobile',
  'swarmling': 'aliens/swarmling_mobile',
  'fiend': 'infernal/fiend_mobile',
};

export default function SpritePreview() {
  const [selected, setSelected] = useState<string>('void');
  const [Component, setComponent] = useState<React.ComponentType | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState('');
  const renderRef = useRef<HTMLDivElement>(null);

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
        // Load the module
        const mod = await modules[faction]();
        const Comp = mod.default;

        // Render to a hidden container
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        document.body.appendChild(container);

        // Use ReactDOM to render
        const { createRoot } = await import('react-dom/client');
        const root = createRoot(container);
        root.render(<Comp />);

        // Wait for canvases to render
        await new Promise(r => setTimeout(r, 500));

        // Grab actual-size canvases (skip preview canvases which are larger/scaled)
        // Each generator renders pairs: [preview, actual, preview, actual, ...]
        // Actual canvases have style imageRendering='pixelated' or are the smaller of each pair
        const allCanvases = Array.from(container.querySelectorAll('canvas'));
        // Pick every other canvas starting from index 1 (actual), or filter by smallest dimension
        const canvases = allCanvases.filter((c, i) => i % 2 === 1);
        // Fallback: if odd count, use size-based filter
        if (canvases.length === 0) canvases.push(...allCanvases);
        for (let ci = 0; ci < canvases.length && ci < mapping.canvases.length; ci++) {
          const canvas = canvases[ci];
          const blob = await new Promise<Blob | null>(resolve =>
            canvas.toBlob(resolve, 'image/png')
          );
          if (blob) {
            const path = `${mapping.dir}/${mapping.canvases[ci]}.png`;
            zip.file(path, blob);
          }
        }

        root.unmount();
        document.body.removeChild(container);
      } catch (e) {
        console.error(`Failed to render ${faction}:`, e);
        setDownloadStatus(`Error on ${faction}: ${e}`);
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
      const canvases = allMobileCanvases.filter((c, i) => i % 2 === 1);
      if (canvases.length === 0) canvases.push(...allMobileCanvases);
      const mobileNames = Object.keys(MOBILE_FILES);
      for (let ci = 0; ci < canvases.length && ci < mobileNames.length; ci++) {
        const blob = await new Promise<Blob | null>(resolve =>
          canvases[ci].toBlob(resolve, 'image/png')
        );
        if (blob) {
          zip.file(`${MOBILE_FILES[mobileNames[ci]]}.png`, blob);
        }
      }

      root.unmount();
      document.body.removeChild(container);
    } catch (e) {
      console.error('Failed mobile units:', e);
    }

    // Generate and download zip
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
      <div ref={renderRef}>
        {loading && <p>Loading...</p>}
        {Component && <Component />}
      </div>
    </div>
  );
}
