import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, HostListener, Input, OnDestroy, ViewChild, computed, inject, signal } from '@angular/core';
import { BoardTaskView } from '../../../core/models/app.models';
import { AppStateService } from '../../../core/services/app-state.service';
import { TaskTileComponent } from '../task-tile/task-tile.component';

interface ResizeSession {
  taskId: string;
  pointerId: number;
  startX: number;
  startY: number;
  startW: number;
  startH: number;
}

interface DragSession {
  taskId: string;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startX: number;
  startY: number;
}

@Component({
  selector: 'app-task-board',
  standalone: true,
  imports: [CommonModule, TaskTileComponent],
  templateUrl: './task-board.component.html',
  styleUrl: './task-board.component.scss',
})
export class TaskBoardComponent implements AfterViewInit, OnDestroy {
  @Input({ required: true }) tasks: BoardTaskView[] = [];

  @ViewChild('boardHost', { static: true }) private readonly boardHost?: ElementRef<HTMLElement>;

  protected readonly state = inject(AppStateService);
  protected readonly boardWidth = signal(1080);
  protected readonly columns = computed(() => {
    const width = this.boardWidth();

    if (width < 440) {
      return 1;
    }

    if (width < 760) {
      return 2;
    }

    if (width < 980) {
      return 4;
    }

    return 12;
  });
  protected readonly columnGap = computed(() => (this.boardWidth() < 760 ? 10 : 14));
  protected readonly rowHeight = computed(() => (this.boardWidth() < 760 ? 132 : 144));
  protected readonly tileHeightUnit = computed(() => (this.boardWidth() < 760 ? 118 : 130));
  protected readonly cellWidth = computed(() => {
    const gap = this.columnGap();
    return (this.boardWidth() - gap * (this.columns() - 1)) / this.columns();
  });
  protected readonly boardHeight = computed(() => {
    const bottom = this.tasks.reduce((max, entry) => Math.max(max, entry.placement.y + entry.placement.h), 2);
    return bottom * this.rowHeight();
  });
  protected readonly previewPositions = signal<Record<string, { x: number; y: number }>>({});
  protected readonly draggingTaskId = signal<string | null>(null);

  private resizeObserver?: ResizeObserver;
  private resizeSession: ResizeSession | null = null;
  private dragSession: DragSession | null = null;

  ngAfterViewInit(): void {
    this.measure();
    this.resizeObserver = new ResizeObserver(() => this.measure());
    this.resizeObserver.observe(this.boardHost?.nativeElement as Element);
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  protected createTask(): void {
    const workspaceId = this.state.activeWorkspaceId();
    if (!workspaceId) {
      return;
    }

    this.state.createTask({ workspaceId });
  }

  protected selectTask(taskId: string): void {
    this.state.selectTask(taskId);
    this.state.toggleInspector(true);
  }

  protected dragPosition(task: BoardTaskView): { x: number; y: number } {
    return (
      this.previewPositions()[task.task.id] ?? {
        x: task.placement.x * (this.cellWidth() + this.columnGap()),
        y: task.placement.y * this.rowHeight(),
      }
    );
  }

  protected isDragging(taskId: string): boolean {
    return this.draggingTaskId() === taskId;
  }

  protected onDragStart(task: BoardTaskView, event: PointerEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const start = {
      x: task.placement.x * (this.cellWidth() + this.columnGap()),
      y: task.placement.y * this.rowHeight(),
    };

    this.dragSession = {
      taskId: task.task.id,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: start.x,
      startY: start.y,
    };
    this.draggingTaskId.set(task.task.id);
    this.previewPositions.update((positions) => ({
      ...positions,
      [task.task.id]: start,
    }));
  }

  protected onDragEnded(taskId: string, position: { x: number; y: number }): void {
    const x = Math.round(position.x / (this.cellWidth() + this.columnGap()));
    const y = Math.round(position.y / this.rowHeight());
    this.state.moveTask(taskId, x, y);
    this.previewPositions.update((positions) => {
      const next = { ...positions };
      delete next[taskId];
      return next;
    });
    this.draggingTaskId.set(null);
  }

  protected cardWidth(task: BoardTaskView): number {
    return task.placement.w * this.cellWidth() + (task.placement.w - 1) * this.columnGap();
  }

  protected cardHeight(task: BoardTaskView): number {
    return task.placement.h * this.tileHeightUnit() + (task.placement.h - 1) * this.columnGap();
  }

  protected onResizeStart(task: BoardTaskView, event: PointerEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.resizeSession = {
      taskId: task.task.id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startW: task.placement.w,
      startH: task.placement.h,
    };
  }

  @HostListener('window:pointermove', ['$event'])
  protected onWindowPointerMove(event: PointerEvent): void {
    if (this.dragSession && event.pointerId === this.dragSession.pointerId) {
      const nextX = Math.max(0, this.dragSession.startX + (event.clientX - this.dragSession.startClientX));
      const nextY = Math.max(0, this.dragSession.startY + (event.clientY - this.dragSession.startClientY));
      this.previewPositions.update((positions) => ({
        ...positions,
        [this.dragSession!.taskId]: { x: nextX, y: nextY },
      }));
      return;
    }

    if (!this.resizeSession || event.pointerId !== this.resizeSession.pointerId) {
      return;
    }

    const deltaW = Math.round((event.clientX - this.resizeSession.startX) / (this.cellWidth() + this.columnGap()));
    const deltaH = Math.round((event.clientY - this.resizeSession.startY) / this.rowHeight());
    this.state.resizeTask(this.resizeSession.taskId, this.resizeSession.startW + deltaW, this.resizeSession.startH + deltaH);
  }

  @HostListener('window:pointerup', ['$event'])
  @HostListener('window:pointercancel', ['$event'])
  protected onWindowPointerEnd(event: PointerEvent): void {
    if (this.dragSession && event.pointerId === this.dragSession.pointerId) {
      const preview = this.previewPositions()[this.dragSession.taskId] ?? {
        x: this.dragSession.startX,
        y: this.dragSession.startY,
      };
      this.onDragEnded(this.dragSession.taskId, preview);
      this.dragSession = null;
    }

    if (this.resizeSession && event.pointerId === this.resizeSession.pointerId) {
      this.resizeSession = null;
    }
  }

  private measure(): void {
    const width = this.boardHost?.nativeElement.clientWidth ?? 1080;
    this.boardWidth.set(width);
  }
}
