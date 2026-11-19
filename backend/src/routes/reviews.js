import { Router } from 'express';
import { db, tx, now } from '../db.js';
import { requireAuth } from '../auth.js';
import { Validator, parseId } from '../validate.js';
import { notFound, forbidden, conflict } from '../errors.js';

const router = Router();

router.post('/products/:id/reviews', requireAuth, (req, res) => {
  const id = parseId(req.params.id);
  const product = id && db.prepare('SELECT id FROM products WHERE id = ?').get(id);
  if (!product) throw notFound('Product not found.');

  const v = new Validator(req.body);
  const rating = v.int('rating', { min: 1, max: 5, label: 'Rating' });
  const body = v.string('body', { min: 3, max: 2000, label: 'Review' });
  v.done();

  const delivered = db.prepare(
    `SELECT 1 FROM order_items oi
       JOIN seller_orders so ON so.id = oi.seller_order_id
       JOIN orders o ON o.id = so.order_id
      WHERE oi.product_id = ? AND o.buyer_id = ? AND so.status = 'delivered' LIMIT 1`,
  ).get(id, req.user.id);
  if (!delivered) throw forbidden('You can review a product only after it was delivered to you.', 'NOT_ELIGIBLE');

  const result = tx(() => {
    try {
      db.prepare('INSERT INTO reviews (product_id, buyer_id, rating, body, created_at) VALUES (?, ?, ?, ?, ?)')
        .run(id, req.user.id, rating, body, now());
    } catch (e) {
      if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') throw conflict('ALREADY_REVIEWED', 'You have already reviewed this product.');
      throw e;
    }
    db.prepare(
      `UPDATE products
          SET rating_count = (SELECT COUNT(*) FROM reviews WHERE product_id = ?),
              rating_avg   = (SELECT AVG(rating) FROM reviews WHERE product_id = ?)
        WHERE id = ?`,
    ).run(id, id, id);
    return db.prepare('SELECT rating_avg, rating_count FROM products WHERE id = ?').get(id);
  });

  res.status(201).json({
    ratingAvg: Math.round(result.rating_avg * 10) / 10,
    ratingCount: result.rating_count,
  });
});

export default router;
