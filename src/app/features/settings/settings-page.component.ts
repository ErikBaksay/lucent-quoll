import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild, inject } from '@angular/core';
import { AppStateService } from '../../core/services/app-state.service';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './settings-page.component.html',
  styleUrl: './settings-page.component.scss',
})
export class SettingsPageComponent {
  @ViewChild('fileInput', { static: true }) private readonly fileInput?: ElementRef<HTMLInputElement>;

  protected readonly state = inject(AppStateService);

  protected openFilePicker(): void {
    this.fileInput?.nativeElement.click();
  }

  protected async onFileChange(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    const text = await file.text();
    await this.state.importJson(text);
    input.value = '';
  }
}
