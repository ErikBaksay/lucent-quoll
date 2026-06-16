import { computed, inject, Injectable, signal } from '@angular/core';
import {
  AppSnapshot,
  BoardFilter,
  BoardPlacement,
  BoardTaskView,
  CreateTaskDraft,
  TaskGroup,
  TaskTile,
  UpdateTaskDraft,
  Workspace,
} from '../models/app.models';
import { APP_STORAGE_VERSION, DEFAULT_GROUPS, EMPTY_RICH_TEXT_DOC, createId } from '../models/defaults';
import { STORAGE_ENGINE } from '../tokens/storage-engine.token';
import { buildFullExport, buildWorkspaceExport, cloneSnapshot, isFullExportPayload, isWorkspaceExportPayload, normalizeSnapshot, repairPlacements, reviveTask } from '../utils/snapshot.utils';
import { bucketArchivedTasks, buildTaskView, matchesTaskFilter, searchTask } from '../utils/task-logic';
import { findNextPlacement, findPlacementAtCell, normalizePlacement } from '../utils/board.utils';
import { DialogService } from './dialog.service';
import { FileDownloadService } from './file-download.service';
import { ToastService } from './toast.service';

@Injectable({ providedIn: 'root' })
export class AppStateService {
  private readonly storage = inject(STORAGE_ENGINE);
  private readonly downloads = inject(FileDownloadService);
  private readonly toasts = inject(ToastService);
  private readonly dialogs = inject(DialogService);

  private readonly snapshotState = signal<AppSnapshot>(normalizeSnapshot(null));
  private readonly saveQueue = signal(Promise.resolve());
  private lastCompletedTask: TaskTile | null = null;
  private hasHydrated = false;
  private pendingRoute: string | null = null;

  readonly isReady = signal(false);
  readonly isPersisting = signal(false);
  readonly error = signal<string | null>(null);

  readonly preferences = computed(() => this.snapshotState().preferences);
  readonly workspaces = computed(() => this.snapshotState().workspaces.filter((workspace) => !workspace.archivedAt));
  readonly activeWorkspaceId = computed(() => this.preferences().activeWorkspaceId ?? this.workspaces()[0]?.id ?? null);
  readonly activeWorkspace = computed(() => this.workspaces().find((entry) => entry.id === this.activeWorkspaceId()) ?? null);
  readonly groups = computed(() =>
    this.snapshotState()
      .groups.filter((group) => group.workspaceId === this.activeWorkspaceId())
      .sort((left, right) => left.sortOrder - right.sortOrder),
  );
  readonly tasks = computed(() => this.snapshotState().tasks.map(reviveTask));
  readonly placements = computed(() => this.snapshotState().placements);
  readonly selectedTask = computed(() => this.tasks().find((task) => task.id === this.preferences().selectedTaskId) ?? null);

  readonly visibleBoardTasks = computed(() => {
    const workspace = this.activeWorkspace();
    const workspaceId = workspace?.id;
    const filter = this.preferences().activeFilter;
    const selectedGroupId = this.preferences().selectedGroupId;
    const now = new Date();

    if (!workspaceId) {
      return [] as BoardTaskView[];
    }

    return this.tasks()
      .filter((task) => task.workspaceId === workspaceId)
      .filter((task) => matchesTaskFilter(task, filter, now))
      .filter((task) => !selectedGroupId || task.groupId === selectedGroupId)
      .filter((task) => searchTask(task, this.groupById(task.groupId), workspace, this.preferences().searchQuery))
      .map((task) => buildTaskView(task, this.groupById(task.groupId), this.placementByTask(task.id), now))
      .sort((left, right) => left.placement.order - right.placement.order);
  });

  readonly activeTasks = computed(() => this.visibleBoardTasks().filter((entry) => entry.task.status === 'active'));
  readonly archivedBuckets = computed(() => bucketArchivedTasks(this.visibleBoardTasks().filter((entry) => entry.task.status === 'completed'), new Date()));
  readonly counts = computed(() => {
    const workspaceId = this.activeWorkspaceId();
    const now = new Date();

    const tasks = this.tasks().filter((task) => task.workspaceId === workspaceId);
    return {
      all: tasks.filter((task) => task.status === 'active').length,
      today: tasks.filter((task) => task.status === 'active' && matchesTaskFilter(task, 'today', now)).length,
      upcoming: tasks.filter((task) => task.status === 'active' && matchesTaskFilter(task, 'upcoming', now)).length,
      overdue: tasks.filter((task) => task.status === 'active' && matchesTaskFilter(task, 'overdue', now)).length,
      archive: tasks.filter((task) => task.status === 'completed').length,
    };
  });

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    try {
      const stored = await this.storage.loadSnapshot();
      const normalized = repairPlacements(normalizeSnapshot(stored));
      this.snapshotState.set(normalized);
      this.applyPendingRoute();
      this.error.set(null);
    } catch (error: unknown) {
      this.error.set(error instanceof Error ? error.message : 'Unable to load Lucent Quoll data.');
      this.snapshotState.set(normalizeSnapshot(null));
      this.applyPendingRoute();
    } finally {
      this.hasHydrated = true;
      this.isReady.set(true);
    }
  }

  setRoute(route: string): void {
    if (!this.hasHydrated) {
      this.pendingRoute = route;
      return;
    }

    this.patchPreferences({ lastRoute: route });
  }

  setSearchQuery(searchQuery: string): void {
    this.patchPreferences({ searchQuery });
  }

  setFilter(activeFilter: BoardFilter): void {
    this.patchPreferences({ activeFilter });
  }

  selectGroup(groupId: string | null): void {
    this.patchPreferences({ selectedGroupId: groupId, activeFilter: groupId ? 'all' : this.preferences().activeFilter });
  }

  toggleSidebar(): void {
    this.patchPreferences({ sidebarCollapsed: !this.preferences().sidebarCollapsed });
  }

  toggleInspector(force?: boolean): void {
    this.patchPreferences({ inspectorOpen: force ?? !this.preferences().inspectorOpen });
  }

  selectTask(taskId: string | null): void {
    this.patchPreferences({ selectedTaskId: taskId, inspectorOpen: taskId ? true : this.preferences().inspectorOpen });
  }

  createTask(draft: CreateTaskDraft): void {
    const now = new Date().toISOString();
    const task: TaskTile = {
      id: createId('task'),
      workspaceId: draft.workspaceId,
      groupId: draft.groupId ?? this.groups()[0]?.id ?? null,
      dueDate: draft.dueDate ?? null,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      completedAt: null,
      richTextDoc: draft.richTextDoc ?? EMPTY_RICH_TEXT_DOC,
    };

    const nextPlacement = findNextPlacement(this.placements(), task.workspaceId);
    const placement: BoardPlacement = {
      ...nextPlacement,
      taskId: task.id,
    };

    this.patchSnapshot({
      tasks: [task, ...this.snapshotState().tasks],
      placements: [...this.snapshotState().placements, placement],
      preferences: {
        ...this.preferences(),
        selectedTaskId: task.id,
        inspectorOpen: true,
      },
    });
  }

  updateTask(taskId: string, draft: UpdateTaskDraft): void {
    const updatedAt = new Date().toISOString();
    this.patchSnapshot({
      tasks: this.snapshotState().tasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              groupId: draft.groupId !== undefined ? draft.groupId : task.groupId,
              dueDate: draft.dueDate !== undefined ? draft.dueDate : task.dueDate,
              richTextDoc: draft.richTextDoc ?? task.richTextDoc,
              updatedAt,
            }
          : task,
      ),
    });
  }

  completeTask(taskId: string): void {
    const now = new Date().toISOString();
    const task = this.snapshotState().tasks.find((entry) => entry.id === taskId);
    if (!task) {
      return;
    }

    this.lastCompletedTask = task;
    this.patchSnapshot({
      tasks: this.snapshotState().tasks.map((entry) =>
        entry.id === taskId ? { ...entry, status: 'completed', completedAt: now, updatedAt: now } : entry,
      ),
      preferences: {
        ...this.preferences(),
        selectedTaskId: this.preferences().selectedTaskId === taskId ? null : this.preferences().selectedTaskId,
      },
    });

    const toastId = this.toasts.push({
      tone: 'success',
      title: 'Task archived',
      body: 'The task moved into history and can be restored once.',
      actionLabel: 'Undo',
    });

    setTimeout(() => this.toasts.dismiss(toastId), 4500);
  }

  undoLastCompletion(): void {
    if (!this.lastCompletedTask) {
      return;
    }

    const taskId = this.lastCompletedTask.id;
    this.lastCompletedTask = null;

    this.patchSnapshot({
      tasks: this.snapshotState().tasks.map((task) =>
        task.id === taskId ? { ...task, status: 'active', completedAt: null, updatedAt: new Date().toISOString() } : task,
      ),
    });
  }

  deleteTask(taskId: string): void {
    this.patchSnapshot({
      tasks: this.snapshotState().tasks.filter((task) => task.id !== taskId),
      placements: this.snapshotState().placements.filter((placement) => placement.taskId !== taskId),
      preferences: {
        ...this.preferences(),
        selectedTaskId: this.preferences().selectedTaskId === taskId ? null : this.preferences().selectedTaskId,
      },
    });
  }

  moveTask(taskId: string, x: number, y: number): void {
    const current = this.placementByTask(taskId);
    if (!current) {
      return;
    }

    const target = findPlacementAtCell(this.snapshotState().placements, current.workspaceId, x, y, taskId);

    if (target) {
      this.patchSnapshot({
        placements: this.snapshotState().placements.map((placement) => {
          if (placement.taskId === taskId) {
            return {
              ...placement,
              x: target.x,
              y: target.y,
              order: target.order,
            };
          }

          if (placement.taskId === target.taskId) {
            return {
              ...placement,
              x: current.x,
              y: current.y,
              order: current.order,
            };
          }

          return placement;
        }),
      });
      return;
    }

    const next = normalizePlacement({ ...current, x, y }, this.snapshotState().placements);
    this.patchSnapshot({
      placements: this.snapshotState().placements.map((placement) => (placement.taskId === taskId ? next : placement)),
    });
  }

  resizeTask(taskId: string, w: number, h: number): void {
    const current = this.placementByTask(taskId);
    if (!current) {
      return;
    }

    const next = normalizePlacement({ ...current, w, h }, this.snapshotState().placements);
    this.patchSnapshot({
      placements: this.snapshotState().placements.map((placement) => (placement.taskId === taskId ? next : placement)),
    });
  }

  createWorkspace(name: string): void {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }

    const now = new Date().toISOString();
    const workspace: Workspace = {
      id: createId('workspace'),
      name: trimmed,
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
    };

    const groups = DEFAULT_GROUPS.map((entry, index): TaskGroup => ({
      id: createId('group'),
      workspaceId: workspace.id,
      name: entry.name,
      accent: entry.accent,
      sortOrder: index,
      createdAt: now,
      updatedAt: now,
    }));

    this.patchSnapshot({
      workspaces: [...this.snapshotState().workspaces, workspace],
      groups: [...this.snapshotState().groups, ...groups],
      preferences: {
        ...this.preferences(),
        activeWorkspaceId: workspace.id,
        selectedGroupId: null,
        selectedTaskId: null,
      },
    });
  }

  renameWorkspace(workspaceId: string, name: string): void {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }

    this.patchSnapshot({
      workspaces: this.snapshotState().workspaces.map((workspace) =>
        workspace.id === workspaceId ? { ...workspace, name: trimmed, updatedAt: new Date().toISOString() } : workspace,
      ),
    });
  }

  switchWorkspace(workspaceId: string): void {
    this.patchPreferences({
      activeWorkspaceId: workspaceId,
      selectedGroupId: null,
      selectedTaskId: null,
      activeFilter: 'all',
      searchQuery: '',
    });
  }

  requestDeleteWorkspace(workspaceId: string): void {
    if (this.workspaces().length <= 1) {
      this.toasts.push({
        tone: 'danger',
        title: 'Workspace retained',
        body: 'Lucent Quoll keeps at least one active workspace available.',
      });
      return;
    }

    const workspace = this.snapshotState().workspaces.find((entry) => entry.id === workspaceId);
    if (!workspace) {
      return;
    }

    this.dialogs.openConfirm({
      title: 'Delete workspace',
      body: `Delete ${workspace.name} and all of its tasks, groups, and history?`,
      confirmLabel: 'Delete workspace',
      cancelLabel: 'Keep workspace',
      onConfirm: () => {
        this.deleteWorkspace(workspaceId);
        this.dialogs.close();
      },
    });
  }

  createGroup(name: string): void {
    const workspaceId = this.activeWorkspaceId();
    const trimmed = name.trim();
    if (!workspaceId || !trimmed) {
      return;
    }

    const now = new Date().toISOString();
    const group: TaskGroup = {
      id: createId('group'),
      workspaceId,
      name: trimmed,
      accent: '#c18657',
      sortOrder: this.groups().length,
      createdAt: now,
      updatedAt: now,
    };

    this.patchSnapshot({
      groups: [...this.snapshotState().groups, group],
    });
  }

  renameGroup(groupId: string, name: string): void {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }

    this.patchSnapshot({
      groups: this.snapshotState().groups.map((group) =>
        group.id === groupId ? { ...group, name: trimmed, updatedAt: new Date().toISOString() } : group,
      ),
    });
  }

  deleteGroup(groupId: string): void {
    this.patchSnapshot({
      groups: this.snapshotState().groups.filter((group) => group.id !== groupId),
      tasks: this.snapshotState().tasks.map((task) => (task.groupId === groupId ? { ...task, groupId: null } : task)),
      preferences: {
        ...this.preferences(),
        selectedGroupId: this.preferences().selectedGroupId === groupId ? null : this.preferences().selectedGroupId,
      },
    });
  }

  exportActiveWorkspace(): void {
    const workspaceId = this.activeWorkspaceId();
    const workspace = this.activeWorkspace();
    if (!workspaceId || !workspace) {
      return;
    }

    this.downloads.downloadJson(`${slugify(workspace.name)}.lucent-workspace.json`, buildWorkspaceExport(this.snapshotState(), workspaceId));
    this.toasts.push({ tone: 'neutral', title: 'Workspace exported', body: 'A backup file was generated for the active workspace.' });
  }

  exportAll(): void {
    this.downloads.downloadJson('lucent-quoll-backup.json', buildFullExport(this.snapshotState()));
    this.toasts.push({ tone: 'neutral', title: 'Full backup ready', body: 'All workspaces were exported as a versioned snapshot.' });
  }

  async importJson(text: string): Promise<void> {
    try {
      const parsed = JSON.parse(text) as unknown;
      if (isFullExportPayload(parsed)) {
        const normalized = repairPlacements(normalizeSnapshot(parsed.snapshot));
        this.snapshotState.set(normalized);
        this.schedulePersist();
        this.toasts.push({ tone: 'success', title: 'Backup restored', body: 'Lucent Quoll replaced the current local snapshot.' });
        return;
      }

      if (isWorkspaceExportPayload(parsed)) {
        const snapshot = cloneSnapshot(this.snapshotState());
        const workspaceId = createId('workspace');
        const groupIdMap = new Map<string, string>();
        const taskIdMap = new Map<string, string>();
        const now = new Date().toISOString();

        const workspace: Workspace = {
          ...parsed.workspace,
          id: workspaceId,
          name: `${parsed.workspace.name} Copy`,
          createdAt: now,
          updatedAt: now,
          archivedAt: null,
        };

        const groups = parsed.groups.map((group) => {
          const id = createId('group');
          groupIdMap.set(group.id, id);
          return { ...group, id, workspaceId, createdAt: now, updatedAt: now };
        });

        const tasks = parsed.tasks.map((task) => {
          const id = createId('task');
          taskIdMap.set(task.id, id);
          return {
            ...task,
            id,
            workspaceId,
            groupId: task.groupId ? groupIdMap.get(task.groupId) ?? null : null,
            createdAt: now,
            updatedAt: now,
            completedAt: task.status === 'completed' ? task.completedAt : null,
          };
        });

        const placements = parsed.placements.map((placement, index) => ({
          ...placement,
          taskId: taskIdMap.get(placement.taskId) ?? createId('task'),
          workspaceId,
          order: index,
        }));

        this.snapshotState.set({
          ...snapshot,
          workspaces: [...snapshot.workspaces, workspace],
          groups: [...snapshot.groups, ...groups],
          tasks: [...snapshot.tasks, ...tasks],
          placements: [...snapshot.placements, ...placements],
          preferences: {
            ...snapshot.preferences,
            activeWorkspaceId: workspaceId,
            selectedTaskId: null,
            selectedGroupId: null,
          },
        });
        this.schedulePersist();
        this.toasts.push({ tone: 'success', title: 'Workspace imported', body: 'A new workspace copy was added to your local board.' });
        return;
      }

      throw new Error('The imported file is not a valid Lucent Quoll backup.');
    } catch (error: unknown) {
      this.error.set(error instanceof Error ? error.message : 'Unable to import the selected file.');
      throw error;
    }
  }

  private deleteWorkspace(workspaceId: string): void {
    const remainingWorkspaces = this.snapshotState().workspaces.filter((workspace) => workspace.id !== workspaceId);
    const nextActiveWorkspaceId = remainingWorkspaces[0]?.id ?? null;

    this.patchSnapshot({
      workspaces: remainingWorkspaces,
      groups: this.snapshotState().groups.filter((group) => group.workspaceId !== workspaceId),
      tasks: this.snapshotState().tasks.filter((task) => task.workspaceId !== workspaceId),
      placements: this.snapshotState().placements.filter((placement) => placement.workspaceId !== workspaceId),
      preferences: {
        ...this.preferences(),
        activeWorkspaceId: nextActiveWorkspaceId,
        selectedGroupId: null,
        selectedTaskId: null,
      },
    });
  }

  private groupById(groupId: string | null): TaskGroup | null {
    return this.snapshotState().groups.find((group) => group.id === groupId) ?? null;
  }

  private placementByTask(taskId: string): BoardPlacement {
    return (
      this.snapshotState().placements.find((placement) => placement.taskId === taskId) ?? {
        taskId,
        workspaceId: this.activeWorkspaceId() ?? '',
        x: 0,
        y: 0,
        w: 4,
        h: 2,
        order: 0,
      }
    );
  }

  private patchPreferences(patch: Partial<AppSnapshot['preferences']>): void {
    this.patchSnapshot({
      preferences: {
        ...this.preferences(),
        ...patch,
      },
    });
  }

  private patchSnapshot(patch: Partial<AppSnapshot>): void {
    this.snapshotState.update((snapshot) => ({
      ...snapshot,
      ...patch,
      version: APP_STORAGE_VERSION,
      exportedAt: new Date().toISOString(),
    }));
    this.schedulePersist();
  }

  private schedulePersist(): void {
    if (!this.hasHydrated) {
      return;
    }

    const current = this.saveQueue();
    const next = current.then(async () => {
      this.isPersisting.set(true);
      try {
        await this.storage.saveSnapshot(cloneSnapshot(this.snapshotState()));
      } catch (error: unknown) {
        this.error.set(error instanceof Error ? error.message : 'Unable to save Lucent Quoll data.');
      } finally {
        this.isPersisting.set(false);
      }
    });

    this.saveQueue.set(next);
  }

  private applyPendingRoute(): void {
    if (!this.pendingRoute) {
      return;
    }

    this.snapshotState.update((snapshot) => ({
      ...snapshot,
      preferences: {
        ...snapshot.preferences,
        lastRoute: this.pendingRoute!,
      },
    }));
    this.pendingRoute = null;
  }
}

function slugify(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
}
