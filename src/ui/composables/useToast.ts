import { reactive } from 'vue';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

const state = reactive<{ toasts: Toast[] }>({ toasts: [] });
let seq = 0;

function dismiss(id: number): void {
  const idx = state.toasts.findIndex((t) => t.id === id);
  if (idx >= 0) state.toasts.splice(idx, 1);
}

function push(message: string, type: ToastType = 'info', ttl = 2800): number {
  const id = ++seq;
  state.toasts.push({ id, message, type });
  if (ttl > 0) window.setTimeout(() => dismiss(id), ttl);
  return id;
}

export function useToast() {
  return {
    toasts: state.toasts,
    push,
    dismiss,
    success: (m: string, ttl?: number) => push(m, 'success', ttl),
    error: (m: string, ttl?: number) => push(m, 'error', ttl ?? 4200),
    info: (m: string, ttl?: number) => push(m, 'info', ttl),
  };
}
