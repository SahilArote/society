import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

let connectionPool: mysql.Pool | null = null;

export function isMysqlConfigured(): boolean {
  return process.env.USE_MYSQL === 'true' || Boolean(process.env.DATABASE_URL) || Boolean(process.env.MYSQL_HOST);
}

export async function getMysqlPool(): Promise<mysql.Pool | null> {
  if (connectionPool) return connectionPool;

  let host = process.env.MYSQL_HOST || 'localhost';
  let port = parseInt(process.env.MYSQL_PORT || '3306');
  let user = process.env.MYSQL_USER || 'root';
  let password = process.env.MYSQL_PASSWORD || '';
  let database = process.env.MYSQL_DATABASE || 'greengate_db';

  if (process.env.DATABASE_URL) {
    try {
      const parsed = new URL(process.env.DATABASE_URL);
      host = parsed.hostname;
      port = parsed.port ? parseInt(parsed.port) : 3306;
      user = decodeURIComponent(parsed.username);
      password = decodeURIComponent(parsed.password);
      database = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
    } catch (e: any) {
      console.warn(`[MySQL] Failed to parse DATABASE_URL: ${e.message}`);
    }
  }

  if (!password && !process.env.MYSQL_PASSWORD && !process.env.DATABASE_URL && process.env.USE_MYSQL !== 'true') {
    return null;
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
      multipleStatements: true,
    });

    const connection = await connectionPool.getConnection();
    console.log(`[MySQL] Successfully connected to MySQL at ${host}:${port}/${database}`);
    connection.release();
    return connectionPool;
  } catch (err: any) {
    console.warn(`[MySQL] Could not connect to MySQL database (${err.message}).`);
    connectionPool = null;
    return null;
  }
}

export async function runMysqlMigrations() {
  const pool = await getMysqlPool();
  if (!pool) {
    console.warn('[MySQL] Pool not initialized. Skipping migrations.');
    return;
  }

  try {
    console.log('[MySQL] Running migrations from schema.sql...');
    const schemaPath = path.resolve(__dirname, './schema.sql');
    if (!fs.existsSync(schemaPath)) return;

    const sqlScript = fs.readFileSync(schemaPath, 'utf-8');
    // Strip multi-line and single-line SQL comments
    const cleanedSql = sqlScript
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/--.*$/gm, '')
      .trim();

    const statements = cleanedSql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const stmt of statements) {
      try {
        await pool.query(stmt);
      } catch (e: any) {
        // Ignore benign warnings like duplicate index
        if (!e.message.includes('Duplicate key') && !e.message.includes('already exists')) {
          console.error(`[MySQL] Statement error on [${stmt.slice(0, 60).replace(/\n/g, ' ')}...]: ${e.message}`);
        }
      }
    }
    console.log('[MySQL] Schema migrations execution cycle complete.');

    // Run Initial Seed Data if society table empty
    await seedMysqlData(pool);
  } catch (err: any) {
    console.error('[MySQL] Migration error:', err.message);
  }
}

export async function seedMysqlData(pool: mysql.Pool) {
  try {
    const [rows]: any = await pool.query('SELECT COUNT(*) as cnt FROM societies');
    if (rows[0]?.cnt > 0) {
      console.log('[MySQL] Database already seeded.');
      return;
    }

    console.log('[MySQL] Seeding production records into MySQL...');
    const adminPasswordHash = bcrypt.hashSync('admin123', 10);
    const guardPinHash = bcrypt.hashSync('1234', 10);

    // 1. Society
    await pool.query(
      `INSERT INTO societies (id, name, address, status) VALUES (?, ?, ?, ?)`,
      ['soc_greengate', 'Green Valley Residency', 'Plot 42, Security Enclave, Cyber City', 'ACTIVE']
    );

    // 2. Gates
    await pool.query(
      `INSERT INTO gates (id, society_id, name, location, status) VALUES 
       ('gate_main', 'soc_greengate', 'Main Gate', 'North Entrance', 'OPERATIONAL'),
       ('gate_back', 'soc_greengate', 'Back Gate', 'South Entrance', 'OPERATIONAL')`
    );

    // 3. Users
    await pool.query(
      `INSERT INTO users (id, name, mobile, email, password_hash, pin_hash, role, society_id, status) VALUES 
       ('res_sahil', 'Sahil Arote', '9876543210', 'sahil@greengate.com', NULL, NULL, 'RESIDENT', 'soc_greengate', 'ACTIVE'),
       ('res_amit', 'Dr. Amit Sharma', '9820044821', 'amit@greengate.com', NULL, NULL, 'RESIDENT', 'soc_greengate', 'ACTIVE'),
       ('res_priya', 'Priya Sharma', '9810122334', 'priya@greengate.com', NULL, NULL, 'RESIDENT', 'soc_greengate', 'ACTIVE'),
       ('res_rajesh', 'Rajesh Rao', '9822144556', 'rajesh@greengate.com', NULL, NULL, 'RESIDENT', 'soc_greengate', 'ACTIVE'),
       ('guard_ramesh', 'Ramesh Singh', '9800011122', 'ramesh@greengate.com', NULL, ?, 'GUARD', 'soc_greengate', 'ACTIVE'),
       ('admin_user', 'Admin Secretary', '9999988888', 'admin@greengate.in', ?, NULL, 'ADMIN', 'soc_greengate', 'ACTIVE')`,
      [guardPinHash, adminPasswordHash]
    );

    // 4. Flats
    await pool.query(
      `INSERT INTO flats (id, society_id, flat_number, wing, floor, resident_id) VALUES 
       ('flat_a402', 'soc_greengate', 'A-402', 'Tower A', 4, 'res_sahil'),
       ('flat_b402', 'soc_greengate', 'B-402', 'Tower B', 4, 'res_amit'),
       ('flat_a101', 'soc_greengate', 'A-101', 'Tower A', 1, 'res_priya'),
       ('flat_a104', 'soc_greengate', 'A-104', 'Tower A', 1, 'res_rajesh')`
    );

    // 5. Guard record
    await pool.query(
      `INSERT INTO guards (id, user_id, gate_id, shift, status) VALUES 
       ('g_record_1', 'guard_ramesh', 'gate_main', 'Morning Shift (07:00 AM - 03:30 PM)', 'ON_DUTY')`
    );

    console.log('[MySQL] Production seed data successfully populated in MySQL!');
  } catch (err: any) {
    console.error('[MySQL] Seeding error:', err.message);
  }
}

