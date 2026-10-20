import assert from 'node:assert/strict';
import test from 'node:test';
import { requestSupabaseJson } from '../src/utils/supabaseRequest';
import { fetchSupabaseRows } from '../src/utils/supabaseData';

test('temporary outage retries the same traffic page once without losing or duplicating records', async () => {
  const original = globalThis.fetch;
  const input = Array.from({ length: 1253 }, (_, id) => ({ id }));
  const offsets: number[] = [];
  let failed = false;
  globalThis.fetch = (async (url: any) => {
    const offset = Number(new URL(String(url), 'https://example.test').searchParams.get('offset'));
    offsets.push(offset);
    if (offset === 1000 && !failed) {
      failed = true;
      return Response.json({ code: 'SOURCE_UNAVAILABLE', retryable: true }, { status: 503 });
    }
    const rows = input.slice(offset, offset + 1000);
    return Response.json({ rows, nextOffset: rows.length ? offset + rows.length : null });
  }) as typeof fetch;
  try {
    assert.deepEqual(await fetchSupabaseRows('protagon-porto-alegre', 'met'), input);
    assert.deepEqual(offsets, [0, 1000, 1000, 1253]);
  } finally { globalThis.fetch = original; }
});

test('persistent outage is bounded, names the dataset, and never becomes successful zero data', async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => { calls++; return new Response('<html>Gateway unavailable</html>', { status: 502 }); }) as typeof fetch;
  try {
    await assert.rejects(fetchSupabaseRows('protagon-porto-alegre', 'met'), /temporariamente indisponível.*Meteórico/);
    assert.equal(calls, 2);
  } finally { globalThis.fetch = original; }
});

test('network interruptions recover, but permissions, stale snapshots and malformed success are not retried', async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => {
    if (++calls === 1) throw new TypeError('fetch failed');
    return Response.json({ enabled: true });
  }) as typeof fetch;
  try {
    assert.deepEqual(await requestSupabaseJson('/api/supabase?config=1', 'a configuração'), { enabled: true });
    assert.equal(calls, 2);
    for (const [status, body] of [[502, { code: 'SOURCE_ACCESS_DENIED' }], [503, { code: 'STALE_SNAPSHOT' }],
      [502, { code: 'SOURCE_QUERY_FAILED', retryable: false }], [200, []]] as const) {
      calls = 0;
      globalThis.fetch = (async () => { calls++; return Response.json(body, { status }); }) as typeof fetch;
      await assert.rejects(requestSupabaseJson('/api/supabase', 'os leads'));
      assert.equal(calls, 1);
    }
  } finally { globalThis.fetch = original; }
});

test('traffic and lead requests share a three-request limit and aborted queued reads never reach Supabase', async () => {
  const original = globalThis.fetch;
  let active = 0, maximum = 0;
  const calls: string[] = [];
  globalThis.fetch = (async (url: any) => {
    calls.push(String(url)); active++; maximum = Math.max(maximum, active);
    await new Promise(resolve => setTimeout(resolve, 5));
    active--;
    return Response.json({ ok: true });
  }) as typeof fetch;
  try {
    const controller = new AbortController();
    const pending = Array.from({ length: 6 }, (_, i) => requestSupabaseJson(`/api/supabase?page=${i}`, 'os dados'));
    const cancelled = requestSupabaseJson('/api/supabase?cancelled=1', 'os dados', controller.signal);
    controller.abort();
    const cancelledCheck = assert.rejects(cancelled, { name: 'AbortError' });
    await Promise.all([...pending, cancelledCheck]);
    assert.equal(maximum, 3);
    assert.ok(!calls.some(url => url.includes('cancelled')));
    assert.deepEqual(await requestSupabaseJson('/api/supabase?after=1', 'os dados'), { ok: true }, 'All semaphore slots are released');
  } finally { globalThis.fetch = original; }
});
