import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from '../src/db.js';
import { BACKUPS_DIR } from '../src/config.js';

const KEEP = 7;

/** Copies the live database with VACUUM INTO (safe while the server is running). */
export function backupNow() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const target = path.join(BACKUPS_DIR, `shuka-${stamp}.db`);
  db.prepare('VACUUM INTO ?').run(target);
  const old = fs.readdirSync(BACKUPS_DIR).filter((f) => f.startsWith('shuka-') && f.endsWith('.db')).sort();
  for (const f of old.slice(0, Math.max(0, old.length - KEEP))) fs.rmSync(path.join(BACKUPS_DIR, f), { force: true });
  return target;
}

export function startDailyBackup() {
  const run = () => {
    try {
      console.log(`[backup] saved ${backupNow()}`);
    } catch (e) {
      console.error('[backup] failed:', e.message);
    }
  };
  setTimeout(run, 60_000).unref();
  setInterval(run, 24 * 3600 * 1000).unref();
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(`Backup written to ${backupNow()}`);
}
