import { describe, expect, it } from 'vitest';
import { TaskTile } from '../models/app.models';
import { bucketArchivedTasks, deriveTaskState, matchesTaskFilter } from './task-logic';
import { buildTaskView } from './task-logic';

const now = new Date('2026-06-14T10:00:00Z');

function task(overrides: Partial<TaskTile>): TaskTile {
  return {
    id: 'task-1',
    workspaceId: 'workspace-1',
    groupId: null,
    richTextDoc: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Test task' }] }] },
    dueDate: null,
    status: 'active',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    completedAt: null,
    ...overrides,
  };
}

describe('task logic', () => {
  it('derives overdue, today, and upcoming states', () => {
    expect(deriveTaskState(task({ dueDate: '2026-06-13' }), now)).toBe('overdue');
    expect(deriveTaskState(task({ dueDate: '2026-06-14' }), now)).toBe('today');
    expect(deriveTaskState(task({ dueDate: '2026-06-15' }), now)).toBe('upcoming');
  });

  it('matches filters based on status and due dates', () => {
    expect(matchesTaskFilter(task({ dueDate: '2026-06-14' }), 'today', now)).toBe(true);
    expect(matchesTaskFilter(task({ dueDate: '2026-06-15' }), 'today', now)).toBe(false);
    expect(matchesTaskFilter(task({ status: 'completed', completedAt: now.toISOString() }), 'archive', now)).toBe(true);
  });

  it('buckets archived tasks by date windows', () => {
    const archivedToday = buildTaskView(
      task({ status: 'completed', completedAt: '2026-06-14T08:00:00Z' }),
      null,
      { taskId: 'task-1', workspaceId: 'workspace-1', x: 0, y: 0, w: 4, h: 2, order: 0 },
      now,
    );
    const archivedEarlier = buildTaskView(
      task({ id: 'task-2', status: 'completed', completedAt: '2026-06-01T08:00:00Z' }),
      null,
      { taskId: 'task-2', workspaceId: 'workspace-1', x: 0, y: 0, w: 4, h: 2, order: 0 },
      now,
    );

    const buckets = bucketArchivedTasks([archivedToday, archivedEarlier], now);
    expect(buckets.map((bucket) => bucket.label)).toEqual(['Today', 'Earlier']);
  });
});
