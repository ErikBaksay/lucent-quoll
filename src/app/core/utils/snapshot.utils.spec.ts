import { describe, expect, it } from 'vitest';
import { createInitialSnapshot } from '../models/defaults';
import { buildFullExport, buildWorkspaceExport, normalizeSnapshot, repairPlacements } from './snapshot.utils';

describe('snapshot utils', () => {
  it('normalizes an empty snapshot into a valid default snapshot', () => {
    const snapshot = normalizeSnapshot(null);
    expect(snapshot.version).toBe(1);
    expect(snapshot.workspaces.length).toBeGreaterThan(0);
  });

  it('builds a workspace export payload', () => {
    const snapshot = createInitialSnapshot();
    const workspaceId = snapshot.workspaces[0]!.id;
    const payload = buildWorkspaceExport(snapshot, workspaceId);
    expect(payload.workspace.id).toBe(workspaceId);
    expect(payload.tasks.every((task) => task.workspaceId === workspaceId)).toBe(true);
  });

  it('repairs missing placements', () => {
    const snapshot = createInitialSnapshot();
    const repaired = repairPlacements({ ...snapshot, placements: [] });
    expect(repaired.placements).toHaveLength(snapshot.tasks.length);
  });

  it('builds a full export payload', () => {
    const snapshot = createInitialSnapshot();
    const payload = buildFullExport(snapshot);
    expect(payload.snapshot.workspaces[0]?.id).toBe(snapshot.workspaces[0]?.id);
  });
});
