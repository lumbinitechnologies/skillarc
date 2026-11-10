import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { migrationVersions, readConfig, targetFor, validateLedger, verifyDatabaseBranch } from './deployment-policy.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const environment = process.argv[2];
const config = readConfig(root);
const target = targetFor(config, environment, process.env.SUPABASE_PROJECT_ID);
if (config.activation?.[environment] !== true) throw new Error('Deployment target is not activated by reviewed configuration');
if (process.env.GITHUB_ACTIONS !== 'true' || process.env.GITHUB_REF !== `refs/heads/${target.gitBranch}`) throw new Error('Hosted migration runner is restricted to reviewed environment branch workflows');
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
function cli(step, args) {
  // No secret command-line arguments, raw output, seed/role/vault flags or repair.
  const result = spawnSync('supabase', args, { cwd: root, encoding: 'utf8', timeout: 15 * 60_000, maxBuffer: 10 * 1024 * 1024 });
  if (result.status !== 0) {
    // Report only fixed labels and structured codes. Raw CLI output can contain connection details or SQL.
    let diagnostic = result.stderr || '';
    let cliCode;
    for (const line of (result.stdout || '').split('\n')) {
      if (!line.startsWith('{')) continue;
      try {
        const record = JSON.parse(line);
        if (record._tag !== 'Error') continue;
        if (typeof record.error?.message === 'string') diagnostic += `\n${record.error.message}`;
        if (/^(?:LegacyDbConfig(?:LoginRole(?:Status|Network)|ConnectTempRole|PoolerLogin|Ipv6|Load)|LegacyDbConnect|LegacyDbPush(?:TargetFlags|MigrationHistory))Error$/.test(record.error?.code || '')) cliCode = record.error.code;
      } catch {
        // Non-JSON output stays private.
      }
    }
    const http = diagnostic.match(/\b(?:HTTP(?: status)?|status(?: code)?)[ :]+([45]\d{2})\b/i)?.[1];
    const sqlstate = diagnostic.match(/\bSQLSTATE[ :]+([0-9A-Z]{5})\b/i)?.[1];
    const system = result.error?.code || diagnostic.match(/\b(ETIMEDOUT|ECONNREFUSED|ECONNRESET|ENETUNREACH|EHOSTUNREACH|ENOTFOUND|EAI_AGAIN)\b/)?.[1];
    const details = [
      Number.isInteger(result.status) ? `exit ${result.status}` : 'process did not exit normally',
      cliCode,
      http && `HTTP ${http}`,
      sqlstate && `SQLSTATE ${sqlstate}`,
      /^(?:ETIMEDOUT|ECONNREFUSED|ECONNRESET|ENETUNREACH|EHOSTUNREACH|ENOTFOUND|EAI_AGAIN|ENOENT|EACCES|ENOBUFS)$/.test(system || '') && system,
      /login role/i.test(diagnostic) && 'CLI login role mentioned',
      /(?:permission denied|unauthorized|forbidden|insufficient privileges)/i.test(diagnostic) && 'access error mentioned',
    ].filter(Boolean).join(', ');
    throw new Error(`Supabase ${step} failed (${details}); deployment stopped`);
  }
  return result.stdout.trim();
}
if (cli('version check', ['--version']) !== '2.117.0') throw new Error('Unexpected Supabase CLI version');
const inventoryResponse = await fetch(`https://api.supabase.com/v1/projects/${config.activeParentProjectRef}/branches`, {
  headers: { Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}` }, redirect: 'error', signal: AbortSignal.timeout(30_000),
});
if (!inventoryResponse.ok) throw new Error('Cannot verify database branch ownership');
verifyDatabaseBranch(config, environment, target.projectRef, await inventoryResponse.json());
const pending = validateLedger(versions, await history(), baseline, target.requireBaseline);
console.log(`${environment}: ${pending.length} reviewed migrations pending${pending.length ? ': ' + pending.join(', ') : ''}`);
// CLI 2.117 supports an explicit project ref through the authenticated API.
// No mutable linked-project state or database password is needed.
cli('migration dry run', ['db', 'push', '--project-ref', target.projectRef, '--skip-vault', '--dry-run', '--yes']);
cli('migration apply', ['db', 'push', '--project-ref', target.projectRef, '--skip-vault', '--yes']);
const remaining = validateLedger(versions, await history(), baseline, true);
if (remaining.length) throw new Error('Migration ledger verification failed after push');
console.log(`${environment}: migration ledger matches this reviewed revision`);
