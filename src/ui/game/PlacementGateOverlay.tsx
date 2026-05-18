/**
 * PlacementGateOverlay — DOM tick/X buttons that float above the
 * pending ghost cell when the place-and-approve gate is active.
 *
 * Subscribes to GameUIStore.placementGhost; when non-null, projects
 * the ghost's grid cell to screen-pixel coords via the Phaser
 * canvas's bounding rect + the project's gridX/gridY helpers, then
 * renders two buttons anchored above the cell.
 *
 * Buttons fire GameUIStore.onPlacementCommit / onPlacementCancel
 * which route through GameScene's commitPlacementGate /
 * cancelPlacementGate.
 *
 * Projection math:
 *   World coords of cell center: (gridX(col), gridY(row))
 *   Canvas DOM rect:             canvas.getBoundingClientRect()
 *   Scale factor:                rect.width / canvasWidth
 *   Screen X = rect.left + (worldX * scaleX)
 *   Screen Y = rect.top  + (worldY * scaleY)
 *
 * Re-projects on every render (cheap; canvas rect read is one
 * native call). Window-resize listener forces re-render so the
 * overlay tracks orientation changes / address-bar collapse.
 */

import { useEffect, useState } from 'preact/hooks';
import { useGameUI } from '../hooks/useGameUI';
import { GameUIStore } from '../GameUIStore';
import { gridX, gridY, TILE_SIZE } from '../../config';
import { UIScale } from '../../systems/UIScale';

/** Resolve the active Phaser canvas element. Mounted into
 *  `#game-root` by main.ts; falls back to the first canvas in the
 *  document if the mount selector misses (test environments). */
function getCanvas(): HTMLCanvasElement | null {
  return (
    document.querySelector('#game-root canvas') as HTMLCanvasElement | null
  ) ?? document.querySelector('canvas');
}

interface ScreenAnchor {
  x: number;
  y: number;
  /** Pixel size (screen px) of a single grid tile after the canvas
   *  has been fitted to the viewport. Used by the overlay to size
   *  its hit area + tower-cell highlight. */
  tileSize: number;
}

function projectCellToScreen(col: number, row: number): ScreenAnchor | null {
  const canvas = getCanvas();
  if (!canvas) return null;
  const rect = canvas.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return null;
  const scaleX = rect.width / canvas.width;
  const scaleY = rect.height / canvas.height;
  // Cell center in world coords.
  const worldX = gridX(col);
  const worldY = gridY(row);
  return {
    x: rect.left + worldX * scaleX,
    y: rect.top + worldY * scaleY,
    tileSize: TILE_SIZE * Math.min(scaleX, scaleY),
  };
}

export function PlacementGateOverlay() {
  const { placementGhost } = useGameUI();
  // Re-render on resize / orientation change / canvas scale.
  const [, setTick] = useState(0);
  useEffect(() => {
    const onResize = () => setTick(t => t + 1);
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  if (!placementGhost) return null;
  const anchor = projectCellToScreen(placementGhost.col, placementGhost.row);
  if (!anchor) return null;

  // Position buttons above the cell. Tick on the right, X on the
  // left — matches the standard "approve / dismiss" reading order
  // for left-to-right scripts. Both buttons sit ~tileSize above
  // the cell center so they don't occlude the ghost itself.
  const btnSize = Math.max(40, UIScale.space(36));
  const verticalOffset = anchor.tileSize * 0.9 + btnSize / 2;
  const hSpacing = btnSize + 8;

  return (
    <div
      data-testid="placement-gate-overlay"
      style={{
        position: 'fixed' as const,
        left: 0,
        top: 0,
        pointerEvents: 'none' as const, // each button opts back in
        zIndex: 800,
      }}
    >
      <PlacementButton
        kind="cancel"
        x={anchor.x - hSpacing / 2}
        y={anchor.y - verticalOffset}
        size={btnSize}
        onClick={() => GameUIStore.onPlacementCancel()}
      />
      <PlacementButton
        kind="commit"
        x={anchor.x + hSpacing / 2}
        y={anchor.y - verticalOffset}
        size={btnSize}
        onClick={() => GameUIStore.onPlacementCommit()}
      />
    </div>
  );
}

interface ButtonProps {
  kind: 'commit' | 'cancel';
  x: number;
  y: number;
  size: number;
  onClick: () => void;
}

function PlacementButton({ kind, x, y, size, onClick }: ButtonProps) {
  const isCommit = kind === 'commit';
  return (
    <button
      data-testid={kind === 'commit' ? 'place-and-approve-commit' : 'place-and-approve-cancel'}
      aria-label={isCommit ? 'Confirm tower placement' : 'Cancel tower placement'}
      onClick={onClick}
      style={{
        position: 'absolute' as const,
        left: `${x}px`,
        top: `${y}px`,
        width: `${size}px`,
        height: `${size}px`,
        transform: 'translate(-50%, -50%)',
        borderRadius: '50%',
        border: `2px solid ${isCommit ? '#3cc85a' : '#dc5050'}`,
        background: isCommit ? 'rgba(20, 60, 30, 0.92)' : 'rgba(60, 18, 22, 0.92)',
        color: isCommit ? '#9cf5b3' : '#ff9c9c',
        fontSize: `${Math.max(20, size * 0.55)}px`,
        fontWeight: 700,
        display: 'flex' as const,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        cursor: 'pointer',
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.5)',
        pointerEvents: 'auto' as const,
        // Generous touch target via UIScale floor; commit/cancel are
        // the only buttons in the gate flow so visual prominence
        // helps mobile players land them.
      }}
    >
      {isCommit ? '✓' : '✕'}
    </button>
  );
}
