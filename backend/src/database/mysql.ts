import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

let connectionPool: mysql.Pool | null = null;

export function isMysqlConfigured(): boolean {
  return process.env.USE_MYSQL === 'true' || Boolean(process.env.DATABASE_URL) || Boolean(process.env.MYSQL_HOST);
}

export async function getMysqlPool(): Promise<mysql.Pool | null> {
  if (connectionPool) return connectionPool;

  const host = process.env.MYSQL_HOST || 'localhost';
  const port = parseInt(process.env.MYSQL_PORT || '3306');
  const user = process.env.MYSQL_USER || 'root';
  const password = process.env.MYSQL_PASSWORD || '';
  const database = process.env.MYSQL_DATABASE || 'greengate_db';

  if (!process.env.MYSQL_PASSWORD && !process.env.DATABASE_URL && process.env.USE_MYSQL !== 'true') {
    return null; // MySQL credentials not provided yet
  }

  try {
    connectionPool = mysql.createPool({
      host,
      port,
      user,
      password,
      database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    // Test connection
    const connection = await connectionPool.getConnection();
    console.log(`[MySQL] Successfully connected to MySQL at ${host}:${port}/${database}`);
    connection.release();
    return connectionPool;
  } catch (err: any) {
    console.warn(`[MySQL] Could not connect to MySQL database (${err.message}). Using local persistent database storage.`);
    connectionPool = null;
    return null;
  }
}

export async function runMysqlMigrations() {
  const pool = await getMysqlPool();
  if (!pool) return;

  try {
    console.log('[MySQL] Running migrations from schema.sql...');
    const schemaPath = path.resolve(__dirname, './schema.sql');
    if (!fs.existsSync(schemaPath)) return;

    const sqlScript = fs.readFileSync(schemaPath, 'utf-8');
    const statements = sqlScript
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const stmt of statements) {
      await pool.query(stmt);
    }
    console.log('[MySQL] Migrations executed successfully!');
  } catch (err: any) {
    console.error('[MySQL] Migration error:', err.message);
  }
}
