import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db, now } from '../db.js';
import { Validator } from '../validate.js';
import { conflict, HttpError } from '../errors.js';
import { setSession, clearSession, requireAuth } from '../auth.js';
import { publicUser } from '../serialize.js';

const router = Router();

const cartCount = db.prepare('SELECT COALESCE(SUM(quantity), 0) FROM cart_items WHERE user_id = ?').pluck();
const lastAddress = db.prepare(
  `SELECT recipient, phone, region, city, street, apartment
     FROM orders WHERE buyer_id = ? ORDER BY id DESC LIMIT 1`,
);

function meResponse(user) {
  return {
    user: {
      ...publicUser(user),
      cartCount: cartCount.get(user.id),
      lastAddress: lastAddress.get(user.id) || null,
    },
  };
}

router.post('/auth/register', async (req, res) => {
  const v = new Validator(req.body);
  const email = v.email();
  const password = v.string('password', { min: 6, max: 100, label: 'Password' });
  const name = v.string('name', { min: 2, max: 80, label: 'Name' });
  const phone = v.phone();
  v.done();

  const exists = db.prepare('SELECT 1 FROM users WHERE email = ?').get(email);
  if (exists) throw conflict('EMAIL_TAKEN', 'An account with this email already exists.', { fields: { email: 'This email is already registered. Try signing in.' } });

  const hash = await bcrypt.hash(password, 10);
  let id;
  try {
    id = db.prepare('INSERT INTO users (email, password_hash, name, phone, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(email, hash, name, phone, now()).lastInsertRowid;
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') throw conflict('EMAIL_TAKEN', 'An account with this email already exists.', { fields: { email: 'This email is already registered.' } });
    throw e;
  }
  setSession(res, Number(id));
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  res.status(201).json(meResponse(user));
});

router.post('/auth/login', async (req, res) => {
  const v = new Validator(req.body);
  const email = v.string('email', { min: 3, max: 120, label: 'Email' })?.toLowerCase();
  const password = v.string('password', { min: 1, max: 100, label: 'Password' });
  v.done();

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  const ok = user && (await bcrypt.compare(password, user.password_hash));
  if (!ok) throw new HttpError(401, 'INVALID_CREDENTIALS', 'Wrong email or password.');
  setSession(res, user.id);
  res.json(meResponse(user));
});

router.post('/auth/logout', (req, res) => {
  clearSession(res);
  res.status(204).end();
});

router.get('/me', (req, res) => {
  if (!req.user) return res.json({ user: null });
  res.json(meResponse(req.user));
});

router.patch('/me', requireAuth, (req, res) => {
  const v = new Validator(req.body);
  const name = v.has('name') ? v.string('name', { min: 2, max: 80, label: 'Name' }) : undefined;
  const phone = v.has('phone') ? v.phone() : undefined;
  v.done();
  if (name !== undefined) db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name, req.user.id);
  if (phone !== undefined) db.prepare('UPDATE users SET phone = ? WHERE id = ?').run(phone, req.user.id);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json(meResponse(user));
});

export default router;
