import { AppSnapshot, Workspace, TaskGroup, TaskTile, BoardPlacement } from './app.models';

export const APP_STORAGE_VERSION = 1;

export const DEFAULT_GROUPS = [
  { name: 'Focus', accent: '#b97346' },
  { name: 'Creative', accent: '#c47f53' },
  { name: 'Personal', accent: '#93674e' },
  { name: 'Admin', accent: '#7b5745' },
] as const;

export const EMPTY_RICH_TEXT_DOC: Record<string, unknown> = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
};

export function createId(prefix: string): string {
  const randomPart = Math.random().toString(36).slice(2, 9);
  return `${prefix}-${Date.now().toString(36)}-${randomPart}`;
}

export function createInitialSnapshot(): AppSnapshot {
  const now = new Date().toISOString();
  const workspace: Workspace = {
    id: createId('workspace'),
    name: 'Atelier Lucent',
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
  };

  const groups = DEFAULT_GROUPS.map<TaskGroup>((entry, index) => ({
    id: createId('group'),
    workspaceId: workspace.id,
    name: entry.name,
    accent: entry.accent,
    sortOrder: index,
    createdAt: now,
    updatedAt: now,
  }));

  const tasks: TaskTile[] = [
    {
      id: createId('task'),
      workspaceId: workspace.id,
      groupId: groups[0]?.id ?? null,
      dueDate: toDateInputValue(addDays(new Date(), 0)),
      status: 'active',
      createdAt: now,
      updatedAt: now,
      completedAt: null,
      richTextDoc: docWithText('Morning pages', '20 minutes of free writing to clear mental noise.'),
    },
    {
      id: createId('task'),
      workspaceId: workspace.id,
      groupId: groups[1]?.id ?? null,
      dueDate: toDateInputValue(addDays(new Date(), 1)),
      status: 'active',
      createdAt: now,
      updatedAt: now,
      completedAt: null,
      richTextDoc: docWithText('Shape Lucent Quoll board language', 'Refine rhythm, spacing, and interaction weight for the main canvas.'),
    },
    {
      id: createId('task'),
      workspaceId: workspace.id,
      groupId: groups[3]?.id ?? null,
      dueDate: toDateInputValue(addDays(new Date(), -1)),
      status: 'active',
      createdAt: now,
      updatedAt: now,
      completedAt: null,
      richTextDoc: docWithText('Review deployment path', 'Verify GitHub Pages build base-href and service worker scope.'),
    },
  ];

  const placements: BoardPlacement[] = [
    { taskId: tasks[0]!.id, workspaceId: workspace.id, x: 0, y: 0, w: 3, h: 2, order: 0 },
    { taskId: tasks[1]!.id, workspaceId: workspace.id, x: 3, y: 0, w: 5, h: 3, order: 1 },
    { taskId: tasks[2]!.id, workspaceId: workspace.id, x: 8, y: 0, w: 4, h: 2, order: 2 },
  ];

  return {
    version: APP_STORAGE_VERSION,
    exportedAt: now,
    workspaces: [workspace],
    groups,
    tasks,
    placements,
    preferences: {
      activeWorkspaceId: workspace.id,
      activeFilter: 'all',
      selectedTaskId: tasks[0]!.id,
      selectedGroupId: null,
      sidebarCollapsed: false,
      inspectorOpen: true,
      lastRoute: '/',
      searchQuery: '',
    },
  };
}

export function docWithText(heading: string, body: string): Record<string, unknown> {
  return {
    type: 'doc',
    content: [
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: heading }],
      },
      {
        type: 'paragraph',
        content: [{ type: 'text', text: body }],
      },
    ],
  };
}

export function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}
