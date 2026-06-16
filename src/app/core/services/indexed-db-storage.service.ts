import { Injectable } from '@angular/core';
import { AppSnapshot } from '../models/app.models';
import { StorageEngine } from '../tokens/storage-engine.token';

const DATABASE_NAME = 'lucent-quoll';
const DATABASE_VERSION = 1;
const STORE_NAME = 'documents';
const SNAPSHOT_KEY = 'app-snapshot';

@Injectable({ providedIn: 'root' })
export class IndexedDbStorageService implements StorageEngine {
  private databasePromise: Promise<IDBDatabase> | null = null;

  async loadSnapshot(): Promise<AppSnapshot | null> {
    if (!('indexedDB' in globalThis)) {
      return null;
    }

    const database = await this.openDatabase();
    return new Promise<AppSnapshot | null>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(SNAPSHOT_KEY);

      request.onsuccess = () => resolve((request.result as AppSnapshot | undefined) ?? null);
      request.onerror = () => reject(request.error ?? new Error('Unable to load the saved Lucent Quoll snapshot.'));
    });
  }

  async saveSnapshot(snapshot: AppSnapshot): Promise<void> {
    if (!('indexedDB' in globalThis)) {
      return;
    }

    const database = await this.openDatabase();

    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('Unable to persist the Lucent Quoll snapshot.'));

      store.put(snapshot, SNAPSHOT_KEY);
    });
  }

  private openDatabase(): Promise<IDBDatabase> {
    if (this.databasePromise) {
      return this.databasePromise;
    }

    this.databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          database.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('Unable to open IndexedDB.'));
    });

    return this.databasePromise;
  }
}
