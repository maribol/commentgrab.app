// Generates the CommentGrab icon set (rainbow rounded square + white comment bubble
// with an ascending "spectrum" bar motif) as crisp PNGs via sharp.
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '../src/assets/icons');

const gradientStops = `
  <stop offset="0%" stop-color="#7c3aed"/>
  <stop offset="52%" stop-color="#d946ef"/>
  <stop offset="100%" stop-color="#ec4899"/>
`;

// Detailed mark for 48px+ : gradient tile, white speech bubble, gradient bars.
function detailedSvg() {
  return `<svg width="128" height="128" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0.08" y1="0" x2="0.92" y2="1">${gradientStops}</linearGradient>
    <linearGradient id="bars" x1="0" y1="1" x2="0.7" y2="0">${gradientStops}</linearGradient>
    <radialGradient id="gloss" cx="0.3" cy="0.12" r="0.95">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.38"/>
      <stop offset="45%" stop-color="#ffffff" stop-opacity="0.06"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <filter id="sh" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="3.5" stdDeviation="4" flood-color="#2a0a3d" flood-opacity="0.22"/>
    </filter>
  </defs>
  <rect x="4" y="4" width="120" height="120" rx="30" fill="url(#g)"/>
  <rect x="4" y="4" width="120" height="120" rx="30" fill="url(#gloss)"/>
  <rect x="4.75" y="4.75" width="118.5" height="118.5" rx="29.25" fill="none" stroke="#ffffff" stroke-opacity="0.16" stroke-width="1.5"/>
  <g filter="url(#sh)">
    <path d="M35 31 h58 a15 15 0 0 1 15 15 v33 a15 15 0 0 1 -15 15 H60 l-15 15 v-15 h-10 a15 15 0 0 1 -15 -15 V46 a15 15 0 0 1 15 -15 z" fill="#ffffff"/>
  </g>
  <g>
    <rect x="44" y="60" width="11" height="24" rx="5.5" fill="url(#bars)"/>
    <rect x="61" y="50" width="11" height="34" rx="5.5" fill="url(#bars)"/>
    <rect x="78" y="42" width="11" height="42" rx="5.5" fill="url(#bars)"/>
  </g>
</svg>`;
}

// Simplified mark for 16px legibility: gradient tile + solid white bubble + bars.
function compactSvg() {
  return `<svg width="128" height="128" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0.08" y1="0" x2="0.92" y2="1">${gradientStops}</linearGradient>
  </defs>
  <rect x="2" y="2" width="124" height="124" rx="30" fill="url(#g)"/>
  <path d="M30 30 h68 a13 13 0 0 1 13 13 v35 a13 13 0 0 1 -13 13 H58 l-17 16 v-16 h-11 a13 13 0 0 1 -13 -13 V43 a13 13 0 0 1 13 -13 z" fill="#ffffff"/>
  <rect x="41" y="62" width="13" height="22" rx="6.5" fill="#7c3aed"/>
  <rect x="59" y="51" width="13" height="33" rx="6.5" fill="#d946ef"/>
  <rect x="77" y="43" width="13" height="41" rx="6.5" fill="#ec4899"/>
</svg>`;
}

async function render(svg, size, file) {
  const png = await sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();
  await writeFile(resolve(outDir, file), png);
  console.log(`  wrote ${file} (${size}px)`);
}

async function main() {
  await mkdir(outDir, { recursive: true });
  const detailed = detailedSvg();
  const compact = compactSvg();
  await render(detailed, 128, 'icon128.png');
  await render(detailed, 48, 'icon48.png');
  await render(detailed, 32, 'icon32.png');
  await render(compact, 16, 'icon16.png');
  await writeFile(resolve(outDir, 'logo.svg'), detailed);
  console.log('CommentGrab icons generated in src/assets/icons/');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
