import { onMounted, ref } from 'vue';
import { getPromoDismissed, setPromoDismissed } from '@/shared/storage';

/** Current launch promo target. */
export const PRODUCT_HUNT_URL =
  'https://www.producthunt.com/products/commentgrab?launch=commentgrab';

/**
 * Show a dismissible promo (Product Hunt banner) until the user dismisses it.
 * The dismissal is keyed to the extension version, so a new release surfaces it
 * again automatically.
 */
export function usePromo() {
  const show = ref(false);
  const version = chrome.runtime.getManifest().version;

  onMounted(async () => {
    const dismissedAt = await getPromoDismissed();
    show.value = dismissedAt !== version;
  });

  async function dismiss(): Promise<void> {
    show.value = false;
    await setPromoDismissed(version);
  }

  return { show, dismiss, url: PRODUCT_HUNT_URL };
}
