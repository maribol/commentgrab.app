# CommentGrab

**Pull public comments and reviews off the page you're on, export them clean, and turn them into customer language you can actually use. Free, source-available, runs in your browser.**

You found a thread full of how your customers actually talk. Now you're copy-pasting comments one at a time into a spreadsheet.

CommentGrab pulls them all in one click.

Open any supported page, click the floating widget, and export every comment and reply as clean CSV, JSON, or Markdown. Then point your own OpenAI key at it and get back the objections, hooks, and exact phrases buried in the replies.

It's free. The full source is public (PolyForm Shield license — read it, audit it, build on it, just not to ship a competing product). No account, no server. The comments only leave your device when you send them to OpenAI yourself.

## Why it exists

Most comment exporters do one platform, bury you in ads, and stop at a CSV. Then they want $45 a month and send your data to their server.

CommentGrab is free, runs on your machine, and goes all the way to insight.

## Where it works

Use it where your research already lives:

- Reddit threads and user profiles
- Hacker News comment trees
- Bluesky post replies
- Stack Exchange answers and comments (Stack Overflow, Super User, Server Fault, Ask Ubuntu, MathOverflow, and the rest)
- GitHub issue and pull-request comments
- Steam reviews
- YouTube video and Shorts comments, with replies
- Google Maps place reviews
- Amazon, Trustpilot, Product Hunt, Etsy, Quora

API-backed platforms (Reddit, Hacker News, Steam, Bluesky, GitHub, Stack Exchange) are fetched from the background service worker, so they're fast and CORS-free. YouTube, Google Maps, and the review sites are read straight from the page you're on.

## What you get

- One-click capture from a floating widget, with live progress
- Author, timestamp, score, permalink, in-comment links, and thread depth. Toggle any of them.
- A dashboard to save threads, search them, and come back later
- AI analysis with your own key: objections, ad hooks, emotional triggers, failed solutions, verbatim customer language, top themes, and sentiment
- Stats and saved threads stored on your device, never uploaded

## Install (from source)

CommentGrab isn't on the Chrome Web Store yet. Build it and load it unpacked:

```bash
git clone https://github.com/maribol/commentgrab.app
cd commentgrab.app
npm install
npm run build
```

Then in Chrome:

1. Go to `chrome://extensions`
2. Turn on Developer mode (top right)
3. Click Load unpacked and pick the generated `dist/` folder
4. Pin CommentGrab, and the widget shows up on supported pages

## Using AI analysis

1. Get a key at [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Open the dashboard, go to Settings, paste your key, hit Test or Save
3. Pick a model (defaults to `gpt-4o-mini`)
4. Save or scrape a thread, then hit Analyze

Your key is stored locally and used only for requests you start. You pay OpenAI directly.

## Privacy

- Scraping and exporting happen on your device.
- Saved collections, history, and stats use `chrome.storage.local`. There is no remote server.
- The only outbound request beyond the page you scrape is to `api.openai.com`, and only when you start an analysis.

## Development

```bash
npm run dev        # Vite dev server, load dist/ unpacked and reload on change
npm run typecheck  # vue-tsc --noEmit
npm run build      # typecheck plus production build into dist/
node scripts/gen-icons.mjs  # regenerate the icon set
```

## Tech stack

- TypeScript (strict)
- Vue 3 with `<script setup>`
- Tailwind CSS v3
- Vite plus `@crxjs/vite-plugin` (Manifest V3)
- `lucide-vue-next` icons

## Project structure

```
src/
  manifest.config.ts   MV3 manifest (crxjs)
  background/          service worker plus JSON-API scrapers (reddit, HN, steam, bluesky, github, stack exchange)
  content/             content script, shadow-DOM widget, DOM scrapers (youtube, google maps, generic)
  popup/               toolbar popup (Vue)
  dashboard/           options-page app: views, components, hash router
  shared/              types, platform detection, storage, stats, export, openai
  ui/                  reusable Vue components, composables, Tailwind styles
scripts/gen-icons.mjs  generates the icon set with sharp
```

## License

Source-available under the [PolyForm Shield License 1.0.0](LICENSE). Free to use, read, audit, and build on — just not to ship a product that competes with CommentGrab.
