/**
 * StepEditorPanel — visual editor for tower draw steps.
 *
 * Shows the decomposed draw steps for a tower, lets you:
 * - Toggle steps on/off to see what each one does
 * - Modify step parameters (position, size, colors)
 * - Reorder steps (drag or up/down buttons)
 * - Add new steps from the shape library
 * - Preview the result live on a canvas
 */
import { useState, useEffect, useRef, useMemo } from 'react';
import { DrawStep, renderSteps, StepContext, SHAPE_LIBRARY, ShapeTemplate } from './DrawSteps';

const PX = 2, GRID = 32, CELL = GRID * PX;

interface Props {
  steps: DrawStep[];
  level: number;
  state: number;
  onStepsChange: (steps: DrawStep[]) => void;
  /** Base draw function to render beneath steps (e.g., arcaneBase) */
  drawBase?: (p: any, b: any, level: number) => void;
}

export function StepEditorPanel({ steps, level, state, onStepsChange, drawBase }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedStep, setSelectedStep] = useState<string | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const [mutedSteps, setMutedSteps] = useState<Set<string>>(new Set());
  const [playbackIndex, setPlaybackIndex] = useState<number | null>(null); // null = show all, 0-N = show up to index
  const playbackTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const toggleMute = (id: string) => {
    setMutedSteps(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const startPlayback = () => {
    setPlaybackIndex(0);
    if (playbackTimer.current) clearInterval(playbackTimer.current);
    playbackTimer.current = setInterval(() => {
      setPlaybackIndex(prev => {
        if (prev === null) return null;
        const next = prev + 1;
        if (next >= steps.length) {
          // Hold on final frame briefly, then stop
          if (playbackTimer.current) clearInterval(playbackTimer.current);
          playbackTimer.current = null;
          // Reset after a brief pause
          setTimeout(() => setPlaybackIndex(null), 800);
          return prev;
        }
        return next;
      });
    }, 300);
  };

  const stopPlayback = () => {
    if (playbackTimer.current) { clearInterval(playbackTimer.current); playbackTimer.current = null; }
    setPlaybackIndex(null);
  };

  // Cleanup timer on unmount
  useEffect(() => () => { if (playbackTimer.current) clearInterval(playbackTimer.current); }, []);

  // Render preview
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const scale = 6;
    canvas.width = CELL * scale;
    canvas.height = CELL * scale;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    // Clear
    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw at 1x into a temp canvas, then scale up
    const tmp = document.createElement('canvas');
    tmp.width = CELL; tmp.height = CELL;
    const tCtx = tmp.getContext('2d')!;
    tCtx.imageSmoothingEnabled = false;

    const mk = (x: number, y: number, cl: string) => {
      if (!cl || x < 0 || x >= GRID || y < 0 || y >= GRID) return;
      tCtx.fillStyle = cl;
      tCtx.fillRect(x * PX, y * PX, PX, PX);
    };
    const bk = (x: number, y: number, w: number, h: number, cl: string) => {
      if (!cl) return;
      tCtx.fillStyle = cl;
      tCtx.fillRect(x * PX, y * PX, w * PX, h * PX);
    };

    // Draw base if provided
    if (drawBase) drawBase(mk, bk, level);

    // Render steps — filter by muted + playback
    const cy = 12 - Math.min(level, 4);
    const stepCtx: StepContext = { p: mk, b: bk, level, state, cx: 16, cy };
    const visibleSteps = steps.filter((s, i) => {
      if (mutedSteps.has(s.id)) return false;
      if (playbackIndex !== null && i > playbackIndex) return false;
      return true;
    });
    renderSteps(visibleSteps, stepCtx);

    // Scale up to preview canvas
    ctx.save();
    ctx.scale(scale, scale);
    ctx.drawImage(tmp, 0, 0);
    ctx.restore();

    // Grid overlay
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= GRID; x++) {
      ctx.beginPath(); ctx.moveTo(x * PX * scale, 0); ctx.lineTo(x * PX * scale, canvas.height); ctx.stroke();
    }
    for (let y = 0; y <= GRID; y++) {
      ctx.beginPath(); ctx.moveTo(0, y * PX * scale); ctx.lineTo(canvas.width, y * PX * scale); ctx.stroke();
    }
  }, [steps, level, state, drawBase, mutedSteps, playbackIndex]);

  const toggleStep = (id: string) => {
    onStepsChange(steps.map(s => s.id === id ? { ...s, enabled: s.enabled === false ? true : false } : s));
  };

  const removeStep = (id: string) => {
    onStepsChange(steps.filter(s => s.id !== id));
  };

  const moveStep = (id: string, dir: -1 | 1) => {
    const idx = steps.findIndex(s => s.id === id);
    if (idx < 0) return;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= steps.length) return;
    const newSteps = [...steps];
    [newSteps[idx], newSteps[newIdx]] = [newSteps[newIdx], newSteps[idx]];
    onStepsChange(newSteps);
  };

  const addFromLibrary = (template: ShapeTemplate) => {
    const newStep: DrawStep = {
      id: `${template.type}_${Date.now()}`,
      label: template.label,
      type: template.type,
      params: { ...template.defaultParams },
      enabled: true,
    };
    onStepsChange([...steps, newStep]);
    setShowLibrary(false);
    setSelectedStep(newStep.id);
  };

  const updateParam = (stepId: string, key: string, value: any) => {
    onStepsChange(steps.map(s => {
      if (s.id !== stepId) return s;
      return { ...s, params: { ...s.params, [key]: value } };
    }));
  };

  const sel = steps.find(s => s.id === selectedStep);

  return (
    <div style={{ display: 'flex', gap: '12px', height: '100%' }}>
      {/* Preview canvas */}
      <div>
        <div style={{ fontSize: '10px', color: '#888', marginBottom: '4px' }}>Preview (6x zoom)</div>
        <canvas ref={canvasRef} style={{ imageRendering: 'pixelated' as any, border: '1px solid #2a2a44', borderRadius: '4px', cursor: 'crosshair' }} />
        <div style={{ fontSize: '9px', color: '#555', marginTop: '4px' }}>
          Level {level} | State: {['Idle', 'Charge', 'Fire', 'Cooldown'][state]}
        </div>
      </div>

      {/* Step list */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <span style={{ fontSize: '10px', color: '#ffaa44', letterSpacing: '1px' }}>DRAW STEPS ({steps.length})</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            {playbackIndex !== null ? (
              <button onClick={stopPlayback} style={{ ...btnStyle, borderColor: '#ff4444', color: '#ff4444' }}>■ Stop</button>
            ) : (
              <button onClick={startPlayback} style={{ ...btnStyle, borderColor: '#44ff44', color: '#44ff44' }}>▶ Play</button>
            )}
            <button onClick={() => setMutedSteps(new Set())} style={btnStyle}>Unmute All</button>
            <button onClick={() => setShowLibrary(!showLibrary)} style={btnStyle}>+ Add</button>
          </div>
        </div>
        {playbackIndex !== null && (
          <div style={{ fontSize: '9px', color: '#44ff44', marginBottom: '4px' }}>
            Playing step {playbackIndex + 1} / {steps.length}
          </div>
        )}

        {/* Shape library popup */}
        {showLibrary && (
          <div style={{ background: '#111122', border: '1px solid #333', borderRadius: '4px', padding: '6px', marginBottom: '8px' }}>
            <div style={{ fontSize: '9px', color: '#888', marginBottom: '4px' }}>Shape Library</div>
            {SHAPE_LIBRARY.map(t => (
              <div key={t.type} onClick={() => addFromLibrary(t)}
                style={{ padding: '3px 6px', cursor: 'pointer', fontSize: '10px', color: '#ccc', borderRadius: '3px', marginBottom: '2px' }}>
                <span style={{ color: '#ffaa44' }}>{t.label}</span> — {t.description}
              </div>
            ))}
          </div>
        )}

        {/* Steps */}
        {steps.map((step, i) => (
          <div key={step.id}
            onClick={() => setSelectedStep(step.id === selectedStep ? null : step.id)}
            style={{
              padding: '4px 6px', marginBottom: '2px', borderRadius: '4px', cursor: 'pointer',
              background: playbackIndex !== null && i === playbackIndex ? 'rgba(68,255,68,0.15)' : step.id === selectedStep ? 'rgba(255,170,68,0.1)' : step.enabled === false ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)',
              border: playbackIndex !== null && i === playbackIndex ? '1px solid #44ff44' : step.id === selectedStep ? '1px solid #ffaa44' : '1px solid transparent',
              opacity: mutedSteps.has(step.id) ? 0.3 : step.enabled === false ? 0.4 : 1,
            }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px' }}>
              {/* Toggle (permanent enable/disable) */}
              <span onClick={(e: any) => { e.stopPropagation(); toggleStep(step.id); }}
                style={{ cursor: 'pointer', color: step.enabled === false ? '#444' : '#44ff44', fontSize: '12px' }}
                title={step.enabled === false ? 'Enable' : 'Disable'}>
                {step.enabled === false ? '○' : '●'}
              </span>
              {/* Mute (temporary hide) */}
              <span onClick={(e: any) => { e.stopPropagation(); toggleMute(step.id); }}
                style={{ cursor: 'pointer', color: mutedSteps.has(step.id) ? '#ff4444' : '#666', fontSize: '10px' }}
                title={mutedSteps.has(step.id) ? 'Unmute' : 'Mute'}>
                {mutedSteps.has(step.id) ? '🔇' : '🔊'}
              </span>
              {/* Label */}
              <span style={{ flex: 1, color: mutedSteps.has(step.id) ? '#ff4444' : step.enabled === false ? '#555' : '#ccc', textDecoration: mutedSteps.has(step.id) ? 'line-through' : 'none' }}>
                {step.label}
                {step.minLevel && <span style={{ color: '#555', marginLeft: '4px' }}>Lv{step.minLevel}+</span>}
              </span>
              {/* Type badge */}
              <span style={{ fontSize: '8px', color: '#666', background: '#1a1a28', padding: '1px 4px', borderRadius: '2px' }}>{step.type}</span>
              {/* Move/remove */}
              <span onClick={(e: any) => { e.stopPropagation(); moveStep(step.id, -1); }} style={{ cursor: 'pointer', color: '#555', fontSize: '10px' }}>▲</span>
              <span onClick={(e: any) => { e.stopPropagation(); moveStep(step.id, 1); }} style={{ cursor: 'pointer', color: '#555', fontSize: '10px' }}>▼</span>
              <span onClick={(e: any) => { e.stopPropagation(); removeStep(step.id); }} style={{ cursor: 'pointer', color: '#ff4444', fontSize: '10px' }}>✕</span>
            </div>

            {/* Parameter editor (expanded when selected) */}
            {step.id === selectedStep && step.type !== 'custom' && step.type !== 'base' && (
              <div onClick={(e: any) => e.stopPropagation()} style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px solid #222' }}>
                {Object.entries(step.params).filter(([k]) => k !== 'fn').map(([key, val]) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px', fontSize: '9px' }}>
                    <span style={{ color: '#888', minWidth: '50px' }}>{key}</span>
                    {typeof val === 'number' ? (
                      <input type="number" value={val}
                        onChange={(e: any) => updateParam(step.id, key, parseFloat(e.target.value) || 0)}
                        style={{ width: '50px', background: '#111', border: '1px solid #333', color: '#fff', fontSize: '9px', padding: '1px 4px', fontFamily: 'monospace' }}
                      />
                    ) : typeof val === 'string' && val.startsWith('#') ? (
                      <input type="color" value={val}
                        onChange={(e: any) => updateParam(step.id, key, e.target.value)}
                        style={{ width: '24px', height: '16px', border: 'none', cursor: 'pointer', padding: 0 }}
                      />
                    ) : typeof val === 'string' ? (
                      <input type="text" value={val}
                        onChange={(e: any) => updateParam(step.id, key, e.target.value)}
                        style={{ flex: 1, background: '#111', border: '1px solid #333', color: '#fff', fontSize: '9px', padding: '1px 4px', fontFamily: 'monospace' }}
                      />
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const btnStyle: Record<string, string | number> = {
  fontFamily: 'Courier New, monospace', fontSize: '9px', padding: '3px 8px',
  borderRadius: '3px', border: '1px solid #ffaa44', background: '#2a2010',
  color: '#ffaa44', cursor: 'pointer',
};
