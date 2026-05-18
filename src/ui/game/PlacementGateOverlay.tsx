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

import { useEffect, useState, useRef } from 'preact/hooks';
import { useGameUI } from '../hooks/useGameUI';
import { GameUIStore } from '../GameUIStore';
import { gridX, gridY, TILE_SIZE, pixelToCol, pixelToRow } from '../../config';
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

/** Inverse of projectCellToScreen: viewport pixel → grid cell.
 *  Used by the drag handler to convert pointer-move events to
 *  movePlacementGhost calls. Returns null if the canvas isn't
 *  mounted or the point falls outside it. */
function screenToCell(screenX: number, screenY: number): { col: number; row: number } | null {
  const canvas = getCanvas();
  if (!canvas) return null;
  const rect = canvas.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return null;
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const canvasX = (screenX - rect.left) * scaleX;
  const canvasY = (screenY - rect.top) * scaleY;
  return {
    col: pixelToCol(canvasX),
    row: pixelToRow(canvasY),
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
        pointerEvents: 'none' as const, // each button + handle opts back in
        zIndex: 800,
      }}
    >
      {/* Drag handle covers the ghost cell. Pointer-down enters
          drag mode; pointer-move calls movePlacementGhost; pointer-up
          ends. The handle is transparent — the ghost cell is rendered
          by the Phaser graphics layer underneath. */}
      <DragHandle
        x={anchor.x}
        y={anchor.y}
        size={anchor.tileSize}
      />
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

interface DragHandleProps {
  x: number;
  y: number;
  size: number;
}

/** Transparent drag handle over the ghost cell. Pointer events
 *  convert to grid cells via screenToCell + dispatch via the store.
 *  Touch-action: none disables browser-level gestures (scroll /
 *  pinch-zoom) while the player is mid-drag. */
function DragHandle({ x, y, size }: DragHandleProps) {
  const dragging = useRef(false);

  return (
    <div
      data-testid="placement-gate-drag-handle"
      role="presentation"
      onPointerDown={(e: PointerEvent) => {
        dragging.current = true;
        // Capture so we keep getting move events even if the
        // pointer leaves the handle's bounding rect.
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        e.preventDefault();
      }}
      onPointerMove={(e: PointerEvent) => {
        if (!dragging.current) return;
        const cell = screenToCell(e.clientX, e.clientY);
        if (cell) GameUIStore.onPlacementMove(cell.col, cell.row);
      }}
      onPointerUp={(e: PointerEvent) => {
        dragging.current = false;
        try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* swallow */ }
      }}
      onPointerCancel={() => { dragging.current = false; }}
      style={{
        position: 'absolute' as const,
        left: `${x}px`,
        top: `${y}px`,
        width: `${size}px`,
        height: `${size}px`,
        transform: 'translate(-50%, -50%)',
        cursor: 'grab',
        pointerEvents: 'auto' as const,
        // Disable browser gestures while dragging (scroll, pinch).
        touchAction: 'none' as const,
        // Faintly outline the drag handle so the player knows it's
        // interactive. Visible but unobtrusive.
        border: '1px dashed rgba(255, 217, 122, 0.5)',
        borderRadius: '4px',
        background: 'transparent',
      }}
    />
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
