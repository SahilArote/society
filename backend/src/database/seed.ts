import { initDb } from './db';

export async function seedDb() {
  await initDb();
  console.log('GreenGate Database is ready.');
}

if (require.main === module) {
  seedDb();
}

