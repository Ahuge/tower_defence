/**
 * PlacementGateOverlay — DOM tick/X buttons that float above the
 * pending ghost cell when the place-and-approve gate is active.
 *
 * Subscribes to GameUIStore.placementGhost; when non-null, projects
 * the ghost's grid cell to screen-pixel coords via the Phaser
 * canvas's FIT-aware bounding rect + the project's gridX/gridY
 * helpers, then renders two buttons anchored above the cell.
 *
 * Buttons fire GameUIStore.onPlacementCommit / onPlacementCancel
 * which route through GameScene's commitPlacementGate /
 * cancelPlacementGate.
 *
 * Projection — FIT-letterbox aware:
 *   Phaser is configured with Scale.FIT + CENTER_BOTH. The canvas
 *   DOM rect can be larger than the rendered playfield (letterbox
 *   bars top/bottom on portrait, left/right on landscape). We
 *   compute the actual displayed sub-rect via
 *   min(rect.W/canvas.W, rect.H/canvas.H) and account for the
 *   center-offset before projecting cell coords to screen pixels.
 *
 * Drag + double-tap:
 *   - Pointerdown+pointermove on the drag handle drags the ghost.
 *   - Double-tap (two pointerups within 400ms on the handle, no
 *     meaningful drag in between) commits the placement — mobile
 *     ergonomic alternative to reaching the tick button.
 *
 * Re-projects on every render. Window-resize + orientationchange
 * listeners force re-renders so the overlay tracks orientation
 * changes / address-bar collapse.
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

/** Phaser is configured with Scale.FIT + CENTER_BOTH (see main.ts):
 *  the canvas's INTRINSIC pixel buffer (canvas.width / canvas.height)
 *  stays at the configured GAME_WIDTH / GAME_HEIGHT, but the DOM
 *  element is sized to FIT the viewport with aspect preserved and
 *  centered in any remaining space. The rendered playfield occupies
 *  a sub-region of the canvas DOM rect — letterbox bars at top/bottom
 *  on portrait viewports (or left/right on landscape), depending on
 *  aspect mismatch.
 *
 *  The original projection assumed canvas-fill (no letterbox), which
 *  put the tick/X buttons at the wrong screen location on mobile.
 *  This helper computes the *actual displayed* sub-rect of the
 *  Phaser content within the canvas DOM rect. */
interface FittedCanvasRect {
  /** Page-relative left edge of the displayed Phaser content. */
  left: number;
  /** Page-relative top edge of the displayed Phaser content. */
  top: number;
  /** Width of the displayed Phaser content (post-FIT). */
  width: number;
  /** Height of the displayed Phaser content (post-FIT). */
  height: number;
  /** Canvas-pixel → displayed-pixel scale factor. */
  scale: number;
}

function getFittedCanvasRect(): FittedCanvasRect | null {
  const canvas = getCanvas();
  if (!canvas) return null;
  const rect = canvas.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return null;
  // FIT preserves aspect — the bottleneck is the smaller of the
  // two scale factors.
  const fitScale = Math.min(rect.width / canvas.width, rect.height / canvas.height);
  const displayedWidth = canvas.width * fitScale;
  const displayedHeight = canvas.height * fitScale;
  // CENTER_BOTH letterbox offset within the DOM rect.
  const offsetX = (rect.width - displayedWidth) / 2;
  const offsetY = (rect.height - displayedHeight) / 2;
  return {
    left: rect.left + offsetX,
    top: rect.top + offsetY,
    width: displayedWidth,
    height: displayedHeight,
    scale: fitScale,
  };
}

function projectCellToScreen(col: number, row: number): ScreenAnchor | null {
  const fit = getFittedCanvasRect();
  if (!fit) return null;
  // Cell center in world coords (relative to canvas's intrinsic
  // dimensions). gridX / gridY include the dynamic grid offset.
  const worldX = gridX(col);
  const worldY = gridY(row);
  return {
    x: fit.left + worldX * fit.scale,
    y: fit.top + worldY * fit.scale,
    tileSize: TILE_SIZE * fit.scale,
  };
}

/** Inverse of projectCellToScreen: viewport pixel → grid cell.
 *  Used by the drag handler. Correctly accounts for the FIT
 *  letterbox offset. */
function screenToCell(screenX: number, screenY: number): { col: number; row: number } | null {
  const fit = getFittedCanvasRect();
  if (!fit) return null;
  // Translate page coords into displayed-canvas coords, then divide
  // out the FIT scale to recover canvas-intrinsic coords.
  const canvasX = (screenX - fit.left) / fit.scale;
  const canvasY = (screenY - fit.top)  / fit.scale;
  return {
    col: pixelToCol(canvasX),
    row: pixelToRow(canvasY),
  };
}

/** Double-tap detection window (ms). Two pointerups on the drag
 *  handle within this window commit the placement. Tuned for mobile
 *  ergonomics — long enough to forgive a slow second tap, short
 *  enough to not mis-fire on intentional single taps. */
const DOUBLE_TAP_WINDOW_MS = 400;
/** Drag-distance threshold (px). Pointerup-after-down only counts
 *  as a tap if the total move was below this; longer travel was a
 *  drag and shouldn't count toward the double-tap. */
const TAP_TRAVEL_THRESHOLD_PX = 6;

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
      {/* Drag handle covers the ghost cell. Pointer-down + pointer-
          move drags the ghost; pointer-up either ends drag or counts
          as the first/second half of a double-tap (commit). */}
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

/** Transparent drag handle over the ghost cell. Three responsibilities:
 *
 *   1. Pointer-down + pointer-move dispatches `movePlacementGhost`
 *      via the store so the ghost follows the finger.
 *   2. Pointer-up after no meaningful drag travel counts as a TAP.
 *      Two taps within DOUBLE_TAP_WINDOW_MS commit the placement —
 *      mobile ergonomic alternative to reaching the tick button.
 *   3. `touch-action: none` disables browser scroll / pinch so the
 *      drag isn't fighting the page.
 */
function DragHandle({ x, y, size }: DragHandleProps) {
  const dragging = useRef(false);
  // Track pointer-down position so we can distinguish a tap from a
  // drag at pointer-up time.
  const downAt = useRef<{ x: number; y: number; ts: number } | null>(null);
  // Last pointer-up that counted as a tap. If this fires twice within
  // DOUBLE_TAP_WINDOW_MS we treat it as a double-tap commit.
  const lastTapTs = useRef<number>(0);

  return (
    <div
      data-testid="placement-gate-drag-handle"
      role="presentation"
      onPointerDown={(e: PointerEvent) => {
        dragging.current = true;
        downAt.current = { x: e.clientX, y: e.clientY, ts: Date.now() };
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
        // Double-tap-to-commit: detect a tap (low travel since
        // pointerdown) within DOUBLE_TAP_WINDOW_MS of the prior tap.
        const down = downAt.current;
        downAt.current = null;
        if (!down) return;
        const dx = e.clientX - down.x;
        const dy = e.clientY - down.y;
        const travel = Math.hypot(dx, dy);
        if (travel > TAP_TRAVEL_THRESHOLD_PX) {
          // It was a drag, not a tap. Reset the tap tracker so a
          // drag-then-tap doesn't accidentally fire a double-tap
          // commit on the very next tap.
          lastTapTs.current = 0;
          return;
        }
        const now = Date.now();
        if (lastTapTs.current && now - lastTapTs.current <= DOUBLE_TAP_WINDOW_MS) {
          // Second tap inside the window — commit.
          lastTapTs.current = 0;
          GameUIStore.onPlacementCommit();
          return;
        }
        lastTapTs.current = now;
      }}
      onPointerCancel={() => {
        dragging.current = false;
        downAt.current = null;
      }}
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
