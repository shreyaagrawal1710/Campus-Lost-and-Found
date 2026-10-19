import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { getPool, closePool } from '../src/config/db.js';

const enabled = process.env.RUN_DB_TESTS === '1';

test('MySQL API integration: auth, roles, filters, claims, approval concurrency and return', { skip: !enabled }, async (t) => {
  assert.ok(process.env.JWT_SECRET?.length >= 32, 'JWT_SECRET must have at least 32 characters');
  const pool = getPool();
  const [versionRows] = await pool.query('SELECT VERSION() AS version');
  assert.match(versionRows[0].version, /^8\./, 'MySQL 8 is required');
  const suffix = randomUUID().replaceAll('-', '');
  const emails = [`reporter-${suffix}@test.invalid`, `claimant-${suffix}@test.invalid`, `admin-${suffix}@test.invalid`];
  const itemIds = [];
  const server = createApp().listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  let userIds = [];
  let categoryId;
  let locationId;

  async function request(path, { method = 'GET', token, body } = {}) {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: response.status, json: await response.json() };
  }

  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    if (userIds.length) {
      const marks = userIds.map(() => '?').join(',');
      if (itemIds.length) {
        const itemMarks = itemIds.map(() => '?').join(',');
        await pool.execute(`DELETE FROM ITEM_STATUS_HISTORY WHERE item_id IN (${itemMarks})`, itemIds);
        await pool.execute(`DELETE FROM CLAIMS WHERE item_id IN (${itemMarks})`, itemIds);
        await pool.execute(`DELETE FROM ITEMS WHERE item_id IN (${itemMarks})`, itemIds);
      }
      await pool.execute(`DELETE FROM USERS WHERE user_id IN (${marks})`, userIds);
    }
    await closePool();
  });

  const [categories] = await pool.execute('SELECT category_id FROM ITEM_CATEGORIES ORDER BY category_id LIMIT 1');
  const [locations] = await pool.execute('SELECT location_id FROM LOCATIONS ORDER BY location_id LIMIT 1');
  assert.ok(categories.length && locations.length, 'Import database/seed.sql before DB tests');
  categoryId = categories[0].category_id;
  locationId = locations[0].location_id;

  const password = `Testing-${suffix}-123`;
  const registerA = await request('/auth/register', { method: 'POST', body: { name: 'Test Reporter', email: emails[0], password, role: 'ADMIN' } });
  assert.equal(registerA.status, 201);
  assert.equal(registerA.json.data.user.role, 'STUDENT');
  const rejectedLogin = await request('/auth/login', { method: 'POST', body: { email: emails[0], password: `${password}-wrong` } });
  assert.equal(rejectedLogin.status, 401);
  assert.deepEqual(rejectedLogin.json, { success: false, message: 'Email or password is incorrect.' });
  const reporterLogin = await request('/auth/login', { method: 'POST', body: { email: emails[0], password } });
  assert.equal(reporterLogin.status, 200);
  const reporterToken = reporterLogin.json.data.token;
  userIds.push(reporterLogin.json.data.user.id);

  const registerB = await request('/auth/register', { method: 'POST', body: { name: 'Test Claimant', email: emails[1], password } });
  assert.equal(registerB.status, 201);
  const claimantLogin = await request('/auth/login', { method: 'POST', body: { email: emails[1], password } });
  assert.equal(claimantLogin.status, 200);
  const claimantToken = claimantLogin.json.data.token;
  userIds.push(claimantLogin.json.data.user.id);

  const adminHash = await bcrypt.hash(password, 4);
  const [adminResult] = await pool.execute("INSERT INTO USERS (name,email,password_hash,role) VALUES (?,? ,?,'ADMIN')", ['Test Admin', emails[2], adminHash]);
  userIds.push(adminResult.insertId);
  const adminLogin = await request('/auth/login', { method: 'POST', body: { email: emails[2], password } });
  assert.equal(adminLogin.status, 200);
  const adminToken = adminLogin.json.data.token;

  const [roleRow] = await pool.execute('SELECT role FROM USERS WHERE user_id = ?', [reporterLogin.json.data.user.id]);
  assert.equal(roleRow[0].role, 'STUDENT');
  assert.equal((await request('/admin/stats', { token: reporterToken })).status, 403);
  assert.equal((await request('/categories')).status, 401);

  const itemResponse = await request('/items', { method: 'POST', token: reporterToken, body: {
    item_name: `Test Wallet ${suffix}`, report_type: 'FOUND', description: 'Blue wallet with a plain exterior',
    item_date: '2026-10-19', category_id: categoryId, location_id: locationId,
  } });
  assert.equal(itemResponse.status, 201);
  const itemId = itemResponse.json.data.item_id;
  itemIds.push(itemId);
  assert.equal(itemResponse.json.data.status, 'OPEN');
  assert.equal(Object.hasOwn(itemResponse.json.data, 'private_description'), false);
  assert.equal((await request(`/items?report_type=FOUND&status=OPEN&q=${encodeURIComponent('Test Wallet')}`, { token: reporterToken })).json.data.some((row) => row.item_id === itemId), true);
  assert.equal((await request(`/items/${itemId}/claims`, { method: 'POST', token: reporterToken, body: { private_description: 'I know the private identifying detail' } })).status, 403);

  const claimBody = { private_description: 'I know the private identifying detail for this wallet.' };
  const firstClaim = await request(`/items/${itemId}/claims`, { method: 'POST', token: claimantToken, body: claimBody });
  const secondClaim = await request(`/items/${itemId}/claims`, { method: 'POST', token: claimantToken, body: claimBody });
  assert.equal(firstClaim.status, 201);
  assert.equal(secondClaim.status, 201, 'duplicate pending claims by one student are allowed');
  const myClaims = await request('/my/claims', { token: claimantToken });
  assert.equal(myClaims.json.data.length, 2);
  assert.equal(Object.hasOwn(myClaims.json.data[0], 'private_description'), false);
  const adminClaims = await request('/admin/claims?status=PENDING', { token: adminToken });
  assert.equal(adminClaims.status, 200);
  const targetClaims = adminClaims.json.data.filter((claim) => claim.item_id === itemId);
  assert.equal(targetClaims.length, 2);
  assert.equal(targetClaims[0].private_description, claimBody.private_description);

  const approvals = await Promise.all(targetClaims.map((claim) => request(`/admin/claims/${claim.claim_id}`, {
    method: 'PATCH', token: adminToken, body: { status: 'APPROVED', remarks: '' },
  })));
  assert.equal(approvals.filter((result) => result.status === 200).length, 1);
  assert.equal(approvals.filter((result) => result.status === 409).length, 1);
  const [claimRows] = await pool.execute('SELECT status, admin_remarks FROM CLAIMS WHERE item_id = ?', [itemId]);
  assert.equal(claimRows.filter((claim) => claim.status === 'APPROVED').length, 1);
  assert.equal(claimRows.filter((claim) => claim.status === 'REJECTED').length, 1);
  assert.match(claimRows.find((claim) => claim.status === 'REJECTED').admin_remarks, /another claim.*approved/i);

  const details = await request(`/items/${itemId}`, { token: reporterToken });
  assert.equal(details.json.data.status, 'CLAIM_PENDING');
  const winner = (await pool.execute('SELECT claim_id FROM CLAIMS WHERE item_id = ? AND status = \'APPROVED\'', [itemId]))[0][0];
  const returnResponse = await request(`/admin/items/${itemId}/return`, { method: 'POST', token: adminToken, body: { remarks: 'Handover complete' } });
  assert.equal(returnResponse.status, 200);
  assert.equal((await request(`/admin/items/${itemId}/return`, { method: 'POST', token: adminToken, body: { remarks: '' } })).status, 409);
  const [returned] = await pool.execute('SELECT status FROM ITEMS WHERE item_id = ?', [itemId]);
  const [approvedAfterReturn] = await pool.execute('SELECT status FROM CLAIMS WHERE claim_id = ?', [winner.claim_id]);
  assert.equal(returned[0].status, 'RETURNED');
  assert.equal(approvedAfterReturn[0].status, 'APPROVED');
  const [history] = await pool.execute('SELECT old_status, new_status, changed_by FROM ITEM_STATUS_HISTORY WHERE item_id = ? ORDER BY history_id', [itemId]);
  assert.deepEqual(history.map(({ old_status, new_status }) => [old_status, new_status]), [['OPEN', 'CLAIM_PENDING'], ['CLAIM_PENDING', 'RETURNED']]);
  assert.ok(history.every((entry) => entry.changed_by === adminResult.insertId));

  const rejectItem = await request('/items', { method: 'POST', token: reporterToken, body: {
    item_name: `Rejection Test ${suffix}`, report_type: 'FOUND', description: 'Another found item for rejection testing',
    item_date: '2026-10-19', category_id: categoryId, location_id: locationId,
  } });
  assert.equal(rejectItem.status, 201);
  itemIds.push(rejectItem.json.data.item_id);
  assert.equal((await request(`/items/${rejectItem.json.data.item_id}/claims`, { method: 'POST', token: claimantToken, body: claimBody })).status, 201);
  const [pendingReject] = await pool.execute('SELECT claim_id FROM CLAIMS WHERE item_id = ?', [rejectItem.json.data.item_id]);
  assert.equal((await request(`/admin/claims/${pendingReject[0].claim_id}`, { method: 'PATCH', token: adminToken, body: { status: 'REJECTED', remarks: 'Not enough matching details' } })).status, 200);
  const [stillOpen] = await pool.execute('SELECT status FROM ITEMS WHERE item_id = ?', [rejectItem.json.data.item_id]);
  assert.equal(stillOpen[0].status, 'OPEN');
  assert.ok(jwt.verify(adminToken, process.env.JWT_SECRET).sub);
});
