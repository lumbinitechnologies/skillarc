import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, cpSync, writeFileSync, readdirSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fixtureSql, accountDefinitions } from '../fixtures/academic.mjs';
import { migrationVersions } from './deployment-policy.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const versions = migrationVersions(root);
const directory = mkdtempSync(path.join(os.tmpdir(), 'skillarc-db-ci-'));
mkdirSync(path.join(directory, 'supabase'));
cpSync(path.join(root, 'supabase/migrations'), path.join(directory, 'supabase/migrations'), { recursive: true });
writeFileSync(path.join(directory, 'supabase/config.toml'), `project_id = "skillarc-ci-${process.pid}"
[db]
port = 56322
shadow_port = 56320
major_version = 17
[db.seed]
enabled = false
[analytics]
enabled = false
`);
const cli = process.env.SUPABASE_BIN || 'supabase';
function run(args) {
  const result = spawnSync(cli, [...args, '--workdir', directory], { cwd: root, stdio: 'inherit', timeout: 15 * 60_000 });
  if (result.status !== 0) throw new Error(`Local Supabase ${args.join(' ')} failed`);
}
try {
  run(['db', 'start']);
  run(['db', 'reset', '--local', '--no-seed', '--yes']);
  // Inspect actual ledger/core schema, not only successful CLI exit status.
  const verification = path.join(directory, 'verify.sql');
  writeFileSync(verification, `DO $$ BEGIN
    IF (SELECT array_agg(version::text ORDER BY version) FROM supabase_migrations.schema_migrations)
      IS DISTINCT FROM ARRAY[${versions.map(v => `'${v}'`).join(',')}]::text[] THEN
      RAISE EXCEPTION 'Full migration replay ledger mismatch';
    END IF;
    IF to_regclass('public.institutions') IS NULL OR to_regclass('public.students') IS NULL THEN
      RAISE EXCEPTION 'Application baseline was not restored';
    END IF;
    IF EXISTS (SELECT 1 FROM auth.users) THEN RAISE EXCEPTION 'Local account seed unexpectedly ran'; END IF;
  END $$;`);
  run(['db', 'query', '--local', '--file', verification]);
  const tests = path.join(root, 'supabase/tests');
  try {
    if (readdirSync(tests, { recursive: true }).some(n => n.endsWith('.sql'))) {
      cpSync(tests, path.join(directory, 'supabase/tests'), { recursive: true });
      run(['test', 'db', '--local']);
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  // Disposable local SQL fixture replay; Auth creation/login is tested separately
  // through Auth administration in allowlisted hosted non-production branches.
  const identities = Object.fromEntries(accountDefinitions.map((a,i) => [a.name, `92000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`]));
  const fixtureTest = path.join(directory, 'fixture-test.sql');
  const fixtureQueries = [
    'DO $$ BEGIN ' + accountDefinitions.map(a => `INSERT INTO auth.users (id,email) VALUES ('${identities[a.name]}','${a.email}');`).join('\n') + ' END $$;',
    fixtureSql(identities), fixtureSql(identities),
    `DO $$ BEGIN
      IF (SELECT count(*) FROM public.students WHERE id::text LIKE '92000000-%') <> 4 THEN RAISE EXCEPTION 'Fixture student graph mismatch'; END IF;
      IF (SELECT count(*) FROM public.assignments WHERE id::text LIKE '91000000-%') <> 10 THEN RAISE EXCEPTION 'Fixture task graph mismatch'; END IF;
    END $$;`,
  ];
  for (const query of fixtureQueries) {
    writeFileSync(fixtureTest, query);
    run(['db', 'query', '--local', '--file', fixtureTest]);
  }
  run(['db', 'lint', '--local', '--level', 'error', '--fail-on', 'error']);
  if (process.argv.includes('--production-readiness')) run(['db', 'advisors', '--local', '--type', 'security', '--fail-on', 'error']);
  console.log(`Replayed ${versions.length} migrations in a fresh local Supabase database without seeds`);
} finally {
  const stopped = spawnSync(cli, ['stop', '--no-backup', '--workdir', directory], { cwd: root, stdio: 'inherit', timeout: 60_000 });
  if (stopped.status === 0) rmSync(directory, { recursive: true, force: true });
  else console.error(`Local cleanup needs attention: ${directory}`);
}
