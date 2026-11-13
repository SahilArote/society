import './setup.ts';
import test from 'node:test';
import assert from 'node:assert';
import { fetchAdminSettings, updateAdminSettings } from '../src/services/api.ts';
import { mockStorage } from './setup.ts';

test('Admin Settings Suite - Persistence & Live Events', async (t) => {
  await t.test('fetchAdminSettings returns default society data on fresh startup', async () => {
    mockStorage.clear();
    const settings = await fetchAdminSettings();
    assert.ok(settings.name);
    assert.ok(settings.city);
    assert.strictEqual(typeof settings.totalFlats, 'number');
  });

  await t.test('updateAdminSettings saves data to localStorage and dispatches sync event', async () => {
    mockStorage.clear();

    let eventFired = false;
    let eventPayload: any = null;

    const listener = (evt: any) => {
      eventFired = true;
      eventPayload = evt.detail;
    };

    window.addEventListener('nexgate_society_updated', listener);

    const updated = await updateAdminSettings({
      name: 'NexGate Elite Towers CHS Ltd',
      city: 'Pune, MH',
      totalFlats: 160,
    });

    assert.strictEqual(updated.name, 'NexGate Elite Towers CHS Ltd');
    assert.strictEqual(updated.city, 'Pune, MH');
    assert.strictEqual(updated.totalFlats, 160);

    const stored = JSON.parse(mockStorage.getItem('gg_admin_society_settings') || '{}');
    assert.strictEqual(stored.name, 'NexGate Elite Towers CHS Ltd');
    assert.strictEqual(stored.city, 'Pune, MH');

    assert.strictEqual(eventFired, true);
    assert.strictEqual(eventPayload?.name, 'NexGate Elite Towers CHS Ltd');

    window.removeEventListener('nexgate_society_updated', listener);
  });
});

