import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServerClient } from '@supabase/ssr';
import { accountDefinitions, fixtureId, fixtureVersion } from '../fixtures/academic.mjs';

const title = '[Synthetic v1] Private file smoke';
const category = 'OTHER_SUPPORTING_EVIDENCE';
const bucket = 'student-documents';
// A one-pixel PNG with no metadata or user data.
const sample = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGMQD1oKAAGSAQ8ddi+MAAAAAElFTkSuQmCC', 'base64');
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const checksum = digest(sample);

function request(url, options) {
  return fetch(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(30_000) });
}

async function withAccount(authOrigin, publicKey, password, name, test) {
  const { email } = accountDefinitions.find(account => account.name === name);
  const cookies = new Map();
  const client = createServerClient(authOrigin, publicKey, {
    global: { fetch: request },
    cookies: {
      getAll: () => [...cookies].map(([name, value]) => ({ name, value })),
      setAll: values => {
        for (const { name, value } of values) cookies.set(name, value);
      },
    },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  assert.ok(!error && data.session && data.user?.id && data.user.email === email &&
    data.user.app_metadata?.fixture_version === fixtureVersion, `Private file smoke could not verify ${name} fixture`);
  try {
    const cookie = [...cookies].map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join('; ');
    assert.ok(cookie, 'Missing fixture session cookie');
    await test(data.user.id, { cookie });
  } finally {
    const { error } = await client.auth.signOut({ scope: 'local' });
    assert.ok(!error, 'Private file fixture session could not be revoked');
  }
}

async function expectJson(origin, path, options, status) {
  const response = await request(new URL(path, origin), options);
  assert.equal(response.status, status, `Private file smoke expected HTTP ${status}`);
  return response.json();
}

export async function verifyPrivateFileSmoke({ origin, authOrigin, publicKey, password, headers: previewHeaders, previewOrigin }) {
  const url = new URL(origin);
  assert.ok(origin === 'https://staging.theskillarc.com' ||
    (origin === previewOrigin && origin === url.origin && url.protocol === 'https:' &&
      /^[a-z0-9-]+\.vercel\.app$/.test(url.hostname)), 'Private file smoke requires verified staging');
  assert.equal(authOrigin, 'https://kzbplqwcammuytqjwdge.supabase.co', 'Private file smoke requires staging Auth');
  assert.ok(publicKey && password, 'Private file fixture credentials unavailable');

  const appJson = (path, options, status) => expectJson(origin, path, {
    ...options, headers: { ...previewHeaders, ...options.headers },
  }, status);
  await withAccount(authOrigin, publicKey, password, 'student', async (studentId, studentHeaders) => {
    const path = `/api/students/${encodeURIComponent(studentId)}/documents`;
    let document;
    await withAccount(authOrigin, publicKey, password, 'admin', async (adminId, headers) => {
      const { documents } = await appJson(path, { headers }, 200);
      const matches = documents.filter(row => row.title === title && row.category === category);
      assert.ok(matches.length <= 1, 'Private file fixture already has multiple versions');
      document = matches[0];
      if (!document) {
        const body = new FormData();
        body.set('title', title);
        body.set('category', category);
        body.set('file', new Blob([sample], { type: 'image/png' }), 'synthetic-smoke.png');
        ({ document } = await appJson(path, { method: 'POST', headers, body }, 201));
      }
      assert.ok(document.id && document.student_id === studentId && document.institution_id === fixtureId(100) &&
        document.uploaded_by === adminId && document.storage_bucket === bucket &&
        document.checksum_sha256 === checksum, 'Private file fixture ownership or checksum mismatch');
    });

    const downloadPath = `${path}/${encodeURIComponent(document.id)}`;
    const { url } = await appJson(downloadPath, { headers: studentHeaders }, 200);
    const downloadUrl = new URL(url);
    assert.ok(downloadUrl.origin === authOrigin && downloadUrl.pathname.startsWith(`/storage/v1/object/sign/${bucket}/`),
      'Private file signed URL points outside staging storage');
    const download = await request(downloadUrl);
    assert.equal(download.status, 200, 'Authorized private file download failed');
    assert.ok(digest(new Uint8Array(await download.arrayBuffer())) === checksum, 'Downloaded fixture checksum mismatch');

    await withAccount(authOrigin, publicKey, password, 'admin-au', async (_, headers) => {
      const denied = await appJson(downloadPath, { headers }, 403);
      assert.ok(!denied.url, 'Cross-tenant response exposed a signed URL');
    });
  });
  console.log('Staging private file checksum and cross-tenant denial verified. One synthetic file is retained for repeat runs.');
}
