/**
 * FloorMap — percentage-positioned canvas of table tiles.
 * Supports read-only view and edit-layout drag mode.
 *
 * File is dash-prefixed so TanStack Router ignores it as a route.
 */
import { useRef } from 'react';
import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/status';
import type { Tone } from '@/components/ui/status';
import type { TableStatus } from '@restaurant/shared';
import type { TableDto, TableDtoShape } from '@/api/restaurantManagerAPI.schemas';

// ── Status tone map ───────────────────────────────────────────────────

const STATUS_TONE: Record<TableStatus, Tone> = {
  available: 'success',
  occupied: 'info',
  reserved: 'warning',
};

// Tailwind classes for each status background — derived from semantic tokens
// (success/info/warning); dark handled per-theme via data-theme, not `.dark`.
export const STATUS_BG: Record<TableStatus, string> = {
  available: 'bg-success/10 border-success/30',
  occupied: 'bg-info/10 border-info/30',
  reserved: 'bg-warning/10 border-warning/30',
};

// ── Tile sizing by seats ──────────────────────────────────────────────

function tileSizeClass(seats: number): string {
  if (seats <= 2) return 'h-14 w-14';
  if (seats <= 4) return 'h-16 w-16';
  return 'h-20 w-20';
}

// ── Position map (edit-mode overrides) ───────────────────────────────

export interface PositionOverride {
  posX: number;
  posY: number;
  shape: TableDtoShape;
}

// ── FloorMap props ────────────────────────────────────────────────────

export interface FloorMapProps {
  tables: TableDto[];
  onTableClick: (table: TableDto) => void;
  // Edit-mode props — omit for read-only
  editMode?: boolean;
  positions?: Record<string, PositionOverride>;
  onDrop?: (tableId: string, posX: number, posY: number) => void;
  onDragStart?: (tableId: string) => void;
  draggingId?: string | null;
  onShapeToggle?: (tableId: string) => void;
}

function clamp(val: number, min: number, max: number) {
  return Math.min(Math.max(val, min), max);
}

// ── Tile component ────────────────────────────────────────────────────

interface TileProps {
  table: TableDto;
  posX: number;
  posY: number;
  shape: TableDtoShape;
  editMode: boolean;
  isDragging: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onClick: () => void;
  onShapeToggle?: () => void;
}

function Tile({
  table,
  posX,
  posY,
  shape,
  editMode,
  isDragging,
  onPointerDown,
  onClick,
  onShapeToggle,
}: TileProps) {
  const statusKey = table.status as TableStatus;
  const sizeClass = tileSizeClass(table.seats);
  const isRound = shape === 'round';

  return (
    <div
      style={{ left: `${posX}%`, top: `${posY}%`, transform: 'translate(-50%, -50%)' }}
      className={cn(
        'absolute flex flex-col items-center justify-center border-2 shadow-sm select-none',
        sizeClass,
        STATUS_BG[statusKey],
        isRound ? 'rounded-full' : 'rounded-md',
        editMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
        isDragging && 'opacity-60 scale-105 z-20',
        !isDragging && 'hover:shadow-md transition-shadow z-10',
      )}
      onPointerDown={editMode ? onPointerDown : undefined}
      onClick={!editMode ? onClick : undefined}
      role={editMode ? undefined : 'button'}
      aria-label={`Table ${table.number}`}
    >
      <p className="text-xs font-semibold text-foreground leading-none">T{table.number}</p>
      <p className="flex items-center gap-0.5 text-[10px] text-muted-foreground mt-0.5 leading-none">
        <Users className="h-2.5 w-2.5" />
        {table.seats}
      </p>
      {!editMode && (
        <div className="mt-1">
          <StatusBadge tone={STATUS_TONE[statusKey]} label="" />
        </div>
      )}
      {editMode && onShapeToggle && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onShapeToggle();
          }}
          className="mt-0.5 text-[9px] text-muted-foreground hover:text-foreground transition-colors leading-none"
          title="Toggle shape"
        >
          {isRound ? '□' : '○'}
        </button>
      )}
    </div>
  );
}

// ── Main FloorMap ─────────────────────────────────────────────────────

export function FloorMap({
  tables,
  onTableClick,
  editMode = false,
  positions = {},
  onDrop,
  onDragStart,
  draggingId = null,
  onShapeToggle,
}: FloorMapProps) {
  const canvasRef = useRef<HTMLDivElement>(null);

  // Resolve position: edit-mode override → server posX/posY → null
  function getPos(table: TableDto): { posX: number; posY: number; shape: TableDtoShape } | null {
    const override = positions[table.id];
    if (override) return override;
    if (table.posX != null && table.posY != null) {
      return { posX: table.posX, posY: table.posY, shape: table.shape as TableDtoShape };
    }
    return null;
  }

  const placed = tables.filter((t) => getPos(t) !== null);
  const unplaced = tables.filter((t) => getPos(t) === null);

  function handlePointerDown(table: TableDto, e: React.PointerEvent) {
    e.preventDefault();
    onDragStart?.(table.id);
    const canvas = canvasRef.current;
    if (!canvas) return;

    function handleMove(me: PointerEvent) {
      const rect = canvas!.getBoundingClientRect();
      const posX = clamp(((me.clientX - rect.left) / rect.width) * 100, 2, 98);
      const posY = clamp(((me.clientY - rect.top) / rect.height) * 100, 2, 98);
      onDrop?.(table.id, posX, posY);
    }

    function handleUp() {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    }

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  }

  // Edit mode: allow dropping unplaced tables onto canvas
  function handleCanvasPointerUp(e: React.PointerEvent) {
    if (!editMode || !draggingId) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const posX = clamp(((e.clientX - rect.left) / rect.width) * 100, 2, 98);
    const posY = clamp(((e.clientY - rect.top) / rect.height) * 100, 2, 98);
    onDrop?.(draggingId, posX, posY);
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Canvas */}
      <div
        ref={canvasRef}
        className={cn(
          'relative w-full min-h-[420px] bg-card border border-border rounded-lg overflow-hidden',
          editMode && 'ring-2 ring-accent/40',
        )}
        style={{ aspectRatio: '3/2' }}
        onPointerUp={handleCanvasPointerUp}
      >
        {placed.map((table) => {
          const pos = getPos(table)!;
          return (
            <Tile
              key={table.id}
              table={table}
              posX={pos.posX}
              posY={pos.posY}
              shape={pos.shape}
              editMode={editMode}
              isDragging={draggingId === table.id}
              onPointerDown={(e) => handlePointerDown(table, e)}
              onClick={() => onTableClick(table)}
              onShapeToggle={onShapeToggle ? () => onShapeToggle(table.id) : undefined}
            />
          );
        })}

        {placed.length === 0 && !editMode && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">No tables placed yet</p>
          </div>
        )}

        {placed.length === 0 && editMode && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-sm text-muted-foreground">Drag tables from the tray below</p>
          </div>
        )}
      </div>

      {/* Unplaced tray (edit mode only) */}
      {editMode && unplaced.length > 0 && (
        <div className="rounded-lg border border-dashed border-border p-3">
          <p className="text-xs text-muted-foreground mb-2 font-medium">
            Unplaced — drag onto canvas
          </p>
          <div className="flex flex-wrap gap-2">
            {unplaced.map((table) => {
              const statusKey = table.status as TableStatus;
              return (
                <div
                  key={table.id}
                  className={cn(
                    'flex flex-col items-center justify-center border-2 rounded-md h-14 w-14 cursor-grab active:cursor-grabbing select-none',
                    STATUS_BG[statusKey],
                    draggingId === table.id && 'opacity-60 ring-2 ring-accent',
                  )}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    onDragStart?.(table.id);

                    const canvas = canvasRef.current;

                    function handleMove(me: PointerEvent) {
                      if (!canvas) return;
                      const rect = canvas.getBoundingClientRect();
                      const inCanvas =
                        me.clientX >= rect.left &&
                        me.clientX <= rect.right &&
                        me.clientY >= rect.top &&
                        me.clientY <= rect.bottom;
                      if (inCanvas) {
                        const posX = clamp(
                          ((me.clientX - rect.left) / rect.width) * 100,
                          2,
                          98,
                        );
                        const posY = clamp(
                          ((me.clientY - rect.top) / rect.height) * 100,
                          2,
                          98,
                        );
                        onDrop?.(table.id, posX, posY);
                      }
                    }

                    function handleUp() {
                      window.removeEventListener('pointermove', handleMove);
                      window.removeEventListener('pointerup', handleUp);
                    }

                    window.addEventListener('pointermove', handleMove);
                    window.addEventListener('pointerup', handleUp);
                  }}
                >
                  <p className="text-xs font-semibold text-foreground leading-none">
                    T{table.number}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-none">
                    {table.seats}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
