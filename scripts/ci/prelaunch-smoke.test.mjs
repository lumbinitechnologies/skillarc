import assert from 'node:assert/strict';
import { test } from 'node:test';
import { smokePrelaunch } from './prelaunch-smoke.mjs';

const origin = 'https://preview.example.test';

function stubFetch(t, override = () => undefined) {
  const requests = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url.origin, origin);
    assert.equal(options.redirect, 'error');
    requests.push([options.method, url.pathname]);
    const blocked = options.method === 'POST' || url.pathname.startsWith('/api/') || url.pathname === '/auth/login';
    return override(url, options) ?? new Response(
      blocked ? 'PRELAUNCH_CLOSED. Sign-in and onboarding are currently closed' : 'SkillArc',
      { status: blocked ? 503 : 200 },
    );
  });
  return requests;
}

test('production uses read-only probes and checks mobile and worker closure', async t => {
  const requests = stubFetch(t);
  await smokePrelaunch(origin);
  assert.ok(requests.every(([method]) => method === 'GET'));
  assert.ok(requests.some(([, path]) => path === '/api/mobile/v1/me'));
  assert.ok(requests.some(([, path]) => path === '/api/internal/knowledge/worker'));
});

test('staging submits a synthetic application to the real write route and requires the guard response', async t => {
  const applicant = { email: 'sample@skillarc-fixtures.invalid' };
  const requests = stubFetch(t, (url, options) => {
    if (url.pathname !== '/api/admissions/public-apply' || options.method !== 'POST') return;
    assert.deepEqual(JSON.parse(options.body), applicant);
    return new Response('', { status: 400 });
  });
  await assert.rejects(smokePrelaunch(origin, {}, applicant), /POST .*public-apply expected HTTP 503/);
  assert.ok(requests.some(([method, path]) => method === 'POST' && path === '/auth/signup'));
});
