import assert from 'node:assert/strict';
import test from 'node:test';
import { ResponseCache } from '../server/responseCache';

test('identical concurrent reads share a request; expiry and LRU enforce freshness and the byte budget', async () => {
  let now = 1000, calls = 0;
  const cache = new ResponseCache(8, () => now);
  const load = async () => { calls++; await new Promise(resolve => setTimeout(resolve, 5)); return { body: 'aaaa', expires: now + 100 }; };
  assert.deepEqual((await Promise.all([cache.read('a', load), cache.read('a', load)])).map(x => x.body), ['aaaa', 'aaaa']);
  assert.equal(calls, 1);
  assert.equal((await cache.read('a', load)).hit, true);
  await cache.read('b', load);
  await cache.read('a', load); // a is most recently used
  await cache.read('c', load);
  assert.equal((await cache.read('a', load)).hit, true);
  assert.equal((await cache.read('b', load)).hit, false);
  now += 101;
  assert.equal((await cache.read('b', load)).hit, false);
});

test('failed, expired and oversized responses are never retained or returned as successful empty data', async () => {
  const cache = new ResponseCache(4, () => 1000);
  let calls = 0;
  const failure = async () => { calls++; throw new Error('unavailable'); };
  await assert.rejects(cache.read('failed', failure), /unavailable/);
  await assert.rejects(cache.read('failed', failure), /unavailable/);
  assert.equal(calls, 2);
  for (const value of [{ body: '12345', expires: 2000 }, { body: 'x', expires: 999 }]) {
    assert.equal((await cache.read('x', async () => value)).hit, false);
    assert.equal((await cache.read('x', async () => value)).hit, false);
  }
});
