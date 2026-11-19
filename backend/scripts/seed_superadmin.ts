import mysql from 'mysql2/promise';
import path from 'path';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function getDbConnection(): Promise<mysql.Connection> {
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

async function upsertSociety(conn: mysql.Connection, soc: any): Promise<string> {
  const [existing]: any = await conn.query(
    'SELECT id FROM societies WHERE subdomain = ? OR id = ? LIMIT 1',
    [soc.subdomain, soc.id]
  );
  if (existing && existing.length > 0) {
    const id = existing[0].id;
    await conn.query(
      `UPDATE societies SET
        name = ?, plan_name = ?, max_devices = ?, plan_amount = ?,
        upi_id = ?, contact_email = ?, contact_phone = ?,
        status = 'ACTIVE', subscription_status = 'ACTIVE'
       WHERE id = ?`,
      [soc.name, soc.plan_name, soc.max_devices, soc.plan_amount, soc.upi_id, soc.contact_email, soc.contact_phone, id]
    );
    return id;
  } else {
    await conn.query(
      `INSERT INTO societies (id, name, subdomain, address, city, state, pincode, contact_email, contact_phone, upi_id, maintenance_amount, maintenance_due_day, plan_name, max_devices, plan_amount, billing_cycle, subscription_status, subscription_expires_at, trial_ends_at, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 30 DAY), DATE_ADD(NOW(), INTERVAL 30 DAY), 'ACTIVE')`,
      [
        soc.id, soc.name, soc.subdomain, soc.address, soc.city, soc.state,
        soc.pincode, soc.contact_email, soc.contact_phone, soc.upi_id,
        soc.maintenance_amount, soc.maintenance_due_day, soc.plan_name,
        soc.max_devices, soc.plan_amount, soc.billing_cycle || 'MONTHLY',
        soc.subscription_status || 'ACTIVE'
      ]
    );
    return soc.id;
  }
}

async function upsertUser(conn: mysql.Connection, user: any): Promise<string> {
  const [existing]: any = await conn.query(
    'SELECT id FROM users WHERE email = ? OR mobile = ? OR id = ? LIMIT 1',
    [user.email, user.mobile, user.id]
  );
  if (existing && existing.length > 0) {
    const id = existing[0].id;
    await conn.query(
      `UPDATE users SET
        name = ?,
        password_hash = COALESCE(?, password_hash),
        pin_hash = COALESCE(?, pin_hash),
        role = ?,
        society_id = COALESCE(?, society_id),
        status = 'ACTIVE'
       WHERE id = ?`,
      [user.name, user.password_hash || null, user.pin_hash || null, user.role, user.society_id || null, id]
    );
    return id;
  } else {
    await conn.query(
      `INSERT INTO users (id, name, mobile, email, password_hash, pin_hash, role, society_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`,
      [user.id, user.name, user.mobile, user.email, user.password_hash || null, user.pin_hash || null, user.role, user.society_id || null]
    );
    return user.id;
  }
}

async function upsertGate(conn: mysql.Connection, gate: any): Promise<string> {
  const [existing]: any = await conn.query(
    'SELECT id FROM gates WHERE (society_id = ? AND name = ?) OR id = ? LIMIT 1',
    [gate.society_id, gate.name, gate.id]
  );
  if (existing && existing.length > 0) {
    return existing[0].id;
  }
  await conn.query(
    `INSERT INTO gates (id, society_id, name, location, status) VALUES (?, ?, ?, ?, 'OPERATIONAL')`,
    [gate.id, gate.society_id, gate.name, gate.location]
  );
  return gate.id;
}

async function upsertGuard(conn: mysql.Connection, guard: any) {
  const [existing]: any = await conn.query(
    'SELECT id FROM guards WHERE user_id = ? LIMIT 1',
    [guard.user_id]
  );
  if (existing && existing.length > 0) {
    await conn.query(
      'UPDATE guards SET gate_id = ?, shift = ?, status = ? WHERE id = ?',
      [guard.gate_id, guard.shift, guard.status, existing[0].id]
    );
  } else {
    await conn.query(
      'INSERT INTO guards (id, user_id, gate_id, shift, status) VALUES (?, ?, ?, ?, ?)',
      [guard.id, guard.user_id, guard.gate_id, guard.shift, guard.status]
    );
  }
}

export async function seedSuperAdminAndPlans() {
  console.log('====================================================');
  console.log('   NexGate Super Admin & Plans Seed Tool            ');
  console.log('====================================================');
  console.log('Target Database:', process.env.MYSQL_DATABASE || 'DATABASE_URL');
  console.log('----------------------------------------------------');

  const conn = await getDbConnection();

  try {
    const adminPasswordHash = bcrypt.hashSync('admin123', 10);
    const superAdminPasswordHash = bcrypt.hashSync('superadmin123', 10);
    const guardPinHash = bcrypt.hashSync('1234', 10);

    // 1. Super Admin Account
    console.log('[1/4] Ensuring Super Admin account exists...');
    await upsertUser(conn, {
      id: 'superadmin_user',
      name: 'Super Administrator',
      mobile: '9999900000',
      email: 'superadmin@nexgate.co.in',
      password_hash: superAdminPasswordHash,
      role: 'SUPER_ADMIN',
      society_id: null,
    });
    console.log('  ✓ Super Admin: superadmin@nexgate.co.in (Password: superadmin123)');

    // 2. Standard Plan Society (1 Device: ₹1,999/mo)
    console.log('\n[2/4] Ensuring Standard (1 Device) society exists...');
    const rpSocietyId = await upsertSociety(conn, {
      id: 'soc_royalpalms',
      name: 'Royal Palms Estate',
      subdomain: 'royalpalms',
      address: 'Aarey Colony, Goregaon East',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400065',
      contact_email: 'sameer@royalpalms.in',
      contact_phone: '9988771122',
      upi_id: 'royalpalms@okhdfcbank',
      maintenance_amount: 2500.00,
      maintenance_due_day: 5,
      plan_name: 'STANDARD_1_DEVICE',
      max_devices: 1,
      plan_amount: 1999.00,
    });

    const rpGateId = await upsertGate(conn, {
      id: 'gate_rp_main',
      society_id: rpSocietyId,
      name: 'Main Gate',
      location: 'North Avenue Entrance',
    });

    const rpAdminId = await upsertUser(conn, {
      id: 'adm_royalpalms',
      name: 'Sameer Joshi',
      mobile: '9988771122',
      email: 'sameer@royalpalms.in',
      password_hash: adminPasswordHash,
      role: 'ADMIN',
      society_id: rpSocietyId,
    });

    const rpGuardUserId = await upsertUser(conn, {
      id: 'guard_rp_1',
      name: 'Ramesh Guard',
      mobile: '9811100001',
      email: 'guard.rp1@nexgate.co.in',
      pin_hash: guardPinHash,
      role: 'GUARD',
      society_id: rpSocietyId,
    });

    await upsertGuard(conn, {
      id: 'g_rp_1',
      user_id: rpGuardUserId,
      gate_id: rpGateId,
      shift: 'Day Shift (08:00 AM - 08:00 PM)',
      status: 'ON_DUTY',
    });

    console.log('  ✓ Standard Society: Royal Palms Estate (Subdomain: royalpalms, 1 Device, ₹1,999/mo)');
    console.log('    Admin: sameer@royalpalms.in / admin123 | Guard PIN: 1234');

    // 3. Premium Plan Society (2 Devices: ₹2,999/mo)
    console.log('\n[3/4] Ensuring Premium (2 Devices) society exists...');
    const gpSocietyId = await upsertSociety(conn, {
      id: 'soc_greenpalms',
      name: 'Green Palms Heights',
      subdomain: 'greenpalms',
      address: 'Baner Pashan Link Road',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411045',
      contact_email: 'admin@greenpalms.in',
      contact_phone: '9876500001',
      upi_id: 'greenpalms@okhdfcbank',
      maintenance_amount: 3500.00,
      maintenance_due_day: 5,
      plan_name: 'PREMIUM_2_DEVICE',
      max_devices: 2,
      plan_amount: 2999.00,
    });

    const gpGate1Id = await upsertGate(conn, {
      id: 'gate_gp_1',
      society_id: gpSocietyId,
      name: 'Main Gate',
      location: 'East Gate Barrier',
    });

    const gpGate2Id = await upsertGate(conn, {
      id: 'gate_gp_2',
      society_id: gpSocietyId,
      name: 'Tower B Gate',
      location: 'West Gate Barrier',
    });

    const gpAdminId = await upsertUser(conn, {
      id: 'adm_greenpalms',
      name: 'Anand Kulkarni',
      mobile: '9876500001',
      email: 'admin@greenpalms.in',
      password_hash: adminPasswordHash,
      role: 'ADMIN',
      society_id: gpSocietyId,
    });

    const gpGuard1Id = await upsertUser(conn, {
      id: 'guard_gp_1',
      name: 'Kailash Singh',
      mobile: '9822200001',
      email: 'guard.gp1@nexgate.co.in',
      pin_hash: guardPinHash,
      role: 'GUARD',
      society_id: gpSocietyId,
    });

    const gpGuard2Id = await upsertUser(conn, {
      id: 'guard_gp_2',
      name: 'Mohan Verma',
      mobile: '9822200002',
      email: 'guard.gp2@nexgate.co.in',
      pin_hash: guardPinHash,
      role: 'GUARD',
      society_id: gpSocietyId,
    });

    await upsertGuard(conn, {
      id: 'g_gp_1',
      user_id: gpGuard1Id,
      gate_id: gpGate1Id,
      shift: 'Morning Shift',
      status: 'ON_DUTY',
    });

    await upsertGuard(conn, {
      id: 'g_gp_2',
      user_id: gpGuard2Id,
      gate_id: gpGate2Id,
      shift: 'Night Shift',
      status: 'ON_DUTY',
    });

    console.log('  ✓ Premium Society: Green Palms Heights (Subdomain: greenpalms, 2 Devices, ₹2,999/mo)');
    console.log('    Admin: admin@greenpalms.in / admin123 | Guard PIN: 1234');

    // 4. Enterprise Plan Society (3 Devices: ₹3,999/mo)
    console.log('\n[4/4] Ensuring Enterprise (3 Devices) society exists...');
    const ecoSocietyId = await upsertSociety(conn, {
      id: 'soc_greengate',
      name: 'Eco Residency Co-operative Housing Society Ltd',
      subdomain: 'eco',
      address: 'Plot 42, Hiranandani Gardens, Powai',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400076',
      contact_email: 'contact@ecoresidency.in',
      contact_phone: '9999988888',
      upi_id: 'ecoresidency@hdfcbank',
      maintenance_amount: 4000.00,
      maintenance_due_day: 5,
      plan_name: 'ENTERPRISE_3_DEVICE',
      max_devices: 3,
      plan_amount: 3999.00,
    });

    const ecoGate1Id = await upsertGate(conn, {
      id: 'gate_eco_main',
      society_id: ecoSocietyId,
      name: 'North Main Gate',
      location: 'Main Boulevard',
    });

    const ecoGate2Id = await upsertGate(conn, {
      id: 'gate_eco_east',
      society_id: ecoSocietyId,
      name: 'East Resident FastLane',
      location: 'Tower B Entrance',
    });

    const ecoGate3Id = await upsertGate(conn, {
      id: 'gate_eco_service',
      society_id: ecoSocietyId,
      name: 'Service & Delivery Gate',
      location: 'Commercial Access',
    });

    const ecoAdminId = await upsertUser(conn, {
      id: 'admin_user',
      name: 'Eco Secretary',
      mobile: '9999988888',
      email: 'admin@nexgate.co.in',
      password_hash: adminPasswordHash,
      role: 'ADMIN',
      society_id: ecoSocietyId,
    });

    const ecoGuard1Id = await upsertUser(conn, {
      id: 'guard_eco_1',
      name: 'Ramesh Singh',
      mobile: '9800011122',
      email: 'guard.eco1@nexgate.co.in',
      pin_hash: guardPinHash,
      role: 'GUARD',
      society_id: ecoSocietyId,
    });

    const ecoGuard2Id = await upsertUser(conn, {
      id: 'guard_eco_2',
      name: 'Suresh Yadav',
      mobile: '9800011123',
      email: 'guard.eco2@nexgate.co.in',
      pin_hash: guardPinHash,
      role: 'GUARD',
      society_id: ecoSocietyId,
    });

    const ecoGuard3Id = await upsertUser(conn, {
      id: 'guard_eco_3',
      name: 'Prakash Patil',
      mobile: '9800011124',
      email: 'guard.eco3@nexgate.co.in',
      pin_hash: guardPinHash,
      role: 'GUARD',
      society_id: ecoSocietyId,
    });

    await upsertGuard(conn, {
      id: 'g_eco_1',
      user_id: ecoGuard1Id,
      gate_id: ecoGate1Id,
      shift: 'Morning Shift',
      status: 'ON_DUTY',
    });

    await upsertGuard(conn, {
      id: 'g_eco_2',
      user_id: ecoGuard2Id,
      gate_id: ecoGate2Id,
      shift: 'Day Shift',
      status: 'ON_DUTY',
    });

    await upsertGuard(conn, {
      id: 'g_eco_3',
      user_id: ecoGuard3Id,
      gate_id: ecoGate3Id,
      shift: 'Evening Shift',
      status: 'ON_DUTY',
    });

    console.log('  ✓ Enterprise Society: Eco Residency (Subdomain: eco, 3 Devices, ₹3,999/mo)');
    console.log('    Admin: admin@nexgate.co.in / admin123 | Guard PIN: 1234');

    console.log('\n====================================================');
    console.log('  SEEDING COMPLETED SUCCESSFULLY!                   ');
    console.log('====================================================\n');
  } catch (err: any) {
    console.error('Seeding failed:', err.message);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

if (require.main === module) {
  seedSuperAdminAndPlans().then(() => process.exit(0)).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
