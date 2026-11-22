import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { readConfig } from './deployment-policy.mjs';

const config = readConfig(process.cwd());
const ref = config.staging.projectRef;
const branch = {
  project_ref: ref, name: config.staging.branchName, persistent: true,
  is_default: false, parent_project_ref: config.activeParentProjectRef,
};

function runFixture(serviceKey, initialBucket) {
  // Exercise the real entry point without allowing external requests or writes.
  const transport = `
    import assert from 'node:assert/strict';
    const branch = ${JSON.stringify(branch)};
    let bucket = ${JSON.stringify(initialBucket ?? null)};
    globalThis.fetch = async (target, options) => {
      const url = new URL(target);
      if (url.origin === 'https://api.supabase.com' && url.pathname.endsWith('/branches')) {
        assert.equal(options.headers.Authorization, 'Bearer synthetic-management-key');
        return Response.json([branch]);
      }
      assert.equal(url.origin, 'https://' + branch.project_ref + '.supabase.co');
      assert.equal(options.headers.apikey, 'synthetic-service-key');
      assert.equal(options.headers.Authorization, 'Bearer synthetic-service-key');
      if (url.pathname === '/storage/v1/bucket') {
        if (options.method === 'GET') return Response.json(bucket ? [bucket] : []);
        assert.equal(options.method, 'POST');
        assert.equal(bucket, null);
        bucket = JSON.parse(options.body);
        assert.deepEqual(bucket, { id: 'student-documents', name: 'student-documents', public: false });
        console.log('Created private bucket');
        return Response.json({ name: bucket.name });
      }
      assert.equal(url.pathname, '/auth/v1/admin/users');
      assert.equal(options.method, 'GET');
      assert.equal(bucket.public, false);
      return Response.json({}, { status: 403 });
    };
  `;
  return spawnSync(process.execPath, [
    '--import', 'data:text/javascript,' + encodeURIComponent(transport), 'scripts/ci/fixtures.mjs', 'staging',
  ], {
    encoding: 'utf8',
    env: {
      ...process.env,
      SUPABASE_PROJECT_ID: ref,
      SUPABASE_ACCESS_TOKEN: 'synthetic-management-key',
      SUPABASE_SERVICE_ROLE_KEY: serviceKey,
      SUPABASE_PUBLISHABLE_KEY: 'synthetic-publishable-key',
      FIXTURE_PASSWORD: 'synthetic-test-password',
    },
  });
}

test('staging uses environment Auth keys only against the verified child, without requesting a key inventory', () => {
  const result = runFixture('synthetic-service-key');
  assert.equal(result.status, 1);
  assert.match(result.stdout, /Created private bucket/);
  assert.match(result.stderr, /Fixture Auth account inventory failed \(HTTP 403\)/);
  assert.doesNotMatch(result.stderr, /synthetic-service-key|synthetic-management-key/);
});

test('staging reuses a private document bucket and rejects a public one', () => {
  const privateBucket = runFixture('synthetic-service-key', { id: 'student-documents', public: false });
  assert.match(privateBucket.stderr, /Fixture Auth account inventory failed \(HTTP 403\)/);
  assert.doesNotMatch(privateBucket.stdout, /Created private bucket/);
  const publicBucket = runFixture('synthetic-service-key', { id: 'student-documents', public: true });
  assert.equal(publicBucket.status, 1);
  assert.match(publicBucket.stderr, /The student documents Storage bucket must be private/);
  assert.doesNotMatch(publicBucket.stdout, /Created private bucket/);
});

test('staging with a missing Auth key stops without using another credential', () => {
  const result = runFixture('');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Branch-scoped Auth administration\/public keys unavailable/);
});
