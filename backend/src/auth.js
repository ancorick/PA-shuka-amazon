import jwt from 'jsonwebtoken';
import { db } from './db.js';
import { JWT_SECRET, IS_PROD } from './config.js';
import { unauthorized, forbidden } from './errors.js';

const COOKIE = 'shuka_session';
const MAX_AGE = 30 * 24 * 60 * 60 * 1000;

const cookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: IS_PROD,
  path: '/',
});

export function setSession(res, userId) {
  const token = jwt.sign({ uid: userId }, JWT_SECRET, { expiresIn: '30d' });
  res.cookie(COOKIE, token, { ...cookieOptions(), maxAge: MAX_AGE });
}

export function clearSession(res) {
  res.clearCookie(COOKIE, cookieOptions());
}

const findUser = db.prepare('SELECT id, email, name, phone, store_name, created_at FROM users WHERE id = ?');

/** Reads the session cookie (if any) and attaches req.user. Never rejects. */
export function loadUser(req, res, next) {
  req.user = null;
  const token = req.cookies?.[COOKIE];
  if (token) {
    try {
      const { uid } = jwt.verify(token, JWT_SECRET);
      req.user = findUser.get(uid) || null;
    } catch {
      req.user = null;
    }
  }
  next();
}

export function requireAuth(req, res, next) {
  if (!req.user) throw unauthorized();
  next();
}

export function requireSeller(req, res, next) {
  if (!req.user) throw unauthorized();
  if (!req.user.store_name) throw forbidden('Become a seller first to use the seller dashboard.', 'NOT_A_SELLER');
  next();
}
