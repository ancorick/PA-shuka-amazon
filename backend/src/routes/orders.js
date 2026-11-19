import { Router } from 'express';
import { db, tx, now } from '../db.js';
import { requireAuth } from '../auth.js';
import { Validator, REGIONS, parseId } from '../validate.js';
import { HttpError, notFound, conflict } from '../errors.js';
import { applyTransition, buyerCanCancel, transitionError } from '../lifecycle.js';
import { imageUrls } from '../images.js';
import { MAIN_IMAGE_SQL } from '../serialize.js';

const router = Router();
router.use('/orders', requireAuth);

const findByKey = db.prepare('SELECT id, buyer_id FROM orders WHERE request_key = ?');

// ───────────────────────────── Checkout ─────────────────────────────
// The whole order is written in ONE `BEGIN IMMEDIATE` transaction, in plain SQL.
const sql = {
  cart: db.prepare(
    `SELECT ci.product_id, ci.quantity, ci.price_when_added,
            p.title, p.price_amd, p.stock, p.is_published, p.seller_id
       FROM cart_items ci JOIN products p ON p.id = ci.product_id
      WHERE ci.user_id = ?
      ORDER BY p.seller_id, ci.product_id`,
  ),
  refreshCartPrice: db.prepare('UPDATE cart_items SET price_when_added = ? WHERE user_id = ? AND product_id = ?'),
  takeStock: db.prepare(
    'UPDATE products SET stock = stock - ?, updated_at = ? WHERE id = ? AND stock >= ? AND is_published = 1',
  ),
  insertOrder: db.prepare(
    `INSERT INTO orders (buyer_id, recipient, phone, region, city, street, apartment, note, total_amd, request_key, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ),
  insertSellerOrder: db.prepare(
    `INSERT INTO seller_orders (order_id, seller_id, status, subtotal_amd, updated_at) VALUES (?, ?, 'placed', ?, ?)`,
  ),
  insertItem: db.prepare(
    `INSERT INTO order_items (seller_order_id, product_id, title, unit_price_amd, quantity) VALUES (?, ?, ?, ?, ?)`,
  ),
  insertHistory: db.prepare(
    `INSERT INTO status_history (seller_order_id, from_status, to_status, changed_by, created_at) VALUES (?, NULL, 'placed', ?, ?)`,
  ),
  clearCart: db.prepare('DELETE FROM cart_items WHERE user_id = ?'),
};

class Rollback extends HttpError {}

router.post('/orders', (req, res) => {
  const userId = req.user.id;
  const v = new Validator(req.body);
  const requestKey = v.string('requestKey', { min: 8, max: 100, label: 'Request key' });
  const recipient = v.string('recipient', { min: 2, max: 100, label: 'Recipient name' });
  const phone = v.phone();
  const region = v.oneOf('region', REGIONS, { label: 'Region' });
  const city = v.string('city', { min: 2, max: 80, label: 'City or village' });
  const street = v.string('street', { min: 2, max: 150, label: 'Street and building' });
  const apartment = v.string('apartment', { max: 30, label: 'Apartment', optional: true });
  const note = v.string('note', { max: 500, label: 'Delivery note', optional: true });
  v.done();

  // Double click / retry: the same request key returns the order that already exists.
  const existing = findByKey.get(requestKey);
  if (existing) {
    if (existing.buyer_id !== userId) throw conflict('REQUEST_KEY_USED', 'This checkout key was already used.');
    return res.status(200).json({ order: { id: existing.id }, duplicate: true });
  }

  let outcome;
  try {
    outcome = tx(() => {
      const ts = now();
      const lines = sql.cart.all(userId);
      if (lines.length === 0) throw new Rollback(409, 'CART_EMPTY', 'Your cart is empty.');

      for (const l of lines) {
        if (l.seller_id === userId) throw new Rollback(403, 'OWN_PRODUCT', `You cannot buy your own product “${l.title}”.`);
        if (!l.is_published) throw new Rollback(409, 'UNAVAILABLE', `“${l.title}” is no longer available. Remove it from your cart.`, { productId: l.product_id });
      }

      // Price changed since it went into the cart → stop, show the new prices, keep them so the next try passes.
      const changed = lines.filter((l) => l.price_when_added !== l.price_amd);
      if (changed.length) {
        for (const l of changed) sql.refreshCartPrice.run(l.price_amd, userId, l.product_id);
        return {
          priceChanged: changed.map((l) => ({
            productId: l.product_id, title: l.title, oldPrice: l.price_when_added, newPrice: l.price_amd,
          })),
        };
      }

      // Take the stock atomically; a line that fails rolls back the whole order.
      for (const l of lines) {
        const r = sql.takeStock.run(l.quantity, ts, l.product_id, l.quantity);
        if (r.changes !== 1) {
          const left = db.prepare('SELECT stock FROM products WHERE id = ?').pluck().get(l.product_id);
          throw new Rollback(409, 'OUT_OF_STOCK',
            left > 0 ? `Only ${left} left of “${l.title}”. Lower the quantity and try again.` : `“${l.title}” just sold out.`,
            { productId: l.product_id, stock: left });
        }
      }

      const total = lines.reduce((s, l) => s + l.price_amd * l.quantity, 0);
      const orderId = Number(sql.insertOrder.run(
        userId, recipient, phone, region, city, street, apartment, note, total, requestKey, ts,
      ).lastInsertRowid);

      const bySeller = new Map();
      for (const l of lines) {
        if (!bySeller.has(l.seller_id)) bySeller.set(l.seller_id, []);
        bySeller.get(l.seller_id).push(l);
      }
      for (const [sellerId, items] of bySeller) {
        const subtotal = items.reduce((s, l) => s + l.price_amd * l.quantity, 0);
        const soId = Number(sql.insertSellerOrder.run(orderId, sellerId, subtotal, ts).lastInsertRowid);
        for (const l of items) sql.insertItem.run(soId, l.product_id, l.title, l.price_amd, l.quantity);
        sql.insertHistory.run(soId, userId, ts);
      }

      sql.clearCart.run(userId);
      return { orderId };
    });
  } catch (e) {
    if (e instanceof Rollback) throw new HttpError(e.status, e.code, e.message, e.extra);
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE' && String(e.message).includes('request_key')) {
      const again = findByKey.get(requestKey);
      if (again && again.buyer_id === userId) return res.status(200).json({ order: { id: again.id }, duplicate: true });
    }
    throw e;
  }

  if (outcome.priceChanged) {
    const names = outcome.priceChanged.map((p) => `“${p.title}”`).join(', ');
    throw conflict('PRICE_CHANGED', `The price of ${names} changed since you added it. Please review the new price and place the order again.`, { items: outcome.priceChanged });
  }
  res.status(201).json({ order: { id: outcome.orderId } });
});

// ───────────────────────────── Buyer orders ─────────────────────────────

router.get('/orders', (req, res) => {
  const orders = db.prepare(
    `SELECT id, total_amd, created_at, recipient, city, region FROM orders WHERE buyer_id = ? ORDER BY id DESC`,
  ).all(req.user.id);

  const partsStmt = db.prepare(
    `SELECT so.id, so.status, so.subtotal_amd, u.store_name,
            (SELECT COALESCE(SUM(quantity), 0) FROM order_items WHERE seller_order_id = so.id) AS item_count
       FROM seller_orders so JOIN users u ON u.id = so.seller_id
      WHERE so.order_id = ? ORDER BY so.id`,
  );
  const thumbsStmt = db.prepare(
    `SELECT oi.title, ${MAIN_IMAGE_SQL.replace('p.id', 'oi.product_id')} AS main_image
       FROM order_items oi JOIN seller_orders so ON so.id = oi.seller_order_id
      WHERE so.order_id = ? ORDER BY oi.id LIMIT 4`,
  );

  res.json({
    orders: orders.map((o) => ({
      id: o.id,
      totalAmd: o.total_amd,
      createdAt: o.created_at,
      shipTo: `${o.recipient}, ${o.city}`,
      parts: partsStmt.all(o.id).map((p) => ({
        id: p.id, status: p.status, subtotalAmd: p.subtotal_amd, storeName: p.store_name, itemCount: p.item_count,
      })),
      thumbs: thumbsStmt.all(o.id).map((t) => ({ title: t.title, image: imageUrls(t.main_image) })),
    })),
  });
});

export function orderDetailForBuyer(orderId, userId) {
  // Scoped to the current buyer: someone else's order is simply "not found".
  const o = db.prepare('SELECT * FROM orders WHERE id = ? AND buyer_id = ?').get(orderId, userId);
  if (!o) return null;

  const parts = db.prepare(
    `SELECT so.*, u.store_name, u.phone AS seller_phone FROM seller_orders so JOIN users u ON u.id = so.seller_id
      WHERE so.order_id = ? ORDER BY so.id`,
  ).all(o.id);

  const itemsStmt = db.prepare(
    `SELECT oi.*, ${MAIN_IMAGE_SQL.replace('p.id', 'oi.product_id')} AS main_image,
            EXISTS (SELECT 1 FROM reviews r WHERE r.product_id = oi.product_id AND r.buyer_id = ?) AS reviewed
       FROM order_items oi WHERE oi.seller_order_id = ? ORDER BY oi.id`,
  );
  const historyStmt = db.prepare(
    `SELECT h.from_status, h.to_status, h.created_at, u.name, (h.changed_by = ?) AS by_me
       FROM status_history h JOIN users u ON u.id = h.changed_by
      WHERE h.seller_order_id = ? ORDER BY h.id`,
  );

  return {
    id: o.id,
    createdAt: o.created_at,
    totalAmd: o.total_amd,
    address: {
      recipient: o.recipient, phone: o.phone, region: o.region, city: o.city,
      street: o.street, apartment: o.apartment, note: o.note,
    },
    payment: 'Cash on delivery',
    parts: parts.map((p) => ({
      id: p.id,
      status: p.status,
      subtotalAmd: p.subtotal_amd,
      updatedAt: p.updated_at,
      seller: { id: p.seller_id, storeName: p.store_name },
      canCancel: buyerCanCancel(p.status),
      items: itemsStmt.all(userId, p.id).map((i) => ({
        id: i.id,
        productId: i.product_id,
        title: i.title,
        unitPriceAmd: i.unit_price_amd,
        quantity: i.quantity,
        lineTotal: i.unit_price_amd * i.quantity,
        image: imageUrls(i.main_image),
        canReview: p.status === 'delivered' && !i.reviewed,
        reviewed: Boolean(i.reviewed),
      })),
      history: historyStmt.all(userId, p.id).map((h) => ({
        from: h.from_status, to: h.to_status, at: h.created_at, by: h.by_me ? 'You' : h.name,
      })),
    })),
  };
}

router.get('/orders/:id', (req, res) => {
  const id = parseId(req.params.id);
  const order = id && orderDetailForBuyer(id, req.user.id);
  if (!order) throw notFound('Order not found.');
  res.json({ order });
});

router.post('/orders/:id/sellers/:sellerOrderId/cancel', (req, res) => {
  const orderId = parseId(req.params.id);
  const soId = parseId(req.params.sellerOrderId);
  const so = orderId && soId && db.prepare(
    `SELECT so.id, so.status FROM seller_orders so JOIN orders o ON o.id = so.order_id
      WHERE so.id = ? AND so.order_id = ? AND o.buyer_id = ?`,
  ).get(soId, orderId, req.user.id);
  if (!so) throw notFound('Order not found.');
  if (!buyerCanCancel(so.status)) {
    throw so.status === 'shipped' || so.status === 'delivered'
      ? transitionError(so.status, 'cancelled')
      : conflict('INVALID_TRANSITION', `This part of the order is already ${so.status}.`);
  }
  tx(() => applyTransition(so.id, so.status, 'cancelled', req.user.id));
  res.json({ order: orderDetailForBuyer(orderId, req.user.id) });
});

export default router;
