/**
 * FactionEmblem — bespoke per-faction emblem art with a procedural
 * SVG fallback.
 *
 * Plan 5 v1 shipped a procedural SVG glyph because no art existed.
 * The art-pass drop (Apr 2026) delivered hand-drawn emblems sliced
 * from `resources/composite_art_theme.png` into
 * `public/assets/{faction}/{faction}_emblem.png`. This component
 * renders the PNG by default and falls back to the procedural SVG
 * if the image fails to load (handles offline/missing-asset cases
 * cleanly so the tree never shows a broken-image icon).
 *
 * Locked-state desaturation is handled with a CSS filter on the
 * `<img>` so the engine doesn't need separate locked-variant assets.
 *
 * Each procedural glyph reads as one of: spell-spark / cog / leaf /
 * vortex / chevron / hexagon / bracket / flame / sun / wave /
 * network. Keeps the silhouette readable even at the small (48px)
 * tree-node size.
 */

import { useState } from 'preact/hooks';
import type { FactionId } from '../../data/Factions';
import { FACTIONS } from '../../data/Factions';

interface Props {
  faction: FactionId;
  size?: number;
  /** When true, render as a silhouette (locked state in tree). */
  locked?: boolean;
}

function hex(n: number): string { return '#' + n.toString(16).padStart(6, '0'); }

const BASE_URL: string = (import.meta as any).env?.BASE_URL ?? '/';

function emblemSrc(faction: FactionId): string {
  // Meta entries (chaos / random) don't ship with bespoke emblems —
  // they always fall through to the procedural glyph below.
  if (faction === 'chaos' || faction === 'random') return '';
  // WebP is universally supported in our target browsers (Chrome,
  // Edge, Firefox 65+, Safari 14+, Capacitor WebView). Drops emblem
  // payload from ~800KB → ~50KB for substantially faster paint.
  return `${BASE_URL}assets/${faction}/${faction}_emblem.webp`;
}

export function FactionEmblem({ faction, size = 56, locked = false }: Props) {
  const def = FACTIONS[faction];
  const primary = locked ? '#444' : hex(def.primaryColor);
  const secondary = locked ? '#666' : hex(def.secondaryColor);
  const halo = locked ? '#222' : 'rgba(255,255,255,0.08)';
  const glyph = renderGlyph(faction, primary, secondary);

  // PNG-first; fall back to procedural SVG on load failure.
  const [imgFailed, setImgFailed] = useState(false);
  const src = emblemSrc(faction);
  if (src && !imgFailed) {
    return (
      <img
        src={src}
        alt={`${def.name} emblem`}
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        onError={() => setImgFailed(true)}
        style={{
          display: 'block',
          width: `${size}px`,
          height: `${size}px`,
          objectFit: 'contain',
          // Locked = desaturate + dim. Keeps a single asset; no
          // separate locked-variant PNG needed.
          filter: locked ? 'grayscale(0.85) brightness(0.55)' : undefined,
          imageRendering: 'auto',
        }}
      />
    );
  }
  // Procedural SVG fallback (also used for chaos / random).

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: 'block' }}>
      <defs>
        <radialGradient id={`bg-${faction}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={secondary} stopOpacity="0.35" />
          <stop offset="80%" stopColor={primary} stopOpacity="0.15" />
          <stop offset="100%" stopColor={primary} stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Outer halo */}
      <circle cx="50" cy="50" r="48" fill={halo} stroke={primary} strokeWidth="1.5" strokeOpacity={locked ? 0.35 : 0.85} />
      {/* Inner radial fill */}
      <circle cx="50" cy="50" r="44" fill={`url(#bg-${faction})`} />
      {/* Faction-specific glyph */}
      {glyph}
    </svg>
  );
}

function renderGlyph(faction: FactionId, primary: string, secondary: string): preact.JSX.Element {
  // Glyphs centered on (50, 50) inside a 100x100 viewBox. Stroke-only
  // shapes read better at small sizes than filled ones.
  const stroke = secondary;
  const fill = primary;
  const sw = 3;

  switch (faction) {
    case 'arcane': // 4-pointed star
      return (
        <path d="M50 24 L54 46 L74 50 L54 54 L50 74 L46 54 L26 50 L46 46 Z"
          fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
      );
    case 'mechanical': { // gear cog
      const teeth = [];
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const x1 = 50 + Math.cos(a) * 26;
        const y1 = 50 + Math.sin(a) * 26;
        const x2 = 50 + Math.cos(a) * 34;
        const y2 = 50 + Math.sin(a) * 34;
        teeth.push(<line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth={5} strokeLinecap="round" />);
      }
      return (
        <g>
          {teeth}
          <circle cx="50" cy="50" r="22" fill={fill} stroke={stroke} strokeWidth={sw} />
          <circle cx="50" cy="50" r="8" fill={stroke} />
        </g>
      );
    }
    case 'nature': // 3-petal flower
      return (
        <g>
          <path d="M50 22 Q42 38 50 50 Q58 38 50 22 Z" fill={fill} stroke={stroke} strokeWidth={sw} />
          <path d="M22 60 Q40 56 50 50 Q40 64 22 60 Z" fill={fill} stroke={stroke} strokeWidth={sw} />
          <path d="M78 60 Q60 56 50 50 Q60 64 78 60 Z" fill={fill} stroke={stroke} strokeWidth={sw} />
          <circle cx="50" cy="50" r="4" fill={stroke} />
        </g>
      );
    case 'void': // spiral
      return (
        <path d="M50 26 A24 24 0 1 1 26 50 A18 18 0 1 1 50 32 A12 12 0 1 1 38 50 A6 6 0 1 1 50 44"
          fill="none" stroke={fill} strokeWidth={sw + 1} strokeLinecap="round" />
      );
    case 'military': // 3 chevron stripes
      return (
        <g fill="none" stroke={fill} strokeWidth={sw + 2} strokeLinecap="round" strokeLinejoin="round">
          <polyline points="28,42 50,28 72,42" />
          <polyline points="28,52 50,38 72,52" />
          <polyline points="28,62 50,48 72,62" />
        </g>
      );
    case 'aliens': // hexagon hive cell
      return (
        <g>
          <polygon points="50,22 72,36 72,64 50,78 28,64 28,36"
            fill={fill} stroke={stroke} strokeWidth={sw} />
          <polygon points="50,38 60,46 60,58 50,66 40,58 40,46"
            fill="none" stroke={stroke} strokeWidth={sw - 1} />
        </g>
      );
    case 'cypherpunk': // bracket / circuit
      return (
        <g fill="none" stroke={fill} strokeWidth={sw + 1} strokeLinecap="round" strokeLinejoin="round">
          <polyline points="34,28 24,28 24,72 34,72" />
          <polyline points="66,28 76,28 76,72 66,72" />
          <line x1="40" y1="50" x2="60" y2="50" />
          <circle cx="40" cy="50" r="3" fill={fill} />
          <circle cx="60" cy="50" r="3" fill={fill} />
        </g>
      );
    case 'infernal': // flame triangle
      return (
        <path d="M50 22 Q40 40 36 52 Q34 64 42 72 Q44 60 50 56 Q56 60 58 72 Q66 64 64 52 Q60 40 50 22 Z"
          fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
      );
    case 'celestial': { // sun rays
      const rays = [];
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const x1 = 50 + Math.cos(a) * 22;
        const y1 = 50 + Math.sin(a) * 22;
        const x2 = 50 + Math.cos(a) * 36;
        const y2 = 50 + Math.sin(a) * 36;
        rays.push(<line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth={sw + 1} strokeLinecap="round" />);
      }
      return (
        <g>
          {rays}
          <circle cx="50" cy="50" r="14" fill={fill} stroke={stroke} strokeWidth={sw} />
        </g>
      );
    }
    case 'psionic': // brain waves / concentric arcs
      return (
        <g fill="none" stroke={fill} strokeWidth={sw + 1} strokeLinecap="round">
          <path d="M28 50 A22 22 0 0 1 72 50" />
          <path d="M34 56 A16 16 0 0 1 66 56" />
          <path d="M40 62 A10 10 0 0 1 60 62" />
          <circle cx="50" cy="38" r="4" fill={fill} stroke="none" />
        </g>
      );
    case 'harmonic': // 3 overlapping circles (network)
      return (
        <g fill="none" stroke={fill} strokeWidth={sw}>
          <circle cx="50" cy="34" r="14" />
          <circle cx="36" cy="60" r="14" />
          <circle cx="64" cy="60" r="14" />
        </g>
      );
    case 'chaos':
    case 'random':
    default:
      // Meta entries — shouldn't appear in the tree, but render a
      // placeholder rather than crashing.
      return (
        <text x="50" y="58" textAnchor="middle" fontSize="32" fontFamily="monospace" fill={fill}>?</text>
      );
  }
}
