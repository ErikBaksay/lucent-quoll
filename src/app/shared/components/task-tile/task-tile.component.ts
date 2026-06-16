import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { BoardTaskView } from '../../../core/models/app.models';
import { RichTextEditorComponent } from '../rich-text-editor/rich-text-editor.component';

@Component({
  selector: 'app-task-tile',
  standalone: true,
  imports: [CommonModule, RichTextEditorComponent],
  templateUrl: './task-tile.component.html',
  styleUrl: './task-tile.component.scss',
})
export class TaskTileComponent {
  @Input({ required: true }) taskView!: BoardTaskView;
  @Input() selected = false;
  @Input() dragPosition = { x: 0, y: 0 };
  @Input() tileWidth = 0;
  @Input() tileHeight = 0;
  @Input() dragging = false;

  @Output() readonly select = new EventEmitter<void>();
  @Output() readonly toggleComplete = new EventEmitter<void>();
  @Output() readonly dragStart = new EventEmitter<MouseEvent>();
  @Output() readonly resizeStart = new EventEmitter<MouseEvent>();

  protected readonly stateLabels = {
    normal: '',
    today: 'Today',
    upcoming: 'Upcoming',
    overdue: 'Overdue',
  } as const;
}
