import { AppSnapshot, BoardPlacement, TaskTile, WorkspaceExportPayload, FullExportPayload } from '../models/app.models';
import { APP_STORAGE_VERSION, createInitialSnapshot } from '../models/defaults';

export function normalizeSnapshot(snapshot: AppSnapshot | null): AppSnapshot {
  if (!snapshot) {
    return createInitialSnapshot();
  }

  if (snapshot.version > APP_STORAGE_VERSION) {
    throw new Error('This data was created by a newer version of Lucent Quoll.');
  }

  if (snapshot.version < 1) {
    throw new Error('Unsupported Lucent Quoll snapshot version.');
  }

  return {
    ...createInitialSnapshot(),
    ...snapshot,
    version: APP_STORAGE_VERSION,
    exportedAt: snapshot.exportedAt ?? new Date().toISOString(),
    workspaces: [...snapshot.workspaces],
    groups: [...snapshot.groups],
    tasks: [...snapshot.tasks],
    placements: [...snapshot.placements],
    preferences: {
      ...createInitialSnapshot().preferences,
      ...snapshot.preferences,
    },
  };
}

export function cloneSnapshot(snapshot: AppSnapshot): AppSnapshot {
  return JSON.parse(JSON.stringify(snapshot)) as AppSnapshot;
}

export function buildWorkspaceExport(snapshot: AppSnapshot, workspaceId: string): WorkspaceExportPayload {
  const workspace = snapshot.workspaces.find((entry) => entry.id === workspaceId);

  if (!workspace) {
    throw new Error('Workspace not found.');
  }

  const groups = snapshot.groups.filter((entry) => entry.workspaceId === workspaceId);
  const tasks = snapshot.tasks.filter((entry) => entry.workspaceId === workspaceId);
  const placements = snapshot.placements.filter((entry) => entry.workspaceId === workspaceId);

  return {
    version: APP_STORAGE_VERSION,
    exportedAt: new Date().toISOString(),
    workspace,
    groups,
    tasks,
    placements,
  };
}

export function buildFullExport(snapshot: AppSnapshot): FullExportPayload {
  return {
    version: APP_STORAGE_VERSION,
    exportedAt: new Date().toISOString(),
    snapshot: cloneSnapshot(snapshot),
  };
}

export function isWorkspaceExportPayload(value: unknown): value is WorkspaceExportPayload {
  return (
    hasObjectShape(value) &&
    hasObjectShape(value['workspace']) &&
    Array.isArray(value['groups']) &&
    Array.isArray(value['tasks'])
  );
}

export function isFullExportPayload(value: unknown): value is FullExportPayload {
  return hasObjectShape(value) && hasObjectShape(value['snapshot']) && Array.isArray((value['snapshot'] as Record<string, unknown>)['workspaces']);
}

export function repairPlacements(snapshot: AppSnapshot): AppSnapshot {
  const existingPlacements = new Map(snapshot.placements.map((placement) => [placement.taskId, placement]));
  const placements: BoardPlacement[] = snapshot.tasks.map((task, index) => {
    const current = existingPlacements.get(task.id);
    return current ?? { taskId: task.id, workspaceId: task.workspaceId, x: index * 2, y: index, w: 4, h: 2, order: index };
  });

  return {
    ...snapshot,
    placements,
  };
}

export function reviveTask(task: TaskTile): TaskTile {
  return {
    ...task,
    richTextDoc: hasObjectShape(task.richTextDoc) ? task.richTextDoc : { type: 'doc', content: [{ type: 'paragraph' }] },
  };
}

function hasObjectShape(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null;
}
