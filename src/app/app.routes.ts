import { Routes } from '@angular/router';
import { AppShellComponent } from './shared/components/app-shell/app-shell.component';

export const routes: Routes = [
  {
    path: '',
    component: AppShellComponent,
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'board',
      },
      {
        path: 'board',
        loadComponent: () => import('./features/board/board-page.component').then((module) => module.BoardPageComponent),
        title: 'Board | Lucent Quoll',
      },
      {
        path: 'archive',
        loadComponent: () => import('./features/archive/archive-page.component').then((module) => module.ArchivePageComponent),
        title: 'Archive | Lucent Quoll',
      },
      {
        path: 'workspaces',
        loadComponent: () =>
          import('./features/workspaces/workspaces-page.component').then((module) => module.WorkspacesPageComponent),
        title: 'Workspaces | Lucent Quoll',
      },
      {
        path: 'settings',
        loadComponent: () => import('./features/settings/settings-page.component').then((module) => module.SettingsPageComponent),
        title: 'Settings | Lucent Quoll',
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'board',
  },
];
