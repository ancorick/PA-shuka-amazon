import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../auth.js';
import { Validator, parseId } from '../validate.js';
import { notFound, forbidden, conflict } from '../errors.js';
import { imageUrls } from '../images.js';
import { MAIN_IMAGE_SQL } from '../serialize.js';

const router = Router();
router.use('/cart', requireAuth);

const MAX_QTY = 99;

export function buildCart(userId) {
  const rows = db.prepare(
    `SELECT ci.product_id, ci.quantity, ci.price_when_added,
            p.title, p.price_amd, p.stock, p.is_published, p.seller_id,
            u.store_name, ${MAIN_IMAGE_SQL} AS main_image
       FROM cart_items ci
       JOIN products p ON p.id = ci.product_id
       JOIN users u ON u.id = p.seller_id
      WHERE ci.user_id = ?
      ORDER BY u.store_name, p.title`,
  ).all(userId);

  const groups = new Map();
  let grandTotal = 0;
  let count = 0;
  let hasProblems = false;

  for (const r of rows) {
    const unavailable = !r.is_published;
    const soldOut = !unavailable && r.stock === 0;
    const exceedsStock = !unavailable && !soldOut && r.quantity > r.stock;
    const priceChanged = r.price_when_added !== r.price_amd;
    const lineTotal = r.price_amd * r.quantity;
    if (unavailable || soldOut || exceedsStock) hasProblems = true;

    if (!groups.has(r.seller_id)) {
      groups.set(r.seller_id, { seller: { id: r.seller_id, storeName: r.store_name }, items: [], subtotal: 0 });
    }
    const g = groups.get(r.seller_id);
    g.items.push({
      productId: r.product_id,
      title: r.title,
      image: imageUrls(r.main_image),
      quantity: r.quantity,
      priceAmd: r.price_amd,
      priceWhenAdded: r.price_when_added,
      stock: r.stock,
      lineTotal,
      priceChanged,
      soldOut,
      unavailable,
      exceedsStock,
    });
    if (!unavailable && !soldOut) {
      g.subtotal += lineTotal;
      grandTotal += lineTotal;
    }
    count += r.quantity;
  }

  return { groups: [...groups.values()], grandTotal, count, hasProblems };
}

router.get('/cart', (req, res) => {
  res.json({ cart: buildCart(req.user.id) });
});

router.put('/cart/items/:productId', (req, res) => {
  const productId = parseId(req.params.productId);
  const v = new Validator(req.body);
  const quantity = v.int('quantity', { min: 1, max: MAX_QTY, label: 'Quantity' });
  v.done();

  const product = productId && db.prepare('SELECT id, title, price_amd, stock, seller_id, is_published FROM products WHERE id = ?').get(productId);
  if (!product || !product.is_published) throw notFound('This product is not available.');
  if (product.seller_id === req.user.id) throw forbidden('You cannot buy your own product.', 'OWN_PRODUCT');
  if (product.stock === 0) throw conflict('OUT_OF_STOCK', `“${product.title}” is out of stock.`, { stock: 0 });
  if (quantity > product.stock) {
    throw conflict('OUT_OF_STOCK', `Only ${product.stock} left in stock of “${product.title}”.`, { stock: product.stock });
  }

  // On insert remember the price; on update keep the original price so a price change is still detected.
  db.prepare(
    `INSERT INTO cart_items (user_id, product_id, quantity, price_when_added) VALUES (?, ?, ?, ?)
     ON CONFLICT (user_id, product_id) DO UPDATE SET quantity = excluded.quantity`,
  ).run(req.user.id, productId, quantity, product.price_amd);

  res.json({ cart: buildCart(req.user.id) });
});

router.delete('/cart/items/:productId', (req, res) => {
  const productId = parseId(req.params.productId);
  db.prepare('DELETE FROM cart_items WHERE user_id = ? AND product_id = ?').run(req.user.id, productId || 0);
  res.json({ cart: buildCart(req.user.id) });
});

export default router;
