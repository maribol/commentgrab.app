import { reactive } from 'vue';

export interface Route {
  path: string;
  segments: string[];
}

function parse(): Route {
  const raw = location.hash.replace(/^#/, '') || '/';
  const path = raw.startsWith('/') ? raw : `/${raw}`;
  return { path, segments: path.split('/').filter(Boolean) };
}

const state = reactive<Route>(parse());

window.addEventListener('hashchange', () => {
  const next = parse();
  state.path = next.path;
  state.segments = next.segments;
});

export function navigate(path: string): void {
  location.hash = path;
}

export function useRoute(): Route {
  return state;
}

/**
 * Breadcrumb tail for detail pages. A view sets the item title for its path;
 * the top bar shows it only while that path is still the current one, so a
 * stale title never lingers after navigating away.
 */
export const crumb = reactive<{ path: string; label: string }>({ path: '', label: '' });

export function setCrumb(path: string, label: string): void {
  crumb.path = path;
  crumb.label = label;
}

/**
 * Ids whose insights should start running as soon as their view mounts (e.g.
 * "Analyze board" clicked from the Saved list). Same JS context, so a plain
 * set is enough; the view takes the id out when it runs.
 */
export const pendingRuns = new Set<string>();
