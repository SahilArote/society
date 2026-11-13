import './setup.ts';
import test from 'node:test';
import assert from 'node:assert';
import {
  getAdminToken,
  setAdminSession,
  clearAdminSession,
  adminLogin,
  getSecurePhotoUrl
} from '../src/services/api.ts';
import { mockStorage } from './setup.ts';

test('Admin Auth Suite - Session Storage & Token Handling', async (t) => {
  await t.test('setAdminSession properly sets token, user, and auth flag', () => {
    mockStorage.clear();
    const token = 'test_token_12345';
    const user = { id: 'admin_1', email: 'admin@nexgate.co.in', name: 'NexGate Admin', role: 'ADMIN' };

    setAdminSession(token, user);

    assert.strictEqual(getAdminToken(), token);
    assert.strictEqual(mockStorage.getItem('gg_admin_auth'), 'true');
    const storedUser = JSON.parse(mockStorage.getItem('gg_admin_user') || '{}');
    assert.strictEqual(storedUser.email, 'admin@nexgate.co.in');
    assert.strictEqual(storedUser.name, 'NexGate Admin');
  });

  await t.test('clearAdminSession wipes all admin keys cleanly', () => {
    setAdminSession('tok_to_clear', { id: 'u' });
    clearAdminSession();

    assert.strictEqual(getAdminToken(), null);
    assert.strictEqual(mockStorage.getItem('gg_admin_auth'), null);
    assert.strictEqual(mockStorage.getItem('gg_admin_user'), null);
  });
});

test('Admin Auth Suite - Login & Credential Verification', async (t) => {
  mockStorage.clear();

  await t.test('adminLogin succeeds with fallback admin credentials', async () => {
    const res = await adminLogin('admin@nexgate.co.in', 'admin123');
    assert.strictEqual(res.success, true);
    assert.ok(res.token.startsWith('backup_admin_token_'));
    assert.strictEqual(res.admin.email, 'admin@nexgate.co.in');
    assert.strictEqual(mockStorage.getItem('gg_admin_auth'), 'true');
  });

  await t.test('adminLogin rejects incorrect credentials with clear error', async () => {
    await assert.rejects(
      async () => {
        await adminLogin('wrong@user.com', 'wrongpassword');
      },
      {
        name: 'Error',
        message: /Invalid admin credentials/,
      }
    );
  });
});

test('Admin Security - Photo URL Token Attachment', async (t) => {
  await t.test('Returns undefined when photoPath is empty', () => {
    assert.strictEqual(getSecurePhotoUrl(undefined), undefined);
    assert.strictEqual(getSecurePhotoUrl(''), undefined);
  });

  await t.test('Passes through absolute external URLs unmodified', () => {
    const external = 'https://images.unsplash.com/photo-sample';
    assert.strictEqual(getSecurePhotoUrl(external), external);
  });

  await t.test('Appends auth token to relative backend photo paths', () => {
    setAdminSession('auth_token_xyz', { id: 'adm' });
    const result = getSecurePhotoUrl('/uploads/visitor_401.jpg');
    assert.ok(result?.includes('/uploads/visitor_401.jpg?token=auth_token_xyz'));
  });
});

