import { openDb } from '../../src/db.js';
import { DB_PATH } from '../../src/config.js';
import {
  Client, newUser, newSeller, createProduct, checkout, assert, productStock,
} from './lib.js';

export const tests = [];
const test = (name, how, fn) => tests.push({ name, how, fn });

test('Last units', '30 simultaneous checkouts for 1 unit of a product with stock 3', async () => {
  const seller = await newSeller('lu-seller');
  const product = await createProduct(seller, { stock: 3, price: 5000 });
  const buyers = await Promise.all(Array.from({ length: 30 }, (_, i) => newUser(`lu-buyer${i}`)));
  for (const b of buyers) {
    const r = await b.put(`/cart/items/${product.id}`, { quantity: 1 });
    assert(r.status === 200, `add to cart failed: ${r.status}`);
  }
  const results = await Promise.all(buyers.map((b) => checkout(b)));
  const created = results.filter((r) => r.status === 201).length;
  const conflicts = results.filter((r) => r.status === 409).length;
  const errors = results.filter((r) => r.status >= 500);
  const locked = results.filter((r) => JSON.stringify(r.data).toLowerCase().includes('locked'));
  const stock = await productStock(product.id);
  assert(errors.length === 0 && locked.length === 0, `server errors: ${errors.length}, "locked": ${locked.length}`);
  assert(created === 3, `expected 3 orders, got ${created}`);
  assert(conflicts === 27, `expected 27 × 409, got ${conflicts}`);
  assert(stock === 0, `expected stock 0, got ${stock}`);
  return `3 orders, 27 × 409, stock ${stock}, 0 errors`;
});

test('Double click', 'Send the same checkout twice with the same request key', async () => {
  const seller = await newSeller('dc-seller');
  const product = await createProduct(seller, { stock: 10 });
  const buyer = await newUser('dc-buyer');
  await buyer.put(`/cart/items/${product.id}`, { quantity: 2 });
  const key = `double-${Date.now()}`;
  const [a, b] = await Promise.all([checkout(buyer, key), checkout(buyer, key)]);
  const c = await checkout(buyer, key);
  const ids = new Set([a, b, c].map((r) => r.data?.order?.id));
  const orders = await buyer.get('/orders');
  assert(ids.size === 1 && !ids.has(undefined), `expected one order id, got ${[...ids]}`);
  assert(orders.data.orders.length === 1, `expected 1 order, got ${orders.data.orders.length}`);
  assert((await productStock(product.id)) === 8, 'stock should drop only once');
  return `one order #${[...ids][0]} (statuses ${a.status}/${b.status}/${c.status})`;
});

test('Price changed', 'Buyer adds an item, seller raises the price, buyer checks out', async () => {
  const seller = await newSeller('pc-seller');
  const product = await createProduct(seller, { price: 10000 });
  const buyer = await newUser('pc-buyer');
  await buyer.put(`/cart/items/${product.id}`, { quantity: 1 });
  await seller.patch(`/seller/products/${product.id}`, { priceAmd: 12500 });
  const r = await checkout(buyer);
  assert(r.status === 409 && r.data.error.code === 'PRICE_CHANGED', `expected 409 PRICE_CHANGED, got ${r.status} ${r.data?.error?.code}`);
  const item = r.data.error.items[0];
  assert(item.oldPrice === 10000 && item.newPrice === 12500, 'new price not reported');
  const orders = await buyer.get('/orders');
  assert(orders.data.orders.length === 0, 'no order should be created');
  const again = await checkout(buyer);
  assert(again.status === 201, `second attempt with the new price should succeed, got ${again.status}`);
  return `409 PRICE_CHANGED 10,000 → 12,500; confirmed retry → order #${again.data.order.id}`;
});

test('Old order after edit', 'Seller edits the title and price of a product already ordered', async () => {
  const seller = await newSeller('oo-seller');
  const product = await createProduct(seller, { title: 'Original title', price: 7000 });
  const buyer = await newUser('oo-buyer');
  await buyer.put(`/cart/items/${product.id}`, { quantity: 1 });
  const order = await checkout(buyer);
  await seller.patch(`/seller/products/${product.id}`, { title: 'Changed title', priceAmd: 99000 });
  const r = await buyer.get(`/orders/${order.data.order.id}`);
  const item = r.data.order.parts[0].items[0];
  assert(item.title === 'Original title' && item.unitPriceAmd === 7000, `order changed: ${item.title} ${item.unitPriceAmd}`);
  return `order still shows "${item.title}" at ${item.unitPriceAmd} ֏`;
});

test("Someone else's order", "Seller A opens seller B's order by ID; buyer A opens buyer B's order", async () => {
  const sellerA = await newSeller('se-a');
  const sellerB = await newSeller('se-b');
  const product = await createProduct(sellerB);
  const buyerA = await newUser('be-a');
  const buyerB = await newUser('be-b');
  await buyerB.put(`/cart/items/${product.id}`, { quantity: 1 });
  const order = await checkout(buyerB);
  const detail = await buyerB.get(`/orders/${order.data.order.id}`);
  const soId = detail.data.order.parts[0].id;
  const r1 = await sellerA.get(`/seller/orders/${soId}`);
  const r2 = await buyerA.get(`/orders/${order.data.order.id}`);
  const r3 = await sellerA.post(`/seller/orders/${soId}/status`, { to: 'confirmed' });
  const r4 = await buyerA.post(`/orders/${order.data.order.id}/sellers/${soId}/cancel`);
  for (const r of [r1, r2, r3, r4]) {
    assert([403, 404].includes(r.status), `expected 403/404, got ${r.status}`);
    assert(!JSON.stringify(r.data).includes('Abovyan'), 'address leaked');
  }
  return `seller A → ${r1.status}, buyer A → ${r2.status}, move → ${r3.status}, cancel → ${r4.status}; no data shown`;
});

test('Move not allowed', 'Seller moves Placed straight to Delivered; buyer cancels a shipped order', async () => {
  const seller = await newSeller('mv-seller');
  const product = await createProduct(seller);
  const buyer = await newUser('mv-buyer');
  await buyer.put(`/cart/items/${product.id}`, { quantity: 1 });
  const order = await checkout(buyer);
  const soId = (await buyer.get(`/orders/${order.data.order.id}`)).data.order.parts[0].id;

  const bad = await seller.post(`/seller/orders/${soId}/status`, { to: 'delivered' });
  assert(bad.status === 409, `placed → delivered should be 409, got ${bad.status}`);
  let d = await seller.get(`/seller/orders/${soId}`);
  assert(d.data.order.status === 'placed' && d.data.order.history.length === 1, 'nothing should change');

  await seller.post(`/seller/orders/${soId}/status`, { to: 'confirmed' });
  await seller.post(`/seller/orders/${soId}/status`, { to: 'shipped' });
  const cancel = await buyer.post(`/orders/${order.data.order.id}/sellers/${soId}/cancel`);
  assert(cancel.status === 409, `cancel shipped should be 409, got ${cancel.status}`);
  d = await seller.get(`/seller/orders/${soId}`);
  assert(d.data.order.status === 'shipped' && d.data.order.history.length === 3, 'nothing should change after rejected cancel');
  return `placed→delivered: 409; cancel shipped: 409; status and history unchanged`;
});

test('Cancel returns stock', 'Buyer cancels a placed order', async () => {
  const seller = await newSeller('cr-seller');
  const product = await createProduct(seller, { stock: 10 });
  const buyer = await newUser('cr-buyer');
  await buyer.put(`/cart/items/${product.id}`, { quantity: 4 });
  const order = await checkout(buyer);
  const after = await productStock(product.id);
  const soId = (await buyer.get(`/orders/${order.data.order.id}`)).data.order.parts[0].id;
  const c = await buyer.post(`/orders/${order.data.order.id}/sellers/${soId}/cancel`);
  assert(c.status === 200, `cancel failed: ${c.status}`);
  const restored = await productStock(product.id);
  assert(after === 6 && restored === 10, `stock 10 → ${after} → ${restored}`);
  return `stock 10 → ${after} after order → ${restored} after cancel`;
});

test('Foreign keys', 'Insert an order item for a product ID that does not exist', async () => {
  const db = openDb(DB_PATH);
  try {
    const fk = db.pragma('foreign_keys', { simple: true });
    assert(fk === 1, 'foreign_keys pragma is off');
    const so = db.prepare('SELECT id FROM seller_orders LIMIT 1').get();
    assert(so, 'need at least one seller order in the database');
    let error = null;
    try {
      db.prepare('INSERT INTO order_items (seller_order_id, product_id, title, unit_price_amd, quantity) VALUES (?, 999999999, ?, 100, 1)')
        .run(so.id, 'ghost');
    } catch (e) { error = e; }
    assert(error && error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY', `expected FOREIGN KEY error, got ${error?.code || 'success'}`);
    return `rejected by SQLite: ${error.code}`;
  } finally {
    db.close();
  }
});

test('Bad upload', 'Upload a 30 MB file and a renamed .exe', async () => {
  const seller = await newSeller('bu-seller');
  const product = await createProduct(seller);
  const big = new FormData();
  big.append('images', new Blob([Buffer.alloc(30 * 1024 * 1024, 1)], { type: 'image/jpeg' }), 'huge.jpg');
  const r1 = await seller.req('POST', `/seller/products/${product.id}/images`, undefined, { form: big });
  const exe = new FormData();
  const fakeExe = Buffer.concat([Buffer.from('MZ\x90\x00\x03\x00\x00\x00'), Buffer.alloc(2048, 7)]);
  exe.append('images', new Blob([fakeExe], { type: 'image/jpeg' }), 'virus.jpg');
  const r2 = await seller.req('POST', `/seller/products/${product.id}/images`, undefined, { form: exe });
  assert(r1.status === 400 && r1.data.error.code === 'FILE_TOO_LARGE', `30 MB: ${r1.status} ${r1.data?.error?.code}`);
  assert(r2.status === 400 && r2.data.error.code === 'BAD_FILE_TYPE', `.exe: ${r2.status} ${r2.data?.error?.code}`);
  const p = await seller.get(`/seller/products/${product.id}`);
  assert(p.data.product.images.length === 1, 'no image should be added');

  return `30 MB → 400 "${r1.data.error.message}" · .exe → 400 "${r2.data.error.message}"`;
});

export { Client };
