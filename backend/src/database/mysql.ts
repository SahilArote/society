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

  try {
    if (process.env.DATABASE_URL) {
      connectionPool = mysql.createPool({
        uri: process.env.DATABASE_URL,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        multipleStatements: true,
      });
      const connection = await connectionPool.getConnection();
      console.log(`[MySQL] Successfully connected to MySQL via DATABASE_URL`);
      connection.release();
      return connectionPool;
    }

    let host = process.env.MYSQL_HOST || 'localhost';
    let port = parseInt(process.env.MYSQL_PORT || '3306');
    let user = process.env.MYSQL_USER || 'root';
    let password = process.env.MYSQL_PASSWORD || '';
    let database = process.env.MYSQL_DATABASE || 'greengate_db';

    if (!password && !process.env.MYSQL_PASSWORD && process.env.USE_MYSQL !== 'true') {
      return null;
    }

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
    console.log('[MySQL] MySQL not connected. Skipping migrations.');
    return;
  }

  try {
    console.log('[MySQL] Running migrations from schema.sql...');
    const candidatePaths = [
      path.resolve(__dirname, './schema.sql'),
      path.resolve(__dirname, '../src/database/schema.sql'),
      path.resolve(__dirname, '../../src/database/schema.sql'),
      path.resolve(process.cwd(), 'src/database/schema.sql'),
      path.resolve(process.cwd(), 'dist/database/schema.sql'),
    ];

    const schemaPath = candidatePaths.find((p) => fs.existsSync(p));
    if (!schemaPath) {
      console.warn('[MySQL] Could not find schema.sql in any expected candidate paths:', candidatePaths);
      return;
    }

    console.log(`[MySQL] Found schema.sql at ${schemaPath}`);
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
      if (process.env.DATABASE_URL && (stmt.startsWith('CREATE DATABASE') || stmt.startsWith('USE '))) {
        continue;
      }
      try {
        await pool.query(stmt);
      } catch (e: any) {
        // Ignore benign warnings like duplicate index or table exists
        if (!e.message.includes('Duplicate key') && !e.message.includes('already exists')) {
          console.error(`[MySQL] Statement error on [${stmt.slice(0, 60).replace(/\n/g, ' ')}...]: ${e.message}`);
        }
      }
    }

    // Auto-migrate schema columns if table already exists
    try {
      await pool.query('ALTER TABLE visitors MODIFY COLUMN purpose VARCHAR(255) NOT NULL');
    } catch (_) {}

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

    console.log('[MySQL] Seeding clean production records into MySQL (3 Real Users)...');
    const adminPasswordHash = bcrypt.hashSync('admin123', 10);
    const guardPinHash = bcrypt.hashSync('1234', 10);

    // 1. Society
    await pool.query(
      `INSERT INTO societies (id, name, address, status) VALUES (?, ?, ?, ?)`,
      ['soc_greengate', 'Green Gate Residency', 'Plot 42, Main Road', 'ACTIVE']
    );

    // 2. Gates
    await pool.query(
      `INSERT INTO gates (id, society_id, name, location, status) VALUES 
       ('gate_main', 'soc_greengate', 'Main Gate', 'Main Entrance', 'OPERATIONAL')`
    );

    // 3. Exactly 3 Real Users (Admin, Guard, Resident Sahil)
    await pool.query(
      `INSERT INTO users (id, name, mobile, email, password_hash, pin_hash, role, society_id, status) VALUES 
       ('admin_user', 'Admin', '9999988888', 'admin@greengate.in', ?, NULL, 'ADMIN', 'soc_greengate', 'ACTIVE'),
       ('guard_ramesh', 'Ramesh Singh', '9800011122', 'guard@greengate.in', NULL, ?, 'GUARD', 'soc_greengate', 'ACTIVE'),
       ('res_sahil', 'Sahil Arote', '9876543210', 'sahil@greengate.in', NULL, NULL, 'RESIDENT', 'soc_greengate', 'ACTIVE')`,
      [adminPasswordHash, guardPinHash]
    );

    // 4. Flat for Sahil
    await pool.query(
      `INSERT INTO flats (id, society_id, flat_number, wing, floor, resident_id) VALUES 
       ('flat_a402', 'soc_greengate', 'A-402', 'Tower A', 4, 'res_sahil')`
    );

    // 5. Guard record for Ramesh
    await pool.query(
      `INSERT INTO guards (id, user_id, gate_id, shift, status) VALUES 
       ('g_record_1', 'guard_ramesh', 'gate_main', 'Morning Shift (07:00 AM - 07:00 PM)', 'ON_DUTY')`
    );

    console.log('[MySQL] Clean 3-user production data successfully populated in MySQL!');
  } catch (err: any) {
    console.error('[MySQL] Seeding error:', err.message);
  }
}
