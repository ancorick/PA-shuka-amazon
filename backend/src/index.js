import { PORT, IS_PROD } from './config.js';
import { db, migrate } from './db.js';

// Migrations must run before the route modules are loaded (they prepare SQL statements at import time).
migrate(db);
const { seedIfEmpty } = await import('../seed/seed.js');
await seedIfEmpty(db);
const { startDailyBackup } = await import('../scripts/backup.js');
startDailyBackup();
const { createApp } = await import('./app.js');

const app = createApp();
const server = app.listen(PORT, () => {
  console.log(`Shuka API listening on http://localhost:${PORT} (${IS_PROD ? 'production' : 'development'})`);
});

function shutdown() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 3000).unref();
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
