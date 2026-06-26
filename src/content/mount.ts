import { createApp, type App } from 'vue';
import Widget from './widget/Widget.vue';
import { initLocale } from '@/shared/i18n';
// `?inline` gives the compiled Tailwind as a string so we can scope it inside
// the shadow root instead of leaking styles onto the host page.
import css from '@/ui/styles/tailwind.css?inline';

const HOST_ID = 'commentgrab-widget-host';

export function mountWidget(): App | null {
  if (document.getElementById(HOST_ID)) return null;

  const host = document.createElement('div');
  host.id = HOST_ID;
  // Isolate from page styles, then re-establish a top-left, 0-size, high
  // z-index stacking context. The widget itself uses fixed positioning.
  host.style.cssText = 'all: initial;';
  host.style.position = 'fixed';
  host.style.left = '0';
  host.style.top = '0';
  host.style.width = '0';
  host.style.height = '0';
  host.style.zIndex = '2147483000';

  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = css;
  shadow.appendChild(style);

  const mountPoint = document.createElement('div');
  shadow.appendChild(mountPoint);
  document.documentElement.appendChild(host);

  void initLocale(); // apply saved language (reactive; widget re-renders when ready)
  const app = createApp(Widget);
  app.mount(mountPoint);
  return app;
}
