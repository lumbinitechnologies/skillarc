import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { migrationFailure, probePooler, verifyDryRun } from './migration-preflight.mjs';
import { migrationVersions, readConfig, readMigrationHistory, targetFor, validateLedger, verifyDatabaseBranch } from './deployment-policy.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const mode = process.argv[2];
const isNetlifyPrelaunch = mode === 'netlifyPrelaunch';
const environment = mode === 'prelaunch' || isNetlifyPrelaunch ? 'production' : mode;
const config = readConfig(root);
const target = targetFor(config, environment, process.env.SUPABASE_PROJECT_ID);
if (!isNetlifyPrelaunch && config.activation?.[mode] !== true) throw new Error('Deployment target is not activated by reviewed configuration');
if (process.env.GITHUB_ACTIONS !== 'true' || process.env.GITHUB_REF !== `refs/heads/${target.gitBranch}`) throw new Error('Hosted migration runner is restricted to reviewed environment branch workflows');
if (mode === 'prelaunch' && (process.env.PRELAUNCH_RELEASE_ENABLED !== 'true' || process.env.GITHUB_WORKFLOW_REF !== 'lumbinitechnologies/skillarc/.github/workflows/prelaunch-release.yml@refs/heads/main')) throw new Error('Prelaunch migrations require the protected website workflow');
if (isNetlifyPrelaunch && (process.env.NETLIFY_PRELAUNCH_MIGRATIONS_ENABLED !== 'true' ||
    process.env.GITHUB_WORKFLOW_REF !== 'lumbinitechnologies/skillarc/.github/workflows/netlify-prelaunch.yml@refs/heads/main' ||
    !/^[a-f0-9]{64}$/.test(process.env.NETLIFY_APPROVAL_DIGEST ?? ''))) {
  throw new Error('Netlify migrations require the protected website workflow and exact approval record');
}
if (!process.env.SUPABASE_ACCESS_TOKEN) throw new Error('Missing SUPABASE_ACCESS_TOKEN');
const versions = migrationVersions(root);
const baseline = JSON.parse(readFileSync(path.join(root, 'supabase/migration-baseline.json'), 'utf8')).version;

const history = () => readMigrationHistory(target.projectRef, process.env.SUPABASE_ACCESS_TOKEN);
function cli(args) {
  // Keep all CLI output private, including on failure.
  return spawnSync('supabase', args, { cwd: root, encoding: 'utf8', timeout: 15 * 60_000, maxBuffer: 10 * 1024 * 1024 });
}
async function requireSuccess(step, result) {
  if (result.status === 0) return result.stdout.trim();
  const failure = migrationFailure(result);
  if (environment === 'staging' && failure.poolerUnavailable) {
    const probe = await probePooler(target.projectRef, process.env.SUPABASE_ACCESS_TOKEN);
    failure.details.push(probe);
  }
  throw new Error(`Supabase ${step} failed (${failure.details.join(', ')}); deployment stopped`);
}
if (await requireSuccess('version check', cli(['--version'])) !== '2.117.0') throw new Error('Unexpected Supabase CLI version');
const inventoryResponse = await fetch(`https://api.supabase.com/v1/projects/${config.activeParentProjectRef}/branches`, {
  headers: { Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}` }, redirect: 'error', signal: AbortSignal.timeout(30_000),
});
if (!inventoryResponse.ok) throw new Error('Cannot verify database branch ownership');
verifyDatabaseBranch(config, environment, target.projectRef, await inventoryResponse.json());
const pending = validateLedger(versions, await history(), baseline, target.requireBaseline);
console.log(`${environment}: ${pending.length} reviewed migrations pending${pending.length ? ': ' + pending.join(', ') : ''}`);
// CLI 2.117 supports an explicit project ref through the authenticated API.
// No mutable linked-project state or database password is needed.
const pushArgs = ['db', 'push', '--project-ref', target.projectRef, '--skip-vault', '--yes', '--output-format', 'json'];
const dryRun = await requireSuccess('migration dry run', cli([...pushArgs, '--dry-run']));
const expectedFiles = readdirSync(path.join(root, 'supabase/migrations'))
  .filter(filename => filename.endsWith('.sql') && pending.includes(filename.slice(0, 14)))
  .sort();
verifyDryRun(dryRun, expectedFiles);
if (pending.length) await requireSuccess('migration apply', cli(pushArgs));
const remaining = validateLedger(versions, await history(), baseline, true);
if (remaining.length) throw new Error('Migration ledger verification failed after push');
console.log(`${environment}: migration ledger matches this reviewed revision`);
