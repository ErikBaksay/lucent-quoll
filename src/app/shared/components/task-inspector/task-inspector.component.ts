import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppStateService } from '../../../core/services/app-state.service';
import { RichTextEditorComponent } from '../rich-text-editor/rich-text-editor.component';

@Component({
  selector: 'app-task-inspector',
  standalone: true,
  imports: [CommonModule, FormsModule, RichTextEditorComponent],
  templateUrl: './task-inspector.component.html',
  styleUrl: './task-inspector.component.scss',
})
export class TaskInspectorComponent {
  protected readonly state = inject(AppStateService);
  protected readonly task = computed(() => this.state.selectedTask());

  protected dismiss(): void {
    this.state.selectTask(null);
    this.state.toggleInspector(false);
  }

  protected updateGroup(groupId: string): void {
    const task = this.task();
    if (task) {
      this.state.updateTask(task.id, { groupId: groupId || null });
    }
  }

  protected updateDueDate(dueDate: string): void {
    const task = this.task();
    if (task) {
      this.state.updateTask(task.id, { dueDate: dueDate || null });
    }
  }
}
