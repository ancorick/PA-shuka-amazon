import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { UPLOADS_DIR, CORS_ORIGIN } from './config.js';
import { loadUser } from './auth.js';
import { errorHandler, notFoundHandler } from './errors.js';
import authRoutes from './routes/auth.js';
import catalogRoutes from './routes/catalog.js';
import reviewRoutes from './routes/reviews.js';
import cartRoutes from './routes/cart.js';
import orderRoutes from './routes/orders.js';
import sellerRoutes from './routes/seller.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // In production the browser talks to Netlify, which proxies /api/* here (same origin, no CORS needed).
  // CORS is for local development and direct calls from the origins listed in CORS_ORIGIN.
  app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.get('/', (req, res) => res.json({ name: 'Shuka API', ok: true, docs: 'See README.md' }));
  app.get('/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

  app.use('/uploads', express.static(UPLOADS_DIR, { immutable: true, maxAge: '365d', fallthrough: false }));

  app.use(loadUser);
  app.use(authRoutes);
  app.use(catalogRoutes);
  app.use(reviewRoutes);
  app.use(cartRoutes);
  app.use(orderRoutes);
  app.use(sellerRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
