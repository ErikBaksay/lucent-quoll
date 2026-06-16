import { Injectable, computed, signal } from '@angular/core';
import { ToastMessage } from '../models/app.models';
import { createId } from '../models/defaults';

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly messagesState = signal<ToastMessage[]>([]);

  readonly messages = computed(() => this.messagesState());

  push(message: Omit<ToastMessage, 'id'>): string {
    const id = createId('toast');
    this.messagesState.update((messages) => [...messages, { id, ...message }]);
    return id;
  }

  dismiss(id: string): void {
    this.messagesState.update((messages) => messages.filter((message) => message.id !== id));
  }
}
