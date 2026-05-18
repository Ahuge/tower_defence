/**
 * GreenwardEndingPanel — renders the M10 Caer Lythen ending on the
 * GameOver screen when the player wins the final mission. Reads the
 * resolved Nave mode from MissionResultSummary, picks the matching
 * tableau frame + outro paragraph from GREENWARD_M10_ENDINGS, and
 * renders title + image + outro.
 *
 * Used only when `archetypeId === 'final_greenward'` AND `won === true`.
 * Caller (GameOverScreen) handles the conditional render.
 */

import { GREENWARD_M10_ENDINGS } from '../../data/campaigns/texts/greenward.texts';

const TABLEAU_W = 128;
const TABLEAU_H = 96;

const NATURE_GREEN = '#33aa44';

type Mode = 'ceremony' | 'mercy' | 'siege';

interface Props {
  resolvedMode: Mode | null | undefined;
}

export function GreenwardEndingPanel({ resolvedMode }: Props) {
  // Fallback to Siege when the mode is missing (defensive — shouldn't
  // happen on a normal win, but Reserves-zero / unresolved-state
  // narrative implies Siege as the narrative-safe default).
  const mode: Mode = resolvedMode ?? 'siege';
  const ending = GREENWARD_M10_ENDINGS[mode];
  const frameIdx = mode === 'ceremony' ? 0 : mode === 'mercy' ? 1 : 2;
  const offsetY = -frameIdx * TABLEAU_H;

  return (
    <div
      class="ui-section"
      data-testid="greenward-ending"
      data-resolved-mode={mode}
      style={{
        textAlign: 'center' as const,
        padding: '24px 16px 32px',
        background: 'rgba(8, 16, 8, 0.55)',
        border: '1px solid rgba(51, 170, 68, 0.35)',
        borderRadius: '12px',
        margin: '16px auto',
        maxWidth: '560px',
      }}
    >
      <div
        style={{
          fontFamily: "'Silkscreen', monospace",
          color: NATURE_GREEN,
          fontSize: '20px',
          letterSpacing: '0.08em',
          marginBottom: '14px',
        }}
      >
        {ending.title}
      </div>
      {/* Tableau frame via the sheet — clip to the right frame using
          background-position. Pixel-perfect rendering with
          image-rendering: pixelated so the procedural art stays crisp
          at the 3× scale used here. */}
      <div
        style={{
          width: `${TABLEAU_W * 3}px`,
          height: `${TABLEAU_H * 3}px`,
          margin: '0 auto 18px',
          backgroundImage: 'url(assets/arena/greenward_endings.png)',
          backgroundPosition: `0 ${offsetY * 3}px`,
          backgroundSize: `${TABLEAU_W * 3}px ${TABLEAU_H * 3 * 3}px`,
          backgroundRepeat: 'no-repeat',
          imageRendering: 'pixelated',
          border: `1px solid ${NATURE_GREEN}`,
          borderRadius: '4px',
        }}
        role="img"
        aria-label={ending.title}
      />
      <div
        style={{
          fontFamily: 'system-ui, sans-serif',
          fontSize: '14px',
          lineHeight: 1.6,
          color: 'var(--text-primary)',
          textAlign: 'left' as const,
          whiteSpace: 'pre-wrap' as const,
          maxWidth: '480px',
          margin: '0 auto',
        }}
      >
        {ending.outro}
      </div>
    </div>
  );
}
