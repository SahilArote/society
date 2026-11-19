import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function getMigrationConnection(): Promise<mysql.Connection> {
  if (process.env.DATABASE_URL) {
    return await mysql.createConnection({
      uri: process.env.DATABASE_URL,
      multipleStatements: true,
      timezone: 'Z',
    });
  }

  return await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'greengate_db',
    multipleStatements: true,
    timezone: 'Z',
  });
}

async function addColumnIfNotExists(
  conn: mysql.Connection,
  table: string,
  column: string,
  columnDef: string
) {
  try {
    const [cols]: any = await conn.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [table, column]
    );
    if (!cols || cols.length === 0) {
      console.log(`  + Adding column '${column}' to table '${table}'...`);
      await conn.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${columnDef}`);
    }
  } catch (err: any) {
    console.warn(`  ! Column check warning for ${table}.${column}: ${err.message}`);
  }
}

export async function runAllMigrationsAndVerify() {
  console.log('====================================================');
  console.log('   NexGate Cloud Production Database Migration Tool  ');
  console.log('====================================================');
  console.log('Target Database:', process.env.MYSQL_DATABASE || 'DATABASE_URL');
  console.log('Time (UTC):     ', new Date().toISOString());
  console.log('----------------------------------------------------');

  let conn: mysql.Connection;
  try {
    conn = await getMigrationConnection();
    console.log('[1/5] Connected to MySQL database successfully.');
  } catch (err: any) {
    console.error('FAILED to connect to MySQL:', err.message);
    process.exit(1);
  }

  try {
    // 1. Run schema.sql
    console.log('\n[2/5] Applying DDL from schema.sql...');
    const candidatePaths = [
      path.resolve(__dirname, '../src/database/schema.sql'),
      path.resolve(__dirname, '../../src/database/schema.sql'),
      path.resolve(__dirname, '../dist/database/schema.sql'),
      path.resolve(process.cwd(), 'src/database/schema.sql'),
      path.resolve(process.cwd(), 'dist/database/schema.sql'),
    ];
    const schemaPath = candidatePaths.find((p) => fs.existsSync(p));
    if (!schemaPath) {
      throw new Error(`schema.sql not found in candidate paths: ${candidatePaths.join(', ')}`);
    }

    console.log(`Found schema.sql at: ${schemaPath}`);
    const sqlScript = fs.readFileSync(schemaPath, 'utf-8');
    const cleanedSql = sqlScript
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/--.*$/gm, '')
      .trim();

    const statements = cleanedSql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    let executedCount = 0;
    for (const stmt of statements) {
      if (process.env.DATABASE_URL && (stmt.startsWith('CREATE DATABASE') || stmt.startsWith('USE '))) {
        continue;
      }
      try {
        await conn.query(stmt);
        executedCount++;
      } catch (e: any) {
        if (!e.message.includes('already exists') && !e.message.includes('Duplicate key')) {
          console.warn(`  ! Notice on statement: ${stmt.slice(0, 50)}... (${e.message})`);
        }
      }
    }
    console.log(`Executed ${executedCount} DDL statements.`);

    // 2. Safe Idempotent Column Migrations for existing databases
    console.log('\n[3/5] Verifying and applying incremental schema columns...');

    // Societies columns
    await addColumnIfNotExists(conn, 'societies', 'subdomain', 'VARCHAR(64) UNIQUE NULL');
    await addColumnIfNotExists(conn, 'societies', 'city', 'VARCHAR(128) DEFAULT NULL');
    await addColumnIfNotExists(conn, 'societies', 'state', 'VARCHAR(128) DEFAULT NULL');
    await addColumnIfNotExists(conn, 'societies', 'pincode', 'VARCHAR(16) DEFAULT NULL');
    await addColumnIfNotExists(conn, 'societies', 'contact_email', 'VARCHAR(255) DEFAULT NULL');
    await addColumnIfNotExists(conn, 'societies', 'contact_phone', 'VARCHAR(32) DEFAULT NULL');
    await addColumnIfNotExists(conn, 'societies', 'logo_url', 'TEXT DEFAULT NULL');
    await addColumnIfNotExists(conn, 'societies', 'upi_id', 'VARCHAR(128) DEFAULT NULL');
    await addColumnIfNotExists(conn, 'societies', 'maintenance_amount', 'DECIMAL(10,2) DEFAULT 0.00');
    await addColumnIfNotExists(conn, 'societies', 'maintenance_due_day', 'INT DEFAULT 5');
    await addColumnIfNotExists(conn, 'societies', 'plan_name', "VARCHAR(64) DEFAULT 'STANDARD_1_DEVICE'");
    await addColumnIfNotExists(conn, 'societies', 'max_devices', 'INT DEFAULT 1');
    await addColumnIfNotExists(conn, 'societies', 'plan_amount', 'DECIMAL(10,2) DEFAULT 1999.00');
    await addColumnIfNotExists(conn, 'societies', 'billing_cycle', "VARCHAR(32) DEFAULT 'MONTHLY'");
    await addColumnIfNotExists(conn, 'societies', 'subscription_status', "VARCHAR(32) DEFAULT 'ACTIVE'");
    await addColumnIfNotExists(conn, 'societies', 'subscription_expires_at', 'DATETIME DEFAULT NULL');
    await addColumnIfNotExists(conn, 'societies', 'trial_ends_at', 'DATETIME DEFAULT NULL');
    await addColumnIfNotExists(conn, 'societies', 'updated_at', 'DATETIME DEFAULT NULL');

    // Users role enum check
    try {
      await conn.query(`ALTER TABLE users MODIFY COLUMN role ENUM('RESIDENT', 'GUARD', 'ADMIN', 'SUPER_ADMIN') NOT NULL`);
    } catch (_) {}

    // Visitors purpose length
    try {
      await conn.query('ALTER TABLE visitors MODIFY COLUMN purpose VARCHAR(255) NOT NULL');
    } catch (_) {}

    // Guards status and shift
    await addColumnIfNotExists(conn, 'guards', 'shift', "VARCHAR(64) DEFAULT 'Morning Shift'");
    await addColumnIfNotExists(conn, 'guards', 'status', "VARCHAR(32) DEFAULT 'ON_DUTY'");

    // 3. Ensure Core Super Admin and Initial Society Data
    console.log('\n[4/5] Checking core admin user accounts...');

    // Super Admin Seed Check
    const [superAdmins]: any = await conn.query(
      "SELECT id, email, role, status FROM users WHERE role = 'SUPER_ADMIN' OR email = 'superadmin@nexgate.co.in' LIMIT 1"
    );

    if (!superAdmins || superAdmins.length === 0) {
      console.log('  + Creating default Super Admin account (superadmin@nexgate.co.in)...');
      const superHash = bcrypt.hashSync('superadmin123', 10);
      await conn.query(
        `INSERT INTO users (id, name, mobile, email, password_hash, role, status)
         VALUES (?, ?, ?, ?, ?, 'SUPER_ADMIN', 'ACTIVE')`,
        ['superadmin_user', 'Super Administrator', '9999900000', 'superadmin@nexgate.co.in', superHash]
      );
      console.log('  ✓ Super Admin created: superadmin@nexgate.co.in / superadmin123');
    } else {
      console.log(`  ✓ Super Admin account verified: ${superAdmins[0].email} (ID: ${superAdmins[0].id})`);
    }

    // Default primary society check
    const [societiesCount]: any = await conn.query('SELECT COUNT(*) as count FROM societies');
    if (Number(societiesCount[0]?.count || 0) === 0) {
      console.log('  + Seeding initial demonstration society...');
      await conn.query(
        `INSERT INTO societies (id, name, subdomain, address, city, status, plan_name, max_devices, plan_amount, subscription_status)
         VALUES (?, ?, ?, ?, ?, 'ACTIVE', 'STANDARD_1_DEVICE', 1, 1999.00, 'ACTIVE')`,
        ['soc_greengate', 'Eco Residency Co-operative Housing Society Ltd', 'eco', 'Plot 42, Main Road', 'Mumbai']
      );
      console.log('  ✓ Default society seeded: Eco Residency (subdomain: eco)');
    }

    // 4. Final Health Check & Verification
    console.log('\n[5/5] Running final production verification check...');
    const [allTables]: any = await conn.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE()
      ORDER BY table_name ASC
    `);

    const tableNames = allTables.map((t: any) => t.TABLE_NAME || t.table_name);
    console.log(`Database tables registered (${tableNames.length} tables):`);
    console.log(tableNames.map((n: string) => `  - ${n}`).join('\n'));

    // Critical tables check
    const criticalTables = [
      'societies',
      'gates',
      'users',
      'flats',
      'guards',
      'visitors',
      'visitor_requests',
      'notifications',
      'announcements',
      'fcm_tokens',
      'push_subscriptions',
      'subscription_recharges',
    ];

    const missingTables = criticalTables.filter((t) => !tableNames.includes(t));
    if (missingTables.length > 0) {
      console.error('\n⚠️ WARNING: Missing expected tables:', missingTables);
    } else {
      console.log('\n✅ ALL CRITICAL SYSTEM TABLES VERIFIED AND PRESENT!');
    }

    console.log('\n====================================================');
    console.log('  MIGRATION & VERIFICATION COMPLETED SUCCESSFULLY!   ');
    console.log('====================================================\n');
  } catch (err: any) {
    console.error('\n❌ MIGRATION FAILED:', err.message);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

if (require.main === module) {
  runAllMigrationsAndVerify().then(() => process.exit(0)).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
