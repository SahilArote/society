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
        timezone: 'Z',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        multipleStatements: true,
        enableKeepAlive: true,
        keepAliveInitialDelay: 10000,
      });

      (connectionPool as any).on('connection', (connection: any) => {
        connection.query("SET time_zone = '+00:00'");
      });

      (connectionPool as any).on('error', (err: any) => {
        console.error('[MySQL Pool Error]', err);
      });

      const connection = await connectionPool.getConnection();
      await connection.query("SET time_zone = '+00:00'");
      console.log(`[MySQL] Successfully connected to MySQL via DATABASE_URL with UTC timezone`);
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
      timezone: 'Z',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      multipleStatements: true,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
    });

    (connectionPool as any).on('connection', (connection: any) => {
      connection.query("SET time_zone = '+00:00'");
    });

    (connectionPool as any).on('error', (err: any) => {
      console.error('[MySQL Pool Error]', err);
    });

    const connection = await connectionPool.getConnection();
    await connection.query("SET time_zone = '+00:00'");
    console.log(`[MySQL] Successfully connected to MySQL at ${host}:${port}/${database} with UTC timezone`);
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

    // Helper to add missing columns idempotently
    const addCol = async (table: string, col: string, colDef: string) => {
      try {
        const [c]: any = await pool.query(
          `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
          [table, col]
        );
        if (!c || c.length === 0) {
          await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${col}\` ${colDef}`);
        }
      } catch (_) {}
    };

    // Auto-migrate schema columns if table already exists
    await addCol('societies', 'subdomain', 'VARCHAR(64) UNIQUE NULL');
    await addCol('societies', 'city', 'VARCHAR(128) DEFAULT NULL');
    await addCol('societies', 'state', 'VARCHAR(128) DEFAULT NULL');
    await addCol('societies', 'pincode', 'VARCHAR(16) DEFAULT NULL');
    await addCol('societies', 'contact_email', 'VARCHAR(255) DEFAULT NULL');
    await addCol('societies', 'contact_phone', 'VARCHAR(32) DEFAULT NULL');
    await addCol('societies', 'logo_url', 'TEXT DEFAULT NULL');
    await addCol('societies', 'upi_id', 'VARCHAR(128) DEFAULT NULL');
    await addCol('societies', 'maintenance_amount', 'DECIMAL(10,2) DEFAULT 0.00');
    await addCol('societies', 'maintenance_due_day', 'INT DEFAULT 5');
    await addCol('societies', 'plan_name', "VARCHAR(64) DEFAULT 'STANDARD_1_DEVICE'");
    await addCol('societies', 'max_devices', 'INT DEFAULT 1');
    await addCol('societies', 'plan_amount', 'DECIMAL(10,2) DEFAULT 1999.00');
    await addCol('societies', 'billing_cycle', "VARCHAR(32) DEFAULT 'MONTHLY'");
    await addCol('societies', 'subscription_status', "VARCHAR(32) DEFAULT 'ACTIVE'");
    await addCol('societies', 'subscription_expires_at', 'DATETIME DEFAULT NULL');
    await addCol('societies', 'trial_ends_at', 'DATETIME DEFAULT NULL');
    await addCol('societies', 'updated_at', 'DATETIME DEFAULT NULL');

    try {
      await pool.query(`ALTER TABLE users MODIFY COLUMN role ENUM('RESIDENT', 'GUARD', 'ADMIN', 'SUPER_ADMIN') NOT NULL`);
    } catch (_) {}

    try {
      await pool.query('ALTER TABLE visitors MODIFY COLUMN purpose VARCHAR(255) NOT NULL');
    } catch (_) {}

    // Auto-seed default Super Admin if not present
    try {
      const [superAdmin]: any = await pool.query(
        "SELECT id FROM users WHERE role = 'SUPER_ADMIN' OR email = 'superadmin@nexgate.co.in' LIMIT 1"
      );
      if (!superAdmin || superAdmin.length === 0) {
        const superHash = bcrypt.hashSync('superadmin123', 10);
        await pool.query(
          `INSERT INTO users (id, name, mobile, email, password_hash, role, status)
           VALUES (?, ?, ?, ?, ?, 'SUPER_ADMIN', 'ACTIVE')`,
          ['superadmin_user', 'Super Administrator', '9999900000', 'superadmin@nexgate.co.in', superHash]
        );
        console.log('[MySQL] Super Admin account created: superadmin@nexgate.co.in / superadmin123');
      }
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
      ['soc_greengate', 'Eco Residency Co-operative Housing Society Ltd', 'Plot 42, Main Road', 'ACTIVE']
    );

    // 2. Gates
    await pool.query(
      `INSERT INTO gates (id, society_id, name, location, status) VALUES 
       ('gate_main', 'soc_greengate', 'Main Gate', 'Main Entrance', 'OPERATIONAL')`
    );

    // 3. Exactly 3 Real Users (Admin, Guard, Resident Sahil)
    await pool.query(
      `INSERT INTO users (id, name, mobile, email, password_hash, pin_hash, role, society_id, status) VALUES 
       ('admin_user', 'Admin', '9999988888', 'admin@nexgate.co.in', ?, NULL, 'ADMIN', 'soc_greengate', 'ACTIVE'),
       ('guard_ramesh', 'Ramesh Singh', '9800011122', 'guard@nexgate.co.in', NULL, ?, 'GUARD', 'soc_greengate', 'ACTIVE'),
       ('res_sahil', 'Sahil Arote', '9876543210', 'sahil@nexgate.co.in', NULL, NULL, 'RESIDENT', 'soc_greengate', 'ACTIVE')`,
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
