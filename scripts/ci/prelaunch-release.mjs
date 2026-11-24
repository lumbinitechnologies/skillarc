import { createHash, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { appendFileSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { migrationVersions, readConfig, readMigrationHistory, targetFor, validatePrelaunchDatabase } from './deployment-policy.mjs';
import { smokePrelaunch } from './prelaunch-smoke.mjs';
import { validateWebEnvironment } from './web-environment.mjs';
import { fixtureId } from '../fixtures/academic.mjs';

const config = readConfig(process.cwd());
const mode = process.argv[2];
const sha = process.env.RELEASE_SHA;
const { VERCEL_TOKEN: token, VERCEL_ORG_ID: teamId, VERCEL_PROJECT_ID: projectId } = process.env;
const target = targetFor(config, 'production', process.env.SUPABASE_PROJECT_ID);
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
const protections = bypass ? { 'x-vercel-protection-bypass': bypass } : {};
const publicOrigin = 'https://www.theskillarc.com';
const productionEnv = '.vercel/.env.production.local';
const stagingEnv = '.vercel/.env.preview.local';
const releaseMode = 'website-prelaunch-v1';

if (process.env.GITHUB_ACTIONS !== 'true' || process.env.GITHUB_REF !== 'refs/heads/main' ||
    process.env.GITHUB_WORKFLOW_REF !== 'lumbinitechnologies/skillarc/.github/workflows/prelaunch-release.yml@refs/heads/main' ||
    !/^[a-f0-9]{40}$/.test(sha || '') || config.activation?.prelaunch !== true ||
    process.env.PRELAUNCH_RELEASE_ENABLED !== 'true' ||
    teamId !== config.vercelTeamId || projectId !== target.vercelProjectId || !token) {
  throw new Error('Prelaunch workflow activation, revision or Vercel target mismatch');
}

function cli(args, extra = {}) {
  const command = spawnSync('vercel', args, {
    env: { ...process.env, ...extra }, encoding: 'utf8', timeout: 20 * 60_000, maxBuffer: 10 * 1024 * 1024,
  });
  if (command.status !== 0) throw new Error(`Vercel ${args[0]} failed; inspect the deployment from the owner account`);
  return command.stdout.trim();
}

async function getVercel(path) {
  const url = new URL(path, 'https://api.vercel.com');
  url.searchParams.set('teamId', teamId);
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }, redirect: 'error', signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Vercel metadata request failed (HTTP ${response.status})`);
  return response.json();
}

function checkedVercelOrigin(value) {
  const url = new URL(value);
  if (url.origin !== value || url.protocol !== 'https:' || !url.hostname.endsWith('.vercel.app')) throw new Error('Invalid candidate origin');
  return url;
}

const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const migrationDigest = () => digest(readdirSync('supabase/migrations').filter(name => name.endsWith('.sql')).sort().map(name => ({
  name, sha256: createHash('sha256').update(readFileSync(`supabase/migrations/${name}`)).digest('hex'),
})));

async function deployment(id, production, expectedSha) {
  if (!/^dpl_[A-Za-z0-9]+$/.test(id || '') && !/^[a-z\d-]+\.vercel\.app$/.test(id || '')) throw new Error('Invalid deployment ID or hostname');
  const data = await getVercel(`/v13/deployments/${encodeURIComponent(id)}`);
  if (!/^dpl_[A-Za-z0-9]+$/.test(data.id || '') || (id.startsWith('dpl_') ? data.id !== id : data.url !== id) ||
      data.readyState !== 'READY' || data.ownerId !== teamId || data.projectId !== projectId ||
      (production ? data.target !== 'production' : data.target === 'production') ||
      data.meta?.skillarcMode !== releaseMode || (expectedSha && data.meta?.githubCommitSha !== expectedSha) ||
      data.meta?.skillarcDatabase !== (production ? target.projectRef : config.staging.projectRef) ||
      !/^[a-f0-9]{64}$/.test(data.meta?.skillarcConfig || '')) throw new Error('Website deployment identity or prelaunch configuration mismatch');
  const origin = checkedVercelOrigin(`https://${data.url}`).origin;
  return { id: data.id, origin, configuration: data.meta.skillarcConfig };
}

function build(production) {
  const environment = production ? 'production' : 'staging';
  const ref = config[environment].projectRef;
  const dotenv = readFileSync(production ? productionEnv : stagingEnv, 'utf8');
  validateWebEnvironment(config, environment, JSON.parse(readFileSync('.vercel/project.json', 'utf8')), dotenv);
  const variables = parseEnv(dotenv);
  if (Object.hasOwn(variables, 'SKILLARC_PRELAUNCH')) throw new Error('Prelaunch mode must be specific to the candidate, not a shared Vercel setting');
  const allowed = new Set(['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'VERCEL_OIDC_TOKEN']);
  if (production && Object.keys(variables).some(name => !allowed.has(name))) throw new Error('Production contains settings outside the prelaunch database allowlist');
  const vercelConfig = JSON.parse(readFileSync('vercel.json', 'utf8'));
  delete vercelConfig.crons;
  writeFileSync('vercel.json', JSON.stringify(vercelConfig));
  cli(production ? ['build', '--prod'] : ['build'], { SKILLARC_PRELAUNCH: 'true' });
  const buildOutput = '.vercel/output/config.json';
  const output = JSON.parse(readFileSync(buildOutput, 'utf8'));
  delete output.crons;
  writeFileSync(buildOutput, JSON.stringify(output));
  const configuration = digest({ mode: releaseMode, ref, production, crons: [], environmentNames: Object.keys(variables).filter(name => name !== 'VERCEL_OIDC_TOKEN').sort() });
  const url = checkedVercelOrigin(cli(['deploy', '--prebuilt', '--yes', '--force',
    ...(production ? ['--prod', '--skip-domain'] : []), '--env', 'SKILLARC_PRELAUNCH=true',
    '--meta', `githubCommitSha=${sha}`, '--meta', `skillarcMode=${releaseMode}`,
    '--meta', `skillarcDatabase=${ref}`, '--meta', `skillarcConfig=${configuration}`,
  ]));
  return { hostname: url.hostname, configuration };
}

async function checkAuth(before) {
  const supabaseToken = process.env.SUPABASE_ACCESS_TOKEN;
  if (!supabaseToken) throw new Error('Missing scoped production Supabase credential');
  const url = `https://api.supabase.com/v1/projects/${target.projectRef}`;
  const headers = { Authorization: `Bearer ${supabaseToken}`, 'Content-Type': 'application/json' };
  const response = await fetch(`${url}/config/auth`, { headers, redirect: 'error', signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error('Cannot verify production Auth configuration');
  const auth = await response.json();
  if (auth.disable_signup !== true || auth.external_anonymous_users_enabled !== false || auth.smtp_host) throw new Error('Production Auth signup, anonymous sign-in or custom SMTP is still active');
  const query = `SELECT
    (SELECT count(*) FROM auth.users)::int AS accounts,
    (SELECT count(*) FROM storage.objects)::int AS files,
    (SELECT count(*) FROM pg_tables WHERE schemaname='public')::int AS tables,
    (SELECT count(*) FROM storage.buckets WHERE id IN ('assignments','resumes') AND public=false)::int AS private_buckets`;
  const check = await fetch(`${url}/database/query`, {
    headers, method: 'POST', body: JSON.stringify({ query, read_only: true }), redirect: 'error', signal: AbortSignal.timeout(30_000),
  });
  if (!check.ok) throw new Error('Cannot verify clean production aggregate counts');
  const [counts] = await check.json();
  const history = await readMigrationHistory(target.projectRef, supabaseToken);
  const baseline = JSON.parse(readFileSync('supabase/migration-baseline.json', 'utf8')).version;
  validatePrelaunchDatabase(migrationVersions(process.cwd()), history, counts, baseline, before);
}

function record(candidate, rehearsal, fallback) {
  const evidence = process.env.STAGING_EVIDENCE;
  const stagingSha = process.env.STAGING_SHA;
  if (!/^https:\/\/github\.com\/lumbinitechnologies\/skillarc\/actions\/runs\/\d+$/.test(evidence || '') ||
      !/^[a-f0-9]{40}$/.test(stagingSha || '')) throw new Error('Missing exact hosted staging evidence');
  if (candidate.id === fallback?.id) throw new Error('Fallback must be a separate deployment');
  const current = { mode: releaseMode, sha, stagingSha, stagingEvidence: evidence, candidate, rehearsal, fallback, database: target.projectRef, migrations: migrationDigest() };
  return { ...current, approvalDigest: digest(current) };
}

async function verifyStableStaging() {
  const origin = `https://${config.staging.hostname}`;
  const alias = await getVercel(`/v4/aliases/${config.staging.hostname}`);
  const id = alias.deploymentId ?? alias.deployment?.id;
  if (!/^dpl_[A-Za-z0-9]+$/.test(id || '')) throw new Error('Stable staging deployment is unavailable');
  const data = await getVercel(`/v13/deployments/${id}`);
  if (data.projectId !== projectId || data.ownerId !== teamId || data.target === 'production' ||
      data.meta?.githubCommitSha !== process.env.STAGING_SHA) throw new Error('Stable staging does not serve the verified staging revision');
  const smoke = await fetch(new URL('/api/mobile/v1/me', origin), { redirect: 'error', signal: AbortSignal.timeout(30_000) });
  if (smoke.status !== 401 || (await smoke.json()).error?.code !== 'UNAUTHORIZED') throw new Error('Stable staging mobile route is unavailable');
}

async function rehearseStaging(origin) {
  const settings = parseEnv(readFileSync(stagingEnv, 'utf8'));
  const stagingDatabase = `https://${config.staging.projectRef}.supabase.co`;
  const key = settings.SUPABASE_SERVICE_ROLE_KEY;
  if (settings.NEXT_PUBLIC_SUPABASE_URL !== stagingDatabase || !key) throw new Error('Staging database binding is missing');
  const application = {
    institution_id: fixtureId(100), program_id: fixtureId(102), first_name: 'Synthetic', last_name: 'Prelaunch',
    email: `prelaunch-${randomUUID()}@skillarc-fixtures.invalid`,
  };
  const rows = new URL('/rest/v1/admissions_applications', stagingDatabase);
  rows.searchParams.set('email', `eq.${application.email}`);
  async function verifyNoApplication() {
    const result = await fetch(rows, {
      method: 'HEAD', headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: 'count=exact' },
      redirect: 'error', signal: AbortSignal.timeout(30_000),
    });
    if (!result.ok || result.headers.get('content-range')?.split('/').at(-1) !== '0') {
      throw new Error('Cannot verify absence of a staging application for the synthetic probe');
    }
  }
  await verifyNoApplication();
  try {
    await smokePrelaunch(origin, protections, application);
  } finally {
    await verifyNoApplication();
  }
}

async function verifyPublic(expectedId) {
  const alias = await getVercel('/v4/aliases/www.theskillarc.com');
  if (alias.deploymentId !== expectedId && alias.deployment?.id !== expectedId) throw new Error('Public domain points to a different deployment');
  await smokePrelaunch(publicOrigin);
  const apex = await fetch('https://theskillarc.com/', { redirect: 'manual', signal: AbortSignal.timeout(30_000) });
  if (![301, 302, 307, 308].includes(apex.status) || apex.headers.get('location') !== `${publicOrigin}/`) throw new Error('Apex domain does not redirect to the public website');
}

const team = await getVercel(`/v2/teams/${teamId}`);
if (!['pro', 'enterprise'].includes(team.billing?.plan)) throw new Error('Could not confirm Vercel commercial hosting eligibility');

if (mode === 'stage') {
  if (cli(['--version']).replace(/^Vercel CLI /, '') !== '63.1.2') throw new Error('Unexpected Vercel CLI version');
  if (!process.env.GITHUB_OUTPUT || !process.env.GITHUB_STEP_SUMMARY) throw new Error('Missing release evidence destinations');
  cli(['pull', '--yes', '--environment=preview', `--git-branch=${config.staging.gitBranch}`]);
  const rehearsalBuild = build(false);
  const rehearsal = await deployment(rehearsalBuild.hostname, false, sha);
  if (rehearsal.configuration !== rehearsalBuild.configuration) throw new Error('Rehearsal config mismatch');
  await rehearseStaging(rehearsal.origin);
  cli(['pull', '--yes', '--environment=production']);
  const candidateBuild = build(true);
  const candidate = await deployment(candidateBuild.hostname, true, sha);
  if (candidate.configuration !== candidateBuild.configuration) throw new Error('Candidate config mismatch');
  const fallbackOnly = process.env.PREPARE_FALLBACK === 'true';
  const fallback = fallbackOnly ? null : await deployment(process.env.FALLBACK_ID, true);
  if (fallback) await smokePrelaunch(fallback.origin, protections);
  await smokePrelaunch(candidate.origin, protections);
  await verifyStableStaging();
  const binding = record(candidate, rehearsal, fallback);
  writeFileSync('prelaunch-record.json', `${JSON.stringify(binding, null, 2)}\n`);
  appendFileSync(process.env.GITHUB_OUTPUT, `candidate_id=${candidate.id}\nrehearsal_id=${rehearsal.id}\napproval_digest=${binding.approvalDigest}\n`);
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## SkillArc ${fallbackOnly ? 'unaliased fallback' : 'prelaunch candidate'}\n\nCommit: ${sha}\n\n[Staging checks](${binding.stagingEvidence})\n\nStaging rehearsal: ${rehearsal.id}\n\nVercel candidate: ${candidate.id}\n\nVercel fallback: ${fallback?.id ?? 'This run prepares the fallback only'}\n\nProduction Supabase: ${binding.database}\n\nMigration digest: ${binding.migrations}\n\nPrelaunch configuration: ${candidate.configuration}\n\nApproval binding: ${binding.approvalDigest}\n`);
} else if (mode === 'verify' || mode === 'promote') {
  if (process.env.PREPARE_FALLBACK === 'true') throw new Error('Fallback preparation cannot migrate or promote');
  const candidate = await deployment(process.env.CANDIDATE_ID, true, sha);
  const rehearsal = await deployment(process.env.REHEARSAL_ID, false, sha);
  const fallback = await deployment(process.env.FALLBACK_ID, true);
  const binding = record(candidate, rehearsal, fallback);
  if (!process.env.EXPECTED_APPROVAL_DIGEST || binding.approvalDigest !== process.env.EXPECTED_APPROVAL_DIGEST) throw new Error('Prelaunch approval binding changed');
  await smokePrelaunch(candidate.origin, protections);
  await smokePrelaunch(fallback.origin, protections);
  await verifyStableStaging();
  await checkAuth(mode === 'verify');
  if (mode === 'promote') {
    cli(['promote', candidate.origin, '--yes']);
    try {
      await verifyPublic(candidate.id);
      await verifyStableStaging();
    } catch {
      cli(['promote', fallback.origin, '--yes']);
      await verifyPublic(fallback.id);
      throw new Error('Public verification failed and the approved prelaunch fallback was restored');
    }
    writeFileSync('prelaunch-record.json', `${JSON.stringify(binding, null, 2)}\n`);
  }
} else {
  throw new Error('Unknown prelaunch release step');
}
