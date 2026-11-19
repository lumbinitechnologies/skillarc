import assert from 'node:assert/strict';
import { test } from 'node:test';
import { migrationFailure, probePooler, verifyDryRun } from './migration-preflight.mjs';

test('classifies the pinned CLI text IPv6 error on either stream', () => {
  for (const stream of ['stdout', 'stderr']) {
    const result = migrationFailure({
      status: 1,
      [stream]: 'IPv6 is not supported on your current network\nRun supabase link --project-ref private-ref',
    });
    assert.equal(result.poolerUnavailable, true);
    assert.deepEqual(result.details, ['exit 1', 'direct database connection and pooler fallback unavailable']);
  }
});

test('extracts only fixed diagnostics from machine output and process errors', () => {
  const result = migrationFailure({
    status: 1,
    stdout: JSON.stringify({ _tag: 'Error', error: {
      code: 'LegacyDbConfigLoginRoleStatusError',
      message: 'unexpected login role status 403: private response',
    } }),
  });
  assert.equal(result.poolerUnavailable, false);
  assert.deepEqual(result.details, ['exit 1', 'LegacyDbConfigLoginRoleStatusError', 'HTTP 403', 'CLI login role mentioned']);
  assert.deepEqual(
    migrationFailure({ status: null, error: { code: 'ETIMEDOUT', message: 'private' } }).details,
    ['process did not exit normally', 'ETIMEDOUT'],
  );
});

test('pooler probe reports status without reading response content', async () => {
  let cancelled = false;
  const lookup = await probePooler('staging-ref', 'test-token', async (url, options) => {
    assert.equal(url, 'https://api.supabase.com/v1/projects/staging-ref/config/database/pooler');
    assert.equal(options.headers.Authorization, 'Bearer test-token');
    assert.equal(options.redirect, 'error');
    return { status: 403, body: { cancel() { cancelled = true; } } };
  });
  assert.equal(lookup, 'pooler configuration lookup HTTP 403');
  assert.equal(cancelled, true);
  assert.equal(await probePooler('staging-ref', 'test-token', async () => {
    throw new Error('private connection detail');
  }), 'pooler configuration lookup failed before an HTTP result');
});

test('requires the exact ordered SQL files with no seed or role changes', () => {
  const expected = ['20261101000000_base.sql', '20261102000000_next.sql'];
  const plan = { dryRun: true, upToDate: false, seeds: [], roles: [], migrations: expected };
  verifyDryRun(JSON.stringify(plan), expected);
  verifyDryRun(JSON.stringify({ ...plan, upToDate: true, migrations: [] }), []);
  for (const change of [
    { dryRun: false },
    { upToDate: true },
    { migrations: [...expected].reverse() },
    { migrations: ['20261101000000_other.sql', expected[1]] },
    { migrations: [expected[0]] },
    { seeds: ['seed.sql'] },
    { roles: ['roles.sql'] },
  ]) {
    assert.throws(() => verifyDryRun(JSON.stringify({ ...plan, ...change }), expected), /does not match/);
  }
  assert.throws(() => verifyDryRun('private invalid output', expected), /did not return a readable migration plan/);
});
