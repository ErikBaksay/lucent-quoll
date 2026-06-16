export type TaskStatus = 'active' | 'completed';
export type BoardFilter = 'all' | 'today' | 'upcoming' | 'overdue' | 'archive';
export type ToastTone = 'neutral' | 'success' | 'danger';

export interface Workspace {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface TaskGroup {
  id: string;
  workspaceId: string;
  name: string;
  accent: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskTile {
  id: string;
  workspaceId: string;
  groupId: string | null;
  richTextDoc: Record<string, unknown>;
  dueDate: string | null;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface BoardPlacement {
  taskId: string;
  workspaceId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  order: number;
}

export interface UiPreferences {
  activeWorkspaceId: string | null;
  activeFilter: BoardFilter;
  selectedTaskId: string | null;
  selectedGroupId: string | null;
  sidebarCollapsed: boolean;
  inspectorOpen: boolean;
  lastRoute: string;
  searchQuery: string;
}

export interface AppSnapshot {
  version: number;
  exportedAt: string;
  workspaces: Workspace[];
  groups: TaskGroup[];
  tasks: TaskTile[];
  placements: BoardPlacement[];
  preferences: UiPreferences;
}

export interface CreateTaskDraft {
  workspaceId: string;
  groupId?: string | null;
  dueDate?: string | null;
  richTextDoc?: Record<string, unknown>;
}

export interface UpdateTaskDraft {
  groupId?: string | null;
  dueDate?: string | null;
  richTextDoc?: Record<string, unknown>;
}

export interface BoardTaskView {
  task: TaskTile;
  group: TaskGroup | null;
  placement: BoardPlacement;
  state: 'normal' | 'today' | 'upcoming' | 'overdue';
  previewText: string;
}

export interface ArchiveBucket {
  label: string;
  tasks: BoardTaskView[];
}

export interface BoardGeometry {
  columns: number;
  cellWidth: number;
  cellHeight: number;
  gap: number;
}

export interface ToastMessage {
  id: string;
  tone: ToastTone;
  title: string;
  body: string;
  actionLabel?: string;
}

export interface WorkspaceExportPayload {
  version: number;
  exportedAt: string;
  workspace: Workspace;
  groups: TaskGroup[];
  tasks: TaskTile[];
  placements: BoardPlacement[];
}

export interface FullExportPayload {
  version: number;
  exportedAt: string;
  snapshot: AppSnapshot;
}
