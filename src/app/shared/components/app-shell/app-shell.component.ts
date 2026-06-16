import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AppStateService } from '../../../core/services/app-state.service';
import { DialogLayerComponent } from '../dialog-layer/dialog-layer.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { ToastStackComponent } from '../toast-stack/toast-stack.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, SidebarComponent, ToastStackComponent, DialogLayerComponent],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
})
export class AppShellComponent {
  private readonly router = inject(Router);
  protected readonly state = inject(AppStateService);

  protected readonly activeWorkspaceName = computed(() => this.state.activeWorkspace()?.name ?? 'No workspace');

  constructor() {
    this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd)).subscribe((event) => {
      this.state.setRoute(event.urlAfterRedirects);
    });
  }
}
