import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { AppStateService } from '../../core/services/app-state.service';
import { TaskBoardComponent } from '../../shared/components/task-board/task-board.component';
import { TaskInspectorComponent } from '../../shared/components/task-inspector/task-inspector.component';

@Component({
  selector: 'app-board-page',
  standalone: true,
  imports: [CommonModule, TaskBoardComponent, TaskInspectorComponent],
  templateUrl: './board-page.component.html',
  styleUrl: './board-page.component.scss',
})
export class BoardPageComponent {
  protected readonly state = inject(AppStateService);
  protected readonly boardTasks = computed(() => this.state.activeTasks());
  protected readonly inspectorVisible = computed(
    () => this.state.preferences().inspectorOpen && this.state.selectedTask() !== null,
  );
}
