import { describe, expect, it } from 'vitest';
import { findNextPlacement, findPlacementAtCell, normalizePlacement } from './board.utils';
import { BoardPlacement } from '../models/app.models';

describe('board.utils', () => {
  it('finds the next open placement on the grid', () => {
    const placements: BoardPlacement[] = [
      { taskId: 'a', workspaceId: 'w1', x: 0, y: 0, w: 4, h: 2, order: 0 },
      { taskId: 'b', workspaceId: 'w1', x: 4, y: 0, w: 4, h: 2, order: 1 },
    ];

    expect(findNextPlacement(placements, 'w1')).toMatchObject({ x: 8, y: 0, w: 4, h: 2 });
  });

  it('relocates a colliding placement to a free slot', () => {
    const placements: BoardPlacement[] = [
      { taskId: 'a', workspaceId: 'w1', x: 0, y: 0, w: 4, h: 2, order: 0 },
      { taskId: 'b', workspaceId: 'w1', x: 4, y: 0, w: 4, h: 2, order: 1 },
    ];

    const next = normalizePlacement({ taskId: 'c', workspaceId: 'w1', x: 0, y: 0, w: 4, h: 2, order: 2 }, placements);

    expect(next).toMatchObject({ x: 8, y: 0, w: 4, h: 2 });
  });

  it('finds a placement occupying a target cell', () => {
    const placements: BoardPlacement[] = [
      { taskId: 'a', workspaceId: 'w1', x: 0, y: 0, w: 4, h: 2, order: 0 },
      { taskId: 'b', workspaceId: 'w1', x: 4, y: 0, w: 4, h: 2, order: 1 },
    ];

    expect(findPlacementAtCell(placements, 'w1', 5, 1)?.taskId).toBe('b');
    expect(findPlacementAtCell(placements, 'w1', 5, 1, 'b')).toBeNull();
  });
});
