const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { spawn, execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { ObjectId } = require('mongodb');
const { MongoMemoryServer } = require('mongodb-memory-server-core');
const binary = require('../config/localMongo');
const app = require('../app');
const { connectDatabase, getItemsCollection, closeDatabase } = require('../config/database');
const seedCollection = require('../data/seedCollection');
const seedItems = require('../data/seedItems');

const root = path.join(__dirname, '..');
const execFileAsync = promisify(execFile);

async function startHttp() {
  const server = await new Promise((resolve) => {
    const running = app.listen(0, '127.0.0.1', () => resolve(running));
  });
  return {
    base: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolve, reject) => {
      server.close((err) => err ? reject(err) : resolve());
      server.closeAllConnections();
    })
  };
}

async function startSeparateApp(uri, dbName) {
  const child = spawn(process.execPath, [path.join(root, 'server.js')], {
    cwd: root, windowsHide: true,
    env: { ...process.env, MONGODB_URI: uri, MONGODB_DB: dbName, PORT: '0' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  const address = await new Promise((resolve, reject) => {
    let output = '';
    const timeout = setTimeout(() => { child.kill(); reject(new Error('Server did not start')); }, 15000);
    child.stdout.on('data', (chunk) => {
      output += chunk;
      const match = output.match(/http:\/\/localhost:(\d+)/);
      if (match) { clearTimeout(timeout); resolve('http://127.0.0.1:' + match[1]); }
    });
    child.once('error', (error) => { clearTimeout(timeout); reject(error); });
    child.once('exit', (code) => {
      clearTimeout(timeout);
      reject(new Error('Server exited before startup, code ' + code));
    });
  });
  return {
    address,
    close: () => new Promise((resolve) => {
      if (child.exitCode !== null) return resolve();
      child.once('exit', resolve);
      child.kill();
    })
  };
}

test('Mine App MongoDB integration tests', { timeout: 180000 }, async (t) => {
  // An actual mongod process with a disposable database; never the user's .env database.
  const mongodb = await MongoMemoryServer.create({
    binary, instance: { storageEngine: 'wiredTiger' }, spawn: { windowsHide: true }
  });
  let http;
  t.after(async () => {
    if (http) await http.close();
    await closeDatabase();
    await mongodb.stop();
  });
  const uri = mongodb.getUri();
  const dbName = 'mine_app_test_' + process.pid;
  await connectDatabase({ uri, dbName });
  assert.equal(await seedCollection(getItemsCollection()), 5);
  http = await startHttp();

  async function request(route, method = 'GET', body) {
    const options = { method };
    if (body !== undefined) {
      options.headers = { 'Content-Type': 'application/json' };
      options.body = JSON.stringify(body);
    }
    const response = await fetch(http.base + route, options);
    const text = await response.text();
    return {
      status: response.status, headers: response.headers, text,
      body: text && response.headers.get('content-type')?.includes('application/json')
        ? JSON.parse(text) : null
    };
  }

  await t.test('homepage and static assets are served', async () => {
    const home = await request('/');
    assert.equal(home.status, 200);
    assert.match(home.text.replace(/<[^>]*>/g, ''), /Welcome to the Mine App/);
    assert.match(home.text, /Items stored in MongoDB/);
    assert.equal((await request('/style.css')).status, 200);
    const image = await request('/images/items.svg');
    assert.equal(image.status, 200);
    assert.match(image.headers.get('content-type'), /image\/svg\+xml/);
  });

  let firstId;
  await t.test('GET all retrieves five MongoDB documents with ObjectIds', async () => {
    const response = await request('/api/items');
    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.count, 5);
    assert.deepEqual(response.body.data.map(({ _id, ...item }) => item), seedItems);
    for (const document of response.body.data) {
      assert.match(document._id, /^[0-9a-f]{24}$/);
      assert.ok(!Object.hasOwn(document, 'id'));
    }
    firstId = response.body.data[0]._id;
  });

  await t.test('seed command does not duplicate or reset existing documents', async () => {
    assert.equal(await seedCollection(getItemsCollection()), 0);
    assert.equal(await getItemsCollection().countDocuments({}), 5);
  });

  await t.test('GET one converts the URL ID to an ObjectId', async () => {
    const response = await request('/api/items/' + firstId);
    assert.equal(response.status, 200);
    assert.equal(response.body.data._id, firstId);
    assert.equal(response.body.data.name, seedItems[0].name);
  });

  let created;
  await t.test('POST returns 201 and inserts a MongoDB document with generated _id', async () => {
    const response = await request('/api/items', 'POST', {
      name: 'Headphones', category: 'Electronics', price: 59.99
    });
    assert.equal(response.status, 201);
    created = response.body.data;
    assert.match(created._id, /^[0-9a-f]{24}$/);
    assert.ok(!Object.hasOwn(created, 'id'));
    const stored = await getItemsCollection().findOne({ _id: new ObjectId(created._id) });
    assert.ok(stored._id instanceof ObjectId);
    assert.equal(stored.name, 'Headphones');
    assert.equal(stored.price, 59.99);
    assert.equal((await request('/api/items')).body.count, 6);
  });

  await t.test('PATCH persists only provided fields, including zero price', async () => {
    const response = await request('/api/items/' + created._id, 'PATCH', { price: 0 });
    assert.equal(response.status, 200);
    assert.deepEqual(response.body.data, { ...created, price: 0 });
    const stored = await getItemsCollection().findOne({ _id: new ObjectId(created._id) });
    assert.equal(stored.price, 0);
    assert.equal(stored.category, created.category);
  });

  await t.test('invalid PATCH is atomic and protects _id and legacy id', async () => {
    const route = '/api/items/' + created._id;
    for (const invalid of [
      { name: 'Changed', price: 'bad' }, { _id: new ObjectId().toHexString() },
      { id: 1 }, {}, { $set: { price: 1 } }, { category: null }
    ]) {
      assert.equal((await request(route, 'PATCH', invalid)).status, 400);
    }
    assert.deepEqual((await request(route)).body.data, { ...created, price: 0 });
  });

  await t.test('POST rejects missing fields, invalid types, IDs and negative prices', async () => {
    const valid = { name: 'Item', category: 'Test', price: 1 };
    for (const invalid of [
      {}, null, [], { name: 'Item', category: 'Test' },
      { ...valid, name: 42 }, { ...valid, name: '  ' },
      { ...valid, price: '12.50' }, { ...valid, price: -1 },
      { ...valid, _id: new ObjectId().toHexString() }, { ...valid, id: 1 }
    ]) {
      const response = await request('/api/items', 'POST', invalid);
      assert.equal(response.status, 400);
      assert.equal(response.body.success, false);
    }
    assert.equal((await request('/api/items', 'POST')).status, 400);
  });

  await t.test('a separate Node server process retrieves saved changes', async () => {
    const secondApp = await startSeparateApp(uri, dbName);
    try {
      const response = await fetch(secondApp.address + '/api/items/' + created._id);
      assert.equal(response.status, 200);
      assert.deepEqual((await response.json()).data, { ...created, price: 0 });
    } finally {
      await secondApp.close();
    }
  });

  await t.test('DELETE returns 204 with no body and removes the database document', async () => {
    const route = '/api/items/' + created._id;
    const response = await request(route, 'DELETE');
    assert.equal(response.status, 204);
    assert.equal(response.text, '');
    assert.equal(await getItemsCollection().findOne({ _id: new ObjectId(created._id) }), null);
    assert.equal((await request(route)).status, 404);
    assert.equal((await request('/api/items')).body.count, 5);
  });

  await t.test('GET, PATCH and DELETE reject invalid ObjectIds with 400', async () => {
    for (const method of ['GET', 'PATCH', 'DELETE']) {
      for (const id of ['not-an-objectid', '123', 'z'.repeat(24)]) {
        const response = await request('/api/items/' + id, method, method === 'PATCH' ? { price: 1 } : undefined);
        assert.equal(response.status, 400);
        assert.match(response.body.message, /Invalid MongoDB ID/);
      }
    }
  });

  await t.test('well-formed missing ObjectIds and invalid routes return JSON 404', async () => {
    const missingId = new ObjectId().toHexString();
    for (const method of ['GET', 'PATCH', 'DELETE']) {
      const response = await request('/api/items/' + missingId, method, method === 'PATCH' ? { price: 1 } : undefined);
      assert.equal(response.status, 404);
      assert.equal(response.body.success, false);
    }
    const response = await request('/api/does-not-exist');
    assert.equal(response.status, 404);
    assert.match(response.body.message, /Route not found/);
  });

  await t.test('request logging and malformed JSON global error handling remain active', async () => {
    const marker = 'malformed-' + Date.now();
    const response = await fetch(http.base + '/api/items?check=' + marker, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"name":'
    });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { success: false, message: 'Invalid JSON in request body' });
    assert.ok((await fs.readFile(path.join(root, 'logs/requests.txt'), 'utf8')).includes('POST /api/items?check=' + marker));
    assert.ok((await fs.readFile(path.join(root, 'logs/error.txt'), 'utf8')).includes('POST /api/items?check=' + marker));
  });

  await t.test('async database failures reach the existing global error handler', async () => {
    await closeDatabase();
    try {
      const response = await request('/api/items');
      assert.equal(response.status, 500);
      assert.deepEqual(response.body, { success: false, message: 'Internal Server Error' });
      assert.ok((await fs.readFile(path.join(root, 'logs/error.txt'), 'utf8')).includes('MongoDB is not connected'));
    } finally {
      await connectDatabase({ uri, dbName });
    }
  });

  await t.test('reconnecting preserves the original five stored items', async () => {
    const response = await request('/api/items');
    assert.equal(response.body.count, 5);
    assert.equal(response.body.data[0]._id, firstId);
  });

  await t.test('occupied HTTP port fails safely without reading a null address', async () => {
    // Reserve the same wildcard interface used by server.js. On Windows an
    // IPv4-only loopback listener may coexist with a separate IPv6 listener.
    const blocker = require('node:net').createServer();
    await new Promise((resolve, reject) => {
      blocker.once('error', reject);
      blocker.listen(0, resolve);
    });
    try {
      const occupiedPort = String(blocker.address().port);
      await assert.rejects(execFileAsync(process.execPath, [path.join(root, 'server.js')], {
        cwd: root, windowsHide: true, timeout: 15000,
        env: { ...process.env, PORT: occupiedPort, MONGODB_DB: dbName, MONGODB_URI: uri }
      }), (error) => {
        assert.equal(error.code, 1);
        assert.ok(error.stderr.includes('EADDRINUSE'));
        assert.ok(error.stderr.includes('already in use'));
        assert.ok(!error.stderr.includes('TypeError'));
        assert.ok(!error.stderr.includes("Cannot read properties of null"));
        assert.ok(!error.stdout.includes('running at'));
        return true;
      });
    } finally {
      await new Promise((resolve) => blocker.close(resolve));
    }
  });

  await t.test('failed MongoDB startup never starts HTTP or prints credentials', async () => {
    await assert.rejects(execFileAsync(process.execPath, [path.join(root, 'server.js')], {
      cwd: root, windowsHide: true, timeout: 15000,
      env: {
        ...process.env, PORT: '0', MONGODB_DB: dbName,
        MONGODB_URI: 'mongodb://testuser:must-not-be-printed@127.0.0.1:1'
      }
    }), (error) => {
      assert.equal(error.code, 1);
      assert.ok(!error.stdout.includes('running at'));
      assert.ok(error.stderr.includes('MongoDB connection failed'));
      assert.ok(!error.stderr.includes('must-not-be-printed'));
      return true;
    });
  });
});
