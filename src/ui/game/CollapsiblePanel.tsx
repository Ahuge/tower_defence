/**
 * CollapsiblePanel — wrapper that shows a clickable header bar.
 * Tap to expand/collapse the panel content.
 */

interface Props {
  title: string;
  titleColor?: string;
  open: boolean;
  onToggle: () => void;
  badge?: string;
  children: any;
}

export function CollapsiblePanel({ title, titleColor, open, onToggle, badge, children }: Props) {
  return (
    <div class="game-panel" style={{ padding: 0, marginBottom: '4px', overflow: 'hidden' }}>
      {/* Header — always visible, tap to toggle */}
      <div
        onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          // Wrap instead of clipping: on phone the sidebar narrows (e.g. to
          // clear the Versus minimap), and a long badge ("100g | +10/w")
          // would otherwise overflow the panel's hidden edge.
          flexWrap: 'wrap', rowGap: '2px',
          padding: '6px 10px', cursor: 'pointer',
          background: open ? 'rgba(255,255,255,0.03)' : 'transparent',
          borderBottom: open ? '1px solid rgba(255,255,255,0.05)' : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '8px', color: 'var(--text-dim)', transition: 'transform 150ms', transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
          <span style={{ fontFamily: "'VT323', ui-monospace, monospace", fontSize: '16px', color: titleColor ?? 'var(--gold)', letterSpacing: '1px' }}>{title}</span>
        </div>
        {badge && <span style={{ fontFamily: "'VT323', ui-monospace, monospace", fontSize: '14px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{badge}</span>}
      </div>
      {/* Content — hidden when collapsed, scroll if too tall */}
      {open && (
        <div style={{ padding: '6px 10px 8px', maxHeight: '50vh', overflowY: 'auto' }}>
          {children}
        </div>
      )}
    </div>
  );
}
