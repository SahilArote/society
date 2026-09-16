import { getMysqlPool } from './mysql';

export async function seedAdminData() {
  const pool = await getMysqlPool();
  if (!pool) {
    console.error('MySQL Pool unavailable');
    return;
  }

  console.log('[SEED_ADMIN] Starting database enhancement for Admin Dashboard...');

  // 1. Upgrade visitor_requests table
  try {
    await pool.query(`
      ALTER TABLE visitor_requests 
      MODIFY COLUMN status VARCHAR(32) NOT NULL DEFAULT 'PENDING'
    `);
    console.log('[SEED_ADMIN] Updated visitor_requests.status to VARCHAR(32)');
  } catch (err: any) {
    console.warn('[SEED_ADMIN] Note on status column modify:', err.message);
  }

  try {
    await pool.query(`
      ALTER TABLE visitor_requests 
      ADD COLUMN entry_time DATETIME NULL DEFAULT NULL,
      ADD COLUMN exit_time DATETIME NULL DEFAULT NULL
    `);
    console.log('[SEED_ADMIN] Added entry_time and exit_time to visitor_requests');
  } catch (err: any) {
    if (!err.message?.includes('Duplicate column')) {
      console.warn('[SEED_ADMIN] Note on entry/exit columns:', err.message);
    }
  }

  const societyId = 'soc_greengate';

  // 2. Ensure Gates
  const gates = [
    { id: 'gate_main', name: 'Main Gate', location: 'Main Entrance Barrier 1', status: 'OPERATIONAL' },
    { id: 'gate_east', name: 'East Gate', location: 'Tower B & C Entrance Barrier 2', status: 'OPERATIONAL' },
    { id: 'gate_service', name: 'Service Gate', location: 'Vendor & Delivery Barrier 3', status: 'OPERATIONAL' },
  ];

  for (const g of gates) {
    await pool.query(`
      INSERT INTO gates (id, society_id, name, location, status)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE name = VALUES(name), location = VALUES(location)
    `, [g.id, societyId, g.name, g.location, g.status]);
  }
  console.log('[SEED_ADMIN] Gates verified (Main Gate, East Gate, Service Gate)');

  // 3. Ensure Guards
  const guards = [
    {
      userId: 'guard_ramesh',
      name: 'Ramesh Singh',
      mobile: '9800011122',
      gateId: 'gate_main',
      shift: 'Morning Shift (06:00 AM - 02:00 PM)',
      status: 'ON_DUTY',
    },
    {
      userId: 'guard_suresh',
      name: 'Suresh Patil',
      mobile: '9800011123',
      gateId: 'gate_east',
      shift: 'Evening Shift (02:00 PM - 10:00 PM)',
      status: 'ON_DUTY',
    },
    {
      userId: 'guard_vikram',
      name: 'Vikram Rathod',
      mobile: '9800011124',
      gateId: 'gate_service',
      shift: 'Night Shift (10:00 PM - 06:00 AM)',
      status: 'ON_DUTY',
    },
  ];

  for (const g of guards) {
    // Upsert into users
    await pool.query(`
      INSERT INTO users (id, name, mobile, role, society_id, status)
      VALUES (?, ?, ?, 'GUARD', ?, 'ACTIVE')
      ON DUPLICATE KEY UPDATE name = VALUES(name), mobile = VALUES(mobile)
    `, [g.userId, g.name, g.mobile, societyId]);

    // Upsert into guards
    const guardRecId = `grd_${g.userId.replace('guard_', '')}`;
    await pool.query(`
      INSERT INTO guards (id, user_id, gate_id, shift, status)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE gate_id = VALUES(gate_id), shift = VALUES(shift), status = VALUES(status)
    `, [guardRecId, g.userId, g.gateId, g.shift, g.status]);
  }
  console.log('[SEED_ADMIN] Guards verified (Ramesh, Suresh, Vikram)');

  // 4. Seed a few realistic visitor logs across the last 3 days if less than 10 exist
  const [vCountRows]: any = await pool.query('SELECT COUNT(*) as cnt FROM visitor_requests WHERE society_id = ?', [societyId]);
  const currentCount = vCountRows[0]?.cnt || 0;

  if (currentCount < 10) {
    console.log(`[SEED_ADMIN] Seeding realistic visitor requests (current: ${currentCount})...`);
    
    // Fetch resident and flats to associate
    const [flatRows]: any = await pool.query('SELECT id, flat_number, resident_id FROM flats WHERE society_id = ? LIMIT 10', [societyId]);
    const [adminUser]: any = await pool.query("SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1");
    const residentId = flatRows[0]?.resident_id || adminUser[0]?.id || 'admin_user';

    const sampleVisitors = [
      { name: 'Sunil Verma', mobile: '9820199201', purpose: 'Guest / Family', type: 'guest', vehicle: 'MH 12 AQ 4455', status: 'INSIDE', flatIdx: 0, gateIdx: 0, hoursAgo: 2 },
      { name: 'Amazon Delivery (Kishore)', mobile: '9819922331', purpose: 'Parcel Delivery', type: 'delivery', vehicle: 'MH 14 BN 1204', status: 'EXITED', flatIdx: 1, gateIdx: 2, hoursAgo: 4 },
      { name: 'Zomato Food Delivery', mobile: '9876541234', purpose: 'Food Delivery', type: 'delivery', vehicle: 'MH 12 CK 8899', status: 'APPROVED', flatIdx: 2, gateIdx: 0, hoursAgo: 1 },
      { name: 'Urban Company AC Repair', mobile: '9833445566', purpose: 'AC Maintenance', type: 'maintenance', vehicle: 'MH 12 ET 3321', status: 'INSIDE', flatIdx: 3, gateIdx: 0, hoursAgo: 3 },
      { name: 'Ola Cab (Dinesh)', mobile: '9890123456', purpose: 'Cab Pickup', type: 'cab', vehicle: 'MH 12 DF 5544', status: 'EXITED', flatIdx: 0, gateIdx: 0, hoursAgo: 6 },
      { name: 'Dr. Anand Mehta', mobile: '9822334455', purpose: 'Guest Visit', type: 'guest', vehicle: 'MH 14 ER 9012', status: 'APPROVED', flatIdx: 4, gateIdx: 1, hoursAgo: 5 },
      { name: 'BigBasket Grocery', mobile: '9844556677', purpose: 'Grocery Delivery', type: 'delivery', vehicle: 'MH 12 GB 7788', status: 'PENDING', flatIdx: 1, gateIdx: 2, hoursAgo: 0.5 },
      { name: 'Pest Control Technician', mobile: '9811223344', purpose: 'Pest Control', type: 'maintenance', vehicle: 'MH 12 GH 9900', status: 'EXITED', flatIdx: 5, gateIdx: 0, hoursAgo: 12 },
      { name: 'Unknown Sales Agent', mobile: '9800000000', purpose: 'Cold Marketing', type: 'other', vehicle: 'None', status: 'REJECTED', flatIdx: 0, gateIdx: 0, hoursAgo: 8 },
      { name: 'Courier Express (DTDC)', mobile: '9823456789', purpose: 'Document Delivery', type: 'delivery', vehicle: 'MH 12 XY 1122', status: 'EXITED', flatIdx: 2, gateIdx: 0, hoursAgo: 24 },
    ];

    for (let i = 0; i < sampleVisitors.length; i++) {
      const sv = sampleVisitors[i];
      const visId = `vis_seed_${Date.now()}_${i}`;
      const reqId = `req_seed_${Date.now()}_${i}`;
      const targetFlat = flatRows[sv.flatIdx % flatRows.length];
      const gate = gates[sv.gateIdx % gates.length];
      const guard = guards[sv.gateIdx % guards.length];
      const reqTime = new Date(Date.now() - sv.hoursAgo * 3600 * 1000);
      const entryTime = (sv.status === 'INSIDE' || sv.status === 'EXITED') ? new Date(reqTime.getTime() + 5 * 60 * 1000) : null;
      const exitTime = sv.status === 'EXITED' ? new Date(reqTime.getTime() + 45 * 60 * 1000) : null;

      await pool.query(`
        INSERT INTO visitors (id, name, mobile, purpose, visitor_type, vehicle_number)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [visId, sv.name, sv.mobile, sv.purpose, sv.type, sv.vehicle]);

      await pool.query(`
        INSERT INTO visitor_requests 
        (id, society_id, visitor_id, resident_id, flat_id, guard_id, gate_id, status, requested_at, responded_at, response_by, entry_time, exit_time)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        reqId, societyId, visId, residentId, targetFlat.id, guard.userId, gate.id,
        sv.status, reqTime, reqTime, 'Resident Approval', entryTime, exitTime
      ]);
    }
    console.log('[SEED_ADMIN] Seeded 10 realistic visitor records.');
  }

  console.log('[SEED_ADMIN] Completed successfully.');
}

if (require.main === module) {
  seedAdminData().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
  });
}
