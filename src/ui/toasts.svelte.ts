/** Kurzmeldungen am unteren Rand, wahlweise mit einer Aktion (z. B. Rückgängig). */

export type ToastKind = 'success' | 'info' | 'warning' | 'error';

export interface ToastAction {
  label: string;
  run: () => void | Promise<void>;
}

export interface Toast {
  id: number;
  text: string;
  kind: ToastKind;
  action: ToastAction | null;
}

const DURATION_MS = 3500;
const DURATION_WITH_ACTION_MS = 9000;

class ToastStore {
  items = $state<Toast[]>([]);
  private nextId = 1;

  show(text: string, kind: ToastKind = 'success', action: ToastAction | null = null): void {
    const id = this.nextId++;
    this.items = [...this.items.slice(-3), { id, text, kind, action }];
    setTimeout(() => this.dismiss(id), action ? DURATION_WITH_ACTION_MS : DURATION_MS);
  }

  error(text: string): void {
    this.show(text, 'error');
  }

  dismiss(id: number): void {
    this.items = this.items.filter((t) => t.id !== id);
  }
}

export const toasts = new ToastStore();
