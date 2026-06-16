import { InjectionToken } from '@angular/core';
import { AppSnapshot } from '../models/app.models';

export interface StorageEngine {
  loadSnapshot(): Promise<AppSnapshot | null>;
  saveSnapshot(snapshot: AppSnapshot): Promise<void>;
}

export const STORAGE_ENGINE = new InjectionToken<StorageEngine>('LUCENT_QUOLL_STORAGE_ENGINE');
