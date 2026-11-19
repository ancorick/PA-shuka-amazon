// Seeds an EMPTY database: 10 categories, 3 sellers, 40+ products with images, 2 demo buyers,
// a few orders in different statuses and some reviews. Runs automatically on server start.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import sharp from 'sharp';
import { saveImage } from '../src/images.js';
import { categories, sellers, buyers, products, PASSWORD } from './data.js';

const IMAGES_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'images');

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Fallback product image when a photo is missing: clean card in the category colour. */
function placeholderSvg(title, color) {
  const words = title.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length > 18) { lines.push(line.trim()); line = w; } else line += ' ' + w;
    if (lines.length === 3) break;
  }
  if (lines.length < 3 && line.trim()) lines.push(line.trim());
  const text = lines.map((l, i) => `<text x="400" y="${470 + i * 62}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="48" font-weight="700" fill="#ffffff">${esc(l)}</text>`).join('');
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${color}"/><stop offset="1" stop-color="#131921"/></linearGradient></defs>
    <rect width="800" height="800" fill="#ffffff"/>
    <rect x="60" y="60" width="680" height="680" rx="48" fill="url(#g)"/>
    <circle cx="400" cy="300" r="90" fill="#ffffff" fill-opacity="0.18"/>
    <text x="400" y="335" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="110" font-weight="700" fill="#ffffff">${esc(title[0])}</text>
    ${text}
  </svg>`);
}

async function imageFor(photo, title, color) {
  const file = path.join(IMAGES_DIR, `${photo}.jpg`);
  if (fs.existsSync(file)) return saveImage(fs.readFileSync(file));
  const png = await sharp(placeholderSvg(title, color)).png().toBuffer();
  return saveImage(png);
}

export async function seedIfEmpty(db) {
  const users = db.prepare('SELECT COUNT(*) FROM users').pluck().get();
  if (users > 0) return false;
  console.log('[seed] empty database — seeding demo data…');

  const hash = bcrypt.hashSync(PASSWORD, 10);
  const day = 24 * 3600 * 1000;
  const t0 = Date.now();
  const iso = (msAgo) => new Date(t0 - msAgo).toISOString();

  // Images are processed BEFORE the transaction (no file work inside transactions).
  const images = [];
  for (const [i, p] of products.entries()) {
    const cat = categories.find((c) => c.slug === p[1]);
    images[i] = await imageFor(p[5], p[2], cat.color);
  }

  db.transaction(() => {
    const insCat = db.prepare('INSERT INTO categories (name, slug) VALUES (?, ?)');
    const catId = {};
    for (const c of categories) catId[c.slug] = Number(insCat.run(c.name, c.slug).lastInsertRowid);

    const insUser = db.prepare('INSERT INTO users (email, password_hash, name, phone, store_name, created_at) VALUES (?, ?, ?, ?, ?, ?)');
    const sellerIds = sellers.map((s) => Number(insUser.run(s.email, hash, s.name, s.phone, s.store, iso(60 * day)).lastInsertRowid));
    const buyerIds = buyers.map((b) => Number(insUser.run(b.email, hash, b.name, b.phone, null, iso(50 * day)).lastInsertRowid));

    const insProduct = db.prepare(
      `INSERT INTO products (seller_id, category_id, title, description, price_amd, stock, is_published, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    );
    const insImage = db.prepare('INSERT INTO product_images (product_id, file_path, position) VALUES (?, ?, 0)');
    const productIds = [];
    products.forEach(([seller, cat, title, price, stock, , description], i) => {
      // Spread creation dates so "newest" sorting is meaningful.
      const created = iso((products.length - i) * 7 * 3600 * 1000);
      const id = Number(insProduct.run(sellerIds[seller], catId[cat], title, description, price, stock, created, created).lastInsertRowid);
      insImage.run(id, images[i]);
      productIds.push(id);
    });

    // ── Demo orders (written exactly like checkout would: copied title/price/address, stock taken) ──
    const insOrder = db.prepare(
      `INSERT INTO orders (buyer_id, recipient, phone, region, city, street, apartment, note, total_amd, request_key, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const insSO = db.prepare('INSERT INTO seller_orders (order_id, seller_id, status, subtotal_amd, updated_at) VALUES (?, ?, ?, ?, ?)');
    const insItem = db.prepare('INSERT INTO order_items (seller_order_id, product_id, title, unit_price_amd, quantity) VALUES (?, ?, ?, ?, ?)');
    const insHist = db.prepare('INSERT INTO status_history (seller_order_id, from_status, to_status, changed_by, created_at) VALUES (?, ?, ?, ?, ?)');
    const takeStock = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?');
    const flow = ['placed', 'confirmed', 'shipped', 'delivered'];

    const addresses = [
      { recipient: 'Lilit Sargsyan', phone: '+374 77 444444', region: 'Yerevan', city: 'Yerevan', street: 'Abovyan St 12', apartment: '18', note: 'Call before arriving, please.' },
      { recipient: 'Narek Avetisyan', phone: '+374 98 555555', region: 'Lori', city: 'Vanadzor', street: 'Tigran Mets Ave 45', apartment: '7', note: null },
    ];

    /** parts: [{ productIndex, qty }...], status per seller via statusOf(sellerIdx) */
    function makeOrder(buyerIdx, daysAgo, lines, statusOf) {
      const created = t0 - daysAgo * day;
      const buyerId = buyerIds[buyerIdx];
      const a = addresses[buyerIdx];
      const bySeller = new Map();
      for (const l of lines) {
        const p = products[l.p];
        if (!bySeller.has(p[0])) bySeller.set(p[0], []);
        bySeller.get(p[0]).push({ ...l, title: p[2], price: p[3], id: productIds[l.p] });
      }
      const total = lines.reduce((s, l) => s + products[l.p][3] * l.q, 0);
      const orderId = Number(insOrder.run(buyerId, a.recipient, a.phone, a.region, a.city, a.street, a.apartment, a.note, total,
        `seed-${crypto.randomUUID()}`, new Date(created).toISOString()).lastInsertRowid);
      for (const [sellerIdx, items] of bySeller) {
        const final = statusOf(sellerIdx);
        const subtotal = items.reduce((s, l) => s + l.price * l.q, 0);
        const path = final === 'cancelled' ? ['placed', 'cancelled'] : flow.slice(0, flow.indexOf(final) + 1);
        const updated = new Date(created + (path.length - 1) * 0.4 * day).toISOString();
        const soId = Number(insSO.run(orderId, sellerIds[sellerIdx], final, subtotal, updated).lastInsertRowid);
        for (const l of items) {
          insItem.run(soId, l.id, l.title, l.price, l.q);
          if (final !== 'cancelled') takeStock.run(l.q, l.id, l.q);
        }
        path.forEach((st, k) => {
          const by = k === 0 || (st === 'cancelled') ? buyerId : sellerIds[sellerIdx];
          insHist.run(soId, k === 0 ? null : path[k - 1], st, by, new Date(created + k * 0.4 * day).toISOString());
        });
      }
    }

    makeOrder(0, 12, [{ p: 0, q: 1 }, { p: 15, q: 2 }], () => 'delivered');
    makeOrder(1, 9, [{ p: 12, q: 1 }, { p: 39, q: 2 }], () => 'delivered');
    makeOrder(0, 4, [{ p: 8, q: 1 }, { p: 28, q: 1 }, { p: 37, q: 1 }], (s) => (s === 0 ? 'shipped' : s === 1 ? 'confirmed' : 'delivered'));
    makeOrder(1, 2, [{ p: 4, q: 1 }, { p: 20, q: 1 }], (s) => (s === 0 ? 'placed' : 'cancelled'));
    makeOrder(0, 0.2, [{ p: 6, q: 1 }, { p: 33, q: 1 }], () => 'placed');

    // ── Reviews on delivered items ──
    const insReview = db.prepare('INSERT INTO reviews (product_id, buyer_id, rating, body, created_at) VALUES (?, ?, ?, ?, ?)');
    const reviews = [
      [0, 0, 5, 'Amazing noise cancelling — I use them every day on the metro. Delivery to Abovyan street was quick.'],
      [15, 0, 5, 'Real hand-hammered copper, the coffee tastes like at my grandmother\'s house.'],
      [12, 1, 4, 'Very comfortable mouse, battery lasts weeks. A bit pricey, but worth it.'],
      [39, 1, 5, 'Excellent wine, we opened it for a family dinner and everyone loved it.'],
      [37, 0, 4, 'Great selection — already finished two of them. Packed very carefully.'],
    ];
    for (const [p, b, rating, body] of reviews) insReview.run(productIds[p], buyerIds[b], rating, body, iso(Math.random() * 3 * day));
    db.prepare(
      `UPDATE products SET rating_count = (SELECT COUNT(*) FROM reviews r WHERE r.product_id = products.id),
                           rating_avg = COALESCE((SELECT AVG(rating) FROM reviews r WHERE r.product_id = products.id), 0)`,
    ).run();
  }).immediate();

  console.log(`[seed] done: ${categories.length} categories, ${sellers.length} sellers, ${products.length} products, ${buyers.length} buyers. Password for all demo accounts: ${PASSWORD}`);
  return true;
}
