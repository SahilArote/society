"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const promise_1 = __importDefault(require("mysql2/promise"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const RAILWAY_URL = 'mysql://root:hHHEiocXSzUnyzbBtYgchBXXeMoMmNhP@crossover.proxy.rlwy.net:10407/railway';
async function migrateAndSeedClean() {
    console.log('Connecting to Railway MySQL...');
    const pool = promise_1.default.createPool({
        uri: RAILWAY_URL,
        multipleStatements: true,
    });
    console.log('1. Creating Tables on Railway MySQL...');
    await pool.query(`
    SET FOREIGN_KEY_CHECKS = 0;
    DROP TABLE IF EXISTS announcements;
    DROP TABLE IF EXISTS otp_records;
    DROP TABLE IF EXISTS audit_logs;
    DROP TABLE IF EXISTS notifications;
    DROP TABLE IF EXISTS visitor_requests;
    DROP TABLE IF EXISTS visitors;
    DROP TABLE IF EXISTS guards;
    DROP TABLE IF EXISTS flats;
    DROP TABLE IF EXISTS users;
    DROP TABLE IF EXISTS gates;
    DROP TABLE IF EXISTS societies;
    SET FOREIGN_KEY_CHECKS = 1;
  `);
    await pool.query(`
    CREATE TABLE societies (
      id VARCHAR(64) NOT NULL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      address TEXT NOT NULL,
      status VARCHAR(32) DEFAULT 'ACTIVE',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE gates (
      id VARCHAR(64) NOT NULL PRIMARY KEY,
      society_id VARCHAR(64) NOT NULL,
      name VARCHAR(255) NOT NULL,
      location VARCHAR(255) DEFAULT NULL,
      status VARCHAR(32) DEFAULT 'OPERATIONAL',
      FOREIGN KEY (society_id) REFERENCES societies(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE users (
      id VARCHAR(64) NOT NULL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      mobile VARCHAR(32) NOT NULL UNIQUE,
      email VARCHAR(255) DEFAULT NULL,
      password_hash VARCHAR(255) DEFAULT NULL,
      pin_hash VARCHAR(255) DEFAULT NULL,
      role ENUM('RESIDENT', 'GUARD', 'ADMIN') NOT NULL,
      society_id VARCHAR(64) NOT NULL,
      status VARCHAR(32) DEFAULT 'ACTIVE',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (society_id) REFERENCES societies(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE flats (
      id VARCHAR(64) NOT NULL PRIMARY KEY,
      society_id VARCHAR(64) NOT NULL,
      flat_number VARCHAR(32) NOT NULL,
      wing VARCHAR(64) NOT NULL,
      floor INT DEFAULT 1,
      resident_id VARCHAR(64) DEFAULT NULL,
      FOREIGN KEY (society_id) REFERENCES societies(id) ON DELETE CASCADE,
      FOREIGN KEY (resident_id) REFERENCES users(id) ON DELETE SET NULL,
      UNIQUE KEY uk_society_flat (society_id, wing, flat_number)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE guards (
      id VARCHAR(64) NOT NULL PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL UNIQUE,
      gate_id VARCHAR(64) NOT NULL,
      shift VARCHAR(64) DEFAULT 'Morning Shift',
      status VARCHAR(32) DEFAULT 'ON_DUTY',
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (gate_id) REFERENCES gates(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE visitors (
      id VARCHAR(64) NOT NULL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      mobile VARCHAR(32) DEFAULT NULL,
      purpose VARCHAR(64) NOT NULL,
      visitor_type VARCHAR(64) NOT NULL,
      photo_key VARCHAR(255) DEFAULT NULL,
      photo_storage_type VARCHAR(32) DEFAULT 'CLOUDINARY',
      photo_mime_type VARCHAR(64) DEFAULT 'image/jpeg',
      photo_url TEXT DEFAULT NULL,
      vehicle_number VARCHAR(64) DEFAULT NULL,
      delivery_company VARCHAR(128) DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE visitor_requests (
      id VARCHAR(64) NOT NULL PRIMARY KEY,
      society_id VARCHAR(64) NOT NULL,
      visitor_id VARCHAR(64) NOT NULL,
      resident_id VARCHAR(64) NOT NULL,
      flat_id VARCHAR(64) NOT NULL,
      guard_id VARCHAR(64) NOT NULL,
      gate_id VARCHAR(64) NOT NULL,
      status ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
      requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      responded_at DATETIME DEFAULT NULL,
      response_by VARCHAR(255) DEFAULT NULL,
      rejection_reason TEXT DEFAULT NULL,
      FOREIGN KEY (society_id) REFERENCES societies(id) ON DELETE CASCADE,
      FOREIGN KEY (visitor_id) REFERENCES visitors(id) ON DELETE CASCADE,
      FOREIGN KEY (resident_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (flat_id) REFERENCES flats(id) ON DELETE CASCADE,
      FOREIGN KEY (guard_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (gate_id) REFERENCES gates(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE notifications (
      id VARCHAR(64) NOT NULL PRIMARY KEY,
      recipient_id VARCHAR(64) NOT NULL,
      type VARCHAR(64) NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      related_entity_id VARCHAR(64) DEFAULT NULL,
      is_read BOOLEAN DEFAULT FALSE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE audit_logs (
      id VARCHAR(64) NOT NULL PRIMARY KEY,
      actor_id VARCHAR(64) NOT NULL,
      actor_role VARCHAR(32) NOT NULL,
      society_id VARCHAR(64) NOT NULL,
      request_id VARCHAR(64) DEFAULT NULL,
      action VARCHAR(64) NOT NULL,
      entity_type VARCHAR(64) NOT NULL,
      entity_id VARCHAR(64) NOT NULL,
      metadata JSON DEFAULT NULL,
      ip_address VARCHAR(64) DEFAULT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (society_id) REFERENCES societies(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE otp_records (
      id VARCHAR(64) NOT NULL PRIMARY KEY,
      mobile VARCHAR(32) NOT NULL,
      otp_code VARCHAR(16) NOT NULL,
      expires_at DATETIME NOT NULL,
      consumed BOOLEAN DEFAULT FALSE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE announcements (
      id VARCHAR(64) NOT NULL PRIMARY KEY,
      society_id VARCHAR(64) NOT NULL,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      priority VARCHAR(32) DEFAULT 'NORMAL',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (society_id) REFERENCES societies(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
    console.log('11 Clean Tables Created successfully.');
    console.log('2. Seeding ONLY the 3 Required Real Users...');
    const adminPasswordHash = bcryptjs_1.default.hashSync('admin123', 10);
    const guardPinHash = bcryptjs_1.default.hashSync('1234', 10);
    // Society
    await pool.query('INSERT INTO societies (id, name, address, status) VALUES (?, ?, ?, ?)', ['soc_greengate', 'Green Gate Residency', 'Plot 42, Main Road', 'ACTIVE']);
    // Main Gate
    await pool.query('INSERT INTO gates (id, society_id, name, location, status) VALUES (?, ?, ?, ?, ?)', ['gate_main', 'soc_greengate', 'Main Gate', 'Main Entrance', 'OPERATIONAL']);
    // 1. Admin User: admin@greengate.in / admin123
    await pool.query('INSERT INTO users (id, name, mobile, email, password_hash, pin_hash, role, society_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', ['admin_user', 'Admin', '9999988888', 'admin@greengate.in', adminPasswordHash, null, 'ADMIN', 'soc_greengate', 'ACTIVE']);
    // 2. Guard User: guard_ramesh / 9800011122 / PIN 1234
    await pool.query('INSERT INTO users (id, name, mobile, email, password_hash, pin_hash, role, society_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', ['guard_ramesh', 'Ramesh Singh', '9800011122', 'guard@greengate.in', null, guardPinHash, 'GUARD', 'soc_greengate', 'ACTIVE']);
    // Guard profile record
    await pool.query('INSERT INTO guards (id, user_id, gate_id, shift, status) VALUES (?, ?, ?, ?, ?)', ['g_record_1', 'guard_ramesh', 'gate_main', 'Morning Shift (07:00 AM - 07:00 PM)', 'ON_DUTY']);
    // 3. Resident User: Sahil Arote / 9876543210 / Flat A-402
    await pool.query('INSERT INTO users (id, name, mobile, email, password_hash, pin_hash, role, society_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', ['res_sahil', 'Sahil Arote', '9876543210', 'sahil@greengate.in', null, null, 'RESIDENT', 'soc_greengate', 'ACTIVE']);
    // Flat for Sahil
    await pool.query('INSERT INTO flats (id, society_id, flat_number, wing, floor, resident_id) VALUES (?, ?, ?, ?, ?, ?)', ['flat_a402', 'soc_greengate', 'A-402', 'Tower A', 4, 'res_sahil']);
    console.log('Successfully seeded exactly 3 real users:');
    console.log('   1. Admin: admin@greengate.in / admin123');
    console.log('   2. Guard: guard_ramesh / PIN 1234 / 9800011122');
    console.log('   3. Resident: Sahil Arote / 9876543210 / Flat A-402');
    console.log('   (Zero mock visitors, zero mock requests)');
    await pool.end();
}
migrateAndSeedClean().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
