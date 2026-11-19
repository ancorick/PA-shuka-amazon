import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { DATA_DIR, UPLOADS_DIR, BACKUPS_DIR, DB_PATH, BACKEND_ROOT } from './config.js';

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOADS_DIR, { recursive: true });
fs.mkdirSync(BACKUPS_DIR, { recursive: true });

/** Opens a connection with the pragmas the brief requires. Use this for every connection. */
export function openDb(file = DB_PATH) {
  const conn = new Database(file);
  conn.pragma('journal_mode = WAL');
  conn.pragma('foreign_keys = ON');
  conn.pragma('busy_timeout = 5000');
  conn.pragma('synchronous = NORMAL');
  return conn;
}

export const db = openDb();

export const now = () => new Date().toISOString();

/** Runs fn inside BEGIN IMMEDIATE … COMMIT (rolls back if fn throws). Keep it short: no awaits, no I/O. */
export function tx(fn) {
  return db.transaction(fn).immediate();
}

/** Applies numbered .sql files from /migrations that have not been applied yet. */
export function migrate(conn = db) {
  conn.exec(`CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL) STRICT`);
  const dir = path.join(BACKEND_ROOT, 'migrations');
  const files = fs.readdirSync(dir).filter((f) => /^\d+_.*\.sql$/.test(f)).sort();
  const applied = new Set(conn.prepare('SELECT name FROM _migrations').pluck().all());
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    conn.transaction(() => {
      conn.exec(sql);
      conn.prepare('INSERT INTO _migrations (name, applied_at) VALUES (?, ?)').run(file, now());
    }).immediate();
    console.log(`[migrate] applied ${file}`);
  }
}
