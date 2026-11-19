import { db } from './db.js';
import { imageUrls } from './images.js';

export const MAIN_IMAGE_SQL =
  '(SELECT file_path FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.position LIMIT 1)';

export function productCard(row) {
  return {
    id: row.id,
    title: row.title,
    priceAmd: row.price_amd,
    stock: row.stock,
    ratingAvg: Math.round((row.rating_avg || 0) * 10) / 10,
    ratingCount: row.rating_count,
    image: imageUrls(row.main_image),
    category: row.category_slug ? { slug: row.category_slug, name: row.category_name } : undefined,
    seller: row.store_name ? { id: row.seller_id, storeName: row.store_name } : undefined,
    createdAt: row.created_at,
  };
}

const imagesOf = db.prepare('SELECT id, file_path, position FROM product_images WHERE product_id = ? ORDER BY position');

export function productImages(productId) {
  return imagesOf.all(productId).map((img) => ({ id: img.id, position: img.position, ...imageUrls(img.file_path) }));
}

export function publicUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    phone: u.phone,
    storeName: u.store_name,
    isSeller: Boolean(u.store_name),
    createdAt: u.created_at,
  };
}
