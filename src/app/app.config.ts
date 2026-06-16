import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { routes } from './app.routes';
import { IndexedDbStorageService } from './core/services/indexed-db-storage.service';
import { STORAGE_ENGINE } from './core/tokens/storage-engine.token';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes, withHashLocation()),
    provideServiceWorker('ngsw-worker.js', {
      enabled: true,
    }),
    IndexedDbStorageService,
    {
      provide: STORAGE_ENGINE,
      useExisting: IndexedDbStorageService,
    },
  ],
};
