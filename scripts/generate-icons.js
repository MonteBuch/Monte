// scripts/generate-icons.js
// Generiert PWA-Icons aus SVG

import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const publicDir = join(__dirname, '..', 'public');

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="64" fill="#f59e0b"/>
  <g transform="translate(256,220)">
    <circle cx="-105" cy="0" r="28" fill="white"/>
    <circle cx="-35" cy="0" r="28" fill="white"/>
    <circle cx="35" cy="0" r="28" fill="white"/>
    <circle cx="105" cy="0" r="28" fill="white"/>
  </g>
  <path d="M128 300 Q256 380 384 300" stroke="white" stroke-width="20" fill="none" stroke-linecap="round"/>
</svg>`;

const sizes = [192, 512];

async function generateIcons() {
  for (const size of sizes) {
    const buffer = Buffer.from(svgContent);

    await sharp(buffer)
      .resize(size, size)
      .png()
      .toFile(join(publicDir, `pwa-${size}x${size}.png`));

    console.log(`Generated pwa-${size}x${size}.png`);
  }

  // Apple Touch Icon (180x180)
  await sharp(Buffer.from(svgContent))
    .resize(180, 180)
    .png()
    .toFile(join(publicDir, 'apple-touch-icon.png'));

  console.log('Generated apple-touch-icon.png');

  // Favicon (32x32)
  await sharp(Buffer.from(svgContent))
    .resize(32, 32)
    .png()
    .toFile(join(publicDir, 'favicon.ico'));

  console.log('Generated favicon.ico');
}

generateIcons().catch(console.error);
