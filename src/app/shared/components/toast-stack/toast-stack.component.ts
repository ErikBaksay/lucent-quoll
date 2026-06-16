import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { AppStateService } from '../../../core/services/app-state.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast-stack',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast-stack.component.html',
  styleUrl: './toast-stack.component.scss',
})
export class ToastStackComponent {
  protected readonly toasts = inject(ToastService);
  protected readonly state = inject(AppStateService);
}
