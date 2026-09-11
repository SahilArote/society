import { initDb, getDb } from './db';

export function seedDb() {
  initDb();
  console.log('GreenGate Database is ready.');
}

if (require.main === module) {
  seedDb();
}
