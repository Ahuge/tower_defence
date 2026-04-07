/**
 * Sprite Preview — mount this temporarily to view/download all faction spritesheets.
 * Run: npm run dev, then navigate to /?sprites=true
 */
import { useState } from 'react';

// Import all sprite generators
const modules: Record<string, () => Promise<{ default: React.ComponentType }>> = {
  void: () => import('../void_sprits'),
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

export default function SpritePreview() {
  const [selected, setSelected] = useState<string>('void');
  const [Component, setComponent] = useState<React.ComponentType | null>(null);
  const [loading, setLoading] = useState(false);

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

  return (
    <div style={{ background: '#111', color: '#fff', fontFamily: 'monospace', minHeight: '100vh', padding: 20 }}>
      <h1>Sprite Sheet Renderer</h1>
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
      {loading && <p>Loading...</p>}
      {Component && <Component />}
    </div>
  );
}
