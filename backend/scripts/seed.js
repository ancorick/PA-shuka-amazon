// npm run seed         → applies migrations and seeds an empty database
// npm run reset        → deletes the database and uploads, then migrates and seeds from scratch
import fs from 'node:fs';
import { DB_PATH, UPLOADS_DIR } from '../src/config.js';

if (process.argv.includes('--reset')) {
  for (const f of [DB_PATH, `${DB_PATH}-wal`, `${DB_PATH}-shm`]) fs.rmSync(f, { force: true });
  fs.rmSync(UPLOADS_DIR, { recursive: true, force: true });
  console.log('Database and uploads removed.');
}

const { db, migrate } = await import('../src/db.js');
const { seedIfEmpty } = await import('../seed/seed.js');
migrate(db);
await seedIfEmpty(db);
db.close();
