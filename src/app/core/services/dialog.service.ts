import { Injectable, computed, signal } from '@angular/core';

export interface DialogState {
  kind: 'confirm';
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
}

@Injectable({ providedIn: 'root' })
export class DialogService {
  private readonly dialogState = signal<DialogState | null>(null);
  readonly activeDialog = computed(() => this.dialogState());

  openConfirm(config: Omit<DialogState, 'kind'>): void {
    this.dialogState.set({ kind: 'confirm', ...config });
  }

  close(): void {
    this.dialogState.set(null);
  }
}
