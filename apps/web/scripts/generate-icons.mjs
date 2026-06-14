import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public', 'icons');
mkdirSync(publicDir, { recursive: true });

// Minimal SVG: dark rounded square with fork-and-knife shapes
const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="18" fill="#09090b"/>
  <rect x="28" y="20" width="6" height="40" rx="3" fill="white"/>
  <rect x="39" y="20" width="6" height="20" rx="3" fill="white"/>
  <rect x="28" y="62" width="17" height="18" rx="3" fill="white"/>
  <rect x="64" y="20" width="6" height="60" rx="3" fill="white"/>
  <path d="M58 20 Q58 42 64 42 Q70 42 70 20" fill="white"/>
</svg>`);

await sharp(svg).resize(192, 192).png().toFile(join(publicDir, 'icon-192.png'));
await sharp(svg).resize(512, 512).png().toFile(join(publicDir, 'icon-512.png'));
console.log('Icons written to public/icons/');
