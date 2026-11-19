import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const BACKEND_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const IS_PROD = process.env.NODE_ENV === 'production';
export const PORT = Number(process.env.PORT) || 3000;

export const DATA_DIR = path.resolve(BACKEND_ROOT, process.env.DATA_DIR || 'data');
export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
export const BACKUPS_DIR = path.join(DATA_DIR, 'backups');
export const DB_PATH = path.join(DATA_DIR, 'shuka.db');

// Public path the browser uses for images. The frontend proxies /api/* to this server
// with the /api prefix stripped, so /api/uploads/x.webp reaches /uploads/x.webp here.
export const UPLOADS_PUBLIC_PATH = (process.env.UPLOADS_PUBLIC_PATH || '/api/uploads').replace(/\/$/, '');

export const CORS_ORIGIN = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

let secret = process.env.JWT_SECRET;
if (!secret) {
  if (IS_PROD) {
    console.error('FATAL: JWT_SECRET is not set. Add it to the environment variables.');
    process.exit(1);
  }
  secret = 'dev-only-secret-change-me';
  console.warn('[config] JWT_SECRET not set — using an insecure development secret.');
}
export const JWT_SECRET = secret;
