// One-off helper: downloads seed product photos from Unsplash into seed/images/ (committed to Git).
// Run: node seed/fetch-images.js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { products } from './data.js';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'images');
fs.mkdirSync(dir, { recursive: true });

let ok = 0;
await Promise.all(products.map(async ([, , title, , , photo]) => {
  const file = path.join(dir, `${photo}.jpg`);
  if (fs.existsSync(file)) { ok++; return; }
  const url = `https://images.unsplash.com/photo-${photo}?w=900&h=900&fit=crop&q=75&fm=jpg`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    ok++;
  } catch (e) {
    console.warn(`✗ ${title}: ${e.message}`);
  }
}));
console.log(`${ok}/${products.length} photos available in ${dir}`);
