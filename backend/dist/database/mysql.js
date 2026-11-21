"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isMysqlConfigured = isMysqlConfigured;
exports.getMysqlPool = getMysqlPool;
exports.runMysqlMigrations = runMysqlMigrations;
exports.seedMaintenanceDefaults = seedMaintenanceDefaults;
exports.seedMysqlData = seedMysqlData;
const promise_1 = __importDefault(require("mysql2/promise"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
dotenv_1.default.config();
let connectionPool = null;
function isMysqlConfigured() {
    return process.env.USE_MYSQL === 'true' || Boolean(process.env.DATABASE_URL) || Boolean(process.env.MYSQL_HOST);
}
async function getMysqlPool() {
    if (connectionPool)
        return connectionPool;
    try {
        if (process.env.DATABASE_URL) {
            connectionPool = promise_1.default.createPool({
                uri: process.env.DATABASE_URL,
                timezone: 'Z',
                waitForConnections: true,
                connectionLimit: 10,
                queueLimit: 0,
                multipleStatements: true,
                enableKeepAlive: true,
                keepAliveInitialDelay: 10000,
            });
            connectionPool.on('connection', (connection) => {
                connection.query("SET time_zone = '+00:00'");
            });
            connectionPool.on('error', (err) => {
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
        connectionPool = promise_1.default.createPool({
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
        connectionPool.on('connection', (connection) => {
            connection.query("SET time_zone = '+00:00'");
        });
        connectionPool.on('error', (err) => {
            console.error('[MySQL Pool Error]', err);
        });
        const connection = await connectionPool.getConnection();
        await connection.query("SET time_zone = '+00:00'");
        console.log(`[MySQL] Successfully connected to MySQL at ${host}:${port}/${database} with UTC timezone`);
        connection.release();
        return connectionPool;
    }
    catch (err) {
        console.warn(`[MySQL] Could not connect to MySQL database (${err.message}).`);
        connectionPool = null;
        return null;
    }
}
async function runMysqlMigrations() {
    const pool = await getMysqlPool();
    if (!pool) {
        console.log('[MySQL] MySQL not connected. Skipping migrations.');
        return;
    }
    try {
        console.log('[MySQL] Running migrations from schema.sql...');
        const candidatePaths = [
            path_1.default.resolve(__dirname, './schema.sql'),
            path_1.default.resolve(__dirname, '../src/database/schema.sql'),
            path_1.default.resolve(__dirname, '../../src/database/schema.sql'),
            path_1.default.resolve(process.cwd(), 'src/database/schema.sql'),
            path_1.default.resolve(process.cwd(), 'dist/database/schema.sql'),
        ];
        const schemaPath = candidatePaths.find((p) => fs_1.default.existsSync(p));
        if (!schemaPath) {
            console.warn('[MySQL] Could not find schema.sql in any expected candidate paths:', candidatePaths);
            return;
        }
        console.log(`[MySQL] Found schema.sql at ${schemaPath}`);
        const sqlScript = fs_1.default.readFileSync(schemaPath, 'utf-8');
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
            }
            catch (e) {
                // Ignore benign warnings like duplicate index or table exists
                if (!e.message.includes('Duplicate key') && !e.message.includes('already exists')) {
                    console.error(`[MySQL] Statement error on [${stmt.slice(0, 60).replace(/\n/g, ' ')}...]: ${e.message}`);
                }
            }
        }
        // Helper to add missing columns idempotently
        const addCol = async (table, col, colDef) => {
            try {
                const [c] = await pool.query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`, [table, col]);
                if (!c || c.length === 0) {
                    await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${col}\` ${colDef}`);
                }
            }
            catch (_) { }
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
        }
        catch (_) { }
        try {
            await pool.query('ALTER TABLE visitors MODIFY COLUMN purpose VARCHAR(255) NOT NULL');
        }
        catch (_) { }
        // Auto-migrate: add thumb_url column if missing (safe idempotent)
        try {
            await pool.query('ALTER TABLE visitors ADD COLUMN thumb_url TEXT NULL AFTER photo_url');
            console.log('[MySQL] Migration: Added thumb_url column to visitors table');
        }
        catch (e) {
            if (!e.message.includes('Duplicate column') && !e.message.includes('already exists')) {
                // ignore — column already exists
            }
        }
        // Auto-seed default Super Admin if not present
        try {
            const [superAdmin] = await pool.query("SELECT id FROM users WHERE role = 'SUPER_ADMIN' OR email = 'superadmin@nexgate.co.in' LIMIT 1");
            if (!superAdmin || superAdmin.length === 0) {
                const superHash = bcryptjs_1.default.hashSync('superadmin123', 10);
                await pool.query(`INSERT INTO users (id, name, mobile, email, password_hash, role, status)
           VALUES (?, ?, ?, ?, ?, 'SUPER_ADMIN', 'ACTIVE')`, ['superadmin_user', 'Super Administrator', '9999900000', 'superadmin@nexgate.co.in', superHash]);
                console.log('[MySQL] Super Admin account created: superadmin@nexgate.co.in / superadmin123');
            }
        }
        catch (_) { }
        // Auto-update society name to official real name
        try {
            await pool.query("UPDATE societies SET name = 'Eco Residency Co-operative Housing Society Ltd' WHERE name = 'Green Gate Residency' OR name = 'NexGate Residency' OR id = 'soc_greengate'");
            await pool.query("UPDATE users SET email = 'admin@nexgate.co.in' WHERE id = 'admin_user' AND (email = 'admin@greengate.in' OR email IS NULL)");
        }
        catch (_) { }
        // Security Migration: Clean up resident admin roles & ensure only Super-Admin configured admins have ADMIN role
        try {
            // 1. If admin_user was hijacked/overwritten by a flat edit with Gurpreet / suhas@gmail.com, separate them:
            const [overwrittenAdmin] = await pool.query("SELECT id, name, mobile, email, society_id FROM users WHERE id = 'admin_user' AND (email LIKE '%suhas%' OR name LIKE '%Gurpreet%')");
            if (overwrittenAdmin && overwrittenAdmin.length > 0) {
                const u = overwrittenAdmin[0];
                const resId = `res_${u.mobile || '9664646494'}`;
                await pool.query(`INSERT INTO users (id, name, mobile, email, role, society_id, status)
           VALUES (?, ?, ?, ?, 'RESIDENT', ?, 'ACTIVE')
           ON DUPLICATE KEY UPDATE name = VALUES(name), email = VALUES(email), role = 'RESIDENT'`, [resId, u.name || 'Gurpreet N', u.mobile || '9664646494', u.email || 'suhas@gmail.com', u.society_id || 'soc_greengate']);
                // Re-point any flat pointing to admin_user to the dedicated resident record
                await pool.query('UPDATE flats SET resident_id = ? WHERE resident_id = ?', [resId, 'admin_user']);
                // Restore admin_user to pristine clean default
                const defaultAdminHash = bcryptjs_1.default.hashSync('admin123', 10);
                await pool.query("UPDATE users SET name = 'Admin', mobile = '9999988888', email = 'admin@nexgate.co.in', role = 'ADMIN', password_hash = ? WHERE id = 'admin_user'", [defaultAdminHash]);
                console.log('[MySQL] Restored pristine admin_user and decoupled Gurpreet N to dedicated resident ID.');
            }
            // 2. Demote suhas@gmail.com / 9664646494 to RESIDENT and clear admin password
            await pool.query("UPDATE users SET role = 'RESIDENT', password_hash = NULL WHERE (email = 'suhas@gmail.com' OR mobile = '9664646494') AND role != 'SUPER_ADMIN'");
            // 3. Demote any resident mapped to a flat whose credentials do not match the society's official admin
            await pool.query(`
        UPDATE users u
        JOIN flats f ON f.resident_id = u.id
        JOIN societies s ON f.society_id = s.id
        SET u.role = 'RESIDENT', u.password_hash = NULL
        WHERE u.role = 'ADMIN'
          AND (s.contact_email IS NOT NULL AND LOWER(COALESCE(u.email, '')) != LOWER(s.contact_email))
          AND (s.contact_phone IS NOT NULL AND u.mobile != s.contact_phone)
          AND u.role != 'SUPER_ADMIN'
      `);
            console.log('[MySQL] Security Check: Verified resident role boundaries across all flats.');
        }
        catch (e) {
            console.warn('[MySQL] Note on resident role boundary check:', e.message);
        }
        console.log('[MySQL] Schema migrations execution cycle complete.');
        // Run Initial Seed Data if society table empty
        await seedMysqlData(pool);
        // Seed Maintenance & Direct UPI Defaults
        await seedMaintenanceDefaults(pool);
    }
    catch (err) {
        console.error('[MySQL] Migration error:', err.message);
    }
}
async function seedMaintenanceDefaults(pool) {
    try {
        const societyId = 'soc_greengate';
        // 1. Seed Society Merchant UPI Config
        const [configs] = await pool.query('SELECT id FROM society_payment_configs WHERE society_id = ?', [societyId]);
        if (configs.length === 0) {
            await pool.query(`INSERT INTO society_payment_configs (
          id, society_id, merchant_vpa, merchant_name, bank_name, account_number_masked, ifsc_code
        ) VALUES (?, ?, 'greenvalley@icici', 'Green Valley CHS', 'ICICI Bank', '•••• •••• •••• 4589', 'ICIC0001234')`, ['spc_greenvalley', societyId]);
            console.log('[MySQL] Seeded default society merchant UPI: greenvalley@icici');
        }
        // 2. Ensure active Nov 2026 maintenance invoice for all occupied flats in society
        const [realFlats] = await pool.query(`SELECT f.id, f.flat_number, f.wing, f.resident_id 
       FROM flats f 
       WHERE f.society_id = ? AND f.resident_id IS NOT NULL`, [societyId]);
        const breakdown = JSON.stringify([
            { title: 'Maintenance', amount: 2000 },
            { title: 'Sinking fund', amount: 300 },
            { title: 'Parking', amount: 200 },
        ]);
        for (const f of realFlats) {
            const cleanFlat = f.flat_number.replace(/[^a-zA-Z0-9]/g, '');
            const invId = `inv_${f.id.replace(/[^a-zA-Z0-9]/g, '')}_nov2026`;
            const refId = `NXG-${cleanFlat}-112026`;
            await pool.query(`INSERT IGNORE INTO maintenance_invoices (
          id, society_id, flat_id, resident_id, invoice_number,
          billing_period, due_date, total_amount, paid_amount, status,
          breakdown_json, reference_id
        ) VALUES (?, ?, ?, ?, ?, 'Nov 2026', '2026-12-10', 2500.00, 0.00, 'UNPAID', ?, ?)`, [
                invId,
                societyId,
                f.id,
                f.resident_id,
                `INV-2026-11-${cleanFlat}`,
                breakdown,
                refId,
            ]);
        }
        console.log(`[MySQL] Active Nov 2026 maintenance bills initialized for ${realFlats.length} occupied flats`);
    }
    catch (err) {
        console.warn('[MySQL] Maintenance initialization notice:', err.message);
    }
}
async function seedMysqlData(pool) {
    try {
        const [rows] = await pool.query('SELECT COUNT(*) as cnt FROM societies');
        if (rows[0]?.cnt > 0) {
            console.log('[MySQL] Database already seeded.');
            return;
        }
        console.log('[MySQL] Seeding clean production records into MySQL (3 Real Users)...');
        const adminPasswordHash = bcryptjs_1.default.hashSync('admin123', 10);
        const guardPinHash = bcryptjs_1.default.hashSync('1234', 10);
        // 1. Society
        await pool.query(`INSERT INTO societies (id, name, address, status) VALUES (?, ?, ?, ?)`, ['soc_greengate', 'Eco Residency Co-operative Housing Society Ltd', 'Plot 42, Main Road', 'ACTIVE']);
        // 2. Gates
        await pool.query(`INSERT INTO gates (id, society_id, name, location, status) VALUES 
       ('gate_main', 'soc_greengate', 'Main Gate', 'Main Entrance', 'OPERATIONAL')`);
        // 3. Exactly 3 Real Users (Admin, Guard, Resident Sahil)
        await pool.query(`INSERT INTO users (id, name, mobile, email, password_hash, pin_hash, role, society_id, status) VALUES 
       ('admin_user', 'Admin', '9999988888', 'admin@nexgate.co.in', ?, NULL, 'ADMIN', 'soc_greengate', 'ACTIVE'),
       ('guard_ramesh', 'Ramesh Singh', '9800011122', 'guard@nexgate.co.in', NULL, ?, 'GUARD', 'soc_greengate', 'ACTIVE'),
       ('res_sahil', 'Sahil Arote', '9876543210', 'sahil@nexgate.co.in', NULL, NULL, 'RESIDENT', 'soc_greengate', 'ACTIVE')`, [adminPasswordHash, guardPinHash]);
        // 4. Flat for Sahil
        await pool.query(`INSERT INTO flats (id, society_id, flat_number, wing, floor, resident_id) VALUES 
       ('flat_a402', 'soc_greengate', 'A-402', 'Tower A', 4, 'res_sahil')`);
        // 5. Guard record for Ramesh
        await pool.query(`INSERT INTO guards (id, user_id, gate_id, shift, status) VALUES 
       ('g_record_1', 'guard_ramesh', 'gate_main', 'Morning Shift (07:00 AM - 07:00 PM)', 'ON_DUTY')`);
        console.log('[MySQL] Clean 3-user production data successfully populated in MySQL!');
    }
    catch (err) {
        console.error('[MySQL] Seeding error:', err.message);
    }
}
