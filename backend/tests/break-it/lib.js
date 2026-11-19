// Tiny HTTP client for the break-it scripts (Node 20+ built-in fetch, cookie handling by hand).
import sharp from 'sharp';

export const BASE = (process.env.BASE_URL || process.argv.find((a) => a.startsWith('--base='))?.slice(7) || 'http://localhost:3000').replace(/\/$/, '');

export class Client {
  constructor(name = 'client') {
    this.name = name;
    this.cookie = '';
  }

  async req(method, path, body, { form } = {}) {
    const headers = { Accept: 'application/json' };
    if (this.cookie) headers.Cookie = this.cookie;
    let payload;
    if (form) payload = form;
    else if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    }
    const res = await fetch(BASE + path, { method, headers, body: payload });
    const set = res.headers.getSetCookie?.() || [];
    for (const c of set) {
      const pair = c.split(';')[0];
      if (pair.startsWith('shuka_session=')) this.cookie = pair.endsWith('=') ? '' : pair;
    }
    let data = null;
    const text = await res.text();
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    return { status: res.status, data };
  }

  get(p) { return this.req('GET', p); }
  post(p, b) { return this.req('POST', p, b ?? {}); }
  put(p, b) { return this.req('PUT', p, b); }
  patch(p, b) { return this.req('PATCH', p, b); }
  del(p) { return this.req('DELETE', p); }
}

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export async function newUser(label = 'user') {
  const c = new Client(label);
  const r = await c.post('/auth/register', {
    email: `${label}-${uid()}@test.am`, password: 'secret123', name: `Test ${label}`, phone: '+374 91 000000',
  });
  if (r.status !== 201) throw new Error(`register failed: ${r.status} ${JSON.stringify(r.data)}`);
  c.user = r.data.user;
  return c;
}

export async function newSeller(label = 'seller') {
  const c = await newUser(label);
  const r = await c.post('/seller/activate', { storeName: `Store ${label} ${uid()}`, phone: '+374 91 000000' });
  if (r.status !== 200) throw new Error(`activate failed: ${r.status} ${JSON.stringify(r.data)}`);
  return c;
}

let pngCache;
export async function testPng() {
  pngCache ||= await sharp({ create: { width: 64, height: 64, channels: 3, background: '#ff9900' } }).png().toBuffer();
  return pngCache;
}

/** Products created by the tests — unpublished again at the end so the store stays clean. */
export const createdProducts = [];

/** Creates a published product with one image. */
export async function createProduct(seller, { title = `Test product ${uid()}`, price = 1000, stock = 10 } = {}) {
  const cats = await seller.get('/categories');
  const r = await seller.post('/seller/products', {
    title, description: 'A product created by a break-it test script.', priceAmd: price, stock, categoryId: cats.data.categories[0].id,
  });
  if (r.status !== 201) throw new Error(`create product failed: ${r.status} ${JSON.stringify(r.data)}`);
  const id = r.data.product.id;
  const form = new FormData();
  form.append('images', new Blob([await testPng()], { type: 'image/png' }), 'test.png');
  const up = await seller.req('POST', `/seller/products/${id}/images`, undefined, { form });
  if (up.status !== 201) throw new Error(`upload failed: ${up.status} ${JSON.stringify(up.data)}`);
  const pub = await seller.patch(`/seller/products/${id}`, { isPublished: true });
  if (pub.status !== 200) throw new Error(`publish failed: ${pub.status} ${JSON.stringify(pub.data)}`);
  createdProducts.push({ seller, id });
  return pub.data.product;
}

export const address = {
  recipient: 'Test Buyer', phone: '+374 91 123456', region: 'Yerevan', city: 'Yerevan', street: 'Abovyan St 1', apartment: '5',
};

export async function checkout(buyer, requestKey = `key-${uid()}`) {
  return buyer.post('/orders', { ...address, requestKey });
}

export function assert(cond, message) {
  if (!cond) throw new Error(message);
}

export async function productStock(id) {
  const r = await new Client().get(`/products/${id}`);
  return r.data.product.stock;
}
