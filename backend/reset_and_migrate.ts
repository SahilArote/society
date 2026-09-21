import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config({ path: path.resolve(__dirname, '.env') });

async function main() {
  console.log('--------------------------------------------------');
  console.log('GreenGate Database Reset & Migration Script');
  console.log('--------------------------------------------------');
  console.log('Host:     ', process.env.MYSQL_HOST);
  console.log('Port:     ', process.env.MYSQL_PORT);
  console.log('Database: ', process.env.MYSQL_DATABASE);
  console.log('User:     ', process.env.MYSQL_USER);
  console.log('--------------------------------------------------');

  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    multipleStatements: true,
  });

  console.log('[1/5] Connected to MySQL successfully.');

  // Step 1: Find and drop all existing tables
  console.log('[2/5] Fetching existing tables in database...');
  const [tables]: any = await connection.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = ?
  `, [process.env.MYSQL_DATABASE]);

  const tableNames = tables.map((t: any) => t.TABLE_NAME || t.table_name);
  console.log(`Found ${tableNames.length} existing tables:`, tableNames);

  if (tableNames.length > 0) {
    console.log('Disabling foreign key checks and dropping all tables...');
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const name of tableNames) {
      await connection.query(`DROP TABLE IF EXISTS \`${name}\``);
      console.log(`  - Dropped table: ${name}`);
    }
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('All previous tables successfully dropped.');
  } else {
    console.log('No existing tables to drop.');
  }

  // Step 2: Read schema.sql and apply
  console.log('[3/5] Reading and applying schema.sql...');
  const schemaPath = path.resolve(__dirname, 'src/database/schema.sql');
  const sqlScript = fs.readFileSync(schemaPath, 'utf-8');
  const cleanedSql = sqlScript
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/--.*$/gm, '')
    .trim();

  const statements = cleanedSql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  console.log(`Executing ${statements.length} migration statements...`);
  for (const stmt of statements) {
    try {
      await connection.query(stmt);
    } catch (err: any) {
      console.error(`Error executing statement: ${stmt.slice(0, 60)}...`);
      console.error(`Error message: ${err.message}`);
      throw err;
    }
  }
  console.log('All schema tables and indexes created successfully.');

  // Step 3: Seed basic society, gates, users, flats, guards
  console.log('[4/5] Seeding foundational records (Society, Gates, Users, Flats)...');
  const adminPasswordHash = bcrypt.hashSync('admin123', 10);
  const guardPinHash = bcrypt.hashSync('1234', 10);

  // 1. Society
  await connection.query(
    `INSERT INTO societies (id, name, address, status) VALUES (?, ?, ?, ?)`,
    ['soc_greengate', 'Green Gate Residency', 'Plot 42, Main Road', 'ACTIVE']
  );

  // 2. Gates
  const gates = [
    { id: 'gate_main', name: 'Main Gate', location: 'Main Entrance Barrier 1', status: 'OPERATIONAL' },
    { id: 'gate_east', name: 'East Gate', location: 'Tower B & C Entrance Barrier 2', status: 'OPERATIONAL' },
    { id: 'gate_service', name: 'Service Gate', location: 'Vendor & Delivery Barrier 3', status: 'OPERATIONAL' },
  ];
  for (const g of gates) {
    await connection.query(
      `INSERT INTO gates (id, society_id, name, location, status) VALUES (?, ?, ?, ?, ?)`,
      [g.id, 'soc_greengate', g.name, g.location, g.status]
    );
  }

  // 3. Users
  await connection.query(
    `INSERT INTO users (id, name, mobile, email, password_hash, pin_hash, role, society_id, status) VALUES 
     ('admin_user', 'Admin', '9999988888', 'admin@greengate.in', ?, NULL, 'ADMIN', 'soc_greengate', 'ACTIVE'),
     ('guard_ramesh', 'Ramesh Singh', '9800011122', 'guard@greengate.in', NULL, ?, 'GUARD', 'soc_greengate', 'ACTIVE'),
     ('guard_suresh', 'Suresh Patil', '9800011123', 'suresh@greengate.in', NULL, ?, 'GUARD', 'soc_greengate', 'ACTIVE'),
     ('guard_vikram', 'Vikram Rathod', '9800011124', 'vikram@greengate.in', NULL, ?, 'GUARD', 'soc_greengate', 'ACTIVE'),
     ('res_sahil', 'Sahil Arote', '9876543210', 'sahil@greengate.in', NULL, NULL, 'RESIDENT', 'soc_greengate', 'ACTIVE')`,
    [adminPasswordHash, guardPinHash, guardPinHash, guardPinHash]
  );

  // 4. Flat for Sahil
  await connection.query(
    `INSERT INTO flats (id, society_id, flat_number, wing, floor, resident_id) VALUES 
     ('flat_a402', 'soc_greengate', 'A-402', 'Tower A', 4, 'res_sahil'),
     ('flat_a403', 'soc_greengate', 'A-403', 'Tower A', 4, NULL),
     ('flat_b101', 'soc_greengate', 'B-101', 'Tower B', 1, NULL),
     ('flat_b102', 'soc_greengate', 'B-102', 'Tower B', 1, NULL),
     ('flat_c201', 'soc_greengate', 'C-201', 'Tower C', 2, NULL),
     ('flat_c202', 'soc_greengate', 'C-202', 'Tower C', 2, NULL)`
  );

  // 5. Guard records
  await connection.query(
    `INSERT INTO guards (id, user_id, gate_id, shift, status) VALUES 
     ('grd_ramesh', 'guard_ramesh', 'gate_main', 'Morning Shift (06:00 AM - 02:00 PM)', 'ON_DUTY'),
     ('grd_suresh', 'guard_suresh', 'gate_east', 'Evening Shift (02:00 PM - 10:00 PM)', 'ON_DUTY'),
     ('grd_vikram', 'guard_vikram', 'gate_service', 'Night Shift (10:00 PM - 06:00 AM)', 'ON_DUTY')`
  );

  // 6. Sample realistic visitor requests
  const sampleVisitors = [
    { name: 'Sunil Verma', mobile: '9820199201', purpose: 'Guest / Family', type: 'guest', vehicle: 'MH 12 AQ 4455', status: 'INSIDE', flatId: 'flat_a402', gateId: 'gate_main', guardId: 'guard_ramesh', hoursAgo: 2 },
    { name: 'Amazon Delivery (Kishore)', mobile: '9819922331', purpose: 'Parcel Delivery', type: 'delivery', vehicle: 'MH 14 BN 1204', status: 'EXITED', flatId: 'flat_a402', gateId: 'gate_service', guardId: 'guard_vikram', hoursAgo: 4 },
    { name: 'Zomato Food Delivery', mobile: '9876541234', purpose: 'Food Delivery', type: 'delivery', vehicle: 'MH 12 CK 8899', status: 'APPROVED', flatId: 'flat_a402', gateId: 'gate_main', guardId: 'guard_ramesh', hoursAgo: 1 },
    { name: 'Urban Company AC Repair', mobile: '9833445566', purpose: 'AC Maintenance', type: 'maintenance', vehicle: 'MH 12 ET 3321', status: 'INSIDE', flatId: 'flat_a402', gateId: 'gate_main', guardId: 'guard_ramesh', hoursAgo: 3 },
    { name: 'Ola Cab (Dinesh)', mobile: '9890123456', purpose: 'Cab Pickup', type: 'cab', vehicle: 'MH 12 DF 5544', status: 'EXITED', flatId: 'flat_a402', gateId: 'gate_main', guardId: 'guard_ramesh', hoursAgo: 6 },
    { name: 'Dr. Anand Mehta', mobile: '9822334455', purpose: 'Guest Visit', type: 'guest', vehicle: 'MH 14 ER 9012', status: 'APPROVED', flatId: 'flat_a402', gateId: 'gate_east', guardId: 'guard_suresh', hoursAgo: 5 },
    { name: 'BigBasket Grocery', mobile: '9844556677', purpose: 'Grocery Delivery', type: 'delivery', vehicle: 'MH 12 GB 7788', status: 'PENDING', flatId: 'flat_a402', gateId: 'gate_service', guardId: 'guard_vikram', hoursAgo: 0.5 },
  ];

  for (let i = 0; i < sampleVisitors.length; i++) {
    const sv = sampleVisitors[i];
    const visId = `vis_seed_${Date.now()}_${i}`;
    const reqId = `req_seed_${Date.now()}_${i}`;
    const reqTime = new Date(Date.now() - sv.hoursAgo * 3600 * 1000);
    const entryTime = (sv.status === 'INSIDE' || sv.status === 'EXITED') ? new Date(reqTime.getTime() + 5 * 60 * 1000) : null;
    const exitTime = sv.status === 'EXITED' ? new Date(reqTime.getTime() + 45 * 60 * 1000) : null;

    await connection.query(
      `INSERT INTO visitors (id, name, mobile, purpose, visitor_type, vehicle_number)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [visId, sv.name, sv.mobile, sv.purpose, sv.type, sv.vehicle]
    );

    await connection.query(
      `INSERT INTO visitor_requests 
       (id, society_id, visitor_id, resident_id, flat_id, guard_id, gate_id, status, requested_at, responded_at, response_by, entry_time, exit_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        reqId, 'soc_greengate', visId, 'res_sahil', sv.flatId, sv.guardId, sv.gateId,
        sv.status, reqTime, reqTime, 'Resident Approval', entryTime, exitTime
      ]
    );
  }

  // 7. Announcement
  await connection.query(
    `INSERT INTO announcements (id, society_id, title, body, priority, target, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      'ann_welcome',
      'soc_greengate',
      'Welcome to Green Gate Residency',
      'Digital visitor management is now active. Please use your resident portal to manage visitors.',
      'high',
      'all',
      'admin_user'
    ]
  );

  console.log('Seed data successfully inserted.');

  // Step 4: Verification
  console.log('[5/5] Verifying database tables and records...');
  const [createdTables]: any = await connection.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = ?
    ORDER BY table_name ASC
  `, [process.env.MYSQL_DATABASE]);

  console.log('\n--- Database Tables & Row Counts ---');
  for (const t of createdTables) {
    const tName = t.TABLE_NAME || t.table_name;
    const [c]: any = await connection.query(`SELECT COUNT(*) as count FROM \`${tName}\``);
    console.log(`- ${tName.padEnd(25)} : ${c[0].count} rows`);
  }
  console.log('------------------------------------\n');

  await connection.end();
  console.log('Done! Database reset, migrated, and seeded successfully.');
}

main().catch((err) => {
  console.error('Fatal error during migration:', err);
  process.exit(1);
});
