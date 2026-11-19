import { Router } from 'express';
import { db, tx, now } from '../db.js';
import { requireAuth, requireSeller } from '../auth.js';
import { Validator, parseId } from '../validate.js';
import { notFound, conflict, badRequest } from '../errors.js';
import { applyTransition, sellerAllowedMoves, transitionError, STATUSES } from '../lifecycle.js';
import { upload, assertImage, saveImage, removeImageFiles, imageUrls, MAX_IMAGES } from '../images.js';
import { productImages, publicUser, MAIN_IMAGE_SQL } from '../serialize.js';

const router = Router();

// ───────────────────────────── Become a seller ─────────────────────────────

router.post('/seller/activate', requireAuth, (req, res) => {
  const v = new Validator(req.body);
  const storeName = v.string('storeName', { min: 2, max: 60, label: 'Store name' });
  const phone = v.phone();
  v.done();

  const taken = db.prepare('SELECT id FROM users WHERE store_name = ? AND id != ?').get(storeName, req.user.id);
  if (taken) throw conflict('STORE_NAME_TAKEN', 'This store name is already taken.', { fields: { storeName: 'This store name is already taken.' } });

  try {
    db.prepare('UPDATE users SET store_name = ?, phone = ? WHERE id = ?').run(storeName, phone, req.user.id);
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') throw conflict('STORE_NAME_TAKEN', 'This store name is already taken.', { fields: { storeName: 'This store name is already taken.' } });
    throw e;
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({ user: publicUser(user) });
});

// ───────────────────────────── Overview (plain SQL) ─────────────────────────────

router.get('/seller/overview', requireSeller, (req, res) => {
  const sellerId = req.user.id;
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();

  const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  for (const r of db.prepare(
    'SELECT status, COUNT(*) AS n FROM seller_orders WHERE seller_id = ? GROUP BY status',
  ).all(sellerId)) byStatus[r.status] = r.n;

  const revenue30d = db.prepare(
    `SELECT COALESCE(SUM(so.subtotal_amd), 0)
       FROM seller_orders so
      WHERE so.seller_id = ?
        AND so.status = 'delivered'
        AND EXISTS (SELECT 1 FROM status_history h
                     WHERE h.seller_order_id = so.id AND h.to_status = 'delivered' AND h.created_at >= ?)`,
  ).pluck().get(sellerId, since);

  const revenueAll = db.prepare(
    `SELECT COALESCE(SUM(subtotal_amd), 0) FROM seller_orders WHERE seller_id = ? AND status = 'delivered'`,
  ).pluck().get(sellerId);

  const products = db.prepare(
    `SELECT COUNT(*) AS total, COALESCE(SUM(is_published), 0) AS published,
            COALESCE(SUM(CASE WHEN is_published = 1 AND stock = 0 THEN 1 ELSE 0 END), 0) AS sold_out
       FROM products WHERE seller_id = ?`,
  ).get(sellerId);

  const recent = db.prepare(
    `SELECT so.id, so.status, so.subtotal_amd, o.id AS order_id, o.created_at, o.recipient, o.city
       FROM seller_orders so JOIN orders o ON o.id = so.order_id
      WHERE so.seller_id = ?
      ORDER BY o.created_at DESC, so.id DESC LIMIT 5`,
  ).all(sellerId);

  res.json({
    toConfirm: byStatus.placed,
    toShip: byStatus.confirmed,
    byStatus,
    revenue30d,
    revenueAll,
    products: { total: products.total, published: products.published, soldOut: products.sold_out },
    recentOrders: recent.map((r) => ({
      id: r.id, orderId: r.order_id, status: r.status, subtotalAmd: r.subtotal_amd,
      createdAt: r.created_at, shipTo: `${r.recipient}, ${r.city}`,
    })),
  });
});

// ───────────────────────────── Seller products ─────────────────────────────

const ownProduct = (id, sellerId) =>
  id && db.prepare('SELECT * FROM products WHERE id = ? AND seller_id = ?').get(id, sellerId);

function sellerProductJson(p) {
  const category = db.prepare('SELECT id, name, slug FROM categories WHERE id = ?').get(p.category_id);
  return {
    id: p.id,
    title: p.title,
    description: p.description,
    priceAmd: p.price_amd,
    stock: p.stock,
    categoryId: p.category_id,
    category,
    isPublished: Boolean(p.is_published),
    ratingAvg: Math.round(p.rating_avg * 10) / 10,
    ratingCount: p.rating_count,
    images: productImages(p.id),
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
}

function readProductFields(body, { partial }) {
  const v = new Validator(body);
  const out = {};
  const want = (f) => !partial || v.has(f);
  if (want('title')) out.title = v.string('title', { min: 3, max: 150, label: 'Title' });
  if (want('description')) out.description = v.string('description', { min: 10, max: 5000, label: 'Description' });
  if (want('priceAmd')) out.price_amd = v.int('priceAmd', { min: 1, max: 100_000_000, label: 'Price' });
  if (want('stock')) out.stock = v.int('stock', { min: 0, max: 100_000, label: 'Stock' });
  if (want('categoryId')) {
    const cid = v.int('categoryId', { min: 1, label: 'Category' });
    if (cid && !db.prepare('SELECT 1 FROM categories WHERE id = ?').get(cid)) v.fail('categoryId', 'Choose a category.');
    out.category_id = cid;
  }
  if (v.has('isPublished')) out.is_published = body.isPublished ? 1 : 0;
  v.done();
  return out;
}

router.get('/seller/products', requireSeller, (req, res) => {
  const rows = db.prepare(
    `SELECT p.*, ${MAIN_IMAGE_SQL} AS main_image,
            (SELECT COUNT(*) FROM product_images WHERE product_id = p.id) AS image_count,
            (SELECT COALESCE(SUM(oi.quantity), 0)
               FROM order_items oi JOIN seller_orders so ON so.id = oi.seller_order_id
              WHERE oi.product_id = p.id AND so.status != 'cancelled') AS units_sold,
            c.name AS category_name
       FROM products p JOIN categories c ON c.id = p.category_id
      WHERE p.seller_id = ?
      ORDER BY p.created_at DESC, p.id DESC`,
  ).all(req.user.id);
  res.json({
    products: rows.map((p) => ({
      id: p.id,
      title: p.title,
      priceAmd: p.price_amd,
      stock: p.stock,
      isPublished: Boolean(p.is_published),
      unitsSold: p.units_sold,
      imageCount: p.image_count,
      image: imageUrls(p.main_image),
      categoryName: p.category_name,
      ratingAvg: Math.round(p.rating_avg * 10) / 10,
      ratingCount: p.rating_count,
      updatedAt: p.updated_at,
    })),
  });
});

router.get('/seller/products/:id', requireSeller, (req, res) => {
  const p = ownProduct(parseId(req.params.id), req.user.id);
  if (!p) throw notFound('Product not found.');
  res.json({ product: sellerProductJson(p) });
});

router.post('/seller/products', requireSeller, (req, res) => {
  const f = readProductFields(req.body, { partial: false });
  // A new product starts unpublished; it is published once it has at least one image.
  const ts = now();
  const id = Number(db.prepare(
    `INSERT INTO products (seller_id, category_id, title, description, price_amd, stock, is_published, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
  ).run(req.user.id, f.category_id, f.title, f.description, f.price_amd, f.stock, ts, ts).lastInsertRowid);
  res.status(201).json({ product: sellerProductJson(ownProduct(id, req.user.id)) });
});

router.patch('/seller/products/:id', requireSeller, (req, res) => {
  const p = ownProduct(parseId(req.params.id), req.user.id);
  if (!p) throw notFound('Product not found.');
  const f = readProductFields(req.body, { partial: true });

  const imageOrder = req.body?.imageOrder;
  const current = db.prepare('SELECT id, file_path FROM product_images WHERE product_id = ? ORDER BY position').all(p.id);

  if (imageOrder !== undefined) {
    const ids = Array.isArray(imageOrder) ? imageOrder.map(Number) : [];
    const same = ids.length === current.length && current.every((img) => ids.includes(img.id));
    if (!same) throw badRequest('Image order must list every image of the product exactly once.', { images: 'Image order is invalid.' });
  }
  if (f.is_published === 1 && current.length === 0) {
    throw badRequest('Add at least one photo before publishing.', { images: 'Add at least one photo before publishing.' });
  }

  tx(() => {
    const cols = Object.keys(f);
    if (cols.length) {
      db.prepare(`UPDATE products SET ${cols.map((c) => `${c} = ?`).join(', ')}, updated_at = ? WHERE id = ? AND seller_id = ?`)
        .run(...cols.map((c) => f[c]), now(), p.id, req.user.id);
    }
    if (Array.isArray(imageOrder)) {
      const byId = new Map(current.map((img) => [img.id, img]));
      db.prepare('DELETE FROM product_images WHERE product_id = ?').run(p.id);
      const ins = db.prepare('INSERT INTO product_images (id, product_id, file_path, position) VALUES (?, ?, ?, ?)');
      imageOrder.map(Number).forEach((imgId, pos) => ins.run(imgId, p.id, byId.get(imgId).file_path, pos));
    }
  });
  res.json({ product: sellerProductJson(ownProduct(p.id, req.user.id)) });
});

router.post('/seller/products/:id/images', requireSeller, upload.array('images', MAX_IMAGES), async (req, res) => {
  const p = ownProduct(parseId(req.params.id), req.user.id);
  if (!p) throw notFound('Product not found.');
  const files = req.files || [];
  if (files.length === 0) throw badRequest('Choose at least one image.', { images: 'Choose at least one image.' });

  const existing = db.prepare('SELECT COUNT(*) FROM product_images WHERE product_id = ?').pluck().get(p.id);
  if (existing + files.length > MAX_IMAGES) {
    throw badRequest(`A product can have at most ${MAX_IMAGES} images (it has ${existing}).`, { images: `Up to ${MAX_IMAGES} images.` });
  }

  // Check every file first, then resize and save — all outside the database transaction.
  for (const f of files) await assertImage(f.buffer, f.originalname);
  const bases = [];
  for (const f of files) bases.push(await saveImage(f.buffer));

  try {
    tx(() => {
      let pos = db.prepare('SELECT COALESCE(MAX(position), -1) FROM product_images WHERE product_id = ?').pluck().get(p.id) + 1;
      const ins = db.prepare('INSERT INTO product_images (product_id, file_path, position) VALUES (?, ?, ?)');
      for (const base of bases) ins.run(p.id, base, pos++);
      db.prepare('UPDATE products SET updated_at = ? WHERE id = ?').run(now(), p.id);
    });
  } catch (e) {
    bases.forEach(removeImageFiles);
    throw e;
  }
  res.status(201).json({ product: sellerProductJson(ownProduct(p.id, req.user.id)) });
});

function deleteImage(req, res) {
  const p = ownProduct(parseId(req.params.id), req.user.id);
  if (!p) throw notFound('Product not found.');
  const imageId = parseId(req.params.imageId ?? req.query.imageId ?? req.body?.imageId);
  const img = imageId && db.prepare('SELECT * FROM product_images WHERE id = ? AND product_id = ?').get(imageId, p.id);
  if (!img) throw notFound('Image not found.');

  const count = db.prepare('SELECT COUNT(*) FROM product_images WHERE product_id = ?').pluck().get(p.id);
  if (p.is_published && count <= 1) {
    throw conflict('LAST_IMAGE', 'A published product needs at least one photo. Upload another one first or unpublish the product.');
  }

  tx(() => {
    const rest = db.prepare('SELECT id, file_path FROM product_images WHERE product_id = ? AND id != ? ORDER BY position').all(p.id, img.id);
    db.prepare('DELETE FROM product_images WHERE product_id = ?').run(p.id);
    const ins = db.prepare('INSERT INTO product_images (id, product_id, file_path, position) VALUES (?, ?, ?, ?)');
    rest.forEach((r, pos) => ins.run(r.id, p.id, r.file_path, pos));
    db.prepare('UPDATE products SET updated_at = ? WHERE id = ?').run(now(), p.id);
  });
  removeImageFiles(img.file_path);
  res.json({ product: sellerProductJson(ownProduct(p.id, req.user.id)) });
}

router.delete('/seller/products/:id/images/:imageId', requireSeller, deleteImage);
router.delete('/seller/products/:id/images', requireSeller, deleteImage);

// ───────────────────────────── Seller orders ─────────────────────────────

router.get('/seller/orders', requireSeller, (req, res) => {
  const status = STATUSES.includes(req.query.status) ? req.query.status : null;

  const counts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  let all = 0;
  for (const r of db.prepare('SELECT status, COUNT(*) AS n FROM seller_orders WHERE seller_id = ? GROUP BY status').all(req.user.id)) {
    counts[r.status] = r.n;
    all += r.n;
  }

  const rows = db.prepare(
    `SELECT so.id, so.status, so.subtotal_amd, so.updated_at, o.id AS order_id, o.created_at,
            o.recipient, o.city, o.region,
            (SELECT COALESCE(SUM(quantity), 0) FROM order_items WHERE seller_order_id = so.id) AS item_count
       FROM seller_orders so JOIN orders o ON o.id = so.order_id
      WHERE so.seller_id = ? ${status ? 'AND so.status = ?' : ''}
      ORDER BY o.created_at DESC, so.id DESC`,
  ).all(...(status ? [req.user.id, status] : [req.user.id]));

  res.json({
    counts: { all, ...counts },
    orders: rows.map((r) => ({
      id: r.id,
      orderId: r.order_id,
      status: r.status,
      subtotalAmd: r.subtotal_amd,
      itemCount: r.item_count,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      shipTo: `${r.recipient}, ${r.city}, ${r.region}`,
    })),
  });
});

function sellerOrderDetail(id, sellerId) {
  // Scoped: WHERE id = ? AND seller_id = ?
  const so = db.prepare('SELECT * FROM seller_orders WHERE id = ? AND seller_id = ?').get(id, sellerId);
  if (!so) return null;
  const o = db.prepare(
    `SELECT o.*, u.name AS buyer_name, u.email AS buyer_email FROM orders o JOIN users u ON u.id = o.buyer_id WHERE o.id = ?`,
  ).get(so.order_id);
  const items = db.prepare(
    `SELECT oi.*, ${MAIN_IMAGE_SQL.replace('p.id', 'oi.product_id')} AS main_image,
            p.title AS current_title, p.price_amd AS current_price
       FROM order_items oi JOIN products p ON p.id = oi.product_id
      WHERE oi.seller_order_id = ? ORDER BY oi.id`,
  ).all(so.id);
  const history = db.prepare(
    `SELECT h.from_status, h.to_status, h.created_at, u.name, h.changed_by
       FROM status_history h JOIN users u ON u.id = h.changed_by
      WHERE h.seller_order_id = ? ORDER BY h.id`,
  ).all(so.id);

  return {
    id: so.id,
    orderId: o.id,
    status: so.status,
    subtotalAmd: so.subtotal_amd,
    cashToCollect: so.status === 'cancelled' ? 0 : so.subtotal_amd,
    createdAt: o.created_at,
    updatedAt: so.updated_at,
    buyer: { name: o.buyer_name },
    delivery: {
      recipient: o.recipient, phone: o.phone, region: o.region, city: o.city,
      street: o.street, apartment: o.apartment, note: o.note,
    },
    items: items.map((i) => ({
      id: i.id,
      productId: i.product_id,
      title: i.title,
      unitPriceAmd: i.unit_price_amd,
      quantity: i.quantity,
      lineTotal: i.unit_price_amd * i.quantity,
      image: imageUrls(i.main_image),
    })),
    history: history.map((h) => ({
      from: h.from_status, to: h.to_status, at: h.created_at,
      by: h.changed_by === sellerId ? 'You' : h.name,
    })),
    allowedMoves: sellerAllowedMoves(so.status),
  };
}

router.get('/seller/orders/:id', requireSeller, (req, res) => {
  const id = parseId(req.params.id);
  const order = id && sellerOrderDetail(id, req.user.id);
  if (!order) throw notFound('Order not found.');
  res.json({ order });
});

router.post('/seller/orders/:id/status', requireSeller, (req, res) => {
  const id = parseId(req.params.id);
  const so = id && db.prepare('SELECT id, status FROM seller_orders WHERE id = ? AND seller_id = ?').get(id, req.user.id);
  if (!so) throw notFound('Order not found.');

  const to = req.body?.to;
  if (!STATUSES.includes(to)) throw badRequest(`"to" must be one of: ${STATUSES.join(', ')}.`, { to: 'Unknown status.' });
  if (!sellerAllowedMoves(so.status).includes(to)) throw transitionError(so.status, to);

  tx(() => applyTransition(so.id, so.status, to, req.user.id));
  res.json({ order: sellerOrderDetail(so.id, req.user.id) });
});

export default router;
