/**
 * CircleRosterDOM — Circle Co-op roster panel (DOM / Preact).
 *
 * Replaces the earlier Phaser-Text version so font sizes scale via
 * `UIScale` on phone (11px → 26px body, etc.) without the panel
 * turning into a tiny illegible sliver.
 *
 * Data comes from `GameUIStore.circleRoster`, which GameScene
 * rewrites each frame from `CircleManager` + the existing kill /
 * bot-gold / tower-owner suppliers. When `circleRoster` is null
 * (non-Circle matches) the component returns null and nothing
 * mounts — zero cost outside co-op.
 *
 * Positioning: fixed top-right, shifted left on desktop so it
 * clears the +/- zoom buttons. On phone the zoom buttons don't
 * exist (pinch-to-zoom) so the panel hugs the right edge.
 */
import { useGameUI } from '../hooks/useGameUI';
import { UIScale } from '../../systems/UIScale';
import { ResponsiveManager } from '../../systems/ResponsiveManager';
import { CircleRosterPlayer } from '../GameUIStore';

export function CircleRosterDOM() {
  const { circleRoster, active } = useGameUI();
  if (!active || !circleRoster) return null;

  const isPhone = ResponsiveManager.isPhone();
  // Desktop: leave room for the zoom buttons on the right edge.
  const rightInset = isPhone ? 8 : 62;
  const headerFont = UIScale.fontCapped(10, 22);
  const bodyFont = UIScale.fontCapped(11, 24);
  const timerFont = UIScale.fontCapped(11, 24);

  return (
    <div
      class="circle-roster"
      style={{
        position: 'fixed',
        top: `${UIScale.space(6)}px`,
        right: `${rightInset}px`,
        minWidth: isPhone ? '260px' : '230px',
        maxWidth: isPhone ? '320px' : '260px',
        background: 'rgba(17, 17, 17, 0.9)',
        border: '1px solid rgba(85, 85, 85, 0.6)',
        padding: `${UIScale.space(4)}px ${UIScale.space(6)}px`,
        fontFamily: "'VT323', ui-monospace, monospace",
        color: '#ccc',
        zIndex: 108,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          color: '#ffaa44', fontSize: headerFont, marginBottom: `${UIScale.space(3)}px`,
          letterSpacing: '0.5px',
        }}
      >
        <span>CIRCLE CO-OP</span>
        <span style={{ color: '#ffdd44', fontSize: timerFont }}>
          {circleRoster.timerS >= 0
            ? `${circleRoster.timerS}s`
            : `Lives: ${circleRoster.sharedLives}`}
        </span>
      </div>
      {circleRoster.players.map((p) => (
        <PlayerRow key={p.index} p={p} font={bodyFont} />
      ))}
    </div>
  );
}

function PlayerRow({ p, font }: { p: CircleRosterPlayer; font: string }) {
  // Me / bot / remote each render a slightly different line. Kept
  // inline rather than per-component so the column alignment is
  // easy to eyeball across rows.
  const label =
    p.kind === 'me'
      ? `P${p.index} (you) ${p.faction}${p.ready ? ' [RDY]' : ''}`
      : p.kind === 'bot'
        ? `P${p.index} [CPU] ${p.faction}${p.gold !== null ? ` ${p.gold}g` : ''}`
        : `P${p.index} ${p.faction}${p.ready ? ' [RDY]' : ''}`;

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: `${UIScale.space(6)}px`,
        fontSize: font, lineHeight: 1.1, marginBottom: `${UIScale.space(2)}px`,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: 'inline-block',
          width: '10px', height: '10px',
          background: p.colorHex, opacity: 0.8,
          flex: '0 0 auto',
        }}
      />
      <span style={{ color: p.colorHex, flex: '1 1 auto', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {label}
      </span>
      <span style={{ color: '#888', flex: '0 0 auto' }}>{p.towers}T {p.kills}K</span>
    </div>
  );
}
