import { Router } from 'express';
import { db } from '../db.js';
import { notFound } from '../errors.js';
import { parseId } from '../validate.js';
import { productCard, productImages, MAIN_IMAGE_SQL } from '../serialize.js';

const router = Router();

const PAGE_SIZE = 24;

const SORTS = {
  newest: 'p.created_at DESC, p.id DESC',
  price_asc: 'p.price_amd ASC, p.id DESC',
  price_desc: 'p.price_amd DESC, p.id DESC',
  rating: 'p.rating_avg DESC, p.rating_count DESC, p.id DESC',
};

router.get('/categories', (req, res) => {
  const rows = db.prepare(
    `SELECT c.id, c.name, c.slug,
            (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.is_published = 1) AS product_count
       FROM categories c ORDER BY c.id`,
  ).all();
  res.json({ categories: rows.map((c) => ({ id: c.id, name: c.name, slug: c.slug, productCount: c.product_count })) });
});

const toInt = (v) => {
  if (v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
};

router.get('/products', (req, res) => {
  const { q, category, sort } = req.query;
  const minPrice = toInt(req.query.minPrice);
  const maxPrice = toInt(req.query.maxPrice);
  const limit = Math.min(Math.max(toInt(req.query.limit) || PAGE_SIZE, 1), 48);
  const page = Math.max(toInt(req.query.page) || 1, 1);

  const where = ['p.is_published = 1'];
  const params = [];
  const term = typeof q === 'string' ? q.trim() : '';
  if (term) {
    // Every word must appear in the title or the description.
    for (const word of term.split(/\s+/).slice(0, 6)) {
      const like = `%${word.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
      where.push(`(p.title LIKE ? ESCAPE '\\' OR p.description LIKE ? ESCAPE '\\')`);
      params.push(like, like);
    }
  }
  let categoryRow = null;
  if (typeof category === 'string' && category) {
    categoryRow = db.prepare('SELECT id, name, slug FROM categories WHERE slug = ?').get(category);
    where.push('p.category_id = ?');
    params.push(categoryRow ? categoryRow.id : -1);
  }
  if (minPrice !== null) { where.push('p.price_amd >= ?'); params.push(minPrice); }
  if (maxPrice !== null) { where.push('p.price_amd <= ?'); params.push(maxPrice); }

  const orderBy = SORTS[sort] || SORTS.newest;
  const whereSql = where.join(' AND ');

  const total = db.prepare(`SELECT COUNT(*) FROM products p WHERE ${whereSql}`).pluck().get(...params);
  const rows = db.prepare(
    `SELECT p.*, c.slug AS category_slug, c.name AS category_name, u.store_name, ${MAIN_IMAGE_SQL} AS main_image
       FROM products p
       JOIN categories c ON c.id = p.category_id
       JOIN users u ON u.id = p.seller_id
      WHERE ${whereSql}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?`,
  ).all(...params, limit, (page - 1) * limit);

  res.json({
    items: rows.map(productCard),
    total,
    page,
    pageSize: limit,
    pages: Math.max(1, Math.ceil(total / limit)),
    category: categoryRow,
  });
});

router.get('/products/:id', (req, res) => {
  const id = parseId(req.params.id);
  const row = id && db.prepare(
    `SELECT p.*, c.slug AS category_slug, c.name AS category_name, u.store_name
       FROM products p
       JOIN categories c ON c.id = p.category_id
       JOIN users u ON u.id = p.seller_id
      WHERE p.id = ?`,
  ).get(id);
  const isOwner = Boolean(row && req.user && row.seller_id === req.user.id);
  if (!row || (!row.is_published && !isOwner)) throw notFound('This product does not exist or is no longer available.');

  const images = productImages(row.id);
  res.json({
    product: {
      ...productCard({ ...row, main_image: null }),
      image: images[0] || null,
      images,
      description: row.description,
      isPublished: Boolean(row.is_published),
      isOwner,
      updatedAt: row.updated_at,
    },
  });
});

router.get('/products/:id/reviews', (req, res) => {
  const id = parseId(req.params.id);
  const product = id && db.prepare('SELECT id, seller_id, is_published FROM products WHERE id = ?').get(id);
  if (!product) throw notFound('Product not found.');

  const reviews = db.prepare(
    `SELECT r.id, r.rating, r.body, r.created_at, r.buyer_id, u.name
       FROM reviews r JOIN users u ON u.id = r.buyer_id
      WHERE r.product_id = ?
      ORDER BY r.created_at DESC, r.id DESC`,
  ).all(id);

  const histogram = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: reviews.filter((r) => r.rating === stars).length,
  }));

  let canReview = false;
  let reviewBlockedReason = 'signin';
  if (req.user) {
    const already = reviews.some((r) => r.buyer_id === req.user.id);
    const delivered = db.prepare(
      `SELECT 1 FROM order_items oi
         JOIN seller_orders so ON so.id = oi.seller_order_id
         JOIN orders o ON o.id = so.order_id
        WHERE oi.product_id = ? AND o.buyer_id = ? AND so.status = 'delivered' LIMIT 1`,
    ).get(id, req.user.id);
    canReview = Boolean(delivered) && !already;
    reviewBlockedReason = already ? 'already' : delivered ? null : 'not_delivered';
  }

  res.json({
    reviews: reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      body: r.body,
      createdAt: r.created_at,
      author: r.name.split(' ')[0] + (r.name.split(' ')[1] ? ` ${r.name.split(' ')[1][0]}.` : ''),
      isMine: Boolean(req.user && r.buyer_id === req.user.id),
    })),
    histogram,
    canReview,
    reviewBlockedReason: canReview ? null : reviewBlockedReason,
  });
});

export default router;
