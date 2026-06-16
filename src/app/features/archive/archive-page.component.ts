import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { AppStateService } from '../../core/services/app-state.service';

@Component({
  selector: 'app-archive-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './archive-page.component.html',
  styleUrl: './archive-page.component.scss',
})
export class ArchivePageComponent {
  protected readonly state = inject(AppStateService);
  protected readonly buckets = computed(() => this.state.archivedBuckets());

  constructor() {
    this.state.setFilter('archive');
  }
}
