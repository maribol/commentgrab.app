import { reactive } from 'vue';
import type { RunEstimate } from '@/shared/estimate';
import { getSettings } from '@/shared/storage';
import { formatUsd } from '@/shared/estimate';
import { t } from '@/shared/i18n';

/**
 * One confirm dialog for every action that calls OpenAI. Views await
 * `confirmRun(estimate)`; the dialog (RunConfirm.vue, mounted once in
 * Dashboard.vue) resolves it. The user's "Confirm before each analysis"
 * setting decides whether the dialog shows at all.
 */
export const confirmState = reactive<{
  open: boolean;
  estimate: RunEstimate | null;
  resolve: ((ok: boolean) => void) | null;
}>({ open: false, estimate: null, resolve: null });

/** Below this estimated cost (USD) the "Only above $0.01" mode skips the dialog. */
export const CHEAP_LIMIT = 0.01;

export async function confirmRun(estimate: RunEstimate): Promise<boolean> {
  const mode = (await getSettings()).confirmAnalysis ?? 'always';
  if (mode === 'never') return true;
  if (mode === 'above' && estimate.cost !== null && estimate.cost < CHEAP_LIMIT) return true;
  // A second request while one is open cancels the first.
  confirmState.resolve?.(false);
  return new Promise<boolean>((resolve) => {
    confirmState.estimate = estimate;
    confirmState.resolve = resolve;
    confirmState.open = true;
  });
}

export function settleConfirm(ok: boolean): void {
  const r = confirmState.resolve;
  confirmState.open = false;
  confirmState.resolve = null;
  r?.(ok);
}

/** "about $0.004", "under $0.001", or "price unknown for <model>". */
export function costText(cost: number | null, model: string): string {
  if (cost === null) return t('est.priceUnknown', { model });
  if (cost < 0.001) return t('est.under', { v: '$0.001' });
  return t('est.about', { v: formatUsd(cost) });
}
