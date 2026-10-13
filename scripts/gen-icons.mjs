// Renders the CommentGrab toolbar/store icons from the logo SVGs in src/assets/icons.
// logo.svg is the full mark (violet tile, white speech bubble with an up arrow).
// logo-16.svg is the same mark cut for 16px: drawn slightly larger with a wider gap
// between bubble and arrow, so the two shapes stay apart at toolbar size.
import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const dir = resolve(here, '../src/assets/icons');

const full = await readFile(resolve(dir, 'logo.svg'));
const small = await readFile(resolve(dir, 'logo-16.svg'));

for (const [size, svg] of [[16, small], [32, full], [48, full], [128, full]]) {
  // Render large first, then downscale with lanczos: crisper than rasterising the SVG at 16px.
  const big = await sharp(svg, { density: 72 }).resize(1024, 1024).png().toBuffer();
  const png = await sharp(big).resize(size, size, { kernel: 'lanczos3' }).png().toBuffer();
  await writeFile(resolve(dir, `icon${size}.png`), png);
  console.log(`icon${size}.png`);
}
