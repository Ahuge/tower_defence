/**
 * Circle Co-Op Map Editor — authoring tool for circumnavigation maps.
 *
 * Lives at /circle-editor.html (separate entry from the gauntlet
 * editor so neither has to grow a mode toggle). Produces JSON that
 * drops into src/data/maps/circle/ and is consumed by CircleMaps.ts.
 *
 * What the editor gives you:
 *   • Terrain brushes: Empty / Blocked / Animated / NoBuild / Clear.
 *   • Zone painter: per-player-index buildable regions. Cells can
 *     carry one zone assignment — painting with a different zone
 *     reassigns. Painting "No Zone" clears it.
 *   • Spawners: each has entry, ordered waypoints, exit. "Set Entry",
 *     "Set Exit", and "Append Waypoint" modes turn the next grid
 *     click into the chosen action. Waypoint list supports reorder
 *     (↑/↓) and remove.
 *   • Load/Save: `Load JSON` picks a file, `Download JSON` emits a
 *     ready-to-commit file. Schema matches the three existing
 *     circle_2p/3p/4p files exactly.
 */
import React, { useState, useCallback, useMemo, useRef } from 'react';
import circle2p from './src/data/maps/circle/circle_2p.json';
import circle3p from './src/data/maps/circle/circle_3p.json';
import circle4p from './src/data/maps/circle/circle_4p.json';
import circle4pHellCircle from './src/data/maps/circle/circle_4p_hell_circle.json';

// Built-in maps that ship with the game. Importing the JSON
// directly means the editor always sees the same source of truth
// the game loads at runtime — no staleness.
const BUILTIN_MAPS: { id: string; label: string; json: any }[] = [
  { id: 'circle_2p', label: 'Circle 2P — Classic', json: circle2p },
  { id: 'circle_3p', label: 'Circle 3P', json: circle3p },
  { id: 'circle_4p', label: 'Circle 4P — Quadrants', json: circle4p },
  { id: 'circle_4p_hell_circle', label: 'Circle 4P — Hell Circle', json: circle4pHellCircle },
];

const COLS = 36;
const ROWS = 26;
const CELL = 24;

type Terrain = 'empty' | 'blocked' | 'animated' | 'noBuild';
type Tuple = [number, number];

interface Spawner {
  entry: Tuple | null;
  waypoints: Tuple[];
  exit: Tuple | null;
}

interface MapModel {
  id: string;
  name: string;
  description: string;
  playerCount: number;
  theme: string;
  cells: Terrain[][];         // [row][col]
  zones: (number | null)[][]; // [row][col] = playerIdx or null
  zoneColors: string[];       // length === playerCount
  spawners: Spawner[];
}

type Brush =
  | { kind: 'terrain'; value: Terrain }
  | { kind: 'zone'; playerIdx: number | null } // null = clear zone
  | { kind: 'entry'; spawnerIdx: number }
  | { kind: 'exit'; spawnerIdx: number }
  | { kind: 'waypoint'; spawnerIdx: number };

// ─── default palette / themes ───────────────────────────────────────
const THEMES = [
  'forest', 'mountain', 'volcanic', 'generic',
  'circuit', 'hellscape', 'ancient_grove', 'arcane_crystal',
  'factory', 'void_rift', 'urban', 'hive', 'neural', 'concert', 'marble',
];

const DEFAULT_ZONE_COLORS = [
  '#ff4444', '#4488ff', '#44ff88', '#ffaa22',
];

const TERRAIN_COLOR: Record<Terrain, string> = {
  empty: '#2a2a3a',
  blocked: '#504030',
  animated: '#204070',
  noBuild: '#403040',
};

function makeGrid<T>(fill: T): T[][] {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(fill));
}

function emptyMap(playerCount: number): MapModel {
  return {
    id: `circle_${playerCount}p_new`,
    name: `Circle ${playerCount}P — Untitled`,
    description: `${playerCount}-player co-op map.`,
    playerCount,
    theme: 'forest',
    cells: makeGrid<Terrain>('empty'),
    zones: makeGrid<number | null>(null),
    zoneColors: DEFAULT_ZONE_COLORS.slice(0, playerCount),
    spawners: Array.from({ length: playerCount }, () => ({ entry: null, waypoints: [], exit: null })),
  };
}

// ─── JSON serialization ─────────────────────────────────────────────
function modelToJson(m: MapModel) {
  const blocked: Tuple[] = [];
  const animated: Tuple[] = [];
  const noBuild: Tuple[] = [];
  const zones: Tuple[][] = Array.from({ length: m.playerCount }, () => []);
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const t = m.cells[r][c];
      if (t === 'blocked') blocked.push([c, r]);
      else if (t === 'animated') animated.push([c, r]);
      else if (t === 'noBuild') noBuild.push([c, r]);
      const z = m.zones[r][c];
      if (z != null && z >= 0 && z < m.playerCount) zones[z].push([c, r]);
    }
  }
  return {
    id: m.id,
    name: m.name,
    description: m.description,
    playerCount: m.playerCount,
    theme: m.theme,
    blocked,
    animated,
    noBuild,
    zones,
    zoneColors: m.zoneColors,
    spawners: m.spawners.map(s => ({
      entry: s.entry ?? [0, 0],
      waypoints: s.waypoints,
      exit: s.exit ?? [0, 0],
    })),
  };
}

function jsonToModel(j: any): MapModel {
  const playerCount = j.playerCount || 2;
  const cells = makeGrid<Terrain>('empty');
  const zones = makeGrid<number | null>(null);
  const apply = (list: Tuple[] | undefined, t: Terrain) => {
    for (const [c, r] of list ?? []) {
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS) cells[r][c] = t;
    }
  };
  apply(j.blocked, 'blocked');
  apply(j.animated, 'animated');
  apply(j.noBuild, 'noBuild');
  (j.zones as Tuple[][] | undefined)?.forEach((list, playerIdx) => {
    for (const [c, r] of list) {
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS) zones[r][c] = playerIdx;
    }
  });
  const spawners: Spawner[] = (j.spawners || []).map((s: any) => ({
    entry: s.entry ? [s.entry[0], s.entry[1]] as Tuple : null,
    waypoints: (s.waypoints || []).map((w: any) => [w[0], w[1]] as Tuple),
    exit: s.exit ? [s.exit[0], s.exit[1]] as Tuple : null,
  }));
  while (spawners.length < playerCount) spawners.push({ entry: null, waypoints: [], exit: null });
  const colors = (j.zoneColors || DEFAULT_ZONE_COLORS).slice(0, playerCount);
  while (colors.length < playerCount) colors.push(DEFAULT_ZONE_COLORS[colors.length % DEFAULT_ZONE_COLORS.length]);
  return {
    id: j.id || 'circle_new',
    name: j.name || 'Untitled',
    description: j.description || '',
    playerCount,
    theme: j.theme || 'forest',
    cells, zones, zoneColors: colors, spawners,
  };
}

// ─── component ──────────────────────────────────────────────────────
export default function CircleMapEditor() {
  const [model, setModel] = useState<MapModel>(() => emptyMap(2));
  const [brush, setBrush] = useState<Brush>({ kind: 'terrain', value: 'blocked' });
  const [mouseDown, setMouseDown] = useState(false);
  const [downloadName, setDownloadName] = useState('');
  const [showZones, setShowZones] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const setField = useCallback(<K extends keyof MapModel>(k: K, v: MapModel[K]) => {
    setModel(m => ({ ...m, [k]: v }));
  }, []);

  const paintAt = useCallback((col: number, row: number) => {
    setModel(m => {
      const next: MapModel = { ...m, cells: m.cells.map(r => [...r]), zones: m.zones.map(r => [...r]), spawners: m.spawners.map(s => ({ ...s, waypoints: [...s.waypoints] })) };
      if (brush.kind === 'terrain') {
        next.cells[row][col] = brush.value;
      } else if (brush.kind === 'zone') {
        next.zones[row][col] = brush.playerIdx;
      } else if (brush.kind === 'entry') {
        next.spawners[brush.spawnerIdx].entry = [col, row];
      } else if (brush.kind === 'exit') {
        next.spawners[brush.spawnerIdx].exit = [col, row];
      } else if (brush.kind === 'waypoint') {
        next.spawners[brush.spawnerIdx].waypoints.push([col, row]);
      }
      return next;
    });
  }, [brush]);

  const onCellClick = useCallback((col: number, row: number) => {
    paintAt(col, row);
  }, [paintAt]);

  const handleMouseDown = useCallback((col: number, row: number, e: React.MouseEvent) => {
    e.preventDefault();
    setMouseDown(true);
    // Drag-painting only supported for terrain/zone brushes. Spawner
    // brushes place a single point per click — no drag.
    if (brush.kind === 'terrain' || brush.kind === 'zone') paintAt(col, row);
    else onCellClick(col, row);
  }, [brush, paintAt, onCellClick]);

  const handleMouseEnter = useCallback((col: number, row: number) => {
    if (!mouseDown) return;
    if (brush.kind === 'terrain' || brush.kind === 'zone') paintAt(col, row);
  }, [mouseDown, brush, paintAt]);

  // ─── spawner list mutators ───
  const addSpawner = () => setModel(m => ({ ...m, spawners: [...m.spawners, { entry: null, waypoints: [], exit: null }] }));
  const removeSpawner = (idx: number) => setModel(m => ({ ...m, spawners: m.spawners.filter((_, i) => i !== idx) }));
  const removeWaypoint = (sIdx: number, wIdx: number) => setModel(m => {
    const next = { ...m, spawners: m.spawners.map(s => ({ ...s, waypoints: [...s.waypoints] })) };
    next.spawners[sIdx].waypoints.splice(wIdx, 1);
    return next;
  });
  const moveWaypoint = (sIdx: number, wIdx: number, delta: number) => setModel(m => {
    const next = { ...m, spawners: m.spawners.map(s => ({ ...s, waypoints: [...s.waypoints] })) };
    const list = next.spawners[sIdx].waypoints;
    const target = wIdx + delta;
    if (target < 0 || target >= list.length) return m;
    [list[wIdx], list[target]] = [list[target], list[wIdx]];
    return next;
  });

  // ─── player-count resize ───
  const setPlayerCount = (pc: number) => setModel(m => {
    // Grow zones + spawners lazily; shrink drops the excess.
    const zoneColors = [...m.zoneColors];
    const spawners = [...m.spawners];
    while (zoneColors.length < pc) zoneColors.push(DEFAULT_ZONE_COLORS[zoneColors.length % DEFAULT_ZONE_COLORS.length]);
    zoneColors.length = pc;
    while (spawners.length < pc) spawners.push({ entry: null, waypoints: [], exit: null });
    spawners.length = pc;
    // Demote any zones that pointed at players we just dropped.
    const zones = m.zones.map(r => r.map(z => (z != null && z >= pc ? null : z)));
    return { ...m, playerCount: pc, zoneColors, spawners, zones };
  });

  // ─── load / save ───
  const onLoadFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    f.text().then(text => {
      try {
        const parsed = JSON.parse(text);
        setModel(jsonToModel(parsed));
        setDownloadName(f.name);
      } catch (err) {
        alert('Failed to parse JSON: ' + (err as Error).message);
      }
    });
    // Reset so re-picking the same file re-fires onChange.
    e.target.value = '';
  }, []);

  const download = useCallback(() => {
    const json = JSON.stringify(modelToJson(model), null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = downloadName || `${model.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [model, downloadName]);

  // ─── overlays derived from spawners for quick lookup during render ───
  const spawnerOverlay = useMemo(() => {
    const map = new Map<string, { kind: 'entry' | 'exit' | 'wp'; sIdx: number; wIdx?: number }[]>();
    model.spawners.forEach((s, sIdx) => {
      const push = (c: number, r: number, kind: 'entry' | 'exit' | 'wp', wIdx?: number) => {
        const k = `${c},${r}`;
        const arr = map.get(k) ?? [];
        arr.push({ kind, sIdx, wIdx });
        map.set(k, arr);
      };
      if (s.entry) push(s.entry[0], s.entry[1], 'entry');
      if (s.exit) push(s.exit[0], s.exit[1], 'exit');
      s.waypoints.forEach(([c, r], wIdx) => push(c, r, 'wp', wIdx));
    });
    return map;
  }, [model.spawners]);

  // ─── render ───
  return (
    <div onMouseUp={() => setMouseDown(false)} onMouseLeave={() => setMouseDown(false)} style={{ padding: 16, maxWidth: 1400, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, marginBottom: 12 }}>Circle Co-Op Map Editor</h1>

      {/* Header / metadata */}
      <section style={panelStyle}>
        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 120px 1fr', gap: 8, alignItems: 'center' }}>
          <label>ID</label>
          <input value={model.id} onChange={e => setField('id', e.currentTarget.value)} style={inputStyle} />
          <label>Name</label>
          <input value={model.name} onChange={e => setField('name', e.currentTarget.value)} style={inputStyle} />
          <label>Description</label>
          <input value={model.description} onChange={e => setField('description', e.currentTarget.value)} style={inputStyle} />
          <label>Theme</label>
          <select value={model.theme} onChange={e => setField('theme', e.currentTarget.value)} style={inputStyle}>
            {THEMES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <label>Player count</label>
          <div>
            {[2, 3, 4].map(n => (
              <button key={n} onClick={() => setPlayerCount(n)} style={{ ...btnStyle, background: model.playerCount === n ? '#3a5' : '#223' }}>{n}P</button>
            ))}
          </div>
          <label>Load built-in</label>
          <div>
            <select
              value=""
              onChange={e => {
                const id = e.currentTarget.value;
                const entry = BUILTIN_MAPS.find(m => m.id === id);
                if (entry) {
                  setModel(jsonToModel(entry.json));
                  setDownloadName(`${entry.id}.json`);
                }
                e.currentTarget.value = '';
              }}
              style={inputStyle}
            >
              <option value="">— pick a built-in map —</option>
              {BUILTIN_MAPS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </div>
          <label>File I/O</label>
          <div>
            <input ref={fileRef} type="file" accept="application/json" onChange={onLoadFile} style={{ display: 'none' }} />
            <button onClick={() => fileRef.current?.click()} style={btnStyle}>Load JSON</button>
            <button onClick={download} style={btnStyle}>Download JSON</button>
            <button onClick={() => setModel(emptyMap(model.playerCount))} style={btnStyle}>New Blank</button>
          </div>
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 360px) 1fr', gap: 16, marginTop: 12 }}>
        {/* Left column: brush palette + spawners */}
        <div>
          <section style={panelStyle}>
            <h3 style={sectionHead}>Terrain brushes</h3>
            {(['empty', 'blocked', 'animated', 'noBuild'] as Terrain[]).map(t => (
              <BrushBtn key={t} label={t === 'empty' ? 'Clear' : t} active={brush.kind === 'terrain' && brush.value === t} color={TERRAIN_COLOR[t]} onClick={() => setBrush({ kind: 'terrain', value: t })} />
            ))}
          </section>
          <section style={panelStyle}>
            <h3 style={sectionHead}>Zone brushes</h3>
            {model.zoneColors.map((col, i) => (
              <BrushBtn key={i} label={`Zone P${i + 1}`} active={brush.kind === 'zone' && brush.playerIdx === i} color={col} onClick={() => setBrush({ kind: 'zone', playerIdx: i })} />
            ))}
            <BrushBtn label="No Zone" active={brush.kind === 'zone' && brush.playerIdx === null} color="#222" onClick={() => setBrush({ kind: 'zone', playerIdx: null })} />
            <div style={{ marginTop: 8, fontSize: 12, color: '#8a8' }}>
              Edit colors:
              {model.zoneColors.map((c, i) => (
                <input key={i} type="color" value={c} onChange={e => setModel(m => { const next = [...m.zoneColors]; next[i] = e.currentTarget.value; return { ...m, zoneColors: next }; })} style={{ marginLeft: 4, width: 30, height: 22, border: 'none', background: 'transparent' }} />
              ))}
            </div>
          </section>
          <section style={panelStyle}>
            <h3 style={sectionHead}>Spawners</h3>
            {model.spawners.map((s, sIdx) => (
              <div key={sIdx} style={{ border: '1px solid #333', padding: 6, marginBottom: 6, borderRadius: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>Spawner {sIdx + 1}</strong>
                  <button onClick={() => removeSpawner(sIdx)} style={{ ...btnStyle, background: '#633' }}>Remove</button>
                </div>
                <div style={{ fontSize: 12, marginTop: 4 }}>
                  <div>Entry: {fmtPt(s.entry)} <button onClick={() => setBrush({ kind: 'entry', spawnerIdx: sIdx })} style={{ ...miniBtn, background: brush.kind === 'entry' && brush.spawnerIdx === sIdx ? '#3a5' : '#223' }}>Set</button></div>
                  <div>Exit: {fmtPt(s.exit)} <button onClick={() => setBrush({ kind: 'exit', spawnerIdx: sIdx })} style={{ ...miniBtn, background: brush.kind === 'exit' && brush.spawnerIdx === sIdx ? '#3a5' : '#223' }}>Set</button></div>
                  <div style={{ marginTop: 4 }}>
                    Waypoints ({s.waypoints.length})
                    <button onClick={() => setBrush({ kind: 'waypoint', spawnerIdx: sIdx })} style={{ ...miniBtn, background: brush.kind === 'waypoint' && brush.spawnerIdx === sIdx ? '#3a5' : '#223' }}>+ Add mode</button>
                  </div>
                  {s.waypoints.map((w, wIdx) => (
                    <div key={wIdx} style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 12 }}>
                      <span style={{ flex: 1 }}>{wIdx + 1}. [{w[0]}, {w[1]}]</span>
                      <button onClick={() => moveWaypoint(sIdx, wIdx, -1)} style={miniBtn}>↑</button>
                      <button onClick={() => moveWaypoint(sIdx, wIdx, 1)} style={miniBtn}>↓</button>
                      <button onClick={() => removeWaypoint(sIdx, wIdx)} style={{ ...miniBtn, background: '#633' }}>×</button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <button onClick={addSpawner} style={btnStyle}>+ Add Spawner</button>
          </section>
        </div>

        {/* Right column: grid */}
        <section style={{ ...panelStyle, overflow: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <h3 style={{ ...sectionHead, margin: 0 }}>Grid — {COLS}×{ROWS}</h3>
            <label style={{ fontSize: 12, cursor: 'pointer', userSelect: 'none' }}>
              <input type="checkbox" checked={showZones} onChange={e => setShowZones(e.currentTarget.checked)} style={{ marginRight: 4 }} />
              Show zone tint
            </label>
          </div>
          <div style={{ display: 'inline-block', border: '1px solid #333', background: '#111' }}>
            {model.cells.map((row, r) => (
              <div key={r} style={{ display: 'flex' }}>
                {row.map((terrain, c) => {
                  const zone = model.zones[r][c];
                  const overlay = spawnerOverlay.get(`${c},${r}`);
                  const baseColor = (showZones && zone != null)
                    ? blendColor(TERRAIN_COLOR[terrain], model.zoneColors[zone], 0.45)
                    : TERRAIN_COLOR[terrain];
                  return (
                    <div
                      key={c}
                      onMouseDown={(e) => handleMouseDown(c, r, e)}
                      onMouseEnter={() => handleMouseEnter(c, r)}
                      style={{
                        width: CELL, height: CELL,
                        background: baseColor,
                        boxShadow: 'inset 0 0 0 1px #222',
                        position: 'relative',
                        cursor: 'crosshair',
                        userSelect: 'none',
                      }}
                    >
                      {overlay?.map((o, i) => (
                        <div key={i} style={{
                          position: 'absolute', inset: 2,
                          border: `2px solid ${o.kind === 'entry' ? '#3f6' : o.kind === 'exit' ? '#f66' : '#fc3'}`,
                          borderRadius: o.kind === 'wp' ? '50%' : 2,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 9, fontWeight: 'bold', color: '#fff', textShadow: '0 0 2px #000',
                          pointerEvents: 'none',
                        }}>
                          {o.kind === 'entry' ? `E${o.sIdx + 1}` : o.kind === 'exit' ? `X${o.sIdx + 1}` : `${o.wIdx! + 1}`}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10, fontSize: 12, color: '#999' }}>
            Legend: green ring = entry, red ring = exit, yellow circle = waypoint (numbered in traversal order).
          </div>
        </section>
      </div>
    </div>
  );
}

// ─── helpers ──────────────────────────────────────────────────────────
function fmtPt(p: Tuple | null): string {
  return p ? `[${p[0]}, ${p[1]}]` : '—';
}

function blendColor(hexA: string, hexB: string, t: number): string {
  const a = parseHex(hexA), b = parseHex(hexB);
  const r = Math.round(a[0] * (1 - t) + b[0] * t);
  const g = Math.round(a[1] * (1 - t) + b[1] * t);
  const bl = Math.round(a[2] * (1 - t) + b[2] * t);
  return `rgb(${r}, ${g}, ${bl})`;
}
function parseHex(h: string): [number, number, number] {
  const m = h.replace('#', '');
  const s = m.length === 3 ? m.split('').map(c => c + c).join('') : m;
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}

// ─── tiny style object bag ──────────────────────────────────────────
const panelStyle: React.CSSProperties = {
  background: '#12121e',
  border: '1px solid #2a2a3a',
  borderRadius: 6,
  padding: 12,
  marginBottom: 10,
};
const sectionHead: React.CSSProperties = { fontSize: 14, marginBottom: 8, color: '#aaf' };
const inputStyle: React.CSSProperties = {
  background: '#0a0a14', border: '1px solid #333', color: '#e6e6f0',
  padding: '4px 6px', borderRadius: 3, fontSize: 13,
};
const btnStyle: React.CSSProperties = {
  background: '#223', color: '#e6e6f0', border: '1px solid #445',
  padding: '4px 10px', marginRight: 4, marginTop: 2, borderRadius: 3, cursor: 'pointer', fontSize: 12,
};
const miniBtn: React.CSSProperties = {
  background: '#223', color: '#e6e6f0', border: '1px solid #445',
  padding: '2px 6px', marginLeft: 2, borderRadius: 2, cursor: 'pointer', fontSize: 11,
};

function BrushBtn({ label, active, color, onClick }: { label: string; active: boolean; color: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      ...btnStyle, display: 'inline-flex', alignItems: 'center', gap: 4,
      background: active ? '#3a5' : '#223',
      marginBottom: 4,
    }}>
      <span style={{ width: 12, height: 12, background: color, display: 'inline-block', border: '1px solid #000' }} />
      {label}
    </button>
  );
}
