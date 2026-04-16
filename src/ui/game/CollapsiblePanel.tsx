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
          padding: '6px 10px', cursor: 'pointer',
          background: open ? 'rgba(255,255,255,0.03)' : 'transparent',
          borderBottom: open ? '1px solid rgba(255,255,255,0.05)' : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '8px', color: '#555', transition: 'transform 150ms', transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
          <span style={{ fontSize: '10px', color: titleColor ?? '#ffaa44', letterSpacing: '1px' }}>{title}</span>
        </div>
        {badge && <span style={{ fontSize: '9px', color: '#666' }}>{badge}</span>}
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
