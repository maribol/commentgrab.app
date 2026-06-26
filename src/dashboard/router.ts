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
