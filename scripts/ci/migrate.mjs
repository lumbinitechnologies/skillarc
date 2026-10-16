import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { migrationVersions, readConfig, targetFor, validateLedger } from './deployment-policy.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const environment = process.argv[2];
const config = readConfig(root);
const target = targetFor(config, environment, process.env.SUPABASE_PROJECT_ID);
if (process.env.GITHUB_ACTIONS !== 'true' || process.env.GITHUB_REF !== 'refs/heads/main') throw new Error('Hosted migration runner is restricted to reviewed main workflows');
if (!process.env.SUPABASE_ACCESS_TOKEN) throw new Error('Missing SUPABASE_ACCESS_TOKEN');
const versions = migrationVersions(root);
const baseline = JSON.parse(readFileSync(path.join(root, 'supabase/migration-baseline.json'), 'utf8')).version;

async function history() {
  const response = await fetch(`https://api.supabase.com/v1/projects/${target.projectRef}/database/migrations`, {
    headers: { Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}` }, redirect: 'error', signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Cannot verify remote migration history (HTTP ${response.status})`);
  return response.json();
}
function cli(args) {
  // No secret command-line arguments, raw output, seed/role/vault flags or repair.
  const result = spawnSync('supabase', args, { cwd: root, encoding: 'utf8', timeout: 15 * 60_000, maxBuffer: 10 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`Supabase ${args.slice(0, 2).join(' ')} failed; deployment stopped (no application promotion)`);
  return result.stdout.trim();
}
if (cli(['--version']) !== '2.117.0') throw new Error('Unexpected Supabase CLI version');
const pending = validateLedger(versions, await history(), baseline, target.requireBaseline);
console.log(`${environment}: ${pending.length} reviewed migrations pending${pending.length ? ': ' + pending.join(', ') : ''}`);
// CLI 2.117 supports an explicit project ref through the authenticated API.
// No mutable linked-project state or database password is needed.
cli(['db', 'push', '--project-ref', target.projectRef, '--skip-vault', '--dry-run', '--yes']);
cli(['db', 'push', '--project-ref', target.projectRef, '--skip-vault', '--yes']);
const remaining = validateLedger(versions, await history(), baseline, true);
if (remaining.length) throw new Error('Migration ledger verification failed after push');
console.log(`${environment}: migration ledger matches this reviewed revision`);
