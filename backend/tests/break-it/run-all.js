// Runs every break-it test from the brief against a running server.
//   npm run test:breakit                       → http://localhost:3000
//   npm run test:breakit -- --base=https://your-site.netlify.app/api
// The "Foreign keys" test opens the local SQLite file directly, so it is skipped for remote URLs.
import { BASE, createdProducts } from './lib.js';
import { tests } from './tests.js';

const isLocal = /localhost|127\.0\.0\.1/.test(BASE);
console.log(`\nShuka break-it tests → ${BASE}\n`);

const health = await fetch(`${BASE}/health`).catch(() => null);
if (!health?.ok) {
  console.error(`Server is not reachable at ${BASE}. Start it with "npm start" (or pass --base=...).`);
  process.exit(1);
}

let failed = 0;
const rows = [];
for (const t of tests) {
  const localOnly = t.name === 'Foreign keys';
  if (localOnly && !isLocal) {
    rows.push(['SKIP', t.name, 'needs local database access']);
    continue;
  }
  const started = Date.now();
  try {
    const detail = await t.fn();
    rows.push(['PASS', t.name, `${detail} (${Date.now() - started} ms)`]);
  } catch (e) {
    failed++;
    rows.push(['FAIL', t.name, e.message]);
  }
}

// Clean up: hide the test products from the storefront.
await Promise.all(createdProducts.map(({ seller, id }) => seller.patch(`/seller/products/${id}`, { isPublished: false }).catch(() => {})));

for (const [status, name, detail] of rows) {
  const color = status === 'PASS' ? '\x1b[32m' : status === 'FAIL' ? '\x1b[31m' : '\x1b[33m';
  console.log(`${color}${status}\x1b[0m  ${name.padEnd(22)} ${detail}`);
}
console.log(`\n${rows.filter((r) => r[0] === 'PASS').length} passed, ${failed} failed, ${rows.filter((r) => r[0] === 'SKIP').length} skipped\n`);
process.exit(failed ? 1 : 0);
