import { ArchiveBucket, BoardFilter, BoardTaskView, TaskGroup, TaskTile, Workspace } from '../models/app.models';
import { getPlainTextFromDoc } from './task-doc.utils';

export function deriveTaskState(task: TaskTile, now: Date): BoardTaskView['state'] {
  if (!task.dueDate) {
    return 'normal';
  }

  const todayKey = toDateKey(now);
  if (task.dueDate < todayKey) {
    return 'overdue';
  }

  if (task.dueDate === todayKey) {
    return 'today';
  }

  return 'upcoming';
}

export function matchesTaskFilter(task: TaskTile, filter: BoardFilter, now: Date): boolean {
  if (filter === 'all') {
    return task.status === 'active';
  }

  if (filter === 'archive') {
    return task.status === 'completed';
  }

  if (task.status !== 'active') {
    return false;
  }

  const state = deriveTaskState(task, now);
  return state === filter;
}

export function buildTaskView(task: TaskTile, group: TaskGroup | null, placement: BoardTaskView['placement'], now: Date): BoardTaskView {
  return {
    task,
    group,
    placement,
    state: deriveTaskState(task, now),
    previewText: getPlainTextFromDoc(task.richTextDoc),
  };
}

export function searchTask(task: TaskTile, group: TaskGroup | null, workspace: Workspace | null, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  const haystack = [getPlainTextFromDoc(task.richTextDoc), group?.name ?? '', workspace?.name ?? '', task.dueDate ?? '']
    .join(' ')
    .toLowerCase();

  return haystack.includes(normalized);
}

export function bucketArchivedTasks(tasks: BoardTaskView[], now: Date): ArchiveBucket[] {
  const todayKey = toDateKey(now);
  const startOfWeek = new Date(now);
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(now.getDate() - now.getDay());
  const weekKey = toDateKey(startOfWeek);

  const buckets = new Map<string, BoardTaskView[]>();

  for (const task of tasks) {
    const completedKey = task.task.completedAt?.slice(0, 10) ?? '';
    const bucketLabel = completedKey === todayKey ? 'Today' : completedKey >= weekKey ? 'This Week' : 'Earlier';
    const existing = buckets.get(bucketLabel) ?? [];
    existing.push(task);
    buckets.set(bucketLabel, existing);
  }

  return ['Today', 'This Week', 'Earlier']
    .map((label) => ({ label, tasks: buckets.get(label) ?? [] }))
    .filter((bucket) => bucket.tasks.length > 0);
}

export function toDateKey(date: Date): string {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())).toISOString().slice(0, 10);
}
