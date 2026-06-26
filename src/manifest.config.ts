import { defineManifest } from '@crxjs/vite-plugin';

const icons = {
  '16': 'src/assets/icons/icon16.png',
  '48': 'src/assets/icons/icon48.png',
  '128': 'src/assets/icons/icon128.png',
};

export default defineManifest({
  manifest_version: 3,
  name: 'CommentGrab — Free Comment & Post Exporter',
  short_name: 'CommentGrab',
  version: '1.0.0',
  description:
    'Turn public comment threads into clean CSV/JSON exports and AI-ready signal. Reddit, YouTube, Hacker News, Steam & more.',
  icons,
  action: {
    default_popup: 'src/popup/index.html',
    default_icon: icons,
    default_title: 'CommentGrab — Free Comment & Post Exporter',
  },
  background: {
    service_worker: 'src/background/service-worker.ts',
    type: 'module',
  },
  options_page: 'src/dashboard/index.html',
  permissions: ['storage', 'unlimitedStorage', 'activeTab', 'scripting'],
  host_permissions: [
    'https://*.reddit.com/*',
    'https://hacker-news.firebaseio.com/*',
    'https://store.steampowered.com/*',
    'https://steamcommunity.com/*',
    'https://public.api.bsky.app/*',
    'https://api.github.com/*',
    'https://api.stackexchange.com/*',
    'https://www.instagram.com/*',
    'https://api.openai.com/*',
  ],
  content_scripts: [
    {
      matches: [
        'https://*.reddit.com/*',
        'https://*.youtube.com/*',
        'https://news.ycombinator.com/*',
        'https://store.steampowered.com/*',
        'https://steamcommunity.com/*',
        'https://*.amazon.com/*',
        'https://*.trustpilot.com/*',
        'https://*.producthunt.com/*',
        'https://*.etsy.com/*',
        'https://*.quora.com/*',
        'https://bsky.app/*',
        'https://github.com/*',
        'https://stackoverflow.com/*',
        'https://*.stackexchange.com/*',
        'https://superuser.com/*',
        'https://serverfault.com/*',
        'https://askubuntu.com/*',
        'https://mathoverflow.net/*',
        'https://www.google.com/maps/*',
      ],
      js: ['src/content/index.ts'],
      run_at: 'document_idle',
      all_frames: false,
    },
  ],
});
