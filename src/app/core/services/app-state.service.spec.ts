import { TestBed } from '@angular/core/testing';
import { describe, expect, it, beforeEach } from 'vitest';
import { AppStateService } from './app-state.service';
import { FileDownloadService } from './file-download.service';
import { STORAGE_ENGINE, StorageEngine } from '../tokens/storage-engine.token';
import { AppSnapshot } from '../models/app.models';
import { createInitialSnapshot } from '../models/defaults';

class FakeStorageEngine implements StorageEngine {
  snapshot: AppSnapshot | null = createInitialSnapshot();
  saveCalls = 0;

  async loadSnapshot(): Promise<AppSnapshot | null> {
    return this.snapshot;
  }

  async saveSnapshot(snapshot: AppSnapshot): Promise<void> {
    this.saveCalls += 1;
    this.snapshot = snapshot;
  }
}

class DeferredStorageEngine extends FakeStorageEngine {
  private resolveLoad?: (snapshot: AppSnapshot | null) => void;

  override loadSnapshot(): Promise<AppSnapshot | null> {
    return new Promise<AppSnapshot | null>((resolve) => {
      this.resolveLoad = resolve;
    });
  }

  finishLoad(snapshot: AppSnapshot | null = this.snapshot): void {
    this.resolveLoad?.(snapshot);
  }
}

describe('AppStateService', () => {
  let service: AppStateService;
  let storage: FakeStorageEngine;

  beforeEach(() => {
    storage = new FakeStorageEngine();

    TestBed.configureTestingModule({
      providers: [
        AppStateService,
        FileDownloadService,
        { provide: STORAGE_ENGINE, useValue: storage },
      ],
    });

    service = TestBed.inject(AppStateService);
  });

  it('creates a task in the active workspace', async () => {
    await service.load();
    const workspaceId = service.activeWorkspaceId()!;
    const before = service.tasks().length;

    service.createTask({ workspaceId });

    expect(service.tasks().length).toBe(before + 1);
  });

  it('completes and restores the last completed task', async () => {
    await service.load();
    const taskId = service.tasks()[0]!.id;

    service.completeTask(taskId);
    expect(service.tasks().find((task) => task.id === taskId)?.status).toBe('completed');

    service.undoLastCompletion();
    expect(service.tasks().find((task) => task.id === taskId)?.status).toBe('active');
  });

  it('creates a new workspace with starter groups', async () => {
    await service.load();
    const beforeWorkspaces = service.workspaces().length;

    service.createWorkspace('Client Studio');

    expect(service.workspaces().length).toBe(beforeWorkspaces + 1);
    expect(service.groups().length).toBeGreaterThan(0);
  });

  it('does not overwrite stored data before hydration completes', async () => {
    const deferredStorage = new DeferredStorageEngine();

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        AppStateService,
        FileDownloadService,
        { provide: STORAGE_ENGINE, useValue: deferredStorage },
      ],
    });

    service = TestBed.inject(AppStateService);

    service.setRoute('/board');
    expect(deferredStorage.saveCalls).toBe(0);

    deferredStorage.finishLoad();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(deferredStorage.saveCalls).toBe(0);
    expect(service.tasks().length).toBe(deferredStorage.snapshot?.tasks.length ?? 0);
    expect(service.preferences().lastRoute).toBe('/board');
  });
});
