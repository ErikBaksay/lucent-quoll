import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { DialogService } from '../../../core/services/dialog.service';

@Component({
  selector: 'app-dialog-layer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dialog-layer.component.html',
  styleUrl: './dialog-layer.component.scss',
})
export class DialogLayerComponent {
  protected readonly dialogs = inject(DialogService);
}
