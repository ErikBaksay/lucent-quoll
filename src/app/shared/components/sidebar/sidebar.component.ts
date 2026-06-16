import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AppStateService } from '../../../core/services/app-state.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  protected readonly state = inject(AppStateService);
  protected readonly collapsed = computed(() => this.state.preferences().sidebarCollapsed);

  protected createGroup(): void {
    const name = window.prompt('New group name');
    if (name) {
      this.state.createGroup(name);
    }
  }
}
