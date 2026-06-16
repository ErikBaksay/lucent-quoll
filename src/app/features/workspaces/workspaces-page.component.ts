import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { AppStateService } from '../../core/services/app-state.service';

@Component({
  selector: 'app-workspaces-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './workspaces-page.component.html',
  styleUrl: './workspaces-page.component.scss',
})
export class WorkspacesPageComponent {
  protected readonly state = inject(AppStateService);

  protected createWorkspace(): void {
    const name = window.prompt('Workspace name');
    if (name) {
      this.state.createWorkspace(name);
    }
  }

  protected renameWorkspace(id: string, currentName: string): void {
    const next = window.prompt('Rename workspace', currentName);
    if (next) {
      this.state.renameWorkspace(id, next);
    }
  }
}
