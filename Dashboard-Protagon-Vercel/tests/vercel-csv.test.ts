import assert from 'node:assert/strict';
import test from 'node:test';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { gunzipSync } from 'node:zlib';
import handler from '../api/csv';
import { publishedSheetIds } from '../server/published-sheets';

const source = `https://docs.google.com/spreadsheets/d/e/${publishedSheetIds[0]}/pub?output=csv&gid=0`;
async function request(url = source, method = 'GET', encoding = 'gzip') {
  const result = { statusCode: 200, headers: {} as Record<string, any>, body: Buffer.alloc(0) };
  const req = { method, url: '/api/csv?url=' + encodeURIComponent(url), headers: { 'accept-encoding': encoding } };
  const res = Object.assign(result, {
    setHeader(key: string, value: any) { result.headers[key.toLowerCase()] = value; },
    end(body?: string | Buffer) { result.body = body == null ? Buffer.alloc(0) : Buffer.from(body); },
  });
  await handler(req as IncomingMessage, res as unknown as ServerResponse);
  return result;
}

test('large CSV is returned losslessly as gzip, including accented and quoted fields', async () => {
  const originalFetch = globalThis.fetch;
  const csv = 'data_hora,email,observacao\n' + '07/10/2026,lead@example.test,"ação, tráfego e Goiânia"\n'.repeat(200_000);
  globalThis.fetch = (async () => new Response(csv)) as typeof fetch;
  try {
    assert.ok(Buffer.byteLength(csv) > 4_500_000);
    const result = await request();
    assert.equal(result.statusCode, 200);
    assert.equal(result.headers['content-encoding'], 'gzip');
    assert.equal(result.headers['cache-control'], 'no-store');
    assert.equal(result.headers['content-length'], result.body.byteLength);
    assert.ok(result.body.byteLength < 4_500_000);
    assert.equal(gunzipSync(result.body).toString('utf8'), csv);
    const head = await request(source, 'HEAD');
    assert.equal(head.body.byteLength, 0);
  } finally { globalThis.fetch = originalFetch; }
});

test('invalid URLs and unsupported methods are rejected without querying upstream', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => { throw new Error('Unexpected network request'); }) as typeof fetch;
  try {
    assert.equal((await request('https://example.com/private')).statusCode, 400);
    assert.equal((await request(source, 'POST')).statusCode, 405);
    assert.equal((await request(source.replace('/pub?', '/edit?'))).statusCode, 400);
  } finally { globalThis.fetch = originalFetch; }
});

test('published tab HTML is preserved and gzip opt-out is respected', async () => {
  const originalFetch = globalThis.fetch;
  const html = '<html><script>items.push({name:"Planilha",gid:"1"})</script></html>';
  globalThis.fetch = (async () => new Response(html)) as typeof fetch;
  try {
    const result = await request(source.split('/pub?')[0] + '/pubhtml', 'GET', 'gzip;q=0');
    assert.equal(result.statusCode, 200);
    assert.match(result.headers['content-type'], /text\/html/);
    assert.equal(result.headers['content-encoding'], undefined);
    assert.equal(result.body.toString(), html);
  } finally { globalThis.fetch = originalFetch; }
});

test('upstream failure returns a visible error instead of a successful empty sheet', async () => {
  const originalFetch = globalThis.fetch;
  const originalError = console.error;
  let attempts = 0;
  globalThis.fetch = (async () => { attempts++; return new Response('', { status: 503 }); }) as typeof fetch;
  console.error = () => {};
  try {
    const result = await request();
    assert.equal(attempts, 3);
    assert.equal(result.statusCode, 502);
    assert.match(result.body.toString(), /Não foi possível atualizar/);
  } finally { globalThis.fetch = originalFetch; console.error = originalError; }
});
