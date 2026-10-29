import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import test from 'node:test';
import { checkMigrations } from './check-migrations.mjs';

const name = '20261010094633_baseline.sql';
function fixture(t) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'skillarc-migration-test-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(path.join(root, 'supabase/migrations'), { recursive: true });
  const sql = '-- baseline\n';
  writeFileSync(path.join(root, 'supabase/migrations', name), sql);
  writeFileSync(path.join(root, 'supabase/migration-baseline.json'), JSON.stringify({version: '20261010094633', files: {[name]: createHash('sha256').update(sql).digest('hex')}}));
  return root;
}
test('accepts immutable baseline and new later migration', t => {
  const root = fixture(t);
  writeFileSync(path.join(root, 'supabase/migrations/20261011000000_next.sql'), '-- new');
  assert.equal(checkMigrations(root), 2);
});
test('rejects stale generated history', t => {
  const root = fixture(t);
  writeFileSync(path.join(root, 'supabase/migrations/20260908000001_generated.sql'), '-- stale');
  assert.throws(() => checkMigrations(root), /Stale/);
});
test('rejects edits to an applied migration', t => {
  const root = fixture(t);
  writeFileSync(path.join(root, 'supabase/migrations', name), '-- changed');
  assert.throws(() => checkMigrations(root), /changed/);
});
test('rejects missing applied migration', t => {
  const root = fixture(t);
  rmSync(path.join(root, 'supabase/migrations', name));
  assert.throws(() => checkMigrations(root), /ENOENT/);
});
test('rejects duplicate versions', t => {
  const root = fixture(t);
  writeFileSync(path.join(root, 'supabase/migrations/20261010094633_duplicate.sql'), '-- duplicate');
  assert.throws(() => checkMigrations(root), /Duplicate/);
});
