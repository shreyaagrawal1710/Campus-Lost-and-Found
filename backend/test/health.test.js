import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

test('GET /api/health returns the success envelope without database access', async (t) => {
  const app = createApp();
  const server = app.listen(0);
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/api/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true, data: { status: 'ok' } });
});

test('unknown API routes return the standard error envelope', async (t) => {
  const server = createApp().listen(0);
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/not-a-route`);
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { success: false, message: 'Route not found.' });
});

test('private API routes require bearer authentication', async (t) => {
  const server = createApp().listen(0);
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/categories`);
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { success: false, message: 'Authentication required.' });
});
