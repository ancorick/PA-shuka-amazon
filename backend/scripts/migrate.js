import { db, migrate } from '../src/db.js';

migrate(db);
console.log('Migrations are up to date.');
