import { BoardPlacement } from '../models/app.models';

const DEFAULT_W = 4;
const DEFAULT_H = 2;

export function findNextPlacement(
  placements: BoardPlacement[],
  workspaceId: string,
  columns = 12,
  preferredW = DEFAULT_W,
  preferredH = DEFAULT_H,
): BoardPlacement {
  const workspacePlacements = placements.filter((entry) => entry.workspaceId === workspaceId);
  const occupied = buildOccupancy(workspacePlacements);

  for (let y = 0; y < 100; y += 1) {
    for (let x = 0; x <= columns - preferredW; x += 1) {
      if (canPlace(occupied, x, y, preferredW, preferredH, columns)) {
        return {
          taskId: '',
          workspaceId,
          x,
          y,
          w: preferredW,
          h: preferredH,
          order: workspacePlacements.length,
        };
      }
    }
  }

  return {
    taskId: '',
    workspaceId,
    x: 0,
    y: workspacePlacements.length * preferredH,
    w: preferredW,
    h: preferredH,
    order: workspacePlacements.length,
  };
}

export function normalizePlacement(
  placement: BoardPlacement,
  others: BoardPlacement[],
  columns = 12,
): BoardPlacement {
  const clamped: BoardPlacement = {
    ...placement,
    x: Math.max(0, Math.min(columns - placement.w, placement.x)),
    y: Math.max(0, placement.y),
    w: Math.max(2, Math.min(columns, placement.w)),
    h: Math.max(2, placement.h),
  };

  const occupied = buildOccupancy(others.filter((entry) => entry.taskId !== placement.taskId));

  if (canPlace(occupied, clamped.x, clamped.y, clamped.w, clamped.h, columns)) {
    return clamped;
  }

  const relocated = findNextPlacement(others.filter((entry) => entry.taskId !== placement.taskId), placement.workspaceId, columns, clamped.w, clamped.h);
  return {
    ...clamped,
    x: relocated.x,
    y: relocated.y,
  };
}

export function findPlacementAtCell(
  placements: BoardPlacement[],
  workspaceId: string,
  x: number,
  y: number,
  excludeTaskId?: string,
): BoardPlacement | null {
  return (
    placements.find(
      (placement) =>
        placement.workspaceId === workspaceId &&
        placement.taskId !== excludeTaskId &&
        x >= placement.x &&
        x < placement.x + placement.w &&
        y >= placement.y &&
        y < placement.y + placement.h,
    ) ?? null
  );
}

function buildOccupancy(placements: BoardPlacement[]): Set<string> {
  const occupied = new Set<string>();

  for (const placement of placements) {
    for (let y = placement.y; y < placement.y + placement.h; y += 1) {
      for (let x = placement.x; x < placement.x + placement.w; x += 1) {
        occupied.add(cellKey(x, y));
      }
    }
  }

  return occupied;
}

function canPlace(occupied: Set<string>, x: number, y: number, w: number, h: number, columns: number): boolean {
  if (x < 0 || y < 0 || x + w > columns) {
    return false;
  }

  for (let row = y; row < y + h; row += 1) {
    for (let col = x; col < x + w; col += 1) {
      if (occupied.has(cellKey(col, row))) {
        return false;
      }
    }
  }

  return true;
}

function cellKey(x: number, y: number): string {
  return `${x}:${y}`;
}
