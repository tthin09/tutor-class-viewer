import test from 'node:test';
import assert from 'node:assert/strict';
import handler from './events.js';

function responseRecorder() {
  return {
    statusCode: 200,
    headers: {},
    status(code) { this.statusCode = code; return this; },
    setHeader(name, value) { this.headers[name] = value; },
    json(body) { this.body = body; return this; },
  };
}

async function invoke(method, url) {
  const res = responseRecorder();
  await handler({ method, url }, res);
  return res;
}

test('calendar API rejects unsupported methods', async () => {
  const res = await invoke('POST', '/api/events');
  assert.equal(res.statusCode, 405);
  assert.equal(res.headers.Allow, 'GET');
});

test('calendar API rejects malformed student IDs before accessing calendar credentials', async () => {
  const res = await invoke('GET', '/api/events?studentID=not-an-id');
  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, { error: 'Invalid studentID' });
});

test('calendar API does not expose calendars for unknown student IDs', async () => {
  const res = await invoke('GET', '/api/events?studentID=0000000000000000');
  assert.equal(res.statusCode, 404);
  assert.deepEqual(res.body, { error: 'Student not found' });
});
