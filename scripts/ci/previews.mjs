import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { migrationVersions, previewExpired, readConfig, validateLedger } from './deployment-policy.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const config = readConfig(root);
const repo = 'lumbinitechnologies/skillarc';
if (process.env.GITHUB_ACTIONS !== 'true' || process.env.GITHUB_REPOSITORY !== repo || process.env.PREVIEWS_ENABLED !== 'true' || !config.preview.costApproved) throw new Error('Preview automation is not enabled for the reviewed repository');
if (!process.env.GH_TOKEN || !process.env.SUPABASE_ACCESS_TOKEN) throw new Error('Preview credentials are not configured');
const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
const parent = config.preview.parentProjectRef;
if (parent !== config.staging.projectRef || parent === config.production.projectRef) throw new Error('Preview parent must be staging, never production');
async function api(base, suffix, method = 'GET', body) {
  const github = base === 'github';
  const response = await fetch((github ? `https://api.github.com/repos/${repo}/` : 'https://api.supabase.com/v1/') + suffix, {
    method, redirect: 'error', signal: AbortSignal.timeout(60_000),
    headers: { Authorization: `Bearer ${github ? process.env.GH_TOKEN : process.env.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`${base} preview operation failed (${response.status})`);
  return response.status === 204 ? null : response.json();
}
async function list(suffix) {
  const result = [];
  for (let page = 1; page <= 100; page++) {
    const rows = await api('github', `${suffix}${suffix.includes('?') ? '&' : '?'}per_page=100&page=${page}`);
    if (!Array.isArray(rows)) throw new Error('Malformed GitHub list');
    result.push(...rows);
    if (rows.length < 100) return result;
  }
  throw new Error('GitHub pagination limit exceeded');
}
function owned(branch) {
  return /^skillarc-ci-pr-\d+-[a-f0-9]{12}$/.test(branch.name || '') && branch.parent_project_ref === parent &&
    !branch.is_default && !branch.persistent && branch.project_ref !== parent && branch.project_ref !== config.production.projectRef;
}
const branches = await api('supabase', `projects/${parent}/branches`);
if (!Array.isArray(branches)) throw new Error('Malformed preview inventory');
for (const branch of branches.filter(b => owned(b) && previewExpired(b, Date.now(), config))) {
  await api('supabase', `branches/${branch.id}`, 'DELETE');
  branch.removed = true;
  console.log(`Removed owned expired preview ${branch.name}`);
}
if (process.env.PREVIEW_ACTION === 'cleanup') {
  for (const branch of branches.filter(b => owned(b) && !b.removed)) {
    const number = Number(branch.name.split('-')[3]);
    const pr = await api('github', `pulls/${number}`);
    if (pr.state === 'closed' || previewExpired(branch, Date.now(), config)) {
      await api('supabase', `branches/${branch.id}`, 'DELETE');
      console.log(`Removed owned expired/closed preview ${branch.name}`);
    }
  }
} else {
  let number = process.env.PREVIEW_PR_NUMBER;
  if (process.env.GITHUB_EVENT_NAME === 'workflow_run') {
    const run = event.workflow_run;
    const workflow = await api('github', 'actions/workflows/database-ci.yml');
    if (run?.workflow_id !== workflow.id || run.event !== 'pull_request' || run.conclusion !== 'success' || run.head_repository?.full_name !== repo) throw new Error('Untrusted validation event');
    number = String(run.pull_requests?.[0]?.number || '');
  }
  if (!/^\d+$/.test(number || '') || Number(number) < 1) throw new Error('A valid PR number is required');
  const pr = await api('github', `pulls/${number}`);
  if (pr.state !== 'open' || pr.user?.login !== 'keanesc' || pr.head?.repo?.full_name !== repo || pr.base?.ref !== 'main' || !/^[a-f0-9]{40}$/.test(pr.head.sha)) throw new Error('Hosted previews require an open Keane PR in this repository');
  if (event.workflow_run && event.workflow_run.head_sha !== pr.head.sha) throw new Error('Stale preview event');
  const files = await list(`pulls/${number}/files`);
  if (!files.some(f => f.filename.startsWith('supabase/migrations/') && f.filename.endsWith('.sql'))) {
    console.log('No database migration change; no paid preview created');
    process.exit(0);
  }
  if (files.some(f => f.filename.startsWith('supabase/migrations/') && f.filename.endsWith('.sql') && f.status !== 'added')) throw new Error('Only new migrations may enter a hosted preview');
  const name = `${config.preview.namePrefix}${number}-${pr.head.sha.slice(0, 12)}`;
  for (const branch of branches.filter(b => owned(b) && !b.removed && b.name.startsWith(`${config.preview.namePrefix}${number}-`))) {
    if (branch.name === name && !previewExpired(branch, Date.now(), config)) {
      console.log(`Existing preview still active: https://supabase.com/dashboard/project/${branch.project_ref}`);
      process.exit(0);
    }
    await api('supabase', `branches/${branch.id}`, 'DELETE');
  }
  const activeOthers = branches.filter(b => owned(b) && !b.name.startsWith(`${config.preview.namePrefix}${number}-`) && !previewExpired(b, Date.now(), config));
  if (activeOthers.length >= config.preview.maxConcurrent) throw new Error('Hosted preview concurrency budget reached; use cleanup or wait for expiry');
  const temporary = mkdtempSync(path.join(os.tmpdir(), 'skillarc-preview-'));
  let branch;
  try {
    // Fetch only SQL data. Never check out or execute PR scripts with hosted secrets.
    const fetch = spawnSync('git', ['fetch', '--no-tags', 'origin', pr.head.sha], { cwd: root, stdio: 'pipe' });
    if (fetch.status !== 0) throw new Error('Cannot read PR migration revision');
    const tree = spawnSync('git', ['ls-tree', '-r', '--name-only', pr.head.sha, '--', 'supabase/migrations'], { cwd: root, encoding: 'utf8' });
    if (tree.status !== 0) throw new Error('Cannot inspect PR migrations');
    mkdirSync(path.join(temporary, 'supabase/migrations'), { recursive: true });
    mkdirSync(path.join(temporary, 'supabase'), { recursive: true });
    writeFileSync(path.join(temporary, 'supabase/config.toml'), 'project_id = "skillarc-preview"\n[db]\nmajor_version = 17\n[db.seed]\nenabled = false\n');
    writeFileSync(path.join(temporary, 'supabase/migration-baseline.json'), readFileSync(path.join(root, 'supabase/migration-baseline.json')));
    for (const file of tree.stdout.trim().split('\n').filter(f => f.endsWith('.sql'))) {
      if (!/^supabase\/migrations\/\d{14}_[A-Za-z0-9_-]+\.sql$/.test(file)) throw new Error('Unsafe migration filename');
      const content = spawnSync('git', ['show', `${pr.head.sha}:${file}`], { cwd: root, encoding: 'utf8', maxBuffer: 5 * 1024 * 1024 });
      if (content.status !== 0) throw new Error('Cannot read migration');
      writeFileSync(path.join(temporary, file), content.stdout);
    }
    for (const name of readdirSync(path.join(root, 'supabase/migrations')).filter(n => n.endsWith('.sql'))) {
      const hash = data => createHash('sha256').update(data).digest('hex');
      if (hash(readFileSync(path.join(root, 'supabase/migrations', name))) !== hash(readFileSync(path.join(temporary, 'supabase/migrations', name)))) throw new Error('PR changed reviewed main history');
    }
    const versions = migrationVersions(temporary);
    branch = await api('supabase', `projects/${parent}/branches`, 'POST', {
      branch_name: name, persistent: false, with_data: false, region: config.region, desired_instance_size: 'micro',
    });
    if (!owned(branch) || branch.with_data !== false) throw new Error('Preview identity mismatch');
    let ready = false;
    for (let attempt = 0; attempt < 30; attempt++) {
      const detail = await api('supabase', `branches/${branch.id}`);
      if (detail.ref !== branch.project_ref) throw new Error('Preview project mismatch');
      if (detail.status === 'ACTIVE_HEALTHY') {
        const runs = await api('supabase', `projects/${branch.project_ref}/actions?limit=20`);
        if (!Array.isArray(runs)) throw new Error('Cannot verify native branch initialization');
        if (runs.some(r => r.git_config)) throw new Error('Competing GitHub migration integration is enabled');
        if (runs.length > 0 && runs.every(r => r.run_steps.length > 0 && r.run_steps.every(s => ['EXITED', 'DEAD'].includes(s.status)))) { ready = true; break; }
      }
      await new Promise(resolve => setTimeout(resolve, 10_000));
    }
    if (!ready) throw new Error('Preview did not become ready');
    // A single migration owner: refuse inherited/competing history rather than repair/reset it.
    const history = await api('supabase', `projects/${branch.project_ref}/database/migrations`);
    if (!Array.isArray(history) || history.length) throw new Error('Fresh preview already has migration history; disable competing migration integration');
    const cli = args => {
      const r = spawnSync('supabase', args, { cwd: temporary, encoding: 'utf8', timeout: 15 * 60_000, maxBuffer: 10 * 1024 * 1024 });
      if (r.status !== 0) throw new Error('Preview migration deployment failed');
    };
    cli(['db', 'push', '--project-ref', branch.project_ref, '--dry-run', '--skip-vault', '--yes']);
    cli(['db', 'push', '--project-ref', branch.project_ref, '--skip-vault', '--yes']);
    const remaining = validateLedger(versions, await api('supabase', `projects/${branch.project_ref}/database/migrations`), '', false);
    if (remaining.length) throw new Error('Preview ledger is incomplete');
    await api('supabase', `projects/${branch.project_ref}/database/query`, 'POST', {
      query: readFileSync(path.join(root, 'supabase/preview-fixtures.sql'), 'utf8'), read_only: false,
    });
    console.log(`Synthetic database preview ready: https://supabase.com/dashboard/project/${branch.project_ref}`);
    console.log('Expires after two hours; scheduled cleanup is best-effort and also runs on PR close.');
  } catch (error) {
    if (branch && owned(branch)) await api('supabase', `branches/${branch.id}`, 'DELETE');
    throw error;
  } finally { rmSync(temporary, { recursive: true, force: true }); }
}
