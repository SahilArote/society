import './setup.ts';
import test from 'node:test';
import assert from 'node:assert';
import { mockFlats, mockVisitors, mockGuards, mockSociety } from '../src/data/mockData.ts';

test('Data Model Integrity - Flats, Visitors, Guards & Society', async (t) => {
  await t.test('mockSociety has all required fields', () => {
    assert.ok(mockSociety.name);
    assert.ok(mockSociety.address);
    assert.ok(mockSociety.city);
    assert.strictEqual(typeof mockSociety.totalFlats, 'number');
    assert.ok(mockSociety.totalFlats > 0);
  });

  await t.test('mockFlats have valid flat numbers and wings', () => {
    assert.ok(mockFlats.length > 0);
    for (const flat of mockFlats) {
      assert.ok(flat.id, 'Flat must have an id');
      assert.ok(flat.number, 'Flat must have a number');
      assert.ok(flat.wing, 'Flat must have a wing');
      assert.ok(['occupied', 'vacant'].includes(flat.status), 'Flat status must be occupied or vacant');
    }
  });

  await t.test('mockVisitors have proper statuses and purpose', () => {
    assert.ok(mockVisitors.length > 0);
    for (const v of mockVisitors) {
      assert.ok(v.id);
      assert.ok(v.name);
      assert.ok(['guest', 'delivery', 'maintenance', 'cab', 'other'].includes(v.purpose));
      assert.ok(['pending', 'inside', 'exited', 'approved', 'denied'].includes(v.status));
    }
  });

  await t.test('mockGuards have valid shifts and gate assignments', () => {
    assert.ok(mockGuards.length > 0);
    for (const g of mockGuards) {
      assert.ok(g.id);
      assert.ok(g.name);
      assert.ok(['morning', 'evening', 'night'].includes(g.shift));
      assert.ok(['on_duty', 'off_duty', 'on_leave'].includes(g.status));
    }
  });
});

