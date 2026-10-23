const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const express = require('express');
const app = require('../app');
const requestLogger = require('../middleware/requestLogger');
const errorHandler = require('../middleware/errorHandler');

const root = path.join(__dirname, '..');

async function start(application) {
  const server = await new Promise((resolve) => {
    const running = application.listen(0, '127.0.0.1', () => resolve(running));
  });
  return {
    server,
    base: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolve, reject) => {
      server.close((err) => err ? reject(err) : resolve());
      server.closeAllConnections();
    })
  };
}

test('Mine App HTTP integration tests', async (t) => {
  const originalSeed = await fs.readFile(path.join(root, 'data/items.json'), 'utf8');
  const seed = JSON.parse(originalSeed);
  const running = await start(app);
  t.after(() => running.close());

  async function request(route, method = 'GET', body) {
    const options = { method };
    if (body !== undefined) {
      options.headers = { 'Content-Type': 'application/json' };
      options.body = JSON.stringify(body);
    }
    const response = await fetch(running.base + route, options);
    const text = await response.text();
    return {
      status: response.status,
      headers: response.headers,
      text,
      body: text && response.headers.get('content-type')?.includes('application/json')
        ? JSON.parse(text) : null
    };
  }

  await t.test('homepage, CSS and image are served from public', async () => {
    const home = await request('/');
    assert.equal(home.status, 200);
    assert.match(home.text.replace(/<[^>]*>/g, ''), /Welcome to the Mine App/);
    const css = await request('/style.css');
    assert.equal(css.status, 200);
    assert.match(css.headers.get('content-type'), /text\/css/);
    const image = await request('/images/items.svg');
    assert.equal(image.status, 200);
    assert.match(image.headers.get('content-type'), /image\/svg\+xml/);
    assert.match(image.text, /<svg/);
  });

  await t.test('GET all returns the five typed seed items and a count', async () => {
    const response = await request('/api/items');
    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.count, seed.length);
    assert.deepEqual(response.body.data, seed);
  });

  await t.test('GET one returns the requested item', async () => {
    const response = await request('/api/items/2');
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { success: true, data: seed[1] });
  });

  let created;
  await t.test('POST generates a unique numeric ID and returns 201', async () => {
    const response = await request('/api/items', 'POST', {
      name: 'Headphones', category: 'Electronics', price: 59.99
    });
    assert.equal(response.status, 201);
    created = response.body.data;
    assert.equal(response.body.success, true);
    assert.equal(typeof created.id, 'number');
    assert.ok(!seed.some((item) => item.id === created.id));
    assert.equal(created.name, 'Headphones');
    assert.equal((await request('/api/items')).body.count, seed.length + 1);
  });

  await t.test('PATCH changes only supplied fields and accepts zero price', async () => {
    const response = await request(`/api/items/${created.id}`, 'PATCH', { price: 0 });
    assert.equal(response.status, 200);
    assert.deepEqual(response.body.data, { ...created, price: 0 });
  });

  await t.test('invalid PATCH is atomic and cannot overwrite an ID', async () => {
    const route = `/api/items/${created.id}`;
    const invalid = await request(route, 'PATCH', { name: 'Changed', price: 'bad' });
    assert.equal(invalid.status, 400);
    assert.deepEqual((await request(route)).body.data, { ...created, price: 0 });
    assert.equal((await request(route, 'PATCH', { id: 1 })).status, 400);
    assert.equal((await request(route, 'PATCH', {})).status, 400);
    assert.equal((await request(route, 'PATCH', { category: null })).status, 400);
  });

  await t.test('POST rejects missing fields, invalid types and invalid prices', async () => {
    const invalidBodies = [
      {}, null, [], { name: 'Item', category: 'Test' },
      { name: 42, category: 'Test', price: 1 },
      { name: '  ', category: 'Test', price: 1 },
      { name: 'Item', category: 'Test', price: '12.50' },
      { name: 'Item', category: 'Test', price: -1 }
    ];
    for (const body of invalidBodies) {
      const response = await request('/api/items', 'POST', body);
      assert.equal(response.status, 400);
      assert.equal(response.body.success, false);
    }
    assert.equal((await request('/api/items', 'POST')).status, 400);
  });

  await t.test('DELETE returns 204 with no body and removes the item', async () => {
    const route = `/api/items/${created.id}`;
    const response = await request(route, 'DELETE');
    assert.equal(response.status, 204);
    assert.equal(response.text, '');
    assert.equal((await request(route)).status, 404);
    assert.equal((await request('/api/items')).body.count, seed.length);
  });

  await t.test('generated IDs are not reused after deletion', async () => {
    const response = await request('/api/items', 'POST', {
      name: 'Cable', category: 'Electronics', price: 5
    });
    assert.equal(response.status, 201);
    assert.ok(response.body.data.id > created.id);
    assert.equal((await request(`/api/items/${response.body.data.id}`, 'DELETE')).status, 204);
  });

  await t.test('missing items and invalid routes return JSON 404 responses', async () => {
    for (const method of ['GET', 'PATCH', 'DELETE']) {
      const response = await request('/api/items/999999', method);
      assert.equal(response.status, 404);
      assert.equal(response.body.success, false);
      assert.match(response.body.message, /not found/);
    }
    const invalidRoute = await request('/api/does-not-exist');
    assert.equal(invalidRoute.status, 404);
    assert.deepEqual(invalidRoute.body, {
      success: false, message: 'Route not found: GET /api/does-not-exist'
    });
  });

  await t.test('malformed JSON is logged and handled globally with status 400', async () => {
    const marker = `malformed-${Date.now()}`;
    const response = await fetch(running.base + '/api/items?check=' + marker, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"name":'
    });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      success: false, message: 'Invalid JSON in request body'
    });
    const requestLog = await fs.readFile(path.join(root, 'logs/requests.txt'), 'utf8');
    const errorLog = await fs.readFile(path.join(root, 'logs/error.txt'), 'utf8');
    assert.ok(requestLog.includes('POST /api/items?check=' + marker));
    assert.ok(errorLog.includes('POST /api/items?check=' + marker));
    assert.match(requestLog, /\d{4}-\d{2}-\d{2}T.* GET \/api\/items/);
  });

  await t.test('unexpected errors are logged and return a safe JSON 500 response', async () => {
    // Exercise the real middleware without adding a failure route to the app.
    const faultApp = express();
    faultApp.use(requestLogger);
    faultApp.get('/test-error', () => {
      throw new Error('Integration test simulated failure');
    });
    faultApp.use(errorHandler);
    const faultServer = await start(faultApp);
    try {
      const response = await fetch(faultServer.base + '/test-error');
      assert.equal(response.status, 500);
      assert.deepEqual(await response.json(), {
        success: false, message: 'Internal Server Error'
      });
      const errorLog = await fs.readFile(path.join(root, 'logs/error.txt'), 'utf8');
      assert.ok(errorLog.includes('Integration test simulated failure'));
    } finally {
      await faultServer.close();
    }
  });

  await t.test('CRUD leaves the seed JSON unchanged on disk', async () => {
    assert.equal(await fs.readFile(path.join(root, 'data/items.json'), 'utf8'), originalSeed);
    assert.deepEqual((await request('/api/items')).body.data, seed);
  });
});
